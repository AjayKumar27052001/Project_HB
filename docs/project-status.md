# Project Status — dreRuss Hotels AI Assistant

## V4.0 — Loyalty Personalization, Upselling Engine & Enterprise Guardrails (COMPLETE ✅)

### Jira Board

| Story ID | Title | Status | Priority | Assignee |
|---|---|---|---|---|
| **V4-01** | Knowledge Base Setup & Domain-Chunked Policy Doc (`loyalty-program.md`) | ✅ DONE | P0 | dreRuss Engineering |
| **V4-02** | Internal REST Endpoints & Capability Tools (`getGuestProfile`, `queryLoyaltyPolicy`, `getUpsellOffers`) | ✅ DONE | P0 | dreRuss Engineering |
| **V4-03** | Session Token Linkage, Authorization Guard & Enterprise Controls | ✅ DONE | P0 | dreRuss Engineering |
| **V4-04** | LangGraph Orchestrator Upgrades (Tangentiality Guard & Faithfulness Audit) | ✅ DONE | P0 | dreRuss Engineering |
| **V4-05** | Confirmation Page AI Drawer Integration & Upselling UI Flow | ✅ DONE | P0 | dreRuss Engineering |
| **V4-06** | Home Page Loyalty Guidance, Multi-Profile Verification & QA | ✅ DONE | P0 | dreRuss Engineering |

---

## V4 Bug Tracking & Post-Release Hardening

| Bug ID | Title | Status | Root Cause & Resolution |
|---|---|---|---|
| **V4-BUG-01** | Brittle Regex Intent Classification on Home Page | ✅ FIXED | **Root Cause:** Hardcoded regex (`\bbenefit\b`) failed when users typed plurals ("benefits") or synonyms ("perks/privileges"), causing the agent to fall back to generic search form instructions.<br/>**Permanent Architectural Fix:** Replaced regex shortcut entirely with pure LLM semantic classification in `interpretNode`. Synonyms, typos, and plurals now route reliably across all pages with zero regex maintenance. |
| **V4-BUG-02** | Profile Context Ignored for Personal Benefit Queries | ✅ FIXED | **Root Cause:** When an authenticated guest asked *"what are the benefits I can get"*, the agent answered with generic search guidance instead of querying the active `profileId`.<br/>**Permanent Architectural Fix:** In `interpretNode`, personal benefit/perk queries now semantically route to `getGuestProfile`, ensuring answers are grounded in the member's verified tier (e.g. Gold), points (12,400 pts / ₹2,480), and available Upgrade Awards. |

---

### Implementation & Verification Summary

#### V4-01: Knowledge Base Setup (`src/data/loyalty-program.md`)
- Tagged with `[TIER_BENEFITS]`, `[REDEMPTION]`, and `[UPSELL_TERMS]`.
- Contains qualification nights (Gold: 5, Platinum: 15), point multipliers (5, 7, 10), and discount rules.

#### V4-02: Decoupled REST Endpoints & Tools
- `GET /internal/v1/assistant/profiles/[profileId]` ➔ Authenticated guest loyalty stats, points valuation (₹0.20/pt), awards, and preferences with fallback.
- `POST /internal/v1/assistant/loyalty/policy` ➔ Lightweight RAG endpoint serving matching policy chunks.
- `POST /internal/v1/assistant/upsell-offers` ➔ Post-booking add-ons (Deluxe Suite, breakfast, airport transfer, celebration packages).
- Registered all tools in `CAPABILITY_REGISTRY` in `src/server/assistant/tools.ts`. `getUpsellOffers` strictly scoped to `allowedPages: ["confirmation"]`.

#### V4-03: Session Token Linkage & Security Lifecycle
- `sessionStorage` management with 30-minute inactivity auto-reset in `assistant-panel.tsx`.
- Request binding: `profileId` bound to `pageSessionId`.
- Authorization check: validates profile ID against registered demo credentials.
- Safe fallback for anonymous guest sessions.

#### V4-04: LangGraph Orchestrator Upgrades
- **Tangentiality Guard:** Instant deflection of out-of-scope non-travel queries without tool invocations.
- **Self-Reflection & Faithfulness Audit:** Audits rates and award availability before synthesis.
- **Audit Telemetry:** Structured JSON output per turn (`telemetry: "ASSISTANT_TURN_AUDIT"`).
- **Pure Semantic Intent Router:** Zero regex rules in `interpretNode`.

#### V4-05 & V4-06: End-to-End Persona Verification
- **Alex (Gold):** Proactively offered Deluxe Suite upgrade for 1 free Upgrade Award and acknowledged quiet room / late checkout preferences.
- **Morgan (Silver):** Guided on Home page to reach Gold status in 5 nights.
- **Riley (Platinum):** Acknowledged complimentary daily gourmet breakfast and 2 free Upgrade Awards.
- **Search Page Focus Memory:** Retains focused property across date changes without amnesia loops.
- `npm run typecheck` passed (0 errors), `npm run build` passed (clean bundle in 0.9s).

---

## Past Versions

### V3.5 — AI Layer Decoupled to Internal REST API (Committed `3595c21`) ✅
* Decoupled `tools.ts` to call internal REST endpoints via `internal-api-client.ts`.
* Added `INTERNAL_API_BASE_URL` for seamless Java/polyglot backend migration.

### V3.0 — LangGraph ReAct + Self-Reflection AI Assistant (Committed `7045660`) ✅
* 5-Node LangGraph state graph.
* 2-Tier data model (search/rates + deep-dive property facts).
* Integrated on Home, Search, RLM, and Checkout.
