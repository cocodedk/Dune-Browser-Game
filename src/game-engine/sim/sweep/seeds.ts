// src/game-engine/sim/sweep/seeds.ts
// Parses the published seed contract (docs/PRD/game-completion/baseline/
// wp04-sweep/seeds.txt) — WP04 chunk W4d. Reads the file directly rather
// than hardcoding a range in TypeScript, so appending a regression seed to
// the committed .txt file is the ONE edit that changes what the sweep runs
// (the file's own header comment states the append-only rule this parser
// has no opinion on — it only reads, never validates the rule was followed).

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// sim/sweep/ -> sim/ -> game-engine/ -> src/ -> repo root (4 levels), then
// into the committed contract file. Same fileURLToPath(new URL(...)) pattern
// parityFixtures.generate.test.ts already uses for e2e/fixtures/.
export const SEEDS_FILE_PATH = fileURLToPath(
  new URL('../../../../docs/PRD/game-completion/baseline/wp04-sweep/seeds.txt', import.meta.url),
)

/** One integer per non-comment, non-blank line — see seeds.txt's own header
 * for the append-only contract this file mechanically enforces nothing
 * about (a human editing the file is the actual contract). */
export function readPublishedSeeds(filePath: string = SEEDS_FILE_PATH): number[] {
  const text = readFileSync(filePath, 'utf-8')
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('#'))
    .map(line => {
      const n = Number(line)
      if (!Number.isInteger(n)) {
        throw new Error(`seeds.txt: non-integer seed line "${line}" — the published contract must stay simple.`)
      }
      return n
    })
}
