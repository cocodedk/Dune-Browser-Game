# WP03 critic verdict — evidence audit

**Package:** WP03 "Title, new run, and opening through Q1"
**Commits:** `019f0c6`..`9ba9488` (diff base `ff42744`), branch `feat/game-completion`
**Contracts:** `08-execution-plan.md` §WP03; `03-opening-experience.md` (whole file)
**Auditor:** independent evidence critic, fresh context. This is **one of two** package
critics — the blind-play critic's cold-run verdict is the other half.

---

## 1. Gates — all five re-run, all green

```
$ npx vitest run
 Test Files  282 passed (282)
      Tests  2272 passed (2272)
   Duration  18.24s
VITEST_EXIT=0

$ npx tsc --noEmit
TSC_EXIT=0

$ npm run lint
> eslint .
LINT_EXIT=0

$ npm run build
(!) Some chunks are larger than 550 kB after minification.
✓ built in 1.88s
Bundle size budgets passed.
BUILD_EXIT=0

$ npx playwright test --workers=1
  ✓   1 game.spec.ts › page loads with 200 and no JS errors (3.1s)
  ...
  ✓  19 opening8.spec.ts › keyboard-only traversal reaches every required opening control (5.5s)
  ✓  20 title.spec.ts › title screen appears before the renderer mounts (3.0s)
  ✓  21 title.spec.ts › difficulty is written once at New Campaign (3.2s)
  21 passed (1.6m)
PW_EXIT=0
```

Round 13's claims of "282 files / 2272 tests" and "21/21 E2E" reproduce exactly.

---

## 2. Contract sweep, clause by clause

### 2.1 Starting contract

Probe P4b (§4) dumps `createInitialState()` verbatim. Every row matches:

| Row | Required | Landed | |
|---|---|---|---|
| Location | Arrakeen | `arrakeen` | ✅ |
| Day/time, paused for briefing | Day 0, paused | `time: 0`, `lastProcessedDay: null` + `pause.ts` `briefingPending` | ✅ |
| Spice | 60 | `60` | ✅ |
| Pledged sietches | 0 | `0` | ✅ |
| Operational crews | 0 | `0` | ✅ |
| Charisma | 20, capacity 2 | `20`, `maxPledged(20) === 2` | ✅ |
| Prescience | 0 | `0` | ✅ |
| Q1 | 90 due day 12 | `due: 90, dueDay: 12` | ✅ |
| Known destinations | Arrakeen, Red Wall, Tabr + opening routes | `hagg, arrakeen, red_wall_sietch, sietch_tabr` | ⚠️ |
| Current act | Act 1 | `act1` | ✅ |
| Current objective | `act1.receive_briefing` | `act1.receive_briefing` (derived, not seeded) | ✅ |
| Difficulty | Normal default | `normal` | ✅ |

⚠️ **Hagg is a fourth discovered place.** The contract names three plus "only routes valid
for the opening"; Red Wall is two hops and Hagg is the mandatory waypoint, so a player who
cannot see Hagg cannot reach Red Wall. Defensible, and disclosed in Round 12. Not a defect.

**"No AI faction event… may fire before the briefing ends"** — `briefingGate.test.ts:48`
is the strongest test in this package. It rigs a prospecting crew from day 0 so the
invariant is discriminating rather than vacuous, runs `update(10000)`, and asserts
`time === 0`, `rng.step === 0`, `events.length === 0`, `factionProfiles` unchanged,
`wormSightings` empty. ✅

### 2.2 Title and run setup

| Requirement | Evidence | |
|---|---|---|
| `Continue` with a valid save | `TitleHome.tsx:27`, `canContinue`, `probeSave()` | ✅ |
| `New Campaign` | `TitleHome.tsx:37` | ✅ |
| `Load Campaign` + metadata + corrupt handling | `LoadCampaignPanel.tsx`, three-way `SaveAvailability`, `CORRUPT_SAVE_MESSAGE` | ✅ |
| `Settings` | `SettingsPanel.tsx` | ✅ |
| Visible version identifier | `TitleHome.tsx:44` `v{__APP_VERSION__}` | ✅ |
| Easy/Normal/Hard, one sentence each | `DifficultyCard.tsx:37` | ✅ |
| Internal multipliers in a details expander | `DifficultyCard.tsx:38-48` native `<details>` | ✅ |
| Normal is the default | `NewCampaignPanel.tsx:22` + `autoFocus={id === 'normal'}` | ✅ |
| Difficulty written once, immutable | `createInitialState(seed, difficulty)` is the one write site; `title.spec.ts:35` asserts zero in-game difficulty buttons and reads `player().difficulty === 'hard'` back out of engine state | ✅ |
| Guidance defaults on, disableable in setup **or** settings | `localSettings.getGuidanceEnabled()` defaults true; `SettingsPanel.tsx:43` toggle | ✅ |
| Disabling removes marks/highlights but not dialogue/travel/pledge/tribute | `SettingsPanel.tsx:46-49` copy; `DestinationList.tsx:36` gates only the ★/tint; `opening5.spec.ts` walks the whole opening with it off | ✅ |

⚠️ **Settings has no in-game entry point.** `StatusBar.tsx` exposes Save / Load / New /
speed / mute only. Reaching Settings mid-run means reloading to the title. This is what
makes guidance rule 4 (below) unreachable in practice.

### 2.3 Progressive disclosure

| UI surface | Required first appearance | Landed | |
|---|---|---|---|
| Position | Initial Arrakeen view | `PositionStrip` unconditional (`App.tsx:79`) | ✅ |
| **Pause** | **Initial Arrakeen view** | **absent — see finding F1** | ❌ |
| Save | Initial Arrakeen view | `StatusBar.tsx:62` | ✅ |
| Objective | Initial Arrakeen view | `ObjectivePanel` unconditional (`App.tsx:80`) | ✅ |
| Tribute ledger | Thufir explains the demand | `ledgerDisclosed` (`App.tsx:52`); `opening.spec.ts:20` asserts absence first | ✅ |
| Destination list | Duke briefing completes | `destinationsDisclosed` (`App.tsx:53`); `opening2.spec.ts:20` asserts absence first | ✅ |
| Crew panel | First pledge creates a crew | `EARNED_TRUST_FLAG \|\| troopGroups.length > 0` (`App.tsx:58`); `opening2.spec.ts:63` | ✅ |
| Market | Smuggler den discovered/entered | `marketDisclosed` (`openingDisclosure.ts`) — reads `den.discovered`, with a documented "entered ⊆ discovered" argument | ✅ |
| Ecology | Act 2 | no such panel exists in the tree | ✅ (vacuous, WP06's) |
| Training | Act 2 | no such panel exists in the tree | ✅ (vacuous, WP06's) |
| Strongholds | Act 3 begins | `FortPanel.tsx:20` returns null for `act1`/`act2` | ✅ |
| Ending-path display | Act 4 final choice | `GoalOverlay` gated on `world.goalAchieved` | ✅ |

**Never-appear row (faction panel / aggregate troops / PoC village counter) — verified by
grep, clean:**

```
$ grep -rn "FactionPanel" src/ --include=*.tsx --include=*.ts
src/ui/FactionPanel.tsx:45:export default function FactionPanel() {
src/data/factionProfiles.ts:8:// no production caller; FactionPanel.tsx is never mounted;
src/game-engine/dialogue/applyEffect.ts:112:  // …once FactionPanel

$ grep -rn "Villages\|of 19\|/ 19" src/ui/*.tsx
(no matches)
```

`FactionPanel.tsx` exists on disk but is imported by nothing. No aggregate troop count and
no PoC village-control counter render anywhere in campaign UI. ✅

### 2.4 The seven beats

**Beat 1 — the assignment**

- Frames Arrakis / tribute / house failure: `opening-briefing.ts:26-32`. ✅
- Duke gives the objective ("Learn what the ledger demands… then go earn Red Wall Sietch's
  trust"): same node. ✅
- ≥2 tone responses with no mechanical trap: three root choices, **zero** effects of any
  kind on any of them (`opening.test.ts` enforces this across trees). ✅
- Closing sets `briefing.complete`, objective advances to `act1.read_ledger`: all three
  closings carry the identical `setFlags`; `opening.spec.ts:47` asserts the advance. ✅
- **"must show a finished character presentation, not a text-only label where a portrait
  belongs"** — ⚠️ **deferred by the exit proof's own "after production presentation is
  integrated" wording — see finding F2.**

**Beat 2 — read the pressure**

- Reveal order (amount+day → stock → projection → shortfall → patience/consequences):
  `opening-ledger.ts` is five strictly linear nodes in exactly that order. ✅
- **"60 available; short by 30" rather than "0 income" as the only message** — probe P4
  measures `{due:90, stock:60, projectedTotal:60, surplus:-30, dailyRate:0}`; `QuotaLedger`
  renders `in stock 60.0`, `projected by deadline 60`, `SHORT BY 30`, and *additionally*
  the note "no crews are harvesting". The forbidden message is present but is not the only
  one, which is what the clause asks. ✅
- "gaining a crew requires a sietch pledge": `ledger_patience` node. ✅
- Objective → `act1.travel_red_wall`: `opening.spec.ts:47`. ✅
- ⚠️ Minor: patience pips render at the **top** of the ledger panel, not last as in 03's
  reveal order. The dialogue order is exact; the panel's is not. Cosmetic.

**Beat 3 — first expedition**

- Highlighted on globe and in an accessible destination list: `DestinationList.tsx` +
  `PlanetMarkers`/`SietchMarkers` (Round 12). ✅
- Preview shows travel time (`${check.durationSeconds}s`), who is known there
  (`known there: Stilgar`), objective association (★ + tint). `opening2.spec.ts:28-41`
  asserts all three plus the disabled/`Too far` state at Arrakeen. ✅ (partial — see below)
- First flight not skippable for 3s, then Escape + a visible Skip: `travelSkipGate.ts`,
  `FlightSkipButton.tsx`, `sceneInput.ts` share one `canSkipFlight()`. ✅ (untested in
  browser — see below)
- Arrival opens the location view with Speak/Depart and names the resident: reached in
  `opening2.spec.ts` / `reachFirstCrew`. ✅

⚠️ **Three sub-gaps:**
1. **"why it is reachable" is only stated negatively.** A reachable row shows a duration
   and nothing else; only *unreachable* rows explain themselves
   (`Too far without a long-range ornithopter`).
2. **No select→confirm step for travel.** `DestinationList.tsx:57` travels on the first
   click. 03 separates "Selecting it previews…" from "Confirming travel starts the normal
   flight sequence". Pledge (`ConfirmModal`) and crew order (`ConfirmModal`) both got a
   confirm step; travel did not. A stray click commits a journey.
3. **The 3s skip gate has no browser proof.** `grep -rn "Skip" e2e/` returns nothing. The
   gate is verified only as a pure function (`travelSkipGate.test.ts`); nothing asserts the
   button is disabled at t<3s, or that Escape is refused.

**Beat 4 — earn and verify trust**

- Seed near threshold, either substantive reply reaches it: `sietches.ts` seeds
  `red_wall_sietch` at **55**, both replies carry `loyaltyDelta: 5`. Probe P1 walks the real
  tree and measures `55 -> 60`, exactly `PLEDGE_THRESHOLD`. ✅
- Replies differ in later acknowledgement, not in whether the tutorial continues: two ack
  nodes, distinct text, distinct `solidarity`/`transaction` flags, shared
  `acknowledged` completion gate. ✅
- Reward budget keyed on `redwall_trust_root` (not the two ack nodes) so re-conversation
  cannot pump loyalty: documented in the tree header and enforced by `applyEffect`'s
  once-per-(tree,node) gate; `DialogueSystem.loyaltyOnce.test.ts` covers it. ✅
- Loyalty numerically **and visually**: `PledgePanel.tsx:94` `Loyalty 60 / need 60`;
  `VillagePanel.tsx:74` `<LoyaltyBar />`. ✅
- Threshold 60 and capacity 2 visible: `Loyalty X / need 60`, `Pledges 0/2`;
  `opening2.spec.ts:52-53`. ✅
- Pledge enabled only when both checks pass: `disabled={!check.ok}` from the command's own
  `checkPledgeChain`. ✅
- Concise confirmation naming "one crew": `ConfirmModal` copy; `opening2.spec.ts:58`
  asserts `text=/one crew/`. ✅

**Beat 5 — put people to work**

- Home / current location / size / morale / relevant skill: `CrewCard.tsx:96-101`. ✅
- One recommended known field: `recommendedField()`, rendered as `Recommended: …` plus a ★
  on the button. ✅
- Projected daily yield **range**, exact density hidden: `rangeFor` / `previewYieldRange`;
  density shows `—` when `densityKnown` is false. ✅
- One-day changeover consequence **before** confirmation: `ConfirmModal` line "no yield
  today; the changeover costs one full day"; `opening2.spec.ts:69` asserts it before the
  order fires. ✅
- **Projection never claims the crew is already producing during changeover:**
  `projection.ts:72` `if (group.changeoverDaysLeft > day) continue`. ✅
- Two valid plans, not one forced instruction: `objectiveCopy.ts:62-65` Reserve / Invest;
  `opening2.spec.ts:80-81` asserts both are on screen. ✅

⚠️ **"shows the cause: crew name, field, changeover, then expected contribution"** — not
met. The ledger updates its `projected by deadline` and `short by N` figures (proved by
`opening2.spec.ts:74`), but shows **no causal breakdown**. The crew's own card shows
"Moving to new orders…" separately. Nowhere reads "Red Wall crew → red_wall_pan, 1 day
changeover, then ~X/day".

⚠️ Minor: during changeover the ledger note reads **"no crews are harvesting"** while a
crew is assigned. Literally true of today's rate; misleading as copy.

**Beat 6 — first dilemma**

- Chani and Ramallo provide context; the tree carries **no effect of any kind** (no deltas,
  no `setFlags`), and is deliberately outside `canCloseDialogue`'s mandatory set so it can
  be closed at any node — 03's "must not script the decision", honored structurally rather
  than by copy. ✅
- Gift has a previewed cost and loyalty gain: prose ("twenty measures for eight") plus
  `GiftPanel.tsx:46` `Costs 20 spice · +8 loyalty` from the same constants the command
  reads. ✅
- Decline remains viable through Q1: `opening-reserve-line` fixture + probe P1. ✅
- "The ledger continuously explains whether the current plan is on track": `onTrack` +
  colour + `short by`/`surplus` verdict band. ✅

**Beat 7 — settle Q1**

- Pause at day 12 and open the pending decision: `pause.ts` `settlementPending`. ✅
- Due, stock: `SettlementModal.tsx:77-84`. "Any amount already committed" is N/A per W2c's
  recorded field-by-field reading — **defensible**, the field does not exist in
  `PendingSettlement`. ✅
- Full-payment result / minimum-partial result / custom bounded control / patience
  consequence of the selected amount before confirmation: all four render, all four call
  the same pure `settleQuota`, never a second estimate. ✅ **in the general case** —
  ❌ **in the state the invest line actually reaches, see finding F3.**
- Player confirms once: `runSettleCommand` clears `pendingSettlement`; a second call
  returns `no-pending-settlement` (`settleCommand.fixtures.test.ts:59`);
  `opening4.spec.ts:140` asserts the Settle button is gone. ✅
- Fenring state-specific + Thufir one-paragraph summary: `opening-q1-debrief.ts` — three
  parallel two-node branches, one per band, selected by `q1DebriefRootId(band)`. ✅
- Auto-shipment available but off until opt-in: `AUTO_SHIP_UNLOCKED_FLAG` set to `1` on the
  first settlement of any band (`settlementRun.ts:33`), read as `=== 1`
  (`QuotaLedger.tsx:59`) — writer and reader agree; checkbox defaults unchecked. ✅
- `opening.complete` on any band, autosave, marks removed, no victory overlay:
  `settleCommand.ts` sets the flag for cycle 0 regardless of band
  (`settleCommand.fixtures.test.ts:78, 95`); `commandHandlers.ts:154` autosaves;
  `opening3/5/6.spec.ts` assert zero `Arrakis is yours` / `Your house falls`. ✅
- ⚠️ "reveals the remaining Act 1 objectives" — a single placeholder line, see §2.7 / A8.

### 2.5 Objective presentation

| Rule | Landed | |
|---|---|---|
| One primary sentence beginning with a verb | All seven titles: Hear / Read / Travel / Earn / Put / Prepare / (Opening complete) | ✅ |
| At most two optional substeps | `ObjectiveCopy.substeps?: [string] \| [string, string]` — type-enforced | ✅ |
| A `Show` action that selects or frames the relevant person/location/control | **inert for 3 of 7 steps — finding F4** | ❌ |
| Progress where numeric progress is meaningful | Only `act1.prepare_q1` (`spice / totalDue`) | ✅ |
| `Why` expander | `ObjectivePanel.tsx:71-75` | ✅ |
| Completed objectives → compact history | `completedOpeningObjectives`, `✓ …` list | ✅ |
| Never "Villages 0/19", a raw flag name, or an act ID as the only goal | Titles are authored prose; `opening.complete` is suppressed as an active line | ✅ |

⚠️ Minor: the `Show` label for a location target is a de-underscored raw id. Probe output
captured the live button text: `"Show — red wall sietch"`, not `Red Wall Sietch`.

### 2.6 Guidance behavior — five rules

1. **Targets one control, never blocks the rest of the screen** — wrapper is
   `pointerEvents: 'none'` with no backdrop; only the ✕ is clickable. ✅
2. **Disappears on the action, not a timer** — the mark is derived from
   `activeOpeningObjective(world)` each render; no `setTimeout` in the file.
   `opening4.spec.ts:36` proves arrival alone clears it, with no dismiss click. ✅
3. **Dismissable; objective and disabled-reason UI remain** — `opening4.spec.ts:46-68`
   proves per-mark scoping: dismissing the travel mark leaves the row visible *and* a later
   step still gets its own mark. ✅
4. **Re-enabling resumes at the current unmet step** — implemented
   (`setGuidanceEnabled(true)` clears every dismissal, `localSettings.ts:53`), but ⚠️ **no
   test exercises the re-enable path**, and it is unreachable in-game (§2.2).
5. **Never colour/animation/canvas-marker alone** — every mark carries a text label from
   `coachMarkCopy.ts`; the overlay is plain positioned DOM, no canvas. ✅

### 2.7 Recovery and refusal — seven rows

| Row | Required | Evidence | |
|---|---|---|---|
| (a) Pledge below 60 | Disabled + current/required + ≥1 recovery route | `opening3.spec.ts:47-54` asserts `Loyalty 45 / need 60`, a disabled button, and `offer a gift, to raise loyalty`; `openingRefusalFixtures.test.ts` proves no mutation | ✅ |
| (b) Charisma cap | Cap, current charisma, next known source, existing pledges safe | `PledgePanel.recoveryHint` cites all three real sources; `openingRefusalFixtures.test.ts:77-79` asserts both existing pledges survive. **Probe P2 proves the cited source is real**: 28 → full quota → 33 → cap 3 → third pledge succeeds | ✅ |
| (c) Prospect without a thopter | Refuse before confirmation, name the equipment/location path | `opening4.spec.ts:78-92` — asserts no `Issue order` modal opened and `buy one from the smuggler` is shown | ✅ |
| (d) Waits with no crew order | Ledger stays short; objective points at the idle crew, no auto-assign | Copy exists (`objectiveCopy.ts:51` "Your new crew stands idle until you assign a field"); no auto-assign path exists. ⚠️ **no test asserts this row** | ⚠️ |
| (e) Cannot fully pay Q1 | Partial/custom legal, explain arrears + patience, campaign continues | `settleCommand.fixtures.test.ts` partial (patience held, 45 arrears, deadline +8) and short (−1 patience, 60 arrears, `ending === null`); probe P1 + browser probe both continue | ✅ |
| (f) Closes during travel or settlement | Autosave restores the same state without duplication | Travel: `onTravel` autosave + `opening7.spec.ts` + **probe P3** (envelope round-trips `traveling`/`hagg`/`arrivalTime 6`, then arrives exactly once). Settlement: `pendingSettlementAutosave.ts` + `opening4.spec.ts:132` byte-identical `hashState` | ✅ |
| (g) Dismisses every coach mark | All steps discoverable through objective/destination/resident/crew/ledger UI | `opening5.spec.ts` walks the whole opening with guidance off, with two explicit absence checkpoints | ✅ |

"The opening contains no unrecoverable loss": probe P1 and the browser probe both settle in
a non-full band with `ending === null` and the clock resuming. ✅

### 2.8 Acceptance criteria 1–8

| # | Criterion | Verdict |
|---|---|---|
| 1 | Starting contract matches world/save/UI/simulator exactly | ✅ (probe P4b; Hagg noted) |
| 2 | 4/5 first-time playtesters complete Q1 in 45 min | **human-gated — carve-out is correct.** 03's own wording is a playtest; WP03's exit proof says only "ready for first-time-player testing"; WP14 is "Human playtests and corrective rounds". Defensible. |
| 3 | 4/5 can state why the second pledge is attractive and risky | **human-gated — same carve-out, same ruling.** Defensible. |
| 4 | Every required action has a visible legal path without clicking a canvas marker | ✅ `opening8.spec.ts` completes the entire opening — title, setup, both beats, two travel legs, trust dialogue, pledge confirm, crew order, settlement — with **zero** `.click()`/`.focus()`, only Tab+Enter |
| 5 | Pledge and settlement idempotent across double-click and reload | ✅ `pledge-replayed` grants nothing twice; second settle refuses `no-pending-settlement`; `opening4` proves hash-identical reload + one settlement. ⚠️ No *browser* double-click test |
| 6 | Reserve and investment fixtures both remain viable on Normal | ❌ **not met, and the build says so.** Measured: reserve settles PARTIAL at 77.3 with patience **held**; invest settles SHORT at 51.5 with patience **lost**. The invest line is strictly dominated. Correctly carried to WP04 (Round 13) |
| 7 | No faction-simulation event or campaign-ineligible panel during the opening | ✅ `briefingGate.test.ts` + disclosure gating + `FactionPanel` unmounted |
| 8 | Completion reveals Act 1 objectives, autosaves, resumes time, no victory overlay or debug-like transition text | ⚠️ **half-closed.** Autosave ✅, time resumes ✅ (probe P1), no overlay ✅. "Reveals the remaining Act 1 objectives" is one placeholder line — `Act 1 continues: strengthen your position before the next tribute.` Recorded carve-out to WP05; defensible, but the criterion is not closed |

---

## 3. Fixture and scenario authenticity

### 3.0 Ruling on Round 11's load-bearing carve-out

Round 11 records: *"the 8 fixtures are engine tests through production entry points and the
6 scenarios are Playwright against the release preview — that is the reading of 'fixtures
pass in the release browser'."* The exit proof's literal words are "All opening fixtures
pass in the release browser," so this reading deserves an explicit ruling.

**Defensible, with one named exception.** It is defensible because every fixture row's
browser-visible half does land in a shipped scenario: `reserve-line`→`opening6`,
`invest-line`→`opening3`, `low-trust`→`opening3`'s Tabr-45 leg, `charisma-cap`→the copy
`PledgePanel` renders from the same `checkPledgeChain`, `partial-payment`→`opening4`/
`opening6`'s Full-preset settle, `reload-pending`→`opening4`, `guidance-off`→`opening5`.
Engine fixtures buy exact arithmetic that a browser assertion cannot; the scenarios buy the
control paths the arithmetic is reached through. Splitting them is sound.

**The exception is the short band.** `opening-short-payment` settles in a browser **nowhere**:
`opening6` (reserve) lands PARTIAL, and `opening3` (invest) is lifted into FULL by
`giveHarvester`. So the one band a real Normal-difficulty invest run actually reaches — the
band my probe P5 measured — has no release-browser proof at all. Combined with the two
"previewed" omissions in F5, this is what makes F3 a finding rather than a note: the
degenerate preset pair sits precisely in the coverage hole this carve-out leaves open.

### 3.1 The eight deterministic fixtures — all present, all pass

| Fixture | File | Authentic? |
|---|---|---|
| `opening-reserve-line` | `openingLineFixtures.test.ts:40` | Real, with shortcuts. Skips Beats 1–2 by flag, sets `player.location` directly, force-sets loyalty to threshold. ⚠️ Its cited `78.89` is a fixture artifact — probe P1 walking the *real* dialogue + *real* two-hop travel measures **77.35**. Both PARTIAL; the number is not the real-play number |
| `opening-invest-line` | `openingLineFixtures.test.ts:80` | Real. ⚠️ **Asserts less than its 03 row demands**: the row says "**Higher projected income**, lower immediate stock, both costs visible before Q1". Lower stock ✅ and gift cost ✅ are asserted; **higher projected income is never asserted** — only `troopGroups.length === 2` |
| `opening-low-trust` | `openingRefusalFixtures.test.ts:16` | Honest. Proves refusal + zero mutation. The "≥1 valid recovery route" half is deferred to `opening3.spec.ts`'s Tabr-45 case by explicit citation — same component, same reason code. Acceptable |
| `opening-charisma-cap` | `openingRefusalFixtures.test.ts:39` | Strong. Drives the real command chain, uses `sihaya_ridge` (seeded 62) so the cap — not a loyalty shortfall in disguise — is what refuses. Independently reproduced by probe P2 |
| `opening-short-payment` | `settleCommand.fixtures.test.ts:82` | Exact arithmetic (−1 patience, 60 arrears, `ending === null`, spice 0). ⚠️ "**previewed**" — the row's own word — is not asserted anywhere, and finding F3 shows the preview in that band is degenerate |
| `opening-partial-payment` | `settleCommand.fixtures.test.ts:66` | Exact (patience held, 45 arrears after surcharge, next deadline 20). ⚠️ Same "previewed" omission |
| `opening-reload-pending` | `settleCommand.fixtures.test.ts:42` + `opening4.spec.ts:103` | Strong, both halves. Byte-equal `pendingSettlement` across serialize/deserialize; browser half compares `hashState()` before/after a real reload and asserts the default amount is unchanged and settlement fires once |
| `opening-guidance-off` | `opening5.spec.ts:14` | Proves absence at two checkpoints *and* completion. ⚠️ Its completion leg calls `giveHarvester` |

**No tautologies found.** Every fixture asserts a real state transition; the refusal
fixtures snapshot state before and after and prove non-mutation.

### 3.2 The six browser scenarios — all present, mapped 1:1

| 03 scenario | Spec | Intermediate-state assertions? |
|---|---|---|
| 1. New Campaign → Normal → briefing → ledger → flight → Stilgar → pledge → crew → projection | `opening.spec.ts` + `opening2.spec.ts` (split for the 200-line cap) | Yes — pre/post disclosure checks, disabled→enabled travel row, loyalty readout, confirm copy, verdict-string change |
| 2. Reserve line through Q1 + opening autosave | `opening6.spec.ts` | Yes — asserts exactly one crew, `sietch_tabr` count 0, debrief, then Continue-after-reload |
| 3. Investment line through gift, second pledge, second crew, Q1 | `opening3.spec.ts` | Yes — but **uses `giveHarvester`**, see §3.3 |
| 4. A refused pledge and its displayed recovery path | `opening3.spec.ts:47-54` (Tabr at 45) + `opening4.spec.ts:78` (prospect refusal) | Yes |
| 5. Reload during flight and during pending settlement | `opening7.spec.ts` + `opening4.spec.ts:103` | Yes — travel target before/after; hash equality |
| 6. Keyboard-only traversal of all seven surfaces | `opening8.spec.ts` | Yes — no mouse action anywhere |

03's "a final screenshot without intermediate-state assertions is insufficient" is
comfortably satisfied. No scenario relies on a terminal screenshot.

### 3.3 The `giveHarvester` debug bridge — judged

Two of six scenarios call it: `opening3.spec.ts:81` and `opening5.spec.ts:75`.
`giveHarvester` **mutates world state** (issues a harvester to every crew) — categorically
different from `setTime`, which compresses time through the same day-runner path.

**Is the disclosure honest?** **Yes, and precisely so.** `opening3.spec.ts:72-80` states the
measurement, the reason, and the exact failure mode it prevents: "two 15-hand crews… land
well under Q1's 90 due… and below `minPartialPayment` too, which would make the Full and
Minimum presets identical and defeat the very preview-varies assertion this scenario
exists to prove." My probe reproduces that prediction verbatim (below).

**Is the scope acceptable?** **Yes as a test affordance — but it is not load-bearing for
completion, and the build never says so.** I ran the full invest line in the release
preview with the call removed:

```
PROBE settlement figures (no giveHarvester): {"due":90,"stock":51.5,"min":54}
PROBE presets: {"fullLabel":"Full (52)","minLabel":"Minimum (52)"}
PROBE previews: {"fullText":"Selected — Patience falls to 2 of 3, 38 carried.",
                 "minText":"Selected — Patience falls to 2 of 3, 38 carried."}
PROBE after settle: {"openingComplete":true,"spice":0}
  ✓  1 [chromium] › PROBE: invest line completes Q1 in-browser with NO giveHarvester (6.6s)
```

The whole line — Tabr dilemma, two gifts, second pledge, second crew, day-12 settlement,
Fenring/Thufir debrief, post-opening objective, no victory overlay — completes cleanly with
**zero state-mutating debug**. `giveHarvester` rescues one *assertion*, not the scenario.

**Consequences, both of which are findings:**
1. Neither shipped scenario proves the invest line's **real** Q1 outcome (SHORT band,
   patience 3→2, 38 arrears).
2. The thing it papers over is itself a Beat 7 contract gap — finding F3.

---

## 4. Behavioral spot-probes (mine, throwaway, deleted after — `git status` clean below)

Written to `src/wp03probe.test.ts` and `e2e/wp03probe*.spec.ts`, run, captured, deleted.

### P1 — reserve line end-to-end through the real chain, zero debug affordances

Walks both opening dialogue trees for real, travels Arrakeen→Hagg→Red Wall for real, walks
Beat 4 for real (no forced loyalty), pledges, harvests, reaches day 12, settles.

```ts
setWorld(createInitialState()); initLoop(); walkBothOpeningBeats()
startTravel('hagg');            for (…) update(1)
startTravel('red_wall_sietch'); for (…) update(1)
startDialogue(REDWALL_TRUST_TREE_ID, 'red_wall_sietch')
chooseDialogue('redwall_trust_transaction'); chooseDialogue('redwall_trust_ack_transaction_1')
runPledgeCommand('red_wall_sietch')
runAssignCrewCommand('group_red_wall_sietch','harvest','field_red_wall_pan')
for (let d=0; d<=12; d++) advanceToDay(d)
expect(world.equipment).toHaveLength(0)   // NO debug affordance touched
runSettleCommand(world.pendingSettlement!.legalRange.max)
```

```
P1 loyalty: 55 -> 60 threshold 60
P1 settlement: {"due":90,"stock":77.34710018908373,"minPartial":54,
                "max":77.34710018908373,"equipment":0,"day":12}
P1 outcome: {"ok":true,"code":"settled"} patience 3 arrears 16 charisma 24
✓ completes Q1 with no equipment ever issued and no forced flags
```

Reserve line: PARTIAL band, patience **held at 3**, 16 arrears, `opening.complete` set,
`ending === null`, clock resumes. Zero debug state.

### P2 — charisma arithmetic through two pledges and a full quota (the 5→4 change)

```
start charisma=20 cap=2
after p1 charisma=24 cap=2
after p2 charisma=28 cap=2
third attempt pre-quota = {"ok":false,"reason":"charisma-cap"}
Q1 due=90 stock=200 max=90
after full quota charisma=33 cap=3
third attempt post-quota = {"ok":true,"code":"pledged"}
```

The W3g decision reproduces exactly: 20→24→28 holds capacity 2 through two pledges; the
third slot opens only via `CHARISMA_PER_QUOTA` at 33. **`PledgePanel`'s charisma-cap
recovery copy ("a tribute paid in full") is therefore literally true** — confirmed by
running the source it names. `CHARISMA_PER_QUOTA` is awarded on the **full band only**
(`settlementRun.ts:39`), so the copy is not subtly overpromising.

### P3 — travel-start autosave envelope actually reloads mid-flight

The shipped test (`commandHandlers.travelAutosave.test.ts`) mocks `persistence` entirely —
it proves the *call*, not that the envelope is loadable. This probe closes that:

```
P3: {"beforeState":"traveling","beforeTarget":"hagg","beforeArrival":6,"beforeLoc":"arrakeen",
     "afterState":"traveling","afterTarget":"hagg","afterArrival":6,"afterLoc":"arrakeen",
     "afterTime":0,"beforeTime":0}
✓ serialize/deserialize of a mid-travel world restores the same journey once
```

Resuming from the restored world arrives at `hagg` exactly once, state back to `idle`. No
duplication. ✅

### P4 — fresh-campaign projection and starting contract

```
P4:  {"due":90,"stock":60,"projectedTotal":60,"surplus":-30,"dailyRate":0,"onTrack":false}
P4b: {"location":"arrakeen","time":0,"lastProcessedDay":null,"spice":60,"prescience":0,
      "charisma":20,"capacity":2,"pledged":0,"crews":0,"act":"act1","difficulty":"normal",
      "due":90,"dueDay":12,"objective":"act1.receive_briefing",
      "discovered":["hagg","arrakeen","red_wall_sietch","sietch_tabr"]}
```

### P5 — invest line in the release browser with no `giveHarvester`

Output in §3.3. Completes Q1 cleanly; both settlement presets collapse to `52`; both
reference previews render the identical short-band line.

### P6 — Beat 1's shipped "character presentation" and the pause control

```
PROBE portrait requests: ["200 http://127.0.0.1:4173/assets/portraits/duke_armand.png ct=text/html"]
PROBE portrait DOM: { "imgs": [], "boxes": [ { "tag": "DIV", "text": "DUKE LETO ATREIDES" } ] }

PROBE all visible buttons: ["Show — red wall sietch","Why?","✕","Save","Load","New",
  "1×","2×","5×","🔊 On", …destination rows…]
PROBE pause-like controls: []
```

The portrait slot renders a 64×64 `<div>` containing the uppercase text
`DUKE LETO ATREIDES`. There is no pause control on the initial Arrakeen view.

---

## 5. Findings

### F1 — No pause control exists anywhere (disclosure table row 1) ❌

03's Progressive-disclosure table names **pause** among the four surfaces that must be
present on the initial Arrakeen view. It is not there.

```
$ grep -rn "game:pause" src/ --include=*.ts --include=*.tsx | grep -i emit
(no matches)
```

`commandHandlers.onPause` is implemented and `CommandWiring` subscribes `game:pause` — but
**nothing emits it**. `StatusBar` offers speeds `1× / 2× / 5×` with no `0×`. Probe P6
enumerates every live button on the opening view and finds nothing pause-shaped. This reads
as an oversight (the handler is wired and dead), not a decision, and no fixture or scenario
would catch it. This gap is **not** absorbed by the exit proof's "after production
presentation is integrated" clause — a pause control is an interactive affordance, not
presentation.

### F2 — Beat 1 ships the exact text-only label the contract forbids ⚠️

03 Beat 1: "The first conversation must show a finished character presentation, **not a
text-only label where a portrait belongs**." Probe P6 shows the live DOM is a bordered 64×64
`<div>` reading `DUKE LETO ATREIDES`. `public/assets/portraits/` contains only `.gitkeep`
and `README.md`, so `DialoguePortrait`'s `onError` fallback is the *only* path any character
takes today.

**Ruled a deferred gap, not a failure**, because WP03's exit proof explicitly says "ready
for first-time-player testing **after production presentation is integrated**". The drop-in
slot, loader, framing spec and README are all built and correct. Round 11's own wording
("Beat 1 passes with procedural portraits today") is honest.

Side note: the file the README asks the user to drop in for Duke Leto is `duke_armand.png`
(the character id), while the speaker renders as "Duke Leto Atreides". Documented, but
confusing at the drop point.

### F3 — Beat 7's two reference previews degenerate in the state the invest line reaches ❌

03 Beat 7 requires the settlement modal to show, as distinct items, "Full-payment result"
and "Minimum partial payment and resulting arrears". When `stock < minPartialPayment`:

- `legalRange.max = min(due, stock)` = 51.5 → `Full (52)`
- `minAmount = min(minPartialPayment, legalRange.max)` = 51.5 → `Minimum (52)`
- both `bandMessage()` calls receive the same amount → both read
  `Patience falls to 2 of 3, 38 carried.`

So the player is shown **neither** what full payment (90) would do **nor** what the true
minimum partial (54) would do, and a button labelled **"Full (52)"** against a stated
`due 90` is actively misleading. This is exactly the state the *investment* line — the plan
03 tells the player to consider — lands in on Normal. `giveHarvester` hides it from the
suite; my probe surfaces it. The balance half belongs to WP04; the **presentation of a
degenerate preset pair** is a Beat 7 contract gap that lives here.

### F4 — The objective `Show` action is inert for three of seven steps ❌

```ts
function showTarget(hint: ObjectiveTargetHint): void {
  if (hint.kind === 'location') EventBus.emit('village:selected', { villageId: hint.id })
}
```

`ObjectivePanel` renders a `Show — Tribute Ledger` / `Show — Crew` button for
`act1.read_ledger`, `act1.order_first_harvest` and `act1.prepare_q1` — panel-kind targets —
and clicking it **does nothing**. 03 requires "A `Show` action that selects or frames the
relevant person/location/control." `ObjectivePanel.tsx:15` still carries the promissory note
"W3f wires real panel highlighting"; W3f landed and did not. The `data-coach` anchors the
coach marks already use (`quota-ledger`, `crew-panel`) are exactly the hooks a scroll-and-
flash implementation would need, so the seam exists. A button that lies is worse than an
absent one.

### F5 — Coverage gaps the suite does not have a class for ⚠️

- **The 3s flight-skip gate has no browser test** (`grep -rn "Skip" e2e/` → nothing).
  Verified only as a pure function.
- **Recovery row (d)** (idle crew) is copy-only — no assertion.
- **Guidance rule 4** (re-enable resumes at the unmet step) has no test, and no in-game
  entry point to Settings to exercise it.
- **No browser double-click** idempotency test (acceptance 5's "double-click" half is
  covered at command level only).
- `opening-invest-line` never asserts its own row's "higher projected income".
- `opening-short-payment` / `opening-partial-payment` never assert "previewed" — the word
  their own rows use — and F3 shows that preview is degenerate for the short band.

### F6 — Travel has no confirm step ⚠️

03 Beat 3 separates "Selecting it previews…" from "Confirming travel starts the normal
flight sequence." `DestinationList.tsx:57` commits the journey on the first click. Pledge and
crew order both got a `ConfirmModal`; travel did not. A defensible reading (the preview is
inline on every row, so the click *is* the confirm), but it is the one place in the opening
where a stray click has a multi-day consequence with no confirmation.

---

## 6. "Five internal dry runs without debug state" — my explicit reading

**`setTime` is time compression, not debug state.** It advances the same clock the day
runner advances in real time, through the same `processDayBoundary` path, and writes nothing
into `world` that unattended play would not write. Requiring 12 real game-days per scenario
would buy no additional fidelity. I accept the loop's recorded distinction.

**`giveHarvester` is debug state.** It writes `Equipment` into `world` that no production
path grants at that point in the opening, and it changes the economy the run is being judged
on.

**Counting shipped browser runs that reach and settle Q1 with zero state mutation:**

| Spec | Reaches Q1 settlement? | State-mutating debug? | Counts |
|---|---|---|---|
| `opening4.spec.ts:103` (settlement reload) | yes, settles | none | ✅ |
| `opening6.spec.ts` (reserve line) | yes, settles | none | ✅ |
| `opening8.spec.ts` (keyboard-only) | yes, settles | none | ✅ |
| `opening3.spec.ts` (invest line) | yes | **`giveHarvester`** | ❌ |
| `opening5.spec.ts` (guidance off) | yes | **`giveHarvester`** | ❌ |
| `opening7.spec.ts` (flight reload) | no — ends at arrival | none | n/a |

**Three clean dry runs, not five.** My own probe P5 adds a fourth (the invest line, clean,
completing through the debrief). Probe P1 adds a clean engine-level fifth through the real
dialogue and travel chain, though 03's own framing is browser-level.

**So: the *game* can do five clean dry runs; the *suite* proves three.** The shortfall is
coverage, not capability — which is a materially better position than it first appears, and
the blind-play critic's cold runs are the natural place the remaining evidence comes from.
I score my half on what the shipped artifacts prove.

---

## 7. Round narrative (Rounds 11–13) — overstatement check

**Reproduced and honest:**
- "282 files / 2272 tests; 21/21 E2E" — exact.
- "Measured: invest line ~51.5 (browser path) / 54.35 (engine path) vs 90 due — 03's two-plans
  framing is NOT yet balanced" — I reproduced **51.5** in the browser to the decimal. This is
  the single most creditable line in the log: the build measured its own shortfall and said so.
- "CHARISMA_PER_PLEDGE 5→4 (authored…)" — probe P2 reproduces the whole chain.
- "seed 80→**55** canonical; both replies +5 to exactly threshold" — probe P1 reproduces.
- "keyboard-only traversal: zero UI fixes needed" — consistent with `opening8.spec.ts`.
- "all EIGHT fixtures and SIX scenarios mapped and closed" — true; all exist and pass.

**Overstated / omitted:**
- **"seven recovery rows verified"** (W3f) — row (d) is verified by *copy*, not by any
  assertion. Six are tested; one is asserted-by-reading.
- **Round 13 never mentions `giveHarvester`.** The disclosure lives only in the two test
  files' comments. Given WP03's exit proof turns on the phrase "without debug state", a
  state-mutating affordance in two of six scenarios belongs in the round log, not only in a
  code comment. This is the one real bookkeeping miss in the narrative.
- W3f's "guidance-off path proven" is true for *discoverability*; the *completion* leg of
  that same scenario leans on `giveHarvester`.

**Carry-forwards:**
- **invest-line balance → WP04** — recorded, Round 13, explicitly ("WP04 retune input"). ✅
- **shared-tree reward oddity → WP05** — recorded, but at Round 10 line 338 ("Content oddity
  for WP05/WP09: a shared-tree conversation pays at the first sietch and is silent at…"), not
  in Rounds 11–13. Correctly captured, just earlier. ✅
- **portrait 404 → WP15** — **not recorded in Rounds 11–13**, and it does not exist in the
  form described (see §8). What *does* exist and is unrecorded is F2, the Beat 1 presentation
  miss. ⚠️

---

## 8. What did NOT reproduce

1. **The "portrait 404 noise" carry-forward.** No 4xx response is emitted at all. The
   request returns **`200 … content-type: text/html`** — Vite's preview SPA fallback serves
   `index.html` for the missing PNG. The `<img>` then fails to decode, `onError` fires, and
   the text fallback renders. The user-visible defect (F2) is real; the *404* is not, and a
   404-sweep in WP15 would find nothing. The only recorded 404 in `progress.md` (line 20) is
   the **favicon**, from Round 0 — a different thing.
2. **`opening-reserve-line`'s cited stock of `78.89`.** Probe P1, walking the real dialogue
   and real two-hop travel, measures **77.35**. Both land PARTIAL, so no assertion is wrong;
   the difference is the fixture's teleport-and-force-loyalty setup versus real play. The
   shipped figure is a fixture artifact, not the reserve line's real-play number.
3. **My own first P2 run "failing"** with `not-loyal-enough` on the third pledge — that was
   `sihaya_ridge` decaying 62→59 over 12 unvisited days (`NEGLECT_DAYS 10`, 1/day). The
   neglect rule working correctly, not a defect. Probe corrected.
4. **No degradation from the 5→4 charisma change** anywhere else in the suite — the full
   2272-test run is green, and `CHARISMA_PER_QUOTA`/`CHARISMA_PER_RAID` are untouched as
   claimed.

---

## 9. Score and verdict

### Score: **7 / 10** against WP03's exit proof

**Credit.** All five gates green on re-run. The starting contract is exact to the field.
The briefing freeze is proven *discriminatingly* — a rigged crew, not an empty log — which
is the best-designed test in the package. All eight fixtures and all six scenarios exist,
pass, and assert real intermediate state; none are tautological. The charisma reconciliation
is authored, documented, and reproduces exactly under independent probing, and the recovery
copy it supports is literally true. Keyboard-only traversal completes the entire opening
with no mouse action. The autosave envelope genuinely round-trips a mid-flight journey. And
the single debug bridge is disclosed with a comment that predicted my measurement verbatim.

**Debit.** Three interactive affordances 03 requires ship dead or absent — no pause control
(F1), an inert `Show` on three of seven objectives (F4), and no travel confirm step (F6) —
and none of them is presentation, so the exit proof's presentation carve-out does not reach
them. Beat 7's two reference previews collapse into one identical line, with a button
labelled "Full (52)" against a 90 due, in exactly the state the investment line reaches
(F3). The suite proves three clean dry runs where the exit proof asks for five. Acceptance 6
is openly unmet (correctly deferred) and acceptance 8 is half-closed by a placeholder.

### Single biggest remaining gap

**Required opening controls that ship dead or missing, and a suite with no coverage class
that would notice.** Specifically: `ObjectivePanel`'s `Show` button does nothing for
`act1.read_ledger`, `act1.order_first_harvest` and `act1.prepare_q1` — three of the seven
steps — and there is no pause control anywhere on the initial Arrakeen view even though
`onPause` is wired and waiting for an emitter. Both are named explicitly in 03 (the
disclosure table's first row; the objective-presentation bullet list). Neither is
presentation, so neither is absorbed by "ready for first-time-player testing after
production presentation is integrated". Every one of the eight fixtures and six scenarios
passes with both defects present, because nothing in the suite asserts that a rendered
control actually *does* anything.

### Verdict line

> **`verified` is NOT yet warranted for WP03's evidence half.** The package is close — gates
> green, contract met on the large majority of clauses, fixtures and scenarios authentic and
> non-tautological, self-measurement honest. But three interactive affordances 03 requires
> (pause, `Show` on panel targets, travel confirmation) ship dead or absent, Beat 7's preview
> pair degenerates in the state the investment line actually reaches, and the shipped suite
> demonstrates three clean dry runs against an exit proof asking for five. Recommend a short
> remediation round — emit `game:pause` from a real control, wire `Show` for panel targets,
> guard the settlement presets when `stock < minPartialPayment`, and re-point `opening3`/
> `opening5` at the real (short-band) outcome so the debug grant is no longer needed — then
> `verified`. **This is one of two package critics; the blind-play critic's cold-run verdict
> is the other half and may raise or lower this independently.**

---

*Probes were written to `src/wp03probe.test.ts`, `e2e/wp03probe.spec.ts` and
`e2e/wp03probe2.spec.ts`, run, captured above, and deleted. This verdict file is the only
change to the working tree; no commits were made.*
