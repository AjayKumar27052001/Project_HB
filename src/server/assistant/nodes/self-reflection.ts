import "server-only";

import { GraphState } from "../types";

/**
 * Node 3: Self-Reflection Node (Audit)
 * Audits whether the fetched data contains all facts needed, and checks faithfulness.
 */
export async function selfReflectionNode(state: typeof GraphState.State) {
  if (state.isOutOfScope) {
    return { status: "complete" };
  }

  const { request, evidence, retrievalRound, plan } = state;
  const userQuery = (request.message ?? "").toLowerCase();

  if (!evidence) {
    return { status: "incomplete" };
  }

  // If already at or above maximum retrieval rounds (2), proceed to synthesis
  if (retrievalRound >= 2) {
    return { status: "complete" };
  }

  const queryAsksCancellation =
    userQuery.includes("cancel") || userQuery.includes("cancellation") || userQuery.includes("refund");
  const queryAsksPoliciesOrCheckIn =
    userQuery.includes("check in") || userQuery.includes("check-in") || userQuery.includes("policy") || userQuery.includes("pet");

  // Audit on Rate List Menu (RLM) page:
  if (request.page === "rate-list" && plan?.capability === "getRoomRates") {
    if (queryAsksCancellation || queryAsksPoliciesOrCheckIn) {
      const hasPropertyDetails =
        typeof evidence === "object" &&
        evidence !== null &&
        "rounds" in evidence &&
        Array.isArray((evidence as { rounds: unknown[] }).rounds) &&
        (evidence as { rounds: Array<{ data?: { entities?: unknown } }> }).rounds.some((r) => r?.data?.entities);

      if (!hasPropertyDetails) {
        return {
          status: "incomplete",
          missingPolicyFor: [request.pageContext.propertyId || "selected_property"],
        };
      }
    }
  }

  // Audit on Search Results page:
  // If guest asked about profile discounts and we fetched profile, also fetch search properties in round 2:
  if (request.page === "search-results" && plan?.capability === "getGuestProfile") {
    const hasSearchMatches =
      typeof evidence === "object" &&
      evidence !== null &&
      "rounds" in evidence &&
      Array.isArray((evidence as { rounds: unknown[] }).rounds) &&
      (evidence as { rounds: Array<{ data?: { matches?: unknown } }> }).rounds.some((r) => r?.data?.matches);

    if (!hasSearchMatches) {
      return {
        status: "incomplete",
        missingPolicyFor: ["search_matches_round2"],
      };
    }
  }

  // Audit on Confirmation page:
  // If guest is authenticated (profileId present) and we only have upsell offers, fetch guest profile in round 2
  if (request.page === "confirmation" && plan?.capability === "getUpsellOffers") {
    const profileId = request.profileId || request.pageContext.profileId;
    if (profileId) {
      const hasProfileData =
        typeof evidence === "object" &&
        evidence !== null &&
        "rounds" in evidence &&
        Array.isArray((evidence as { rounds: unknown[] }).rounds) &&
        (evidence as { rounds: Array<{ data?: { rewards?: unknown } }> }).rounds.some((r) => r?.data?.rewards);

      if (!hasProfileData) {
        return {
          status: "incomplete",
          missingPolicyFor: ["profile_loyalty"],
        };
      }
    }
  }

  return { status: "complete" };
}
