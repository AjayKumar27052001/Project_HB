import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  assistantError,
  authorizeAssistantService,
  isNonEmptyString,
  isPlainObject,
  parseStayCriteria,
  readJsonObject,
} from "@/server/assistant/internal-api";
import { getStayNightCount } from "@/server/pricing/rate-quote";
import { findMongoBookingSelection } from "@/server/repositories/property-rates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authorizationError = authorizeAssistantService(request);
  if (authorizationError) return authorizationError;

  const body = await readJsonObject(request);
  if (!body) return assistantError("VALIDATION_ERROR", "Send a valid JSON checkout-summary request.", 400);
  const allowedKeys = new Set(["propertyId", "roomId", "rateId", "criteria"]);
  if (Object.keys(body).some((key) => !allowedKeys.has(key))) {
    return assistantError("VALIDATION_ERROR", "The checkout-summary request contains unsupported fields.", 400);
  }

  const { propertyId, roomId, rateId } = body;
  const criteria = parseStayCriteria(body.criteria);
  if (!isNonEmptyString(propertyId, 100)
    || !isNonEmptyString(roomId, 100)
    || !isNonEmptyString(rateId, 100)
    || !criteria
    || !isPlainObject(body.criteria)) {
    return assistantError("VALIDATION_ERROR", "The selected property, room, rate, or stay criteria are invalid.", 400);
  }

  try {
    const selection = await findMongoBookingSelection(
      propertyId.trim(),
      roomId.trim(),
      rateId.trim(),
      criteria,
    );
    if (!selection) return assistantError("NOT_FOUND", "The selected property, room, or rate is unavailable.", 404);

    if (criteria.adults > selection.maxAdults * criteria.rooms
      || criteria.rooms > selection.availableRooms) {
      return assistantError("SELECTION_UNAVAILABLE", "The current room selection does not support this guest or room count.", 409);
    }

    const nights = getStayNightCount(criteria.checkIn, criteria.checkOut);
    return NextResponse.json({
      status: "complete",
      requestId: randomUUID(),
      demo: true,
      dataAsOf: new Date().toISOString(),
      data: {
        property: {
          propertyId: selection.property.id,
          name: selection.property.name,
        },
        stay: { ...criteria, nights },
        selection: {
          roomId: selection.room.id,
          roomName: selection.room.name,
          rateId: selection.rate.id,
          rateName: selection.rate.name,
          includes: selection.rate.includes ?? [],
          cancellation: selection.rate.cancellationSummary,
          payment: selection.rate.paymentSummary,
        },
        price: {
          subtotal: selection.rate.subtotal,
          taxesAndFees: selection.rate.taxesAndFees,
          total: selection.rate.total,
          basis: `${nights}-night stay, ${criteria.rooms} room${criteria.rooms === 1 ? "" : "s"}`,
        },
      },
    });
  } catch {
    return assistantError("CHECKOUT_SUMMARY_UNAVAILABLE", "The selected booking details are temporarily unavailable.", 503);
  }
}
