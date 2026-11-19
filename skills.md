# Project Skills and Coding Guidelines

These guidelines help the team build the dreRuss Hotels booking flow in a way that is easy to read, review, and maintain. Prefer familiar patterns that a developer joining the project can understand without decoding clever shortcuts.

## 1. Readability first

- Use clear names that describe the value or action, such as `selectedRate` or `calculateStayTotal`.
- Keep functions and components focused on one main responsibility. Split a function when it has unrelated steps or becomes hard to scan.
- Prefer direct control flow, early returns, and small helper functions over dense nested conditions or compressed one-line logic.
- Add comments to explain a non-obvious reason or constraint. Do not use comments to narrate code that is already clear.
- Avoid unexplained abbreviations, clever tricks, unnecessary generic frameworks, and large files that mix unrelated behavior.
- Do not add a dependency for a small task that can be handled clearly with the project’s existing tools.
- make sure you have clear idea on docs section(api-design , architecture.md , ...etc)

## 2. Use the agreed stack and project structure

- Build the web experience with Next.js App Router, React, and TypeScript.
- Use Node.js runtime for server-side Route Handlers. Keep MongoDB access and Gemini calls on the server.
- Use MongoDB only for the agreed synthetic property data, demo profiles, and mock bookings.
- Use Atomic Design as a guide: atoms for small UI elements, molecules for related controls, organisms for larger page sections, and templates for page layouts.
- Keep presentation components focused on rendering and user interaction. Put data access, API calls, and business rules in appropriate hooks, services, or server modules rather than embedding them throughout the UI.
- Use the existing API, architecture, and database documents as the source for contracts. Update those documents when an implementation changes an agreed contract or behavior.

## 3. Keep types and boundaries clear

- Give exported functions, component props, API payloads, and persisted document shapes explicit TypeScript types.
- Avoid `any`. If an external value is unknown, validate it at the boundary and narrow its type before using it.
- Validate user input and server responses where they enter the application. Return clear errors that the UI can handle.
- Keep secrets, MongoDB credentials, and the Gemini API key out of client code and source control.
- Use only fictional or synthetic data. Do not connect to Marriott systems, production data, real booking services, or payment providers.

## 4. Preserve the assistant's read-only role

- The assistant may explain and compare information visible on the current page.
- Keep search, filters, hotel/rate selection, checkout, and booking submission in normal page controls.
- Do not give the assistant tools or handlers that change booking state or submit forms.
- Start a fresh assistant conversation after route changes. Send only the current page's relevant, synthetic context.
- V1/V2 use the existing one-call assistant behavior. V3 replaces that design only after its PRD, system design, and API design pass review.
- For V3, use a separate Node.js LangGraph orchestration service with Gemini and a fixed registry of approved, read-only HTTP capabilities. The service calls the booking backend; it never connects directly to MongoDB.
- Limit V3 to two backend retrieval rounds per turn. Parallelize independent approved reads within a round. Never let a model construct arbitrary URLs, database queries, or tools.
- Keep search submission, filters, property/rate selection, checkout submission, and booking actions in normal guest-controlled page controls. Do not register write capabilities in the graph.
- Start a fresh assistant conversation after route changes. Send only the current page's relevant synthetic context. Do not send profile, contact, or payment details in V3.
- Let deterministic backend services filter, sort, and calculate. Keep prices, policies, attributes, and booking facts in structured evidence rendered by the UI; generated prose only explains verified evidence.
- Ask a focused clarification for materially ambiguous requests. Distinguish no match, unknown data, incomplete evidence, and service errors. Never present a provider failure as no availability.
- When information is missing or Gemini is unavailable, say so plainly; do not invent hotel facts, prices, benefits, or policies. V3 uses no paid fallback, feedback learning, or persistent cross-page memory.

## 5. Keep the user journey and UI consistent

- Implement the five planned routes: Home, Search Results, Rate List Menu, Checkout, and Reservation Confirmation.
- Reuse shared layout and UI components while allowing each page to show its own content and fresh assistant conversation.
- Keep shared colors, typography, spacing, radii, shadows, and focus colors in named CSS custom properties; use those tokens in reusable primitives instead of repeating raw values. One-off decorative values may stay local when they are not shared.
- Keep dates, occupancy, selected property, room, rate, and selected synthetic demo profile consistent as the guest moves through the booking flow. Keep assistant transcript state separate from booking state.
- Use only fictional demo profiles and clearly labeled demo rewards. The profile selector is not authentication; never use real customer or Marriott loyalty data.
- Use the fictional dreRuss Hotels visual direction and English-only content agreed for this project.
- Keep all booking actions mock-only. A confirmation screen must not imply a real reservation, charge, or payment has occurred.

## 6. Update the project status tracker as work progresses

Every feature must be tied to a user story in [`docs/project-status.md`](docs/project-status.md). Update that document whenever feature work starts or advances:

1. Before implementation begins, move the story from **Not Started** to **In Progress**.
2. When the implementation and developer checks are complete, move it to **Development Done** and record useful implementation notes or evidence.
3. When review begins, move it to **In Review**. Resolve review comments before moving it to **Testing**.
4. Record the required acceptance-check evidence before moving it to **Done**.
5. If review or testing finds an issue, return the story to **In Progress** and record why.
6. Update the status summary counts whenever a story changes status. If a feature affects multiple stories, update each affected story.

Do not mark work Done just because code was written or a screen renders. Follow the exit conditions in the status tracker.

## 7. Required feature delivery sequence

Complete one feature slice at a time in this order:

1. **Planning:** identify its user stories, dependencies, scope, acceptance checks, and relevant design/API/data contracts. Record the plan and move affected stories to In Progress before coding.
2. **Development:** implement only the planned slice and update the status board with concrete implementation notes.
3. **Review:** after development, ask a separate review agent to inspect the diff against the plan, readable-code rules, and project contracts. Resolve findings before proceeding.
4. **Testing:** after review findings are resolved, ask a separate testing agent to run relevant checks and report evidence. Do not start the next feature slice until the current slice passes review and testing.
5. **Status:** move stories through Development Done, In Review, Testing, and Done only when the corresponding evidence exists. If a gate finds an issue, return the affected story to In Progress and fix it before continuing.

For V3, review `docs/prd-v3.md`, `docs/system-design-v3.md`, and `docs/api-design-v3.md` before marking V3-00 Done or moving V3-01 to In Progress. Implement V3-01 as its own slice, then follow the same development, independent review, and independent testing gates.

## 8. Definition of done for a feature

Before moving a story to Done, confirm that:

- Its acceptance criteria in the status tracker are met.
- The implementation follows the agreed API, architecture, database, synthetic-data, and assistant boundaries.
- Relevant developer checks and the story's required acceptance checks are recorded.
- Any affected project documents and status counts are up to date.
- No secrets, production data, or real payment/booking integrations were introduced.
