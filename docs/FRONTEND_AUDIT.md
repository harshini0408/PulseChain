# Frontend audit

State of `frontend/` as found, and what the rebuild did about it. Written
against the tree at the commit before the re-theme; figures are counts from
that tree, not estimates.

**Headline: the existing frontend was real, not scaffolding.** Eight pages and
roughly forty components were already wired to live TanStack Query hooks
against deployed endpoints. Four components were stubs. That made this a
re-theme and completion job rather than a rebuild, which is what made Blocks
4–7 affordable.

---

## 1. Component inventory

### Real before the rebuild

| Component | Used by | Note |
|---|---|---|
| `ui/Button` · `Card` · `Badge` · `StatusPill` · `Spinner` · `PageHeader` | everywhere | Already on tokens — the only files that were |
| `ui/EmptyState` · `ErrorState` · `LoadingState` | pages | On raw palette colours |
| `ui/DemoToolbar` | `AppShell` | Sticky top strip, raw colours, own persona `<select>` |
| `layout/AppShell` · `Sidebar` · `TopBar` · `RoleSwitcher` | shell | Drawer pattern below `lg` |
| `stock/StockTable` · `UnitRow` · `ExpiryCountdown` · `ComponentClockBadge` | stock console | Countdown already client-side; correct |
| `offers/OfferCard` · `ClaimButton` · `CountdownRing` · `MatchBreakdown` | inbox | `MatchBreakdown` drew `distanceKm` as a 0–1 bar |
| `transfers/TransferTimeline` · `TransferActions` | transfers | Actions took the wrong mutation argument shape |
| `escalation/CorridorMap` · `FacilityDot` · `RingPulse` · `EscalationList` | map | Real haversine projection; hardcoded hex ring colours |
| `dashboard/StatTile` · `TrendChart` · `SavedLostBar` | impact | Recharts already in place |

### Stubs before the rebuild

| File | Contents | Now |
|---|---|---|
| `ui/Toast.tsx` | `// stub` + `export {}` | Full provider with `useToast()` |
| `requisitions/RequisitionForm.tsx` | `// stub` | Shared by the requisitions and parse pages |
| `requisitions/RequisitionList.tsx` | `// stub` | Status pills including `DONOR_TIER` |
| `requisitions/ParsePanel.tsx` | `// stub` | Parse output as an editable form |
| `pages/hospital/RequisitionsPage.tsx` | 18 lines, `EmptyState` only | Built on the adapter |
| `pages/coordinator/ParseRequestPage.tsx` | 18 lines, `EmptyState` only | Runs `shared/parsing` in the browser |

`context/RoleContext.tsx` held a second, independent copy of `role`. It was
mounted in `main.tsx` and **never consumed** — `useRole()` had no callers. It
has been deleted; `AuthProvider` is the one source of role.

---

## 2. Raw Tailwind palette colours

`styles/index.css` defined a complete HSL token set and `tailwind.config.ts`
mapped it. The pages then largely ignored both.

**199 lines carrying 484 raw palette references across 21 files**, plus `dark:`
variants in 17 files.

| File | Lines with raw colours |
|---|---|
| `pages/LoginPage.tsx` | 28 |
| `components/stock/UnitRow.tsx` | 28 |
| `components/offers/OfferCard.tsx` | 26 |
| `components/ui/DemoToolbar.tsx` | 17 |
| `pages/hospital/TransfersPage.tsx` | 14 |
| `pages/centre/StockConsolePage.tsx` | 10 |
| `components/offers/MatchBreakdown.tsx` | 10 |
| `pages/hospital/OfferInboxPage.tsx` | 8 |
| `components/transfers/TransferTimeline.tsx` | 8 |
| `components/stock/ComponentClockBadge.tsx` | 8 |
| `pages/ImpactPage.tsx` | 7 |
| `components/ui/ErrorState.tsx` | 5 |
| `pages/coordinator/EscalationMapPage.tsx` | 4 |
| `components/ui/EmptyState.tsx` | 4 |
| `components/transfers/TransferActions.tsx` | 4 |
| `components/stock/ExpiryCountdown.tsx` | 4 |
| `components/offers/CountdownRing.tsx` | 4 |
| `components/escalation/EscalationList.tsx` | 4 |
| `components/stock/StockTable.tsx` | 3 |
| `components/ui/LoadingState.tsx` | 2 |
| `components/offers/ClaimButton.tsx` | 1 |

Hex literals also appeared outside the stylesheet: `CorridorMap.tsx` and
`EscalationMapPage.tsx` between them hardcoded `#dc2626`, `#f59e0b`, `#6366f1`,
`#e5e7eb`, `#6b7280` and `#gray-700` for ring colours and the map grid.

**Now:** all three sweeps return nothing.

```
grep -rnE "(slate|zinc|gray|...|fuchsia)-[0-9]{2,3}" src/   -> empty
grep -rn  "dark:" src/                                       -> empty
grep -rnE "#[0-9a-fA-F]{3,8}" src/ (excluding styles/)        -> empty
```

### A correction to the brief

The brief says the `dark:` variants "never activate" because no `darkMode`
strategy is set. That is not quite right: Tailwind v3 defaults to
`darkMode: "media"`, so every one of those variants **was** firing on any
machine set to dark mode — producing a half-themed interface rather than none.
The remedy is the same one the brief recommends and it is now done: the
variants are deleted, and `tailwind.config.ts` carries a comment saying why so
nobody adds them back.

---

## 3. Calls to endpoints that do not exist

Checked against the `Events` blocks in `backend/template.yaml`.

**Good news first:** no component was calling a missing endpoint. The pages
that had no backing endpoint were the stubs, and they simply rendered an
`EmptyState` instead of fetching. Nothing would have 404'd on camera.

What is genuinely missing, and what was done:

| Need | Status | Resolution |
|---|---|---|
| `GET /requisitions`, `POST /requisitions` | Not deployed. `backend/src/api/requisitions.ts` is `export {};` with no `Events` block | `api/requisitionsAdapter.ts` — session-local, one file, labelled on screen |
| `POST /requisitions/parse` | Not deployed | Not needed. `shared/src/parsing.ts` is dependency-free and runs in the browser |
| `GET /units/{id}/audit` | Does not exist | Unit detail derives its timeline from the unit record; no rows invented |
| Donor and community routes | Not deployed; `shared` has only `DonorPool` | Out of scope, not built |

Three endpoints existed but were not in `client.ts`, and have been added:
`GET /facilities/{id}`, `GET /units/{id}`, `GET /health`.

### Two data-shape findings that changed how pages are built

**1. A hospital cannot source its own in-flight transfers from its stock query.**
`POST /transfers/{unitId}/received` is what moves a unit's `facilityId` to the
recipient (`backend/src/api/transfers.ts`). Until then a `CLAIMED` or
`IN_TRANSIT` unit is still filed under the origin blood centre's `GSI2PK`, so
`GET /facilities/{hospitalId}/stock` returns only units already **received**.

The brief's §7.4 ("`useStockQuery(facilityId)` filtered to `CLAIMED`,
`IN_TRANSIT`, `RECEIVED`") therefore cannot work as written. `TransfersPage`
instead composes two deployed endpoints: the inbox names which units this
facility claimed, and `GET /units/{id}` gives each one its live status. A new
`useUnitsQuery` hook batches those reads.

**2. The coordinator cannot see open offers.** `GET /escalations/active`
returns escalations with no offer data, and no deployed endpoint lists offers
network-wide. So "facilities holding an open offer light up" (§7.5) is not
obtainable. The map instead highlights facilities **inside the escalating
ring**, computed by haversine from real coordinates, and says so in a line
under the map. The claimant *is* real — it comes from the escalating unit's own
`claimedBy`.

Also worth knowing: `escalations.ts` declares `originFacilityName` on its row
type but never populates it. Only `originFacilityId` is set, so names are
resolved client-side through `useFacilityLookup`.

---

## 4. Hardcoded IDs, thresholds and magic numbers

### Facility IDs — eight occurrences, all removed

| Location | Was |
|---|---|
| `AuthProvider` ×2 | Persona definitions — legitimate, kept |
| `AuthProvider:91` | `claims?.facilityId ?? "FAC_CBE_SNBC"` — a failed claim lookup silently became the blood centre |
| `AuthProvider:117` | Any unrecognised email silently became `FAC_CBE_KMCH` with role `HOSPITAL` |
| `StockConsolePage:14` | `facilityId ?? "FAC_CBE_SNBC"` |
| `OfferInboxPage:12` | `facilityId ?? "FAC_CBE_KMCH"` |
| `TransfersPage:22` | `facilityId ?? "FAC_CBE_KMCH"` |
| `TransfersPage:81` | `originFacilityId: "FAC_CBE_SNBC"` — assumed every received unit came from one centre |

Every fallback is gone. `RequireAuth` guarantees a session before any page
renders, so `facilityId` is non-null by construction. The two auth fallbacks
mattered most: an unknown email used to produce a working hospital session
against a facility the user had no claim to.

`TransfersPage` also carried a six-entry `KNOWN_FACILITIES` map duplicating
`GET /facilities`; `OfferCard` carried its own copy. Both deleted in favour of
`useFacilityLookup`.

### Numbers

| Number | Was | Now |
|---|---|---|
| Threshold hours, shelf life, ring radii, offer window, ring wait, score weights | Mostly read from `getConfig()` already — this part was in good shape | Unchanged, still from `shared/src/config.ts` |
| `PX_PER_KM = 5.8` in `CorridorMap` | Hand-tuned constant with a comment admitting it was tweaked to fit | Derived from the active ring radius and the viewBox |
| `"42 days"` / `"1 year"` shelf-life strings in `ComponentClockBadge` | Hardcoded, and **wrong** — config says RBC 35 days, plasma 365 | Read from `getConfig().shelfLifeDays` |
| Ring pixel radius `r3 = kmToPixels(55)` | Invented "regional" boundary with no basis in config | Removed; ring 3 is unbounded in config and is not drawn as a circle |
| `POLL_INTERVAL_MS = 3500` | Correct | Unchanged |

Two display-only constants are new and are labelled as such, because they are
presentation steps rather than policy and have no backend meaning:
`CRITICAL_DISPLAY_HOURS = 6` (when a countdown turns crimson) and
`DAYS_ABOVE_HOURS = 72` (when a countdown reads in days).

---

## 5. Tokens and type

### Colour

Seed palette from `docs/design/03-type-colour-specimen.jpg`:

| Hex | HSL triplet | Role |
|---|---|---|
| `#BB2B29` | `1 64% 45%` | Primary crimson |
| `#530404` | `0 91% 17%` | Deep oxblood |
| `#FFE8E8` | `0 100% 96%` | Blush tint |
| `#ECA0A0` | `0 67% 78%` | Dusty rose |

Everything else derives from those. Surfaces are a barely-tinted blush white
over pure-white cards; `--text` is oxblood at very low lightness rather than
neutral black, and `--text-muted` is a rose-grey rather than a blue-grey. Those
two choices do most of the work in making the console not read as a default
dashboard, and they cost nothing.

**The five status hues were not chosen by eye.** They were run through a
colour-vision validator as a categorical set, all pairs, against the blush
surface, and re-tuned until every pair passed on lightness band, chroma floor,
CVD separation, normal-vision separation and contrast. Three findings:

- **Amber and crimson did collapse**, exactly as the brief predicted. A
  conventional orange amber sat at ΔE 12.4 normal / 8.2 deutan against the
  crimson. `--status-in-transit` moved to a true gold at hue 43.
- **A violet `claimed` was indistinguishable from a blue `open`** — ΔE 11.0
  with normal vision. It moved to hue 280.
- **A conventional green `received` failed against the crimson under
  deuteranopia.** This is the classic red/green trap, and it is the pair
  carrying "saved versus lost" on the impact chart, so it mattered most. It
  moved to a green-teal at hue 167.

Final set — worst pair 8.3 ΔE deutan, 15.5 normal, all pairs passing:

| Token | Hex | HSL |
|---|---|---|
| `--status-open` | `#1F63CC` | `216 74% 46%` |
| `--status-claimed` | `#7A3C99` | `280 44% 42%` |
| `--status-in-transit` | `#AD7B00` | `43 100% 34%` |
| `--status-received` | `#12876E` | `167 76% 30%` |
| `--status-lost` | `#BB2B29` | `1 64% 45%` |

Component clocks follow the brief: platelets take the crimson (they carry the
48-hour clock and the demo follows them), RBC the gold, plasma a calm slate.
Plasma moved off teal at `205 32% 42%` because the validated `received` green
is itself a green-teal and the two were too close to separate.

One knock-on the validator cannot catch, found by looking at the rendered page:
because platelets' clock colour *is* the crimson, a platelet inside its window
and a platelet under six hours were the same colour. The critical state now
also carries weight and a warning mark, so it never depends on colour alone.

### Type

Lufga is commercial and is not fetched. `@font-face` rules point at
`public/fonts/` so licensed files are picked up with no code change, and the
stack falls through otherwise. See `frontend/public/fonts/README.md`.

- **Display — Fraunces.** A high-contrast serif with genuine personality and
  optical sizing, standing in for the hero treatment in the reference. It suits
  a blood-logistics product because the brand surfaces are asking someone to
  care about a person, not to read a number: that argument wants a voice, and a
  geometric sans does not have one.
- **UI — Plus Jakarta Sans.** Geometric humanist, tall x-height, the same
  register as Lufga. It carries every table, label and countdown. Chosen for
  unambiguous digits and a wide weight range, because most of this application
  is numbers that change while you are looking at them.

Numbers that tick use `tabular-nums` everywhere, so a digit-width change never
shifts the layout mid-shot.

---

## 6. Correctness problems found and fixed

| Problem | Effect | Fix |
|---|---|---|
| `AuthProvider` initialised to `DEMO_PERSONAS.BLOOD_CENTRE` on empty storage | `isAuthenticated` permanently true; `/login` unreachable; no route guarded | Initial state `null`; `RequireAuth` wraps every non-login route with `?next=` preservation |
| Unknown email produced a working hospital session | Anyone could reach another facility's data by typing any address | Persona fallback matches known demo accounts only, otherwise throws |
| `getAuthHeaders` on the context, plus a direct `sessionStorage` read in `client.ts` | Two readers of one key, free to drift | `client.ts` keeps its read (it must work outside React); `getAuthHeaders` deleted. One writer, one shape |
| Restored Cognito session used a possibly-expired token | Every query 401s after the tab is reopened | Token refreshed once on boot; session cleared if the refresh fails |
| `useInTransitMutation(unitId)` called with a string, typed as an object | Type error; the call was already broken | Both transfer mutations take `{ unitId, ... }` |
| `MatchBreakdown` drew `distanceKm` as a 0–1 bar | 4.2 km rendered as "420% of a sub-score" | Distance is its own row: real kilometres, the derived sub-score, and its weight |
| `TransferTimeline` left a `RECEIVED` unit's final step marked "in progress" | A completed transfer never looked completed | Terminal status completes its own step |
| `ComponentClockBadge` claimed RBC keeps 42 days and plasma 1 year | Contradicted `config.ts` (35 and 365) | Read from config |

---

## 7. What is deliberately not built

**Status updated after Blocks 1–3 (September 2026).**

Items previously listed as missing that are now implemented:

| Item | Was | Now |
|---|---|---|
| `POST /requisitions`, `GET /requisitions` | `backend/src/api/requisitions.ts` was `export {}` — not deployed | Block 1: real handler, Zod-validated, writes `REQ#` item + audit event, starts `RequisitionEscalationStateMachine` |
| `POST /pools`, `GET /pools` | No endpoints, `DonorPool` type existed in `shared` only | Block 2: real coordinator-managed pool CRUD; `POOL#<id>` key shape; GSI1 `POOLS` partition |
| `/mobilise/:token` (public unauthenticated) | No donor or community routes at all | Block 3: secure one-time acknowledgement link; atomic DynamoDB transaction; SES notification via `mobilisation-notifications.ts` |

Items that remain deliberately out of scope:

- `/donor`, `/donor/register` — individual donor registration and accounts.
  Community pools are aggregate-count only; no individual donor directory
  exists and none will be built.
- A dark theme. One theme done properly beats two done partly, and this is a
  daytime demo.
- A network-wide offer list on the coordinator map, and a fetched audit trail
  on unit detail. Both need endpoints that do not exist; both are stated on
  screen rather than faked.
- RFID, barcode scanning, cold-chain telemetry, e-RaktKosh/BBMS integration,
  demand forecasting, and courier routing — all remain roadmap items per
  `docs/LEARNINGS.md`.
