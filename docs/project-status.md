# Project Status — dreRuss Hotels AI Assistant

## V3.5 — AI Layer Decoupled to Internal REST API (COMPLETE ✅)

### Jira Board

| Story ID | Title | Status | Priority |
|---|---|---|---|
| V3.5-01 | Create `internal-api-client.ts` HTTP helper | ✅ DONE | P0 |
| V3.5-02 | Refactor `tools.ts` — replace direct calls with `callInternalApi()` | ✅ DONE | P0 |
| V3.5-03 | Config + env var — add `INTERNAL_API_BASE_URL` | ✅ DONE | P1 |
| V3.5-04 | Typecheck + build + live test all 4 pages | ✅ DONE | P0 |

---

### Implementation Summary

#### V3.5-01: `src/server/assistant/internal-api-client.ts` (Done)
- Created reusable typed HTTP client helper using `fetch` with `cache: "no-store"`
- Automatically applies `Authorization: Bearer ${AI_SERVICE_TOKEN}` header
- Resolves against `INTERNAL_API_BASE_URL`
- Exports `callInternalApiPost<T>()` and `callInternalApiGet<T>()` with structured error propagation

#### V3.5-02: `src/server/assistant/tools.ts` (Done)
- Removed all 4 repository function imports:
  - `searchAssistantProperties`
  - `getAssistantPropertyDetails`
  - `getMongoPropertyRates`
  - `findMongoBookingSelection`
- Replaced tool execution cases with internal REST API endpoints:
  - `searchProperties` → `POST /internal/v1/assistant/properties/search`
  - `getPropertyDetails` → `POST /internal/v1/assistant/properties/details`
  - `getRoomRates` → `GET /internal/v1/assistant/properties/{id}/rates?checkIn=...`
  - `getCheckoutSummary` → `POST /internal/v1/assistant/checkout-summary`
- Tool registry schema-awareness remains 100% intact.

#### V3.5-03: `src/server/assistant/config.ts` & `.env.example` (Done)
- Added `INTERNAL_API_BASE_URL` (default: `http://localhost:${PORT || 3000}`)
- Added documentation in `.env.example` showing how to point to a remote Java or microservice backend

#### V3.5-04: QA & Live Verification (Done)
- `npm run typecheck` passed (0 errors)
- `npm run build` passed (production build succeeded)
- Live tests executed against all 4 pages:
  - **Search Results Page:** `POST /internal/v1/assistant/properties/search` verified ✅
  - **Rate List Menu (RLM) Page:** `GET /internal/v1/assistant/properties/{id}/rates` verified ✅
  - **Checkout Page:** `POST /internal/v1/assistant/checkout-summary` verified ✅
  - **Deep-Dive Fact Queries:** `POST /internal/v1/assistant/properties/details` verified ✅
  - **Multi-Turn Greeting Guard:** First turn receives "Hey!", follow-up turn responds casually without greeting ✅

---

## V3.0 — LangGraph ReAct + Self-Reflection (Committed `7045660`) ✅

| Story | Title | Status |
|---|---|---|
| V3-01 | LangGraph & Gemini Engine Setup | ✅ DONE |
| V3-02 | Direct In-Memory Capability Tools | ✅ DONE |
| V3-03 | ReAct + Self-Reflection Loop | ✅ DONE |
| V3-04 | Route Handler & Drawer Integration | ✅ DONE |
| V3-05 | End-to-End QA | ✅ DONE |
