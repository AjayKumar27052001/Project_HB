import { Annotation } from "@langchain/langgraph";
import type { SearchCriteria } from "@/shared/types";

export type AssistantPage = "home" | "search-results" | "rate-list" | "checkout" | "confirmation";

export type CapabilityName =
  | "homeHelp"
  | "searchProperties"
  | "getPropertyDetails"
  | "getRoomRates"
  | "getCheckoutSummary"
  | "getGuestProfile"
  | "queryLoyaltyPolicy"
  | "getUpsellOffers";

export interface Plan {
  capability: CapabilityName;
  arguments: Record<string, unknown>;
  explanationGoal: string;
}

export interface AssistantTurnRequest {
  pageSessionId: string;
  profileId?: string | null;
  page: AssistantPage;
  message?: string;
  history?: Array<{ role: "user" | "assistant"; text: string }>;
  continuationCursor?: string;
  pageContext: {
    currentPage?: string;
    propertyId?: string;
    roomId?: string;
    rateId?: string;
    confirmationCode?: string;
    profileId?: string;
    searchCriteria?: SearchCriteria;
    visibleSearchFields?: string[];
    searchLimits?: Record<string, unknown>;
  };
}

export interface AssistantResponse {
  requestId: string;
  pageSessionId: string;
  status: "complete" | "incomplete" | "needs_clarification" | "out_of_scope" | "service_error";
  answer: {
    text: string;
  };
  evidence: Array<unknown>;
  matches?: {
    total: number;
    unknownMatchCount?: number;
    currencyComparison?: string;
    evaluatedAllMatches?: boolean;
    complete?: boolean;
    nextCursor?: string | null;
    items: Array<{
      name: string;
      facts: Array<{
        attribute: string;
        value: string | number | boolean | null;
        label?: string;
        unit?: string;
        basis?: string;
        scope?: string;
      }>;
    }>;
  };
}

/**
 * LangGraph State Annotation
 * Tracks the state throughout the ReAct + Reflection lifecycle.
 */
export const GraphState = Annotation.Root({
  request: Annotation<AssistantTurnRequest>,
  plan: Annotation<Plan | null>({ reducer: (_, val) => val, default: () => null }),
  evidence: Annotation<unknown>({ reducer: (_, val) => val, default: () => null }),
  status: Annotation<string>({ reducer: (_, val) => val, default: () => "complete" }),
  answer: Annotation<string>({ reducer: (_, val) => val, default: () => "" }),
  error: Annotation<string | null>({ reducer: (_, val) => val, default: () => null }),
  retrievalRound: Annotation<number>({ reducer: (_, val) => val, default: () => 0 }),
  missingPolicyFor: Annotation<string[] | null>({ reducer: (_, val) => val, default: () => null }),
  isOutOfScope: Annotation<boolean>({ reducer: (_, val) => val, default: () => false }),
  focusedPropertyId: Annotation<string | null>({ reducer: (_, val) => val, default: () => null }),
  focusedPropertyName: Annotation<string | null>({ reducer: (_, val) => val, default: () => null }),
  navigationAction: Annotation<string | null>({ reducer: (_, val) => val, default: () => null }),
});
