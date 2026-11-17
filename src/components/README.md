# Frontend component structure

Components follow Atomic Design so each file has a clear job and can be reused without hiding booking rules inside presentation code.

## Levels

| Level | What belongs here | Current examples |
|---|---|---|
| Atoms | Small visual controls with no page or booking knowledge. | `Button`, `Badge` |
| Molecules | A small group of controls that work together as one input or selector. | `Field`, `DemoProfileSelector` |
| Organisms | Complete page sections that compose atoms and molecules. | `SiteHeader`, `StaySearchForm`, `PropertyCard`, `RateOptionCard`, `CheckoutForm`, `AssistantPanel` |
| Templates | Shared page layout and placement of larger sections. | `BookingFrame` |
| Pages | Route-specific content and data loading. | `app/page.tsx`, `app/search/page.tsx`, and other App Router pages |

## Keep responsibilities clear

- Keep reusable visual components in the level that best matches their responsibility.
- Pass page data and callbacks through typed props; keep domain rules in feature modules and server code.
- Let App Router pages load the data they need and compose the shared components.
- Promote a component only when it has a clear reuse case. Avoid extra wrapper components that only rename or forward props.
- Use readable names and small, direct functions. Keep a component's markup close to the behavior it owns.

The structure is intentionally lightweight. It documents how this project organizes UI; it does not add a UI framework or dependency.
