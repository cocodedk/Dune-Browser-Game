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

## Round 10 — WP02 audit, remediation, verified (2026-08-11, `74005ae`)

- **First audit: 7/10, NOT verified** (`baseline/wp02-critic-verdict.md`).
  Blockers: unbounded repeatable dialogue spice (seven locations paying
  10–25 per conversation — four chats covered Q1 with zero crews) and C3
  FAIL (gift command had no production emitter and its outcome was
  discarded — no production path could raise sietch loyalty at all). Plus
  a caught miscount in the lead's trace doc (three delivery events, not
  six — corrected with label).
- **W2g (`74005ae`):** positive dialogue rewards pay once per (treeId,
  nodeId) via serialized flags (same-tree locations share one budget;
  one-time ceiling 55 vs Q1's 90; ritual costs stay repeatable);
  GiftPanel production emitter + four gift refusal codes and auto-ship's
  lock surfaced as events; Tabr trust path proven on the real bus
  (45 → two 20-spice gifts → 61 → pledged, one crew).
- **Delta re-audit: 9/10, `verified` warranted.** Critic's own probes: all
  seven locations pay once then zero; shared budget confirmed; flag
  survives reload; exhaustive all-19-location branch sweep nets −15;
  eleven refusal paths, zero silent; 55 ceiling reproduced analytically.
  Critic self-corrected two of its own mis-authored probes on record.
- **Explicit carve-out on the board:** acceptance criterion 5
  (runtime/simulator hash parity) is NOT met by WP02 — inherited by WP04
  with the 15-vs-28 crew-size divergence and the 55-spice one-time
  opening boost as untuned balance inputs. Content oddity for WP05/WP09:
  a shared-tree conversation pays at the first sietch and is silent at
  the other four.
- **WP02 → `verified`.** Package total: six build chunks + one
  remediation, a lead-driven browser trace, two audit passes; suite
  260 files / 2123 tests.

## Round 11 — WP03 opened: plan of record (2026-08-11)

- Advisor-checked. Seven serial chunks: W3a objective seam + starting
  contract → W3b title/new-run setup (difficulty leaves StatusBar,
  written once) → W3c beats 1–2 (briefing + ledger; **loyalty-pump gate
  extended to positive loyaltyDelta here** — Beat 4's replies must not
  make re-conversation a free trust pump; opening beats get their OWN
  dialogue trees, never the shared fremen_sietch tree whose (tree,node)
  budget is cross-location; NO new positive spiceDelta in opening
  content — the 55 ceiling is a recorded WP04 input) → W3d beats 3–5
  (travel tutorial, Stilgar near-threshold trust, pledge confirm, crew
  reveal; **Red Wall's 80 seed drops to near-threshold IN THIS CHUNK**,
  same commit as the dialogue that closes the gap, fixtures updated with
  citation — canonical numbers recorded) → W3e beats 6–7 (Tabr gift
  dilemma, settlement upgrade to 03's preview spec, Fenring/Thufir
  responses, opening.complete) → W3f guidance/coach marks + recovery
  matrix + disclosure completion → W3g the 8 fixtures + 6 Playwright
  scenarios.
- **Every chunk's commit carries its own E2E repairs** — the gate runs
  Playwright per commit; a UI change split from its E2E update is a
  burned gate cycle.
- **Scope readings, recorded before the critic finds them:** 03
  acceptance 2–3 are human-gated and outside WP03's exit proof ("ready
  for first-time-player testing" is its own wording) — they close in
  WP14; autosave = the existing rolling save, slots are WP11's;
  settlement "committed" stays N/A per W2c's field-by-field reading;
  W3a builds the minimal act1 objective-record seam and **WP05 extends
  it** (no parallel-build); the 8 fixtures are engine tests through
  production entry points and the 6 scenarios are Playwright against the
  release preview — that is the reading of "fixtures pass in the release
  browser"; yield-range shown / exact density hidden — the knowledge
  gate's content is WP05's.
- Charisma-cap arithmetic must be read from loyalty.ts before the
  opening-charisma-cap fixture is written — if the +5 pledge award makes
  a third slot before a third pledge, the reconciliation is an authored
  canonical-numbers decision, not a builder's silent pick.
- Beat 1 passes with procedural portraits today; W3c adds the **drop-in
  2D portrait slot** (folder + loader + framing spec, user image
  preferred over procedural fallback) — closes the user's open portrait
  item; tell him where to drop files when it lands.
- Package close = TWO critics: the evidence audit AND the loop's first
  **blind-play critic** (fresh context, cold Playwright run, no
  coaching — both "understandable?" and "correct?"), one tab, serial.

## Round 12 — W3a landed + three user findings applied (2026-08-11)

- **User findings (from play, 2026-08-11 morning), all applied:**
  1. "Travelling is broken" — root cause: he was playing the dev server
     while W3a's briefing-pause edits were landing live; verified in the
     real browser post-landing: fresh campaign starts frozen at the
     briefing (by design), the Duke's dialogue completes through real
     replies, the clock resumes, and Arrakeen → Hagg travel runs and
     arrives. Working.
  2. "Number of sietches reduced" — the opening's narrowed discovery made
     undiscovered places vanish from the globe. Applied his art
     direction (names hidden, not places invisible): markers now stay
     visible for undiscovered locations as anonymous dim spires; only
     LABELS are discovery-gated (`PlanetMarkers.ts`, `SietchMarkers.ts`).
     Verified on the globe: four named places, anonymous spires
     everywhere else.
  3. "Arrakeen must not be a sietch" — data was already `kind:'palace'`
     and the 3D hall gate correct; the defects were presentation: the
     view hint said "Click a sietch to travel" (now "location") and the
     capital wore sietch marker colors (now an imperial off-white spire).
     Verified visually.
- **W3a (chunk):** act1 objective seam (7 stable ids, flag-derived, pure
  queries; WP05 extends), ObjectivePanel with Show/Why/history,
  discovery narrowed to Arrakeen/Red Wall/Tabr + Hagg waypoint, briefing
  pause keyed on `lastProcessedDay === null` so old saves never freeze,
  stand-in briefing completion (`// W3c replaces`), autosave on
  opening.complete. Lead verified the full beat chain live in-browser:
  briefing → objective advances to "Read the tribute ledger" →
  "✓ Hear the Duke's briefing" in history → travel under way.
- **Charisma-cap finding (W3g decision owed):** `maxPledged =
  floor(charisma/10)`; after two pledges charisma 30 opens a third slot,
  so 03's `opening-charisma-cap` fixture cannot refuse under the current
  rule — an authored canonical-numbers reconciliation is owed at W3g.
- **CommandWiring.ts at 192/200** — W3b must split before adding title
  wiring. Suite: 262 files / 2143 tests.

## Round 13 — WP03 build complete: chunks b–g (2026-08-11, `2cfa857`…`d85df57`)

- **W3b:** title screen (Continue with probeSave metadata, corrupt-save
  state, version id), difficulty cards from the real config (Easy Q1 68 /
  Normal 90 / Hard 117), difficulty written once — buttons left StatusBar;
  renderer never constructed on the title; CommandWiring split 192→57.
- **W3c:** story/briefing + story/ledger beats auto-open and chain as one
  morning sitting; canCloseDialogue softlock guard; loyalty-pump closed (27
  nodes, 8 trees); **2D portrait drop-in slot**
  (public/assets/portraits/<id>.png + README); two speaker-resolution bugs
  fixed (2D + 3D: named speaker beats first-resident). E2E lesson: a reply
  that unmounts its own button hangs Playwright's click() — chooseReply
  dispatches instead.
- **W3d:** DOM destination list (engine answers verbatim), 3s flight-skip
  gate, story/redwall_trust (seed 80→**55** canonical; both replies +5 to
  exactly threshold; solidarity/transaction flags for WP05), pledge confirm
  step, crew card with recommended field + authored-bounds yield range.
  **Root-cause E2E fix:** headless SwiftShader GL starved the main thread in
  3D interiors — GPU launch args; suite twice as fast.
- **W3e:** story/tabr_dilemma (pure context, closes freely — never scripts
  the decision), settlement previews Full/Minimum/Selected via the same
  pure settleQuota, story/q1_debrief (Fenring ×3 bands + Thufir summary),
  charisma-cap copy cites the three real sources. **Measured:** invest line
  ~51.5 (browser path) / 54.35 (engine path) vs 90 due — 03's two-plans
  framing is NOT yet balanced; WP04 retune input.
- **W3f:** coach marks (anchor by objective target, dismissable, on-action
  removal, guidance-off path proven), truthful conversation hints, seven
  recovery rows verified, market disclosed on den discovery (was an empty
  frame from frame one; den is Tsimpo — brief's 'Arrakeen' corrected).
  Store-selector lesson: s.world object selectors never re-render (same
  mutated reference) — destructure pattern is load-bearing.
- **W3g:** CHARISMA_PER_PLEDGE 5→**4** (authored: capacity 2 holds through
  two pledges; third slot via CHARISMA_PER_QUOTA keeps recovery copy true);
  rolling autosave extended to travel-start + settlement-created (runtime
  hooks, engine/IO boundary kept); all EIGHT fixtures and SIX scenarios
  mapped and closed (keyboard-only traversal: zero UI fixes needed).
- Suite at close: 282 files / 2272 tests; 21/21 E2E ×2. Board: WP03 stays
  `in_progress` pending the two package critics (evidence + blind-play).

## Round 15 — WP03 critics, two remediation rounds, verified (2026-08-11, `77e793d`)

- **First verdicts: evidence 7/10, blind-play 7/10 — both `in_progress`.**
  Blind comprehension scored ~9/10 (a cold player understood objective,
  deadline, next action; named both plans; settled Q1 twice in <12 min
  without debug state — closing the five-dry-runs ledger at 3 suite + 2
  cold). The failures were correctness: no pause control (8 of 12 deadline
  days burned just reading), dead Show on 3 of 7 objectives, the settlement
  cluster (float prefill, dishonest 'Full (63)', 'no crews harvesting' lie,
  degenerate duplicate previews), canvas-only Speak at Hagg (stale panel),
  Thufir's debrief skippable at Fenring's terminal-sounding lines, identical
  Fenring for 63 vs 54, misleading ornithopter copy, raw ids in crew UI.
- **W3h (`0a572b1`)** fixed all nine merged items. Evidence delta re-audit:
  **9/10, evidence half `verified`** — every fix confirmed at the audit's own
  measured states; two honest corrections (read_ledger's Show is unreachable
  behind the mandatory overlay — closed-with-wording-fixed; its own
  acceptance-4 ruling had been under-tested at Hagg).
- **Blind findings re-check verified all six fixes but found a NEW
  regression:** pause + travel = permanent clock freeze, autosave-persisted
  through reload (score dropped to 6/10). Lead reproduced a SECOND softlock
  live: mid-session StatusBar New never re-opens the briefing (mount-only
  auto-open) — frozen at briefingPending forever.
- **W3i (`77e793d`)** killed the family at the root, all red-first: opening
  auto-open moved to the per-frame GameDriver pattern (self-heals on any
  entry path; revert times out campaign #1); travel refuses during mandatory
  dialogue ('finish-the-conversation') making the frozen state unreachable;
  manual pause stripped from canonical state and forced false on load
  (goalAchieved precedent; paused/unpaused worlds hash identically);
  spacebar reads live store state; settlement default floors (never rounds
  past legalRange.max — pinned on the audit's exact float); choosing a speed
  clears pause (control-desync dead).
- **Final blind re-verdict: 8/10 (comprehension 9, correctness 7),
  blind-play half `verified`** — the exact repro now refused with visible
  copy; speed-clears-pause, mid-session New, and paused-save-loads-running
  all confirmed in production play, plus an added in-flight-pause check.
- **WP03 → `verified` on the board.** Package total: seven build chunks +
  two remediation chunks, two critics with three delta passes, 26 E2E.
- **Carry-forwards (non-blocking, recorded):** coach-mark overlap, no
  confirm on the 20-spice gift, arrears surcharge unnamed in copy,
  resting-state speed-button legibility → WP11; Chani/thopter narrative
  mismatch + dialogue acknowledgement polish → WP05/WP09; one-click travel
  commit + 3s skip-gate/guidance-rule-4 coverage debt → WP11/WP14; the
  giveHarvester scenario bridge + invest-line shortfall + cycle-2 pressure
  (183 due vs ~2.9/day) + crew 15-vs-28 + 55-spice ceiling → **WP04**.

## Round 16 — WP04 opened: plan of record (2026-08-11)

- Advisor-checked. Six serial chunks: W4a runner core (imports the REAL
  commandHandlers — trace = bus-event tuples both sides replay; saveGame
  no-ops headless with citation; the runner's tick calls the runtime
  auto-open hooks or the briefing gate freezes exactly like the
  mid-session-New bug; **simulate.ts dies here**, closing WP02's C5
  carve-out and the 15-vs-28 divergence) → W4b parity (protocol pins time
  to day quanta via setTime on the browser side; a separate parityView
  hash EXCLUDES events — canonical saves unchanged; wormSightings decided
  with citation) → W4c agents (reserve/capacity/reactive/novice/recovery,
  player-visible queries only, every agent settles tribute explicitly and
  walks dialogue via production chooseDialogue) → W4d sweep (SEQUENTIAL
  node script — the world singleton forbids Promise.all; published
  baseline/wp04-sweep/seeds.txt is a contract: regression seeds add,
  inconvenient ones never leave; summaries committed, raw traces
  regenerable) → W4e tuning (lead-authored rounds per 07's seven steps;
  levers that do NOT detonate WP03's pinned numbers: crew yield/skill
  curve, second-crew sizing, gift cost-vs-gain, cycle-2+ escalation rate;
  Q1=90/day-12 and the 54/45 quota constants are contract, not knobs) →
  W4f closure (strip the giveHarvester bridges once FULL is honestly
  reachable, WP03 suite fallout updated with citations, evidence-auditor
  critic with 07's rejection criteria as its completeness hunt).
- **Recovery fixture reading owed** (invariant 2 + exit proof): 07's
  "damaged field" and raid threat don't exist in act 1 — construct from
  what does (patience 1, arrears, depleted field, pledge near decay
  threshold), record the reading.
- On WP04 `verified`: **M1 flips and the loop STOPS** — build handed to
  the user for the play verdict, per 09's stop conditions.

## Round 17 — WP04 chunks a–f (2026-08-11/12, `395624c`…W4f)

- **W4a (`395624c`):** runtime-faithful runner driving the REAL
  commandHandlers; shared runtimeTick (GameDriver and runner cannot
  drift); saveGame no-ops sans indexedDB; simulate.ts DELETED (closes
  WP02's C5 carve-out + the 15-vs-28 divergence); reserve-line smoke
  deterministic to the byte with mid-run reload.
- **W4b (`6cc30bb`):** parity EXACT through two tribute cycles on both
  lines — parityView excludes events + wormSightings (cited; time/rng
  stay in), __DUNE__.replay + ?seed=N evidence affordances, fixtures
  generated same-commit; three real races root-fixed (unbound emit,
  ambient rAF between evaluates, reload-vs-async-save durability poll).
- **W4c (`e7f7fd5`):** five agents as pure VisibleState policies
  (settle-explicitly enforced by throw; production dialogue predicate);
  distressed fixture PLAYED into patience-1; invariant-2 probe 0/10 at
  a 9-vs-246 order-of-magnitude gap.
- **W4d (`1f83a47`):** published 100-seed append-only sweep, 1300 runs
  in 68.5s, zero seed variance in the window (invariant 9's teeth),
  invariants 1+2 FAIL stated numerically; capacity ≡ reactive
  byte-identical; ~23/23 idle days recorded.
- **W4e (`d615aa4`):** the authored retune — hand rate 6→7, crew floor
  15→40, opening fields to 95, BASE_AMOUNTS [90,100,30]. Two protocol
  rounds; round-1 hand-math predicted 120/69, measured 118.85/68.76.
  ALL FIVE TARGETS MET: reserve FULL/FULL, invest FULL/FULL, income
  15.40 vs 7.70/day, recovery 0/100→**100/100** with patience held,
  difficulty monotonic. Lead decisions logged: the Normal overshoot
  goes to the M1 play verdict rather than a round-3 trade against the
  binding recovery constraint; cycle-3's base-30 dip is a recorded
  temporary artifact owned by WP05's act escalation. Test-infra:
  reuseExistingServer=false (stale-dist phantom failures) + the
  mid-session-New assertion de-raced (scheduler-luck flake on identical
  trees, fixed by asserting the ledger dialogue's own copy).
- **W4f:** both giveHarvester E2E bridges STRIPPED (opening3, opening5)
  — the invest scenario now proves the real economy with zero state
  mutation; both pass. Suite: 294 files / 2364 tests; 28/28 E2E.
- Next: WP04 evidence-auditor critic → board flip → **M1** → STOP and
  hand the user the build.

## Round 14 — WP03 remediation W3h: both critics' findings closed (2026-08-11)

- **Verdicts merged (`baseline/wp03-critic-verdict.md` 7/10 + `baseline/
  wp03-blindplay-verdict.md` 7/10):** nine required items, all closed.
- **Pause (both critics' biggest gap):** `onPause`/`game:pause` were fully
  wired (CommandWiring.ts, pause.ts's `manual` input, GameLoop.ts) with no
  emitter anywhere — StatusBar now has a `0×` button (spacebar bound too,
  guarded off text-entry targets) beside 1×/2×/5×. No engine change needed;
  the seam was already correct.
- **Objective `Show` for panel targets:** was a silent no-op for
  `act1.read_ledger`/`order_first_harvest`/`prepare_q1` (evidence F4).
  `coachAnchor.ts` (new, shared with CoachMark.tsx) finds the `data-coach`
  element; ObjectivePanel's Show now briefly outlines it — a one-shot
  flash, not a coach mark, so it never blocks the screen either.
- **Settlement modal cluster (evidence F3 + blind-play C1-C3):** (a) the
  custom-amount prefill now displays rounded to one decimal — the raw
  15-decimal stock float was cosmetic only; the underlying settle amount is
  unchanged. (b) "Full (N)" only labels the button when N actually equals
  the full amount due; when stock falls short it reads "Pay all available
  (N)" — Fenring's own "Not the full sum" line no longer contradicts the
  button the player just pressed. (c) when `legalRange.max <=
  minPartialPayment` the Full/Minimum previews used to collapse into two
  identical rows (and an identical pair of preset buttons); now one honest
  result row plus "the minimum partial (N) is out of reach", and the
  redundant Minimum button is not rendered. (d) QuotaLedger's "no crews are
  harvesting" caption was gated on `dailyRate > 0`, which reads 0 at the
  deadline itself (`daysRemaining === 0`) or mid-changeover even though a
  crew IS assigned — regated on actual assignment (`task === 'harvest'`);
  the rate line now always shows, even "0.0/day", when one exists.
- **Stale location panel at Hagg (blind-play acceptance-4 failure):** root
  cause was that only `dialogue:started` ever updated `ui/store.ts`'s
  `selectedVillage` — true at Red Wall/Tabr only because Beats 4/6
  auto-open a tree there, never true at a plain waypoint like Hagg.
  `TravelSystem.ts`'s `checkTravelArrival` now emits `village:selected` on
  every arrival, mirroring that pattern instead of piggy-backing on it.
- **Thufir's debrief never appearing (blind-play L189) — root cause:**
  `Q1_DEBRIEF_TREE_ID` was never in `DialogueSystem.ts`'s `canCloseDialogue`
  mandatory set, so × and Escape were live at Fenring's own root node.
  Fenring's lines read as terminal on their own ("Make a habit of it.",
  "See that you do."), so the affordance to close the WHOLE debrief right
  there existed and nothing else could skip Thufir — the only other
  `endDialogue` path is a null-`nextId` choice, and the root's one choice
  chains to Thufir instead. Fixed structurally, not by inference about
  what the blind player actually pressed: `Q1_DEBRIEF_ROOT_IDS`
  (opening-q1-debrief.ts) joins the mandatory set for its four root nodes
  only — free again once Thufir's own node is reached. Fenring's partial-
  band line also now has two variants (magnitude, not digits): "nearly
  full" at ≥66% of due, "bare minimum" below — canonical-numbers decision,
  `Q1_DEBRIEF_NEARLY_FULL_FRACTION = 0.66` in quota/settlement.ts, computed
  from the settlement snapshot at settle time and carried through a new
  one-shot flag, band-level granularity unchanged (no interpolation).
- **Travel-gate copy:** "Too far without a long-range ornithopter" read as
  an equipment gate for a rule that is actually region adjacency on foot —
  reworded to name the real rule and both remedies ("Out of walking range
  from here — travel through a closer place first, or wait for a
  long-range ornithopter to go directly").
- **Raw ids in crew UI (blind-play C5):** `SpiceField` has no name slot —
  new pure `fieldDisplayName()` (troops/, unit-tested) derives
  'Red Wall Pan' from 'field_red_wall_pan'. Applied in CrewCard's field
  buttons, recommendation line, harvesting status, and order-confirm
  title, AND in the engine's own event log line
  (`commands/assignCrewCommand.ts` — "Crew ordered to harvest
  field_red_wall_pan." was leaking the same raw id into the log, not only
  the UI). CrewCard's crew-name header also now reads the home sietch's
  real name instead of its raw id, reusing the lookup already computed for
  the meta line beneath it.
- **Bookkeeping (evidence §3.3, §6, §8):**
  - `giveHarvester`'s use in scenarios 3 and 5 (opening3.spec.ts,
    opening5.spec.ts) was disclosed only in those files' own comments —
    recorded here now, not just in-file: both scenarios reach the FULL
    band only because of it; the real (`giveHarvester`-free) invest line
    lands SHORT/degenerate, which is finding F3's own subject.
  - Recovery row (d) (idle crew, no auto-assign) is copy-only, not a
    mechanism — `objectiveCopy.ts`'s line exists; no test asserts it.
    Unchanged this round; not in the merged fix list.
  - The portrait "404" carry-forward the evidence critic corrected: the
    request actually returns **200 `text/html`** (Vite's preview SPA
    fallback serving `index.html` for the missing PNG), not a 4xx. Any
    future WP15 sweep must search for **silent wrong-content fallback**,
    not 404s — a 404-only sweep would find nothing and wrongly call it
    closed.
  - `opening-reserve-line`'s in-code `78.89` comment
    (`openingLineFixtures.test.ts`) now cites the real-chain number too:
    77.35, measured by walking the real dialogue trees and the real
    two-hop Arrakeen→Hagg→Red Wall trip (the evidence critic's P1). Both
    land PARTIAL; the assertion itself is unchanged (78.89 is this
    fixture's own honest number under its teleport-and-force-loyalty
    shortcut) — only the comment's citation was wrong.
  - Five-dry-runs ledger: the evidence critic counted 3 clean shipped
    suite runs (opening4's settlement-reload, opening6's reserve line,
    opening8's keyboard-only traversal); the blind-play critic's own two
    cold Playwright runs (Run 1 reserve, Run 2 invest) each independently
    settled Q1 on the plain URL with no `?debug=1` debug state — 3 + 2 = 5.
- **E2E deltas:** new `opening9.spec.ts` (pause via button, pause via
  spacebar, Hagg arrival selection — 3 tests, no `.click()` on canvas).
  Updated for the raw-id/label/copy changes above: `opening2.spec.ts`
  ("Too far" → "Out of walking range"; `red_wall_pan` → `Red Wall Pan` ×2),
  `opening3.spec.ts` (`sietch_tabr`/`tabr_shallows` → display names),
  `opening5.spec.ts` (`red_wall_pan`/`tabr_shallows` → display names),
  `opening6.spec.ts` (`red_wall_sietch` → `Red Wall Sietch`; `Full (` →
  `Pay all available (` — the reserve line lands PARTIAL, not full),
  `opening8.spec.ts` (`red_wall_pan` → `Red Wall Pan`), `opening4.spec.ts`
  (`Full (` → `Pay all available (`, same PARTIAL reason). `helpers.ts`'s
  `reachFirstCrew` and its own doc comment updated to match.
  `opening-q1-debrief.test.ts` restructured for the four-root-id table and
  the new `canCloseDialogue` expectation (false at root, true at Thufir).
  `q1Debrief.test.ts` covers the new `nearlyFull` flag. `CommandWiring
  .test.ts` gained a `game:pause` routing test, same shape as `game:speed`'s.
- **Gates, all green:** `npx vitest run` 283 files / 2280 tests;
  `npx tsc --noEmit` clean; `npm run lint` clean; `npm run build` clean
  (bundle budgets passed); `npx playwright test --workers=1` 24/24
  (21 prior + 3 new in opening9.spec.ts).
- No commits made this round; both critic verdict files left untouched.
