# PulseChain — Project Structure

Monorepo using npm workspaces. TypeScript everywhere so compatibility and scoring logic is written once in `shared/` and used by both the Lambdas and the React app.

Put this file at the repo root as `docs/PROJECT_STRUCTURE.md` and point Antigravity to it in every prompt.

---

## 1. Folder tree

```text
pulsechain/
├── README.md                         Pitch sentence, setup, architecture diagram, demo steps
├── package.json                      Root: npm workspaces + shared scripts
├── tsconfig.base.json                Strict TS settings every package extends
├── .gitignore                        node_modules, dist, .aws-sam, .env*
├── .env.example                      AWS_REGION, TABLE_NAME, SES_FROM
│
├── docs/
│   ├── PROJECT_STRUCTURE.md          This file
│   ├── SCHEMA.md                     DynamoDB contract (already written)
│   ├── ARCHITECTURE.md               AWS diagram + why each service
│   ├── DEMO_SCRIPT.md                3-minute timed script
│   └── LEARNINGS.md                  What was new to each teammate (judging criterion)
│
├── infra/
│   └── db/
│       ├── pulsechain-table.json     aws dynamodb create-table input (already written)
│       └── sample-items.json         batch-write smoke test (already written)
│
├── shared/                           @pulsechain/shared — pure logic, no AWS SDK
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts                  Re-exports everything
│   │   ├── enums.ts                  BloodGroup, Component, UnitStatus, OfferStatus, ReqStatus, EscalationStatus, AuditEventType
│   │   ├── types.ts                  Facility, Unit, Offer, Requisition, Escalation, AuditEvent, DonorPool, DailyStats, MatchBreakdown
│   │   ├── keys.ts                   Every PK/SK/GSI key builder (only place keys are built)
│   │   ├── config.ts                 Thresholds, offer windows, ring radii, score weights; DEMO vs PROD mode
│   │   ├── compatibility.ts          ABO/Rh rules for RBC, plasma, platelets (IDENTICAL > COMPATIBLE > ACCEPTABLE)
│   │   ├── scoring.ts                Deterministic ranking + per-factor breakdown + reason text
│   │   ├── parsing.ts                Deterministic multilingual parser (ta / hi / en)
│   │   ├── parsing/
│   │   │   └── keywords.ts           Auditable language lookup tables
│   │   ├── time.ts                   hoursRemaining, isPastThreshold, padDistance, isoNow
│   │   └── schemas.ts                zod schemas for API input and deterministic requisition parsing
│   └── tests/
│       ├── compatibility.test.ts     Vitest — must pass before demo
│       ├── scoring.test.ts
│       └── parsing.test.ts
│
├── backend/                          AWS SAM app
│   ├── template.yaml                 Table, HTTP API + Cognito authorizer, Lambdas, Scheduler, state machines, SES policy
│   ├── samconfig.toml                Stack name, region ap-south-1
│   ├── package.json
│   ├── tsconfig.json
│   ├── events/                       Sample JSON events for `sam local invoke`
│   ├── statemachine/
│   │   ├── unit-escalation.asl.json          Ring 1 → wait → check → ring 2 → wait → regional → mark lost
│   │   └── requisition-escalation.asl.json   Network search → wait → donor tier
│   └── src/
│       ├── lib/
│       │   ├── db.ts                 DocumentClient, get/query/transact helpers
│       │   ├── transitions.ts        Status change + audit write in one transaction (the only way state changes)
│       │   ├── audit.ts              Audit event builder
│       │   ├── stats.ts              ADD unitsSaved / unitsLost to STATS#DAY
│       │   ├── http.ts               JSON responses, error mapping, CORS
│       │   ├── auth.ts               Read role + facilityId from Cognito JWT claims
│       │   └── ses.ts                Offer notification email
│       ├── api/                      API Gateway handlers
│       │   ├── facilities.ts         GET /facilities, GET /facilities/{id}
│       │   ├── units.ts              GET /facilities/{id}/stock, POST /units, GET /units/{id}
│       │   ├── offers.ts             GET /inbox, POST /offers/{id}/claim, POST /offers/{id}/decline
│       │   ├── transfers.ts          POST /units/{id}/in-transit, POST /units/{id}/received
│       │   ├── requisitions.ts       GET/POST /requisitions
│       │   ├── parse.ts              POST /requisitions/parse (deterministic parser)
│       │   ├── escalations.ts        GET /escalations/active (coordinator)
│       │   ├── dashboard.ts          GET /dashboard/impact
│       │   └── demo.ts               POST /demo/sweep-now, POST /demo/reset
│       └── workers/                  Scheduler + Step Functions tasks
│           ├── sweep.ts              Find units past threshold → RESCUE_PENDING → start execution
│           ├── lost-check.ts         RESCUE_PENDING units past true expiry → LOST
│           ├── match-ring.ts         Candidates in ring → compatibility → score → rank
│           ├── create-offers.ts      Write offers for top N + SES notify
│           ├── check-offers.ts       Claimed? → resolve; else expire open offers
│           ├── finish-escalation.ts  RESOLVED / EXHAUSTED + audit
│           └── donor-tier.ts         Rank seeded pools for an unfilled requisition
│
├── seed/                             Data generation and loading
│   ├── package.json
│   ├── data/
│   │   ├── facilities.json           12–20 real corridor facilities with real lat/lng
│   │   └── donor-pools.json          PSG iTech and 2–3 other seeded pools
│   └── src/
│       ├── generate.ts               ~150 units with realistic expiry spread, demand profiles, requisitions, 60 days of stats
│       ├── distances.ts              Haversine for every facility pair → DIST# items
│       ├── load.ts                   Batch-write in chunks of 25
│       ├── stage-demo.ts             Two platelet units just inside threshold (success path + failure path)
│       └── reset.ts                  Delete all but FACILITY#/POOL#, reload + stage
│
└── frontend/                         Vite + React + Tailwind, deployed on Amplify Hosting
    ├── package.json
    ├── index.html
    ├── vite.config.ts
    ├── tailwind.config.ts
    ├── postcss.config.js
    ├── tsconfig.json
    ├── .env.example                  VITE_API_URL, VITE_USER_POOL_ID, VITE_USER_POOL_CLIENT_ID
    └── src/
        ├── main.tsx
        ├── App.tsx                   Router + QueryClientProvider + auth guard
        ├── styles/index.css          Tailwind layers + design tokens
        ├── auth/
        │   ├── amplify.ts            Amplify Auth config
        │   ├── AuthProvider.tsx      Session, role, facilityId
        │   └── RequireRole.tsx       Route guard per role
        ├── api/
        │   ├── client.ts             fetch wrapper with JWT
        │   └── hooks.ts              TanStack Query hooks (polling every 3–5 s)
        ├── lib/
        │   ├── format.ts             Groups, components, ₹, km
        │   └── useCountdown.ts       Client-side ticker
        ├── components/
        │   ├── layout/               AppShell, Sidebar, TopBar, RoleSwitcher (demo)
        │   ├── ui/                   Button, Card, Badge, StatusPill, EmptyState, Spinner, Toast
        │   ├── stock/                StockTable, UnitRow, ComponentClockBadge
        │   ├── offers/               OfferCard, MatchBreakdown, ClaimButton, CountdownRing
        │   ├── transfers/            TransferTimeline
        │   ├── escalation/           CorridorMap (SVG), RingPulse, FacilityDot, EscalationList
        │   ├── requisitions/         RequisitionForm, ParsePanel, RequisitionList
        │   └── dashboard/            StatTile, TrendChart, SavedLostBar
        └── pages/
            ├── LoginPage.tsx
            ├── centre/StockConsolePage.tsx
            ├── hospital/OfferInboxPage.tsx
            ├── hospital/RequisitionsPage.tsx
            ├── hospital/TransfersPage.tsx
            ├── coordinator/EscalationMapPage.tsx
            ├── coordinator/ParseRequestPage.tsx
            └── ImpactPage.tsx
```

---

## 2. Screen → route → role

| Route | Page | Role |
|---|---|---|
| `/login` | LoginPage | all |
| `/centre/stock` | StockConsolePage | BLOOD_CENTRE |
| `/hospital/inbox` | OfferInboxPage | HOSPITAL |
| `/hospital/requisitions` | RequisitionsPage | HOSPITAL |
| `/hospital/transfers` | TransfersPage | HOSPITAL |
| `/coordinator/escalations` | EscalationMapPage | COORDINATOR |
| `/coordinator/parse` | ParseRequestPage | COORDINATOR |
| `/impact` | ImpactPage | all |

---

## 3. Root package.json

```json
{
  "name": "pulsechain",
  "private": true,
  "workspaces": ["shared", "backend", "seed", "frontend"],
  "scripts": {
    "test": "npm run test -w shared",
    "dev": "npm run dev -w frontend",
    "build:backend": "npm run build -w backend",
    "deploy:backend": "cd backend && sam build && sam deploy",
    "seed": "npm run load -w seed",
    "reset": "npm run reset -w seed"
  }
}
```

Packages import shared logic as `@pulsechain/shared`. SAM builds Lambdas with `BuildMethod: esbuild`, which bundles the shared package into each function.

---

## 4. Ownership (4 builders)

| Person | Owns |
|---|---|
| A — backend | `backend/`, `shared/keys.ts`, `shared/scoring.ts` |
| B — frontend | `frontend/src/pages`, `api/`, `auth/` |
| C — data + parsing | `seed/`, `shared/compatibility.ts`, `shared/src/parsing.ts`, Cognito users |
| D — design + pitch | `frontend/src/components/ui`, `escalation/`, `dashboard/`, `docs/` |

---

## 5. Conventions

- Keys only via `shared/keys.ts`. Status changes only via `backend/src/lib/transitions.ts`.
- Timestamps ISO 8601 UTC. Distances padded `000.0`.
- All thresholds, windows and weights come from `shared/config.ts`. No magic numbers elsewhere.
- Lambdas never contain business rules that the UI also shows. Those live in `shared/`.
- Every page has designed empty, loading and error states.
- No signup, settings or profile pages.

---

## 6. Antigravity prompts (run in order, verify after each)

**Prompt 1 — Skeleton**
> Read docs/PROJECT_STRUCTURE.md and docs/SCHEMA.md. Create the monorepo skeleton exactly as the folder tree describes: root package.json with npm workspaces, tsconfig.base.json, .gitignore, .env.example, and a package.json + tsconfig.json for shared, backend, seed and frontend. Create every listed file as an empty stub with a one-line comment describing its purpose. Do not write business logic yet. Then run `npm install` and confirm the workspace resolves `@pulsechain/shared`.

**Prompt 2 — Shared module**
> Implement shared/src: enums.ts, types.ts, keys.ts and time.ts, matching docs/SCHEMA.md exactly (key formats, status enums, attribute names). Implement config.ts with DEMO and PROD modes: platelets 48h, RBC 7 days, plasma 30 days thresholds; ring radii 10 and 30 km; offer window 90 s in DEMO. Leave compatibility.ts and scoring.ts as typed function signatures only. Add Vitest.

**Prompt 3 — Backend skeleton**
> Implement backend/template.yaml for AWS SAM in ap-south-1: the PulseChain table from infra/db/pulsechain-table.json, an HTTP API, a Node.js 20 esbuild Lambda for backend/src/api/facilities.ts returning GET /facilities from GSI1 `FACILITIES`, and lib/db.ts + lib/http.ts. No Cognito, Step Functions or Scheduler yet. It must deploy with `sam build && sam deploy --guided`.

**Prompt 4 — Frontend skeleton**
> Scaffold frontend with Vite, React, TypeScript, Tailwind, React Router and TanStack Query. Create AppShell and all routes from section 2 as placeholder pages with designed empty states. Implement api/client.ts using VITE_API_URL and one hook that lists facilities from GET /facilities. No auth yet.

After Prompt 4, the deployed frontend should list the seeded facilities from the deployed API. That is Thursday night's milestone.
