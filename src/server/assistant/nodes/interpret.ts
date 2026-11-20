import "server-only";

import { askGeminiJson } from "../gemini";
import { getToolsPromptDescription } from "../tools";
import { GraphState } from "../types";
import type { Plan } from "../types";

/**
 * Known demo properties for entity matching & focus tracking
 */
const KNOWN_HOTEL_ENTITIES = [
  { id: "JNP-IRV-01", name: "The Irving Reserve by Juniper", keywords: ["irving reserve", "reserve"] },
  { id: "JNP-MND-02", name: "Juniper House at Mandalay Lake", keywords: ["mandalay", "juniper house"] },
  { id: "JNP-DFW-04", name: "The Juniper Las Colinas Canal & Spa", keywords: ["las colinas", "canal", "canal & spa"] },
];

function findReferencedHotel(text?: string) {
  if (!text) return null;
  const lower = text.toLowerCase();
  for (const hotel of KNOWN_HOTEL_ENTITIES) {
    if (lower.includes(hotel.name.toLowerCase()) || hotel.keywords.some((kw) => lower.includes(kw))) {
      return hotel;
    }
  }
  return null;
}

/**
 * Node 1: Interpret Node (Think)
 * Employs pure LLM semantic reasoning to classify intent and select tools.
 * Zero brittle regex keyword checks.
 */
export async function interpretNode(state: typeof GraphState.State) {
  const { request } = state;
  const { page, message, pageContext } = request;

  // Track focused hotel entity across conversational turns
  const referencedHotel = findReferencedHotel(message);
  let focusedPropertyId = referencedHotel?.id ?? state.focusedPropertyId;
  let focusedPropertyName = referencedHotel?.name ?? state.focusedPropertyName;

  if (!focusedPropertyId && Array.isArray(request.history)) {
    for (const h of request.history) {
      const match = findReferencedHotel(h.text);
      if (match) {
        focusedPropertyId = match.id;
        focusedPropertyName = match.name;
        break;
      }
    }
  }

  const rawProfileId = request.profileId || pageContext.profileId;
  const effectiveProfileId = rawProfileId && rawProfileId !== "GUEST" ? rawProfileId : null;
  const toolDescriptions = getToolsPromptDescription(page);

  const prompt = `You are an expert hotel booking and guest loyalty AI coordinator.
Current Page: "${page}"
Current Page Context: ${JSON.stringify(pageContext)}
Logged-in Guest Profile ID: ${effectiveProfileId ? `"${effectiveProfileId}"` : "None (Anonymous Guest / Not Logged In)"}
Guest Message: "${message}"
Focused Hotel in Context: ${focusedPropertyName ? `"${focusedPropertyName}" (${focusedPropertyId})` : "None"}

${toolDescriptions}

TASK & CLASSIFICATION RULES:
Classify the guest's intent and select the single best capability:
1. OUT OF SCOPE: If the question is completely unrelated to travel, hotels, booking, or loyalty (e.g. asking to write code, solve math equations, discuss politics/trivia), return capability "out_of_scope".
2. PERSONAL REWARDS & BENEFITS: If the guest is logged in (effectiveProfileId is present) and asks what benefits/loyalty benefits/perks/points/rewards THEY receive or asks about their account, choose "getGuestProfile" (pass argument profileId: "${effectiveProfileId ?? "PROFILE-ALEX"}").
3. GENERAL LOYALTY RULES & EXPLORING OFFERS: If the guest asks about loyalty tiers, membership benefits, how to join, what perks members get, tier comparisons (Silver vs Gold vs Platinum), points redemption, or general member offers, choose "queryLoyaltyPolicy" (pass topic: "tiers" | "points" | "upgrades").
4. HOME PAGE INQUIRIES & CAPABILITIES: On the Home page, our concierge focuses on exploring loyalty benefits, member offers, rewards perks, and brand information. Do NOT offer or suggest search form validation/limits. If the guest asks what you can help with or what benefits exist on this page:
   - If logged in: choose "getGuestProfile" to present their status and perks.
   - If anonymous/guest: choose "queryLoyaltyPolicy" (topic: "tiers") to explain membership rewards, tiers, and how joining unlocks benefits.
5. HOTEL SELECTION INTENT: If on the search page and the guest expresses intent to choose or book a specific hotel (e.g. "I want to select The Irving Reserve"), choose "getPropertyDetails" for that hotel.
6. SEARCHING & COMPARING HOTELS: If searching or comparing hotels in a city or filtering by amenities (spa, pool, lake view), choose "searchProperties".
7. ROOM RATES & PACKAGES: If inquiring about room types, prices, breakfast inclusions, or cancellation terms on RLM, choose "getRoomRates".
8. CHECKOUT SUMMARY: If asking about checkout charges, taxes, or total stay price, choose "getCheckoutSummary".
9. POST-BOOKING UPSELLING: If on the confirmation page and the guest asks about room upgrades, celebration packages, or airport transportation, choose "getUpsellOffers".

Return JSON ONLY in this format:
{
  "capability": "searchProperties" | "getPropertyDetails" | "getRoomRates" | "getCheckoutSummary" | "getGuestProfile" | "queryLoyaltyPolicy" | "getUpsellOffers" | "out_of_scope",
  "arguments": { ... },
  "explanationGoal": "Brief reason for selecting this tool"
}`;

  try {
    const plan = await askGeminiJson<Plan & { capability: string }>(prompt, {
      systemInstruction: "You are a precise semantic intent classification and tool selection engine. Return valid JSON only.",
    });

    if ((plan.capability as string) === "out_of_scope") {
      return {
        status: "out_of_scope",
        answer:
          "I am dreRuss Concierge, your hotel booking and loyalty assistant. I can only assist with Juniper hotels, reservations, and rewards.",
        plan: null,
        isOutOfScope: true,
        focusedPropertyId,
        focusedPropertyName,
      };
    }

    return {
      plan: plan as Plan,
      focusedPropertyId,
      focusedPropertyName,
    };
  } catch (err) {
    console.error("[Orchestrator:interpretNode] Error, fallback to page default:", err);
    // Intelligent fallback based on page and profile
    if (page === "home") {
      if (effectiveProfileId) {
        return {
          plan: {
            capability: "getGuestProfile",
            arguments: { profileId: effectiveProfileId },
            explanationGoal: "Fetch logged-in guest rewards profile",
          } as Plan,
          focusedPropertyId,
          focusedPropertyName,
        };
      }
      return {
        plan: {
          capability: "queryLoyaltyPolicy",
          arguments: { topic: "tiers" },
          explanationGoal: "Explore loyalty tiers and member benefits",
        } as Plan,
        focusedPropertyId,
        focusedPropertyName,
      };
    }

    if (page === "confirmation") {
      return {
        plan: {
          capability: "getUpsellOffers",
          arguments: { propertyId: pageContext.propertyId || "JNP-MND-02" },
          explanationGoal: "Fetch upselling packages for confirmed stay",
        } as Plan,
        focusedPropertyId,
        focusedPropertyName,
      };
    }

    if (page === "rate-list") {
      return {
        plan: {
          capability: "getRoomRates",
          arguments: { propertyId: pageContext.propertyId, criteria: pageContext.searchCriteria },
          explanationGoal: "Fetch rates for the current property",
        } as Plan,
        focusedPropertyId,
        focusedPropertyName,
      };
    }

    if (page === "search-results") {
      return {
        plan: {
          capability: "searchProperties",
          arguments: { criteria: pageContext.searchCriteria },
          explanationGoal: "Search hotels for current criteria",
        } as Plan,
        focusedPropertyId,
        focusedPropertyName,
      };
    }

    return {
      status: "needs_clarification",
      answer: "Which hotel, room rate, or loyalty perk would you like me to look up?",
      focusedPropertyId,
      focusedPropertyName,
    };
  }
}
