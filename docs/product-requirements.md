# Product Requirements: Page-Aware Hotel Booking Assistant

## Product summary

Build a small, standalone hotel booking website for a fictional hotel brand. A persistent conversational assistant appears throughout the booking journey and helps the guest understand choices on the page, compare options, and pick a stay.

The primary journey has four pages, followed by a confirmation success state:

**Home → Search Results → Rate List Menu (RLM) → Checkout → Confirmation state**

The site uses **Next.js App Router with React and TypeScript**, **Node.js Route Handlers** for backend APIs, and Google's **Gemini API free tier** for assistant responses. Keep the API key on the server. Use static synthetic hotel data. Do not access Marriott.com or Marriott production data or systems.

Use the existing Juniper/Stitch screens as the prototype's visual reference so the five pages feel consistent. Keep all brand, property, and guest content fictional and original; do not reproduce Marriott branding or use production assets.

## Product goals

- Make it easy to move through a hotel booking journey while keeping booking state separate from each page's fresh assistant conversation.
- Help guests understand what search criteria, property, room, rate, and checkout choices mean.
- Offer useful suggestions based on the current page and guest-stated preferences.
- Keep the assistant's actions understandable and guest-controlled.
- Build reusable frontend and backend components that could inform a later real-world implementation.

## Users and needs

- **Trip planner:** describe a trip and get help entering search criteria.
- **Property chooser:** narrow and compare search results.
- **Rate comparer:** understand room and rate differences, prices, and cancellation rules.
- **Checkout guest:** review the selected stay and understand the total and terms.

## Scope

### In scope

- Fictional hotel brand, properties, room types, rates, amenities, policies, and prices.
- Four booking pages: Home, Search Results, Rate List Menu, and Checkout.
- Confirmation represented as the post-checkout success state.
- A simple profile selector for choosing a clearly fictional demo guest; the active profile is visible so people can understand whose preferences and mock rewards inform suggestions.
- Seeded synthetic guest profiles with fictional preferences and Juniper Rewards values (for example, a demo tier, points balance, and upgrade-award count).
- Persistent assistant sidebar with page-specific starter questions and answers.
- A fresh assistant conversation for each page; no chat history carries across page navigation.
- Booking selections carried through the normal site flow where needed, independently from assistant chat history.
- Natural language questions, clarifying questions, search suggestions, comparisons, and recommendations.
- MongoDB collections seeded with static synthetic property, room, rate, amenity, and policy data; mock booking behavior.
- A complete booking interaction in the standalone site using test data only.

### Out of scope

- Marriott.com replication, branding, internal APIs, systems, data, or design standards.
- Production data, credentials, or service connections.
- Localization, telemetry/observability implementation, formal accessibility certification, or enterprise integration standards.
- Real customer accounts or authentication, Marriott loyalty programs or benefits, reservation management, or external inventory.
- Real customer/guest data. Profile and reward values are fabricated Juniper demo data only.
- A separate AI gateway or multi-agent platform layer.
- Paid model API usage or a paid-tier fallback.

## Page requirements

### 1. Home

- Show the fictional brand and a standard hotel search form: destination, dates, guests, and rooms.
- Assistant can explain search fields and help the guest decide what values to enter. The guest enters and submits values in the standard form.
- Guest confirms the search before results are requested.
- Assistant can offer a few example prompts, such as “Find a quiet hotel near the city center for two adults.”

### 2. Search Results

- Show synthetic property cards with location, key amenities, rating, and starting price.
- Assistant may offer generic search help. Property comparisons and profile-based recommendations from the Mongo-backed results are deferred to V3 backend grounding.
- Guest selects a property using the page's standard controls before continuing.

### 3. Rate List Menu (RLM)

- Show synthetic room and rate options for the selected property and dates.
- Include occupancy, room features, total/price breakdown, cancellation deadline, and payment terms when available in fixture data.
- Assistant may offer generic rate-page help. Rate comparison from the Mongo-backed options is deferred to V3 backend grounding.
- Make non-refundable or restrictive terms clear; do not invent missing terms.
- Guest selects a rate using the standard page control.

### 4. Checkout

- Summarize property, dates, guests, room, rate, taxes/fees, and total from the selected synthetic data.
- Assistant answers questions about displayed details, explains calculations from supplied amounts, and identifies missing form fields.
- Show the currently selected demo profile's seeded synthetic name and `.test` email as checkout contact details. Do not prompt guests to enter real personal information.
- Store the selected `profileId` and a snapshot of the profile's demo name/email on the mock booking. Do not collect payment details.
- No real card data or real payment processing. A clearly labeled mock booking operation creates the confirmation state.

### Confirmation state

- Display a synthetic confirmation number and a summary of the selected stay.
- Assistant explains the confirmation and simple next steps using fixture content.
- Clearly identify the confirmation as belonging to the fictional site.

## Assistant behavior and controls

- Keep the assistant available across pages, but start a fresh conversation when the page changes. Do not send previous-page chat messages or summaries.
- Pass a small, typed context for the current page only: page type and the search criteria or selected property/rate IDs currently needed on that page.
- Keep booking selections in the site's booking state so the guest can complete the flow; this is separate from chat history.
- Assistant is read-only. It may explain page facts when grounded by current synthetic data, but it cannot set search fields, apply filters, select properties or rates, or change page state. Mongo-backed grounding for Search and Rates is deferred to V3; before then, the assistant must not use stale local property/rate fixtures for those pages.
- Guests make all search and selection changes through the normal page controls.
- The assistant cannot invent price, availability, policy, or confirmation facts. If fixture data does not answer a question, say what is unavailable.
- The assistant cannot submit checkout or payment on the guest's behalf. Guest uses the normal checkout submit button.
- Clearly distinguish facts from recommendations and show the relevant price or condition for an upsell.
- Base profile-aware suggestions only on the selected synthetic profile and explicit mock reward rules. Identify these as Juniper demo benefits; never imply they are real Marriott benefits or guarantee an upgrade.

## Demo profile behavior

- Provide a simple profile selector in the shared site header or booking shell. Show the selected fictional guest name and a way to switch profiles.
- Store the selected `profileId` in site booking state across the booking routes. Switching profiles updates profile-based assistant suggestions and checkout contact details.
- Do not carry assistant conversation history across routes. The selected profile persists separately as site state.
- Profiles may include a fictional preference summary, Juniper demo tier, points balance, and upgrade-award count. Use only deterministic seeded data and clearly label rewards as illustrative.
- This is a demo profile picker, not authentication. It does not protect bookings or represent a customer sign-in system.

## Functional requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-01 | Provide a persistent sidebar assistant on each of the four pages and confirmation state. | P0 |
| FR-02 | Start a fresh assistant conversation on each page navigation; retain only the booking data required by the website flow. | P0 |
| FR-03 | Send typed, page-specific context to the Node.js backend; do not send the full browser state. | P0 |
| FR-04 | Answer questions using the synthetic MongoDB data and identify when an answer is unavailable. | P0 |
| FR-05 | Support search assistance, property comparison, rate comparison, checkout explanation, and confirmation questions. | P0 |
| FR-06 | Keep assistant read-only; never apply search, filter, property, room, or rate selections. | P0 |
| FR-07 | Keep booking submission in the normal checkout UI and simulate it with a mock backend operation. | P0 |
| FR-08 | Provide clear loading, empty, error, and retry states for assistant and mock service failures. | P0 |
| FR-09 | Allow the guest to clear or restart the current conversation. | P1 |
| FR-10 | Provide relevant page-specific suggested prompts. | P1 |
| FR-11 | Let the guest select and visibly identify a synthetic demo profile; keep the selected profile separate from assistant chat state. | P0 |
| FR-12 | Link mock bookings to the selected profile and store a checkout contact snapshot using synthetic name/email only. | P0 |
| FR-13 | Use the selected profile's fictional preferences and Juniper demo rewards for transparent, read-only suggestions. | P1 |

## Acceptance criteria

1. A guest can complete Home → Search Results → RLM → Checkout → Confirmation using synthetic records served by MongoDB APIs.
2. The assistant is present on every page and opens with a clean conversation after navigation; it uses only that page's relevant booking state.
3. Assistant responses never change search criteria, filters, property, room, or rate selections; the guest uses the normal controls.
4. Assistant answers use only facts available to its current page context; Search/Rates property and price comparisons are deferred until V3 grounding is implemented.
5. When a fact is missing, the assistant says so rather than filling the gap with a guess.
6. Checkout produces only a mock confirmation; no real payment or external booking service is called.
7. The app runs without any connection to Marriott systems or production data.
8. The selected demo profile is visible and remains selected across route changes while each route starts a fresh assistant conversation.
9. A mock booking stores its selected profile ID and submitted demo contact snapshot; it stores no payment data.
10. Profile-aware suggestions use only seeded Juniper demo data and are clearly labeled as illustrative.

## Open product decisions

- Final fictional brand name (Juniper Hotels is the current working name).
- Which destination, property, room, rate, facility, and fictional profile examples to seed in fixtures.
