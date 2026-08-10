# WP00 baseline captures

Status: `in_progress` for states 1-6 and 7a/7b — captured at the commit below with
exact steps recorded so they can be independently reproduced; not yet `verified`,
which per the status vocabulary requires an independent reviewer against the diff
and raw artifacts (the evidence-auditor round has not run). Raid (state 5 of the
task list) is `blocked` — see below.

Commit: `fad86532e3745fc2a34a854d7e24b25e6079131c` (branch `feat/game-completion`).
Dev server: `http://localhost:5174/`, one Playwright tab, closed after this batch.
All timestamps below are `world.time` in game-seconds; `DAY_SECONDS = 60`, so
`day = floor(world.time / 60)`.

Every capture folder file is named `NN-<state>.png` / `NN-<state>.raw.json`. The
`.raw.json` file is the exact object returned by the `browser_evaluate` call listed
under that state — it embeds the full IndexedDB save blob (`save.state` = the
complete `WorldState`) plus a `debugHandle` snapshot from `window.__DUNE__`.

## How every state's numbers and save blob were captured

The task asked for a localStorage dump. **The game does not use localStorage for
saves** — see Finding 1. Every state below instead: (a) clicks the production
**Save** button (`src/ui/StatusBar.tsx`, calls `persistSave(get().world)` →
IndexedDB `dune-browser-game` / `world-state` / key `"current"`), then (b) reads
that IndexedDB record back via `browser_evaluate`, which returns the complete
`WorldState`. `window.__DUNE__.player()` only exposes 5 fields (state, location,
travelTarget, spice, inDialogue), so the save blob — not the debug handle — is the
source of truth for flags/quota/act/charisma/ending in every `.raw.json` file.

Where a click is described as "production UI," a real DOM `button.click()` was
used (either via a `browser_click` ref or a `querySelectorAll` text match — both
fire the same React `onClick`, there is no functional difference). Where a step
used `window.__DUNE__.<helper>`, it is called out explicitly — that is baseline
evidence, not cheating, per the task's honesty rule.

---

## 1. Opening state (fresh load, before any action)

**Status:** verified. **Path:** production (no interaction at all).

- `01-opening.png` — first screenshot after `browser_navigate`, before any click
  or evaluate. Day 0, ~4s into the run (the render loop starts ticking before
  Playwright's screenshot lands).
- `01-opening.raw.json` — a **second**, separate fresh load (IndexedDB save
  explicitly deleted first, see Finding 2 on why that step is necessary), Saved
  immediately, then read back. Same `createInitialState()` as the PNG, not the
  same exact frame — noted inside the file's `note` field.
- Frame/day at capture: PNG at frame ~229 / day 0 (~worldTime 3.9s). JSON at frame
  191 / day 0 (~worldTime 3.3s).
- Helper calls: none for the PNG. For the JSON: IndexedDB `delete('current')` via
  raw `indexedDB` calls (equivalent to production `deleteSave()`), then
  `browser_navigate`, then click **Save**, then read IndexedDB back.
- localStorage dump included in the JSON: `{}` (empty) — see Finding 1.

## 2. One pledge

**Status:** verified. **Path:** mixed — `pick()` (debug helper, listed as
allowed) substitutes for a 3D-canvas click; the **Pledge** button click itself is
production UI (`SietchCommandSection.tsx` → `EventBus.emit('player:pledge_sietch')`
→ `SietchSystem.pledgePlayerSietch`).

- `02-pledge-sietch-tabr.png` / `.raw.json`.
- Exact calls: `window.__DUNE__.pick('sietch_tabr')` (player already starts at
  Sietch Tabr, a Fremen-owned village) → this opened a Chani dialogue
  (`decideVisit` routes "click your own location" to a resident's dialogue tree)
  → clicked **Close** (×) → clicked **"Pledge the Fremen of Sietch Tabr"**.
- Day/frame at capture: day 1, frame 7090, worldTime 97.4s.
- Event confirmed in the save: `sietch_pledged` — "The Fremen at Sietch Tabr
  pledge their loyalty to you."
- Also assigned the sietch to **Harvest spice** (production UI) in this same
  session, to set up state 3.

## 3. One legacy payout (sietch threshold payout)

**Status:** verified. **Path:** production UI for the pledge/assign (done in
state 2); `window.__DUNE__.setTime()` (debug helper) used to advance days.

- `03-legacy-payout-day4.png` / `.raw.json`.
- Exact calls, in two separate `browser_evaluate` round trips:
  `window.__DUNE__.setTime(3*60+1)` then, ~30s of real tool-call time later,
  `window.__DUNE__.setTime(4*60+1)` — each followed by `await sleep(400)` so
  the render loop's next `requestAnimationFrame` could process the day
  boundary and the Zustand store could catch up (`world:updated` is throttled
  to 100ms of real elapsed time). The 2.4/3.0 progress reading between the two
  calls (rather than the 1.2 a single day-3 boundary would give) shows a
  **second**, natural day-boundary (day 1→2) also fired from real-time drift
  while other tool calls ran — see Finding 3.
- Day/frame at capture: day 4, frame 11553, worldTime 264.1s.
- Event confirmed in the save (`evt-34`, `type: "spice_shipment_received"`):
  **"Fremen at Sietch Tabr deliver 12 spice"** — contains "deliver" as the task
  specified. Player spice 0 → 12.

## 4. One tribute/quota event (day ~12)

**Status:** verified. **Path:** debug `setTime()` to reach day 12; the quota
settlement itself (`runQuotaCheck` in `EconomySystem.ts`) is fully automatic —
"Payment is automatic from stock," no player action fires it.

- `04-tribute-quota-day12.png` / `.raw.json`.
- Exact call: `window.__DUNE__.setTime(12*60+1)`, `await sleep(500)`.
- Day/frame at capture: day 12, frame 15124, worldTime 756.4s.
- Event confirmed (`evt-36`, `type: "tribute_refused"`): **"The Emperor is not
  paid. Patience 2 of 3 remains."** Only one pledged sietch was harvesting at
  this point (Sietch Tabr, 12 spice paid against 90 due) — a `short` band
  (paid < 60% of due), so patience dropped 3→2 and the full 78-spice shortfall
  carried forward as arrears (`quota.arrears: 78`, `nextDueDay: 20`,
  `amount: 150` for cycle 2). This is genuine baseline balance behavior, not an
  artificial setup — see also `docs/PRD/game-completion/07-balance-playtest-and-release.md`
  and progress.md Round 1's harvester-affordability finding.

## 5. A raid — BLOCKED

**Status:** blocked, with both a code-level and an empirical reason.

**Code gate:** `raidInterval(act)` in `src/game-engine/combat/resolve.ts` returns
`null` for `act === 'act1'`, and `runRaidCheck()` returns immediately when the
interval is `null`. Harkonnen raids cannot fire in Act 1 under any amount of
time advancement — confirmed by reading the source before attempting anything.

**What was tried, empirically:** reaching raids requires reaching Act 2, which
`evaluateActTransition` (`acts/transitions.ts`) requires `quotasPaid >= 3` (full
bands) **and** `pledgedCount >= 3`. To give this a genuine shot:

1. Pledged **all 8** Fremen-owned sietches that still existed at day ~16-17
   (`sietch_tabr, red_wall_sietch, habbanya_ridge, wind_pass, bight_of_cliff,
   sihaya_ridge, red_chasm, cave_of_birds`) via `teleport()` (debug) + `pick()`
   (debug) + production **Pledge**/**Assign → Harvest spice** clicks for each.
   `teleport()` was necessary because the player can only be in one place and
   travel takes real time the task's budget did not justify; each pledge/assign
   click is a real production action.
2. Advanced time toward day 20 and then day 28 (screenshot/dump at both) to
   watch the quota bands and pledge state, via two `browser_evaluate` loops:
   `for (day = 18; day <= 20; day++) setTime(day*60+1)` (single-day steps),
   then later `for (day = 22; day <= 28; day += 2) setTime(day*60+1)`
   (2-day steps — per Finding 3, this means only the day-22/24/26/28
   boundaries are guaranteed to have fired between the two captures; any
   odd-day boundary in that range only fired if natural real-time drift
   crossed it independently. The day 20→28 production window therefore
   processed roughly 4 day-boundaries, not 8 — the quota fell shorter, sooner,
   than continuous per-day stepping would have shown, which if anything
   understates rather than overstates how easy the cycle is to make.)
3. Result at day 20 (`05-quota-day20-full-assignment.*`): despite **all 8**
   sietches pledged and harvesting (`pledged.count: 8`, confirmed per-village in
   the JSON's `sietchStatus` array), the cycle still settled short — only 2 of
   8 sietches had reached their production threshold in time. Patience dropped
   to 1 of 3. Quota cycles paid in full: **0 of 3** required for Act 2.
4. Result at day 28 (`06-organic-loss-patience-day28.*`): the third consecutive
   short cycle dropped patience to 0, and the run ended **organically** —
   `ending: "loss_patience"`, event "The Emperor recalls you. Arrakis is taken
   from your house." — before Act 2 was ever reachable. This is presented as a
   bonus capture for the ending list even though it wasn't one of the seven
   requested states, because it fell out of the raid attempt with no forcing.

Conclusion: raids are unreachable within a reasonable baseline play session both
by code contract (Act 1 has no raid interval) and empirically (the Act 1→2 gate
was not clearable even with maximal legitimate assignment before patience ran
out). A raid capture would require either tuning changes (out of WP00 scope) or
a debug helper that does not exist (`setAct`/`setQuotaPaid` are not on the
`__DUNE__` handle).

## 6. Current act state

**Status:** verified, captured incidentally as part of every dump above (there
is no separate act/objective UI beyond the quota ledger and the act flag).

- Every `.raw.json` in this folder carries `act`, `flags.act` (numeric mirror),
  and `quota.cycleIndex`. Across the whole session the build never left
  `act1` — see Finding 4 for what act-state UI currently exists (none beyond
  `QuotaLedger` and the numeric `flags.act` gate used by dialogue conditions).
- Representative frame: `05-quota-day20-full-assignment.raw.json` —
  `act: "act1"`, `flags: {"act": 1, "pledged.count": 8, "quota.cycle": 2,
  "quota.patience": 1, "quota.arrears": 192}`.

## 7a. Ending — PoC `control_all_villages` win

**Status:** verified. **Path:** debug (`window.__DUNE__.endRun('win_military')`),
explicitly labeled — the real `playerControlsAll()` condition (every village
`owner === 'player'`, or `owner === 'fremen'` with its sietch pledged) was never
evaluated or satisfied. Conquering all ~19 villages was judged out of scope for
a baseline capture; the task text itself allows "teleport/conquer via debug as
needed."

- `07a-ending-control-all-villages-debug.png` / `.raw.json`, from a fresh reload
  (IndexedDB save explicitly deleted first).
- Exact call: `window.__DUNE__.endRun('win_military')` on an untouched day-0
  state, then Save + IndexedDB read.
- Result: `goalAchieved: true`, `ending: "win_military"`. `GoalOverlay` reads
  **"Arrakis is yours"** (won, since `isVictory('win_military')`) with subtitle
  **"The run is over."** — the generic fallback, because `endRun()` pushes no
  `poc_goal_achieved` event for `GoalOverlay` to quote (see
  `src/game-render/core/debugSources.ts`'s `endRun` — it only sets
  `goalAchieved`/`ending`, no `pushEvent`). This is itself a finding: a
  genuinely-won run and a debug-forced one are visually indistinguishable
  except for that generic subtitle line.

## 7b. Ending — PoC `survive_20_min` — BLOCKED (unreachable, not just un-shortcuttable)

**Status:** blocked, with direct evidence, not merely "wall-clock can't be
shortcut."

`world.goalType` defaults to `'control_all_villages'`
(`src/game-engine/GameState.ts`, `createInitialState()`) and **nothing in
production UI or on the `__DUNE__` debug handle can change it** — there is no
difficulty/mode selector that touches `goalType`, and no debug setter for it.
`GameLoop.update()`'s win-check is a hard `&&`:

```
if (world.goalType === 'survive_20_min' && hasPlayerSurvived()) { ... }
```

So even bypassing the 20-real-minute wait entirely by jumping `world.time`
straight past the threshold does not fire this branch, because the `goalType`
half of the `&&` is never true. Proven directly, not inferred:

- `07b-ending-survive-20min-blocked.png` / `.raw.json`, fresh reload (save
  deleted first).
- Exact call: `window.__DUNE__.setTime(1201)` — `hasPlayerSurvived()` is
  `world.time >= 1200`, so this satisfies the survival threshold by raw value
  alone — then `await sleep(500)`, then Save + IndexedDB read.
- Result: `goalAchieved: false`, `ending: null`, `goalType:
  "control_all_villages"` (unchanged). StatusBar shows `Villages: 0/19`, not
  `RUN ENDED`.
- Side effect visible in the same capture: jumping straight from day 0 to
  day 20 in one `setTime` call still only fires **one** day-boundary (day 20),
  but `runQuotaCheck`'s due-check is `isDue` (`>=`, not `===`), so it settled
  the day-12 quota late, on the day-20 tick — patience 3→2, event "The Emperor
  is not paid. Patience 2 of 3 remains." at `timestamp: 1201`. Documented here
  because it is easy to misread as "day 12's event ran on day 12."

---

## Findings (apply across all states above)

**1. Saves live in IndexedDB, not localStorage.** The task text assumed
localStorage. `src/game-engine/persistence.ts` uses
`indexedDB.open('dune-browser-game', 1)` → object store `world-state` → key
`"current"`. Every `.raw.json` file's `localStorageDump` field (where present)
confirms `localStorageKeys: []` — grep of `src/` also confirms zero
`localStorage` references outside test files. The full `WorldState` save blob
was read from IndexedDB instead, per state, as described above.

**2. The game auto-loads any existing IndexedDB save before the app even
mounts, and `GoalOverlay`'s "Play Again" does not clear it.**
`src/main.tsx` calls `loadFromSave()` and awaits it *before* calling
`ReactDOM.createRoot(...).render(<App/>)`. This means: (a) a fresh
`browser_navigate` only shows a truly-fresh opening state if no IndexedDB
record exists yet; (b) clicking **"Play Again"** on the loss/win overlay calls
only `window.location.reload()` (`src/ui/GoalOverlay.tsx`) — it does **not**
call `newGame()`/`deleteSave()`. If the player had saved at any point, "Play
Again" after a loss reloads straight back into the *same ended run*
(`goalAchieved: true`, frozen), not a new game. This was hit directly: after
the organic `loss_patience` ending (state 6) was Saved and "Play Again"
clicked, the reloaded page still showed `worldTime: 1681.02`, `location:
"cave_of_birds"`, and the same ended state — confirmed before working around
it by deleting the IndexedDB record directly ahead of the two ending captures.
This is a real player-facing gap, not a capture artifact.

**3. Multi-day time jumps process one day-boundary per distinct day value, not
one boundary per elapsed day.** `TimeSystem.isDayBoundary()` uses a `lastDay`
sentinel: `setTime(d*60+1)` moves `world.time` directly, and the *next* engine
`update()` tick (driven by the page's own `requestAnimationFrame` loop, which
runs continuously regardless of `setTime` calls) sees `currentDay() !== lastDay`
and fires the day-boundary logic exactly once for the new day, no matter how
many calendar days were skipped. Confirmed both intentionally (state 7b's
day-0→day-20 jump only ever fires the day-20 boundary) and incidentally
(natural real-time drift between tool calls occasionally advanced `world.time`
by a day on its own, observed once during the pledge/payout sequence). This
matches `08-execution-plan.md` WP01's scope item "make multi-day catch-up
equivalent to repeated one-day processing" — confirmation that this is not yet
true today.

**4. Village ownership (`world.villages[].owner`) and the legacy faction/
territory simulation (`world.regions[].owner`) are confirmed-separate arrays,
and the Event Log narrates the wrong one for a player standing on the
village/sietch model.** During the raid-chase (state 5), the Event Log
repeatedly reported things like *"Padishah Emperor captures Wind Pass from
fremen"* and *"House Harkonnen captures Red Wall Sietch from fremen"* while
those same villages simultaneously showed `owner: "fremen"` and
`pledgedToPlayer: true` in the same-moment save dump
(`05-quota-day20-full-assignment.raw.json`, `sietchStatus` array). Verified,
not just inferred: `grep -rn "captures.*from" src/game-engine/` finds exactly
one emitter, `src/game-engine/faction/GoalExecutor.ts:100` —
`` pushEvent('attack', `${faction.name} captures ${region.name} from
${defenderId}`) `` — which mutates `world.regions`, a fully separate array
from `world.villages` that happens to share the same ids and display names
(confirmed for `wind_pass`/`red_wall_sietch` in `src/data/regions.json`). The
pledge system (`SietchSystem.ts`) and quota system (`EconomySystem.ts`) never
read `world.regions`. This is consistent with the legacy-authority-inventory's
count of 16 faction-sim call sites still reachable from the day loop
(`baseline/legacy-authority-inventory.md`) and is a second concrete,
independently-verified example of duplicate/contradictory authority beyond the
already-documented triple spice credit.

**5. Sietch payouts for the day a quota settlement ends the run still land,
because they run after the ending check within the same tick.** In
`GameLoop.ts`'s day-boundary block, the order is `runQuotaCheck() → ... →
runActCheck() → ... → updateSietches(...)`. In state 6's capture, three
sietches' "deliver 12 spice" events share the exact ending's timestamp
(`1681s`) and appear in the event log, even though `goalAchieved` had already
flipped true moments earlier in the same `update()` call (the pause gate only
takes effect on the *next* frame). The spice was credited to `player.spice`
(36.0 at capture) but arrived too late to count toward the quota that had
already failed.

## Not reproduced / discrepancies from the task's assumptions

- localStorage does not exist for this game (Finding 1) — the task's phrasing
  assumed it does.
- `survive_20_min` is not merely wall-clock-gated and shortcuttable; it is
  presently unreachable by any means short of editing `world.goalType`
  directly, which no debug helper or UI exposes (see state 7b).
- A raid could not be produced within a reasonable session despite a genuine,
  maximal-assignment attempt (see state 5) — code-gated in Act 1, and Act 2 was
  not reached before the run ended organically on its own patience-loss
  condition.
