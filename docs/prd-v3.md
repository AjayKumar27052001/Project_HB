# Product Requirements Document: V3 Unified LangGraph Booking Assistant

**Product:** dreRuss Hotels booking experience  
**Version:** V3 (Unified In-Process LangGraph Assistant)  
**Status:** Approved for Implementation  
**Last updated:** 2026-11-19  

---

## 1. Executive Summary

V3 integrates an agentic AI assistant directly into the dreRuss Hotels booking web application. Using a unified **LangChain / LangGraph ReAct + Self-Reflection Orchestrator** running within the Next.js backend runtime (`app/api/v3/assistant/turn`), the assistant provides natural-language assistance across four core booking journey steps:
1. **Home:** Form guidance and search planning.
2. **Search Results:** Cross-property comparison, amenity filtering, and rate ranking across the complete matching hotel catalog.
3. **Rate List Menu (RLM):** Property-scoped room comparisons, package benefits (breakfast, parking), and cancellation policy checks.
4. **Checkout:** Selected stay summary, price breakdown verification, and terms explanation.

Unlike previous drafts that relied on a separate microservice on port 4100, V3 runs **in-process within Next.js**, eliminating multi-process latency, network proxy failures, and deployment complexity.

---

## 2. V3 vs. V4 Scope Boundary

To ensure a razor-sharp focus and immediate release readiness, clear boundaries are established:

| Area | V3 Scope (Current) | V4 Scope (Future Roadmap) |
| :--- | :--- | :--- |
| **Active Pages** | Home, Search Results, Rate List Menu (RLM), Checkout | Confirmation Page |
| **Core Capability** | Page-aware question answering, comparison tables, verified evidence | Personalized upselling & add-ons |
| **Data Utilized** | `properties` schema, room rates, cancellation policies, stay criteria | `profiles` schema (loyalty tiers), spa services, event tickets |
| **Personalization** | Read-only synthetic stay criteria; profile-agnostic | Loyalty-driven upselling (e.g. Silver to Gold tier upgrade, free night award redemption) |
| **Action Boundary** | Strictly read-only assistance; guest retains 100% control over booking actions | Contextual post-booking upsell offers |

---

## 3. Core Problems Solved in V3

1. **Information Fragmentation on Search Results:** Guests cannot easily compare 10+ properties on specific amenities (e.g., "Which hotels have a pool and free parking under $200?") without opening each property individually.
2. **Rate Ambiguity on RLM:** Guests struggle to differentiate between Standard Saver and Flexible rates, often missing whether breakfast is included or what the cancellation penalty is.
3. **Checkout Anxiety:** Guests want quick confirmation of deposit requirements, cancellation deadlines, and tax breakdowns before placing a reservation.

---

## 4. Product Requirements by Page

### 4.1 Home Page
* **Intent:** Help the guest understand search inputs (dates, adults, rooms).
* **Behavior:** Explains field rules (e.g. check-out must be after check-in, maximum 8 adults).
* **Boundary:** Does not pre-populate or auto-submit searches; does not claim hotel availability before a search is performed.

### 4.2 Search Results Page
* **Intent:** Evaluate, compare, and recommend hotels matching the user's active search query.
* **Behavior:** 
  * Queries backend across the *entire* matching dataset (not just the 5 items currently paginated in the browser).
  * Synthesizes comparison tables highlighting nightly price, amenities, and location perks.
  * Provides verified structured evidence cards in the assistant drawer.
* **Boundary:** Does not change active URL search filters or modify the search result grid automatically.

### 4.3 Rate List Menu (RLM) Page
* **Intent:** Assist the guest in selecting the optimal room and rate for the specific selected property.
* **Behavior:**
  * Compares room types (Deluxe King, Executive Suite, etc.) and rate packages.
  * Explicitly extracts and highlights inclusion benefits (breakfast, lounge access, credits).
  * Validates and verifies cancellation terms (free cancellation cutoff vs. non-refundable).
* **Boundary:** Scoped strictly to the selected property ID. Does not recommend outside hotels.

### 4.4 Checkout Page
* **Intent:** Summarize and verify the chosen reservation details prior to booking.
* **Behavior:** Explains total price breakdown (room cost + estimated taxes & fees) and restates the cancellation deadline.
* **Boundary:** Strictly read-only. Does not submit the booking or process payment.

---

## 5. Technical Requirements

1. **Unified Next.js In-Process Architecture:** The LangGraph state machine executes inside Route Handler `app/api/v3/assistant/turn/route.ts`. No separate server processes or port bindings.
2. **ReAct + Reflection Loop:**
   * Step 1: Reason about page context & user query.
   * Step 2: Act by executing approved internal booking APIs/repositories (`searchProperties`, `getPropertyDetails`, `getRoomRates`, `getCheckoutSummary`).
   * Step 3: Observe structured data returned from MongoDB.
   * Step 4: Self-Reflect on whether required facts (e.g. cancellation policy, breakfast inclusions) are present.
   * Step 5: Re-plan or deep-fetch missing details (bounded to a strict maximum of 2 retrieval rounds).
   * Step 6: Synthesize a concise markdown response with a comparison table and verified structured evidence.
3. **Deterministic Grounding:** The LLM cannot hallucinate rates, amenities, or policies. All stated numbers and terms must trace to backend records.
4. **Safe Error Handling:** When services are degraded or data is absent, the assistant provides a clear, polite fallback and actionable advice without breaking the UI.
