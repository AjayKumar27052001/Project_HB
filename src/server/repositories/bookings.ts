import "server-only";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { Collection } from "mongodb";
import { getDatabase } from "@/server/mongo/database";
import type { BookingConfirmation } from "@/shared/types";

export type CreateBookingRecordInput = Omit<BookingConfirmation, "bookingId" | "confirmationCode" | "status" | "demo" | "createdAt"> & {
  idempotencyKey: string;
};

type BookingDocument = Omit<BookingConfirmation, "bookingId"> & {
  _id: string;
  idempotencyKey: string;
  requestHash: string;
};

export class IdempotencyConflictError extends Error {}

async function getBookingCollection(): Promise<Collection<BookingDocument>> {
  const database = await getDatabase();
  return database.collection<BookingDocument>("bookings");
}

function createRequestHash(input: CreateBookingRecordInput): string {
  const { idempotencyKey: _idempotencyKey, ...bookingInput } = input;
  return createHash("sha256").update(JSON.stringify(bookingInput)).digest("hex");
}

function toConfirmation(document: BookingDocument): BookingConfirmation {
  const { _id: bookingId, idempotencyKey: _key, requestHash: _hash, ...confirmation } = document;
  return { ...confirmation, bookingId };
}

export async function createBookingRecord(
  input: CreateBookingRecordInput,
): Promise<{ booking: BookingConfirmation; created: boolean }> {
  const bookings = await getBookingCollection();
  const requestHash = createRequestHash(input);
  const existing = await bookings.findOne({ idempotencyKey: input.idempotencyKey });

  if (existing) {
    if (existing.requestHash !== requestHash) throw new IdempotencyConflictError();
    return { booking: toConfirmation(existing), created: false };
  }

  const booking: BookingDocument = {
    _id: randomUUID(),
    confirmationCode: `DEMO-${randomBytes(3).toString("hex").toUpperCase()}`,
    idempotencyKey: input.idempotencyKey,
    requestHash,
    status: "confirmed",
    demo: true,
    profile: input.profile,
    profileId: input.profile.id,
    guestContact: input.guestContact,
    property: input.property,
    stay: input.stay,
    selection: input.selection,
    priceSnapshot: input.priceSnapshot,
    createdAt: new Date().toISOString(),
  };

  try {
    await bookings.insertOne(booking);
    return { booking: toConfirmation(booking), created: true };
  } catch (error) {
    const duplicateRequest = await bookings.findOne({ idempotencyKey: input.idempotencyKey });

    if (duplicateRequest) {
      if (duplicateRequest.requestHash !== requestHash) throw new IdempotencyConflictError();
      return { booking: toConfirmation(duplicateRequest), created: false };
    }

    throw error;
  }
}

export async function findBookingByConfirmationCode(
  confirmationCode: string,
): Promise<BookingConfirmation | null> {
  const bookings = await getBookingCollection();
  const document = await bookings.findOne({ confirmationCode });
  return document ? toConfirmation(document) : null;
}
