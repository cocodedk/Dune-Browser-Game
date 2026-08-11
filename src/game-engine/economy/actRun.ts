// src/game-engine/economy/actRun.ts
// Act transitions and endings.

/**
 * Average loyalty across pledged sietches, read from SietchState — the sole
 * loyalty authority for sietch-kind locations (docs/PRD/game-completion/
 * 02-runtime-consolidation.md "Sietches and loyalty"). Village/Location no
 * longer answers for this; the village lookup this replaced is gone.
 *
 * A sietch predating this chunk's `loyalty` field (an old save, or a test
 * fixture outside its scope — see sietch/types.ts's SietchState doc) reads
 * as 0 rather than throwing or producing NaN: no in-memory migration
 * adapter is needed for this value, a documented default suffices.
 */
export function averagePledgedSietchLoyalty(sietches: readonly SietchState[]): number {
  const loyalties = sietches
    .filter(s => s.pledgedToPlayer)
    .map(s => s.loyalty ?? 0)
  return loyalties.length
    ? loyalties.reduce((a, b) => a + b, 0) / loyalties.length
    : 0
}

/** Build the act machine's view of the world from live state. */
function actView(): ActWorldView {
  const pledged = world.sietches.filter(s => s.pledgedToPlayer)

  return {
    act: world.act,
    quotasPaid: typeof world.flags['quota.paidInFull'] === 'number'
      ? (world.flags['quota.paidInFull'] as number) : 0,
    pledgedCount: pledged.length,
    charisma: world.charisma,
    patience: world.quota.patience,
    raidsRepelled: typeof world.flags['raids.repelled'] === 'number'
      ? (world.flags['raids.repelled'] as number) : 0,
    maxRegionVegetation: maxVegetation(world.ecology),
    fortsDestroyed: destroyedCount(world.forts),
    capitalFortDestroyed: capitalDestroyed(world.forts),
    palaceHeld: true,
    greenRegions: greenRegionCount(world.ecology),
    averagePledgedLoyalty: averagePledgedSietchLoyalty(world.sietches),
    countdownExpired: false,
  }
}

import { world } from '../GameState'
import { currentDay } from '../TimeSystem'
import { pushEvent } from '../EventSystem'
import { evaluateEnding, evaluateActTransition, actQuotaMultiplier, actNumber } from '../acts/transitions'
import { onActTransition } from '../quota/quota'
import type { ActWorldView, EndingId } from '../acts/transitions'
import type { SietchState } from '../sietch/types'
import { greenRegionCount, maxVegetation } from '../ecology/ecology'
import { destroyedCount, capitalDestroyed } from '../acts/endgame'

/**
 * The single ending-authority function (docs/PRD/game-completion/
 * progress.md Round 7: "the settlement-assigns-loss rule gets ONE shared
 * ending-authority function"). Called from BOTH the day runner's step 8
 * (via runActCheck below) and commands/settleCommand.ts, so "if settlement
 * reduces patience to zero, the settlement command assigns the economic
 * loss ending before simulation can resume" (02 "Tribute") reuses the exact
 * same rule the day boundary does rather than a second copy of it.
 *
 * Guards on `world.ending !== null` — the WP01 audit residue fix: the
 * freeze authority is `world.ending` (02 "Campaign status": "a non-null
 * ending freezes simulation"), not the derived `goalAchieved` shadow this
 * guard used to key on.
 */
export function evaluateEndingAuthority(): boolean {
  if (world.ending !== null) return false

  const ending = evaluateEnding(actView())
  if (!ending) return false

  world.goalAchieved = true
  world.ending = ending
  pushEvent('poc_goal_achieved', endingMessage(ending))
  return true
}

/**
 * Day-boundary act check (step 8). Ending evaluation is the shared function
 * above; act advancement (escalating the quota, clearing the once-per-act
 * patience allowance) stays day-boundary-only — it is not called from the
 * settle command, so a mid-cycle full payment that completes act 1's exit
 * condition advances at the NEXT day's step 8, not at settlement time.
 */
export function runActCheck(): void {
  evaluateEndingAuthority()
  if (world.ending !== null) return

  const nextAct = evaluateActTransition(actView())
  if (nextAct) {
    world.act = nextAct
    // Mirrored as a number because dialogue gates compare numerically; see
    // actNumber. Written beside world.act so the two cannot fall out of step.
    world.flags['act'] = actNumber(nextAct)
    world.flags['act.startedDay'] = currentDay()
    world.quota = onActTransition(world.quota)
    world.quota = {
      ...world.quota,
      amount: Math.round(world.quota.amount * actQuotaMultiplier(nextAct)),
    }
    pushEvent('poc_goal_achieved', `The story turns. (${nextAct})`)
  }
}

function endingMessage(ending: EndingId): string {
  switch (ending) {
    case 'loss_patience':
      return 'The Emperor recalls you. Arrakis is taken from your house.'
    case 'loss_palace':
      return 'The palace is lost. Your hold on Arrakis ends here.'
    case 'loss_abandoned':
      return 'The last sietch turns from you. You rule nothing but sand.'
    case 'win_military':
      return 'The Harkonnen capital falls. Arrakis is yours.'
    case 'win_ecology':
      return 'The desert greens and the Fremen rise. The occupation is over.'
  }
}
