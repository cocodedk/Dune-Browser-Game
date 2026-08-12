# WP02 Browser Trace — pledge → harvest → reassign → reload → settle → rejections

Run by the lead on 2026-08-11 against the dev server (branch
`feat/game-completion`, working tree at W2f + this trace's event-id fix),
Playwright-driven, one tab, closed after. Debug-helper use is labeled per
step; everything else is production UI.

**Exit-proof clause covered** (08 §WP02): "A browser trace demonstrates one
pledge, one crew harvest, one reassignment, one tribute settlement, and one
rejection, with exact state-hash continuity through reload and no duplicate
payout."

## Steps and evidence

| # | Step | Path | Evidence |
|---|---|---|---|
| 0 | Fresh campaign (IndexedDB deleted first) | production auto-init | 60 spice, Arrakeen, day 0; `hashState` = `75fd67d5482089fc` |
| 1 | Travel Arrakeen → Hagg → Red Wall Sietch (two region hops) | **production UI** travel buttons; `pick()` substitutes for canvas raycast clicks; `setTime` advanced the clock through each leg (labeled) | event log: "Traveling to Hagg… / Arrived at Hagg. / Traveling to Red Wall Sietch… / Arrived at Red Wall Sietch."; `01-arrived-red-wall.png` |
| 2 | **One pledge** | **production UI** — the PledgePanel button | event: "The Fremen at Red Wall Sietch pledge their loyalty to you."; crew `red_wall_sietch` appears: 15 hands · skill 30 (W2b's deterministic size); hash `4a55e38acfed293f` → `de840e7df144609e` |
| 3 | **One crew harvest** | **production UI** — CrewPanel `red_wall_pan` target button; `setTime` ×3 days (labeled) | spice 60 → 64.80043569593501; three "Crews deliver 1.6 spice" events, one per day (the write-up originally said six — a DOM-regex double-count the WP02 audit caught; the spice figure is exactly the day-3 balance and was always consistent with three) — the only *passive day-boundary* income source (the audit later showed repeatable dialogue rewards were a second, non-passive income path until the W2g once-only guard) |
| 4 | **Rejection #1** | **production UI** — CrewPanel `prospect` button | visible refusal event: "Prospecting needs an ornithopter."; crew unchanged |
| 5 | **One reassignment** | **production UI** — CrewPanel `train` button | "Crew ordered to train." + changeover shown; later proof it ran: crew reads "Drilling · skill 34" at day 12 (was 30) |
| 6 | Save | **production UI** — Save button | hash at save: `6cf9c87cd6869d7e`, day 5 |
| 7 | **Reload continuity** | full page reload (`?debug=1`), production auto-load | spice **byte-exact** `64.80043569593501`, day 5, location and mid-changeover crew state preserved; **no replayed day, no duplicate payout** (no new delivery events; spice unchanged). Note: a *live* post-reload `hashState` necessarily differs because `world.time` resumes ticking inside the hashed state; byte-identical hash equality under matched deltas is proven at engine level in `dayRunner.sessionBoundary.test.ts` and the WP01 delta re-audit (PROBE A: `d8c38f27d3524b52` both sides). |
| 8 | Day-12 pending settlement | `setTime` to day 12 (labeled) | modal appears: 90 due, 64.8 stock, Full (65) / Minimum (54) / custom; **clock provably frozen** (worldTime unchanged over 700 ms); `02-settlement-modal-day12.png` |
| 9 | **Rejection #2** | **production UI** — custom amount 999 + Settle | visible refusal: "You do not have that much spice to send."; decision still pending, spice unmutated |
| 10 | **One tribute settlement** | **production UI** — Full (65) + Settle | spice 64.8 → 0; "Tribute short by 25. The balance is carried, with interest." — partial band (65 ≥ min 54): patience held at ●●●, arrears 31 (25 × 1.25), next cycle 181 due in 8 days; modal closed; clock resumed; **auto-ship checkbox appeared** (post-first-settlement unlock); `03-post-settlement-autoship.png` |
| 11 | No duplicate settlement | — | decision cleared; the settle command refuses `no-pending-settlement` on re-dispatch (pinned by `settleCommand.fixtures.test.ts`); next-cycle state above is the visible proof it applied exactly once |

## Finding (fixed in the same change)

Reload restored saved events with their original ids (`evt-1…6`) while the
module-level event-id counter restarted at zero, so post-reload events reissued
colliding ids — React logged hundreds of duplicate-key errors per minute
(196+ observed live). Same defect class as WP01's `lastProcessedDay` lesson:
module state not derived from the world. Fixed: `nextEventId()` resyncs to the
highest id present in `world.events` before issuing
(`src/game-engine/EventSystem.ts`), regression-pinned by
`EventSystem.reload.test.ts`.

## Residual console noise

The pre-existing WebGL `glGetProgramiv` warnings and favicon 404 recorded in
WP00's round-0 baseline remain, unchanged by this package (WP15's clean-console
gate owns them).
