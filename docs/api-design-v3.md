# API Design: V3 Unified In-Process Assistant

**Product:** dreRuss Hotels booking experience  
**Version:** V3 (Direct In-Process Architecture)  
**Status:** Approved for Implementation  
**Last updated:** 2026-11-19  

---

## 1. Overview & Architectural Contrast

* **Rejected Approach (`docs/api-design-v3-rejected.md`):** The legacy draft coupled the assistant to an external microservice on port 4100, requiring an intermediary HTTP network layer (`/internal/v1/assistant/*`) secured by service tokens.
* **Current V3 Design:** Operates **completely in-process within Next.js**. The AI Agent directly executes existing backend repository functions in memory. No internal HTTP loopback calls, no proxy timeouts, and zero authentication overhead between the agent and data layer.

```
Frontend (AssistantPanel Drawer)
       │  POST /api/v3/assistant/turn
       ▼
Next.js Route Handler (app/api/v3/assistant/turn/route.ts)
       │
       ▼
LangGraph Orchestrator (ReAct + Self-Reflection)
       │  Direct In-Memory TypeScript Calls (No HTTP Loopback!)
       ├──> searchAssistantProperties() ─────┐
       ├──> getAssistantPropertyDetails() ───┼──> MongoDB Atlas
       ├──> getMongoPropertyRates() ─────────┤
       └──> quoteMongoPropertyRate() ────────┘
```

---

## 2. Public Assistant API

### `POST /api/v3/assistant/turn`

Executed when the guest sends a message from the assistant drawer on any supported page.

#### Request Headers
* `Content-Type: application/json`

#### Request Schema
```typescript
interface AssistantTurnRequest {
  pageSessionId: string;
  page: "home" | "search-results" | "rate-list" | "checkout";
  message?: string;
  history?: Array<{
    role: "user" | "assistant";
    text: string;
  }>;
  continuationCursor?: string;
  pageContext: {
    currentPage?: string;
    propertyId?: string;
    roomId?: string;
    rateId?: string;
    searchCriteria?: {
      destination: string;
      checkIn: string;
      checkOut: string;
      adults: number;
      rooms: number;
    };
    visibleSearchFields?: string[];
    searchLimits?: Record<string, unknown>;
  };
}
```

#### Response Schema (HTTP 200)
Matches the exact schema expected by `src/components/organisms/assistant-panel.tsx`:

```typescript
interface AssistantTurnResponse {
  requestId: string;
  pageSessionId: string;
  status: "complete" | "incomplete" | "needs_clarification" | "out_of_scope" | "service_error";
  answer: {
    text: string; // Markdown formatted response (tables, bullet points, recommendations)
  };
  evidence: Array<{
    status: string;
    data: unknown;
  }>;
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
```

#### Error Response (HTTP 400 / 500 / 503)
```typescript
interface ApiErrorResponse {
  error: {
    code: "VALIDATION_ERROR" | "SERVICE_ERROR" | "RATE_LIMIT_EXCEEDED";
    message: string;
    retryable: boolean;
    requestId?: string;
  };
}
```

---

## 3. Direct In-Process Tool Definitions

Instead of making HTTP requests to internal endpoints, the LangGraph agent executes tools that call your existing server-side repositories directly:

### Tool 1: `searchProperties`
* **Target:** `src/server/repositories/assistant-properties.ts` $\rightarrow$ `searchAssistantProperties()`
* **Scope:** `search-results` page
* **Inputs:**
  ```typescript
  {
    criteria: SearchCriteria;
    filters?: Record<string, unknown>;
    pageSize?: number;
  }
  ```
* **Returns:** List of properties matching the search criteria, including price summaries and offered amenities.

### Tool 2: `getPropertyDetails`
* **Target:** `src/server/repositories/assistant-properties.ts` $\rightarrow$ `getAssistantPropertyDetails()`
* **Scope:** `search-results`, `rate-list` pages
* **Inputs:**
  ```typescript
  {
    propertyId: string;
    attributes?: string[]; // e.g. ["amenities", "policies.cancellation", "policies.checkIn"]
  }
  ```
* **Returns:** Full property document facts, check-in/out policies, and cancellation policy specifics.

### Tool 3: `getRoomRates`
* **Target:** `src/server/repositories/property-rates.ts` $\rightarrow$ `getMongoPropertyRates()`
* **Scope:** `rate-list` page
* **Inputs:**
  ```typescript
  {
    propertyId: string;
    criteria: SearchCriteria;
  }
  ```
* **Returns:** Real-time room packages, rate quotes (nightly price, stay total), inclusions (breakfast, parking), and rate-level terms.

### Tool 4: `getCheckoutSummary`
* **Target:** `src/server/pricing/rate-quote.ts` $\rightarrow$ `quoteMongoPropertyRate()`
* **Scope:** `checkout` page
* **Inputs:**
  ```typescript
  {
    propertyId: string;
    roomId: string;
    rateId: string;
    criteria: SearchCriteria;
  }
  ```
* **Returns:** Precise financial quote (subtotal, taxes, fees, total) and booking condition snapshot.

---

## 4. Self-Reflection & Re-Plan Sequence

When answering complex queries on the Rate List Menu (RLM) or Search Results:
1. **Initial Tool Invocation:** The model queries `getRoomRates` to retrieve available room options.
2. **Self-Reflection Audit:** The orchestrator checks if the user asked about cancellation rules or specific policies. If the rate objects do not contain granular policy text:
3. **Round 2 Targeted Fetch:** The orchestrator automatically invokes `getPropertyDetails` to pull the authoritative cancellation policy from the property record.
4. **Final Synthesis:** Both payloads are merged to output the verified comparison table.
