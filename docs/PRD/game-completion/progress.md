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
