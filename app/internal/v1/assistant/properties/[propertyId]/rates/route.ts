import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  assistantError,
  authorizeAssistantService,
  isNonEmptyString,
  parseStayCriteria,
} from "@/server/assistant/internal-api";
import { getMongoPropertyRates } from "@/server/repositories/property-rates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ propertyId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const authorizationError = authorizeAssistantService(request);
  if (authorizationError) return authorizationError;

  const { propertyId } = await context.params;
  if (!isNonEmptyString(propertyId, 100)) {
    return assistantError("VALIDATION_ERROR", "Provide a valid property ID.", 400);
  }

  const url = new URL(request.url);
  const allowedParameters = new Set(["checkIn", "checkOut", "adults", "rooms"]);
  if ([...url.searchParams.keys()].some((key) => !allowedParameters.has(key))) {
    return assistantError("VALIDATION_ERROR", "The assistant rate request contains unsupported criteria.", 400);
  }

  const adults = url.searchParams.get("adults");
  const rooms = url.searchParams.get("rooms");
  const criteria = parseStayCriteria({
    checkIn: url.searchParams.get("checkIn"),
    checkOut: url.searchParams.get("checkOut"),
    adults: adults && /^\d+$/.test(adults) ? Number(adults) : null,
    rooms: rooms && /^\d+$/.test(rooms) ? Number(rooms) : null,
  });
  if (!criteria) {
    return assistantError("VALIDATION_ERROR", "The stay dates, adult count, or room count are invalid.", 400);
  }

  try {
    const result = await getMongoPropertyRates(propertyId.trim(), criteria);
    if (!result) return assistantError("NOT_FOUND", "The selected sample property is unavailable.", 404);

    return NextResponse.json({
      status: "complete",
      requestId: randomUUID(),
      demo: true,
      dataAsOf: new Date().toISOString(),
      data: result,
    });
  } catch {
    return assistantError("RATES_UNAVAILABLE", "Room and rate information is temporarily unavailable.", 503);
  }
}
