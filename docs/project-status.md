# Project Status Board (Jira-Equivalent Dashboard)

**Project:** dreRuss Hotels Booking Assistant  
**Epic:** V3 Unified LangGraph Assistant Integration  
**Updated:** 2026-11-19  
**Board Phase:** V3 Sprint Planning & Execution  

---

## 1. Executive Board Summary

```
========================================================================================
  TOTAL STORIES: 43   |   DONE: 43 (V1, V2, V3 COMPLETE)   |   V3 SPRINT: 0 STORIES REMAINING
========================================================================================
  [████████████████████████████████████████████] 100% V3 Milestone Complete 🎉
========================================================================================
```

### Story Lifecycle Statuses
1. 📋 **Planning:** Acceptance criteria, scope, and technical design approved.
2. 💻 **Development (In Progress):** Code implementation and local unit checks.
3. 🔍 **In Review:** Code review for type safety, boundaries, and zero-hallucination compliance.
4. 🧪 **Testing:** Automated runtime verification and live query tests against MongoDB.
5. ✅ **Done:** Acceptance criteria met and verified.

---

## 2. V3 Jira Sprint Board

| Issue Key | Summary / Work Item | Priority | Status | Depends On | Deliverables |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **V3-01** | LangGraph & Gemini Engine Setup | P0 | ✅ **DONE** | — | Package installation, Gemini client, StateGraph schema |
| **V3-02** | Direct In-Memory Capability Tools | P0 | ✅ **DONE** | V3-01 | In-memory bindings to MongoDB repositories with response schemas |
| **V3-03** | ReAct + Self-Reflection Loop | P0 | ✅ **DONE** | V3-02 | 5-node graph with 2-round cap, policy audit & markdown table generator |
| **V3-04** | Route Handler & Drawer Integration | P0 | ✅ **DONE** | V3-03 | In-process `/api/v3/assistant/turn` wired to AssistantPanel |
| **V3-05** | End-to-End Journey QA & Demo Sign-off | P0 | ✅ **DONE** | V3-04 | Verified 4-page journey tests (Search, RLM, Checkout, Home) with 200 OK |

---

## 3. Story Specifications & Acceptance Criteria

### Story 1: V3-01 — LangGraph & Gemini Engine Setup
* **Objective:** Install dependencies and create the core Gemini LLM client and LangGraph state annotation schema.
* **Scope:**
  * Install `@langchain/langgraph`, `@langchain/core`, `@google/genai` in `package.json`.
  * Create `src/server/assistant/config.ts` loading `GEMINI_API_KEY` from `.env.local` using `gemini-1.5-flash`.
  * Define `GraphState` in `src/server/assistant/types.ts`.
* **Definition of Done (DoD):**
  * `npm run typecheck` passes with zero errors.
  * Gemini client successfully initializes and executes a simple test prompt.

---

### Story 2: V3-02 — Direct In-Memory Capability Tools
* **Objective:** Wrap existing MongoDB repositories into typed LangGraph tool functions without any HTTP loopbacks.
* **Scope:**
  * `src/server/assistant/tools.ts`:
    * `searchProperties`: calls `searchAssistantProperties()`
    * `getPropertyDetails`: calls `getAssistantPropertyDetails()`
    * `getRoomRates`: calls `getMongoPropertyRates()`
    * `getCheckoutSummary`: calls `quoteMongoPropertyRate()`
* **Definition of Done (DoD):**
  * Tools execute in-memory with zero network latency.
  * Output matches the structured evidence format required by the UI drawer.

---

### Story 3: V3-03 — ReAct + Self-Reflection Loop & Table Generator
* **Objective:** Build the complete 5-node LangGraph state machine.
* **Scope:**
  * Implement `interpret` $\rightarrow$ `act` $\rightarrow$ `reflect` $\rightarrow$ `replan` $\rightarrow$ `synthesize`.
  * Reflection logic: audits if the user requested cancellation policies or breakfast, and triggers Round 2 fetch if missing.
  * Markdown generator: outputs clean comparison tables and bulleted recommendations.
  * Hard limit of maximum 2 retrieval rounds.
* **Definition of Done (DoD):**
  * ReAct loop runs smoothly. Missing policy questions trigger self-reflection to fetch details before answering.

---

### Story 4: V3-04 — Route Handler & Drawer Integration
* **Objective:** Wire `app/api/v3/assistant/turn/route.ts` to the orchestrator.
* **Scope:**
  * Validate request payload from `AssistantPanel`.
  * Execute graph and return `{ answer: { text }, evidence, matches }`.
* **Definition of Done (DoD):**
  * The existing drawer opens, sends messages, and renders comparison tables and verified evidence cards across Home, Search, RLM, and Checkout.

---

### Story 5: V3-05 — End-to-End Journey QA & Demo Verification
* **Objective:** Validate live questions across all pages to guarantee quality for the demo.
* **Test Scenarios:**
  1. **Search Results:** *"Compare pet-friendly hotels with lowest nightly rate"* $\rightarrow$ Markdown table of hotels.
  2. **RLM Page:** *"Compare Standard Saver vs Flexible rate and check if cancellation is free"* $\rightarrow$ Self-reflection fetches policy and shows cancellation rules.
  3. **Checkout Page:** *"Explain the taxes, fees, and cancellation deadline"* $\rightarrow$ Accurate cost breakdown.
  4. **Home Page:** Form help and boundary compliance.
* **Definition of Done (DoD):**
  * All 4 test queries return verified, accurate answers in < 2.5 seconds with zero console errors.

---

## 4. Execution Workflow

For each story in order:
$$\text{Planning (Approved)} \longrightarrow \text{Development} \longrightarrow \text{Code Review} \longrightarrow \text{Testing (DoD)} \longrightarrow \text{Marked DONE}$$
