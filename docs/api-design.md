# API Design: Hotel Booking Assistant

## 1. API conventions

- Base path: `/api/v1`.
- Transport: JSON over HTTPS when deployed; local HTTP for development.
- Next.js App Router Route Handlers run on Node.js and own Gemini requests and MongoDB access.
- IDs in examples are synthetic. Do not pass authoritative prices, cancellation terms, or availability from the browser; the backend resolves them from MongoDB.
- Dates use ISO `YYYY-MM-DD`; timestamps use UTC ISO 8601; currency uses ISO 4217 codes.
- Use consistent error shape and stable machine-readable error codes.
- The profile picker selects a seeded demo profile; it is not authentication or authorization. Do not treat profile IDs or confirmation codes as access control for real data.

## 2. Common types

```ts
type Page = "home" | "search-results" | "rate-list" | "checkout" | "confirmation";

type SearchCriteria = {
  destination: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  rooms: number;
};

type DemoProfile = {
  id: string;
  displayName: string;
  email: string;
  preferences: string[];
  rewards: { programName: string; tier: string; pointsBalance: number; upgradeAwardsAvailable: number };
  demo: true;
};

type Money = { amount: string; currency: string };

type ApiError = {
  error: {
    code: string;
    message: string;
    retryable: boolean;
    requestId: string;
    details?: Record<string, unknown>;
  };
};
```

Amounts are decimal strings in API contracts to avoid floating point currency errors. Use integer minor units or a decimal library internally.

## 3. Endpoints

### 3.1 Get destinations

`GET /api/v1/destinations?query=sample`

Response `200`:

```json
{
  "items": [
    { "id": "DEST-001", "name": "Sample City", "country": "US" }
  ]
}
```

### 3.2 Search properties

`POST /api/v1/searches`

Request:

```json
{
  "destination": "New York",
  "checkIn": "2027-04-10",
  "checkOut": "2027-04-13",
  "adults": 2,
  "rooms": 1,
  "page": 1,
  "pageSize": 20
}
```

Response `200`:

```json
{
  "criteria": { "destination": "New York", "checkIn": "2027-04-10", "checkOut": "2027-04-13", "adults": 2, "rooms": 1 },
  "results": [
    {
      "id": "JNP-NEW-YORK-01",
      "name": "Juniper New York Sample Stay 01",
      "area": "Sample District 01",
      "cityLabel": "New York · New York",
      "summary": "A fictional Juniper demo property in sample district 01.",
      "rating": "4.7",
      "reviewCount": 21,
      "amenities": ["Canal view", "Heated pool", "Spa", "Garden bistro"],
      "startingNightlyRate": { "amount": "200.00", "currency": "USD" },
      "imageClass": "photo-canal"
    }
  ],
  "pagination": { "page": 1, "pageSize": 20, "total": 50, "totalPages": 3 }
}
```

The result list and starting prices are synthetic and MongoDB-backed. The current seed has 50 fictional New York properties and smaller Irving, Chicago, Los Angeles, and San Francisco catalogs. Match a normalized city name (including `New York, NY`, `New York City`, `Irving, Texas`, `Irving, TX`, and the seeded California/Illinois city names); unknown destinations return `200` with an empty `results` array. Results are sorted by property name and ID, with a default page size of 20 and maximum page size of 50. Invalid criteria return `400`; database failures return `503`. This is a stateless search operation: criteria remain in browser state, and the endpoint does not create a search document or issue a `searchId`. Search results intentionally omit room and rate arrays; the rate endpoint owns those details.

### 3.3 Get rate options

`GET /api/v1/properties/{propertyId}/rates?checkIn=2027-04-10&checkOut=2027-04-13&adults=2&rooms=1`

The Rate List Menu sends the current browser-held stay criteria. It does not send `searchId`, rates, room details, or authoritative price values. The backend loads the active property and embedded room/rate plans from MongoDB, then calculates the quote for the requested nights and rooms using integer minor units. Children are not part of the current search form. Dates must be valid and checkout later than check-in; stays are limited to 30 nights; adults are 1–8 and rooms are 1–5.

Response `200`:

```json
{
  "property": {
    "id": "JNP-NEW-YORK-01",
    "name": "Juniper New York Sample Stay 01",
    "area": "Sample District 01",
    "cityLabel": "New York · New York",
    "summary": "A fictional Juniper demo property in sample district 01.",
    "rating": "4.7",
    "reviewCount": 21,
    "amenities": ["Canal view", "Heated pool", "Spa", "Garden bistro"],
    "startingNightlyRate": { "amount": "200.00", "currency": "USD" },
    "imageClass": "photo-canal"
  },
  "criteria": { "checkIn": "2027-04-10", "checkOut": "2027-04-13", "adults": 2, "rooms": 1 },
  "nights": 3,
  "rooms": [
    {
      "id": "ROOM-NEW-YORK-01-1",
      "name": "Deluxe Canal View King",
      "description": "A bright guest room with a private balcony overlooking the canal.",
      "details": ["1 king bed"],
      "maxAdults": 2,
      "imageClass": "photo-room",
      "rates": [
        {
          "id": "RATE-NEW-YORK-01-1-1",
          "name": "Flexible Rate",
          "description": "More flexibility if plans change.",
          "nightlyRates": [
            { "date": "2027-04-10", "amount": "200.00", "currency": "USD" },
            { "date": "2027-04-11", "amount": "200.00", "currency": "USD" },
            { "date": "2027-04-12", "amount": "200.00", "currency": "USD" }
          ],
          "subtotal": { "amount": "600.00", "currency": "USD" },
          "taxes": { "amount": "82.50", "currency": "USD" },
          "fees": { "amount": "0.00", "currency": "USD" },
          "taxesAndFees": { "amount": "82.50", "currency": "USD" },
          "total": { "amount": "682.50", "currency": "USD" },
          "cancellationSummary": "Free cancellation until the stated demo deadline.",
          "cancellationDeadline": "",
          "paymentSummary": "No payment is collected in this demo.",
          "demoAvailableRooms": 4
        }
      ]
    }
  ],
  "demo": true
}
```

`nightlyRates` shows the synthetic per-room nightly amount. The subtotal, taxes, fees, and total include the requested room count and all stay nights. The same server pricing function is used again by `POST /api/v1/bookings`; the browser never submits price values. `demoAvailableRooms` is static sample inventory and is not date-specific. Unknown/inactive properties return `404`; malformed criteria return `400`; database failures return `503`.

### 3.4 Assistant turn

`POST /api/v1/assistant/turn`

The browser makes one request per user turn. It sends a bounded transcript, a compact page context, and only the selected synthetic `profileId`. The server resolves that ID against `demoProfiles` and adds an explicit allowlist of preferences and illustrative rewards; it never trusts profile details from the browser. The server then makes one Gemini Interactions API request. This slice does not use function calling, model-triggered tools, MongoDB conversation history, or cross-route memory. A new `pageSessionId` and empty transcript are created on navigation or profile change.

Current V2 behavior on Search Results and RLM: `pageContext` contains a limitation message only; no property or rate facts are read from local fixtures or sent to Gemini. Server retrieval and compact grounding from canonical MongoDB property/rate records are planned for V3. The V3 browser request will send identifiers and the question, not full property/rate payloads.

Request:

```json
{
  "pageSessionId": "a5d26421-043c-4558-87b7-703f05d0bb7c",
  "page": "home",
  "profileId": "PROFILE-ALEX",
  "history": [
    { "role": "user", "text": "How many adults can I search for?" },
    { "role": "assistant", "text": "The form supports 1 to 8 adults." }
  ],
  "message": "Can I search for 4 adults?",
  "pageContext": {
    "visibleSearchFields": ["Destination", "Check-in", "Check-out", "Adults", "Rooms"],
    "searchLimits": { "adults": "1 to 8", "rooms": "1 to 5" }
  }
}
```

The handler accepts only `home`, `search-results`, `rate-list`, `checkout`, and `confirmation`, and validates the selected `profileId` against the seeded profile collection. It caps the streamed request body at 32 KB before JSON parsing, bounds the current message to 1,000 characters, history to 12 messages, and serialized page context to 8,000 characters. Page context is allowlisted by page; raw search destination is excluded from Checkout/Confirmation context; private/contact/profile keys and common email, phone, and labeled contact patterns in chat text are removed before prompt construction. This text scrub is heuristic and cannot guarantee removal of arbitrary personal text, so use synthetic prompts only. The profile context is separately assembled server-side from preferences and illustrative reward fields only; it excludes display name, email, and contact details. The assistant may answer from either current-page facts or these allowlisted profile facts, and uses its cannot-confirm fallback only when both sources lack the requested fact. Guests are told to use fictional details only. The `GEMINI_API_KEY` is read only on the server. The provider request uses `POST https://generativelanguage.googleapis.com/v1beta/interactions` with model `gemini-3.5-flash-lite`, low thinking effort, `store: false`, and no tools. Google has deprecated this model without announcing a shutdown date; use it as a temporary demo choice and verify a supported free-tier replacement before switching. The current page transcript is sent by the browser and is never joined across route changes.

Response `200`:

```json
{
  "pageSessionId": "a5d26421-043c-4558-87b7-703f05d0bb7c",
  "reply": { "text": "The Flexible Rate permits free cancellation until Nov 17, 2026 at 11:59 PM hotel local time." },
  "requestId": "a71bb3f3-427e-4bca-a723-6af2a405f6d9"
}
```

When no key is configured, the route returns `503 AI_NOT_CONFIGURED` with non-retryable setup guidance; the UI asks the developer to correct configuration before sending another question. Provider quota, timeout, empty-reply, and temporary network/provider failures use stable retryable error codes. No provider error body or API key is returned to the browser.

The reply is informational only. It must not contain a machine-executable selection action. The assistant endpoint does not update page state or submit a booking. Search/Rates property comparisons are not in the current V2 assistant context; they belong to V3 backend grounding.

### 3.5 Create mock booking

`POST /api/v1/bookings`

Request:

```json
{
  "checkIn": "2026-11-20",
  "checkOut": "2026-11-22",
  "adults": 2,
  "rooms": 2,
  "propertyId": "JNP-DFW-04",
  "roomId": "ROOM-CANAL-KING",
  "rateId": "RATE-SAVER",
  "profileId": "PROFILE-ALEX"
}
```

Headers: `Idempotency-Key: <unique-client-generated-value>`.

Response `201`:

```json
{
  "bookingId": "a-synthetic-uuid",
  "confirmationCode": "DEMO-7F4K2Q",
  "status": "confirmed",
  "profileId": "PROFILE-ALEX",
  "profile": { "id": "PROFILE-ALEX", "displayName": "Alex Sample" },
  "guestContact": { "name": "Alex Sample", "email": "alex@example.test" },
  "property": { "id": "JNP-DFW-04", "name": "The Juniper Las Colinas Canal & Spa" },
  "stay": { "checkIn": "2026-11-20", "checkOut": "2026-11-22", "nights": 2, "adults": 2, "rooms": 2 },
  "selection": { "roomId": "ROOM-CANAL-KING", "roomName": "Deluxe Canal View King", "rateId": "RATE-SAVER", "rateName": "Saver Rate", "cancellationSummary": "This rate is non-refundable after booking.", "paymentSummary": "Mock payment only; no payment is collected." },
  "priceSnapshot": { "subtotal": { "amount": "1120.00", "currency": "USD" }, "taxesAndFees": { "amount": "192.00", "currency": "USD" }, "total": { "amount": "1312.00", "currency": "USD" }, "priceBasis": { "rooms": 2, "nights": 2 } },
  "createdAt": "2026-11-17T10:00:00.000Z",
  "demo": true
}
```

This operation creates a synthetic record only. The server loads the selected seeded profile and property/rate documents from MongoDB, derives the demo name, `.test` email, price, and terms, then writes a stable booking snapshot. The browser does not submit guest contact, payment, or destination fields; unknown fields are rejected. Raw search destination text stays in browser navigation state and is not persisted in the booking record or included in Checkout/Confirmation assistant context. Checkout displays seeded demo details and does not ask guests to enter real personal information. The endpoint does not call a payment or external booking system. Repeated requests with the same idempotency key and payload return the original booking; reusing a key with a different payload returns `409 BOOKING_CONFLICT`.

### 3.6 Retrieve mock confirmation

`GET /api/v1/bookings/{confirmationCode}`

Returns the synthetic confirmation summary or `404 BOOKING_NOT_FOUND`. In this standalone prototype, confirmation codes identify mock data only and provide no access to real customer records.

### 3.7 Demo profiles

- `GET /api/v1/demo-profiles` returns the small seeded profile list for the visible selector.
- `GET /api/v1/demo-profiles/{profileId}` returns one demo profile's display/contact details, preferences, and illustrative Juniper Rewards values.
- The client keeps only the selected `profileId` in booking state. These endpoints do not sign in a user or authorize access to a booking.
- If MongoDB is not configured or unavailable, return `503 DEMO_PROFILES_UNAVAILABLE`; return `404 DEMO_PROFILE_NOT_FOUND` for an unknown profile ID.

## 4. Error mapping

| HTTP | Code | Meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid date range, guest count, request shape, or unsupported field. |
| 404 | `NOT_FOUND` | Unknown synthetic property, room, or rate selection. |
| 404 | `BOOKING_NOT_FOUND` | Unknown synthetic confirmation code. |
| 404 | `DEMO_PROFILE_NOT_FOUND` | Unknown synthetic demo profile. |
| 409 | `BOOKING_CONFLICT` | Mock inventory or booking state changed before submission; return the guest to review the stay. |
| 502 | `AI_PROVIDER_UNAVAILABLE` | Gemini could not be reached or returned a provider error. |
| 502 | `AI_CONFIGURATION_ERROR` | Gemini rejected the request with HTTP 400, 401, 403, or 404; check key permissions, model access, and API restrictions in AI Studio. |
| 502 | `AI_EMPTY_RESPONSE` | Gemini returned no text. |
| 503 | `AI_NOT_CONFIGURED` | `GEMINI_API_KEY` is not configured on the server. |
| 503 | `AI_RATE_LIMITED` | Gemini quota or request limit was reached; retry later. |
| 504 | `AI_TIMEOUT` | Gemini did not respond within the configured request timeout. |
| 503 | `DEMO_PROFILES_UNAVAILABLE` | MongoDB is not configured or cannot serve synthetic profile data. |
| 503 | `BOOKING_UNAVAILABLE` | MongoDB cannot create or read a synthetic booking right now. |
| 503 | `SEARCH_UNAVAILABLE` | MongoDB cannot serve a synthetic destination search right now. |
| 503 | `RATES_UNAVAILABLE` | MongoDB cannot serve the selected property's synthetic rate options right now. |
| 500 | `INTERNAL_ERROR` | Unexpected backend error; return a request ID without internal details. |

## 5. Validation and behavior

- Validate payload shape and reject unsupported fields on the Node.js server before business logic.
- Cap current-page history, message length, and serialized page context; reject unknown page names and unsupported top-level request fields.
- Require `checkOut > checkIn`, positive room/adult counts, valid date range, and consistent property/rate IDs.
- Because search criteria are not persisted, rate-options and mock-booking requests must each include the relevant dates and guest counts; the server validates and uses those values with property/rate documents from MongoDB.
- Treat browser history and context as untrusted page data. Strip contact/profile fields, label context as data in the prompt, and never use it to authorize or execute actions.
- For profile-aware assistant answers, accept only the selected `profileId` as context and resolve its allowed facts (preferences and demo rewards) server-side. Ignore client-supplied profile balances, tiers, and eligibility claims.
- Include only profile preferences and illustrative rewards in assistant context; never include display name, email, or contact details. Return `DEMO_PROFILE_NOT_FOUND` for an unknown ID and `DEMO_PROFILES_UNAVAILABLE` if the server cannot read the seeded profile.
- Validate booking `profileId` against seeded demo profiles; derive checkout contact snapshots from the selected profile. Display only synthetic demo contact details, and use reserved `.test` email addresses in seed/examples. Do not prompt for real personal information.
- Do not provide Gemini function declarations in the MVP. Read/compare facts are assembled by ordinary backend code before the single model request. `POST /bookings` is called only from the normal checkout button.
- Normalize Gemini quota/timeouts into the documented errors; never fall back to a paid API.
- Honor the `retryable` flag in the browser: show Retry only for transient errors; for configuration and validation errors, show the returned guidance and do not repeat the same request immediately.
- Use low Gemini thinking effort for this short page-help flow. Log only the local request ID and upstream HTTP status for provider failures; never log the key, prompt, response body, or raw provider error.
- Do not include secrets or real PII in request/response examples, seed data, or logs.
