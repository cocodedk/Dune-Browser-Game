// src/game-engine/economy/raidRun.ts
// Harkonnen raids against pledged sietches.

import { world } from '../GameState'
import { pushEvent } from '../EventSystem'
import { currentDay } from '../TimeSystem'
import { getDifficultyConfig } from '../difficulty'
import {
  raidInterval, raidPower, resolveCombat, weaponTier, applyLosses,
} from '../combat/resolve'
import { raidWarningDays } from '../prescience/prescience'
import { carriedKinds } from './carried'
import { CHARISMA_PER_RAID } from '../sietch/loyalty'
import type { RngService } from '../rng/rng'

/**
 * The Harkonnen raid clock.
 *
 * Raids target a pledged sietch and are resolved against whatever garrison is
 * standing there. A sietch with no crew present still defends — its people
 * fight — but badly, which is the cost of leaving it uncovered.
 *
 * `rng` is the day's one seeded service instance (see dayRunner.ts's
 * header) — the combat roll below draws from it instead of Math.random().
 */
export function runRaidCheck(rng: RngService): void {
  const interval = raidInterval(world.act)
  if (interval === null) return

  const day = currentDay()
  const nextRaid = typeof world.flags['raids.nextDay'] === 'number'
    ? (world.flags['raids.nextDay'] as number)
    : day + interval

  if (day < nextRaid) {
    world.flags['raids.nextDay'] = nextRaid
    const warning = raidWarningDays(world.player.prescience)
    if (warning > 0 && nextRaid - day === warning && !world.flags[`warned.${nextRaid}`]) {
      world.flags[`warned.${nextRaid}`] = true
      pushEvent('attack', `You see it before it forms: raiders in ${warning} days.`)
    }
    return
  }
  world.flags['raids.nextDay'] = day + interval

  const pledged = world.sietches.filter(s => s.pledgedToPlayer)
  if (pledged.length === 0) return

  // Deterministic target choice: the raid falls on the least defended sietch,
  // which rewards the player for spreading cover rather than stacking one.
  const target = pledged.reduce((weakest, s) => {
    const here = world.troopGroups.filter(g => g.locationId === s.villageId)
    const strength = here.reduce((sum, g) => sum + g.size * (g.skills.military / 100), 0)
    const weakestHere = world.troopGroups.filter(g => g.locationId === weakest.villageId)
    const weakestStrength = weakestHere.reduce(
      (sum, g) => sum + g.size * (g.skills.military / 100), 0,
    )
    return strength < weakestStrength ? s : weakest
  }, pledged[0])

  const daysIntoAct = typeof world.flags['act.startedDay'] === 'number'
    ? day - (world.flags['act.startedDay'] as number)
    : day
  const config = getDifficultyConfig(world.difficulty)
  const power = raidPower(daysIntoAct, config.aiAggressionMultiplier)

  const defenders = world.troopGroups.filter(g => g.locationId === target.villageId)
  const defenderSize = defenders.reduce((sum, g) => sum + g.size, 0)
  const defenderSkill = defenders.length
    ? defenders.reduce((sum, g) => sum + g.skills.military, 0) / defenders.length
    : 15 // Untrained villagers, not nothing.

  const weapon = weaponTier(
    defenders.flatMap(g => carriedKinds(g.id)),
  )

  const outcome = resolveCombat(
    { size: power / 2, militarySkill: 60, weapon: 'krys', defending: false },
    { size: defenderSize || 20, militarySkill: defenderSkill, weapon, defending: true },
    rng.next(),
  )

  const place = world.villages.find(v => v.id === target.villageId)
  const name = place?.name ?? target.villageId

  // Spread casualties across the defending crews.
  if (defenders.length > 0 && outcome.defenderLosses > 0) {
    const each = Math.floor(outcome.defenderLosses / defenders.length)
    for (const group of defenders) {
      const index = world.troopGroups.findIndex(g => g.id === group.id)
      if (index >= 0) world.troopGroups[index] = applyLosses(group, each)
    }
  }

  if (outcome.attackerWins) {
    const sietchIndex = world.sietches.findIndex(s => s.villageId === target.villageId)
    if (sietchIndex >= 0) {
      const sietch = world.sietches[sietchIndex]
      world.sietches[sietchIndex] = { ...sietch, pledgedToPlayer: sietch.pledgedToPlayer }
    }
    pushEvent('attack', `Harkonnen raiders break ${name}. ${outcome.defenderLosses} Fremen fall.`)
  } else {
    const repelled = typeof world.flags['raids.repelled'] === 'number'
      ? (world.flags['raids.repelled'] as number) : 0
    world.flags['raids.repelled'] = repelled + 1
    world.charisma += CHARISMA_PER_RAID
    pushEvent('attack', `${name} holds. The raiders withdraw, leaving ${outcome.attackerLosses}.`)
  }
}
