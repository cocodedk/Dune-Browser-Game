# Gauntlet-Loop Progress Log — Game Completion

One entry per round, per `09-gauntlet-prompt.md`. Newest entry last. Record what
changed, the critic mode + verdict + score, the measured numbers, and what did not
reproduce.

## Round 0 — launch checklist (2026-08-10)

- Spec pack committed as `51ca515`; merged to `main` via PR #20 (`07956a7`).
- Dirty-tree disposition: the modified `saveMigration.ts`/`.test.ts` were committed
  by a parallel session as `588e6b7` ("migrate legacy saves against the real village
  roster") — full gate passed on that commit. Nothing swept.
- Branch: `feat/game-completion` cut from merged `main`, pushed, tracking origin.
- Gate proven live: `core.hooksPath=.githooks`; full gate (file-length, lint, tsc,
  shop:check, build+budgets, 1975 unit tests, 8 E2E) executed and passed at the
  `51ca515` commit.
- Browser evidence channel proven: dev server on :5174, Playwright drives it,
  `window.__DUNE__` exposes `inspect` (per-object world/screen data), `setTime`,
  `teleport`, `giveHarvester`, `endRun`, `player`, `renderInfo`. Baseline console
  state on load: favicon 404 + repeating WebGL `glGetProgramiv: Program object
  expected` warnings — pre-existing, recorded here because WP15 requires clean
  console output.
- WP00 flipped to `in_progress` on the board. First dispatches: legacy-authority
  inventory and content/asset manifest recording.

## Round 1 — WP00 builders: inventory, manifest, characterization (2026-08-10)

- **Legacy-authority inventory** (`baseline/legacy-authority-inventory.md`, 239
  lines): six categories, all non-empty — 16 faction-sim sites reachable from the
  day loop, 11 threshold/village payout sites, 6 PoC-goal sites, 16
  `player.troops`/`player.influence` sites, 11 engine `Math.random()` sites (no
  seeded-RNG service exists anywhere), 3 confirmed duplicate resource paths. Lead
  spot-verified the five most load-bearing claims at their cited lines — all
  reproduced, including the triple spice credit
  (`harvestRun.ts:94` + `VillageSystem` + `GameLoop` payout loop).
- **Content/asset manifest** (`baseline/content-manifest.md`, counted at
  `e693ed5`): dialogue 131 nodes vs 500 release floor; scripted events 0 vs 60;
  authored scene families 0 vs 8; 3 of 5 authored spice fields permanently
  unreachable (`prospectRun.ts:69` fabricates ids instead of revealing them);
  zero `character-shop` imports in `src/`; `public/assets/audio/` empty. Lead
  spot-verified four claims — all reproduced.
- **Characterization tests** (`src/game-engine/baseline/`, 5 files, 16 tests):
  pin the PoC ending write, the triple spice credit (exact value 16.148), the
  sietch payout loop, the combat pledge + `pledged.count` flag sync (Water of
  Life dependency), and faction day updates. Lead re-ran independently: 16/16
  pass, `tsc --noEmit` clean, all files ≤96 lines.
- **Discoveries pinned as-found:** the PoC win-check runs every frame, outside
  the `isDayBoundary()` block (`GameLoop.ts:142`); the first `update()` after
  `initLoop()` always fires a day boundary (`TimeSystem` `lastDay=-1` sentinel).
- **Did not reproduce:** nothing this round.
- Remaining WP00 scope: baseline saves + browser captures (serial, one tab,
  closed after each), then the evidence-auditor critic.

## Round 2 — WP00 baseline captures (2026-08-10/11)

- **8 states captured** at `fad8653` under `baseline/captures/` (PNG +
  full-save `.raw.json` each, indexed in `captures.md` with exact steps and
  debug-helper labeling): opening, pledge, legacy payout (day 4), tribute/quota
  day 12 (patience 3→2), day-20 full-assignment quota state, an **organic
  `loss_patience` ending at day 28**, a debug-forced `win_military`, and a
  proven-blocked `survive_20_min`.
- **Blocked, with proof:** raids (`raidInterval('act1')` returns `null` —
  `resolve.ts:137` — and Act 2 was never organically reachable); the
  `survive_20_min` ending (`goalType` fixed, `setTime(1201)` leaves
  `goalAchieved` false).
- **Findings for later packages:** saves live in IndexedDB and `main.tsx:6`
  auto-loads before mount; "Play Again" reloads into the same ended run (save
  never cleared); with all 8 sietches pledged and harvesting, 0 of 3 quota
  cycles ever settled in full — the opening balance cannot clear Q1 (the pack's
  premise, now measured); `villages[].owner` vs `regions[].owner` are separate
  arrays with faction narration on the one the economy never reads.
- Lead spot-verified: capture files, raid gate, auto-load, GoalExecutor
  narration, and the loss-ending raw artifact — all reproduced.
- Next: evidence-auditor critic over the whole WP00 package.

## Round 3 — WP00 evidence audit + fixes (2026-08-11)

- **Critic verdict (fresh-context evidence auditor, `baseline/wp00-critic-verdict.md`):
  7.5/10, `verified` NOT warranted.** Re-runs passed (16/16 tests, tsc clean),
  both manifest recounts delta 0 (131 dialogue nodes, 19 locations, plus a
  reverse-BFS closing the orphan-node open item at 0), live opening reproduction
  matched every key number.
- **Named gaps, all fixed by the lead this round:**
  1. Endings coverage — three of five `EndingId` routes had no baseline row.
     Added an "Endings coverage" table to `captures/captures.md`: `win_ecology`
     blocked (act4-gated behind an act-2 exit the measured economy can't reach),
     `loss_palace` blocked and **decorative** (`actRun.ts:25` hard-codes
     `palaceHeld: true` — risk-register hit), `loss_abandoned` blocked (no
     un-pledge path exists in production code + full quotas unreachable).
  2. `actRun.ts:25` added to inventory category 3 (owner WP01); counts updated.
  3. `DialogueSystem.ts:84-86` — a fourth independent `world.player.spice`
     writer the inventory missed — added to category 6 (owner WP02).
- **Did not reproduce (critic):** capture 1's index line claimed frame 191 /
  ~3.3s; the shipped JSON is frame 814 / 13.65s. Index corrected to match the
  artifact, correction labeled.
- Next: critic delta re-audit of the three fixes → WP00 `verified` decision.
- **Delta re-audit result: 9/10, `verified` warranted.** All three fixes checked
  against source; the previously non-reproducing frame line now reproduces
  (`jq`: frame 814 / 13.6497). Two cite-precision defects named as handoff
  conditions and fixed by the lead in the same round: the `loss_patience` row now
  credits the actual writer (`EconomySystem.ts:71-75` fires first at
  `GameLoop.ts:112`; `transitions.ts:53` never evaluated — the two writers emit
  byte-identical event strings, split authority WP01 collapses), and the
  `loss_abandoned` row's no-unpledge wording now cites the production seed data
  (`sietches.ts:4-22`) and `raidRun.ts:95`'s deliberate self-assign.
- **WP00 → `verified` on the board.** Package evidence: inventory + manifest +
  5 characterization test files (16 tests) + 8 captures + endings-coverage
  table + `wp00-critic-verdict.md` (independent reviewer, two audit passes).

## Round 4 — WP01 in_progress: RNG service (A) + canonical state (C) (2026-08-11)

- Approach advisor-checked. Sequence A → C → B+D (day runner) → E (fixtures),
  forced serial by the no-concurrent-edit zones. Scope calls: WP01 targets its
  five fixtures only (five belong to WP02); the runner keeps a marked legacy-
  production seam for WP02 to delete; only RNG call sites that survive WP02 get
  seeded (CombatSystem's rolls die with `player.troops` — recorded so a critic
  doesn't count them as a miss); StatusBar's PoC readout comes out in WP01
  because the schema change forces it.
- **A (`9afb07a`):** `src/game-engine/rng/` — `RngState {seed, step}`, every
  draw derived purely from the pair (BigInt SplitMix variant, Lemire int),
  O(1) snapshot-resume. 16 tests incl. pinned seed-42 known answers. Lead
  re-ran: pass + tsc clean + zero `Math.random`/`Date.now` call sites.
- **C:** `src/game-engine/state/` (SCHEMA_VERSION 3, deterministic
  `serializeCanonical` omitting `goalType`/`goalAchieved` and embedding `rng`,
  FNV-1a `hashState`); `WorldState.rng` added (types.ts at 183/200);
  `createInitialState(seed=1)` now the contract opening — Arrakeen, day 0,
  **60 spice** (deliberate change, 00-index "Opening state"), no crew;
  migration extended in place: v1→v2→v3 chain, `deriveLegacySeed` (FNV over
  saved scalars, no wall clock), idempotency proven by deep-equal tests.
- **Casualty handled per plan:** removing the default starting crew broke
  `spiceTripleCredit.characterization.test.ts` (16.148 → 12.5). Builder
  correctly reported `blocked` instead of editing the protected file; lead
  updated it with citation — fixture now sources `INITIAL_TROOP_GROUPS`
  directly, keeping every formula input and the 16.148 pin identical.
- Lead verification: full suite 236 files / **2037 tests pass**, tsc clean.
- Next: B+D — ten-step day runner, faction/PoC quarantine, ending-writer
  collapse, multi-day catch-up, surviving-call-site seeding.

## Round 5 — WP01-BD: day runner landed (2026-08-11, `59d8667`)

- `dayRunner.ts` (124 lines): 02's ten-step order per crossed day; two marked
  legacy-production seams (updateVillages + sietch payout loop) preserved for
  WP02 in today's exact execution order; quota deliberately runs before step 8
  so a patience-0 loss lands same-day (no pause-and-decide flow until WP02);
  `runActCheck` is the SOLE ending writer (runQuotaCheck's gameOver block
  removed). GameLoop 158→36 lines, faction sim/AI/PoC checks off the campaign
  path; StatusBar PoC counter removed (forced by schema).
- **Builder-caught design bug:** a naive `-1` day sentinel would have
  backfilled ~40 days of quota settlement on every save load; `crossedDays()`
  uses a null sentinel (first call after reset fires current day only) —
  pinned by a save-load regression test asserting `cycleIndex === 1` not 4.
- **RNG:** prospect ×3, worm ×1, raid ×1 now draw from one per-day
  `createRng(world.rng)` service, written back once per day. Left unseeded
  with reasons: CombatSystem ×2 + faction ×5 (die in WP02/quarantine) and
  `endgameOps.ts:75` assaultFort — **command-time roll, deferred to WP02's
  command consolidation** (inventory's WP01 tag re-ownered; critics: this is
  recorded, not missed). `updateAI` has no random calls; quarantined.
- **Characterization deletions, cited per their headers:** `pocGoal` and
  `factionDayUpdate` baseline tests — their pinned behavior is what this
  commit removes. The three surviving baseline tests pass unmodified (lead
  re-ran; `git diff` on them empty).
- `goalType` unseeded and unread on the campaign path; field stays optional in
  types.ts until out-of-scope constructors (WP02 files) drop it. `goalAchieved`
  kept as derived shadow; freeze checks aligned by lead to `world.ending` as
  the authority (02 "Campaign status").
- Lead verification: full suite 237 files / 2037 tests + tsc clean re-run
  independently; dayRunner.ts and GameLoop.ts read in full; quarantine grep
  clean. Commit gate (incl. 8 E2E) passed at `59d8667`.
- WP01 fixture coverage complete: new-campaign-normal (C), seeded-prospect +
  multi-day-catch-up + save-load (BD determinism tests), no-faction (BD
  quarantine test). Next: WP01 evidence-auditor critic.

## Round 6 — WP01 audit, session-boundary fix, verified (2026-08-11, `bfee65a`)

- **First audit: 6.5/10, NOT verified** (`baseline/wp01-critic-verdict.md`).
  The critic's own production-sequence probes found what 2037 green tests
  didn't: `lastDay` module-global bookkeeping broke all three session
  boundaries — in-session Load replayed intervening days (day-20 save: 17
  days, +37.31 spice; day-40: spurious `loss_patience`), New mid-session went
  inert, reload re-ran the saved day. Two of three were WP01 regressions.
  Also: the canonical serializer had zero production callers — saves still
  stored the raw world, `goalAchieved` included.
- **Fix (`bfee65a`):** `WorldState.lastProcessedDay` replaces the module
  global (null = fresh only; downward resync = process-current-once; all
  three paths correct by construction since `setWorld` carries bookkeeping);
  persistence writes the canonical v4 envelope, `goalAchieved` re-derived
  from `ending` on every load; `migrateV3ToV4` backfills missing bookkeeping
  to the save's own day, never null (the bump is load-bearing — v3 saves
  self-report and would bypass migration). Three regression tests proven
  discriminating by revert-to-baseline runs.
- **Delta re-audit: 9/10, `verified` warranted.** Probes at HEAD: reload
  hash byte-identical, Load replays 0 days, New advances (rng 0→3, events
  0→8), null-branch doesn't backfill (new PROBE F2). Adversarial hostile
  save (`ending:null` + `goalAchieved:true`) loads safely — the zombie-freeze
  hazard is closed. Full suite 238/2045 + tsc clean re-confirmed.
- **Baseline shift, explained not drifted:** organic `loss_patience` now day
  36 (was 28) — the deliberate opening change (60 spice, no starting crew).
- **Carry-forwards to WP02/WP03** (recorded, not missed): `hashState` still
  has zero production callers (serves acceptance criterion 5, WP04's parity
  work); `wormSightings.atTime` hash-parity risk un-owned; residue —
  `actRun.ts:46` shadow guard, `DialogueSystem.ts:97-101` faction-reputation
  write, `FactionPanel`/`SietchCommandSection`/troops readouts,
  `endgameOps.ts:75` command-time roll. **WP01 → `verified` on the board.**

## Round 7 — WP02 opened: plan of record (2026-08-11)

- Advisor-checked. Six serial chunks, one gate-passing commit each, and an
  invariant at every commit: a fresh campaign can pledge, earn, and reach Q1
  through production UI — so the new authority is BUILT (W2a-W2d) before the
  legacy economy is DELETED (W2e). Order: W2a data model (SietchState becomes
  loyalty/pledge/crew source of truth, `CommandOutcome<T>` substrate; extend
  CommandWiring/SietchSystem, never parallel-build) → W2b pledge+crew commands
  (atomic five-step chain, refusal codes, idempotency, combat-pledge path
  dies here with `pledged.count` preserved through the canonical chain) →
  W2c pausing tribute settlement (serialized pending decision; payload must
  match 03's settlement modal spec; patience bands are a canonical-numbers
  decision to record) → W2d assignment/equipment/casualties → W2e legacy
  removal sweep (both seams, `player.troops`/`influence`, CombatSystem +
  panels, FactionPanel/SietchCommandSection; check the 5×-events E2E doesn't
  starve; influence migration step 5 is a documented no-op per WP00's
  write-only evidence) → W2f migration v5 (ONE bump for the package) +
  fixtures + browser trace (exposes read-only `hashState` via `__DUNE__`,
  closing that carry-forward).
- Traps resolved up front: the settlement-assigns-loss rule gets ONE shared
  ending-authority function (runner step 8 + settle command), after which the
  runner returns to 02's literal step order and the quota-before-8 deviation
  retires (organic-loss timing shifts again — expected, cite);
  **acceptance criterion 5 (state-hash parity) cannot pass until WP04's
  runner exists — recorded now as a scope reading, not a miss**;
  `endgameOps.assaultFort` is authored fort content, survives — commandify
  and seed it in W2d/W2f, don't sweep it with the PoC attack subsystem.

## Round 8 — WP02 chunks a–c landed (2026-08-11, `14b633d` → W2c commit)

- **W2a (`14b633d`):** SietchState owns sietch loyalty/morale/visit/gift/
  crewIds; `CommandOutcome<TCode,TReason>` substrate with the pledge as
  reference seam; crewIds aliasing bug fixed in the factory. Flagged honestly:
  loyalty had no live writer yet (closed in W2b); combat-pledged sietches now
  contribute their real loyalty to `averagePledgedLoyalty` (win_ecology-gate
  delta, organically unreachable per WP00).
- **W2b (`98bc2bf`):** atomic five-step pledge chain, six stable refusal
  codes, deterministic crew `group_<villageId>` (win-back re-attaches, never
  duplicates), sietch loyalty live via gifts/dialogue/neglect-decay (arrival
  +5 superseded — authored rule grants nothing automatic), combat pledge path
  dead with Water of Life proven through the production dialogue selector,
  `combatPledgePath` characterization deleted per its header. **Gameplay
  shift:** one-click pledge gone — opening targets are red_wall (80,
  discovered:true — verified), cave_of_birds (70), sihaya_ridge (62); Tabr
  (45) needs trust first. Crew-sizing delta flagged for WP04: formula yields
  flat 15 today vs simulate.ts's flat 28 — unreconciled.
- **W2c:** pausing tribute settlement. `PendingSettlement` payload (02's five
  fields + cycle identity; 03's "committed" field N/A — no partial-commit
  concept exists, omitted deliberately); settle command idempotent by
  construction (cleared decision → `no-pending-settlement`); auto-ship
  opt-in gated behind first settlement; decision serializes (no version
  bump — optional field, `fromEnvelope` defaults null); pause.ts gains
  `settlementPending`; centre-screen minimal modal. **One ending authority:**
  `evaluateEndingAuthority` called from runner step 8 AND the settle command;
  runQuotaCheck's auto-settle dead; 02's literal step order restored (payout
  seam sits before step 9 so same-day income lands in the decision's stock
  snapshot); actRun freeze guard now keys `world.ending` (WP01 residue
  closed). **Measured behavior change, designed:** organic loss by pure
  inaction no longer exists — the clock freezes at the day-12 decision
  (1000-frame probe, zero drift), satisfying 03's no-unrecoverable-loss;
  losses now require repeated active short settlement. Canonical-numbers
  decisions recorded: auto-ship default = full due; UI default = legalRange
  .max; legalRange.min = 0 (forced by the patience-0 zero-stock path); NaN →
  `amount-negative`. Patience bands reused verbatim from quota.ts (0.6
  partial fraction, 0.25 arrears surcharge, +1/hold/−1).
- Lead verified each chunk independently (suite + tsc + protected-file diffs
  + code reads). Suite at W2c: 250 files / 2115 tests. **types.ts is at
  exactly 200 lines — zero headroom; W2d must split before adding types.**

## Round 9 — WP02 chunks d–f + the package browser trace (2026-08-11)

- **W2d (`7b9606b`):** assign-crew/issue-equipment/assault-fort commands; one
  casualty rule (dissolve/merge/shrink) across worm/raid/assault; market
  `availableStock(ctx)` single authority (tier3Unlocked was hardcoded false —
  fixed; first tier-3 item added, price 150 recorded); equipment condition
  removed from scope per 02's own rule; **live defect fixed** — the dead
  `equipmentIds` mirror made CrewPanel and the quota projection ignore issued
  gear. Hook forced three test-file splits (projection/harvest/resolve).
- **W2e (`a696dcf`):** the deletion sweep, +280/−1614. Both dayRunner seams,
  sietch task system + UI, CombatSystem + AttackSection whole,
  `player.troops`/`player.influence`, dialogue faction-reputation write,
  FactionPanel unmount. Live pledge button rescued into PledgePanel before
  its host file died. WP00's characterization suite fully retired, every
  deletion cited. single-harvest-authority proven numerically. E2E events
  test rewritten (fresh campaigns emit nothing passively now) — validated by
  the commit gate's real Playwright run.
- **W2f code (`176685f`):** migrateV4ToV5 (drop troops/influence/task
  progress/aiTimers; ≤1 deterministic crew per legacy pledged sietch; zero
  back-pay; idempotent); factionProfiles stops serializing (reseeded from
  data — no live campaign writer exists); goalType fully out of WorldState;
  frozen v2 legacy fixture proves post-migration playability; all ten 02
  fixtures inventoried (legacy-save-migration was the one gap, closed);
  `__DUNE__.hashState()` exposed.
- **Package browser trace (lead-driven, one tab):**
  `baseline/wp02-trace/trace.md` + 3 PNGs. All exit-proof beats through
  production UI: pledge (15-hand crew), crew harvest (60→64.80 spice, sole
  income), reassignment (skill 30→34), day-12 settlement (clock provably
  frozen; partial band held patience, arrears 31 carried; auto-ship
  unlocked), TWO visible rejections (prospect-needs-thopter;
  amount-exceeds-available), reload continuity byte-exact on every field
  with no replayed day. Labeled helpers: `pick` for canvas clicks, `setTime`
  for day advancement.
- **Trace finding, fixed same round:** reload reissued colliding event ids
  (module counter vs restored world — the `lastProcessedDay` defect class);
  `nextEventId()` now resyncs from `world.events`, regression-pinned.
- False alarm recorded honestly: an early one-hop probe suggested no sietch
  was reachable at day 0; the travel model is region-hop-based and Red Wall
  is two production hops away. Suite at trace close: 257 files / 2107 tests.
- Next: WP02 evidence-auditor critic over the whole package.
