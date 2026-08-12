// src/game-engine/commands/assaultCommand.ts
// The assault-fort command wired through the CommandOutcome contract.
// `economy/endgameOps.ts`'s `assaultFort` is authored fort content and
// survives untouched in shape; this closes the `endgameOps.ts:75`
// command-time-roll deferral progress.md's Round 5/7 recorded (WP01's
// dayRunner seeded every OTHER daily roll but left this one, since assault
// is player-triggered, not a day-boundary system).
//
// RNG pattern (documented once here; harvestRun.ts/raidRun.ts do the same
// thing per day instead of per command): draw a command-scoped RNG service
// from the current `world.rng` via `createRng`, consume exactly the rolls
// the command needs, then write `rng.state()` back to `world.rng`. The
// state is drawn AFTER validation passes, not before — a refusal must
// "mutate nothing" (commands/outcome.ts), and `world.rng.step` advancing IS
// a mutation. A refused assault therefore leaves `world.rng` untouched; a
// resolved one advances it by exactly one step (one `resolveCombat` noise
// roll). See assaultCommand.fixtures.test.ts's seeded fixture.

import { world } from '../GameState'
import { createRng } from '../rng/rng'
import { checkAssault, destroyedCount, type AssaultRefusal } from '../acts/endgame'
import { assaultFort, attackForce } from '../economy/endgameOps'
import { ok, fail, type CommandOutcome } from './outcome'

export type AssaultCommandCode = 'assault-resolved'
export type AssaultCommandRefusal = 'unknown-fort' | AssaultRefusal

export function runAssaultCommand(
  fortId: string,
): CommandOutcome<AssaultCommandCode, AssaultCommandRefusal> {
  const fort = world.forts.find(f => f.locationId === fortId)
  if (!fort) return fail('unknown-fort')

  const force = attackForce(fortId)
  const check = checkAssault(fort, force, destroyedCount(world.forts))
  if (!check.ok) return fail(check.reason)

  const rng = createRng(world.rng)
  assaultFort(fortId, rng.next())
  world.rng = rng.state()

  return ok('assault-resolved')
}
