import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { findBookingByConfirmationCode } from "@/server/repositories/bookings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = Promise<{ confirmationCode: string }>;

export async function GET(_request: Request, { params }: { params: RouteParams }) {
  const { confirmationCode } = await params;

  try {
    const booking = await findBookingByConfirmationCode(confirmationCode);

    if (!booking) {
      return NextResponse.json({ error: { code: "BOOKING_NOT_FOUND", message: "No demo booking was found for that confirmation code.", requestId: randomUUID() } }, { status: 404 });
    }

    return NextResponse.json(booking);
  } catch {
    return NextResponse.json({ error: { code: "BOOKING_UNAVAILABLE", message: "The demo confirmation is unavailable right now.", requestId: randomUUID() } }, { status: 503 });
  }
}
