# PRD — V4.0: Loyalty Personalization, Upselling Engine & Enterprise Agent Guardrails

**Product:** dreRuss Hotels AI Assistant  
**Version:** 4.0  
**Status:** In Review  
**Author:** dreRuss Engineering  
**Date:** 2026-11-19  
**Depends On:** V3.0 (LangGraph ReAct + Self-Reflection), V3.5 (Decoupled REST Architecture)

---

## 1. Executive Summary & Problem Statement

In V3.0 and V3.5, the AI assistant successfully solved the core booking journey (`Home`, `Search`, `Rate List Menu (RLM)`, `Checkout`) using a decoupled REST architecture and a 2-Tier data model.

However, two critical business opportunities remain unaddressed:
1. **Post-Booking Revenue Loss:** After completing a reservation, guests land on the `Confirmation Page` without personalized offers for room upgrades, dining, transportation, or celebrations.
2. **Generic Guest Experience:** The assistant treats all users identically. It lacks awareness of returning members, accumulated loyalty points, expiring upgrade awards, or guest preferences (e.g., quiet room, high floor).
3. **Enterprise Compliance Gaps:** To scale safely in an enterprise environment, the agent must enforce user authentication linkages, prevent off-topic interactions (tangentiality), eliminate price fabrication (faithfulness audit), and log structured telemetry.

V4 transforms the assistant into an **Enterprise-Grade Conversational Loyalty Concierge and Upselling Engine**.

---

## 2. Goals & Success Metrics

### Business Goals
* Increase average revenue per booking (RevPAR) through contextual cross-sells and paid room upgrades.
* Boost direct bookings by proactively nudging Silver and Gold members toward the next tier threshold.
* Promote loyalty award utilization (e.g. reminding guests to redeem upgrade awards or reward points).

### Key Performance Indicators (KPIs)
* **Upsell Engagement Rate:** $\ge 25\%$ of guests on the Confirmation page interact with upselling suggestions.
* **Faithfulness & Factuality:** $0\%$ fabricated rates, discounts, or awards (100% verified against DB or policy docs).
* **Tangentiality Filter:** $\ge 98\%$ of out-of-domain requests deflected gracefully without invoking backend tools.
* **End-to-End Latency:** $\le 2.0\text{s}$ P95 turn latency.

---

## 3. User Personas & Scenarios

| Persona | Status & Profile | Scenario |
| :--- | :--- | :--- |
| **Alex Sample** | **Gold Member**<br/>• 12,400 pts<br/>• 1 Upgrade Award<br/>• Prefs: Quiet room, late checkout | Books a Standard room at Mandalay Lake. On the Confirmation page, the agent recognizes Gold status, offers to apply the 1 free Upgrade Award for a Deluxe Suite, and suggests priority late checkout. |
| **Morgan Sample** | **Silver Member**<br/>• 6,800 pts<br/>• 0 Upgrade Awards<br/>• Prefs: Fitness center, high floor | Visiting the Home page. The agent detects Morgan is only 2 stays away from Gold and proactively nudges: *"Book 5 nights annually to unlock 7 pts/₹100 and a 5% direct booking discount."* |
| **Riley Sample** | **Platinum Member**<br/>• 24,750 pts<br/>• 2 Upgrade Awards<br/>• Prefs: Suite space, breakfast | Checks out a stay. The agent informs Riley that complimentary breakfast is already unlocked as a Platinum perk and suggests an Airport Transfer package (+₹1,200). |
| **Guest / Anonymous** | **Unauthenticated** | Gracefully guided to standard booking assistance with member enrollment promotional nudges. |

---

## 4. Scope & Feature Specifications

### 4.1 Authn/Authz, Session Token Linkage & Security Lifecycle
* **Session ID Lifecycle:**
  * Created by the client upon drawer initialization and stored in `sessionStorage` (`assistant_session_id`).
  * Persists across page navigations in the same browser tab; automatically discarded when the tab is closed.
  * **Inactivity Timeout:** Evaluated on the client (`Date.now() - lastActiveTimestamp > 30 mins`). Upon expiration, state resets and a new session ID is generated.
* **Identity & Token Linkage:**
  * Request payload binds `pageSessionId` with authenticated `profileId` (or session auth token).
* **Authorization Check:**
  * The agent enforces role-based access rules: private endpoints (`getGuestProfile`) can only be queried for the verified `profileId` attached to the active session. Morgan cannot view or claim Alex's points or awards.
* **Graceful Guest Fallback:**
  * If `profileId` is null or unauthenticated, the agent gracefully defaults to public booking assistance (public searches, room rates, hotel facts) without attempting private profile lookups.
  * Proactively invites the guest to enroll in Juniper Rewards to unlock member perks.

### 4.2 Dynamic Upselling & Cross-Selling Matrix (Confirmation Page Only)
Context-aware post-booking recommendations based on property amenities and guest tier:

| Category | Offer Description | Baseline Price | Loyalty Perk / Rule |
| :--- | :--- | :--- | :--- |
| **Room Upgrade** | Standard $\to$ Deluxe / Suite | +₹1,500 / night | Redeemable with Upgrade Award (Gold/Platinum) |
| **Breakfast** | Daily hot breakfast package | +₹500 / guest / day | **Complimentary for Platinum** |
| **Transportation** | Private airport pickup/drop-off | +₹1,200 / trip | Applicable for all guests |
| **Special Occasion** | Anniversary / Birthday / Honeymoon decor | +₹2,000 / package | Recommended at Confirmation stage |
| **Late Checkout** | Extended checkout (up to 2:00 PM) | +₹800 / stay | **Priority complimentary for Gold & Platinum** |

### 4.3 Lightweight RAG Policy Engine (Loyalty Knowledge Base)
* **Knowledge Document:** `src/data/loyalty-program.md` containing strict rules for:
  * Earning ratios: Silver (5 pts/₹100), Gold (7 pts/₹100), Platinum (10 pts/₹100).
  * Point redemption value: ₹0.20 per point credit.
  * Tier qualification: Silver (0 nights), Gold (5 nights), Platinum (15 nights).
  * Discount stacking rules: Member discounts cannot combine with seasonal promo codes.
* **Tool:** `queryLoyaltyPolicy(topic)`
  * Extracts only the relevant section tagged with `[TIER_BENEFITS]`, `[EARNING_RULES]`, `[UPSELL_TERMS]`, or `[REDEMPTION]`.
  * Injects $\approx 100\text{ tokens}$ into context only when triggered.

### 4.4 Memory & State Machine
1. **Short-Term Memory:** Retains current multi-turn dialogue context (`history[]`).
2. **Long-Term Memory:** Fetches member profile (`demoProfiles`) including:
   * Current Tier (`Silver`, `Gold`, `Platinum`).
   * Points balance and available awards count.
   * Stored guest preferences (`preferences[]`).
3. **Preference Grounding:** When suggesting rooms or packages, the agent references known preferences (e.g., highlighting a quiet high-floor room for Morgan or suite upgrades for Riley).

### 4.5 Guardrails, Faithfulness & Tangentiality
* **Tangentiality Filter:** In `interpretNode`, detects non-travel or irrelevant prompts (e.g. coding, math, general world knowledge) and returns a friendly out-of-scope deflection without invoking backend tools.
* **Faithfulness Audit:** In `selfReflectionNode`, verifies that any quoted price, discount percentage, or award count strictly exists in the retrieved evidence or policy chunk. Unverified claims are stripped.
* **Response Formatting Consistency:**
  * Turn 1 greeting ("Hey!"), casual tone on subsequent turns.
  * Direct answer first, bullet points or compact tables, and single `**Suggestion:** ` on the last line.

### 4.6 Telemetry & Evaluation Logging
Every turn emits structured audit telemetry to the server console:
```json
{
  "timestamp": "2026-11-19T21:45:00Z",
  "requestId": "uuid",
  "page": "confirmation",
  "profileId": "PROFILE-ALEX",
  "tier": "Gold",
  "intent": "upsell_upgrade",
  "toolsInvoked": ["getGuestProfile", "queryLoyaltyPolicy"],
  "retrievalRounds": 1,
  "faithfulnessCheck": "PASSED",
  "latencyMs": 1150
}
```

---

## 5. Technical Architecture & LangGraph Node Flow

```
                      [ Guest Message + Profile ID ]
                                    │
                                    ▼
                          ┌──────────────────┐
                          │ interpretNode    │ ◄── Tangentiality Guard
                          └─────────┬────────┘
                                    │
                 ┌──────────────────┴──────────────────┐
                 ▼                                     ▼
        [Standard Booking Tools]             [V4 Enterprise Tools]
        • searchProperties                   • getGuestProfile
        • getRoomRates                       • queryLoyaltyPolicy (RAG)
        • getPropertyDetails                 • getUpsellOffers
                 │                                     │
                 └──────────────────┬──────────────────┘
                                    │
                                    ▼
                          ┌──────────────────┐
                          │ executeToolNode  │ ◄── REST calls via internal-api-client
                          └─────────┬────────┘
                                    │
                                    ▼
                          ┌──────────────────┐
                          │ selfReflection   │ ◄── Faithfulness & Hallucination Audit
                          └─────────┬────────┘
                                    │
                         [Audit Pass / Replan]
                                    │
                                    ▼
                          ┌──────────────────┐
                          │ synthesizeNode   │ ◄── Preference-grounded output + Suggestion
                          └──────────────────┘
```

---

## 6. API & Capability Registry Updates

### New Capabilities in `tools.ts`:

1. **`getGuestProfile`**
   * **Allowed Pages:** `["home", "confirmation", "checkout", "search-results", "rate-list"]`
   * **Input:** `{ profileId: string }`
   * **Output:** `{ displayName, tier, pointsBalance, upgradeAwards, preferences, nightsToNextTier }`

2. **`queryLoyaltyPolicy` (RAG Tool)**
   * **Allowed Pages:** All pages
   * **Input:** `{ topic: "tiers" | "points" | "upgrades" | "cancellation_rules" }`
   * **Output:** `{ topic, verifiedRules: string[] }`

3. **`getUpsellOffers`**
   * **Allowed Pages:** `["confirmation"]` (Strictly scoped to post-booking confirmation)
   * **Input:** `{ propertyId: string, currentRoomId?: string, tier: string }`
   * **Output:** `{ availableUpgrades: Array<{ type, name, price, loyaltyDiscount, perkBadge }> }`

---

## 7. Out of Scope for V4 (Deferred to V5)
* Real credit card payment processing for add-ons (mock confirmation only).
* Multi-lingual translations.
* External CRM webhook sync (Salesforce/Opera PMS).

---

## 8. Acceptance Criteria

1. **Confirmation Page AI Drawer:** Opening the drawer on `/confirmation/[code]` proactively welcomes the guest with their name, acknowledges their booking, and suggests 1–2 relevant add-ons or upgrades.
2. **Loyalty Awareness:** If Alex (Gold) interacts, the agent highlights the 1 available Upgrade Award and 5% booking discount.
3. **Nudge on Home:** Morgan (Silver) asking about membership is told they need 5 nights for Gold.
4. **Zero Fabrication:** The agent cannot invent non-existent discount rates or prices.
5. **Decoupled Architecture Maintained:** All new capabilities hit REST endpoints via `internal-api-client.ts` with Bearer auth.
6. **Code Quality:** `npm run typecheck` and `npm run build` pass with 0 errors.
