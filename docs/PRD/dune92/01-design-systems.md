# 01 — Game Design Systems

All numbers are initial tuning targets. Encode them in a constants table
(`src/data/balance.ts`), never as magic numbers at the call site.

## 1. Core loop

**Minute-to-minute (2–5 min):** pick a destination on the map → fly there → talk to
the sietch Naib (pledge, gift spice, get referrals) → assign a troop group a task and
equipment → return to the palace, check the quota ledger, dispatch a shipment.

**Hour-to-hour (20–40 min):** a quota deadline lands every 8 days; a prospecting report
opens a new field; a story beat grants a capability; Harkonnen pressure ratchets.

**Pressure stack** — at least two of these must be visibly ticking at any moment:
quota deadline (economic), raid clock (military), field depletion (forces exploration),
charisma cap (forces story engagement).

**Feedback:** the **quota ledger widget** is the single most important UI element —
amount due, days remaining, and projected income at current assignments. Plus courier
messages, the existing event log, and map pings on payouts/discoveries/raids.

## 2. Time

- `time` in game-seconds, `DAY_SECONDS = 60`, `day = floor(time/60)` — all as today.
- **New: time pauses during dialogue.** Most real playtime is reading while paused;
  this is how a 24-game-day slice fills 60–90 real minutes.
- Speed 1/3/5.

## 3. Entities

### Location (replaces `Village`)

```
Location = {
  id, name,
  kind: 'palace'|'sietch'|'smuggler_den'|'fort'|'field_camp'|'station',
  position: {x,y}, regionId,
  discovered: boolean,
  knownRoutes: LocationId[]
}
```

~60% start undiscovered. Revealed by dialogue referral, prospecting, or prescience.
Travel time = euclidean distance / speed(mode); foot ×1, thopter ×3, long-range
thopter ×3 without region-range limit.

### Sietch (extends the existing `SietchState`)

```
Sietch = {
  locationId, naibId: CharacterId,
  population: 40–400, loyalty: 0–100, morale: 0–100,
  pledged: boolean, troopGroupIds: string[],
  inventory: EquipmentId[], waterReserve: 0–500
}
```

- **loyalty** — pledge requires ≥ 60. Dialogue choices plus gifts (20 spice = +8,
  capped +24 per visit). Drifts −1/day if unvisited for 10 days (halved on easy, via
  the existing `reputationDecayMultiplier`). Below 30 the sietch unpledges.
- **morale** — drifts toward 50 at ±2/day. Player visit +10 (5-day cooldown), new
  equipment +5, raid suffered −15, quota missed −5 globally, region vegetation ≥30
  sets a +10 floor. Multiplies all task output.
- **population** caps fielded troops from that sietch at 30%.

### TroopGroup — the unit of work

```
TroopGroup = {
  id, homeSietchId, locationId,
  size: 15–60,
  skills: { spice, prospect, military, ecology }   // each 0–100
  morale: 0–100,
  equipment: EquipmentId[],
  task: 'harvest'|'prospect'|'train'|'ecology'|'garrison'|'idle',
  taskTargetId: FieldId|RegionId|null,
  taskProgress: number
}
```

Each pledged sietch spawns 1–3 groups (size = population/6). Skills start 20–40,
weighted by sietch flavour, and grow +1/day performing the matching task, capped at 70
without a tutor character (tutors raise the cap to 100 and the rate to +2 or +4).
A group below size 10 merges home.

### Equipment

```
Equipment = {
  id,
  kind: 'harvester'|'heavy_harvester'|'thopter'|'lr_thopter'
      |'krys'|'sonic_disruptor'|'windtrap'|'bulb_cache',
  locationId | groupId,
  condition: 0–100
}
```

Condition −2 per day of use; at 0 the item is disabled until repaired at a smuggler
den for 25% of purchase price.

### SpiceField

```
SpiceField = {
  id, regionId, position, discovered: boolean,
  density: 10–95,
  capacity: density × 8,
  remaining: number
}
```

Harvesting reduces `remaining`; effective density rescales as
`initialDensity × remaining/capacity` — yields taper, telegraphing exhaustion.
1–4 fields per region. Every 10–20 days a "spice blow" spawns one undiscovered field
in a region with vegetation < 60.

### RegionEcology

```
RegionEcology = { regionId, vegetation: 0–100, windtraps: number }
```

+0.5 vegetation/day per active 20-worker ecology team holding a bulb cache; ×2 with a
windtrap in region. Decays −0.2/day if untended below 30.

Thresholds: **≥30** sets a +10 sietch morale floor in-region and disables travel
accidents there. **≥60** stops spice blows spawning in that region (greening kills
future income — this tension is the point) and sets a +20 Fremen loyalty floor.

### Player

```
Player = {
  locationId, mode: 'idle'|'traveling',
  spice: number,
  charisma: 20–95,
  prescience: 0|1|2|3,
  companions: CharacterId[],   // max 2
  knownLocations, knownFields
}
```

`maxPledgedSietches = floor(charisma / 10)`. Charisma comes from story beats (+10, five
of them) and the spice-trance ritual (+5, max three uses, each costing 20 spice and
requiring Mother Sova present).

### Antagonist and quota state

```
QuotaState      = { nextDueDay, amount, cycleIndex, patience: 0–3, arrears }
HarkonnenState  = { aggression: 0–100, nextRaidDay, forts: FortState[] }
FortState       = { locationId, strength: 100–400, destroyed: boolean }
```

**Persistence:** bump the IndexedDB schema version and write a v1→v2 migration mapping
`Village` → `Location` + `Sietch`.

## 4. The four tasks

Common rules: one task per group; reassignment costs a 1-day changeover; minimum size
15; all output multiplied by morale `M = 0.4 + 0.006 × morale` (range 0.4–1.0).

### Harvest

Requires a pledged sietch and a discovered field in the same or an adjacent region.

```
yield/day = E × (density/60) × clamp(size/30, 0.3, 2.0) × (0.5 + spiceSkill/100) × M
E = 6 (hand tools) | 20 (harvester) | 34 (heavy harvester)
```

Tuning references: a hand crew (size 30, skill 40, morale 70, density 60) ≈ **4.5/day**;
the same crew with a harvester ≈ **15/day**.

Harvester crews without a thopter on site roll a 5%/day worm attack — lose 20% of the
group and 30 harvester condition. With a thopter: 1% and no equipment loss.

This replaces the current threshold/payout model in `updateSietches.ts` with continuous
daily accrual to the palace stock. Keep the `spice_shipment_received` event as the
daily payout notification.

### Prospect

Requires a thopter. Targets a region.

```
P(find)/day = min(0.35, 0.08 + prospectSkill×0.002 + regionRichness×0.001)
```

×1.5 with the tutor character assigned. Find table: 70% new spice field (density 30–90
weighted by region richness), 15% nothing but +3 prospect skill, 10% equipment cache,
5% hidden sietch revealed. A region is exhausted after 3 finds; mark it in the UI.

### Train

Unlocked by the Act 2 arrival of the captain character. Military skill +2/day, +4 with
the tutor stationed there, +1 more if the group holds sonic disruptors. Cap 70 without
the tutor, 100 with. Costs −1 morale/day unless the player visits during the cycle.

Thresholds: ≥40 garrison effectively, ≥60 can raid forts, ≥80 elite (first strike).

**Combat resolution:** `power = Σ size × (military/100) × W` where W = 1.0 for krys and
1.8 for sonic disruptors; defender gets ×1.3. Higher power wins. Losses are
`size × (loserPower/winnerPower) × 0.4` for the winner and `× 0.7` for the loser,
with deterministic ±10% noise.

### Ecology

Unlocked by meeting the planetologist in Act 2. Needs a bulb cache and a target region.
Rates as above; ecology skill raises the vegetation rate by `(1 + skill/200)` and cuts
windtrap build time from 5 days to 3.

Produces no spice — it competes directly with harvesting for bodies, and that
competition *is* the design. 60 workers on ecology is roughly 15 spice/day forgone.

## 5. Economy

Single currency: spice units. The player starts with 60.

### The Emperor's quota

Due every **8 days**. Amounts: **Q1 100, Q2 250, Q3 450**, then ×1.5 per cycle, with an
additional ×1.5 at each of the Act 3 and Act 4 transitions. Difficulty scales the
amount ×0.75 / ×1.0 / ×1.3 through the existing `DifficultyConfig`.

**Patience starts at 3.** On a due day:

| Payment | Effect |
|---|---|
| In full | Patience unchanged; +1 if below 3, once per act |
| ≥ 60% | Patience unchanged; shortfall to arrears at +25% |
| < 60% | Patience −1; full shortfall to arrears |

Arrears are added to the next quota. **Patience 0 is a game over** — the only purely
economic loss state. The envoy character delivers a courier message each cycle whose
tone tracks patience; the pressure must be felt in text, not just in numbers.

### Sinks

| Sink | Cost |
|---|---|
| Quota | dominant |
| Sietch gift (loyalty) | 20 |
| Trance ritual (charisma) | 20 |
| Harvester / thopter / windtrap + bulbs | 100 / 80 / 40 + 20 |
| Heavy harvester / sonic disruptors per group / LR thopter | 250 / 150 / 200 |
| Repairs | 25% of price |
| Smuggler intel | 30–60 |

### Recovery

Intended order of levers when behind: pledge another sietch (needs charisma, so do
story) → buy and deploy a harvester (capex against the quota) → prospect a denser field
→ pull ecology and training crews back to spice (short-term fix, long-term cost) →
smuggler advance (borrow up to 200 at 40%, due in 16 days).

**Design rule:** from patience 1 it must always be arithmetically possible to survive
two more cycles by full mobilisation. This needs a balance test, not a vibe check.

## 6. Progression gates

| Gate | Blocks | Unlocked by |
|---|---|---|
| Charisma (starts 20) | pledging beyond 2 sietches | story beats +10 ×5, ritual +5 ×3 |
| Prescience L1 "Awareness" | finding hidden sietches | Act 1 finale ritual |
| Prescience L2 "Farspeech" | remote dialogue and task reassignment | Act 2 ritual, charisma ≥ 50 |
| Prescience L3 "Foresight" | 3-day raid warnings, density overlay | Act 3, after 2 forts destroyed |
| Equipment T2 | industrial yields, prospecting | smuggler den access + spice |
| Equipment T3 | fort raids, far regions | Act 3 + smuggler standing ≥ 2 purchases |
| Map regions | travel targets | act transitions + thopter range |
| Ecology task | greening | meeting the planetologist (Act 2) |
| Training task | military | captain's arrival (Act 2) |

Day-one ceiling: exactly 2 pledged sietches, hand harvesting, enough to pay Q1.

## 7. Acts

State machine `ACT1 → ACT2 → ACT3 → ACT4 → (WIN_MILITARY | WIN_ECOLOGY | LOSS_*)`,
evaluated at the day boundary with conjunctive triggers.

**Act 1 — days 0–24.** Regions 1–2, harvest and prospect only, no raids. Beats: first
pledge, meeting the scout, discovering the smuggler den, the Duke's revelation of the
political trap behind the quota (+10 charisma), a hidden sietch found.
**Exit:** Q3 paid ∧ ≥3 sietches pledged → Ritual of Sand → prescience L1.

**Act 2 — days 24–56.** The Duke is recalled offworld as a political hostage; the
player rules alone. Training and ecology unlock; raids every 6 days at power
`60 + 8×daysIntoAct`, scaled by the existing `aiAggressionMultiplier`; regions 3–4.
**Exit:** ≥2 raids repelled ∧ one region at vegetation ≥30 ∧ charisma ≥50 → prescience L2.

**Act 3 — days 56–96.** Regions 5–6; four Harkonnen forts become attackable; raids
every 4 days now target harvest crews in the field; quota ×1.5 again. Beats: a
challenge duel, and the Baron's poisoned truce offer (+1 patience, −20 Fremen loyalty).
**Exit:** 2 of 4 forts destroyed → prescience L3.

**Act 4 — days 96–120.** The Emperor issues a deliberately impossible quota, computed
at 2× the player's live theoretical maximum. Explicit dialogue choice:
**submit** (pay what you can, patience floored at 1 for 12 days, raids continue) or
**defy** (quota off, 12-day countdown to a Sardaukar landing, must take the capital
fort first).

- **WIN_MILITARY** — capital fort destroyed before the countdown expires.
- **WIN_ECOLOGY** — vegetation ≥60 in three regions ∧ average pledged loyalty ≥80 at
  any point in Act 4; the Fremen rise and end the occupation bloodlessly.
- **LOSS** — patience 0, palace captured, or zero pledged sietches remaining.

## 8. Characters

Fourteen speaking roles plus one optional. All original.

| # | Character | Mechanical role | Dialogue states |
|---|---|---|---|
| 1 | Kael Atreides (player) | stat vessel: charisma, prescience | — |
| 2 | Duke Armand Atreides | Act 1 goal-giver, tutorial framing | 6 |
| 3 | Lady Maren | charisma coaching, ritual co-requisite | 8 |
| 4 | Captain Serra Voss | unlocks training; +2 rate and cap 100 when stationed | 7 |
| 5 | Ottone Vell (steward) | quota ledger explainer, auto-shipment toggle | 5 |
| 6 | Legate Corvin (envoy) | quota and patience mouthpiece; Act 4 broker | 8 |
| 7 | Naib Shadir | first pledge tutorial; referrals revealing 2 sietches | 7 |
| 8 | Ysane (Fremen scout) | companion: −20% travel; charisma beat; ecology sympathiser | 9 |
| 9 | Mother Sova | trance rituals, prescience ceremonies | 6 |
| 10 | Dr. Imrell Vast | unlocks ecology; windtrap and bulb tech | 8 |
| 11 | Pell (prospector) | prospecting tutorial; ×1.5 find chance | 5 |
| 12 | Rhaz Meko (smuggler) | equipment market, advances, paid intel | 7 |
| 13 | Baron Vorrik Harkonnen | courier taunts, truce offer, capital boss | 5 |
| 14 | Draeg Varn | raid announcements, Act 3 duel | 4 |
| 15 | *(optional)* Auda | worm travel | 4 |

A "state" is a distinct tree entry keyed by flags; roughly 6 nodes each, ~85 states
and ~650 nodes for the complete game.

## 9. Content volume

| | Act 1 slice | Complete |
|---|---|---|
| Locations | 7 | 30 |
| Speaking characters | 8 | 14 |
| Dialogue states | ~28 | ~85 |
| Dialogue nodes | ~140 | ~650 |
| Scripted events | 14 | 60 |
| Systemic event templates | 6 | 15 |
| Equipment kinds | 3 | 8 |
| Regions / fields | 2 / 5 | 6 / ~18 |

## 10. Act 1 vertical slice — the build target

**In:** clock with dialogue pause; foot and thopter travel; dialogue runner with flags;
pledge, loyalty, gifts; TroopGroup with harvest and prospect only; spice field
depletion; quotas Q1–Q3 with patience and arrears; charisma cap with one story beat and
one ritual; smuggler den selling harvester and thopter; one scripted Harkonnen probe
around day 20, resolved narratively with no combat system; prescience L1 as the finale
reward, cosmetic in the slice; the quota ledger widget; save/load.

**Out:** training, ecology, combat resolution, forts, raids as a mechanic, companions,
prescience L2/L3, debt, equipment condition and repair.

**The 60–90 minutes:** land on day 0 with 60 spice → the Duke's briefing → pledge the
first sietch on day 1–2 and hand-harvest → the envoy's Q1 letter → pledge a second →
pay Q1 (100) on day 8 → the Duke's charisma beat allows a third pledge → buy a harvester
at the smuggler den around day 10 → the first field tapers as the prospector teaches
prospecting → discover a hidden sietch and a dense field → pay Q2 (250) on day 16 →
the scripted probe raid raises the stakes → sprint to Q3 (450) by day 24 → the Ritual
of Sand, prescience L1, Act 2 title card.

**Win:** Q3 paid in full on day 24 with ≥3 sietches pledged.
**Lose:** patience 0, or day 30 with Q3 unpaid.
**Fun bar:** the player must face at least one genuine dilemma per quota cycle — gift
versus save, capex versus quota, prospect versus harvest. If Q2 is payable without
buying the harvester, retune upward.

## 11. Cut list

Drop in this order if scope shrinks:

1. Worm travel
2. Smuggler advances and debt
3. Equipment condition and repair
4. Ecology visual terrain change (keep the numbers)
5. Prescience L3 overlay
6. Companion bonuses
7. The Act 3 duel
8. The ecology ending
9. Region 6 and two of the four forts
10. The Act 4 submit/defy branch (collapse to defy)

**Load-bearing, never cut:** the quota deadline loop with patience; pledge → task →
payout; harvest and prospect as an economic dyad; travel over a discoverable map;
dialogue with flags; the charisma pledge cap; the raid clock from Act 2; equipment
gating at the harvester/thopter tier.
