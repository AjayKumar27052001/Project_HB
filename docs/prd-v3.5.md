# PRD — V3.5: AI Layer Decoupled to Internal REST API

**Version:** 3.5  
**Status:** In Development  
**Author:** dreRuss Engineering  
**Date:** 2026-11-19  
**Depends on:** V3.0 (LangGraph ReAct + Self-Reflection AI Assistant)

---

## 1. Problem Statement

In V3.0, the AI orchestration layer (`tools.ts`) calls MongoDB repository functions **directly** via TypeScript imports. This creates tight coupling between the AI layer and the Node.js/TypeScript backend. If a client's backend is Java (or any other language/runtime), the AI layer must be entirely rewritten to fetch data.

---

## 2. Goal

Decouple the AI layer from the backend by routing all data fetching through **internal REST API endpoints** (already built in V3.0 at `/internal/v1/assistant/...`). The AI layer must have zero direct imports from repository functions.

**Success definition:** `tools.ts` contains no imports from `@/server/repositories/`. All data fetching goes through `callInternalApi()`.

---

## 3. User / Developer Impact

| Persona | Impact |
|---|---|
| **End user (hotel guest)** | None — AI responses look identical |
| **Frontend developer** | None — drawer UI unchanged |
| **AI engineer** | `tools.ts` is now backend-agnostic; all data via HTTP client |
| **Backend engineer (future Java)** | Only `INTERNAL_API_BASE_URL` env var changes — AI layer stays intact |

---

## 4. Scope

### In Scope
- Replace 4 direct repository calls in `tools.ts` with `callInternalApi()` HTTP calls
- Create `internal-api-client.ts` — thin HTTP client helper
- Add `INTERNAL_API_BASE_URL` env var to `config.ts` and `.env.example`
- Verify `checkout-summary` and `properties/details` routes return shapes matching what `tools.ts` expects
- Typecheck, build, live test all 4 pages

### Out of Scope
- No changes to LangGraph nodes, Gemini engine, or response format
- No changes to frontend
- No changes to public V1 APIs
- No changes to MongoDB repositories
- No authentication changes

---

## 5. Architecture

### V3.0 (Before)
```
orchestrator.ts → tools.ts → repository functions (direct import) → MongoDB
```

### V3.5 (After)
```
orchestrator.ts → tools.ts → callInternalApi() → /internal/v1/assistant/... → repository functions → MongoDB
```

**Java swap scenario (future):**
```
# Only .env.local changes:
INTERNAL_API_BASE_URL=https://java-api.juniper.com

# tools.ts, orchestrator.ts, frontend → zero changes
```

---

## 6. API Mapping

| Capability | V3.0 (direct function) | V3.5 (REST endpoint) | Method |
|---|---|---|---|
| `homeHelp` | Static data — no fetch | Static data — no change | — |
| `searchProperties` | `searchAssistantProperties()` | `/internal/v1/assistant/properties/search` | POST |
| `getPropertyDetails` | `getAssistantPropertyDetails()` | `/internal/v1/assistant/properties/details` | POST |
| `getRoomRates` | `getMongoPropertyRates()` | `/internal/v1/assistant/properties/{id}/rates` | GET + query params |
| `getCheckoutSummary` | `findMongoBookingSelection()` + `getStayNightCount()` | `/internal/v1/assistant/checkout-summary` | POST |

---

## 7. Response Shape Mapping

### `getCheckoutSummary`
Internal route returns:
```json
{
  "status": "complete",
  "data": {
    "property": { "propertyId": "...", "name": "..." },
    "stay": { "checkIn": "...", "checkOut": "...", "adults": 2, "rooms": 1, "nights": 1 },
    "selection": { "roomId": "...", "roomName": "...", "rateId": "...", "rateName": "...", "includes": [], "cancellation": "...", "payment": "..." },
    "price": { "subtotal": "...", "taxesAndFees": "...", "total": "...", "basis": "..." }
  }
}
```
`tools.ts` must map this to the shape it currently returns to the orchestrator.

### `getRoomRates`
Internal route is `GET /internal/v1/assistant/properties/{id}/rates?checkIn=...&checkOut=...&adults=2&rooms=1`
`tools.ts` must construct query string from criteria object.

---

## 8. Non-Functional Requirements

| NFR | Requirement |
|---|---|
| **Latency** | Acceptable: adds ~20–50ms per turn (Gemini dominates at 1–3s) |
| **Security** | All internal calls use `Authorization: Bearer {AI_SERVICE_TOKEN}` header |
| **Reliability** | Error from internal API must be caught and returned as structured error to synthesizeNode |
| **TypeScript** | Zero type errors after change (`npm run typecheck` must pass) |
| **Build** | `npm run build` must pass clean |

---

## 9. Files Changed

| File | Change |
|---|---|
| `src/server/assistant/tools.ts` | Replace 4 direct calls with `callInternalApi()` |
| `src/server/assistant/internal-api-client.ts` | New — HTTP client helper |
| `src/server/assistant/config.ts` | Add `INTERNAL_API_BASE_URL` |
| `.env.example` | Add `INTERNAL_API_BASE_URL=http://localhost:3000` |

---

## 10. Success Metrics

- [ ] `npm run typecheck` → 0 errors
- [ ] `npm run build` → clean build
- [ ] Live test: Search page query returns correct properties
- [ ] Live test: RLM page returns room rates
- [ ] Live test: Checkout page returns price summary
- [ ] Live test: Property details (deep query) returns policy info
- [ ] `tools.ts` has zero imports from `@/server/repositories/`
