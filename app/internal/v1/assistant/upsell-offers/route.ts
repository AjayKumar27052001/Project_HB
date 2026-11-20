import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  assistantError,
  authorizeAssistantService,
  isNonEmptyString,
  readJsonObject,
} from "@/server/assistant/internal-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authorizationError = authorizeAssistantService(request);
  if (authorizationError) return authorizationError;

  const body = await readJsonObject(request);
  if (!body) return assistantError("VALIDATION_ERROR", "Send a valid JSON upselling request.", 400);

  const propertyId = body.propertyId;
  const tier = (typeof body.tier === "string" ? body.tier.toLowerCase() : "silver");

  if (!isNonEmptyString(propertyId, 100)) {
    return assistantError("VALIDATION_ERROR", "A valid propertyId is required.", 400);
  }

  const isPlatinum = tier.includes("platinum");
  const isGold = tier.includes("gold");

  // Dynamic contextual offers strictly configured for Confirmation stage
  const offers = [
    {
      id: "UPSELL-ROOM-UPGRADE",
      type: "room_upgrade",
      title: "Deluxe Suite Room Upgrade",
      description: "Upgrade from your confirmed room to an expansive Deluxe Suite with premium views.",
      price: { amount: 1500, currency: "INR", basis: "per night" },
      perkBadge: (isGold || isPlatinum) ? "Eligible to claim with Free Upgrade Award" : null,
    },
    {
      id: "UPSELL-BREAKFAST",
      type: "dining",
      title: "Daily Gourmet Breakfast Package",
      description: "Full hot breakfast buffet for up to 2 guests every morning of your stay.",
      price: isPlatinum ? { amount: 0, currency: "INR", basis: "complimentary" } : { amount: 500, currency: "INR", basis: "per guest / day" },
      perkBadge: isPlatinum ? "Complimentary Platinum Member Benefit" : null,
    },
    {
      id: "UPSELL-AIRPORT-TRANSFER",
      type: "transportation",
      title: "Private Airport Chauffeur Transfer",
      description: "Dedicated private luxury pickup or drop-off between airport and property.",
      price: { amount: 1200, currency: "INR", basis: "per trip" },
      perkBadge: null,
    },
    {
      id: "UPSELL-SPECIAL-OCCASION",
      type: "celebration",
      title: "Special Occasion Celebration Package",
      description: "Custom room decoration, celebratory artisanal pastry, and floral arrangement.",
      price: { amount: 2000, currency: "INR", basis: "per stay" },
      perkBadge: "Recommended for Confirmation Stage",
    },
    {
      id: "UPSELL-LATE-CHECKOUT",
      type: "service",
      title: "Guaranteed Late Checkout (2:00 PM)",
      description: "Enjoy an extra 3 hours of relaxation on your departure day.",
      price: (isGold || isPlatinum) ? { amount: 0, currency: "INR", basis: "complimentary priority" } : { amount: 800, currency: "INR", basis: "per stay" },
      perkBadge: (isGold || isPlatinum) ? "Priority Benefit for Gold & Platinum" : null,
    },
  ];

  return NextResponse.json({
    status: "complete",
    requestId: randomUUID(),
    dataAsOf: new Date().toISOString(),
    data: {
      propertyId,
      guestTier: tier,
      offers,
    },
  });
}
