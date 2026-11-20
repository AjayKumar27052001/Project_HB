import "server-only";

import { GraphState } from "../types";
import type { Plan } from "../types";

/**
 * Node 4: Re-Plan Node
 * Formulates a targeted follow-up query when self-reflection detected missing details.
 */
export async function replanNode(state: typeof GraphState.State) {
  const { request, missingPolicyFor } = state;
  const propertyId = request.pageContext.propertyId;

  if (missingPolicyFor?.includes("search_matches_round2")) {
    return {
      plan: {
        capability: "searchProperties",
        arguments: { criteria: request.pageContext.searchCriteria },
        explanationGoal: "Fetch search matches to compare with guest loyalty tier",
      } as Plan,
      status: "complete",
    };
  }

  if (missingPolicyFor?.includes("profile_loyalty")) {
    const profileId = request.profileId || request.pageContext.profileId;
    if (profileId) {
      return {
        plan: {
          capability: "getGuestProfile",
          arguments: { profileId },
          explanationGoal: "Fetch guest rewards profile to complement upselling offers",
        } as Plan,
        status: "complete",
      };
    }
  }

  if (propertyId) {
    return {
      plan: {
        capability: "getPropertyDetails",
        arguments: {
          propertyId,
          attributes: ["policies.cancellation", "policies.checkIn", "policies.checkOut", "property.amenities"],
        },
        explanationGoal: "Fetch authoritative cancellation and property policies to complete comparison",
      } as Plan,
      status: "complete",
    };
  }

  return { status: "complete" };
}
