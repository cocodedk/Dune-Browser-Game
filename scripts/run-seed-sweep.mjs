// scripts/run-seed-sweep.mjs — WP04 chunk W4d: process wrapper for the
// published seed sweep (docs/PRD/game-completion/07-balance-playtest-and-
// release.md "Seed sweep"). Vite-less node cannot import the TS engine
// directly (no @types/node in src/, no ts-node in this tree), so this
// script is deliberately dumb: it shells out to the SAME vitest invocation
// a developer would run by hand, with RUN_SWEEP=1 set so
// sweep.run.test.ts's own guard opens — never a second implementation of
// the sweep itself. src/game-engine/sim/sweep.ts is the one place that
// logic lives; this file only runs it and reports wall-clock.
//
// Usage: node scripts/run-seed-sweep.mjs

import { spawnSync } from 'node:child_process'

const headCommit = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf-8' }).stdout.trim() || 'unknown'
// 07's "Every release claim records: commit identifier" — honest about a
// dirty tree rather than implying the report matches a clean checkout of
// `headCommit` alone (`git status --porcelain` is empty only on a clean tree).
const isDirty = spawnSync('git', ['status', '--porcelain'], { encoding: 'utf-8' }).stdout.trim().length > 0
const commit = isDirty ? `${headCommit} + uncommitted worktree` : headCommit

console.log(`Seed sweep starting — commit ${commit}. This is SEQUENTIAL by design (the world singleton ` +
  'forbids concurrent runs) and can take several minutes; see docs/PRD/game-completion/baseline/wp04-sweep/ ' +
  'sweep-report.md\'s own "Evidence authority" section for the runtime budget decision once it lands.')

const start = Date.now()

// vitest 4 has no "basic" reporter (default/agent/blob/verbose/dot/json/tap/
// tap-flat/junit/tree/hanging-process/github-actions) — "default" is this
// version's own closest match, confirmed against `npx vitest --help`.
const result = spawnSync(
  'npx',
  ['vitest', 'run', 'src/game-engine/sim/sweep.run.test.ts', '--reporter=default'],
  {
    stdio: 'inherit',
    env: { ...process.env, RUN_SWEEP: '1', SWEEP_COMMIT: commit },
  },
)

const elapsedS = ((Date.now() - start) / 1000).toFixed(1)
console.log(`\nrun-seed-sweep.mjs: vitest exited ${result.status} after ${elapsedS}s wall clock.`)

process.exit(result.status ?? 1)
