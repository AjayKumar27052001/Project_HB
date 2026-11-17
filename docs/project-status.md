# Project Status Board

**Project:** Juniper Hotels booking assistant
**Updated:** 2026-11-17
**Phase:** Version 1 complete; Version 2 assistant drawer toggle in progress; Version 3 AI grounding planned

## Board summary

| Not Started | In Progress | Development Done | In Review | Testing | Done | Total |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 1 | 0 | 0 | 0 | 32 | 34 |

## Story board

Stories are grouped by status. Titles are kept short so the board is easy to scan; product and technical acceptance criteria remain in the linked project documents.

| Status | ID | Work item | Epic | Priority | Depends on | Next step / note |
|---|---|---|---|---:|---|---|
| **DONE** | E-01 | Design handoff and route map | Frontend | P0 | — | User reviewed and approved the [five-screen Stitch flow](https://stitch.google.com/projects/14591780159106990003?pli=1). |
| **DONE** | A-01 | Next.js app shell and routes | Foundation | P0 | — | Review and testing passed; all five routes resolve, invalid confirmation is 404, header anchors work across routes, and build/typecheck pass. |
| **DONE** | A-05 | Atomic Design component structure | Foundation | P0 | A-01 | Review/testing passed; documented atom, molecule, organism, template, and route-page responsibilities. |
| **DONE** | E-02 | Shared design tokens and UI primitives | Frontend | P0 | A-01, E-01 | Review/testing passed; 39 unique referenced tokens and Button/Badge/Field token wiring verified, with typecheck/build passing. |
| **DONE** | E-03 | Shared header, booking controls, concierge | Frontend | P0 | E-02 | Review/testing passed; mobile menu links work and close after selection, no header overlap at five widths, profile selector and assistant remain present. |
| **DONE** | E-04 | Five booking-flow screens | Frontend | P0 | E-03 | Review/testing passed; five routes render; search/price/cancellation/confirmation limitations are explicit; Checkout preserves selected dates and room count. |
| **DONE** | E-05 | Typed synthetic-data adapter | Frontend | P0 | A-01, E-01 | Review/testing passed; fixture imports are adapter-only, typed defaults/property lookups work, five routes return 200, and unknown property/rate lookups return 404. |
| **DONE** | A-03 | MongoDB repository connection | Foundation | P0 | A-01 | Review and testing passed; live Atlas reads and both profile API routes returned expected results. |
| **DONE** | A-04 | Synthetic seed data and indexes | Foundation | P0 | A-03 | Review and testing passed; repeat seed preserved three synthetic properties/profiles and expected indexes. |
| **DONE** | A-06 | Typed local demo profile fixtures | Foundation | P0 | A-01 | Review and testing passed; typecheck/build include explicit Mongo `_id` to UI `id` mapping. |
| **DONE** | A-07 | MongoDB demo-profile seed | Foundation | P0 | A-03, A-06 | Review and testing passed; repeat seed and profile list/detail API checks returned expected synthetic records. |
| **DONE** | A-02 | Shared layout and booking state | Foundation | P0 | A-01 | Profile state persists across route changes/refresh; route changes reset assistant conversation. |
| **DONE** | B-06 | Visible demo profile selector | Booking | P0 | A-02, A-06 | Header switching updates read-only Checkout contact; route, refresh, and chat reset checks passed. |
| **DONE** | B-01 | Home search form | Booking | P0 | A-01, A-02, A-04 | Review, typecheck, build, and browser checks passed: invalid destination/date/adult count rejected; valid criteria preserved in URL. |
| **DONE** | B-02 | Search results and property cards | Booking | P0 | B-01, A-03 | Review/testing passed; all five criteria survive Search → Rates → Results; fixed sample stay totals removed from result cards. |
| **DONE** | B-07 | Link mock booking to profile | Booking | P0 | A-07, B-04, B-05, B-06 | Selected synthetic profile ID and name/email snapshot are stored and shown in confirmation. |
| **DONE** | C-01 | Assistant sidebar states | Assistant | P0 | A-01, A-02 | Review/testing passed; idle, pending, error, retry, and stale-request handling verified. |
| **DONE** | C-02 | Fresh conversation on route change | Assistant | P0 | C-01 | Covered within C-01: browser navigation to Home shows its welcome and no prior confirmation transcript. |
| **DONE** | C-03 | Home and search assistance | Assistant | P0 | B-01, B-02, C-01 | Review/testing passed; field guidance and visible synthetic price/amenity comparisons verified without changing search state. |
| **DONE** | C-04 | Room and rate comparisons | Assistant | P0 | B-03, C-01 | Review/testing passed; room, rate, package, and cancellation answers matched cards; no rate selection changed. |
| **DONE** | C-05 | Checkout and confirmation help | Assistant | P0 | B-04, B-05, C-01 | Review/testing passed; checkout/confirmation facts match pages, contact data is excluded, and unsupported benefits are explicit. |
| **DONE** | C-06 | One server-side Gemini call per turn | Assistant | P0 | C-01, A-03 | Independent review/testing passed; direct Interactions call and browser assistant reply succeeded with the temporary free-tier model. Typecheck/build passed; model deprecation caveat documented. |
| **DONE** | C-07 | Assistant unsupported-answer fallback | Assistant | P0 | C-06 | Review/testing passed; browser asked about an unlisted 24-hour sauna and got an explicit cannot-confirm reply. Typecheck/build pass; UI shows Retry only for retryable errors and setup guidance otherwise. |
| **DONE** | C-08 | Profile-aware demo suggestions | Assistant | P1 | A-07, B-06, C-06 | Independent review/testing passed; browser confirmed profile-based suggestions without contradictory fallback, unsupported-fact fallback, and chat reset on profile switch. |
| **DONE** | D-01 | End-to-end booking-flow review | Quality | P0 | B-01–B-07 | Review/testing passed; all three results open Rates; selected labels, prices, policies, and synthetic profile persist through confirmation and reload; no external booking/payment calls. |
| **DONE** | D-02 | Data and assistant-boundary review | Quality | P0 | A-07, B-01–B-07, C-01–C-08 | Review/testing passed: fictional `.test` profiles; `.env.local` ignored; no destination/contact/payment in booking payload; assistant allowlists reject destination; only Gemini is external. Typecheck/build pass. |
| **DONE** | D-03 | README and developer handoff | Handoff | P1 | A-01–D-02 | Review/testing passed; setup order, `.env.local`, non-production seed command, routes, boundaries, and verification commands match implementation. Typecheck/build pass. |
| **DONE** | V2-01 | Mongo-backed destination search | Booking | P0 | A-03, A-04, B-01, B-02 | Review approved; independent test verified seed contents/typecheck/build; local runtime returned 50 unique New York results over 3 pages, Irving 3, alias 50, unknown 0, invalid requests 400, Home/Search 200, and Edit search restored all criteria. |
| **DONE** | V2-02 | Mongo-backed property rates | Booking | P0 | V2-01, B-03, B-04, B-05 | Independent review and testing passed. API/RLM/Checkout runtime verified; New York 3-night/1-room total `$682.50`, 2-room total `$1,365.00`, invalid criteria `400`, unknown property `404`, selected quote matches Checkout; typecheck/build pass. Booking uses same Mongo quote function; no booking POST was made to avoid leaving another persistent test record. |
| **IN PROGRESS** | V2-03 | Toggleable assistant drawer | Frontend | P1 | E-03, C-01, A-02 | Plan: assistant starts closed; an animated launcher sits immediately before the profile selector; click toggles a right-side drawer; close button, backdrop, Escape, and route navigation close it; chat is fresh per route and retained while merely opening/closing on the same route. Respect reduced-motion preference. |
| **DONE** | B-03 | Room and rate selection | Booking | P0 | B-02, A-04 | RLM loads options from Mongo API; selected property/room/rate and all stay criteria persist through Checkout; missing selection IDs fail closed. |
| **DONE** | B-04 | Checkout review | Booking | P0 | B-03 | Checkout shows API-backed property/rate and stay-specific totals; invalid counts fail closed; database failure has a recovery state. |
| **DONE** | B-05 | Mock confirmation | Booking | P0 | B-04, A-03 | Booking re-reads Mongo rate and uses the same quote calculator; confirmation snapshots the recalculated totals and actual price basis. |
| **NOT STARTED** | V3-01 | Backend AI grounding with Mongo data | Assistant | P1 | V2-01, V2-02, C-08 | AI work is deferred to V3. Keep Gemini requests in Node.js; browser sends question and relevant IDs/context; backend retrieves and bounds canonical property/rate/profile facts before calling Gemini. |

## Status definitions

| Status | Meaning | Move forward when |
|---|---|---|
| Not Started | Work has not begun. | Development starts → In Progress |
| In Progress | Implementation is underway. | Implementation and developer checks are complete → Development Done |
| Development Done | Ready for review. | Review begins → In Review |
| In Review | Review is underway. | Comments are resolved and approved → Testing |
| Testing | Acceptance checks are underway. | Required checks pass and evidence is recorded → Done |
| Done | Review and acceptance checks are complete. | Terminal status |

If review or testing finds an issue, move the story back to **In Progress** and add a short note. Update this board and the summary counts whenever a story changes status. If a feature spans multiple stories, update each affected story.

## Delivery order

1. **Review design:** E-01.
2. **Build frontend with synthetic fixtures:** A-01, A-05, E-02–E-05.
3. **Add Node.js Route Handlers and MongoDB seed:** A-03, A-04, and A-07. (A-06 supplies the local demo profile fixtures.)
4. **Connect booking and assistant flows:** B-01–B-07 and C-01–C-08.
5. **Review and hand off:** D-01–D-03.
6. **Version 2 data APIs and assistant shell:** complete V2-01 search and V2-02 rates, then V2-03 toggleable assistant drawer; keep property/rate data out of Search and RLM frontend fixtures.
7. **Version 3 AI grounding:** start V3-01 after V2-01 and V2-02 pass; resolve relevant canonical facts in Node.js before calling Gemini.

## Completed feature slice

**Slice:** Synthetic demo profile selection (A-02, A-06, B-06; checkout display only)

- Keep this slice to typed local fixtures, shared selected-profile state persisted in the browser, a visible header selector, and read-only synthetic contact details on Checkout.
- Do not add MongoDB, authentication, Gemini profile personalization, or booking persistence in this slice; those remain separate stories with their own review and test gates.
- Acceptance checks: selecting another profile updates the header and checkout details; the choice survives route navigation and refresh; chat remains page-scoped and resets on route changes; only `.test` emails and fictional values are used.
- Gate evidence: separate review approved the implementation and fixes; typecheck/build passed; browser checks verified profile selection across a route change and refresh, read-only checkout contact updates, fresh assistant chat on navigation, and no current console errors.

## Completed feature slice: MongoDB repository and synthetic seeds

**Slice:** Server-side MongoDB repository and initial synthetic seeds (A-03, A-04, A-07)

- Add a server-only MongoDB connection helper using `MONGODB_URI`, with a shared client for development reloads.
- Seed synthetic property documents and the three demo profiles idempotently; create the indexes in the database design.
- Keep the current local fixture behavior available until API reads are wired in a later slice. Do not add real user data, credentials, payment data, or production services.
- Acceptance checks passed: missing configuration returns a clear error; two seed runs succeeded; property and profile counts/fixture IDs stayed at three each; expected index metadata exists; list and detail API routes returned synthetic profile data; typecheck and production build passed.
- Gate evidence: separate review approved the implementation and fixture mapping; separate testing agent verified the repeated seed, read-only collection counts/indexes, and both API routes. No booking documents were inspected or changed.

## Completed feature slice: A-01

**Slice:** Next.js app shell and route foundation

- Review findings fixed: unknown confirmation codes now use not-found; Offers and Help link to working Home sections.
- Gate evidence: independent review approved both fixes; typecheck/build passed; isolated production server verified Home, Search, Rates, Checkout, and valid confirmation with HTTP 200, and invalid `DEMO-BOGUS` with HTTP 404. Checkout header links matched Home anchor IDs.

## Completed feature slice: A-05

**Slice:** Atomic Design component structure

- Added `src/components/README.md` describing atoms, molecules, organisms, templates, and route pages with concrete examples from this project.
- Gate evidence: independent review confirmed the classifications match the component responsibilities; typecheck/build and read-only file mapping checks passed.

## Completed feature slice: E-02

**Slice:** Shared design tokens and UI primitives

- Centralized shared colors, typography, spacing, radii, focus colors, heights, and shadows in `app/globals.css`; wired shared Button, Badge, and Field styles to tokens.
- Added the shared-token convention to `skills.md`, allowing one-off decorative values to remain local.
- Gate evidence: independent review passed; testing confirmed 39 unique, referenced CSS tokens, no undefined references, primitive token usage, and passing typecheck/build.

## Completed feature slice: E-03

**Slice:** Shared header, booking controls, and concierge (mobile navigation)

- Added native mobile navigation for Find a stay, Offers, and Help at widths up to 850px; each link closes the menu after activation, and the demo profile selector remains visible.
- Gate evidence: independent review passed; testing agent passed typecheck/build; browser checks at 320, 600, 601, 850, and 1024px confirmed no header overflow/overlap, correct navigation visibility, visible profile selector and assistant, and close-on-link behavior for Offers and Help.

## Completed feature slice: E-04

**Slice:** Five booking-flow screen layouts

- Search Results now identifies the fixed Irving sample catalog and says it is not filtered by the entered destination.
- Checkout preserves the selected dates and room count, labels the displayed amounts as fixed one-room/one-night samples, and uses a neutral cancellation-policy heading.
- Confirmation explicitly identifies itself as generic and unrelated to the prior page's choices.
- Gate evidence: independent review passed; typecheck/build passed; route checks returned HTTP 200 for all five routes and confirmed the revised content for non-Irving search, multi-night/two-room Saver checkout, and generic confirmation. Browser accessibility state confirmed the checkout dates, two-room selection, sample price disclaimer, and non-refundable terms.

## Completed feature slice: E-05

**Slice:** Typed synthetic-data adapter

- Added adapter functions for default search criteria and featured property; route pages and Home search form no longer import the fixture module directly.
- Gate evidence: independent review passed; testing agent passed typecheck/build and confirmed the single fixture import boundary; route checks returned 200 for the five intended pages and 404 for unknown property/rate lookups.

## Completed feature slice: B-01

**Slice:** Home search form validation

- Validate a non-empty destination, a check-out date after check-in, adults within 1–8, and rooms within 1–5 before navigating.
- Preserve valid criteria in the URL for Search Results; show clear inline feedback and keep all state changes in the normal form controls.
- Do not add real availability, filtering, rates, or assistant-driven form actions in this slice.
- Acceptance checks passed: whitespace destination, check-out-before-check-in, and adults=9 were rejected with inline messages and no navigation; valid trimmed destination, dates, adults, and rooms were retained in the Search Results URL; typecheck and production build passed.
- Gate order: plan (this section) → inspect/implement any agreed gaps → separate review agent → resolve findings → separate testing agent → record results → only then select the next feature slice.

## Completed feature slice plan: C-08

**Slice:** Profile-aware demo suggestions (C-08)

- Send only the selected synthetic `profileId` from the browser; the server resolves the corresponding seeded profile fields.
- Allow only synthetic preferences and illustrative reward tier/points/upgrade-award values into the assistant prompt. Ignore client-supplied profile details and balances.
- Clear the page chat when the selected profile changes to prevent mixing answers from two demo profiles.
- Ground suggestions in both the selected profile and current-page data; state that reward benefits and eligibility are illustrative and never promise a real earning, upgrade, or benefit.
- Preserve the one-call, no-tools, read-only, page-scoped design; do not change profile selection, booking, rates, or rewards.
- Acceptance checks: assistant suggestions reflect the selected demo profile; no private contact fields enter the model request; unsupported benefits use the safe fallback; assistant does not change profile or booking state; typecheck/build, browser, independent review, and independent testing pass.
- Gate evidence: plan → implement → independent review → resolve findings → independent testing → browser verification. All gates passed; C-08 is Done.

## Current feature slice plan: D-01

**Slice:** End-to-end booking-flow review (D-01)

- Review the five guest pages in order: Home → Search Results → Rate List → Checkout → Confirmation.
- Ensure every property shown in Search Results has a working Rates page backed by matching synthetic UI and Mongo room/rate records; ensure selected rate names stay identical through Checkout and Confirmation.
- Check that destination, dates, adults, and rooms remain consistent through navigation and reach the server for rate/booking requests without persisted search records.
- Check that the chosen property, room, rate, price, cancellation/payment summaries, and selected synthetic profile remain consistent through confirmation.
- Confirm booking creation stores only mock data and synthetic profile/contact snapshots; verify no real payment, Marriott, or third-party booking service is called.
- Acceptance: any issues are recorded with severity and fixed before testing; independent review signs off, then an independent tester completes a synthetic browser booking journey and checks confirmation persistence/reload; typecheck/build pass if code changes are needed.
- Gate order: plan → inspect and record review findings → resolve findings → independent review → independent testing → update board. D-02 stays Not Started until D-01 passes.

## Completed feature slice: D-01

- Review fixes: every displayed property has a room/rate page; local rate names, prices, payment terms, and cancellation terms align with Mongo seed data; Checkout displays both cancellation and payment terms before confirmation.
- Acceptance: all three search results opened their Rates pages; browser completed synthetic booking journeys and reloaded Confirmation; property, room, rate, stay, profile, sample price, and terms were consistent; independent review approved and the final testing agent passed typecheck/build and static end-to-end checks.

## Current feature slice plan: D-02

**Slice:** Synthetic-data and assistant-boundary review (D-02)

- Audit seed files and local fixtures for fictional values, reserved `.test` addresses, and absence of real customer/reservation/payment data. Keep user-entered Destination text browser-only; do not persist or send it to Gemini.
- Confirm the Mongo connection uses only the configured demo database; do not print or copy secrets or inspect sensitive account credentials.
- Review booking API allowlists and snapshots to ensure profile contact details are server-derived synthetic values and no payment details are accepted or stored.
- Review assistant request construction, recursive privacy filters, server-resolved profile allowlist, bounded history/context, `store:false`, no tools, and the read-only prompt boundary.
- Search for production Marriott endpoints, external booking/payment integrations, and client-exposed secrets; document any unavoidable non-production external API call (Gemini) and its synthetic-only payload.
- Acceptance: independent review finds no production integration or secret exposure; a separate tester verifies privacy/error boundaries and successful typecheck/build; resolve any findings before marking Done.
- Gate order: plan → review and record findings → resolve findings → independent review → independent testing → update board. D-03 stays Not Started until D-02 passes.

## Completed feature slice: D-02

- Removed arbitrary search destination text from booking requests and persisted snapshots and excluded it from Checkout/Confirmation assistant context. Server allowlists drop crafted `pageContext.destination`; the documented chat-text scrub remains heuristic, so only synthetic prompts are supported.
- Acceptance: independent review approved; independent testing verified only fictional profiles and `.test` emails, `.env.local` ignore rules without reading secret values, rejection of destination/contact/payment fields, the sole external Gemini call, no Marriott/payment integrations, and successful typecheck/build. No booking records or secret values were inspected.

## Current feature slice plan: D-03

**Slice:** Developer setup and handoff (D-03)

- Make README setup order actionable: install dependencies, configure ignored `.env.local` with server-only Gemini and demo Mongo settings, seed synthetic data, and start the local app.
- Correct outdated statements about profile APIs and describe what the seed populates versus what mock booking creates.
- Document the five routes, demo-only boundaries, architecture/API/database/status docs, and exact verification commands.
- Acceptance: a developer can follow the README in order; environment variables are not printed or committed; independent review approves accuracy and readability; independent testing verifies documented scripts/build.
- Gate order: plan → update README → independent review → resolve findings → independent testing → update board. All stories are then ready for handoff.

## Completed feature slice: D-03

- README now provides setup, environment, seed, run, route, architecture, and verification instructions. `package.json` loads `.env.local` for `npm run seed:db`; database-design docs clarify that reseeding is upsert-only and no reset command is provided.
- Acceptance: independent review approved the handoff and database docs; independent testing confirmed Node `--env-file` support, secret-ignore rules, seed command implementation, typecheck, and production build. The external Mongo seed command was not run during this documentation slice because it performs database writes.

## Completed Version 2 slice: V2-01

**Slice:** Mongo-backed destination search (V2-01)

- Expand the checked-in synthetic catalog to 83 properties across New York (50), Irving (3), Chicago (10), Los Angeles (10), and San Francisco (10), all synthetic.
- Implement `POST /api/v1/searches`: validate destination, dates, adults, rooms, page size, and cursor/page; query active `properties` in Mongo by normalized destination; return a compact paginated property projection and total count. Do not persist a search document or create a `searchId`.
- Make Search Results call the endpoint and render returned city, rates, amenities, rating, loading/error/empty states, and pagination. Remove hard-coded Irving copy and claims that results ignore the destination.
- Keep search criteria in the URL/browser and send those criteria with each request. Return only the fields needed for result cards, not entire embedded rate catalogs.
- Acceptance: seeded New York returns only New York demo properties; Irving still returns its catalog; an unknown city returns an empty response; malformed criteria are rejected; pagination has no duplicates; Edit search preserves criteria; properties without connected RLM rates do not link to a 404; no real hotel data is added; independent review and testing plus typecheck/build pass.
- Development notes: `POST /api/v1/searches` validates destination, dates, guests, page and page size; reads active properties from MongoDB; returns a compact Mongo projection and property-card response with stable sorting. Search Results calls it and supports show-more pagination, dynamic destination copy, retry/error/loading/empty states. The Edit search action preserves current criteria. The three original Irving properties retain their existing Rates links; new catalog cards state that rate options are being connected until V2-02. Typecheck and production build pass after review fixes.
- Testing evidence: independent testing confirmed the updated seed contains 83 properties and three demo profiles, and typecheck/build pass. Local API returned 50 New York results in 3 pages with 50 unique IDs, 50 for `New York, NY`, 3 for Irving, and 0 for an unknown city. Missing criteria, invalid calendar dates, and page size 51 returned HTTP 400. Home and Search returned HTTP 200; Home rendered destination, dates, adults, and rooms from Edit search criteria.
- Review: independent re-review approved after resolving five findings: no broken Rates link for newly added results; compact Mongo projection; retry the exact failed page; preserve criteria on Edit search; align docs and index with normalized city search.
- Gate order completed: plan → implement → developer checks → independent review → resolve findings → independent testing/runtime checks → board Done.

## Completed Version 2 slice: V2-02

**Slice:** Mongo-backed property rates (V2-02)

- Implement `GET /api/v1/properties/{propertyId}/rates` in a Node.js Route Handler. Validate property ID, stay dates, adults, and rooms; query the active property and its embedded room/rate plans in MongoDB; return a typed, bounded room/rate response. No `searchId` or local frontend rate fixture is used.
- Make the Rate List Menu fetch this API with the current search criteria, and render API-provided property/room/rate content with loading, error, empty, and unavailable states. Every search result should have a working Rates route once this slice is done.
- Use backend pricing shared with booking submission to calculate totals for the requested nights and rooms from synthetic nightly rates, fees, and tax percentages. Checkout and the stored mock confirmation must show the same selected rate and total. Availability remains static demo inventory and must be labeled as such.
- Acceptance: every seeded city/property can open Rates; the endpoint returns only the requested property; criteria affect quote nights/room totals; invalid criteria return `400`; unknown/inactive property returns `404`; no rates are sourced from browser fixtures; Checkout and booking snapshot are consistent; no real hotel data/provider is added; independent review, independent tests, typecheck, and production build pass.
- Development notes: `GET /api/v1/properties/{propertyId}/rates` and a server-only Mongo repository now return property summaries, rooms, embedded rates, per-night rows, and totals. RLM calls the API; Checkout reads the same repository; booking submission re-reads the selected rate and uses the shared BigInt minor-unit calculator. Legacy static room/rate fixtures and adapter lookups were removed. The assistant no longer receives stale static Search/Rates facts; backend grounding remains V3. Typecheck and production build pass. Local runtime: New York 3-night Flexible quote returned `$600.00` subtotal, `$82.50` tax, `$0.00` fees, `$682.50` total; invalid room count returned `400`, unknown property `404`, and Checkout rendered the Mongo-backed property and matching total.
- Gate order completed: plan → implement → developer checks → independent review → resolve findings → independent testing → update board.
- Review: first independent review returned two Checkout validation/error-state findings and two documentation inconsistencies (assistant V3 scope and missing search/rates 503 codes). Returned V2-02 and B-03–B-05 to In Progress for fixes and re-review.
- Review fixes: Checkout now requires all selection IDs, valid dates and integer guest/room counts within bounds, and a 1–30 night range before Mongo reads. Mongo read failures show a recovery page with a link back to Rates. System, product, database, and API docs now match V3 assistant-grounding scope and include search/rates `503` errors. Typecheck, production build, and whitespace checks pass; re-review underway.
- Re-review found remaining stale Search/Rates assistant request examples, architecture claims, and PRD requirements. Updated API to current Home-only sample context; marked Search/Rates comparison and recommendations as V3; updated acceptance criteria from frontend static fixtures to Mongo API records. Independent review approved; testing is now underway.
- Testing evidence: the independent testing agent passed typecheck/build and static inspected validation, paging, pricing, Checkout, and booking recalculation; its sandbox could not connect to localhost. Local API/page checks passed: New York 3-night quote has 3 nightly rows and `$682.50` total; 2-room quote totals `$1,365.00`; invalid room count returns `400`; unknown property returns `404`; RLM and valid Checkout return `200`; Checkout displays the same `$682.50`; missing IDs and invalid guest counts return `404`. No booking POST was run, so no new test booking was persisted.

## Planned Version 3 slice

V2-03 brings the assistant's existing functionality into an on-demand drawer in Version 2. V3-01 is limited to grounding its answers in canonical MongoDB data.

## Current feature slice plan: V2-03

**Slice:** Toggleable assistant drawer (V2-03)

- Start every route with the assistant closed. Place an animated “Ask Juniper” launcher immediately before the demo profile selector in the shared header.
- Open the assistant in a right-side drawer when the launcher is activated; the same launcher toggles it closed. Also support the drawer close button, backdrop, Escape key, and Help navigation.
- Keep the conversation while the drawer is opened and closed on the same route. Close the drawer and start a fresh conversation after route navigation, matching the page-scoped assistant behavior.
- Respect reduced-motion settings; provide accessible button names and expanded state; keep the drawer usable on narrow screens.
- Do not change Gemini request behavior, add AI grounding, or let the assistant change booking state.
- Acceptance: launcher is present next to profile on all five routes; it is closed initially; open/toggle/close actions work; backdrop and Escape close it; route navigation closes it and resets chat; reduced-motion disables floating animation; typecheck/build and independent review/testing pass.
- Gate order: plan → implement → developer checks → independent review → resolve findings → independent testing → update board. V3-01 remains Not Started until this slice passes.

- **V3-01:** Re-ground the existing assistant in canonical Mongo data on the backend. Browser sends the message and current property/rate/profile IDs; Node resolves the records and sends Gemini only a compact relevant subset. Keep the model key server-side, no assistant booking actions or client-side data tools, and no 200+ rate dump per turn.

**C-06 and C-07 passed review and testing.** Gemini 3.5 Flash-Lite (temporary deprecated free-tier choice) answered through the Interactions API. Browser verified date guidance and a clear unsupported-fact fallback; typecheck/build, independent review, and independent testing passed.

## Project boundaries

- Stack: Next.js App Router, React, TypeScript, Node.js Route Handlers, MongoDB, and Gemini API free tier.
- Use fictional test data only. No Marriott systems, production data, real reservation provider, or payment processing.
- Profile selection, contact details, preferences, and Juniper Rewards values are synthetic fixtures only; the selector is not authentication.
- The assistant explains and compares current-page information. It cannot change search fields, filters, selections, or bookings.
- Each route starts a fresh assistant conversation. Booking selections persist separately as needed.
- Follow [skills.md](../skills.md) for readable-code conventions and status update rules.

## Change log

| Date | Update |
|---|---|
| 2026-11-16 | Agreed stack and boundaries: Next.js App Router, React/TypeScript, Node.js Route Handlers, MongoDB, Gemini free tier, synthetic data, read-only assistant. |
| 2026-11-16 | Added and refined the Checkout screen in Stitch; design handoff E-01 is in review. |
| 2026-11-16 | Added `skills.md` with code readability and status-tracking rules. |
| 2026-11-16 | Chose a conventional single Next.js workspace over Nx for the initial build. |
| 2026-11-16 | Started frontend stories A-01, A-05, E-02, E-03, E-04, and E-05. |
| 2026-11-16 | Scaffolded five frontend routes, reusable components, synthetic fixtures, and a mock confirmation flow. |
| 2026-11-16 | Added visible fictional profile selection, profile-aware demo suggestions, and mock booking contact/profile persistence to the planned scope. |
| 2026-11-16 | Agreed to use the existing Juniper/Stitch screens as the visual reference with original fictional brand and hotel content; defer brand decisions until functionality is complete. |
| 2026-11-16 | Started the demo-profile slice (A-02, A-06, B-06) with plan-first, review-agent, then testing-agent gates. |
| 2026-11-16 | Implemented the local demo-profile slice: three synthetic profiles, persisted selector, and Checkout contact display; queued for separate review then testing. |
| 2026-11-16 | Review agent approved the profile slice after fixes to board grouping and local-storage failure handling; moved A-02, A-06, and B-06 to Testing. |
| 2026-11-16 | Browser test confirmed profile selection and checkout details but found duplicate route keys in the shared frame; returned A-02, A-06, and B-06 to In Progress for correction and repeat gates. |
| 2026-11-16 | Review agent approved the duplicate-key fix and confirmed the pathname key still remounts the assistant; returned the profile stories to Testing. |
| 2026-11-16 | Browser retest found selection could be lost if navigation occurred before the persistence effect ran; changed the selector to save immediately and returned profile stories to In Progress. |
| 2026-11-16 | Review agent approved immediate profile persistence; moved A-02, A-06, and B-06 to Testing again. |
| 2026-11-16 | A-02, A-06, and B-06 passed independent review, typecheck/build, route and refresh persistence, checkout contact, chat reset, and fresh-tab console checks; marked Done. MongoDB profile persistence is separated into A-07. |
| 2026-11-16 | Planned and started the next gated slice: MongoDB repository, property fixtures/indexes, and `demoProfiles` seed (A-03, A-04, A-07). |
| 2026-11-16 | Completed A-03, A-04, and A-07 implementation; checked seed script syntax and JSON validity. Moving to independent review before typecheck/build and database checks. |
| 2026-11-16 | Moved A-03, A-04, and A-07 through Development Done to In Review; testing remains gated on review findings. |
| 2026-11-16 | Review found A-07's dynamic route folder had literal apostrophes, preventing route registration; fixed the path and returned A-07 to In Progress. A-03 and A-04 review passed. |
| 2026-11-16 | Fixed A-07's route path and removed the empty quoted directory; review agent confirmed route discovery. Returned A-07 to Development Done before re-review. |
| 2026-11-16 | A-07 re-review passed; A-03, A-04, and A-07 moved to Testing. Live database checks still require a non-production MongoDB instance. |
| 2026-11-16 | Testing found the `@/data/seed` JSON import resolved under `src/` while fixtures were at repo root; moved fixtures to `src/data/seed` and returned A-03, A-04, A-06, and A-07 to In Progress. |
| 2026-11-16 | Review confirmed the UI import, seed script, and docs now share `src/data/seed`; returned A-03, A-04, A-06, and A-07 to Development Done. |
| 2026-11-16 | Re-review approved the corrected shared fixture paths; returned A-03, A-04, A-06, and A-07 to Testing. |
| 2026-11-16 | Testing found the Mongo profile fixtures use database `_id` while the UI expects `id`; mapped the seed documents at the adapter and returned A-03, A-04, A-06, and A-07 to In Progress before another review/testing cycle. |
| 2026-11-16 | Independent review approved the fixture adapter; moved A-03, A-04, A-06, and A-07 through Development Done and In Review to Testing. |
| 2026-11-16 | Corrected the summary counts to match the four Mongo slice stories now in Testing. |
| 2026-11-16 | Testing passed typecheck, production build, seed syntax, fixture JSON parsing, and the missing-URI guard; runtime API and idempotent Mongo writes remain unverified without a configured non-production MongoDB instance. |
| 2026-11-17 | Testing confirmed both demo-profile API routes return the expected structured 503 response when MongoDB is not configured; live reads and repeat-seed checks remain pending a non-production database. |
| 2026-11-17 | MongoDB integration testing passed against the supplied demo database: two seed runs, fixture counts/IDs, index metadata, and both profile API routes were verified; marked A-03, A-04, A-06, and A-07 Done. |
| 2026-11-17 | Planned A-01 as the next gated slice: review the existing shared app shell and five route entry points, then validate routes and not-found behavior before starting booking interactions. |
| 2026-11-17 | A-01 scaffold implementation is complete for review; moved it through Development Done to In Review before starting route checks. |
| 2026-11-17 | A-01 review found confirmation accepted unknown `DEMO-` codes and header Offers/Help links had missing targets; returned A-01 to In Progress for correction. |
| 2026-11-17 | Fixed A-01 findings: confirmation validates the shared demo code, and Offers/Help navigate to Home anchors; returned the slice to In Review. |
| 2026-11-17 | A-01 re-review approved both fixes; moved the story to Testing. |
| 2026-11-17 | A-01 passed independent review, typecheck/build, five route checks, valid/invalid confirmation checks, and cross-route header anchor checks; marked Done and planned A-05 next. |
| 2026-11-17 | Documented A-05 component levels, current examples, and responsibility boundaries in `src/components/README.md`; moved the story through Development Done to In Review. |
| 2026-11-17 | A-05 review approved the Atomic Design map; moved the story to Testing. |
| 2026-11-17 | A-05 passed independent review, typecheck/build, and component-to-file checks; marked Done and planned E-02 next. |
| 2026-11-17 | Centralized shared CSS design tokens, applied them to Button/Badge/Field primitives, and added the token rule to `skills.md`; moved E-02 to In Review. |
| 2026-11-17 | E-02 review found unused tokens and remaining repeated control/surface values; returned the story to In Progress for cleanup. |
| 2026-11-17 | Cleaned E-02 tokens and clarified the shared-token rule in `skills.md`; returned the slice to In Review. |
| 2026-11-17 | E-02 re-review approved the token cleanup and primitive styles; moved the story to Testing. |
| 2026-11-17 | E-02 testing passed typecheck/build and confirmed all 39 tokens are unique, referenced, and defined; marked Done and planned E-03 next. |
| 2026-11-17 | Planned and implemented the E-03 mobile header menu; moved the story through Development Done to In Review. |
| 2026-11-17 | E-03 review found header crowding near 600px and a menu that stayed open after navigation; returned the story to In Progress. |
| 2026-11-17 | Moved compact navigation to the 850px breakpoint and added close-on-link behavior; returned E-03 for re-review. |
| 2026-11-17 | E-03 re-review approved the mobile breakpoint, profile fit, and close-on-link behavior; moved the story to Testing. |
| 2026-11-17 | E-03 passed independent review, typecheck/build, and browser checks at five viewport widths including menu navigation/close behavior; marked Done and planned E-04 next. |
| 2026-11-17 | E-04's existing five-page screen implementation is ready for independent review; moved it through Development Done to In Review. |
| 2026-11-17 | E-04 review found destination, stay totals, cancellation label, and confirmation content could misrepresent the selected flow; returned the story to In Progress for transparent sample copy and criteria display. |
| 2026-11-17 | Updated E-04 disclosure and summary content to distinguish the Irving-only catalog, fixed sample pricing, cancellation policy, and generic confirmation; moved the story to In Review. |
| 2026-11-17 | E-04 re-review approved the disclosures and selection summary; moved the story to Testing. |
| 2026-11-17 | E-04 passed independent review, typecheck/build, five route responses, and rendered checkout/search/confirmation disclosure checks; marked Done and planned E-05 next. |
| 2026-11-17 | Started E-05: route components will use typed adapter functions for default search criteria and featured property instead of importing fixture data directly. |
| 2026-11-17 | Routed page defaults and featured property through typed booking adapter functions; direct fixture imports are now confined to the adapter; moved E-05 to In Review. |
| 2026-11-17 | E-05 review approved the adapter boundary, typed contracts, and missing-record behavior; moved the story to Testing. |
| 2026-11-17 | E-05 passed independent review, typecheck/build, fixture-import scan, five successful route checks, and unknown property/rate 404 checks; marked Done. User-approved the existing Stitch flow and marked E-01 Done. Started B-01 with explicit destination/date/guest-count validation. |
| 2026-11-17 | Implemented B-01 form validation and inline feedback; moved the story to In Review. |
| 2026-11-17 | B-01 independent review approved; moved the story to Testing. |
| 2026-11-17 | B-01 testing completed with native accessible controls: whitespace destination, invalid date order, and adults=9 were rejected without navigation; a valid trimmed destination, two-night date range, two adults, and two rooms were preserved in the results URL. Independent review, typecheck, and production build passed; marked B-01 Done and started B-02. |
| 2026-11-17 | B-02 implementation added pluralized result summaries, an explicit empty state, and full search-criteria propagation through property-to-Rates and Rates-to-Results links; moved to In Review before tests. |
| 2026-11-17 | B-02 review found an undefined empty-state surface token and a fixed estimated stay total that could misrepresent multi-night or multi-room prices; returned to In Progress to fix both before re-review. |
| 2026-11-17 | Fixed B-02 review findings by using the defined muted surface token and removing the fixed estimated total; returned the slice to In Review. |
| 2026-11-17 | B-02 re-review approved the fixes and confirmed all five criteria propagate through Rates and back; moved the story to Testing. |
| 2026-11-17 | B-02 testing passed typecheck/build and browser checks for search-to-Rates-to-results criteria propagation. Review of the Rates display found the requested destination was omitted and room/adult labels stayed singular; returned B-02 to In Progress. The empty-state branch is present but cannot be reached with the current non-empty static fixtures. |
| 2026-11-17 | Added requested destination to the Rates summary, distinct from the property's actual Irving location, and pluralized room/adult counts; returned B-02 to In Review. |
| 2026-11-17 | B-02 re-review approved the destination context and count labels; moved back to Testing for repeat verification. |
| 2026-11-17 | B-02 passed final independent testing and browser checks: all five criteria appeared on Results and Rates, property links carried them, and Back to stays restored them. Typecheck/build passed; the empty-state branch exists but is not reachable with the current static fixture catalog. Marked Done and planned B-03. |
| 2026-11-17 | Started B-03 by adding requested-destination propagation from rate selection to Checkout, a separate destination label on Checkout, and full criteria preservation on Back to rates. |
| 2026-11-17 | B-03 implementation moved to In Review before tests, following the requested development → review → testing order. |
| 2026-11-17 | B-03 review found the tax-display checkbox was inactive and rate totals omitted the one-room basis; returned to In Progress to fix before re-review. |
| 2026-11-17 | Removed the inactive tax checkbox, stated taxes are included, and added the one-room/one-night sample basis to rate totals; returned to In Review. |
| 2026-11-17 | B-03 re-review approved the totals disclosure and one-room basis; moved to Testing. |
| 2026-11-17 | B-03 passed re-review, independent typecheck/build, and browser checks for selected Saver rate, displayed terms, criteria, and return link; marked Done and moved to B-04. |
| 2026-11-17 | B-04 passed independent review, typecheck/build, and browser verification of selected Saver details, read-only profile field, synthetic contact fixture, no-payment disclosure, and Rates return link; marked Done and planned B-05. |
| 2026-11-17 | B-05 implementation added POST/GET booking routes, server validation, idempotent Mongo snapshots, Checkout submission states, and a data-backed confirmation page; moved to In Review before tests. |
| 2026-11-17 | B-05 review found permissive extra-field handling, local-fixture price/term resolution, error-code drift, and an unhandled confirmation database outage; returned to In Progress to fix and align docs. |
| 2026-11-17 | B-05 follow-up review found missing distinction for unknown confirmation codes and float money calculations; updated error mappings and changed rate tax fixtures to decimal strings with integer-cent calculations. |
| 2026-11-17 | B-05 re-review approved strict request validation, Mongo-backed selection snapshots, matching API errors, integer-cent prices, and confirmation outage handling; moved to Testing. |
| 2026-11-17 | B-05 testing found TypeScript target ES2017 rejects bigint literals; raised the target to ES2020 and returned to In Progress for re-review. Live API checks were not reached because no local server was listening. |
| 2026-11-17 | B-05 ES2020 target re-review passed; moved back to Testing for full typecheck/build and API verification. |
| 2026-11-17 | B-05 retest passed typecheck but Next production build still rejected bigint literal syntax; replaced literals with BigInt constructor calls and returned to In Progress. |
| 2026-11-17 | Re-review confirmed all BigInt literal syntax is removed while exact minor-unit calculations remain; moved B-05 back to Testing. |
| 2026-11-17 | B-05 passed independent review, typecheck/build, and API integration checks: create returned 201, repeated idempotency key returned 200 with same booking ID, unsupported card data returned 400, invalid profile/rate returned 404, and confirmation GET returned 200/404 as expected. Browser rendered the persisted Saver selection, profile, policy, and price. One synthetic acceptance-test booking remains in `hotelBooking`. Marked B-05 and B-07 Done; planned C-01. |
| 2026-11-17 | C-01 added pending, recoverable error/retry, disabled-while-pending, and route-reset state handling to the assistant; developer typecheck/build passed and the slice moved to In Review. |
| 2026-11-17 | C-01 review found the deterministic reply could not reject, leaving error/retry unreachable; returned to In Progress and added an injectable reply-provider seam. |
| 2026-11-17 | C-01 re-review found the mounted mock still always succeeded; added a one-time “simulate error” demo path so guests can exercise recovery and retry before the Gemini integration. |
| 2026-11-17 | Independent re-review approved C-01's mounted failure/retry path and route-reset behavior; moved the story to Testing. |
| 2026-11-17 | C-01 typecheck/build passed; browser verified the visible first-failure alert, successful Retry, and route navigation to a clean page-specific welcome. Marked C-01 and overlapping C-02 Done. |
| 2026-11-17 | Planned C-03 to ground Home and Search Results answers in visible synthetic page content; no code changes started. |
| 2026-11-17 | Implemented C-03 page-specific Home and Search Results answers grounded in form rules and the shared property fixtures; typecheck and production build passed, moved to In Review. |
| 2026-11-17 | Independent review approved C-03 factual grounding and read-only behavior; moved the story to Testing. |
| 2026-11-17 | C-03 typecheck/build passed; browser verified Home date guidance, price ordering, pool listings, and refusal to compare different location reference points. Search URL and controls stayed unchanged. Marked Done; planned C-04. |
| 2026-11-17 | Implemented C-04 responses from the room/rate fixture for the current property; typecheck and production build passed, moved to In Review. |
| 2026-11-17 | Independent review approved C-04 route/property grounding and read-only rate explanations; moved to Testing. |
| 2026-11-17 | Browser review found duplicated punctuation in the rate-comparison reply; cleaned up the copy and returned C-04 to In Progress for repeat review/testing. |
| 2026-11-17 | Final C-04 re-review approved the corrected separators and confirmed facts/read-only behavior; moved back to Testing. |
| 2026-11-17 | C-04 final typecheck/build and browser checks passed; comparison totals, package inclusions, and cancellation terms matched visible cards, and all rate selection links remained unchanged. Marked Done; planned C-05. |
| 2026-11-17 | Implemented C-05 page-local checkout/confirmation context and read-only explanations for stay, totals, cancellation, mock boundary, and unsupported account benefits; typecheck/build passed, moved to In Review. |
| 2026-11-17 | C-05 review found guest-name/contact questions were misrouted to stay details because contact fields are excluded from assistant context; added explicit limitation copy and returned to In Progress. |
| 2026-11-17 | C-05 re-review found contact guidance referenced a Checkout-only section on Confirmation; made that limitation page-specific and returned to In Progress. |
| 2026-11-17 | C-05 re-review approved page-specific contact limitations and confirmed no contact/profile fields or booking actions enter assistant context; moved to Testing. |
| 2026-11-17 | C-05 typecheck/build and browser checks passed for checkout totals/contact limits and confirmation total/contact/reward limits. No booking state changed. Marked Done; planned C-06. |
| 2026-11-17 | Implemented C-06 Gemini Interactions route, server-only key handling, bounded current-page turns, `store: false`, no tools, stable provider errors, `.env.example`, and aligned API/architecture setup docs; typecheck/build passed, moved to Development Done. |
| 2026-11-17 | C-06 review identified unredacted free-text personal details and request-size work before JSON parsing; added text redaction, page-specific context allowlists, and a 32 KB streaming body cap, returning to In Progress. |
| 2026-11-17 | C-06 re-review approved privacy/context filtering, 32 KB request cap, page-session reset, one Gemini call, `store: false`, no tools, and retryable errors; moved to Testing. |
| 2026-11-17 | C-06 independent testing passed typecheck/build and static request/privacy checks; browser confirmed missing-key guidance and retry. Kept in Testing pending one live provider response after local key configuration. |
| 2026-11-17 | C-06 key is present locally, but the app’s live request and a direct synthetic Gemini request timed out without an HTTP response; kept in Testing and did not start C-07. |
| 2026-11-17 | User screenshot confirmed the app surfaces `AI_PROVIDER_UNAVAILABLE`; returned C-06 to In Progress to add safe status-specific provider guidance and repeat live verification. |
| 2026-11-17 | Added Gemini low thinking effort and safe configuration-error guidance/logging; typecheck and production build passed, moved C-06 to In Review. |
| 2026-11-17 | Review found the provider status log ID differed from the response ID; reusing one request ID and returning C-06 to In Progress. |
| 2026-11-17 | Reused the request ID in provider-status logs and error responses; typecheck/build passed, moved C-06 back to In Review. |
| 2026-11-17 | Re-review found quota/generic upstream error responses still used a different ID; now passing the handler request ID for all upstream HTTP errors and returning C-06 to In Progress. |
| 2026-11-17 | All upstream HTTP errors now reuse the handler request ID; typecheck/build passed, moved C-06 back to In Review. |
| 2026-11-17 | Final C-06 re-review approved status-specific handling and request-ID correlation; moved back to Testing for independent verification. |
| 2026-11-17 | Independent testing passed build/typecheck and confirmed browser `AI_TIMEOUT`; found some non-provider error paths generated a second ID. Reusing the handler ID on every error path and returning C-06 to In Progress; live provider response still pending. |
| 2026-11-17 | All route error responses now reuse the handler request ID; typecheck/build passed, moved C-06 to In Review. Live request continues to time out. |
| 2026-11-17 | Final C-06 review approved request-ID consistency across all error branches; moved to Testing for independent re-verification. Live Gemini response remains unverified. |
| 2026-11-17 | Direct provider checks found Gemini 3.8 Flash returned HTTP 503/high demand, 2.5 Flash-Lite returned 404/not available to new users, and Gemini 3.5 Flash-Lite returned HTTP 200 for GenerateContent and Interactions. Returning C-06 to In Progress to configure the verified free model. |
| 2026-11-17 | Switched the server model and docs to `gemini-3.5-flash-lite`; typecheck/build passed, moved C-06 to In Review. Direct Interactions request returned HTTP 200 with synthetic text. |
| 2026-11-17 | Review found `gemini-3.5-flash-lite` was deprecated with no shutdown date announced; returned C-06 to In Progress to validate an active free-tier model before finalizing. |
| 2026-11-17 | Gemini 3.6 Flash also returned HTTP 503/high demand. Documented `gemini-3.5-flash-lite` as a temporary demo bridge because it is free-tier and returned HTTP 200, while noting its deprecation and future replacement requirement. |
| 2026-11-17 | Browser verified the app assistant answered the synthetic date question using Gemini 3.5 Flash-Lite. Final typecheck/build passed; moved C-06 to In Review. |
| 2026-11-17 | Final C-06 review approved the temporary free-tier model note and consistent one-call setup; moved to Testing for independent re-verification. |
| 2026-11-17 | C-06 passed independent review/testing after live Interactions and browser checks with the temporary free model; marked Done and started C-07 planning/implementation. |
| 2026-11-17 | C-07 passed review/testing: browser verified unsupported amenity fallback, independent checks passed, and retryable behavior matches the API contract; marked Done and started C-08 planning. |
| 2026-11-17 | Implemented C-07 explicit current-page missing-fact fallback, retryable-aware error controls, and non-retryable missing-key guidance; typecheck/build passed, moved to In Review. |
| 2026-11-17 | Review found README described missing-key guidance as retryable; corrected wording and returned C-07 to In Progress. |
| 2026-11-17 | README now matches non-retryable missing-key behavior; C-07 returned to In Review. |
| 2026-11-17 | C-07 re-review approved README and retryable behavior consistency; moved to Testing. |
| 2026-11-17 | Implemented C-08 server-resolved profile context, profile-change chat reset, illustrative rewards guardrail, and aligned API/system/architecture docs; typecheck/build passed, moved to In Review. |
| 2026-11-17 | C-08 independent review approved server-resolved allowlisted profile context and profile-switch chat reset; moved to Testing. |
| 2026-11-17 | C-08 independent typecheck/build and privacy checks passed; browser verified profile-switch chat reset but found the model appended a contradictory missing-fact fallback after a valid Alex profile answer. Returned to In Progress to fix prompt grounding. |
| 2026-11-17 | Fixed C-08 grounding instructions so selected profile facts and current-page facts are both authorized sources; clarified fallback behavior in system and architecture docs. Implementation ready for review. |
| 2026-11-17 | C-08 passed independent review, independent typecheck/build/privacy checks, and browser checks for profile grounding, unsupported-fact fallback, and profile-switch chat reset; marked Done and started D-01 planning. |
| 2026-11-17 | D-01 independent review found that two visible result cards led to missing Rates pages and executive-suite rate labels differed from Mongo booking snapshots; implementation returned to the development fix step. |
| 2026-11-17 | Added synthetic Rates fixtures for the Mandalay Lake and Irving Reserve properties, aligned executive-suite rate labels and payment wording with seeded Mongo records, and completed D-01 development fixes. |
| 2026-11-17 | D-01 re-review confirmed the missing Rates pages and rate-name drift were fixed, and found cancellation-time wording drift for the two added rate fixtures; returned to development to align policy text. |
| 2026-11-17 | Aligned the Mandalay Lake and Garden King cancellation summaries and timestamps with Mongo's six-PM policy; typecheck and production build passed. |
| 2026-11-17 | D-01 independent re-review approved all synthetic rate, payment, cancellation, and booking snapshot data; confirmed no external booking/payment calls. Moved to Testing. |
| 2026-11-17 | D-01 testing confirmed all property links and snapshot consistency but found Checkout lacked a visible payment-terms row; returned to development. Browser separately completed mock bookings and reloaded confirmation successfully. |
| 2026-11-17 | Added selected-rate payment terms to Checkout and verified typecheck plus production build; ready for final re-review. |
| 2026-11-17 | Final D-01 review approved visible Checkout payment terms; moved back to Testing for final check. |
| 2026-11-17 | D-01 passed independent review, synthetic browser booking/reload checks, and final independent typecheck/build and static checks; marked Done and started D-02 planning. |
| 2026-11-17 | D-02 review found that arbitrary search destination text could be persisted and reach Gemini from confirmation context; returned to the privacy-boundary fix step. |
| 2026-11-17 | Removed raw destination from booking API payload and Mongo snapshot and excluded it from Checkout/Confirmation assistant context; documented browser-only state and heuristic chat scrub limits. Typecheck/build passed; ready for independent re-review. |
| 2026-11-17 | D-02 independent re-review verified the server allowlists drop crafted destination context and approved all audited privacy/data boundaries; moved to Testing. |
| 2026-11-17 | D-02 passed independent review/testing: synthetic fixture, environment-ignore, payload/privacy, external-integration, typecheck, and build checks; marked Done and started D-03 planning. |
| 2026-11-17 | Updated README setup, seed, run, route map, verification commands, and integration boundaries; updated seed script to load ignored `.env.local`. Typecheck and production build passed; moved D-03 to Development Done. |
| 2026-11-17 | D-03 review approved README and found a stale reset-script instruction and seed environment note in database design; returned to development for documentation alignment. |
| 2026-11-17 | Updated database design environment instructions and clarified no reset script exists; idempotent re-seeding does not delete bookings. Ready for final review. |
| 2026-11-17 | Independent final review approved README and database-design setup/reset guidance; moved D-03 to Testing. |
| 2026-11-17 | D-03 independent review/testing passed; Node seed configuration, secret handling, README accuracy, typecheck, and production build verified. All 30 planned stories are Done. |
| 2026-11-17 | Started Version 2 planning: destination-aware Mongo search first, Mongo-backed Rates second, assistant retrieval from backend data third. Existing v1 stories remain Done. |
| 2026-11-17 | V2-01 implementation complete and moved to In Review. Typecheck and production build pass; expanded synthetic seed and runtime acceptance remain to be independently reviewed/tested. |
| 2026-11-17 | V2-01 review found a broken Rates path for newly added properties, retry duplication, unprojected Mongo reads, Edit search losing criteria, and stale search docs. Returned to In Progress; fixes are being verified before re-review. |
| 2026-11-17 | V2-01 independent re-review approved all five fixes. Moved to Testing for seeded Mongo/API and browser acceptance checks. |
| 2026-11-17 | Applied updated synthetic property seed and verified city search, alias, empty result, unique paginated results, input validation, route status, and restored Home form criteria. Independent testing agent is confirming acceptance evidence. |
| 2026-11-17 | V2-01 passed independent review, seed/typecheck/build checks, and local runtime API/Home-form checks; marked Done. Planned and started V2-02 for Mongo-backed Rates and Checkout price consistency. Moved assistant data grounding to V3-01. |
| 2026-11-17 | V2-02 development added the Mongo Rates API/client, server quote calculation, Checkout/booking alignment, and removed local room/rate fixtures; typecheck/build and initial local API/Checkout checks pass. Moving to independent review. |
| 2026-11-17 | V2-02 review found missing Checkout URL validation and database-unavailable handling plus assistant-scope/API-error documentation drift. Returned V2-02 and B-03–B-05 to In Progress for correction before re-review. |
| 2026-11-17 | Fixed V2-02 review findings; Checkout validates query criteria and handles Mongo read failures, docs align assistant grounding to V3 and document Search/Rates errors. Typecheck/build pass; moved affected stories to In Review for re-review. |
| 2026-11-17 | V2-02 re-review found stale Search/Rates assistant examples/claims; updated API and architecture docs to show current behavior and V3 grounding, returned affected stories to In Progress for final review. |
| 2026-11-17 | V2-02 passed final independent review, tester typecheck/build/static checks, and local Mongo API/RLM/Checkout runtime checks; marked V2-02 and B-03–B-05 Done. V3-01 remains the planned next release. |
| 2026-11-17 | Independent V2-02 re-review approved the code and aligned docs. Moved V2-02 and B-03–B-05 to Testing. |
| 2026-11-17 | Updated PRD Search/Rates assistant requirements and acceptance criteria to reflect API-backed synthetic data now and V3 grounding later. Requested final documentation re-review. |
| 2026-11-17 | B-04 independent review approved selected-rate details, synthetic read-only profile, pricing/policy clarity, and all five search criteria on return navigation; moved to Testing. |
