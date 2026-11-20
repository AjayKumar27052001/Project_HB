import "server-only";

import { executeCapability, validatePlan } from "../tools";
import { GraphState } from "../types";

/**
 * Node 2: Tool Execution Node (Act)
 * Invokes the decoupled REST endpoints via internal-api-client.
 */
export async function executeToolNode(state: typeof GraphState.State) {
  if (!state.plan || state.isOutOfScope) return {};

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
    console.error("[Orchestrator:executeToolNode] Tool execution failed:", error);
    return {
      status: "incomplete",
      error: error instanceof Error ? error.message : "Tool execution failed",
      retrievalRound: state.retrievalRound + 1,
    };
  }
}
