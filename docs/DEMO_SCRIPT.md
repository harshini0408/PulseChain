# PulseChain — 3-Minute Timed Demo Script & Recording Guide

## 1. Ground Rules & Talking Points

### Three Things to Say (Verbatim)
1. **The Boundary:**
   > *"PulseChain operates across real healthcare facilities in Coimbatore using synthetic demo inventories. It is strictly an administrative coordination and rescue brokering system — pre-transfusion testing, blood grouping, cross-matching, donor eligibility, storage, cold-chain transport, and clinical release remain the sole legal responsibility of licensed blood centres and transfusion committees."*
2. **The Cost Reasoning (In One Breath):**
   > *"Zero idle cost: scheduled sweeps eliminate continuous polling, precomputed Haversine distance partitions in DynamoDB eliminate geospatial API fees, and deterministic in-process regex parsing eliminates model inference latency and hallucination risk."*
3. **What is Next:**
   > *"Our next step is building HL7/FHIR and CSV inventory ingestion adapters directly into State Blood Transfusion Council (SBTC) and e-RaktKosh hospital networks."*

### Four Things NEVER to Say
1. **NEVER say:** *"We're solving India's blood shortage."* (We address platelet wastage due to the 5-day expiry clock, not donor recruitment).
2. **NEVER say:** *"Nothing like this exists."* (PRAVAH, Bloodbuy, and eBloodConnect are prior art; knowing them demonstrates domain maturity).
3. **NEVER say:** *"Our AI decides who receives blood."* (There is no AI in this architecture; matching is 100% deterministic and clinically bounded).
4. **NEVER say:** *"We integrated with real blood banks."* (We coordinate real geographic facilities using synthetic test inventory).

---

## 2. Rehearsed Failure Modes

| Failure Mode | Rehearsal Action | Camera Presentation |
| :--- | :--- | :--- |
| **1. Designed Empty State** | Start recording on Hospital Inbox (`/hospital/inbox`) prior to sweep. | Display the calm, designed empty state: *"No offers right now — nearby near-expiry units will appear here in real time when regional sweeps trigger."* |
| **2. Double-Claim Rejection (409)** | Attempt a secondary claim on `DEMO_UNIT_CLAIM_001` or replay claim button. | Show the inline warning banner: `Offer Invalidated: Already claimed by Kovai Medical Centre and Hospital` without crashing or stale state. |
| **3. Parser Fallback** | Submit unparseable garbage text in requisition console (`/coordinator/parse`). | System gracefully flags unstructured requisition, prompts clinician for structured manual entry, and logs fallback without unhandled exceptions. |

---

## 3. The 3-Minute Timed Demo Run (Second-by-Second)

```
[0:00 - 0:30]  Scene 1: The Problem & Opening Frame (Hospital Inbox)
[0:30 - 1:15]  Scene 2: Detection & Live Sweep (Stock Console & Corridor Map)
[1:15 - 2:00]  Scene 3: Brokerage & Atomic Claim (Hospital Inbox)
[2:00 - 2:30]  Scene 4: Chain of Custody (Transfers Page)
[2:30 - 3:00]  Scene 5: Impact Dashboard & Architecture Summary
```

### Scene 1: The Opening Frame & The Problem (0:00 – 0:30)
- **Screen:** Kovai Medical Centre & Hospital (`/hospital/inbox`).
- **Visual:** Clean empty inbox state with active facility name in header.
- **Spoken:**
  > *"Every year, an estimated 11 to 13 percent of banked blood components in India—especially platelets with their unforgiving 5-day lifespan—expire on hospital shelves before they can be transfused. This is PulseChain: an automated, zero-idle-cost emergency rescue network built entirely on AWS serverless infrastructure. We are logged in as KMCH Coimbatore; our rescue inbox is currently calm and awaiting incoming regional offers."*

### Scene 2: The Expiry Clock & Scheduled Sweep (0:30 – 1:15)
- **Action:** Switch tab / side-by-side to SNS Blood Centre (`/centre/stock`).
- **Visual:** Stock console table. Point out `DEMO_UNIT_CLAIM_001` (O+ Platelets) showing a ticking 6-hour countdown clock with `font-mono tabular-nums`.
- **Action:** Click **"Run sweep now"** in the Demo Toolbar.
- **Action:** Switch to Coordinator view (`/coordinator/escalations`).
- **Visual:** The hand-drawn SVG Corridor Map animates, showing concentric rings at 10km, 30km, and regional distances. The unit pulses in Ring 1 around the origin.
- **Spoken:**
  > *"At SNS Blood Centre, Unit DEMO_UNIT_CLAIM_001 has entered its final 6 hours. When our scheduled EventBridge sweep fires, AWS Step Functions automatically initiates an outward concentric ring escalation. Using precomputed road distance partitions in DynamoDB rather than expensive geospatial APIs, the state machine evaluates compatible facilities within Ring 1."*

### Scene 3: Ranked Offer & Atomic Claim (1:15 – 2:00)
- **Action:** Switch back to KMCH (`/hospital/inbox`).
- **Visual:** Empty state instantly replaced with the ranked Offer Card. Expand the **Match Score Breakdown** (0.979 score, 5 verified factors).
- **Action:** Click **"Claim Unit"**. Offer card turns emerald `CLAIMED`.
- **Action (Rehearsed Failure 2):** Immediately trigger a simulated secondary claim to show the `409 Conflict` inline protection.
- **Spoken:**
  > *"Within 3 seconds, KMCH receives a targeted offer. The match engine evaluated five clinical factors: ABO/RhD compatibility, distance, urgency, and facility demand. Clicking Claim executes an atomic DynamoDB TransactWrite that commits the unit, invalidates rival offers, and stops the Step Functions execution instantly. Any concurrent claim attempt is rejected with an HTTP 409 Conflict."*

### Scene 4: Chain of Custody & Transfer Handshake (2:00 – 2:30)
- **Action:** Navigate to Transfers (`/hospital/transfers`).
- **Action:** Click **"Dispatch"** (`IN TRANSIT`) and then **"Confirm Receipt"** (`RECEIVED`).
- **Visual:** Transfer timeline advances through all milestones.
- **Spoken:**
  > *"Once claimed, the cold-chain transfer begins. Handover milestones transition the unit from Claimed to In Transit and finally to Received, sending SNS SMS alerts and SES email manifests to duty staff at both facilities."*

### Scene 5: Network Impact & Closing (2:30 – 3:00)
- **Action:** Navigate to Network Impact (`/impact`).
- **Visual:** Animated count-up KPI tiles (Units Saved, Units Lost, Value Rescued in ₹, Loss Rate %) and 30-Day Trend Chart with the WHO 11–13% reference band.
- **Spoken:**
  > *"Across the network, the impact dashboard tracks our cumulative outcomes against the WHO 11 to 13 percent wastage benchmark. PulseChain proves that life-saving emergency coordination requires neither expensive geospatial subscriptions nor non-deterministic AI models—just rigorous serverless architecture. Thank you."*

---

## 4. Reset Procedure for Successive Takes

1. Locate top **Demo Toolbar**.
2. Click **Reset demo data** -> Click **Confirm Reset**.
3. Confirm toast: `Reset complete: 161 items verified in 4.8s`.
4. Refresh browser window: Ready for Take 2.
