# Gauntlet-Loop Operating Prompt

This file is the standing prompt for the gauntlet loop that implements this pack.
Invoke it with:

```
/gauntlet-loop docs/PRD/game-completion/09-gauntlet-prompt.md
```

The lead reads this file, `00-index.md`, and `08-execution-plan.md` at the start of
every run. Where they disagree, the pack wins; this file only says how the loop runs.

## Mission

Advance the work-package board in `08-execution-plan.md` from `planned` to `verified`,
package by package, in dependency order. The first run targets **M1 (WP00–WP04)** and
stops there: M1 is a judge-by-playing artifact, and the user's play verdict — not the
loop — closes it. Later runs continue from the board's current frontier.

## Launch checklist (round 0, once per run)

1. **Commit the spec.** `docs/PRD/game-completion/` and this file must be in git before
   any implementation commit. An untracked spec cannot anchor evidence.
2. **Disposition the dirty tree.** Inspect any modified files before touching them.
   `src/game-engine/saveMigration.ts` + its test are modified right now and sit inside
   WP02's scope — find out what they are; report them if unexplained. Never sweep
   unexplained changes into a loop commit.
3. **Branch.** Default: `feat/game-completion` off the current `feat/character-shop`
   tip. Merging anything remains the user's word, never the loop's.
4. **Prove the gate runs.** `git config --get core.hooksPath` must print `.githooks`
   (it is untracked local config — a fresh clone silently loses it). This repo has
   shipped false "verified" claims from gates that looked present and were not.
5. **Prove browser evidence works.** Start the dev server, open the game through
   Playwright MCP, and confirm `window.__DUNE__.inspect()` answers (dev build or
   `?debug=1`).

## Roles

- **Lead** — plans the package, dispatches, verifies everything personally, updates
  status, consults the advisor before committing to a package approach and before
  marking any package `verified`. The lead may implement directly.
- **Builders** (Sonnet) — implement inside one package. A builder never grades its own
  work, and its report is never evidence.
- **Critics** — fresh context, always separate from builders. A critic sees the goal,
  the bar, and the artifact (diff, raw outputs, running build) — never the builder's
  reasoning or report. Two modes, chosen by package type:
  - **Evidence auditor** (deterministic packages: WP00–WP02, WP04–WP05, WP08): re-runs
    the fixtures, recomputes state hashes, and hunts for bypasses — test-only
    mutations, simulator writes that skip production commands, legacy imports the
    removal inventory says are gone.
  - **Blind-play critic** (judgement packages: WP03, WP06–WP07, WP09–WP14): plays the
    real build through Playwright with no coaching and answers both halves — *is this
    understandable and good?* against `01-product-contract.md`'s pillars and pacing
    table, and *is this correct?* — right numbers, right state, consistent with its
    own save.

Both modes fulfil the "independent reviewer" line in 08's package completion report.

## The bar, per package

1. **Hard gate green is a precondition, never a verdict.** `npm run lint`,
   `npx tsc --noEmit`, `npm run shop:check`, `npm run build`, `npm run test:unit`,
   `npm test`, and `sh .githooks/pre-commit`. Note what the npm commands alone do NOT
   run: the 200-line file-length check lives only in the pre-commit hook.
2. **The package's exit proof in `08-execution-plan.md`**, satisfied with raw
   artifacts: exact commands, raw output, browser captures with the frame identified,
   before/after state hashes from the same trace.
3. **The cross-pack completion rule** in `00-index.md` — all six points, including
   save/load survival and a browser scenario proving cause → state → outcome.
4. **The correctness question, every round, every critic.** An aesthetic or
   comprehension bar cannot catch a wrong-way-round defect. Ask "is this doing what it
   claims?" explicitly.

No package may claim an acceptance criterion that needs humans. First-time-player
thresholds (01 §Acceptance 1), human playtest cohorts (WP14), in-game look gates, and
the WP09 IP/license decision are user-owned: reaching one means `blocked`, not
`verified`.

## Sequencing

- Advance the frontier package only. Respect the dependency board and 08's operating
  rule 2: no concurrent edits to the day runner, state schema, save migration, command
  wiring, or EventBus contract.
- Fan out builders inside a package only when file ownership is disjoint. If two
  builders would touch one file, sequence them. Coupled systems get one owner.
- Safe parallel lanes are listed in 08 §Safe parallel work; nothing else runs in
  parallel.

## Builder boundaries (put these in every builder prompt)

- Simulation logic in `src/game-engine/` — pure, no three.js. Scene/render in
  `src/game-render/` — never mutates world state. React UI in `src/ui/`. `EventBus`
  is the renderer↔React boundary.
- **200 lines max** per source-like file — count before committing; the hook rejects
  after all the npm commands pass.
- Vitest: explicit `import { describe, it, expect } from 'vitest'`; unit tests get no
  DOM, no canvas, no WebGL (`materials/neutralEnvMap.ts` is the house pattern).
- Never `--no-verify`. Commit early and often — a dead session must be cheap.
- Measure, don't assume: read `window.__DUNE__.inspect()` numbers before changing
  anything visual or spatial, and put the numbers in the evidence.
- Use the status vocabulary exactly: `planned`, `in_progress`, `verified`, `blocked`.
  "Done", "green", "implemented", and "mostly" are banned in reports.
- Report using items 1–6 of 08 §Package completion report. Item 7 (reviewer verdict)
  belongs to the critic and the lead, never the builder.

## Critic protocol

- Be blunt; a diplomatic answer is worthless.
- Name the **single biggest remaining gap**, concrete enough to act on.
- Score against the bar out of 10 so progress across rounds is legible.
- Judge several samples — multiple seeds, saves, and days. One unlucky frame is not a
  verdict, and one lucky frame is not a pass.

## Lead verification — never bank a report

- Re-run the gate yourself. Re-run at least one reported measurement with your own
  parameters; reported numbers have failed to reproduce in this repo before.
- Check file mtimes before judging — never judge a tree mid-write.
- Never act on a stale critique: if rounds landed since it ran, re-capture first.
- Where a builder wrote both a fix and its test, probe it a third way.

## Status and logging

- The Status column of 08's work-package board is the **single source of truth**.
  Update it in place; nothing else may disagree with it.
- Append one entry per round to `docs/PRD/game-completion/progress.md`: package, what
  changed, critic mode + verdict + score, the measured numbers, and **what did not
  reproduce**. The failures are the entries that stop round five repeating round two.

## Stop conditions — stop, and say which one

1. **Milestone reached.** M1's packages are `verified` → stop, hand the user a
   playable build, the progress log, and the evidence locations. His verdict opens M2.
2. **Human-only gate.** Mark the package `blocked`, list exactly which user inputs are
   open, and stop that lane.
3. **Critic plateau.** Three rounds on one package without score movement — or critics
   rotating contradictory findings while correctness stays clean — means the bar needs
   a human eye. Ask; do not run round four.

## Cost

This is the expensive loop. Budget on the order of a million-plus tokens per
milestone; keep fan-out modest (two or three builders, one or two critics per round)
and let the round count grow only where the score is still moving.
