import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getAssistantAttribute, getAssistantFilterOperators, isAssistantAttributeValue } from "@/server/assistant/attribute-registry";
import {
  assistantError,
  authorizeAssistantService,
  isPlainObject,
  parseSearchCriteria,
  readJsonObject,
} from "@/server/assistant/internal-api";
import {
  searchAssistantProperties,
  type AssistantSearchFilter,
  type AssistantSearchSort,
} from "@/server/repositories/assistant-properties";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const maximumPageSize = 50;
const maximumFilters = 12;

function parseFilters(value: unknown): AssistantSearchFilter[] | null {
  if (!Array.isArray(value) || value.length > maximumFilters) return null;
  const filters: AssistantSearchFilter[] = [];

  for (const item of value) {
    if (!isPlainObject(item)
      || Object.keys(item).some((key) => !["attribute", "operator", "value"].includes(key))) return null;
    const attribute = typeof item.attribute === "string" ? getAssistantAttribute(item.attribute) : undefined;
    if (!attribute || !["equals", "contains", "less_than", "greater_than"].includes(String(item.operator))) return null;
    if (!getAssistantFilterOperators(attribute).includes(item.operator as AssistantSearchFilter["operator"])) return null;

    if (item.operator === "equals") {
      if (attribute.valueType === "list" || !isAssistantAttributeValue(attribute, item.value)) return null;
    } else if (item.operator === "contains") {
      const canSearchList = attribute.valueType === "list" && typeof item.value === "string";
      if (!canSearchList) return null;
    } else if (attribute.valueType !== "number" || typeof item.value !== "number" || !Number.isFinite(item.value)) {
      return null;
    }

    filters.push({
      attribute: attribute.key,
      operator: item.operator as AssistantSearchFilter["operator"],
      value: item.value,
    });
  }

  return filters;
}

function parseSort(value: unknown): AssistantSearchSort | null | undefined {
  if (value === null) return null;
  if (!isPlainObject(value)
    || Object.keys(value).some((key) => !["attribute", "direction"].includes(key))
    || typeof value.attribute !== "string") return undefined;

  const attribute = getAssistantAttribute(value.attribute);
  if (!attribute?.sortable || !attribute.sortValue) return undefined;
  if (value.direction !== "ascending" && value.direction !== "descending") return undefined;

  return {
    attribute: attribute.key,
    direction: value.direction,
  };
}

export async function POST(request: Request) {
  const authorizationError = authorizeAssistantService(request);
  if (authorizationError) return authorizationError;

  const body = await readJsonObject(request);
  if (!body) return assistantError("VALIDATION_ERROR", "Send a valid JSON search request.", 400);
  const allowedKeys = new Set(["criteria", "filters", "sort", "pageSize", "cursor"]);
  if (Object.keys(body).some((key) => !allowedKeys.has(key))) {
    return assistantError("VALIDATION_ERROR", "The assistant search contains unsupported fields.", 400);
  }

  const criteria = parseSearchCriteria(body.criteria);
  const filters = parseFilters(body.filters);
  const sort = parseSort(body.sort);
  const pageSize = body.pageSize;
  const cursor = body.cursor;

  if (!criteria || !filters || sort === undefined
    || typeof pageSize !== "number" || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > maximumPageSize
    || (cursor !== null && (typeof cursor !== "string" || cursor.length > 2048))) {
    return assistantError("VALIDATION_ERROR", "The assistant search criteria or paging values are invalid.", 400);
  }

  try {
    const data = await searchAssistantProperties({ criteria, filters, sort, pageSize, cursor });
    return NextResponse.json({
      status: data.status,
      requestId: randomUUID(),
      demo: true,
      dataAsOf: data.dataAsOf,
      data: {
        criteria: data.criteria,
        appliedFilters: data.appliedFilters,
        sort: data.sort,
        totalMatches: data.totalMatches,
        evaluatedAllMatches: data.evaluatedAllMatches,
        unknownMatchCount: data.unknownMatchCount,
        currencyComparison: data.currencyComparison,
        matches: data.matches,
        page: data.page,
      },
    });
  } catch (error) {
    if (error instanceof RangeError) {
      return assistantError("INVALID_CURSOR", "The assistant search cursor is invalid or expired.", 400);
    }
    if (error instanceof Error && error.message.includes("AI_SERVICE_TOKEN")) {
      return assistantError("SERVICE_NOT_CONFIGURED", "Assistant service access is not configured.", 503);
    }
    if (error instanceof Error && error.message.includes("Unsupported assistant")) {
      return assistantError("UNSUPPORTED_ATTRIBUTE", "The requested assistant search field is not supported.", 400);
    }
    return assistantError("SEARCH_UNAVAILABLE", "Assistant search data is temporarily unavailable.", 503);
  }
}
