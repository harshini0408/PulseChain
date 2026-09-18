# PulseChain

> **Autonomous Blood & Platelet Rescue Brokering Network**  
> Built for the AWS Hackathon on a 100% serverless, zero-idle-cost architecture.

PulseChain automatically detects blood components (especially platelets) approaching their critical 5-day expiry window, discovers compatible nearby facilities, creates time-limited ranked rescue offers, and orchestrates outward multi-ring escalations until units are safely transfused.

---

## 1. System Architecture

```
                                    ┌───────────────────────┐
                                    │    Amplify Hosting    │
                                    │   (React + Vite SPA)  │
                                    └──────────┬────────────┘
                                               │
                                               ▼
                                    ┌───────────────────────┐
                                    │   API Gateway (HTTP)  │
                                    │ (Cognito JWT Authed)  │
                                    └──────────┬────────────┘
                                               │
               ┌───────────────────────────────┴───────────────────────────────┐
               ▼                                                               ▼
   ┌───────────────────────┐                                       ┌───────────────────────┐
   │    REST API Lambdas   │                                       │  Step Functions SFN   │
   │ (Units, Offers, etc.) │                                       │ (Unit-Escalation ASL) │
   └──────────┬────────────┘                                       └──────────┬────────────┘
              │                                                               │
              └───────────────────────────────┬───────────────────────────────┘
                                              ▼
                                   ┌───────────────────────┐
                                   │  Amazon DynamoDB Table│
                                   │ (Single-Table Schema) │
                                   └──────────┬────────────┘
                                              │
                                   ┌──────────┴────────────┐
                                   ▼                       ▼
                        ┌────────────────────┐   ┌────────────────────┐
                        │     Amazon SNS     │   │     Amazon SES     │
                        │ (Urgent SMS Alert) │   │ (Dispatch Manifest)│
                        └────────────────────┘   └────────────────────┘
```

### Approved Free-Tier AWS Footprint
- **Amplify Hosting**: Static SPA deployment.
- **Amazon Cognito**: Real User Pool (`ap-south-1_vKrvtjKcl`) authentication and token issuance.
- **Amazon API Gateway**: HTTP API with JWT authorizers.
- **AWS Lambda**: Node.js 20.x on ARM64 Graviton architecture.
- **Amazon DynamoDB**: Single-table design (`PulseChain`) with sparse GSIs.
- **AWS Step Functions**: Standard workflows driving multi-ring concentric escalation.
- **Amazon EventBridge Scheduler**: Cron sweep trigger (`0 3,15 * * ? *`).
- **Amazon SNS & SES**: SMS alerts and cold-chain transfer manifests.
- **Amazon S3**: Artifact and deployment template packaging.

> [!NOTE]
> **Zero Amazon Bedrock / Generative AI:** Multi-token parsing across English, Tamil, and Hindi and 8x8 compatibility matrices are 100% deterministic and execute in-process in <1ms.

---

## 2. Monorepo Structure

```
pulsechain/
├── shared/     # @pulsechain/shared — Pure TypeScript business logic, scoring, and regex parser
├── backend/    # AWS SAM application — Lambda handlers, ASL workflows, and CloudFormation template
├── frontend/   # @pulsechain/frontend — React 18 + Vite + Tailwind CSS SPA hosted on Amplify
├── seed/       # Deterministic seed generator, distance matrices, and live verification suites
└── docs/       # Architecture, learnings, demo script, and schema specifications
```

---

## 3. Quick Start

### Installation
```bash
# Install root and workspace dependencies
npm install
```

### Running the Test Suites
```bash
# Run 224 unit tests across compatibility, scoring, and multilingual parsing
npm run test

# Run live AWS integration & dry-run test
npx tsx --env-file=.env seed/src/verify-prompt11.ts
```

### Running Locally
```bash
# Start frontend Vite development server
npm run dev -w frontend

# Compile frontend production bundle
npm run build -w frontend
```

---

## 4. Live Demo Personas & Credentials

All personas are provisioned in Amazon Cognito with real JWT authentication:

| Role | Facility ID | Facility Name | One-Click Demo Access |
| :--- | :--- | :--- | :--- |
| **Blood Centre** | `FAC_CBE_SNBC` | SNS Blood Centre, Coimbatore | Click **SNS Blood Centre** on `/login` |
| **Hospital** | `FAC_CBE_KMCH` | Kovai Medical Centre & Hospital | Click **KMCH Coimbatore** on `/login` |
| **Coordinator** | `COORDINATOR` | Regional Hub Coimbatore | Click **Regional Coordinator** on `/login` |

*Password for standard Cognito login:* `PulseChain2026!`

---

## 5. Key Documentation

- [docs/ARCHITECTURE.md](file:///c:/D/First_Commit/docs/ARCHITECTURE.md): System architecture, event sequence, cost reasoning, and schema design.
- [docs/LEARNINGS.md](file:///c:/D/First_Commit/docs/LEARNINGS.md): Scoping discipline, DynamoDB transactional race conditions, audit findings, and model trade-offs.
- [docs/DEMO_SCRIPT.md](file:///c:/D/First_Commit/docs/DEMO_SCRIPT.md): 3-minute timed recording walkthrough with exact boundary statements and failure modes.
