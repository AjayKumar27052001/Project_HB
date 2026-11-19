import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getAssistantAttribute } from "@/server/assistant/attribute-registry";
import {
  assistantError,
  authorizeAssistantService,
  isNonEmptyString,
  isPlainObject,
  parseSearchCriteria,
  readJsonObject,
} from "@/server/assistant/internal-api";
import { getAssistantPropertyDetails } from "@/server/repositories/assistant-properties";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authorizationError = authorizeAssistantService(request);
  if (authorizationError) return authorizationError;

  const body = await readJsonObject(request);
  if (!body) return assistantError("VALIDATION_ERROR", "Send a valid JSON property-details request.", 400);
  const allowedKeys = new Set(["page", "propertyIds", "criteria", "attributes"]);
  if (Object.keys(body).some((key) => !allowedKeys.has(key))) {
    return assistantError("VALIDATION_ERROR", "The property-details request contains unsupported fields.", 400);
  }

  const page = body.page;
  const propertyIds = body.propertyIds;
  const criteria = parseSearchCriteria(body.criteria);
  const attributes = body.attributes;

  if ((page !== "search-results" && page !== "rate-list")
    || !Array.isArray(propertyIds)
    || propertyIds.length < 1
    || propertyIds.length > (page === "rate-list" ? 1 : 10)
    || !propertyIds.every((propertyId) => isNonEmptyString(propertyId, 100))
    || new Set(propertyIds).size !== propertyIds.length
    || !criteria
    || !Array.isArray(attributes)
    || attributes.length < 1
    || attributes.length > 20
    || !attributes.every((key) => typeof key === "string" && Boolean(getAssistantAttribute(key)))) {
    return assistantError("VALIDATION_ERROR", "The property IDs, page scope, criteria, or attributes are invalid.", 400);
  }

  if (page === "rate-list" && !isPlainObject(body.criteria)) {
    return assistantError("VALIDATION_ERROR", "RLM property details require the current stay criteria.", 400);
  }

  try {
    const result = await getAssistantPropertyDetails(page, propertyIds, criteria, attributes as string[]);
    const { status, dataAsOf, demo, ...data } = result;
    return NextResponse.json({ status, requestId: randomUUID(), demo, dataAsOf, data });
  } catch {
    return assistantError("PROPERTY_DETAILS_UNAVAILABLE", "Property details are temporarily unavailable.", 503);
  }
}
