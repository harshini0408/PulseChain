# PulseChain — Live Demonstration Script

> **The One-Liner for Judges:**  
> *"Existing systems tell blood banks when inventory is expiring. PulseChain answers the critical next question: **Who needs it nearby before the clock runs out?**"*

---

## 🎬 6-Step Hero Demo Walkthrough

### Step 1: The Blood Centre Inventory & Expiry Detection
- **Persona:** `🩸 Coimbatore Central Blood Centre (CBE-BC-01)`
- **Action:** Open **Blood Centre Stock Console** (`/centre`).
- **Showcase:**
  - Unit `PLT-102` (Platelets, O-Negative) with a **Live Ticking Countdown Clock** (~36 hours remaining).
  - Because platelets have a 5-day lifespan and the threshold is 48 hours, PulseChain automatically flags this unit into **`RESCUE_PENDING`**.
  - No human manual intervention needed: AWS EventBridge Scheduler + Expiry Evaluator Lambda detected the threshold crossing.

---

### Step 2: The Deterministic Matching Engine
- **Narrative:** *"PulseChain doesn't broadcast blindly. It searches the regional corridor (Coimbatore–Tiruppur–Erode–Salem) and ranks facilities using a transparent 5-factor mathematical formula."*
- **Explain the Match:**
  - **Hospital:** Coimbatore East Hospital (`CBE-HOSP-04`), 8.4 km away.
  - **Compatibility (25%):** Exact O- match (1.0).
  - **Distance (25%):** Close proximity (8.4 km).
  - **Open Requisition (25%):** Active matching blood request for ICU patient (`REQ-2001`).
  - **Standing Demand (15%):** High weekly historical demand.
  - **Urgency (10%):** HIGH urgency.

---

### Step 3: The Time-Limited Redistribution Offer
- **Persona:** Switch Persona to `🏥 Coimbatore East Hospital (CBE-HOSP-04)`
- **Action:** Open **Hospital Inbox** (`/inbox`).
- **Showcase:**
  - An urgent redistribution card for `PLT-102` has arrived.
  - A real-time countdown timer indicates the hospital has a 90-second claim window before the offer cascades to Ring 2.
  - Click **"Why was this matched?"** to display the transparent **Explainable Match Breakdown Modal**.

---

### Step 4: Race-Condition Protected Atomic Claim
- **Action:** Click **`[ CLAIM UNIT ]`**
- **Behind the Scenes:**
  - DynamoDB executes a conditional write transaction (`transact()`).
  - Offer transitions `OPEN → CLAIMED`.
  - Unit transitions `RESCUE_PENDING → CLAIMED`.
  - If a competing hospital attempts to claim simultaneously, DynamoDB rejects it with `409 Conflict`, preventing double-allocation.

---

### Step 5: Verified Transfer Lifecycle
- **Step 5A (Dispatch):** Switch to Blood Centre Persona $\to$ Click **`[ Dispatch Courier ]`** (`CLAIMED → IN_TRANSIT`).
- **Step 5B (Receipt):** Switch to Hospital Persona $\to$ Click **`[ Confirm Unit Received ]`** (`IN_TRANSIT → RECEIVED`).
- **Impact Trigger:** Transition atomically increments daily saved counters in DynamoDB.

---

### Step 6: Discard Avoidance & Wastage Impact Dashboard
- **Action:** Open **Impact Dashboard** (`/impact`).
- **Showcase:**
  - **Units Saved:** +1
  - **Economic Value Saved:** +₹1,500
  - **Success Rate:** 100%
  - **Active Escalations:** Multi-ring real-time radar.

---

## 🤖 Secondary AI Showcase: Multilingual Emergency Intake
- **Persona:** `🏥 Coimbatore East Hospital`
- **Action:** Open **Requisitions** $\to$ Click **`Create Requisition (AI Support)`**.
- **Input (Tamil / Hindi / English free text):**
  > *"Emergency: 2 units O negative platelets needed for emergency ICU surgery at Coimbatore East Hospital tomorrow morning 8 AM"*
- **Action:** Click **`Extract Fields with AI`** (calls Amazon Bedrock Claude 3 / Titan via Converse API).
- **Result:** Form automatically populates Component (`PLATELETS`), Blood Group (`O-`), Units (`2`), Urgency (`HIGH`), Deadline (`Tomorrow 08:00 AM`).
- **Submit:** Injects high-priority demand directly into the matching engine.

---

## 🌪️ Failure Branch: Step Functions 3-Ring Escalation
- If a hospital does not respond within the claim window:
  - **Ring 1 (0–10 km):** Offer expires after 90s.
  - **Ring 2 (10–30 km):** Cascades to surrounding town facilities (Tiruppur).
  - **Ring 3 (30–100+ km):** Regional escalation to neighboring cities (Erode, Salem).
  - **Tier 4 Fallback:** Automated mobilization of Community Donor Pools (e.g. `PSG iTech Campus Pool`).
