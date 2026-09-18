# PulseChain — Frontend Build & Re-theme Brief

> **Status: executed.** All blocks in Section 6 have been carried out. The
> audit from Block 0 is in [`FRONTEND_AUDIT.md`](FRONTEND_AUDIT.md), the final
> structure is in [`ARCHITECTURE.md`](ARCHITECTURE.md) §7, the run is in
> [`DEMO_SCRIPT.md`](DEMO_SCRIPT.md), and the retrospective is in
> [`LEARNINGS.md`](LEARNINGS.md) §8. Where the deployed API contradicted a page
> specification below, the audit records the deviation and why. This document is
> kept as the statement of intent.

**How to use this file:** open Claude Code in the repo root and paste:

> Read `docs/FRONTEND_BRIEF.md` in full before doing anything. Then execute
> Block 0 only and stop for my review. The design reference screenshots are in
> `docs/design/` — treat them as the visual source of truth as described in
> Section 5.

Run one block at a time, reviewing between each. Do not let it run all blocks in
one pass — it will drift.

---

## 0. Read this first: what you are and are not doing

This repo **already has a working frontend**. Eight pages, roughly forty
components, real TanStack Query hooks wired to a deployed API. You are not
scaffolding from scratch.

Your job is four things, in this order of importance:

1. **Fix the correctness problems** listed in Section 3. Some current pages call
   endpoints that do not exist, and the auth guard does not actually guard.
2. **Re-theme the entire app** onto the design language in Section 5, replacing
   the ad-hoc Tailwind palette colours currently scattered through the pages.
3. **Complete the missing pages** listed in Section 7, with an explicitly-marked
   adapter layer where the backend does not yet exist.
4. **Harden the demo path** described in Section 8 so that the recorded run is
   legible without narration.

Anything you are tempted to add that is not in this brief: do not add it. There
is a hard feature freeze and the demo is the deliverable.

---

## 1. Repository ground truth

Monorepo with npm workspaces: `shared`, `backend`, `seed`, `frontend`.

### Conventions you must match exactly

| Thing | Convention in this repo |
|---|---|
| Exports | **Named**, never default |
| File names | `PascalCase.tsx` for components and pages, `camelCase.ts` for lib and api |
| Imports | **Relative paths**. There is no `@/` alias — do not introduce one |
| Shared types | `import type { Offer, BloodUnit } from "@pulsechain/shared"` |
| Styling | Tailwind utility classes only. No CSS modules, no styled-components, no component library |
| Data fetching | TanStack Query v5 only, through `api/hooks.ts`. Never call `fetch` from a component |
| Icons | `lucide-react` |
| Animation | `framer-motion` |
| Charts | `recharts` |
| Dates | `date-fns` |
| Build check | `npm run build -w frontend` must pass at the end of every block |

### Do not touch

- Anything under `backend/`, `shared/`, `seed/`, `infra/` unless a block
  explicitly says so.
- `vite.config.ts` aliasing, `tsconfig.json` paths, `package.json` workspaces.
- `POLL_INTERVAL_MS` — 3500 ms is deliberate and inside the agreed 3–5 s window.
- The `api` object's existing method names in `client.ts`. Add to it; do not
  rename.

---

## 2. The real API contract

Endpoints that **actually exist**, verified against the SAM template's `Events`
blocks. Behind an HTTP API with a Cognito JWT default authorizer.

| Method | Path | Returns |
|---|---|---|
| GET | `/facilities` | `Facility[]` |
| GET | `/facilities/{id}` | `Facility` |
| GET | `/facilities/{id}/stock` | `StockUnit[]` |
| GET | `/units/{id}` | `BloodUnit & { hoursRemaining }` |
| GET | `/facilities/{id}/inbox` | `Offer[]`, OPEN first then by `rank` |
| POST | `/offers/{id}/claim` | `{ ok, message, unitId, claimedBy }` |
| POST | `/offers/{id}/decline` | `{ ok, message }`, body `{ reason? }` |
| POST | `/transfers/{unitId}/in-transit` | `{ ok, status, unitId }` |
| POST | `/transfers/{unitId}/received` | `{ ok, status, unitId, facilityId }` |
| GET | `/dashboard?from=&to=` | `DashboardResponse` |
| GET | `/escalations/active` | `{ escalations: ActiveEscalation[] }` |
| POST | `/demo/sweep-now` | `{ ok, action, sweptCount, units[] }` |
| POST | `/demo/reset` | `{ ok, action, expectedCount, actualCount, elapsedSec }` |
| GET | `/health`, `/health-check` | health payload |

### Endpoints that DO NOT exist — read this carefully

`backend/src/api/requisitions.ts` contains exactly `export {};` and has **no
`Events` in `template.yaml`**. There is no requisitions route, no
`/requisitions/parse` route, no donor route and no community route deployed.

That means `RequisitionsPage`, `ParseRequestPage` and anything donor- or
community-facing **cannot be wired to a live endpoint**. Build them against a
clearly isolated adapter, per Section 7. **Never** fabricate a
`fetch("/requisitions")` call that will 404 during the demo.

The requisition escalation state machine and the `requisition-search` and
`donor-tier` workers do exist. They are just not reachable from the HTTP API.

### Error semantics that matter to the UI

`client.ts` throws `ApiError(status, message)` preserving the backend's `error`
field. Three cases the UI must handle distinctly:

- **409 `Already claimed by <facility name>`** — the double-claim rejection from
  the `TransactWriteItems` condition failure. This is a demo centrepiece.
- **409 `Offer has already expired`** — the claim window closed.
- **403 `Forbidden: Offer is addressed to another facility`** — wrong scope.

Render the backend's message verbatim. Do not replace it with a generic
"Something went wrong".

### Shared types — use these, do not redeclare

Two things to note:

- `Urgency` is `NORMAL | HIGH | CRITICAL`. It is **not** `ROUTINE`.
- `MatchBreakdown` has `distanceKm` (a distance, not a score). The breakdown UI
  must not present it as if it were a 0–1 sub-score.

Thresholds, ring radii, offer windows and score weights live in
`shared/src/config.ts`. **No magic numbers in components.**

---

## 3. Correctness problems to fix before any styling

### 3.1 Auth does not guard

`AuthProvider` initialises state to `DEMO_PERSONAS.BLOOD_CENTRE` when
sessionStorage is empty, so `isAuthenticated` is always true.

Fix: initial state `null`; `App.tsx` wraps all non-`/login` routes in a
`RequireAuth` that redirects to `/login?next=<pathname>`. Keep the key
`pulsechain_session_user` and keep it **sessionStorage, not localStorage** — two
windows must hold two roles at once. That is how the double-claim demo is
filmed. Keep the Amplify path primary and the persona fallback a fallback, but
log the fallback visibly in the top bar as a "demo auth" indicator.

### 3.2 The token system is bypassed

Pages use raw `slate-900`, `emerald-400`, `blue-500`, `dark:text-white`
directly. Sweep every file under `src/` and replace them with token classes.
Colour lives in `index.css` only.

### 3.3 Dark-mode classes that never activate

Delete every `dark:` variant. One theme done well beats two done partly.

### 3.4 Token duplication in `client.ts`

Keep the `sessionStorage` read in `client.ts` (it must work outside React), but
have `AuthProvider` be the only **writer**, and delete `getAuthHeaders` from the
context so there is one path.

### 3.5 Hardcoded facility fallbacks

Remove every `facilityId ?? "FAC_..."`. If `facilityId` is null the user is not
authenticated and `RequireAuth` has already redirected. A silent fallback to
another facility's data is a security shape you do not want a judge to find.

---

## 4. Route map (final)

| Route | Guard | Page |
|---|---|---|
| `/` | public | redirect to role landing, or `/login` |
| `/login` | public | `LoginPage` |
| `/centre/stock` | `BLOOD_CENTRE` | `StockConsolePage` |
| `/centre/units/:unitId` | `BLOOD_CENTRE` | `UnitDetailPage` **(new)** |
| `/hospital/inbox` | `HOSPITAL` | `OfferInboxPage` |
| `/hospital/requisitions` | `HOSPITAL` | `RequisitionsPage` |
| `/hospital/transfers` | `HOSPITAL` | `TransfersPage` |
| `/coordinator/escalations` | `COORDINATOR` | `EscalationMapPage` |
| `/coordinator/parse` | `COORDINATOR` | `ParseRequestPage` |
| `/impact` | any authed | `ImpactPage` |
| `*` | — | `NotFoundPage` |

`/donor`, `/donor/register`, `/community/*` are **out of scope**.

---

## 5. Design direction

### 5.1 The screenshots

**The reference screenshots are in `docs/design/`. Read them from disk before
Block 2.**

| File | What it defines |
|---|---|
| `01-lifeline-hero-mobile.png` | The **brand surface**: serif display headline, blush gradient field, soft white cards, pill buttons, blood-group tokens |
| `03-type-colour-specimen.jpg` | The palette and type source of truth — Lufga, `#BB2B29`, `#530404`, `#FFE8E8`, `#ECA0A0` |
| `04-donor-app-screens.png` | **Mobile form patterns only**: the blood-group token grid, the profile form, segmented filter chips. Do not copy the heavy solid-red chrome into the operator consoles |
| `05-stats-profile-screens.png` | **Data-display density** for the impact page, and the bottom tab bar on mobile |
| `07-urgent-request-panel.png` | The dark crimson urgent-request panel, and the walk-in-centre cards with capacity bars |

### 5.2 Two surface tiers — this is the most important design decision

A blush-on-blush marketing aesthetic applied to a dense stock table will destroy
the status colour system, and the status colour system is the product. So split
the app:

**Tier A — Brand surfaces.** Login, impact hero, donor-facing screens, empty
states, the 404. Full Lifeline treatment: blush gradient field, large serif
display type, generous whitespace, soft pill buttons, rounded 24px cards.

**Tier B — Operator consoles.** Stock console, offer inbox, transfers,
escalation map, parse. A restrained derivative: same palette, same typefaces,
but white cards on a very pale blush neutral, tighter vertical rhythm, 12px
radii, and **status colours that stay semantically distinct**. The blush is the
room; the status colours are the instruments.

The connective tissue between tiers is the typeface pairing and the crimson
accent. Nothing else needs to match.

### 5.3 Tokens

Rewrite `styles/index.css` with these. Keep the space-separated HSL triplet
format so Tailwind's `<alpha-value>` works — do not switch to hex.

```
#BB2B29  ->  1 64% 45%     primary crimson
#530404  ->  0 91% 17%     deep oxblood
#FFE8E8  ->  0 100% 96%    blush tint
#ECA0A0  ->  0 67% 78%     dusty rose
```

Derive from those: `--surface` a barely-tinted blush white, `--surface-raised`
pure white, `--surface-sunken` a step deeper; `--text` the oxblood at very low
lightness rather than neutral black — it warms the whole app and is the cheapest
way to make it not look like a default dashboard; `--text-muted` a desaturated
rose-grey, not a blue-grey; `--accent` / `--accent-hover` from the crimson.

Keep the component-clock tokens but retune: platelets take the crimson (they are
the urgent 48-hour clock and the demo's hero), RBC an amber, plasma a cool
slate-teal that reads as calm. Keep every `--status-*` token name; retune values
so they remain mutually distinguishable against the blush background — check the
amber and the crimson do not collapse. Add `--ring-1`, `--ring-2`, `--ring-3`.

### 5.4 Type

The specimen names **Lufga**, which is commercial. If licensed `.woff2` files
are placed in `frontend/public/fonts/`, use them with `@font-face` and
`font-display: swap`. If not, do not fetch it from a CDN — it will not be there.
Fall back to a pairing that holds the same character: a high-contrast serif with
real personality for display, and a geometric humanist sans in the Lufga
register for UI, body and data.

Set a proper type scale rather than ad-hoc Tailwind sizes. Numbers in tables,
countdowns and stat tiles use `font-variant-numeric: tabular-nums` — apply it
everywhere a number changes over time.

One restraint: the screenshots italicise a single word in the headline. Use that
once, on the login or impact hero, and nowhere else. Repeated, it becomes a tic.

### 5.5 Motion

Spend framer-motion in exactly three places and nowhere else:

1. A unit row transitioning `AVAILABLE → RESCUE_PENDING` — impossible to miss.
2. An offer card arriving in the inbox.
3. The escalation map's ring expansion and the origin-to-claimant line.

No scroll-reveal, no hover lift on every card. Respect `prefers-reduced-motion`:
under it, state changes swap instantly and the ring pulse becomes static.

---

## 6. Execution blocks

Run one at a time. After each, run `npm run build -w frontend`, report what
changed, and stop for review.

- **Block 0 — Audit and plan (no code).** Component inventory, raw-colour
  inventory, missing-endpoint list, magic-number list, proposed tokens and
  typefaces with reasoning. Write to `docs/FRONTEND_AUDIT.md`. Change no source.
- **Block 1 — Auth and routing correctness.** Implement 3.1, 3.4, 3.5. Add
  `auth/RequireAuth.tsx`. Rewrite the route table per Section 4 including
  `/centre/units/:unitId`. Add `?next=` preservation.
- **Block 2 — Token system and UI primitives.** Rewrite `styles/index.css` and
  `tailwind.config.ts`. Rebuild every `components/ui/` primitive. Add
  `ConfirmDialog` and `StatCard`. Create `lib/status.ts` as the single enum →
  label + colour mapping. Run the colour sweep.
- **Block 3 — App shell.** Sidebar at ≥1024px, bottom tab bar below. Top bar
  with facility, role, a live connection dot on `GET /health` at 15s, sign-out.
  `DemoToolbar` floating bottom-right behind `VITE_DEMO_MODE`.
- **Block 4 — Blood centre.** Stock console and the new unit detail page.
- **Block 5 — Hospital.** Inbox and transfers.
- **Block 6 — Coordinator.** Escalation map and parser.
- **Block 7 — Impact dashboard.**
- **Block 8 — Requisitions, polish, freeze.** Adapter-backed requisitions,
  every state on every route, three breakpoints, reduced motion, docs.

---

## 7. Page specifications

### 7.1 `/centre/stock` — Stock console

**Alert strip.** Four counters derived client-side from the one stock payload:
*In alert window*, *Rescue in progress*, *Claimed today*, *Lost this week*. Each
is a filter toggle. Do not add a fifth.

**Filter bar.** Component, blood group, status. State lives in URL search params.

**Unit table.** Columns: Unit · Component · Group · Expires in · Status · Rescue.
*Expires in* uses `useCountdown` against `expiresAt`, recomputed every second in
the browser. Colour steps: neutral outside the threshold, the component's clock
colour inside it, crimson under 6 hours. Show as `11h 42m`, and under one hour as
`47m 03s`. *Rescue* for `RESCUE_PENDING` rows shows ring, open offer count and
seconds to ring advance, and gives the row an animated left edge in the platelet
colour. Default sort ascending by `expiresAt`. Row click opens the unit.

**Empty:** "No units in the alert window. All platelet stock is outside its
48-hour clock."

### 7.2 `/centre/units/:unitId` — Unit detail (new)

Header: unit id, component clock badge, blood group, volume, collected, live
countdown, status.

Body: a rescue timeline. **`GET /units/{id}` returns only the unit and
`hoursRemaining` — it does not return audit events.** Build the timeline from
the fields that exist, plus the matching escalation from `useEscalationsQuery`.
Render future steps as dimmed placeholders. Add a comment at the top of the file
stating that a full audit timeline requires a `GET /units/{id}/audit` endpoint
that does not exist yet. Do not fake audit rows.

### 7.3 `/hospital/inbox` — Offer inbox

Cards, not a table. Sections: **Needs your decision** (OPEN, sorted by `rank`),
then **Recent** (collapsed).

Each card: blood group and component as the dominant visual element; origin
facility name and `breakdown.distanceKm`; `CountdownRing` against `claimBy` —
the **offer** window, distinct from unit expiry, with unit expiry as a secondary
line so both clocks are legible; ring badge; `offer.reason` as plain sentence
text with `MatchBreakdown` expandable beneath it — bars for the four 0–1
sub-scores weighted per config, and `distanceKm` shown as a distance with its own
weighting, not as a bar pretending to be a score. **Claim** primary, **Decline**
ghost.

Claim disables with an inline spinner, never a page-level block. Success →
claimed state, toast, link to transfers. 409 → the card flips to a failure state
showing the backend's exact message, holds for about four seconds, then drops
out. Never silently remove it.

Decline reveals three reason chips, posts `reason`, card fades.

**Empty:** "No offers right now. Nearby units that match what you need will
appear here."

### 7.4 `/hospital/transfers` — Chain of custody

Units where this facility is the recipient — `CLAIMED`, `IN_TRANSIT`,
`RECEIVED`. Two groups: **In progress**, **Completed**. Each row is a three-step
stepper: Claimed → In transit → Received, with timestamps.

`CLAIMED` → **Mark in transit**. `IN_TRANSIT` → **Confirm received** behind a
`ConfirmDialog`. On `RECEIVED`, a single-sentence banner naming what was saved
and how close it came, computed from `expiresAt` minus `receivedAt`. One
sentence. This is the emotional payoff; do not pad it.

### 7.5 `/coordinator/escalations` — Corridor map

Map left (~60%), list right (~40%). Stacks vertically under 1024px **with the
list first**, because the list is the useful half on a phone.

`CorridorMap` is SVG with a `viewBox`, scaling precomputed lat/lng from
`useFacilitiesQuery`. No map tiles, no external geo service. `FacilityDot` sized
by type, coloured by role. The escalating unit's origin carries `RingPulse`.
Rings from `shared/src/config.ts` radii, projected to the same scale. A claim
draws a line origin → claimant.

Below: a network strip — active escalations, facilities, open offer count.

**Empty:** "No active escalations. The corridor is quiet."

### 7.6 `/coordinator/parse` — Request parser

**There is no parse endpoint.** `shared/src/parsing.ts` is a deterministic
multilingual parser that runs anywhere, including the browser. Import and call
it client-side.

Left pane: textarea, three example chips (Tamil, Hindi, English). Right pane:
parsed output as an **editable** form. Fields the parser could not extract render
empty with a "needs input" marker, never a guess.

Because there is no `POST /requisitions`, **Create requisition** hands off to the
same in-memory adapter as 7.8. Label the panel honestly. Judges respect a stated
limit far more than a button that 404s.

### 7.7 `/impact` — Dashboard

Hero band in Tier A styling: one serif line naming what the network has saved,
drawn from `totals`, with the italicised-word treatment used once.

Four `StatTile`s from `totals`: units saved, units lost, value saved (₹), active
rescues. `TrendChart` over `history[]` plotting `unitsSaved` against `unitsLost`
by date. `SavedLostBar` as the at-a-glance ratio. Handle a short `history` array
without breaking the axis. Below: the network card from `useFacilitiesQuery`.

### 7.8 `/hospital/requisitions` — with an explicit adapter

No backend. Build it this way and no other way:

1. Create `src/api/requisitionsAdapter.ts`. At the top, a comment block stating
   plainly: the requisitions API is not deployed, `backend/src/api/requisitions.ts`
   is a stub, and this module holds requisitions for the session only.
2. Expose `listRequisitions`, `createRequisition` with the **exact same
   signatures** the real API would have, typed with `Requisition` from shared.
3. Hooks named `useRequisitionsQuery` / `useCreateRequisitionMutation` — when the
   endpoint ships, only the adapter import changes.
4. The page renders a small, permanent, honest notice.

Page content: a create form (component, group, units, urgency, needed-by, note)
and a list with `RequisitionStatus` pills including `DONOR_TIER` styled
distinctly.

**Do not** add a fake `POST /requisitions` to `client.ts`. Keep the fiction in
one file, clearly labelled.

---

## 8. The demo path

The recorded run must be legible with the sound off.

1. Coordinator window on the map, at rest.
2. Blood centre window on the stock console, target platelet unit at the top.
3. Two hospital windows on the inbox, both empty.
4. Press **Run sweep now**.
5. Within one 3.5 s poll: the unit flips to `RESCUE_PENDING`, its row edge
   animates, the rescue column shows ring and countdown.
6. The map draws ring 1 and lights recipients.
7. Offer cards appear in both hospital inboxes with claim-window rings running.
8. Both hospitals press **Claim** at once. One succeeds. The other shows the
   backend's `Already claimed by <facility>` message. **This is the shot.**
9. Stock console shows `CLAIMED`; map draws origin → claimant.
10. Winning hospital: **Mark in transit** → **Confirm received**. The save
    sentence fires.
11. `/impact`: units saved and value saved increment.

Every one of those is a single visible state change on a poll cycle. If a step
needs spoken explanation, its UI is not finished.

---

## 9. Standing rules

- Named exports. Relative imports. No `@/` alias.
- No component library. No new dependency without asking first.
- No colour outside `styles/index.css`.
- No status label or colour outside `lib/status.ts`.
- No threshold, radius, window or weight outside `shared/src/config.ts`.
- No `localStorage` for application data. Session identity stays in
  `sessionStorage`.
- No `fetch` in a component. Everything through `api/hooks.ts`.
- No fabricated endpoint. If it is not in Section 2, it does not exist.
- Three designed states on every route: loading (skeletons shaped like the real
  content, not a centred spinner), error (`ErrorState` with the backend message
  and a retry), empty (page-specific copy that says what would appear here and
  what would cause it).
- Error and empty copy is written in the interface's voice: state what happened
  and what to do. No apologies, no exclamation marks.
- `npm run build -w frontend` passes at the end of every block.

## 10. Where to ask rather than guess

Stop and ask if you hit any of these:

- A design decision the screenshots do not cover and Section 5 does not settle.
- A missing endpoint not already listed in Section 2 as missing.
- A shape mismatch between what a page needs and what `@pulsechain/shared`
  provides.
- Any temptation to change a file under `backend/`, `shared/` or `seed/`.

A five-second question beats an hour of rework.
