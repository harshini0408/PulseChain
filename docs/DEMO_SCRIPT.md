# PulseChain — demo script

Click-by-click, with the expected screen state at each step.

The run is built to be legible with the sound off. Every step below is a single
visible state change landing on one 3.5-second poll cycle. **If a step needs
spoken explanation to make sense, its UI is not finished** — that is the bar,
and it is the reason the interface looks the way it does.

---

## 1. What to say, and what never to say

### Three things to say, verbatim

1. **The boundary**
   > "PulseChain operates across real healthcare facilities in Coimbatore using
   > synthetic demo inventories. It is strictly an administrative coordination
   > and rescue brokering system — pre-transfusion testing, blood grouping,
   > cross-matching, donor eligibility, storage, cold-chain transport and
   > clinical release remain the sole legal responsibility of licensed blood
   > centres and transfusion committees."

2. **The cost reasoning, in one breath**
   > "Zero idle cost: scheduled sweeps eliminate continuous polling, precomputed
   > haversine distance partitions in DynamoDB eliminate geospatial API fees,
   > and deterministic in-process parsing eliminates model inference latency and
   > hallucination risk."

3. **What is next**
   > "Our next step is HL7/FHIR and CSV inventory ingestion adapters into State
   > Blood Transfusion Council and e-RaktKosh hospital networks."

### Four things never to say

1. **Never** "We're solving India's blood shortage." We address platelet
   wastage against a five-day expiry clock, not donor recruitment.
2. **Never** "Nothing like this exists." PRAVAH, Bloodbuy and eBloodConnect are
   prior art; knowing them shows domain maturity.
3. **Never** "Our AI decides who receives blood." There is no AI here. Matching
   is deterministic and clinically bounded.
4. **Never** "We integrated with real blood banks." We coordinate real
   geographic facilities using synthetic inventory.

---

## 2. Before you record

| Check | Why |
|---|---|
| `VITE_DEMO_MODE=true` in the built bundle | Otherwise the demo toolbar is not rendered at all |
| Four browser **windows**, not tabs | Session identity is in `sessionStorage`, which is per-window. Tabs share it and both hospitals would become the same facility |
| Press **Reset demo** and wait for the toast | Stages the units the run depends on |
| Connection dot green in every window | Amber means the API is reachable but slow; crimson means it is not reachable. Fix before rolling |

**Window layout**

| Window | Sign in as | Route |
|---|---|---|
| A — Coordinator | Regional Blood Coordination Centre | `/coordinator/escalations` |
| B — Blood centre | Coimbatore SNS Blood Centre | `/centre/stock` |
| C — Hospital 1 | Kovai Medical Centre and Hospital | `/hospital/inbox` |
| D — Hospital 2 | a second hospital persona | `/hospital/inbox` |

The demo toolbar is the floating crimson button at the bottom right of any
window. Click it to reveal **Run sweep now** and **Reset demo**.

---

## 3. The run

### Step 1 — Open on the corridor at rest
**Window A**, `/coordinator/escalations`.

**Expected:** The map renders the corridor with ring 1 drawn and the origin
marked in oxblood. No escalation is selected, so the list panel shows the
designed empty state — "The corridor is quiet." — not a blank box. A line under
the map states how many facilities sit beyond the current frame.

### Step 2 — Show the clock that is running out
**Window B**, `/centre/stock`.

**Expected:** The target platelet unit is **first in the table**, because the
table sorts by time remaining. Its "Expires in" cell ticks down once a second
in the platelet crimson. The alert strip above shows a non-zero **In alert
window** count.

Point at the countdown. It is recomputed in the browser every second from
`expiresAt`, so it never freezes between polls.

### Step 3 — Show both inboxes empty
**Windows C and D**, `/hospital/inbox`.

**Expected:** Both show the designed empty state: *"No offers right now. Nearby
units that match what you need will appear here."* This is the opening frame.

### Step 4 — Press **Run sweep now**
**Window B**, demo toolbar → **Run sweep now**.

**Expected:** A toast reads *"Sweep complete — N units swept."*

### Step 5 — The unit flips, within one poll
**Window B**, without touching anything.

**Expected, inside 3.5 seconds:**
- The row's status pill changes to **Rescue pending**.
- The row flashes its component colour once and keeps an **animated crimson
  left edge** for as long as the rescue is live.
- The **Rescue** column fills in: ring badge, and a live countdown to the next
  ring advance.
- **Rescue in progress** in the alert strip increments.

This is the shot the camera should be on. It is one of exactly three places in
the application that spend motion.

### Step 6 — The map draws the ring
**Window A**.

**Expected:** The new escalation appears in the list and is selected. Ring 1
pulses. Facilities inside that ring light up and dashed spokes run out to them
from the origin. The Selected panel names the subject unit, the ring and its
band in kilometres, and counts down to the next ring advance.

> Say plainly what this is: highlighted facilities are the ones **inside the
> escalating ring**, computed by haversine from real coordinates. No deployed
> endpoint lists offers network-wide, and the line under the map says so. Do
> not claim it is showing live offer state.

### Step 7 — Offers arrive in both inboxes
**Windows C and D**.

**Expected:** An offer card animates in under **Needs your decision**, carrying:
- the blood group and component as the dominant element;
- the origin facility name and its distance;
- a **countdown ring** running against `claimBy` — the claim window;
- a secondary line counting down the **unit's own expiry**, which is a
  different clock and is labelled as one;
- the ring badge and the backend's own `reason` sentence;
- **Why this offer**, which expands the weighted match breakdown.

Expand the breakdown in one window. Note that distance is shown as kilometres
with its derived sub-score and weight, not as a bar pretending to be a 0–1
score.

### Step 8 — Both hospitals claim at once — **this is the shot**
**Windows C and D**, press **Claim** in both as close to simultaneously as you
can manage.

**Expected:**
- **One window wins.** Its card moves to a claimed state with a success toast
  and a link through to Transfers.
- **The other loses**, and its card **flips to a failure banner carrying the
  backend's exact message** — *"Already claimed by ‹facility name›"* — with the
  same message repeated in an error toast.
- The losing card **holds that message on screen for four seconds** and only
  then drops out. It is never removed silently.

**Hold the frame here.** This is the atomic `TransactWriteItems` condition
failure surfacing as something a human can read. Do not cut early.

### Step 9 — The centre and the map catch up
**Window B:** the unit's status pill becomes **Claimed** and the animated edge
stops — the rescue is over.

**Window A:** a solid line is drawn from the origin to the claiming facility,
and that facility's dot turns to the received colour. The Selected panel gains
a **Claimed by** row. This one is real data: it comes from the unit's own
`claimedBy`.

### Step 10 — Close the chain of custody
**Winning hospital window**, `/hospital/transfers`.

**Expected:** The unit appears under **In progress** with a three-step stepper —
Claimed → In transit → Received.

1. Press **Mark in transit.** The stepper advances; the status pill turns gold.
2. Press **Confirm received.** A confirmation dialog explains this closes the
   chain and cannot be undone from the interface. Confirm it.

**Expected:** The unit moves to **Completed**, all three steps complete, and a
single sentence appears beneath it:

> *"This O+ platelets unit reached you with 9h 30m left on its clock."*

That sentence is computed from `expiresAt` minus `receivedAt`. It is one line
and it is the point of the whole system. Let it sit; do not talk over it.

### Step 11 — The number moves
**Any window**, `/impact`.

**Expected:** The hero line names how many units reached a patient instead of a
bin, and **Units saved** and **Value saved** have incremented. The trend chart
plots saved against lost on one axis — saved solid, lost dashed, both in the
legend and both available as a table via **Show as table**.

---

## 4. Rehearsed failure modes

| Mode | How to trigger | What the camera sees |
|---|---|---|
| **Designed empty state** | Start on `/hospital/inbox` before the sweep | A composed blush panel with specific copy saying what would appear here and what would cause it — not a spinner, not a blank area |
| **Double-claim 409** | Step 8 | The backend's exact message rendered verbatim, held for four seconds, in both the card and a toast. No crash, no stale card, no generic "Something went wrong" |
| **Parser fallback** | `/coordinator/parse`, paste unstructured text | Fields the parser cannot read stay **empty** and are listed under "Needs input". It never guesses a blood group. Create stays disabled until a human fills the gaps |
| **API degraded** | Throttle the network | The connection dot in the top bar goes amber (reachable, slow) or crimson (unreachable), and says which on hover |

---

## 5. Two limits to state out loud if asked

Both are visible in the interface; neither is hidden.

- **Requisitions are session-local.** The requisitions API is not deployed —
  `backend/src/api/requisitions.ts` is a stub with no route. `/hospital/requisitions`
  and the hand-off from `/coordinator/parse` write to a clearly labelled
  in-memory adapter, and both pages say so permanently on screen. The
  escalation state machine and the donor-tier worker do exist server-side; they
  are simply not reachable over HTTP.
- **The unit timeline is derived, not fetched.** There is no
  `GET /units/{id}/audit`. `/centre/units/:unitId` builds its timeline from the
  unit's own fields and the matching active escalation, and says so at the
  bottom of the page. No audit rows are invented.

A stated limit costs far less than a button that 404s on camera.

---

## 6. Resetting between takes

1. Demo toolbar → **Reset demo**.
2. Confirm in the dialog. It says plainly that live data is wiped.
3. Wait for the toast: *"Demo data reset — N of N items reloaded in 4.8s."*
4. Every open window refreshes on its next poll; the reset invalidates every
   query key, so you do not need to reload any of them by hand.
