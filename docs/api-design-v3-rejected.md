# API Design: V3 LangGraph Assistant

**Product:** dreRuss Hotels booking experience  
**Version:** V3  
**Status:** Draft for product review  
**Last updated:** 2026-11-18

## 1. Purpose and boundaries

This document defines the browser-to-AI and AI-to-booking API contracts for V3. Tool APIs are read-only in effect. A query may use HTTP `POST` to carry structured criteria, but it must not create or update search, booking, selection, or profile records. “Internal” means server-to-server authenticated by `AI_SERVICE_TOKEN`; Next.js Route Handlers are still network endpoints and must not be treated as private solely because they use an `/internal` path.

The separate Node.js LangGraph service is the public assistant endpoint. The booking backend exposes service-authenticated internal read APIs used only by the AI service. The AI service has no direct MongoDB access. Normal browser Search, Rates, and Booking endpoints remain unchanged unless a shared application-service improvement is required.

## 2. Conventions

- JSON request and response bodies; HTTPS between deployed services and local HTTP for development.
- Dates use `YYYY-MM-DD`; timestamps use UTC ISO 8601; currencies use ISO 4217.
- Monetary amounts are decimal strings; calculations use integer minor units or a decimal-safe type.
- IDs supplied by the AI service are untrusted and are revalidated by the booking backend.
- Internal endpoints require a server-to-server credential. Never send that credential to React or Gemini.
- In a production deployment, additionally restrict these routes at the network/API gateway layer and use the platform's service identity mechanism or mTLS; a shared demo bearer token is not a complete production identity system.
- All endpoints return a `requestId` for support and error correlation.
- `status` is a domain result, not an HTTP transport status. Transport errors use the shared error body in Section 9.

## 3. Common response shape

Successful tool responses use this envelope:

```json
{
  "status": "complete",
  "requestId": "req-demo-101",
  "demo": true,
  "dataAsOf": "2026-11-18T10:00:00Z",
  "data": {}
}
```

Tool `status` values:

- `complete`: requested facts were found and validated.
- `no_match`: the query ran successfully and found no matching records.
- `incomplete`: some candidates or requested facts could not be evaluated; do not call this no-match.
- `not_found`: a specific requested ID does not exist or is inactive.

`needs_clarification`, `out_of_scope`, and `service_error` are assistant-turn outcomes. Invalid tool requests use HTTP `400`; they are not converted to `no_match`.

## 4. Public assistant turn

`POST /api/v1/assistant/turn` on the AI orchestration service.

### Request

```json
{
  "pageSessionId": "session-demo-401",
  "page": "search-results",
  "history": [
    { "role": "user", "text": "Which ones allow pets?" },
    { "role": "assistant", "text": "I can check the properties in this search." }
  ],
  "message": "Which pet-accepting hotels have the lowest pet fee?",
  "pageContext": {
    "searchCriteria": {
      "destination": "New York",
      "checkIn": "2027-04-10",
      "checkOut": "2027-04-13",
      "adults": 2,
      "rooms": 1
    }
  }
}
```

Allowed `page` values for V3: `home`, `search-results`, `rate-list`, `checkout`. The browser must not send profile ID/details, guest contact/payment fields, full result arrays, rates, or authoritative prices. Context is validated against a per-page allowlist. `history` contains only the current page session and has configured message/count limits.

### Response

```json
{
  "requestId": "req-demo-201",
  "pageSessionId": "session-demo-401",
  "status": "complete",
  "answer": {
    "text": "I found one property that matches the requested criteria. Its verified facts are listed below."
  },
  "evidence": [
    {
      "entityType": "property",
      "entityId": "PROP-101",
      "label": "Harborlight Hotel",
      "facts": [
        {
          "attribute": "<catalog-key>",
          "value": true,
          "scope": "property",
          "status": "known"
        }
      ]
    }
  ],
  "matches": {
    "total": 1,
    "unknownMatchCount": 0,
    "currencyComparison": "not_applicable",
    "evaluatedAllMatches": true,
    "items": [
      {
        "entity": { "type": "property", "id": "PROP-101", "name": "Harborlight Hotel" },
        "facts": [
          {
            "attribute": "<catalog-key>",
            "value": true,
            "scope": "property",
            "status": "known"
          }
        ]
      }
    ],
    "complete": true,
    "nextCursor": null
  }
}
```

Important facts shown in the assistant UI come from `evidence` and `matches`, not parsed from `answer.text`. Both use a generic entity-plus-facts shape; the response does not add pet-, spa-, or amenity-specific object shapes. `matches.total` is the number of properties with confirmed matches. `unknownMatchCount` separately counts destination candidates whose requested filter or sort facts are missing or incomplete; do not describe them as matches or non-matches. Search status is `incomplete` when any such candidates remain or a requested monetary ranking spans multiple currencies. `currencyComparison` is `not_applicable`, `single-currency`, or `mixed-currency-grouped`; mixed-currency results are grouped by currency and then sorted by amount, and must not be described as one global cheapest ranking. `matches.evaluatedAllMatches: true` means the backend applied the criteria and requested sort to the complete destination candidate set; it does not mean every record is present in this response. `matches.complete: true` means every confirmed matching record is included in the returned items. When `matches.complete` is false, `nextCursor` is required and the UI offers a **Show more matches** control inside the assistant drawer. The partial page must not be described as all matches.

The control reads `matches.nextCursor` from the assistant response and sends its value as `continuationCursor` in another `POST /api/v1/assistant/turn` request with the same `pageSessionId`, `page: "search-results"`, and current `pageContext.searchCriteria`; it omits `message` and `history`. The request must contain exactly one of `message` or `continuationCursor`. The signed, opaque cursor is bound to the original criteria, filters, sort, and result position, and expires after 15 minutes. The service validates that the current page context still matches that binding, then passes the associated internal `page.nextCursor` to the fixed `searchProperties` capability to fetch only the next page. This continuation does not invoke Gemini; the response explanation is a short deterministic page label, and all displayed facts remain structured evidence. It is read-only and does not modify normal Search Results state. Each continuation fetch is a separate UI request with one backend retrieval. The two-retrieval-round cap still applies to each natural-language answer.

Other assistant-turn statuses:

- `needs_clarification`: include `answer.text` with one focused question and empty evidence.
- `no_match`: include validated search criteria, `matches.total: 0`, and an empty item list.
- `incomplete`: include the known evidence and identify missing attributes.
- `out_of_scope`: explain the page boundary; do not call a tool outside the page allowlist.
- `service_error`: provide a retryable/non-retryable error object; never imply no inventory.

## 5. Internal tool APIs

All internal requests include `Authorization: Bearer <AI_SERVICE_TOKEN>`. Internal routes validate endpoint-specific arguments and data criteria. The LangGraph service additionally verifies that property/rate/checkout identifiers match the current page context; the booking API cannot prove a guest's current browser selection without an authenticated guest/session binding, which is outside this synthetic demo.

**What “generic” means here:** Searchable facts use one common contract—catalog key + filter/sort request, followed by entity records with arrays of typed facts. The examples below use pet and spa attributes only to make the contract concrete. They are not separate endpoint designs. A new fact domain does not require a new endpoint or a hard-coded branch in LangGraph; it does require the backend to store that fact and register its key, type, scope, aliases, and permitted operations. The allowlist is deliberate: generic input must never mean arbitrary database fields or queries. Page-specific capabilities such as room-rate retrieval and checkout summary remain separate because they have different data scope and validation rules.

### 5.0 Attribute catalog metadata

`GET /internal/v1/assistant/attribute-catalog`

This service-authenticated metadata endpoint returns the backend-owned searchable attribute keys, scopes, types, user-language aliases, supported filter operators, and sort support. The LangGraph service reads it at startup and refreshes it on a bounded interval. It is reference metadata, not a guest-data retrieval capability, is not exposed to the browser, and does not count toward the two retrieval rounds. `sortModes` describes how the backend evaluates a sort; the caller sends only the attribute key and direction. Adding a supported attribute requires structured data and one catalog definition in the booking backend; the AI coordinator does not need a feature-specific branch or API endpoint.

Example response:

```json
{
  "status": "complete",
  "requestId": "req-demo-300",
  "demo": true,
  "dataAsOf": "2026-11-18T10:00:00Z",
  "data": {
    "attributes": [
      {
        "key": "room.accessible",
        "scope": "room",
        "valueType": "boolean",
        "label": "Accessible room offered",
        "aliases": ["accessible room", "accessibility features", "wheelchair accessible"],
        "filterOperators": ["equals"],
        "sortModes": []
      },
      {
        "key": "petPolicy.fee.amount",
        "scope": "property",
        "valueType": "number",
        "label": "Pet fee",
        "aliases": ["pet fee", "pet charge"],
        "filterOperators": ["equals", "less_than", "greater_than"],
        "sortModes": ["stored-numeric-amount"]
      },
      {
        "key": "service.spa.available",
        "scope": "service",
        "entityType": "spaTreatment",
        "valueType": "boolean",
        "label": "Spa service available",
        "aliases": ["spa", "spa service", "spa available"],
        "filterOperators": ["equals"],
        "sortModes": []
      },
      {
        "key": "service.spaTreatment.price.amount",
        "scope": "service",
        "entityType": "spaTreatment",
        "valueType": "number",
        "label": "Spa treatment price",
        "aliases": ["spa price", "massage price", "treatment cost"],
        "filterOperators": ["equals", "less_than", "greater_than"],
        "sortModes": ["stored-numeric-amount"]
      }
    ]
  }
}
```

### 5.1 `searchProperties`

`POST /internal/v1/assistant/properties/search`

This is the generic Search Results query capability. The caller supplies normal search criteria plus optional filters and a sort using attribute keys from the backend-owned catalog. The API does not have separate pet, pool, spa, or parking endpoints. It evaluates the whole current destination candidate set, returns confirmed matches with generic structured facts, and reports candidates it could not evaluate because requested facts are missing.

#### Generic request

```json
{
  "criteria": {
    "destination": "New York",
    "checkIn": "2027-04-10",
    "checkOut": "2027-04-13",
    "adults": 2,
    "rooms": 1
  },
  "filters": [
    { "attribute": "<catalog-key>", "operator": "equals", "value": true }
  ],
  "sort": {
    "attribute": "<sortable-catalog-key>",
    "direction": "ascending"
  },
  "pageSize": 20,
  "cursor": null
}
```

`filters` can be empty. Filter values and operators are validated against the attribute catalog. `sort` can be `null`; when provided, its attribute must be marked sortable in the catalog. The backend derives the comparison rule from that attribute definition—for example, a listed fee amount or a quote for the requested stay. The caller cannot send MongoDB paths, query operators, URLs, or code. `pageSize` is bounded by service configuration. The backend evaluates the complete destination candidate set before paging; continuation uses the returned cursor with identical criteria, filters, and sort.

Catalog entries based on a calculated eligible rate (starting nightly price or complete-stay total) are sort-only in this version. Do not send them as numeric filters: those amounts require rate eligibility and stay quoting rather than a stored property-level number. Stored numeric fields such as pet fees and service prices support the catalog's numeric comparison operators.

#### Generic response

```json
{
  "status": "complete",
  "requestId": "req-demo-301",
  "demo": true,
  "dataAsOf": "2026-11-18T10:00:00Z",
  "data": {
    "criteria": {
      "destination": "New York",
      "checkIn": "2027-04-10",
      "checkOut": "2027-04-13",
      "adults": 2,
      "rooms": 1
    },
    "appliedFilters": [],
    "sort": null,
    "totalMatches": 1,
    "evaluatedAllMatches": true,
    "unknownMatchCount": 0,
    "currencyComparison": "not_applicable",
    "matches": [
      {
        "entity": { "type": "property", "id": "PROP-101", "name": "Harborlight Hotel" },
        "facts": [
          {
            "attribute": "<catalog-key>",
            "value": true,
            "scope": "property",
            "status": "known"
          }
        ]
      }
    ],
    "page": { "pageSize": 20, "nextCursor": null, "complete": true }
  }
}
```

Each fact uses the same shape: `attribute`, typed `value`, `scope`, `status`, and optional `unit`, `basis`, `subject`, and `relatedEntities`. Fact statuses are `known`, `unknown`, or `not_applicable`; a complete scoped collection with no applicable service can report the catalog-defined absence (for example, spa availability `false` and treatment price `not_applicable`). Missing scope data remains `unknown`. Facts are not copied into domain-specific top-level properties such as `petPolicy` or `spa`. The UI can render known facts generically from this structure. A hotel stay price can include a structured breakdown in the fact value, while a fee or service price carries its currency and basis.

#### Example A: lowest listed pet fee

This is an example of the generic request with pet attributes; it does not imply a pet-specific endpoint.

```json
{
  "criteria": { "destination": "New York", "checkIn": "2027-04-10", "checkOut": "2027-04-13", "adults": 2, "rooms": 1 },
  "filters": [{ "attribute": "petPolicy.allowed", "operator": "equals", "value": true }],
  "sort": { "attribute": "petPolicy.fee.amount", "direction": "ascending" },
  "pageSize": 20,
  "cursor": null
}
```

Example match facts:

```json
{
  "entity": { "type": "property", "id": "PROP-101", "name": "Harborlight Hotel" },
  "facts": [
    { "attribute": "petPolicy.allowed", "value": true, "scope": "property", "status": "known" },
    { "attribute": "petPolicy.fee.amount", "value": "10.00", "unit": "USD", "basis": "per pet per night", "scope": "property", "status": "known" }
  ]
}
```

Compare the listed numeric amount as requested, preserve its basis, and call it the “lowest listed amount.” Do not normalize per-night and per-stay amounts into a stay cost.

#### Example B: hotels with a spa and the lowest listed spa treatment price

If the backend catalog and MongoDB data include these facts, the same request and response support them—no spa endpoint is added.

```json
{
  "criteria": { "destination": "New York", "checkIn": "2027-04-10", "checkOut": "2027-04-13", "adults": 2, "rooms": 1 },
  "filters": [{ "attribute": "service.spa.available", "operator": "equals", "value": true }],
  "sort": { "attribute": "service.spaTreatment.price.amount", "direction": "ascending" },
  "pageSize": 20,
  "cursor": null
}
```

Example match facts:

```json
{
  "entity": { "type": "property", "id": "PROP-205", "name": "Canal House" },
  "facts": [
    { "attribute": "service.spa.available", "value": true, "scope": "service", "subject": { "id": "SPA-60", "name": "60-minute massage" }, "status": "known" },
    { "attribute": "service.spaTreatment.price.amount", "value": "85.00", "unit": "USD", "basis": "per 60-minute massage", "scope": "service", "subject": { "id": "SPA-60", "name": "60-minute massage" }, "status": "known" }
  ]
}
```

The repeatable synthetic seed adds spa-service records to a deterministic subset of properties. The catalog defines the service scope, value type, aliases, and sort support; the same generic endpoint consumes those definitions. An unseeded or unknown service fact remains unknown and must not be invented.

#### Generic status and comparison rules

Missing or incomplete requested facts have `status: "unknown"`, never zero or false. `totalMatches` counts confirmed matches; `unknownMatchCount` reports candidates whose requested filter or sort could not be evaluated. If no confirmed match exists but unknown candidates remain, return `status: "incomplete"`, not `no_match`. A monetary sort spanning currencies groups by currency and then amount, returns `currencyComparison: "mixed-currency-grouped"` and `status: "incomplete"`; do not claim one global cheapest result. Otherwise return `single-currency` for a monetary comparison or `not_applicable` when no currency sort was requested.

For hotel rate-price attributes, the registry selects the calculation: starting nightly price or complete-stay total. The backend uses the shared booking quote calculator and current dates, occupancy, room count, requested room attributes, and mock availability. The returned fact identifies the matched room/rate and price basis. Unknown or inconsistent price data is not presented as a lowest price.

### 5.2 `getPropertyDetails`

`POST /internal/v1/assistant/properties/details`

Supports one property or a bounded batch to avoid one-request-per-property fan-out. On RLM, the backend accepts only the currently selected property ID. Search Results may request details for matched property IDs from the current search.

Request:

```json
{
  "page": "search-results",
  "propertyIds": ["PROP-101", "PROP-205"],
  "criteria": { "destination": "New York", "checkIn": "2027-04-10", "checkOut": "2027-04-13", "adults": 2, "rooms": 1 },
  "attributes": ["property.amenities", "petPolicy.allowed", "petPolicy.fee.amount", "policies.checkIn", "policies.checkOut", "policies.cancellation"]
}
```

Response:

```json
{
  "status": "complete",
  "requestId": "req-demo-302",
  "demo": true,
  "dataAsOf": "2026-11-18T10:00:00Z",
  "data": {
    "entities": [
      {
        "entity": { "type": "property", "id": "PROP-101", "name": "Harborlight Hotel" },
        "facts": [
          { "attribute": "property.amenities", "value": ["Pool", "Fitness center"], "scope": "property" },
          { "attribute": "petPolicy.allowed", "value": true, "scope": "property" },
          { "attribute": "petPolicy.fee.amount", "value": "10.00", "unit": "USD", "basis": "per pet per night", "scope": "property" },
          { "attribute": "policies.cancellation", "value": "General property policy; rate terms may differ.", "scope": "property" }
        ]
      },
      {
        "entity": { "type": "property", "id": "PROP-205", "name": "Canal House" },
        "facts": [
          { "attribute": "property.amenities", "value": ["Pool", "Wi-Fi"], "scope": "property" },
          { "attribute": "petPolicy.allowed", "value": true, "scope": "property" },
          { "attribute": "petPolicy.fee.amount", "value": "25.00", "unit": "USD", "basis": "one-time per stay", "scope": "property" },
          { "attribute": "policies.cancellation", "value": "General property policy; rate terms may differ.", "scope": "property" }
        ]
      }
    ],
    "missingEntityIds": []
  }
}
```

Return `status: "complete"` only when every requested property ID is represented in `entities`, `missingEntityIds` is empty, and every fact is `known` or `not_applicable`. If a requested fact is unknown or one or more records cannot be resolved, return `status: "incomplete"`; each unavailable fact must say `status: "unknown"`, and unresolved IDs must appear in `missingEntityIds`.

### 5.3 `getRoomRates`

`GET /internal/v1/assistant/properties/{propertyId}/rates?checkIn=2027-04-10&checkOut=2027-04-13&adults=2&rooms=1`

Reads the room/rate options for the one property currently open in RLM. It reuses the existing server-side rate repository and quote calculator.

Response:

```json
{
  "status": "complete",
  "requestId": "req-demo-303",
  "demo": true,
  "dataAsOf": "2026-11-18T10:00:00Z",
  "data": {
    "propertyId": "PROP-101",
    "criteria": { "checkIn": "2027-04-10", "checkOut": "2027-04-13", "adults": 2, "rooms": 1, "nights": 3 },
    "rooms": [
      {
        "roomId": "ROOM-1",
        "name": "Accessible King Room",
        "features": [{ "attribute": "room.accessible", "value": true, "scope": "room" }],
        "rates": [
          {
            "rateId": "RATE-1",
            "name": "Flexible Rate",
            "includes": ["Breakfast"],
            "nightlyRates": [
              { "date": "2027-04-10", "amount": "200.00", "currency": "USD" },
              { "date": "2027-04-11", "amount": "200.00", "currency": "USD" },
              { "date": "2027-04-12", "amount": "200.00", "currency": "USD" }
            ],
            "subtotal": { "amount": "600.00", "currency": "USD" },
            "taxesAndFees": { "amount": "82.50", "currency": "USD" },
            "total": { "amount": "682.50", "currency": "USD" },
            "priceBasis": "3-night stay, 1 room",
            "cancellation": "Free cancellation until the stated demo deadline.",
            "payment": "No payment is collected in this demo."
          }
        ]
      }
    ]
  }
}
```

### 5.4 `getCheckoutSummary`

`POST /internal/v1/assistant/checkout-summary`

Resolves the current selected IDs and browser-held stay criteria through the existing booking service. It does not accept or return profile, contact, payment, or arbitrary browser-supplied amount fields.

Request:

```json
{
  "propertyId": "PROP-101",
  "roomId": "ROOM-1",
  "rateId": "RATE-1",
  "criteria": { "checkIn": "2027-04-10", "checkOut": "2027-04-13", "adults": 2, "rooms": 1 }
}
```

Response:

```json
{
  "status": "complete",
  "requestId": "req-demo-304",
  "demo": true,
  "dataAsOf": "2026-11-18T10:00:00Z",
  "data": {
    "property": { "propertyId": "PROP-101", "name": "Harborlight Hotel" },
    "stay": { "checkIn": "2027-04-10", "checkOut": "2027-04-13", "nights": 3, "adults": 2, "rooms": 1 },
    "selection": {
      "roomId": "ROOM-1", "roomName": "Accessible King Room",
      "rateId": "RATE-1", "rateName": "Flexible Rate",
      "cancellation": "Free cancellation until the stated demo deadline.",
      "payment": "No payment is collected in this demo."
    },
    "price": {
      "subtotal": { "amount": "600.00", "currency": "USD" },
      "taxesAndFees": { "amount": "82.50", "currency": "USD" },
      "total": { "amount": "682.50", "currency": "USD" },
      "basis": "3-night stay, 1 room"
    }
  }
}
```

## 6. Attribute and price semantics

- Attribute identifiers are stable backend-owned keys such as `petPolicy.allowed`, `petPolicy.fee.amount`, and `room.accessible`.
- Gemini may map phrases like “pet-friendly,” “pets accepted,” and “can I bring a dog?” to the supported `petPolicy.allowed` identifier. Unsupported attributes do not generate arbitrary query fields.
- Backend applies predicates and sorting from its validated attribute registry; adding a supported schema field and aliases does not require coordinator-specific branches.
- Every returned fact has an explicit `scope` (`property`, `room`, `rate`, or `service`) and, for numeric values, its unit/basis.
- The backend scans destination candidates so absent requested attributes can be reported as unknown rather than silently treated as non-matches. `totalMatches` is the count of confirmed matches; `unknownMatchCount` and `status: "incomplete"` disclose candidates that could not be evaluated.
- Search prices are scoped to the active stay criteria and eligible room/rate data. A price returned for a different date range, occupancy, or room-feature filter must not be reused.
- Monetary sorting across currencies is not a global ranking: results are grouped by currency, each group is sorted by amount, and the response is marked incomplete.
- “Lowest pet fee” sorts the raw stored amount and shows its basis. It does not normalize to a stay cost or require a pet count.
- Hotel room pricing comparisons distinguish nightly starting price from total for the selected dates and room count. Ask a clarification when the requested basis is materially ambiguous.
- Unknown values remain `null`/unknown, not zero, false, or absent-by-default.

## 7. Shared error response

```json
{
  "error": {
    "code": "SERVICE_UNAVAILABLE",
    "message": "Property information is temporarily unavailable.",
    "retryable": true,
    "requestId": "req-demo-305"
  }
}
```

Expected transport status mapping:

| HTTP status | Meaning |
|---:|---|
| 400 | Invalid request or unsupported attribute. |
| 401/403 | Missing or invalid AI-service credential. |
| 404 | Requested property/rate ID is not found or inactive. |
| 429 | Configured service rate limit reached. |
| 502/503 | Booking backend or database dependency unavailable. |

The graph maps a `503` or timeout to `service_error`; it must never present it as `no_match`.

## 8. Open API design checks before implementation

- Confirm maximum property details batch size and maximum Search response size.
- Confirm endpoint service authentication and local `.env` variable names.
- Confirm catalog attribute registry representation and unknown-field response.
- Confirm the continuation behavior when compact Search matches exceed response limits while still evaluating the complete result set.
- Confirm API route ownership and deployment base URLs for the separate AI service and existing Next.js booking backend.
