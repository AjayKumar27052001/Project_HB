import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { findDemoProfile } from "@/server/repositories/demo-profiles";
import { findMongoBookingSelection } from "@/server/repositories/property-rates";
import { getStayNightCount } from "@/server/pricing/rate-quote";
import { createBookingRecord, IdempotencyConflictError } from "@/server/repositories/bookings";
import type { BookingConfirmation } from "@/shared/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type BookingRequest = {
  propertyId?: unknown;
  roomId?: unknown;
  rateId?: unknown;
  checkIn?: unknown;
  checkOut?: unknown;
  adults?: unknown;
  rooms?: unknown;
  profileId?: unknown;
};

function isString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validDateRange(checkIn: string, checkOut: string): boolean {
  const isRealDate = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  };

  return isRealDate(checkIn)
    && isRealDate(checkOut)
    && checkOut > checkIn;
}

function validationError(message: string, status: number) {
  return NextResponse.json({ error: { code: "VALIDATION_ERROR", message, requestId: randomUUID() } }, { status });
}

export async function POST(request: NextRequest) {
  const idempotencyKey = request.headers.get("Idempotency-Key");
  if (!idempotencyKey?.trim() || idempotencyKey.trim().length > 200) {
    return validationError("A valid Idempotency-Key header is required.", 400);
  }

  let body: BookingRequest;
  try {
    body = await request.json() as BookingRequest;
  } catch {
    return validationError("Send a valid JSON booking request.", 400);
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return validationError("Send a valid booking object.", 400);
  }

  const allowedFields = new Set([
    "propertyId", "roomId", "rateId", "checkIn", "checkOut", "adults", "rooms", "profileId",
  ]);
  if (Object.keys(body).some((field) => !allowedFields.has(field))) {
    return validationError("The booking request contains unsupported fields.", 400);
  }

  const { propertyId, roomId, rateId, checkIn, checkOut, adults, rooms, profileId } = body;
  if (!isString(propertyId) || !isString(roomId) || !isString(rateId)
    || !isString(checkIn) || !isString(checkOut) || !isString(profileId)) {
    return validationError("Choose a property, room, rate, dates, and demo profile.", 400);
  }
  if (!validDateRange(checkIn, checkOut)) {
    return validationError("Choose a check-out date after check-in.", 400);
  }
  try {
    getStayNightCount(checkIn, checkOut);
  } catch {
    return validationError("Choose a stay between 1 and 30 nights.", 400);
  }
  if (typeof adults !== "number" || !Number.isInteger(adults) || adults < 1 || adults > 8) {
    return validationError("Choose between 1 and 8 adults.", 400);
  }
  if (typeof rooms !== "number" || !Number.isInteger(rooms) || rooms < 1 || rooms > 5) {
    return validationError("Choose between 1 and 5 rooms.", 400);
  }

  try {
    const [profile, selection] = await Promise.all([
      findDemoProfile(profileId),
      findMongoBookingSelection(propertyId, roomId, rateId, { checkIn, checkOut, adults, rooms }),
    ]);

    if (!profile) {
      return NextResponse.json({ error: { code: "DEMO_PROFILE_NOT_FOUND", message: "The selected demo profile is unavailable.", requestId: randomUUID() } }, { status: 404 });
    }
    if (!selection) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "The selected property, room, or rate is unavailable.", requestId: randomUUID() } }, { status: 404 });
    }
    if (adults > selection.maxAdults * rooms || rooms > selection.availableRooms) {
      return NextResponse.json({ error: { code: "BOOKING_CONFLICT", message: "The selected room or guest count is outside the demo limits.", requestId: randomUUID() } }, { status: 409 });
    }

    const confirmation: Omit<BookingConfirmation, "bookingId" | "confirmationCode" | "status" | "demo" | "createdAt"> = {
      profileId: profile.id,
      profile: { id: profile.id, displayName: profile.displayName },
      guestContact: { name: profile.displayName, email: profile.email },
      property: selection.property,
      stay: { checkIn, checkOut, nights: getStayNightCount(checkIn, checkOut), adults: Number(adults), rooms: Number(rooms) },
      selection: {
        roomId: selection.room.id,
        roomName: selection.room.name,
        rateId: selection.rate.id,
        rateName: selection.rate.name,
        cancellationSummary: selection.rate.cancellationSummary,
        paymentSummary: selection.rate.paymentSummary,
      },
      priceSnapshot: {
        subtotal: selection.rate.subtotal,
        taxesAndFees: selection.rate.taxesAndFees,
        total: selection.rate.total,
        priceBasis: { rooms, nights: getStayNightCount(checkIn, checkOut) },
      },
    };

    const result = await createBookingRecord({ ...confirmation, idempotencyKey });
    return NextResponse.json(result.booking, { status: result.created ? 201 : 200 });
  } catch (error) {
    if (error instanceof IdempotencyConflictError) {
      return NextResponse.json({ error: { code: "BOOKING_CONFLICT", message: "This checkout request key was already used for a different selection.", requestId: randomUUID() } }, { status: 409 });
    }

    return NextResponse.json({ error: { code: "BOOKING_UNAVAILABLE", message: "The demo reservation could not be saved right now.", requestId: randomUUID() } }, { status: 503 });
  }
}
