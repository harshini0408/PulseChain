# PulseChain

PulseChain automatically detects blood components approaching expiry, finds nearby facilities that need that exact component, creates a time-limited redistribution offer, and escalates outward until the unit is saved or expires.

## Quick Start

```bash
# Install all workspace dependencies
npm ci

# Start the frontend dev server
npm run dev -w frontend

# Build the frontend (type-check + Vite bundle)
npm run build -w frontend
```

## Environment Variables

Copy `frontend/.env.example` to `frontend/.env.local` and fill in:

```
VITE_API_URL=<your deployed API Gateway URL>
VITE_USER_POOL_ID=       # added in the auth step
VITE_USER_POOL_CLIENT_ID= # added in the auth step
```

## Architecture

```
pulsechain/
├── shared/      @pulsechain/shared — pure TypeScript logic (enums, types, scoring)
├── backend/     AWS SAM — Lambda + API Gateway + DynamoDB + Step Functions
├── seed/        Data generator — facilities, units, requisitions, stats
└── frontend/    Vite + React 18 + Tailwind — Amplify Hosting
```

## Deploying the Frontend (Amplify Hosting)

1. Connect your GitHub repo to AWS Amplify Hosting.
2. Amplify detects `amplify.yml` at the repo root for the monorepo build.
3. **Add a rewrite rule** in the Amplify Console → App settings → Rewrites and redirects:
   - **Source**: `</^[^.]+$|\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json)$)([^.]+$)/>`
   - **Target**: `/index.html`
   - **Type**: `200 (Rewrite)`

   This ensures React Router client-side routes work correctly when users navigate directly to a URL or refresh the page.

## Demo

Use the **role switcher** in the top bar to switch between Blood Centre, Hospital, and Coordinator views. No authentication is required for the demo — it arrives in the auth step.
