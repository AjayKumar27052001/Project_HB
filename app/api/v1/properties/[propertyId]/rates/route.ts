import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getStayNightCount } from "@/server/pricing/rate-quote";
import { getMongoPropertyRates } from "@/server/repositories/property-rates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ propertyId: string }> };

function isRealDate(value: string | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function getInteger(value: string | null, minimum: number, maximum: number): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const parsedValue = Number(value);
  return Number.isInteger(parsedValue) && parsedValue >= minimum && parsedValue <= maximum ? parsedValue : null;
}

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message, requestId: randomUUID() } }, { status });
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { propertyId } = await context.params;
  if (!propertyId.trim() || propertyId.length > 100) {
    return errorResponse("VALIDATION_ERROR", "Provide a valid property ID.", 400);
  }

  const parameters = request.nextUrl.searchParams;
  const allowedParameters = new Set(["checkIn", "checkOut", "adults", "rooms"]);
  if ([...parameters.keys()].some((key) => !allowedParameters.has(key))) {
    return errorResponse("VALIDATION_ERROR", "The rate request contains unsupported criteria.", 400);
  }
  const checkIn = parameters.get("checkIn");
  const checkOut = parameters.get("checkOut");
  const adults = getInteger(parameters.get("adults"), 1, 8);
  const rooms = getInteger(parameters.get("rooms"), 1, 5);

  if (!isRealDate(checkIn) || !isRealDate(checkOut) || checkOut <= checkIn) {
    return errorResponse("VALIDATION_ERROR", "Choose valid dates with check-out after check-in.", 400);
  }
  if (adults === null || rooms === null) {
    return errorResponse("VALIDATION_ERROR", "Choose between 1 and 8 adults and 1 and 5 rooms.", 400);
  }

  try {
    getStayNightCount(checkIn, checkOut);
  } catch {
    return errorResponse("VALIDATION_ERROR", "Choose a stay between 1 and 30 nights.", 400);
  }

  try {
    const result = await getMongoPropertyRates(propertyId, { checkIn, checkOut, adults, rooms });
    if (!result) {
      return errorResponse("NOT_FOUND", "The selected sample property is unavailable.", 404);
    }

    return NextResponse.json(result);
  } catch {
    return errorResponse("RATES_UNAVAILABLE", "Rate options are temporarily unavailable. Please try again.", 503);
  }
}
