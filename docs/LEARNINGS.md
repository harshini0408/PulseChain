# PulseChain — Engineering Learnings & Retrospective

## 1. Scoping Discipline: What Was Cut and Why

The primary danger in a hackathon vertical slice is feature creep that obscures architectural correctness. From Prompt 01 onward, a strict **cut order** was maintained:

1. **Native Mobile App → Single Responsive SPA:** A Flutter/React Native build was cut immediately in favor of a responsive desktop-first web application usable down to 390px.
2. **Third-Party Logistics / GPS Tracking → Status Handshake:** Live vehicle telematics and GPS breadcrumbs were replaced with a verifiable 3-state chain of custody (`CLAIMED` → `IN_TRANSIT` → `RECEIVED`). Cold-chain transport verification remains the legal domain of logistics carriers.
3. **Donor Management & Scheduling → Pre-Banked Component Inventory:** PulseChain deliberately scopes itself to *already collected and processed* units facing expiry. Upstream donor recruitment is a separate domain with different compliance frameworks.
4. **Bedrock Generative AI → Deterministic Rule Engines:** Fully removed during Prompt 08b. When the service list was capped, dropping the LLM was an easy trade because non-deterministic generation introduces medical liability in clinical triage.

The cut order held under time pressure. As a result, the core engine—sweep, multi-ring matching, atomic claiming, and Step Functions escalation—was never compromised.

---

## 2. DynamoDB Single-Table Design & Sparse GSIs

### Partitioning Strategy
DynamoDB single-table design requires structuring data around access patterns rather than relational entities:
- **`PK = FACILITY#<id>` with `SK = DIST#<km:05.1f>#<toId>`:** Storing precomputed distance matrices alongside facility profiles allows concentric ring lookups using simple lexicographical range queries (`BETWEEN DIST#000.0 AND DIST#010.0~`).
- **GSI1 as an Active Work Queue:** By projecting `GSI1PK = QUEUE#AVAILABLE#<component>` and `GSI1SK = <expiresAt>`, only units that are currently available populate the index. Once claimed or expired, `GSI1PK` is removed, keeping index reads minimal and cheap.
- **GSI2 for Live Clinical Stock:** Sorted strictly by expiry ascending (`<expiresAt>#<unitId>`), allowing blood bank technicians to immediately see the units at imminent risk on top of their console without client-side sorting.

---

## 3. Idempotency & Concurrency: The Atomic Claim Transaction

In high-stakes blood brokering, two hospitals must never be permitted to claim the same unit.

### Race Condition Mitigation
A naïve implementation queries an offer, checks if it is available in application memory, and then writes `CLAIMED`. Under concurrent requests, this produces catastrophic double-claims.

PulseChain eliminates this with a DynamoDB `TransactWrite` combining:
1. **Unit Status Guard**:
   ```typescript
   ConditionExpression: "attribute_exists(PK) AND #status = :available"
   ```
2. **Offer Status Guard**:
   ```typescript
   ConditionExpression: "attribute_exists(PK) AND #status = :open AND claimBy > :now"
   ```
3. **Atomic State Propagation**:
   The unit is set to `CLAIMED`, the winning offer is set to `CLAIMED`, and all rival offers issued across the ring are marked `SUPERSEDED` in the same atomic transaction.
4. **Immediate Step Functions Abort**:
   Upon transaction confirmation, the Lambda invokes `StopExecutionCommand` on the unit's active Step Functions state machine execution. If a second hospital submits a claim 5 milliseconds later, DynamoDB rejects the transaction with a `TransactionCanceledException`, returning an immediate HTTP `409 Conflict`.

---

## 4. Dropping the Managed Model: What Was Traded Away

Prompt 08b removed Amazon Bedrock entirely from the codebase, replacing it with a deterministic multilingual requisition parser in `shared/src/parsing.ts`.

### The Trade-off
- **What Was Traded Away:** The ability to parse free-form, conversational prose with arbitrary sentence structures, colloquial slang, or novel regional dialects.
- **What Was Gained:**
  - **Zero Cost & Sub-Millisecond Speed:** The regex parser runs in <1ms inside Lambda memory without external API round-trips or token bills.
  - **Determinism & Reproducibility:** Every execution produces an identical structured payload across English, Tamil, and Hindi.
  - **Bounded Keyword Tables:** Medical terminology (ABO blood groups, components, urgency indicators) is strictly bounded by human-verified lexicons:
    - *Tamil:* "தட்டணுக்கள்" (platelets), "குருதிச் சிவப்பணுக்கள்" (RBC), "பிளாஸ்மா" (plasma), "அவசரம்" (urgent).
    - *Hindi:* "प्लेटलेट्स" (platelets), "लाल रक्त कोशिकाएं" (RBC), "अति आवश्यक" (critical).

---

## 5. What the Audit Caught That Self-Review Missed

The Prompt 09-VERIFY audit was an invaluable engineering reality check. Self-review had marked the system as functioning, but live execution uncovered two critical flaws:

### Finding 1: The Broken Distance Score Formula (Audit Check 2.6)
- **The Bug:** The initial distance scoring formula was implemented as an exponential decay function that failed to scale appropriately, yielding `0.950` at 0 km and `0.939` at 45 km. Despite distance carrying 25% of the total ranking weight, it was acting as an effectively flat constant.
- **The Remediation:** Block 1 of Prompt 10 replaced the decay function with the exact linear clamped formula:
  $$\text{score} = \max\left(0, 1 - \frac{\text{distanceKm}}{30.0}\right)$$
  This restored genuine differentiation: a hospital 2 km away receives a distance sub-score of `0.933`, whereas a hospital 28 km away receives `0.067`.

### Finding 2: Client-Supplied Identity Headers (Audit Check 5.1 / 4.7)
- **The Flaw:** In the early vertical slice, the frontend passed an `x-user-role` and `x-facility-id` header directly to Lambda, which trusted it without token verification.
- **The Remediation:** Prompt 10 deployed a full AWS Cognito User Pool (`ap-south-1_vKrvtjKcl`), integrated real SRP password authentication with automated token refresh, and enforced API Gateway JWT authorizers. Client headers were purged; user identity and facility tenancy are extracted strictly from cryptographic JWT claims (`custom:facilityId`, `custom:role`).

Acknowledging these flaws during the audit was essential for reaching production-grade engineering rigor.

---

## 6. Known Unverified Items & Clinical Review Inventory

Per freeze checklist requirements, all remaining `// REVIEW:` and `// VERIFY:` items in the codebase are documented here:

### Clinical Policy Reviews (`shared/src/compatibility.ts`)
- **Minor ABO-Incompatible Platelet Transfusions (`shared/src/compatibility.ts:94`):**
  - *Context:* `// REVIEW: Some centres allow minor ABO-incompatible platelet transfusions (e.g. O into A) clinically — marked INCOMPATIBLE here per conservative policy.`
  - *Decision for vertical slice:* In clinical practice, some tertiary care hospitals permit low-titer minor ABO mismatch platelets under emergency protocols with antihistamine pre-medication. PulseChain strictly marks these `INCOMPATIBLE` by default as the safer, more conservative standard. Transfusion committee override remains future work.

### Multilingual Vernacular Lexicon (`shared/src/parsing/keywords.ts`)
The deterministic multilingual regex parser includes 8 colloquial phrases requiring native medical linguist sign-off prior to commercial deployment:
1. `shared/src/parsing/keywords.ts:40` — `"பிளேட்லெட்"`: Tamil phonetic transliteration of "platelet".
2. `shared/src/parsing/keywords.ts:41` — `"பிளேட்லெட்டுகள்"`: Tamil phonetic plural.
3. `shared/src/parsing/keywords.ts:97` — `"திரவ பிளாஸ்மா"`: Tamil term for liquid plasma.
4. `shared/src/parsing/keywords.ts:100` — `"ताजा प्लाज्मा"`: Hindi colloquial term for fresh plasma.
5. `shared/src/parsing/keywords.ts:216` — `"இன்னைக்கு நைட்டு"`: Colloquial Tamil spoken WhatsApp phrasing for "tonight".
6. `shared/src/parsing/keywords.ts:233` — `"நாளைக்கு காலையில"`: Colloquial Tamil spoken WhatsApp phrasing for "tomorrow morning".
7. `shared/src/parsing/keywords.ts:248` — `"இன்னைக்கு"`: Colloquial Tamil spoken term for "today".
8. `shared/src/parsing/keywords.ts:264` — `"நாளைக்கு"`: Colloquial Tamil spoken term for "tomorrow".

---

## 7. Future Integration Work

1. **BBMS Adapters (Blood Bank Management Systems):** Currently, inventory is ingested via REST API and staged seeds. In production, real-time HL7/FHIR or CSV sync adapters will connect directly into regional e-RaktKosh and SBTC (State Blood Transfusion Council) databases.
2. **Dynamic Courier Dispatch:** Automated integration with local courier APIs for temperature-monitored specimen dispatch upon offer claim.
3. **SMS Sender ID Registration:** SNS SMS notifications currently operate under AWS promotional tier / transactional sandbox; full TRAI DLT registration is required for commercial Indian sender IDs.
