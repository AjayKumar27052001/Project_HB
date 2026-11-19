export type AssistantAttributeScope = "property" | "room" | "rate" | "service";
export type AssistantAttributeValueType = "boolean" | "number" | "text" | "list";
export type AssistantFilterOperator = "equals" | "contains" | "less_than" | "greater_than";
export type AssistantSortValue =
  | { kind: "decimal-field"; path: string }
  | { kind: "eligible-rate"; basis: "nightly" | "stay-total" };

export type AssistantAttributeDefinition = {
  key: string;
  scope: AssistantAttributeScope;
  dataPath: string;
  valueType: AssistantAttributeValueType;
  label: string;
  aliases: string[];
  sortable?: boolean;
  sortValue?: AssistantSortValue;
  /** Optional structured-money metadata used by generic sorting and evidence formatting. */
  money?: { amountPath: string; currencyPath: string; basisPath?: string };
  entityType?: string;
  /** Known value when a complete scoped collection has no matching entity. */
  absenceValue?: unknown;
  absenceStatus?: "known" | "not_applicable";
  filterOperators?: AssistantFilterOperator[];
};

const assistantAttributes: AssistantAttributeDefinition[] = [
  {
    key: "petPolicy.allowed",
    scope: "property",
    dataPath: "assistantAttributes.petPolicy.allowed",
    valueType: "boolean",
    label: "Pets allowed",
    aliases: ["pet friendly", "pets accepted", "pet policy"],
  },
  {
    key: "petPolicy.fee.amount",
    scope: "property",
    dataPath: "assistantAttributes.petPolicy.fee.amount",
    valueType: "number",
    label: "Pet fee",
    aliases: ["pet fee", "pet charge"],
    sortable: true,
    sortValue: { kind: "decimal-field", path: "assistantAttributes.petPolicy.fee.amount" },
    money: {
      amountPath: "assistantAttributes.petPolicy.fee.amount",
      currencyPath: "assistantAttributes.petPolicy.fee.currency",
      basisPath: "assistantAttributes.petPolicy.fee.basis",
    },
  },
  {
    key: "parking.available",
    scope: "property",
    dataPath: "assistantAttributes.parking.available",
    valueType: "boolean",
    label: "Parking available",
    aliases: ["parking", "car parking", "self parking", "valet"],
  },
  {
    key: "internet.wifi.available",
    scope: "property",
    dataPath: "assistantAttributes.internet.wifi.available",
    valueType: "boolean",
    label: "Wi-Fi available",
    aliases: ["wifi", "wi-fi", "wireless internet", "internet"],
  },
  {
    key: "fitnessCenter.available",
    scope: "property",
    dataPath: "assistantAttributes.fitnessCenter.available",
    valueType: "boolean",
    label: "Fitness center available",
    aliases: ["fitness center", "gym", "workout room"],
  },
  {
    key: "pool.available",
    scope: "property",
    dataPath: "assistantAttributes.pool.available",
    valueType: "boolean",
    label: "Pool available",
    aliases: ["pool", "swimming pool"],
  },
  {
    key: "price.startingNightly",
    scope: "property",
    dataPath: "roomTypes.ratePlans.nightlyRate.amount",
    valueType: "number",
    label: "Starting nightly price",
    aliases: ["starting nightly rate", "lowest nightly price", "cheapest hotel rate"],
    sortable: true,
    filterOperators: [],
    sortValue: { kind: "eligible-rate", basis: "nightly" },
  },
  {
    key: "price.lowestStayTotal",
    scope: "property",
    dataPath: "roomTypes.ratePlans",
    valueType: "number",
    label: "Lowest complete-stay total",
    aliases: ["lowest stay total", "lowest total price", "cheapest total for this stay"],
    sortable: true,
    filterOperators: [],
    sortValue: { kind: "eligible-rate", basis: "stay-total" },
  },
  {
    key: "property.amenities",
    scope: "property",
    dataPath: "amenities.name",
    valueType: "list",
    label: "Property amenities",
    aliases: ["amenities", "facilities", "hotel facilities"],
  },
  {
    key: "service.spa.available",
    scope: "service",
    dataPath: "assistantAttributes.available",
    entityType: "spaTreatment",
    absenceValue: false,
    absenceStatus: "known",
    valueType: "boolean",
    label: "Spa service available",
    aliases: ["spa", "spa service", "spa available"],
  },
  {
    key: "service.spaTreatment.price.amount",
    scope: "service",
    dataPath: "price.amount",
    entityType: "spaTreatment",
    valueType: "number",
    label: "Spa treatment price",
    aliases: ["spa price", "massage price", "treatment cost"],
    sortable: true,
    sortValue: { kind: "decimal-field", path: "price.amount" },
    money: {
      amountPath: "price.amount",
      currencyPath: "price.currency",
      basisPath: "price.basis",
    },
    absenceValue: null,
    absenceStatus: "not_applicable",
  },
  {
    key: "property.location",
    scope: "property",
    dataPath: "address.line1",
    valueType: "text",
    label: "Property location",
    aliases: ["location", "address", "where is it"],
  },
  {
    key: "room.accessible",
    scope: "room",
    dataPath: "assistantAttributes.accessible",
    valueType: "boolean",
    label: "Accessible room offered",
    absenceValue: false,
    absenceStatus: "known",
    aliases: ["accessible room", "accessibility features", "wheelchair accessible"],
  },
  {
    key: "room.rollawayBed",
    scope: "room",
    dataPath: "assistantAttributes.rollawayBed",
    valueType: "boolean",
    label: "Rollaway bed supported",
    absenceValue: false,
    absenceStatus: "known",
    aliases: ["rollaway bed", "extra bed"],
  },
  {
    key: "room.crib",
    scope: "room",
    dataPath: "assistantAttributes.crib",
    valueType: "boolean",
    label: "Crib supported",
    absenceValue: false,
    absenceStatus: "known",
    aliases: ["crib", "cot", "baby bed"],
  },
  {
    key: "room.accessibleFeatures",
    scope: "room",
    dataPath: "assistantAttributes.accessibleFeatures",
    valueType: "list",
    label: "Accessible room features",
    aliases: ["step-free entry", "accessible bathroom", "mobility features"],
  },
  {
    key: "policies.checkIn",
    scope: "property",
    dataPath: "policies.checkIn",
    valueType: "text",
    label: "Check-in time",
    aliases: ["check-in", "arrival time"],
  },
  {
    key: "policies.checkOut",
    scope: "property",
    dataPath: "policies.checkOut",
    valueType: "text",
    label: "Check-out time",
    aliases: ["check-out", "departure time"],
  },
  {
    key: "policies.cancellation",
    scope: "property",
    dataPath: "policies.cancellation",
    valueType: "text",
    label: "General cancellation policy",
    aliases: ["cancellation policy", "cancellation terms"],
  },
];

export function getAssistantAttribute(key: string): AssistantAttributeDefinition | undefined {
  return assistantAttributes.find((attribute) => attribute.key === key);
}

export function listAssistantAttributes(): AssistantAttributeDefinition[] {
  return assistantAttributes;
}

export function getAssistantFilterOperators(
  attribute: AssistantAttributeDefinition,
): AssistantFilterOperator[] {
  if (attribute.filterOperators) return attribute.filterOperators;
  if (attribute.valueType === "list") return ["contains"];
  if (attribute.valueType === "number") {
    return ["equals", "less_than", "greater_than"];
  }
  return ["equals"];
}

export function isAssistantAttributeValue(
  attribute: AssistantAttributeDefinition,
  value: unknown,
): boolean {
  if (attribute.valueType === "boolean") return typeof value === "boolean";
  if (attribute.valueType === "number") return typeof value === "number" && Number.isFinite(value);
  if (attribute.valueType === "text") return typeof value === "string";
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}
