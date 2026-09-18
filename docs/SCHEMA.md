# PulseChain — DynamoDB Schema

Single table `PulseChain`, on-demand billing, two GSIs (projection ALL).
DynamoDB only enforces the key attributes; every other field below is a team contract.

## 1. Setup (ap-south-1)

```bash
# Create the table
aws dynamodb create-table --cli-input-json file://pulsechain-table.json --region ap-south-1
aws dynamodb wait table-exists --table-name PulseChain --region ap-south-1

# Load sample items (max 25 per batch-write call)
aws dynamodb batch-write-item --request-items file://sample-items.json --region ap-south-1

# Smoke tests
# Blood-centre console (stock sorted by expiry)
aws dynamodb query --table-name PulseChain --index-name GSI2 --region ap-south-1 \
  --key-condition-expression "GSI2PK = :pk" \
  --expression-attribute-values '{":pk":{"S":"FACILITY#CBE-BC-01#STOCK"}}'

# Expiry sweep: platelets expiring before a cutoff (now + 48h)
aws dynamodb query --table-name PulseChain --index-name GSI1 --region ap-south-1 \
  --key-condition-expression "GSI1PK = :pk AND GSI1SK <= :cut" \
  --expression-attribute-values '{":pk":{"S":"QUEUE#AVAILABLE#PLATELETS"},":cut":{"S":"2026-09-19T18:00:00Z"}}'

# Ring 1: facilities within 10 km of the centre
aws dynamodb query --table-name PulseChain --region ap-south-1 \
  --key-condition-expression "PK = :pk AND SK BETWEEN :a AND :b" \
  --expression-attribute-values '{":pk":{"S":"FACILITY#CBE-BC-01"},":a":{"S":"DIST#000.0"},":b":{"S":"DIST#010.0~"}}'
```

Alternative: `pulsechain-table.yaml` is the same table as CloudFormation / SAM.

## 2. Key attributes

| Attribute | Type | Used by |
|---|---|---|
| PK / SK | S | Base table |
| GSI1PK / GSI1SK | S | Work queues: expiry sweep, open requisitions, active escalations, audit by month, facility and pool lists |
| GSI2PK / GSI2SK | S | Per-facility views: stock console, offer inbox, requisitions |

GSI attributes are **removed** when an item leaves a queue (sparse index).

## 3. Entities

| Entity | PK | SK | GSI1PK / GSI1SK | GSI2PK / GSI2SK |
|---|---|---|---|---|
| Facility | `FACILITY#<facId>` | `PROFILE` | `FACILITIES` / `<type>#<facId>` | – |
| Distance | `FACILITY#<facId>` | `DIST#<km 000.0>#<toFacId>` | – | – |
| Standing demand | `FACILITY#<facId>` | `DEMAND#<component>#<group>` | – | – |
| Unit | `UNIT#<unitId>` | `META` | `QUEUE#<status>#<component>` / `<expiresAt>#<unitId>` | `FACILITY#<facId>#STOCK` / `<expiresAt>#<unitId>` |
| Offer | `UNIT#<unitId>` | `OFFER#<escId>#R<ring>#<recipientFacId>` | – | `FACILITY#<recipientFacId>#INBOX` / `<createdAt>` |
| Unit escalation | `UNIT#<unitId>` | `ESC#<escId>` | `ESC#ACTIVE` / `<startedAt>` | – |
| Requisition | `REQ#<reqId>` | `META` | `OPENREQ#<component>` / `<group>#<neededBy>` | `FACILITY#<hospitalId>#REQS` / `<neededBy>` |
| Requisition escalation | `REQ#<reqId>` | `ESC#<escId>` | `ESC#ACTIVE` / `<startedAt>` | – |
| Audit event | `UNIT#<id>` or `REQ#<id>` | `AUDIT#<ts>#<eventId>` | `AUDIT#<yyyy-mm>` / `<ts>` | – |
| Daily stats | `STATS` | `DAY#<yyyy-mm-dd>` | – | – |
| Donor pool | `POOL#<poolId>` | `META` | `POOLS` / `<poolId>` | – |

## 4. Attributes per entity

**FACILITY** — facilityId, name, type (`BLOOD_CENTRE` \| `HOSPITAL`), city, lat, lng, components (list), contactEmail

**DISTANCE** — toFacilityId, distanceKm (write both directions)

**DEMAND** — facilityId, component, bloodGroup, weeklyUnits, level (`LOW` \| `MEDIUM` \| `HIGH`)

**UNIT** — unitId, facilityId, component (`PLATELETS` \| `RBC` \| `PLASMA`), bloodGroup, volumeMl, valueInr, collectedAt, expiresAt, status, version, claimedBy?, claimedAt?, receivedAt?, lostAt?, activeEscalationId?

**OFFER** — offerId, escalationId, ring (1 = 0–10 km, 2 = 10–30 km, 3 = regional), unitId, originFacilityId, recipientFacilityId, status, createdAt, claimBy, respondedAt?, rank, score, breakdown (map: compatibility, distanceKm, openRequisition, standingDemand, urgency, hoursRemaining), reason, requisitionId?

**ESCALATION** — escalationId, subjectType (`UNIT` \| `REQUISITION`), subjectId, currentRing, status, startedAt, endedAt?, executionArn

**REQUISITION** — reqId, hospitalId, component, bloodGroup, unitsRequested, unitsFilled, urgency (`NORMAL` \| `HIGH` \| `CRITICAL`), neededBy, status, source (`MANUAL` \| `PARSED`), rawText?, createdAt

**AUDIT** — eventId, eventType, subjectType, subjectId, actorFacilityId? (null = system), timestamp, details (map)

**STATS** — unitsSaved, unitsLost, valueSavedInr, valueLostInr (updated with `ADD`)

**DONOR_POOL** — poolId, name, poolType (`COLLEGE` \| `RWA` \| `CORPORATE`), lat, lng, registered, groupCounts (map)

## 5. Enumerations

```text
Blood groups:  O- O+ A- A+ B- B+ AB- AB+
Components:    PLATELETS  RBC  PLASMA

Unit:          AVAILABLE → RESCUE_PENDING → CLAIMED → IN_TRANSIT → RECEIVED
                                          ↘ LOST
Offer:         OPEN → CLAIMED | DECLINED | EXPIRED | SUPERSEDED
Requisition:   OPEN → PARTIAL → FILLED | DONOR_TIER → CLOSED
Escalation:    RUNNING → RESOLVED | EXHAUSTED

Audit events:  UNIT_LOGGED, THRESHOLD_CROSSED, ESCALATION_STARTED, OFFER_CREATED,
               OFFER_CLAIMED, OFFER_DECLINED, OFFER_EXPIRED, RING_ESCALATED,
               CLAIM_REJECTED, TRANSFER_IN_TRANSIT, TRANSFER_RECEIVED, UNIT_LOST,
               REQUISITION_CREATED, REQUISITION_FILLED, DONOR_TIER_TRIGGERED
```

## 6. State transitions and GSI updates

| Change | Unit GSI1PK becomes |
|---|---|
| Logged | `QUEUE#AVAILABLE#<component>` |
| Threshold crossed | `QUEUE#RESCUE_PENDING#<component>` (lost check) |
| Claimed / in transit / received | removed |
| Lost | removed |

Requisition GSI1 attributes are removed when status becomes `FILLED` or `CLOSED`.
Escalation GSI1 attributes are removed when status becomes `RESOLVED` or `EXHAUSTED`.

## 7. Access patterns

| # | Need | Query |
|---|---|---|
| 1 | Blood-centre console | GSI2 `FACILITY#<id>#STOCK`, ascending |
| 2 | Expiry sweep | GSI1 `QUEUE#AVAILABLE#<component>`, SK `<= now + threshold` |
| 3 | Lost check | GSI1 `QUEUE#RESCUE_PENDING#<component>`, SK `<= now` |
| 4 | Ring 1 facilities | PK `FACILITY#<origin>`, SK between `DIST#000.0` and `DIST#010.0~` |
| 5 | Ring 2 facilities | SK between `DIST#010.0~` and `DIST#030.0~` |
| 6 | Regional facilities | SK between `DIST#030.0~` and `DIST#999.9~` |
| 7 | Candidate demand | PK `FACILITY#<id>`, SK `DEMAND#<component>#<group>` |
| 8 | Open requisitions | GSI1 `OPENREQ#<component>` |
| 9 | Hospital inbox | GSI2 `FACILITY#<id>#INBOX`, descending |
| 10 | Hospital requisitions | GSI2 `FACILITY#<id>#REQS` |
| 11 | Unit history | PK `UNIT#<id>` |
| 12 | Coordinator escalations | GSI1 `ESC#ACTIVE` |
| 13 | Impact dashboard | PK `STATS`, SK between `DAY#<from>` and `DAY#<to>` |
| 14 | Monthly audit | GSI1 `AUDIT#<yyyy-mm>` |
| 15 | All facilities / pools | GSI1 `FACILITIES` / `POOLS` |

The `~` suffix makes a boundary inclusive of facilities at exactly 10.0 or 30.0 km, because `~` sorts after `#`.

## 8. Claim transaction (TransactWriteItems)

1. Update `UNIT#<id> / META`: status = CLAIMED, claimedBy, claimedAt, REMOVE GSI1PK, GSI1SK, version = version + 1
   Condition: `#status = :RESCUE_PENDING`
2. Update the offer: status = CLAIMED, respondedAt
   Condition: `#status = :OPEN AND claimBy > :now`
3. Put the audit event `OFFER_CLAIMED`

On `TransactionCanceledException` with `ConditionalCheckFailed`: read the unit and return "Already claimed by <facility>", and write a `CLAIM_REJECTED` audit event.
Afterwards: mark the unit's other OPEN offers `SUPERSEDED` and signal Step Functions to stop.

## 9. Team rules

- Build all keys through `shared/keys.ts`; never concatenate by hand.
- Timestamps are ISO 8601 UTC strings (`2026-09-19T06:00:00Z`).
- Distances are zero-padded to `000.0` format (supports up to 999.9 km).
- Offer windows and escalation waits live in Step Functions, never DynamoDB TTL.
- Every status change writes its audit event in the same transaction.
- Demo reset: delete everything except `FACILITY#` and `POOL#` partitions, then reload staged units.
