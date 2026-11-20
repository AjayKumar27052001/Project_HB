import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  assistantError,
  authorizeAssistantService,
  isNonEmptyString,
} from "@/server/assistant/internal-api";
import { findDemoProfile } from "@/server/repositories/demo-profiles";
import { demoProfiles } from "@/features/profiles/demo-profiles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ profileId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const authorizationError = authorizeAssistantService(request);
  if (authorizationError) return authorizationError;

  const { profileId } = await context.params;
  if (!isNonEmptyString(profileId, 100)) {
    return assistantError("VALIDATION_ERROR", "Provide a valid profile ID.", 400);
  }

  const cleanId = profileId.trim();

  try {
    let profile = null;
    try {
      profile = await findDemoProfile(cleanId);
    } catch {
      // Fallback to in-memory demo seed if MongoDB connection encounters TLS/network timeout
      profile = demoProfiles.find((p) => p.id === cleanId) ?? null;
    }

    if (!profile) {
      profile = demoProfiles.find((p) => p.id === cleanId) ?? null;
    }

    if (!profile) {
      return assistantError("NOT_FOUND", `Profile ${cleanId} not found.`, 404);
    }

    // Determine tier threshold progress
    const tier = profile.rewards.tier.toLowerCase();
    let nightsToNextTier: number | null = null;
    let nextTierName: string | null = null;

    if (tier.includes("silver")) {
      nextTierName = "Gold";
      nightsToNextTier = 5; // 5 nights required for Gold
    } else if (tier.includes("gold")) {
      nextTierName = "Platinum";
      nightsToNextTier = 10; // 15 nights required for Platinum (10 more from Gold)
    }

    return NextResponse.json({
      status: "complete",
      requestId: randomUUID(),
      demo: true,
      dataAsOf: new Date().toISOString(),
      data: {
        id: profile.id,
        displayName: profile.displayName,
        email: profile.email,
        preferences: profile.preferences,
        rewards: {
          programName: profile.rewards.programName,
          tier: profile.rewards.tier,
          pointsBalance: profile.rewards.pointsBalance,
          upgradeAwardsAvailable: profile.rewards.upgradeAwardsAvailable,
          pointsValueInRupees: Math.round(profile.rewards.pointsBalance * 0.2), // ₹0.20 per point
          nextTier: nextTierName ? { name: nextTierName, nightsNeeded: nightsToNextTier } : null,
        },
      },
    });
  } catch (err) {
    console.error("[Assistant Profile Route Error]:", err);
    return assistantError("PROFILE_UNAVAILABLE", "Guest profile details are temporarily unavailable.", 503);
  }
}
