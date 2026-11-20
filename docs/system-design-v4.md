# System Design — V4.0: Loyalty Personalization, Upselling Engine & Enterprise Guardrails

**Document:** System Design Document  
**Version:** 4.0  
**Status:** Approved  
**Author:** dreRuss Engineering  
**Date:** 2026-11-20  
**Refers to:** [docs/prd-v4.md](file:///Users/jadkumar/Documents/antigravity/AI_stuff_marriott/docs/prd-v4.md)

---

## 1. High-Level System Architecture

V4 builds directly on the decoupled REST architecture established in V3.5, introducing four enterprise-grade subsystems:
1. **Client Session & Token Linkage Layer** (session lifetime & user binding).
2. **Knowledge Retrieval Layer (Lightweight RAG Engine)**.
3. **Enterprise Guardrails & Telemetry Subsystem** (tangentiality & faithfulness checks).
4. **Contextual Upsell & Profile Personalization Engine**.

```mermaid
flowchart TB
    subgraph CLIENT["1. CLIENT / PRESENTATION LAYER (Next.js React Client)"]
        direction TB
        PAGES["Touchpoints<br/>• Home Page<br/>• Confirmation Page (/confirmation/[code])<br/>• Search / RLM / Checkout"]
        DRAWER["AI Concierge Drawer (AssistantPanel)<br/>• sessionStorage ['assistant_session_id']<br/>• 30-min Inactivity Auto-Reset<br/>• Bound to active profileId"]
        PAGES <--> DRAWER
    end

    DRAWER -->|"POST /api/v3/assistant/turn<br/>{ pageSessionId, profileId, message, pageContext, history }"| API_GATEWAY

    subgraph SECURITY["2. SECURITY, AUTHZ & GUARDRAIL LAYER"]
        direction TB
        API_GATEWAY["Route Handler (app/api/v3/assistant/turn)"]
        SESSION_BIND{"Session & Identity Validator<br/>• Verify pageSessionId active<br/>• Validate authorized profileId"}
        TANGENTIAL{"Tangentiality Guard<br/>• Deflect off-topic queries"}
        
        API_GATEWAY --> SESSION_BIND
        SESSION_BIND --> TANGENTIAL
    end

    subgraph LANGGRAPH["3. LANGGRAPH RE-ACT & SELF-REFLECTION ENGINE (V4)"]
        direction TB
        N1["1. interpretNode<br/>• Detects intent (booking, loyalty, upsell)<br/>• Employs schema-aware routing"]
        N2["2. executeToolNode (Act)<br/>• Calls decoupled REST via internal-api-client<br/>• Merges multi-round evidence"]
        N3{"3. selfReflectionNode (Audit)<br/>• Missing policy/rates check?<br/>• Faithfulness Check: Are rates & awards verified?"}
        N4["4. replanNode<br/>• Triggers Tier 2 details or RAG fetch"]
        N5["5. synthesizeNode<br/>• Grounded in member preferences<br/>• Format: Hey! on Turn 1 / Casual after<br/>• Direct answer + Bullets + **Suggestion:**"]

        N1 --> N2
        N2 --> N3
        N3 -- "Gap Detected (Round < 2)" --> N4
        N4 --> N2
        N3 -- "Verified & Faithful" --> N5
    end

    TANGENTIAL -- "On-Domain" --> N1
    TANGENTIAL -- "Off-Domain" --> DEFLECT["Immediate Friendly Deflection<br/>(Zero tool calls)"]

    subgraph REST_LAYER["4. DECOUPLED BACKEND SERVICES (Node.js or Java)"]
        direction TB
        API_CLIENT["internal-api-client.ts<br/>(Bearer AI_SERVICE_TOKEN)"]

        subgraph SERVICES["REST Endpoints (/internal/v1/assistant/...)"]
            EP_SEARCH["POST /properties/search"]
            EP_RATES["GET /properties/{id}/rates"]
            EP_DETAILS["POST /properties/details"]
            EP_PROFILE["GET /profiles/{profileId}<br/>(Rewards, points, awards, prefs)"]
            EP_POLICY["POST /loyalty/policy<br/>(RAG token-efficient chunk query)"]
            EP_UPSELL["POST /upsell-offers<br/>(Confirmation-only room upgrades & packages)"]
        end

        API_CLIENT --> SERVICES
    end

    N2 --> API_CLIENT

    subgraph STORAGE["5. PERSISTENCE & KNOWLEDGE BASE"]
        direction TB
        MONGO[("MongoDB Atlas<br/>• properties<br/>• roomRates<br/>• bookings<br/>• demoProfiles")]
        RAG_DOC["Policy Knowledge Base<br/>• src/data/loyalty-program.md<br/>• [TIER_BENEFITS], [REDEMPTION], [UPSELL_TERMS]"]
    end

    SERVICES --> MONGO
    SERVICES --> RAG_DOC

    N5 -->|"Formatted Response + Audit Telemetry"| DRAWER
```

---

## 2. Component Design & Deep Dive

### 2.1 Client Session & Token Linkage
1. **Lifecycle Management:**
   * On mount, `AssistantPanel` reads `sessionStorage.getItem("assistant_session_id")`.
   * If absent or if `Date.now() - lastActive > 30 * 60 * 1000`, it generates `sess_${crypto.randomUUID()}` and resets chat history.
2. **Session-to-Profile Binding:**
   * When user switches profile (e.g. from Morgan to Alex in demo picker), the client detects `previousProfileId !== activeProfileId`, terminates old session, and starts a fresh isolated session.
3. **Authorization Guard in API:**
   * Requests for `getGuestProfile` are validated so that a guest can only access the `profileId` declared in the session header. Cross-profile data tampering is strictly prohibited.

---

### 2.2 Lightweight RAG Knowledge Engine

Instead of embedding heavy vector databases for static policy text, V4 implements **Domain-Tagged Markdown Chunking**:

```
src/data/loyalty-program.md
  ├── <!-- [TIER_BENEFITS] -->
  │     Silver (5 pts/₹100), Gold (5 nights, 7 pts, 5% disc), Platinum (15 nights, 10 pts, 10% disc, breakfast)
  ├── <!-- [REDEMPTION] -->
  │     ₹0.20 per point credit, blackout rules, cancellation exclusions
  └── <!-- [UPSELL_TERMS] -->
        Room upgrades (+₹1,500/night), Breakfast (+₹500/day), Airport (+₹1,200), Special Occasion (+₹2,000)
```

* **Tool:** `queryLoyaltyPolicy({ topic: "tiers" | "points" | "upgrades" })`
* **Execution:** Reads file, matches the section tag, and returns only that chunk ($\approx 100\text{ tokens}$).
* **Token Impact:** Zero extra tokens on normal booking searches; minimal tokens when policy questions are asked.

---

### 2.3 Contextual Upselling Engine (`getUpsellOffers`)
* **Strict Scope:** `allowedPages: ["confirmation"]`.
* **Input:** `{ propertyId, currentRoomId, tier }`.
* **Logic:**
  1. Inspects property features (e.g. lake view, canal, suites).
  2. Identifies higher-tier room types (Standard $\to$ Deluxe Lake Suite for +₹1,500/night).
  3. Checks guest tier privileges:
     * **Gold / Platinum:** Flags `perkBadge: "Eligible for Complimentary Upgrade Award"` if available awards $> 0$.
     * **Platinum:** Marks breakfast as `perkBadge: "Complimentary Platinum Benefit"`.
  4. Returns standard post-booking add-ons: Airport Transfer (+₹1,200) and Special Occasion Decor (+₹2,000).

---

### 2.4 Enterprise Guardrails & Telemetry

#### 1. Tangentiality Filter (`interpretNode`)
Checks prompt relevance against hotel booking, loyalty, and stay domains.
* If user asks off-topic queries (e.g., *"Write a Python script"*, *"Who is Napoleon?"*):
* LangGraph bypasses tool execution and directly synthesizes:
  > *"I am dreRuss Concierge, your hotel booking and loyalty assistant. I can only assist with Juniper hotels, reservations, and rewards."*

#### 2. Faithfulness & Hallucination Audit (`selfReflectionNode`)
Before synthesis:
* Regex audits the draft response or planned facts against retrieved evidence.
* If a price (e.g. "₹1,500") or percentage (e.g. "5% discount") is mentioned without corresponding DB or RAG evidence, the node flags `faithfulnessViolation: true` and strips the fabricated claim.

#### 3. Structured Audit Telemetry
At the conclusion of each turn, the orchestrator emits a structured audit record:
```json
{
  "timestamp": "2026-11-20T08:15:00Z",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "pageSessionId": "sess_9f8a2b3c",
  "profileId": "PROFILE-ALEX",
  "tier": "Gold (demo)",
  "page": "confirmation",
  "toolsCalled": ["getGuestProfile", "getUpsellOffers"],
  "retrievalRounds": 1,
  "faithfulnessVerified": true,
  "durationMs": 940
}
```

---

## 3. Data Flow: Confirmation Page Upselling Journey

```mermaid
sequenceDiagram
    autonumber
    actor Guest as Alex (Gold Member)
    participant UI as Confirmation Page (/confirmation/[code])
    participant Route as Assistant API (/api/v3/assistant/turn)
    participant Graph as LangGraph Engine
    participant REST as Decoupled Internal REST
    participant DB as MongoDB demoProfiles

    UI->>Route: POST /api/v3/assistant/turn (booking details + PROFILE-ALEX)
    Route->>Graph: invoke(request)
    Graph->>Graph: interpretNode: Identify intent as 'confirmation_welcome'
    Graph->>REST: GET /internal/v1/assistant/profiles/PROFILE-ALEX
    REST->>DB: Fetch Alex profile (Gold, 1 Award, 12,400 pts)
    DB-->>REST: Return profile
    REST-->>Graph: Profile evidence
    Graph->>REST: POST /internal/v1/assistant/upsell-offers (propertyId, tier: Gold)
    REST-->>Graph: Upsell evidence (Suite upgrade + Occasion package)
    Graph->>Graph: selfReflectionNode: Audit rates & awards faithfulness
    Graph->>Graph: synthesizeNode: Apply preferences & Gold award suggestion
    Graph-->>Route: Return structured AssistantResponse
    Route-->>UI: Display verified personalized greeting & upgrade option
    UI->>Guest: "Hey Alex! Your stay at Mandalay Lake is confirmed..."
```

---

## 4. Verification & Non-Functional Requirements (NFRs)

| NFR Category | Target Specification |
| :--- | :--- |
| **Response Latency** | P95 $\le 2.0\text{ seconds}$ per conversational turn |
| **Token Efficiency** | Lightweight RAG chunks limit extra input tokens to $\le 150\text{ tokens}$ |
| **Security & Privacy** | Session-bound authorization prevents cross-account profile access |
| **Reliability** | Decoupled REST routes return fallback envelopes on service timeout |
| **Code Integrity** | TypeScript strict mode, zero `any` types in contracts, 100% build pass |
