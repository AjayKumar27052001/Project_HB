# Fictional Hotel Booking Assistant

This repository contains a standalone fictional hotel booking experience with a page-aware, read-only Gemini assistant. The app uses Next.js App Router with React and TypeScript, synthetic hotel fixtures, and mock booking persistence in MongoDB. The assistant makes one server-side Gemini request per turn and has no booking tools.

## Set up locally

Requirements: Node.js 20.19 or newer (required by the MongoDB Node.js driver).

```bash
npm install
```

Create the local environment file:

```bash
cp .env.example .env.local
```

Then set:

- `MONGODB_URI` to a local or other **non-production** MongoDB instance.
- `MONGODB_DATABASE` to a dedicated demo database such as `juniper_hotels_demo`.
- `GEMINI_API_KEY` to a Google AI Studio key if you want live assistant responses. It is optional for browsing the booking screens; without it, the assistant shows setup guidance.

Keep both keys server-side. Never add a `NEXT_PUBLIC_` prefix, commit `.env.local`, or paste credentials into shared logs or docs. The `.env*` ignore rule excludes local environment files from Git.

## MongoDB seed

Seed the synthetic properties and demo profiles before trying assistant questions or mock booking. The script loads `.env.local` and upserts the `properties` and `demoProfiles` collections, then creates indexes:

```bash
npm run seed:db
```

The seed script is limited to the configured database. Use only a non-production demo database; never point it at production. The visible profile selector uses checked-in demo-profile fixtures, while booking and assistant APIs resolve the selected profile against the seeded MongoDB collection. Mock bookings are created only through the app's local API when you confirm a demo stay.

## Run and verify

```bash
npm run dev
```

Open `http://localhost:3000`. The journey is Home → Search Results → Rate List → Checkout → Confirmation. All hotel, rate, and profile details are fictional. Checkout creates a mock database record only; it does not create a real reservation or collect payment.

Run the project checks before sharing changes:

```bash
npm run typecheck
npm run build
```

## App structure

- `app/`: Next.js routes for Home, Search Results, Rate List Menu, Checkout, and Confirmation.
- `src/components/atoms`, `molecules`, `organisms`, `templates`: reusable UI following Atomic Design.
- `src/features/booking`: typed data adapter and booking presentation helpers.
- `app/api/v1/assistant/turn/route.ts`: validates a page-scoped chat turn and calls Gemini Interactions once from the Node.js server.
- `src/data`: fictional hotel, room, and rate fixtures; `src/data/seed`: shared MongoDB property and demo-profile documents.
- `src/server`: MongoDB connection and repository code; imported only by server Route Handlers.
- `scripts/seed-mongodb.mjs`: repeatable fixture seed and index setup.
- `docs/`: product, architecture, API, database, and status documents.
- `skills.md`: coding and status-tracking guidelines.

## Current documents

- [Project skills and coding guidelines](skills.md): readable code conventions, architecture boundaries, and the rule for keeping project status current.
- [Product requirements](docs/product-requirements.md): user problem, scope, page behaviors, requirements, and acceptance criteria.
- [Architecture](docs/architecture.md): Next.js App Router structure, Atomic Design component hierarchy, read-only assistant flow, and data boundaries.
- [System design](docs/system-design.md): system components, page flows, state ownership, failure handling, and deployment assumptions.
- [API design](docs/api-design.md): endpoint contracts, request/response shapes, validation, and error codes.
- [Database design](docs/database-design.md): MongoDB collections, embedded documents, indexes, and mock booking persistence.
- [Project plan and status](docs/project-status.md): epics, user stories, acceptance checks, dependencies, and the agreed status workflow.

## Data and action boundary

Use static synthetic hotel data and mock booking behavior only. Do not connect to Marriott systems or use production data. The assistant explains and compares; guests make all selections and submit checkout through the normal site controls.

Gemini model free-tier access and quotas can change; the current server model is `gemini-3.5-flash-lite`, selected because it returned a live response when newer free-tier models were under high demand. Google has deprecated this model but has not announced a shutdown date, so replace it with a supported free-tier model when one is available and verified. The provider request sets `store: false`; send only synthetic demo content because Gemini free-tier inputs/outputs may be used to improve Google products. See [API design](docs/api-design.md) for request boundaries and current model caveats.

This is a standalone reference implementation with a fictional hotel brand. It does not reproduce Marriott.com or depend on its internal systems or standards.
