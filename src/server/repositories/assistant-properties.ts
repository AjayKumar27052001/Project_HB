import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { type Collection, type Document } from "mongodb";
import { getDatabase } from "@/server/mongo/database";
import { calculateRateQuote, type RateQuote } from "@/server/pricing/rate-quote";
import { getSearchableCity } from "@/server/repositories/search-properties";
import {
  getAssistantAttribute,
  isAssistantAttributeValue,
  type AssistantAttributeDefinition,
} from "@/server/assistant/attribute-registry";
import type { SearchCriteria } from "@/shared/types";

type AssistantRoomDocument = {
  id: string;
  name: string;
  description: string;
  maxAdults: number;
  assistantAttributes?: Record<string, unknown>;
  ratePlans: AssistantRateDocument[];
};

type AssistantRateDocument = {
  id: string;
  name: string;
  refundable: boolean;
  cancellationSummary: string;
  paymentSummary: string;
  nightlyRate: { amount: string; currency: string };
  taxPercent: string;
  feesPerNight: { amount: string; currency: string };
  demoAvailableRooms: number;
  includes?: string[];
};

type AssistantPropertyDocument = {
  _id: string;
  name: string;
  summary: string;
  destination: { city: string; cityNormalized: string; region: string };
  address: { line1: string; postalCode?: string };
  rating: number;
  reviewCount: number;
  amenities: Array<{ id: string; name: string; category?: string }>;
  services?: Array<{
    id: string;
    name: string;
    description?: string;
    openingHours?: string;
    price?: { amount?: string; currency?: string; basis?: string };
    assistantAttributes?: Record<string, unknown>;
  }>;
  assistantAttributes?: Record<string, unknown>;
  policies?: Record<string, unknown>;
  roomTypes: AssistantRoomDocument[];
  active: boolean;
};

export type AssistantSearchFilter = {
  attribute: string;
  operator: "equals" | "contains" | "less_than" | "greater_than";
  value: unknown;
};

export type AssistantSearchSort = {
  attribute: string;
  direction: "ascending" | "descending";
};

export type AssistantSearchInput = {
  criteria: SearchCriteria;
  filters: AssistantSearchFilter[];
  sort: AssistantSearchSort | null;
  pageSize: number;
  cursor: string | null;
};

export type AssistantFact = {
  attribute: string;
  label: string;
  value: unknown;
  scope: "property" | "room" | "rate" | "service";
  subject?: { id: string; name?: string };
  unit?: string;
  basis?: string;
  relatedEntities?: Array<{ type: string; id: string; name?: string }>;
  status?: "known" | "unknown" | "not_applicable";
};

type StayPriceOption = {
  roomId: string;
  roomName: string;
  rateId: string;
  rateName: string;
  nightlyRate: { amount: string; currency: string };
  quote: RateQuote;
  basis: string;
};

type EvaluatedProperty = {
  property: AssistantPropertyDocument;
  priceOption: StayPriceOption | null;
  hasUnknownPriceData: boolean;
};

function readPath(value: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (Array.isArray(current)) {
      return current.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const nextValue = (item as Record<string, unknown>)[key];
        return nextValue === undefined ? [] : [nextValue];
      });
    }

    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[key];
  }, value);
}

function matchesValue(actual: unknown, filter: AssistantSearchFilter): boolean {
  if (actual === undefined || actual === null) return false;

  if (filter.operator === "contains") {
    if (Array.isArray(actual)) return actual.includes(filter.value);
    return typeof actual === "string"
      && typeof filter.value === "string"
      && actual.toLowerCase().includes(filter.value.toLowerCase());
  }

  if (filter.operator === "less_than" || filter.operator === "greater_than") {
    const actualNumber = Number(actual);
    const filterNumber = Number(filter.value);
    if (!Number.isFinite(actualNumber) || !Number.isFinite(filterNumber)) return false;
    return filter.operator === "less_than" ? actualNumber < filterNumber : actualNumber > filterNumber;
  }

  if (typeof filter.value === "number") {
    const actualNumber = typeof actual === "number" || typeof actual === "string" ? Number(actual) : NaN;
    return Number.isFinite(actualNumber) && actualNumber === filter.value;
  }

  return Array.isArray(actual)
    ? actual.includes(filter.value)
    : actual === filter.value;
}

function buildMongoFilter(criteria: SearchCriteria): Document {
  return {
    "destination.cityNormalized": getSearchableCity(criteria.destination),
    active: true,
  };
}

type MatchStatus = "match" | "no_match" | "unknown";

function matchPropertyFilters(
  property: AssistantPropertyDocument,
  filters: AssistantSearchFilter[],
): MatchStatus {
  let hasUnknownValue = false;
  const scopedFilters = new Map<string, Array<{ filter: AssistantSearchFilter; attribute: AssistantAttributeDefinition }>>();

  for (const filter of filters) {
    const attribute = getAssistantAttribute(filter.attribute);
    if (!attribute) return "unknown";

    if (attribute.scope !== "property") {
      const scoped = scopedFilters.get(attribute.scope) ?? [];
      scoped.push({ filter, attribute });
      scopedFilters.set(attribute.scope, scoped);
      continue;
    }

      const value = attribute.key === "property.amenities"
        ? (Array.isArray(property.amenities) ? property.amenities.map((amenity) => amenity.name) : undefined)
      : readPath(property, attribute.dataPath);
    if (value === undefined || value === null) {
      hasUnknownValue = true;
    } else if (!matchesValue(value, filter)) {
      return "no_match";
    }
  }

  for (const [scope, scopeFilters] of scopedFilters) {
    let hasMatchingEntity = false;
    let hasPotentialEntity = false;
    const scopeDefinition = scopeFilters[0]?.attribute;
    const scopedEntities = getScopedEntities(property, scope, scopeDefinition);
    const absenceCanMatch = scopedEntities.length === 0
      && hasCompleteScopeCollection(property, scope)
      && scopeFilters.every(({ filter, attribute }) =>
        attribute.absenceStatus === "known" && filter.operator === "equals" && filter.value === attribute.absenceValue,
      );
    if (absenceCanMatch) {
      hasMatchingEntity = true;
    }
    for (const entity of scopedEntities) {
      let entityHasUnknownValue = false;
      let entityHasMismatch = false;
      for (const { filter, attribute } of scopeFilters) {
        const value = readPath(entity, attribute.dataPath);
        if (value === undefined || value === null) entityHasUnknownValue = true;
        else if (!matchesValue(value, filter)) entityHasMismatch = true;
      }
      if (!entityHasMismatch && !entityHasUnknownValue) hasMatchingEntity = true;
      else if (!entityHasMismatch && entityHasUnknownValue) hasPotentialEntity = true;
    }

    if (scopedEntities.length === 0 && !hasCompleteScopeCollection(property, scope)) {
      hasPotentialEntity = true;
    }

    if (!hasMatchingEntity && !hasPotentialEntity) return "no_match";
    if (!hasMatchingEntity) hasUnknownValue = true;
  }

  return hasUnknownValue ? "unknown" : "match";
}

function hasCompleteScopeCollection(property: AssistantPropertyDocument, scope: string): boolean {
  if (scope === "room") return Array.isArray(property.roomTypes);
  if (scope === "service") return Array.isArray(property.services);
  if (scope === "rate") return Array.isArray(property.roomTypes)
    && property.roomTypes.every((room) => Array.isArray(room.ratePlans));
  return true;
}

function getScopedEntities(
  property: AssistantPropertyDocument,
  scope: string,
  definition?: AssistantAttributeDefinition,
): Array<Record<string, unknown>> {
  let entities: Array<Record<string, unknown>>;
  if (scope === "room") entities = property.roomTypes as unknown as Array<Record<string, unknown>>;
  else if (scope === "service") entities = (property.services ?? []) as unknown as Array<Record<string, unknown>>;
  else if (scope === "rate") {
    entities = property.roomTypes.flatMap((room) => room.ratePlans.map((rate) => ({
      ...rate,
      roomTypeId: room.id,
      roomTypeName: room.name,
    }))) as unknown as Array<Record<string, unknown>>;
  } else entities = [];

  return definition?.entityType
    ? entities.filter((entity) => readPath(entity, "assistantAttributes.type") === definition.entityType)
    : entities;
}

function getScopedEntitiesMatchingFilters(
  property: AssistantPropertyDocument,
  scope: string,
  filters: AssistantSearchFilter[],
  definition?: AssistantAttributeDefinition,
): Array<Record<string, unknown>> {
  const scopeFilters = filters.filter((filter) => getAssistantAttribute(filter.attribute)?.scope === scope);
  const firstAttribute = scopeFilters[0] ? getAssistantAttribute(scopeFilters[0].attribute) : definition;
  return getScopedEntities(property, scope, firstAttribute).filter((entity) => scopeFilters.every((filter) => {
    const attribute = getAssistantAttribute(filter.attribute);
    return attribute ? matchesValue(readPath(entity, attribute.dataPath), filter) : false;
  }));
}

function createQueryFingerprint(input: AssistantSearchInput): string {
  return createHash("sha256").update(JSON.stringify({
    criteria: input.criteria,
    filters: input.filters,
    sort: input.sort,
    pageSize: input.pageSize,
  })).digest("hex");
}

function createCursor(offset: number, fingerprint: string, secret: string): string {
  const payload = Buffer.from(JSON.stringify({
    offset,
    fingerprint,
    expiresAt: Date.now() + 15 * 60 * 1000,
  })).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function readCursor(cursor: string, fingerprint: string, secret: string): number | null {
  if (cursor.length > 2048) return null;
  const [payload, signature] = cursor.split(".");
  if (!payload || !signature) return null;

  const expectedSignature = createHmac("sha256", secret).update(payload).digest();
  let suppliedSignature: Buffer;
  try {
    suppliedSignature = Buffer.from(signature, "base64url");
  } catch {
    return null;
  }
  if (expectedSignature.length !== suppliedSignature.length
    || !timingSafeEqual(expectedSignature, suppliedSignature)) return null;

  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      offset?: unknown;
      fingerprint?: unknown;
      expiresAt?: unknown;
    };
    if (decoded.fingerprint !== fingerprint || typeof decoded.offset !== "number"
      || !Number.isInteger(decoded.offset) || decoded.offset < 1
      || typeof decoded.expiresAt !== "number" || decoded.expiresAt <= Date.now()) return null;
    return decoded.offset;
  } catch {
    return null;
  }
}

function toMinorUnits(amount: string): bigint {
  const [whole = "0", fraction = ""] = amount.split(".");
  if (!/^\d+$/.test(whole) || !/^\d{0,2}$/.test(fraction)) {
    throw new Error("Invalid synthetic money amount.");
  }
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
}

function getStayPriceOption(
  property: AssistantPropertyDocument,
  input: AssistantSearchInput,
): { priceOption: StayPriceOption | null; hasUnknownPriceData: boolean } {
  const roomFilters = input.filters.filter((filter) => getAssistantAttribute(filter.attribute)?.scope === "room");
  const rateFilters = input.filters.filter((filter) => getAssistantAttribute(filter.attribute)?.scope === "rate");
  const eligibleRooms = property.roomTypes.filter((room) => {
    const supportsGuestCount = Number.isInteger(room.maxAdults)
      && room.maxAdults * input.criteria.rooms >= input.criteria.adults;
    const supportsRoomCount = room.ratePlans.some((rate) => Number.isInteger(rate.demoAvailableRooms)
      && rate.demoAvailableRooms >= input.criteria.rooms);
    return supportsGuestCount
      && supportsRoomCount
      && roomFilters.every((filter) => {
        const attribute = getAssistantAttribute(filter.attribute);
        return attribute ? matchesValue(getRoomFactValue(room, attribute), filter) : false;
      });
  });
  if (eligibleRooms.length === 0) {
    return { priceOption: null, hasUnknownPriceData: true };
  }

  let bestOption: StayPriceOption | null = null;
  let hasUnknownPriceData = false;
  const rateCurrencies = new Set<string>();

  for (const room of eligibleRooms) {
    for (const rate of room.ratePlans) {
      if (!rateFilters.every((filter) => {
        const attribute = getAssistantAttribute(filter.attribute);
        return attribute && matchesValue(readPath(rate, attribute.dataPath), filter);
      })) continue;
      if (!Number.isInteger(rate.demoAvailableRooms)) {
        hasUnknownPriceData = true;
        continue;
      }
      if (rate.demoAvailableRooms < input.criteria.rooms) continue;
      if (!rate.nightlyRate?.amount || !rate.nightlyRate.currency
        || !rate.feesPerNight?.amount || !rate.feesPerNight.currency
        || !rate.taxPercent) {
        hasUnknownPriceData = true;
        continue;
      }
      if (rate.nightlyRate.currency !== rate.feesPerNight.currency) {
        hasUnknownPriceData = true;
        continue;
      }
      rateCurrencies.add(rate.nightlyRate.currency);

      try {
        const quote = calculateRateQuote(rate, input.criteria);
        const candidate: StayPriceOption = {
          roomId: room.id,
          roomName: room.name,
          rateId: rate.id,
          rateName: rate.name,
          nightlyRate: rate.nightlyRate,
          quote,
          basis: `${quote.nights}-night stay, ${input.criteria.rooms} room${input.criteria.rooms === 1 ? "" : "s"}`,
        };
        const sortByStayTotal = input.sort?.attribute === "price.lowestStayTotal";
        const candidateAmount = toMinorUnits(sortByStayTotal ? quote.total.amount : rate.nightlyRate.amount);
        const bestAmount = bestOption
          ? toMinorUnits(sortByStayTotal ? bestOption.quote.total.amount : bestOption.nightlyRate.amount)
          : null;
        const shouldReplace = bestAmount === null
          || (input.sort?.direction === "descending" ? candidateAmount > bestAmount : candidateAmount < bestAmount);

        if (shouldReplace) bestOption = candidate;
      } catch {
        hasUnknownPriceData = true;
      }
    }
  }

  if (rateCurrencies.size > 1 || hasUnknownPriceData) {
    return { priceOption: null, hasUnknownPriceData: true };
  }
  return { priceOption: bestOption, hasUnknownPriceData };
}

function compareEvaluatedProperties(
  first: EvaluatedProperty,
  second: EvaluatedProperty,
  input: AssistantSearchInput,
): number {
  const firstAmount = getSortAmount(first.property, first.priceOption, input.sort, input.filters);
  const secondAmount = getSortAmount(second.property, second.priceOption, input.sort, input.filters);
  if (firstAmount === null && secondAmount === null) return comparePropertyName(first.property, second.property);
  if (firstAmount === null) return 1;
  if (secondAmount === null) return -1;

  const firstCurrency = getSortCurrency(first.property, first.priceOption, input.sort, input.filters);
  const secondCurrency = getSortCurrency(second.property, second.priceOption, input.sort, input.filters);
  const currencyComparison = (firstCurrency ?? "").localeCompare(secondCurrency ?? "");
  if (currencyComparison !== 0) return currencyComparison;

  const comparison = firstAmount < secondAmount ? -1 : firstAmount > secondAmount ? 1 : 0;
  const requestedComparison = input.sort?.direction === "descending" ? comparison * -1 : comparison;

  return requestedComparison
    || comparePropertyName(first.property, second.property);
}

function comparePropertyName(first: AssistantPropertyDocument, second: AssistantPropertyDocument): number {
  return first.name.localeCompare(second.name) || first._id.localeCompare(second._id);
}

function getSortAmount(
  property: AssistantPropertyDocument,
  priceOption: StayPriceOption | null,
  sort: AssistantSearchSort | null,
  filters: AssistantSearchFilter[] = [],
): bigint | null {
  if (!sort) return null;
  let amount: unknown;
  if (sort.attribute === "price.startingNightly") amount = priceOption?.nightlyRate.amount;
  else if (sort.attribute === "price.lowestStayTotal") amount = priceOption?.quote.total.amount;
  else {
    const attribute = getAssistantAttribute(sort.attribute);
    if (!attribute) return null;
    if (attribute.scope === "property") amount = getFactValue(property, attribute);
    else {
      const amounts = getScopedEntitiesMatchingFilters(property, attribute.scope, filters, attribute)
        .map((entity) => readPath(entity, attribute.dataPath))
        .filter((value): value is string | number => typeof value === "string" || typeof value === "number");
      if (amounts.length === 0) return null;
      const parsedAmounts = amounts.flatMap((value) => {
        try { return [toMinorUnits(String(value))]; } catch { return []; }
      });
      if (parsedAmounts.length === 0) return null;
      return parsedAmounts.reduce((lowest, value) => value < lowest ? value : lowest);
    }
  }

  if (typeof amount !== "string" && typeof amount !== "number") return null;
  try {
    return toMinorUnits(String(amount));
  } catch {
    return null;
  }
}

function getSortCurrency(
  property: AssistantPropertyDocument,
  priceOption: StayPriceOption | null,
  sort: AssistantSearchSort | null,
  filters: AssistantSearchFilter[] = [],
): string | null {
  if (!sort) return null;
  if (sort.attribute === "price.startingNightly") return priceOption?.nightlyRate.currency ?? null;
  if (sort.attribute === "price.lowestStayTotal") return priceOption?.quote.total.currency ?? null;
  const attribute = getAssistantAttribute(sort.attribute);
  if (!attribute?.money) return null;
  const entities = attribute.scope === "property"
    ? [property as unknown as Record<string, unknown>]
    : getScopedEntitiesMatchingFilters(property, attribute.scope, filters, attribute);
  const currencies = new Set(entities
    .filter((entity) => readPath(entity, attribute.money!.amountPath) !== undefined)
    .map((entity) => readPath(entity, attribute.money!.currencyPath))
    .filter((currency): currency is string => typeof currency === "string"));
  return currencies.size === 1 ? [...currencies][0] : null;
}

function getFactValue(property: AssistantPropertyDocument, attribute: AssistantAttributeDefinition): unknown {
  if (attribute.key === "property.amenities") {
    return Array.isArray(property.amenities) ? property.amenities.map((amenity) => amenity.name) : undefined;
  }
  return readPath(property, attribute.dataPath);
}

function createFact(
  property: AssistantPropertyDocument,
  entity: Record<string, unknown>,
  attribute: AssistantAttributeDefinition,
  entityId?: string,
  entityName?: string,
): AssistantFact {
  const rawValue = attribute.scope === "property"
    ? getFactValue(property, attribute)
    : readPath(entity, attribute.dataPath);
  const money = attribute.money;
  const currency = money ? readPath(entity, money.currencyPath) : undefined;
  const basis = money?.basisPath ? readPath(entity, money.basisPath) : undefined;
  const validMoney = !money || (typeof rawValue === "string"
    && /^\d+(\.\d{1,2})?$/.test(rawValue)
    && typeof currency === "string" && /^[A-Z]{3}$/.test(currency)
    && (basis === undefined || (typeof basis === "string" && basis.length > 0)));

  return {
    attribute: attribute.key,
    label: attribute.label,
    value: rawValue ?? null,
    scope: attribute.scope,
    ...(entityId ? { subject: { id: entityId, ...(entityName ? { name: entityName } : {}) } } : {}),
    ...(typeof currency === "string" ? { unit: currency } : {}),
    ...(typeof basis === "string" ? { basis } : {}),
    status: rawValue === undefined || rawValue === null || !validMoney ? "unknown" : "known",
  };
}

function getRoomFactValue(room: AssistantRoomDocument, attribute: AssistantAttributeDefinition): unknown {
  return readPath(room, attribute.dataPath);
}

function createMatchedFacts(
  property: AssistantPropertyDocument,
  filters: AssistantSearchFilter[],
  sort: AssistantSearchSort | null,
): AssistantFact[] {
  const facts: AssistantFact[] = [];
  const requestedAttributes = new Map<string, AssistantAttributeDefinition>();

  for (const filter of filters) {
    const attribute = getAssistantAttribute(filter.attribute);
    if (!attribute) continue;
    requestedAttributes.set(attribute.key, attribute);
  }

  if (sort) {
    const attribute = getAssistantAttribute(sort.attribute);
    if (attribute && attribute.sortValue?.kind !== "eligible-rate") {
      requestedAttributes.set(attribute.key, attribute);
    }
  }

  for (const attribute of requestedAttributes.values()) {
    if (attribute.scope === "property") {
      facts.push(createFact(property, property as unknown as Record<string, unknown>, attribute));
      continue;
    }

    const matchingEntities = getScopedEntities(property, attribute.scope, attribute).filter((entity) => {
      const matchingFilters = filters.filter((filter) => getAssistantAttribute(filter.attribute)?.scope === attribute.scope);
      return matchingFilters.every((filter) => {
        const filterAttribute = getAssistantAttribute(filter.attribute);
        return filterAttribute ? matchesValue(readPath(entity, filterAttribute.dataPath), filter) : false;
      });
    });

    for (const entity of matchingEntities) {
      const entityId = typeof entity.id === "string" ? entity.id : undefined;
      const entityName = typeof entity.name === "string" ? entity.name : undefined;
      facts.push(createFact(property, entity, attribute, entityId, entityName));
    }
  }

  return facts;
}

function mapPropertyResult(
  property: AssistantPropertyDocument,
  filters: AssistantSearchFilter[],
  sort: AssistantSearchSort | null,
  priceOption: StayPriceOption | null = null,
) {
  const matchedFacts = createMatchedFacts(property, filters, sort);

  // Always include key property facts (amenities, summary, rating) so Tier 1 search has them directly:
  if (Array.isArray(property.amenities)) {
    matchedFacts.push({
      attribute: "property.amenities",
      label: "Amenities",
      value: property.amenities.map((a) => a.name).join(", "),
      scope: "property",
      status: "known",
    });
  }

  if (priceOption) {
    matchedFacts.push({
      attribute: "price.startingNightly",
      label: "Starting nightly rate",
      value: priceOption.nightlyRate.amount,
      unit: priceOption.nightlyRate.currency,
      basis: "per room per night",
      scope: "property",
      status: "known",
    });
  } else if (Array.isArray(property.roomTypes)) {
    const allRates = property.roomTypes.flatMap((r) => r.ratePlans);
    const lowest = allRates
      .map((r) => r.nightlyRate)
      .sort((a, b) => Number(a.amount) - Number(b.amount))[0];
    if (lowest) {
      matchedFacts.push({
        attribute: "price.startingNightly",
        label: "Starting nightly rate",
        value: lowest.amount,
        unit: lowest.currency,
        basis: "per room per night",
        scope: "property",
        status: "known",
      });
    }
  }

  if (priceOption && sort?.attribute === "price.startingNightly") {
    matchedFacts.push({
      attribute: "price.startingNightly",
      label: "Starting nightly price for a matching room",
      value: priceOption.nightlyRate.amount,
      unit: priceOption.nightlyRate.currency,
      basis: "per room per night",
      scope: "property",
      subject: { id: priceOption.roomId, name: priceOption.roomName },
      relatedEntities: [{ type: "rate", id: priceOption.rateId, name: priceOption.rateName }],
      status: "known",
    });
  }
  if (priceOption && sort?.attribute === "price.lowestStayTotal") {
    matchedFacts.push({
      attribute: "price.lowestStayTotal",
      label: "Lowest eligible complete-stay total",
      value: priceOption.quote.total.amount,
      unit: priceOption.quote.total.currency,
      basis: priceOption.basis,
      scope: "property",
      subject: { id: priceOption.roomId, name: priceOption.roomName },
      relatedEntities: [{ type: "rate", id: priceOption.rateId, name: priceOption.rateName }],
      status: "known",
    });
  }
  if (!priceOption && (sort?.attribute === "price.startingNightly" || sort?.attribute === "price.lowestStayTotal")) {
    matchedFacts.push({
      attribute: sort.attribute,
      label: sort.attribute === "price.lowestStayTotal" ? "Lowest eligible complete-stay total" : "Starting nightly price",
      value: null,
      scope: "property",
      status: "unknown",
    });
  }

  return {
    entity: {
      type: "property" as const,
      id: property._id,
      name: property.name,
    },
    facts: matchedFacts,
  };
}

export async function searchAssistantProperties(input: AssistantSearchInput) {
  const token = process.env.AI_SERVICE_TOKEN;
  if (!token) throw new Error("AI_SERVICE_TOKEN is not configured.");
  const fingerprint = createQueryFingerprint(input);
  const offset = input.cursor ? readCursor(input.cursor, fingerprint, token) : 0;
  if (offset === null) throw new RangeError("The search cursor is invalid or does not match the query.");

  const database = await getDatabase();
  const properties: Collection<AssistantPropertyDocument> = database.collection("properties");
  const filter = buildMongoFilter(input.criteria);
  const candidates = await properties.find(filter).toArray();
  const matchedCandidates = candidates.flatMap((property) => {
    const filterStatus = matchPropertyFilters(property, input.filters);
    if (filterStatus === "no_match") return [];

    const priceEvaluation = getStayPriceOption(property, input);
    const sortAmount = getSortAmount(property, priceEvaluation.priceOption, input.sort, input.filters);
    const needsComparableCurrency = Boolean(input.sort
      && getAssistantAttribute(input.sort.attribute)?.money)
      || input.sort?.attribute === "price.startingNightly"
      || input.sort?.attribute === "price.lowestStayTotal";
    const currency = getSortCurrency(property, priceEvaluation.priceOption, input.sort, input.filters);
    const hasUnknownSortValue = input.sort !== null
      && (sortAmount === null || (needsComparableCurrency && !currency));
    return [{
      property,
      filterStatus,
      ...priceEvaluation,
      hasUnknownSortValue,
      sortCurrency: currency,
    }];
  });

  const matchedProperties = matchedCandidates.filter((item) => item.filterStatus === "match");
  const unknownFilterCount = matchedCandidates.filter((item) => item.filterStatus === "unknown").length;
  const comparableCurrencies = new Set(matchedProperties
    .filter((item) => !item.hasUnknownSortValue)
    .map((item) => item.sortCurrency)
    .filter((currency): currency is string => Boolean(currency)));
  const mixedCurrencyRanking = comparableCurrencies.size > 1;
  matchedProperties.sort((first, second) => compareEvaluatedProperties(first, second, input));

  const unknownMatchCount = unknownFilterCount + matchedProperties.filter((item) =>
    item.hasUnknownSortValue
      || (input.sort?.attribute === "price.startingNightly" || input.sort?.attribute === "price.lowestStayTotal")
        && item.hasUnknownPriceData,
  ).length;
  const pageDocuments = matchedProperties.slice(offset, offset + input.pageSize);
  const nextOffset = offset + pageDocuments.length;
  const hasNextPage = nextOffset < matchedProperties.length;
  const totalMatches = matchedProperties.length;

  return {
    criteria: input.criteria,
    appliedFilters: input.filters,
    sort: input.sort,
    status: totalMatches === 0 && unknownMatchCount === 0 ? "no_match" as const
      : unknownMatchCount > 0 || mixedCurrencyRanking ? "incomplete" as const
        : "complete" as const,
    totalMatches,
    evaluatedAllMatches: true,
    unknownMatchCount,
    currencyComparison: !input.sort || (!getAssistantAttribute(input.sort.attribute)?.money
      && input.sort.attribute !== "price.startingNightly"
      && input.sort.attribute !== "price.lowestStayTotal")
      ? "not_applicable" as const
      : mixedCurrencyRanking ? "mixed-currency-grouped" as const : "single-currency" as const,
    matches: pageDocuments.map(({ property, priceOption }) =>
      mapPropertyResult(property, input.filters, input.sort, priceOption)),
    page: {
      pageSize: input.pageSize,
      nextCursor: hasNextPage ? createCursor(nextOffset, fingerprint, token) : null,
      complete: !hasNextPage,
    },
    dataAsOf: new Date().toISOString(),
    demo: true as const,
  };
}

export async function getAssistantPropertyDetails(
  page: "search-results" | "rate-list",
  propertyIds: string[],
  criteria: SearchCriteria,
  attributeKeys: string[],
) {
  const database = await getDatabase();
  const properties: Collection<AssistantPropertyDocument> = database.collection("properties");
  const propertyDocuments = await properties.find({
    _id: { $in: propertyIds },
    "destination.cityNormalized": getSearchableCity(criteria.destination),
    active: true,
  }).toArray();
  const documentById = new Map(propertyDocuments.map((property) => [property._id, property]));
  const missingPropertyIds = propertyIds.filter((propertyId) => !documentById.has(propertyId));
  const selectedAttributes = attributeKeys
    .map((key) => getAssistantAttribute(key))
    .filter((attribute): attribute is AssistantAttributeDefinition => Boolean(attribute));

  const propertyResults = propertyIds.flatMap((propertyId) => {
    const property = documentById.get(propertyId);
    if (!property) return [];
    const priceAttribute = selectedAttributes.find((attribute) =>
      attribute.key === "price.startingNightly" || attribute.key === "price.lowestStayTotal");
    const stayPriceOption = priceAttribute
      ? getStayPriceOption(property, {
          criteria,
          filters: [],
          sort: { attribute: priceAttribute.key, direction: "ascending" },
          pageSize: 1,
          cursor: null,
        }).priceOption
      : null;

    const facts: AssistantFact[] = selectedAttributes.flatMap((attribute): AssistantFact[] => {
      if (attribute.scope === "property") {
        if (attribute.key === "price.startingNightly" || attribute.key === "price.lowestStayTotal") {
          const stayPriceValue = attribute.key === "price.startingNightly"
            ? stayPriceOption?.nightlyRate.amount ?? null
            : stayPriceOption
              ? {
                  subtotal: stayPriceOption.quote.subtotal,
                  taxesAndFees: stayPriceOption.quote.taxesAndFees,
                  total: stayPriceOption.quote.total,
                }
              : null;
          return [{
            attribute: attribute.key,
            label: attribute.label,
            value: stayPriceValue,
            unit: stayPriceOption?.nightlyRate.currency,
            basis: stayPriceOption
              ? attribute.key === "price.startingNightly" ? "per room per night" : stayPriceOption.basis
              : undefined,
            scope: "property" as const,
            status: stayPriceOption ? "known" as const : "unknown" as const,
          }];
        }
        return [createFact(property, property as unknown as Record<string, unknown>, attribute)];
      }

      const scopedEntities = getScopedEntities(property, attribute.scope, attribute);
      if (scopedEntities.length === 0) {
        const collectionIsComplete = hasCompleteScopeCollection(property, attribute.scope);
        const status: AssistantFact["status"] = collectionIsComplete
          ? attribute.absenceStatus ?? "unknown"
          : "unknown";
        return [{
          attribute: attribute.key,
          label: attribute.label,
          value: collectionIsComplete ? attribute.absenceValue ?? null : null,
          scope: attribute.scope,
          status,
        }];
      }

      return scopedEntities.map((entity) => {
        const entityId = typeof entity.id === "string" ? entity.id : undefined;
        const entityName = typeof entity.name === "string" ? entity.name : undefined;
        return createFact(property, entity, attribute, entityId, entityName);
      });
    });

    return [{
      entity: { type: "property" as const, id: property._id, name: property.name },
      facts,
    }];
  });

  return {
    entities: propertyResults,
    missingEntityIds: missingPropertyIds,
    status: missingPropertyIds.length > 0
      || propertyResults.some((property) => property.facts.some((fact) => fact.status === "unknown"))
      ? "incomplete" as const
      : "complete" as const,
    dataAsOf: new Date().toISOString(),
    demo: true as const,
  };
}
