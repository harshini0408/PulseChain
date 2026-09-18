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

---

## 8. The Frontend Re-theme: What Changed, and Why the Surface Had to Split in Two

The frontend we started this pass with was not a sketch. Eight pages and about
forty components were already wired to live query hooks against deployed
endpoints, and the countdowns already ticked in the browser rather than waiting
on a poll. What it lacked was not function but coherence, and the specific
incoherence turned out to be instructive.

The repository already had a complete design token system. `styles/index.css`
defined a full HSL palette and `tailwind.config.ts` mapped every token onto a
Tailwind colour name. Underneath that, 199 lines across 21 files reached past
all of it and wrote `slate-900`, `emerald-400`, `blue-500` directly, alongside
`dark:` variants in seventeen files and hardcoded hex values for the corridor
map's rings. The tokens were not wrong; they were simply unused. The lesson we
take from that is that a token system is not a design decision, it is a
constraint, and a constraint that nothing enforces is a suggestion. What made
the re-theme stick this time was not better tokens but three greppable rules —
no colour outside `index.css`, no status label or colour outside
`lib/status.ts`, no threshold outside `shared/src/config.ts` — each of which
fails loudly in a single command. The rules did more for consistency than any
amount of care would have.

The `dark:` variants deserve their own note, because our own brief had them
wrong. We had assumed they never activated, on the grounds that no `darkMode`
strategy was configured. Tailwind v3 defaults that setting to `media`, so every
one of those variants had in fact been firing all along on any machine set to
dark mode, producing a half-themed interface rather than no theme at all. The
remedy was the same either way, but the reasoning mattered: we had been
explaining away a real bug with a wrong mechanism, and only checking the
framework's default settled it.

The substantive design decision was to split the application into two surface
tiers, and it is worth being precise about why, because the reference material
pointed the other way. The design direction we were handed is a blush-on-blush
brand aesthetic — soft gradients, generous whitespace, a high-contrast display
serif, rounded cards in low contrast against a tinted field. It is genuinely
good, and on a landing page it does exactly what it should: it makes you feel
something about a stranger who needs blood. The problem is that the operator
consoles are not asking you to feel anything. They are asking you to tell
`AVAILABLE` from `RESCUE_PENDING` from `CLAIMED` from `IN_TRANSIT` at a glance,
under time pressure, while a clock runs down. That distinction is carried
almost entirely by colour, and a low-contrast blush field eats low-contrast
status colours alive. Applied uniformly, the brand aesthetic would have
destroyed the status system — and the status system is the product.

So the brand treatment now covers the login page, the impact hero, the empty
states and the 404, and the consoles get a restrained derivative: the same
palette and the same typefaces, but white cards on a very pale blush neutral,
tighter vertical rhythm, twelve-pixel radii instead of twenty-four, and status
colours held at full strength. The blush is the room; the status colours are
the instruments. The only connective tissue between the tiers is the typeface
pairing and the crimson accent, and that turns out to be enough — the two
halves read as one product without the quiet half having to pretend it is
marketing.

The most useful thing we did to the palette was stop trusting our eyes. We ran
the five status hues through a colour-vision validator as a categorical set,
all pairs, against the actual blush surface, and three separate failures came
back that we would not have caught by looking. The first we had at least
anticipated: amber and crimson collapsed into each other, sitting at a
colour-difference of 12.4 with normal vision and 8.2 under deuteranopia, and
in-transit had to move to a true gold at hue 43 to separate. The second we had
not anticipated at all — a violet `claimed` was barely distinguishable from a
blue `open`, two states whose confusion would be materially misleading on a
stock console, and it had to move a long way round the wheel to hue 280. The
third was the one that mattered most. A conventional green `received` failed
against the crimson under deuteranopia: the classic red/green trap, and here it
was the exact pair carrying "saved versus lost" on the impact chart. It became
a green-teal at hue 167, which then forced plasma off teal in turn. The final
set passes every pair on every check, with the worst pair at 8.3 under
deuteranopia and 15.5 with normal vision.

The validator could only take us so far, though, and the gap is instructive.
Because platelets' component clock colour *is* the crimson — a deliberate
choice, since platelets carry the forty-eight-hour clock this whole system
exists for — a platelet unit inside its alert window and a platelet unit with
under six hours left rendered in exactly the same colour. No pairwise palette
check catches that, because the two states legitimately share a token. We only
found it by building the page, screenshotting it, and looking at the result,
and the fix was to stop making that state depend on colour at all: the critical
countdown now also carries weight and a warning mark. The general lesson is
that computable checks and looking at the thing are not substitutes for one
another. The validator found three problems we could not see; looking found one
the validator could not.

Working against the real API also corrected two page designs that had been
specified from the schema rather than from the deployed behaviour. We had
specified the hospital transfers page as a filter over that hospital's own
stock query. In practice a unit's `facilityId` only moves to the recipient when
the transfer is marked received, so a claimed or in-transit unit is still filed
under the origin blood centre and never appears in the hospital's stock at all
— the page would have been permanently empty for exactly the two states it
exists to show. It now composes the inbox, which names which units this
facility claimed, with a per-unit read for each one's live status. Similarly,
we had specified the corridor map to light up facilities holding an open offer,
and no deployed endpoint lists offers network-wide. Rather than invent it, the
map highlights facilities inside the escalating ring, computed by haversine
from real coordinates, and a line underneath says exactly that. The claimant,
which *is* real, comes from the unit's own record.

That pattern — state the limit on screen rather than fake the capability — is
the one we would defend hardest. There is no requisitions API: the handler is
an empty stub with no route. We could have made the page look complete. Instead
the fiction lives in exactly one file, `api/requisitionsAdapter.ts`, which
opens with a comment explaining what is missing and what to change when the
endpoint ships, carries the same function signatures the real API would have,
and is labelled on screen wherever its data appears. The same goes for the unit
timeline, which is derived from the unit's own fields because no audit endpoint
exists, and says so at the bottom of the page. A stated limitation costs a
sentence. A button that returns 404 during a recorded demo costs the demo.

The last thing worth recording is about motion, because it was the easiest
place to overspend. The interface has framer-motion available and uses it in
exactly three places: a unit row flipping into `RESCUE_PENDING`, an offer card
arriving in an inbox, and the escalation ring expanding on the map. Those three
are the moments where the system does something on its own and a human needs to
notice. Everything else — toasts, dialogs, expanding panels, hover states —
resolves instantly. The discipline is not aesthetic preference. In a recorded
demo where every state change has to land inside one three-and-a-half-second
poll, motion is a pointer, and a pointer that indicates everything indicates
nothing.
