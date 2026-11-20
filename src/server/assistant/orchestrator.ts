import "server-only";

import { StateGraph, END } from "@langchain/langgraph";
import { randomUUID } from "node:crypto";
import {
  interpretNode,
  executeToolNode,
  selfReflectionNode,
  replanNode,
  synthesizeNode,
} from "./nodes";
import { GraphState } from "./types";
import type { AssistantResponse, AssistantTurnRequest } from "./types";

/**
 * Compiles the LangGraph ReAct + Self-Reflection state graph.
 * Composed cleanly from modular nodes in ./nodes/
 */
export function buildAssistantGraph() {
  const workflow = new StateGraph(GraphState)
    .addNode("interpret", interpretNode)
    .addNode("executeTool", executeToolNode)
    .addNode("selfReflection", selfReflectionNode)
    .addNode("replan", replanNode)
    .addNode("synthesize", synthesizeNode);

  // Conditional Edge: interpret -> END (if out of scope) or executeTool
  workflow.addConditionalEdges("interpret", (state) => {
    if (state.isOutOfScope || (state.answer && !state.plan)) {
      return END;
    }
    return "executeTool";
  });

  // Edge: executeTool -> selfReflection
  workflow.addEdge("executeTool", "selfReflection");

  // Conditional Edge: selfReflection -> replan (if gap detected & round < 2) or synthesize
  workflow.addConditionalEdges("selfReflection", (state) => {
    if (state.status === "incomplete" && state.retrievalRound < 2) {
      return "replan";
    }
    return "synthesize";
  });

  // Edge: replan -> executeTool (Round 2)
  workflow.addEdge("replan", "executeTool");

  // Edge: synthesize -> END
  workflow.addEdge("synthesize", END);

  workflow.setEntryPoint("interpret");
  return workflow.compile();
}

/**
 * Main Entry Point:
 * Executes the compiled LangGraph ReAct + Reflection engine and returns AssistantResponse.
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
      isOutOfScope: false,
      focusedPropertyId: null,
      focusedPropertyName: null,
      navigationAction: null,
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
