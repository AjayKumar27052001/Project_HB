# dreRuss Hotels — API Testing & Stage-by-Stage Backend Debugging Guide

This guide explains how to inspect, trigger, and debug every backend API and AI orchestrator stage without touching React frontend code.

---

## 1. High-Level Architecture: Where Requests Flow

Understanding the path helps you pinpoint **which stage failed**:

```
[Postman / Browser / Curl]
          │
          ▼
1. MAIN AI ENTRYPOINT: POST /api/v3/assistant/turn
          │
          ▼
2. LANGGRAPH ORCHESTRATOR
   ├── Step 2a: interpretNode (Intent & Tool Planning with Gemini)
   ├── Step 2b: executeToolNode (Dispatches internal REST fetch)
   │               │
   │               ▼
   │     3. INTERNAL REST BACKEND (/internal/v1/assistant/...)
   │        ├── POST /properties/search
   │        ├── GET  /properties/{id}/rates
   │        ├── POST /properties/details
   │        ├── POST /checkout-summary
   │        ├── GET  /profiles/{id}
   │        ├── POST /loyalty/policy
   │        └── POST /upsell-offers
   │               │
   │               ▼
   │     4. DATABASE / KNOWLEDGE
   │        ├── MongoDB Atlas (Collections)
   │        └── loyalty-program.md (RAG Chunking)
   │               │
   │               ▼
   ├── Step 2c: selfReflectionNode (Audits missing facts & rate accuracy)
   ├── Step 2d: replanNode (Triggers round 2 tool if needed)
   └── Step 2e: synthesizeNode (Generates final answer with Gemini)
          │
          ▼
[Final JSON Response Returned to Caller]
```

---

## 2. Using Postman: Setup & Headers

**Yes, you can absolutely use Postman!** In fact, Postman is the best tool for this.

### A. Base Setup in Postman
1. Create a new Collection: `dreRuss AI Assistant`.
2. Add a Collection Variable:
   * `baseUrl`: `http://localhost:3000`
   * `aiToken`: `67d5f5c48791b5d0acb8f6e8148f281ac1f3e3d9f24fcb9cd9361ca441322419`

### B. Two Types of APIs in this Project
* **Type 1: Public AI Drawer Endpoint** (`/api/v3/assistant/turn`)
  * Header needed: `Content-Type: application/json`
  * (No Bearer token needed; called by browser drawer).
* **Type 2: Internal Decoupled REST Endpoints** (`/internal/v1/assistant/...`)
  * Headers needed:
    * `Content-Type: application/json`
    * `Authorization: Bearer 67d5f5c48791b5d0acb8f6e8148f281ac1f3e3d9f24fcb9cd9361ca441322419`

---

## 3. Postman Requests You Can Run Directly

### Request 1: Trigger the AI Orchestrator (Search Page Query)
* **Method:** `POST`
* **URL:** `{{baseUrl}}/api/v3/assistant/turn`
* **Headers:** `Content-Type: application/json`
* **Body (raw JSON):**
```json
{
  "pageSessionId": "postman-test-session-01",
  "page": "search-results",
  "profileId": "PROFILE-ALEX",
  "message": "which hotels have a spa?",
  "pageContext": {
    "profileId": "PROFILE-ALEX",
    "searchCriteria": {
      "destination": "Irving",
      "checkIn": "2026-11-19",
      "checkOut": "2026-11-20",
      "adults": 1,
      "rooms": 1
    }
  },
  "history": []
}
```

---

### Request 2: Test Guest Profile API (Direct Backend Test)
* **Method:** `GET`
* **URL:** `{{baseUrl}}/internal/v1/assistant/profiles/PROFILE-ALEX`
* **Headers:** 
  * `Authorization`: `Bearer {{aiToken}}`
* **Expected Output:**
```json
{
  "status": "complete",
  "data": {
    "id": "PROFILE-ALEX",
    "displayName": "Alex Sample",
    "rewards": {
      "tier": "Gold (demo)",
      "pointsBalance": 12400,
      "upgradeAwardsAvailable": 1,
      "pointsValueInRupees": 2480
    }
  }
}
```

---

### Request 3: Test RAG Loyalty Policy (Direct Knowledge Test)
* **Method:** `POST`
* **URL:** `{{baseUrl}}/internal/v1/assistant/loyalty/policy`
* **Headers:** 
  * `Content-Type`: `application/json`
  * `Authorization`: `Bearer {{aiToken}}`
* **Body (raw JSON):**
```json
{
  "topic": "tiers"
}
```
* **Expected Output:** Returns the exact markdown section from `src/data/loyalty-program.md` covering Silver, Gold, and Platinum qualification rules.

---

### Request 4: Test Confirmation Upselling Offers (Direct Backend Test)
* **Method:** `POST`
* **URL:** `{{baseUrl}}/internal/v1/assistant/upsell-offers`
* **Headers:** 
  * `Content-Type`: `application/json`
  * `Authorization`: `Bearer {{aiToken}}`
* **Body (raw JSON):**
```json
{
  "propertyId": "JNP-MND-02",
  "tier": "gold"
}
```
* **Expected Output:** Returns Suite Upgrade (+₹1,500), Breakfast (+₹500), Airport transfer (+₹1,200), and Special Occasion (+₹2,000).

---

### Request 5: Test Property Rates on RLM (Direct Backend Test)
* **Method:** `GET`
* **URL:** `{{baseUrl}}/internal/v1/assistant/properties/JNP-MND-02/rates?checkIn=2026-11-19&checkOut=2026-11-20&adults=2&rooms=1`
* **Headers:** 
  * `Authorization`: `Bearer {{aiToken}}`
* **Expected Output:** Returns available room types (Mandalay Lake King) and flexible rates.

---

## 4. How to Debug at Every Stage

When an AI response doesn't look right, here is how you troubleshoot each stage:

### Stage 1: Did the request reach the server?
* **Where to check:** Server terminal output (where `npm run dev` or `npm run start` is running).
* **What you should see:** Every request prints a telemetry line:
  ```json
  {"telemetry":"ASSISTANT_TURN_AUDIT","timestamp":"...","page":"search-results","profileId":"PROFILE-ALEX","status":"complete","durationMs":1240}
  ```
* **If nothing prints:** 
  * Wrong port (e.g. server on 3000, calling 3005).
  * Request payload $> 32\text{ KB}$ (blocked by `MAXIMUM_REQUEST_BYTES`).

---

### Stage 2: Did Gemini select the right tool? (`interpretNode`)
* **How to debug:** Add a debug log at line 100 in `src/server/assistant/orchestrator.ts`:
  ```ts
  console.log("[DEBUG Stage 2: Planned Tool]:", JSON.stringify(plan, null, 2));
  ```
* **Common issues:**
  * Gemini chose `getRoomRates` when it should have chosen `searchProperties`.
  * **Fix:** Update the bullet points in the `interpretNode` prompt explaining when to use each capability.

---

### Stage 3: Did the internal REST call succeed? (`internal-api-client.ts`)
* **How to debug:** Check the HTTP status returned by the internal endpoint.
  * In `src/server/assistant/internal-api-client.ts`:
  ```ts
  console.log(`[DEBUG Stage 3: Calling REST] ${method} ${url}`);
  ```
* **Common error codes:**
  * `401 UNAUTHORIZED`: Your `AI_SERVICE_TOKEN` in `.env.local` does not match the token in the request header or is $< 32$ characters.
  * `404 NOT_FOUND`: Property ID or Profile ID doesn't exist in MongoDB.
  * `503 SERVICE_UNAVAILABLE`: MongoDB connection timed out (Atlas IP access list needs your current IP).

---

### Stage 4: What evidence did the tool return? (`executeToolNode`)
* **How to debug:** Look at the `evidence` field in the final JSON response returned to Postman:
  ```json
  {
    "status": "complete",
    "answer": { "text": "..." },
    "evidence": [
      {
        "status": "complete",
        "data": { ... }
      }
    ]
  }
  ```
* **Rule:** If the data is NOT in `evidence`, the AI cannot answer it accurately without hallucinating.

---

### Stage 5: Did Gemini follow the formatting rules? (`synthesizeNode`)
* **How to debug:** In `src/server/assistant/orchestrator.ts`:
  ```ts
  console.log("[DEBUG Stage 5: Synthesize Prompt]:", prompt);
  console.log("[DEBUG Stage 5: Raw Model Output]:", answerText);
  ```
* **Common issues:**
  * Said *"Hey"* on turn 2 $\to$ Check if `request.history` was passed in the request payload. If `history` is empty, the model thinks it's turn 1.

---

## 5. Quick Debugging Cheat Sheet

| Symptom | Probable Cause | Where to Look |
| :--- | :--- | :--- |
| **`401 UNAUTHORIZED`** | `AI_SERVICE_TOKEN` mismatch | Check `.env.local` line `AI_SERVICE_TOKEN=` |
| **`503 PROFILE_UNAVAILABLE`** | MongoDB connection issue | Check terminal logs for `MongoServerSelectionError` |
| **`out_of_scope` status** | Query triggered tangentiality guard | Check `isOffTopicQuery()` in `orchestrator.ts` |
| **AI says "I don't know"** | Evidence was empty | Test the corresponding `/internal/v1/...` route directly in Postman |
| **Repeated 3-hotel search loop** | Missing property focus tracking | Verify `focusedPropertyId` is populated in `orchestrator.ts` |
