import "server-only";

import { END, START, StateGraph } from "@langchain/langgraph";
import { randomUUID } from "node:crypto";
import { askGemini, askGeminiJson } from "./gemini";
import { executeCapability, getToolsPromptDescription, validatePlan } from "./tools";
import {
  type AssistantResponse,
  type AssistantTurnRequest,
  GraphState,
  type Plan,
} from "./types";

/**
 * Node 1: Interpret Node
 * Analyzes the user query and page context, refers to the tool return schemas,
 * and decides which capability to invoke.
 */
async function interpretNode(state: typeof GraphState.State) {
  const { request } = state;
  const { page, message, pageContext } = request;

  if (!message || !message.trim()) {
    return {
      status: "needs_clarification",
      answer: "What would you like me to compare or help you with on this page?",
    };
  }

  // Handle Home page form help directly
  if (page === "home") {
    const homeAnswer = await askGemini(
      `The guest is on the Home Search page and asks: "${message}".
Visible fields: ${JSON.stringify(pageContext.visibleSearchFields ?? [])}.
Limits: ${JSON.stringify(pageContext.searchLimits ?? {})}.
Explain the search form briefly and help them decide what to enter. Do NOT pretend to submit the search.`,
      { systemInstruction: "You are dreRuss Concierge. Provide helpful, concise search guidance." }
    );

    return {
      status: "complete",
      answer: homeAnswer,
      plan: null,
    };
  }

  const toolDescriptions = getToolsPromptDescription(page);
  const prompt = `You are an expert hotel booking AI coordinator.
Current Page: "${page}"
Current Page Context: ${JSON.stringify(pageContext)}
Guest Question: "${message}"

${toolDescriptions}

TASK:
Examine the guest question and the return structures of the available tools.
Select the single best capability to fetch the exact data needed to answer the question.
If the question is about room rates, breakfast inclusions, or room cancellation on RLM, choose "getRoomRates".
If the question is about general hotel amenities, policies, or check-in hours, choose "getPropertyDetails".
If the question is searching or comparing hotels in a city, choose "searchProperties".
If the question is about checkout pricing or booking terms, choose "getCheckoutSummary".

Return JSON ONLY in this format:
{
  "capability": "searchProperties" | "getPropertyDetails" | "getRoomRates" | "getCheckoutSummary",
  "arguments": { ... },
  "explanationGoal": "Brief reason for selecting this tool"
}`;

  try {
    const plan = await askGeminiJson<Plan>(prompt, {
      systemInstruction: "You are a precise tool-selection engine. Return valid JSON only.",
    });

    return { plan };
  } catch (err) {
    console.error("[Orchestrator] Interpret error, fallback to page default:", err);
    // Intelligent fallback based on page
    if (page === "rate-list") {
      return {
        plan: {
          capability: "getRoomRates",
          arguments: { propertyId: pageContext.propertyId, criteria: pageContext.searchCriteria },
          explanationGoal: "Fetch rates for the current property",
        } as Plan,
      };
    }
    if (page === "search-results") {
      return {
        plan: {
          capability: "searchProperties",
          arguments: { criteria: pageContext.searchCriteria },
          explanationGoal: "Search hotels for current criteria",
        } as Plan,
      };
    }
    return {
      status: "needs_clarification",
      answer: "Which hotel, room rate, or policy would you like me to look up?",
    };
  }
}

/**
 * Node 2: Tool Execution Node (Act)
 * Invokes the chosen repository directly in memory.
 */
async function executeToolNode(state: typeof GraphState.State) {
  if (!state.plan) return {};

  try {
    const validatedPlan = validatePlan(state.plan, state.request);
    const toolOutput = await executeCapability(validatedPlan, state.request);

    // Merge multi-round evidence if this is round 2
    let combinedEvidence: unknown = toolOutput;
    if (state.evidence) {
      if (typeof state.evidence === "object" && state.evidence !== null && "rounds" in state.evidence) {
        (state.evidence as { rounds: unknown[] }).rounds.push(toolOutput);
        combinedEvidence = state.evidence;
      } else {
        combinedEvidence = { rounds: [state.evidence, toolOutput] };
      }
    }

    return {
      plan: validatedPlan,
      evidence: combinedEvidence,
      retrievalRound: state.retrievalRound + 1,
    };
  } catch (error) {
    console.error("[Orchestrator] Tool execution failed:", error);
    return {
      status: "incomplete",
      error: error instanceof Error ? error.message : "Tool execution failed",
      retrievalRound: state.retrievalRound + 1,
    };
  }
}

/**
 * Node 3: Self-Reflection Node
 * Audits whether the fetched data contains all facts needed to answer the user query.
 */
async function selfReflectionNode(state: typeof GraphState.State) {
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
  // If the user asked about cancellation policies or property check-in rules, but we only have room rates:
  if (request.page === "rate-list" && plan?.capability === "getRoomRates") {
    if (queryAsksCancellation || queryAsksPoliciesOrCheckIn) {
      // Check if evidence already has property details in rounds
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

  return { status: "complete" };
}

/**
 * Node 4: Re-Plan Node
 * Formulates a targeted follow-up query when self-reflection detected missing details.
 */
async function replanNode(state: typeof GraphState.State) {
  const { request } = state;
  const propertyId = request.pageContext.propertyId;

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
      status: "complete", // reset so reflection doesn't loop indefinitely
    };
  }

  return { status: "complete" };
}

/**
 * Node 5: Synthesize Node
 * Generates the executive Markdown comparison table, highlights, and verified evidence.
 */
async function synthesizeNode(state: typeof GraphState.State) {
  const { request, evidence, status } = state;

  if (state.answer && !evidence) {
    return {};
  }

  const isFirstMessage = !Array.isArray(request.history) || request.history.length === 0;

  const prompt = `You are a friendly, concise hotel booking assistant.
Current Page: "${request.page}"
Guest Question: "${request.message}"
Is First Message in Conversation: ${isFirstMessage}

VERIFIED BACKEND EVIDENCE FROM DATABASE:
${JSON.stringify(evidence, null, 2)}

STRICT OUTPUT FORMAT RULES:
1. LINE 1:
   - If this is the FIRST message (${isFirstMessage}): Start naturally with "Hey!" or "Hey Hi!" followed immediately by the direct answer.
   - If this is a FOLLOW-UP message (not first message): DO NOT say "Hey" again. Jump straight into the casual, friendly answer (e.g., "Got it! Here are...", "Sure, here's...", or direct answer).
   - NEVER introduce yourself (no "I am dreRuss Concierge").
   - NEVER repeat the travel dates, room count, or destination unless directly asked.
2. BODY: Provide a concise comparison or facts using clean bullet points or a compact Markdown table. Use checkmarks (✅) and crosses (❌) for amenities where helpful.
3. LAST LINE: Provide ONE short, friendly suggestion starting with "**Suggestion:** ".
4. Keep the entire response brief, casual, and strictly grounded in the verified evidence above.`;

  try {
    const answerText = await askGemini(prompt, {
      systemInstruction: "You are a concise, friendly hotel booking assistant. Never introduce yourself. Only say 'Hey' on the first turn of conversation, then be casual and direct.",
    });

    return { answer: answerText };
  } catch (error) {
    console.error("[Orchestrator] Synthesize error:", error);
    return {
      answer: "I retrieved the verified details for your request, but could not format the summary. Please see the verified details below.",
    };
  }
}

/**
 * Build and compile the LangGraph State Machine
 */
export function buildAssistantGraph() {
  return new StateGraph(GraphState)
    .addNode("interpret", interpretNode)
    .addNode("act", executeToolNode)
    .addNode("selfReflect", selfReflectionNode)
    .addNode("replan", replanNode)
    .addNode("synthesize", synthesizeNode)
    .addEdge(START, "interpret")
    .addConditionalEdges(
      "interpret",
      (state) => (state.plan ? "act" : "synthesize"),
      { act: "act", synthesize: "synthesize" }
    )
    .addEdge("act", "selfReflect")
    .addConditionalEdges(
      "selfReflect",
      (state) => (state.status === "incomplete" && state.retrievalRound < 2 ? "replan" : "synthesize"),
      { replan: "replan", synthesize: "synthesize" }
    )
    .addEdge("replan", "act")
    .addEdge("synthesize", END)
    .compile();
}

/**
 * Main Entry Point: runAssistantOrchestrator
 * Executes the LangGraph ReAct + Reflection engine and returns the final AssistantResponse.
 */
export async function runAssistantOrchestrator(request: AssistantTurnRequest): Promise<AssistantResponse> {
  const requestId = randomUUID();
  const graph = buildAssistantGraph();

  try {
    const result = await graph.invoke({
      request,
      plan: null,
      evidence: null,
      status: "complete",
      answer: "",
      error: null,
      retrievalRound: 0,
      missingPolicyFor: null,
    });

    // Extract matches if returned by searchProperties
    let matches: AssistantResponse["matches"] = undefined;
    const evidenceData = result.evidence as Record<string, unknown> | null;
    if (evidenceData && typeof evidenceData === "object" && "data" in evidenceData) {
      const inner = evidenceData.data as Record<string, unknown>;
      if (inner && Array.isArray(inner.matches)) {
        matches = {
          total: Number(inner.totalMatches ?? inner.matches.length),
          items: inner.matches as Array<{
            name: string;
            facts: Array<{
              attribute: string;
              value: string | number | boolean | null;
              label?: string;
              unit?: string;
              basis?: string;
              scope?: string;
            }>;
          }>,
        };
      }
    }

    return {
      requestId,
      pageSessionId: request.pageSessionId,
      status: (result.status as AssistantResponse["status"]) ?? "complete",
      answer: {
        text: result.answer || "I verified the details for your request.",
      },
      evidence: result.evidence ? [result.evidence] : [],
      ...(matches ? { matches } : {}),
    };
  } catch (err) {
    console.error(`[Orchestrator:${requestId}] Fatal error:`, err);
    return {
      requestId,
      pageSessionId: request.pageSessionId,
      status: "service_error",
      answer: {
        text: "The concierge assistant is temporarily unavailable. Please retry in a moment.",
      },
      evidence: [],
    };
  }
}
