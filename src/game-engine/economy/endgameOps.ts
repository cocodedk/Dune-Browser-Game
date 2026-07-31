// src/game-engine/economy/endgameOps.ts
// The two acts that end things: taking the water of life, and storming a fort.

import { world } from '../GameState'
import { pushEvent } from '../EventSystem'
import {
  checkGrant, grantRefusalMessage, levelDescription,
} from '../prescience/prescience'
import { checkAssault, assaultRefusalMessage, destroyedCount } from '../acts/endgame'
import { resolveCombat, weaponTier, applyLosses } from '../combat/resolve'
import { carriedKinds } from './carried'

/**
 * Attempt the spice ritual, advancing prescience one step.
 *
 * Refusals are surfaced so the player learns what is still missing rather than
 * repeating a ritual that silently does nothing.
 */
export function attemptRitual(): void {
  const ritualsUsed = typeof world.flags['ritual.count'] === 'number'
    ? (world.flags['ritual.count'] as number) : 0

  const check = checkGrant({
    level: world.player.prescience,
    charisma: world.charisma,
    ritualsUsed,
    fortsDestroyed: typeof world.flags['forts.destroyed'] === 'number'
      ? (world.flags['forts.destroyed'] as number) : 0,
    act: world.act,
  })

  if (!check.ok) {
    pushEvent('dialogue_start', grantRefusalMessage(check.reason))
    return
  }

  world.player.prescience = check.level
  world.flags['prescience'] = check.level
  // Only a successful grant spends one of the three uses — a refusal already
  // costs the player spice via the dialogue effect, and should not also
  // burn down the cap that sova.ritual_available checks.
  world.flags['ritual.count'] = ritualsUsed + 1
  pushEvent('poc_goal_achieved', levelDescription(check.level))
}

/**
 * Storm a Harkonnen stronghold with every drilled crew standing at the fort.
 *
 * Assault is resolved against the fort's garrison; the attacker carries no
 * defender bonus, so taking a wall costs materially more than holding one.
 */
export function assaultFort(fortId: string): void {
  const index = world.forts.findIndex(f => f.locationId === fortId)
  if (index < 0) return
  const fort = world.forts[index]

  const attackers = world.troopGroups.filter(
    g => g.locationId === fortId && g.changeoverDaysLeft === 0,
  )
  const size = attackers.reduce((sum, g) => sum + g.size, 0)
  const skill = attackers.length
    ? attackers.reduce((sum, g) => sum + g.skills.military, 0) / attackers.length
    : 0

  const check = checkAssault(fort, { size, militarySkill: skill }, destroyedCount(world.forts))
  if (!check.ok) {
    pushEvent('attack', assaultRefusalMessage(check.reason))
    return
  }

  const weapon = weaponTier(attackers.flatMap(g => carriedKinds(g.id)))
  const outcome = resolveCombat(
    { size, militarySkill: skill, weapon, defending: false },
    { size: fort.strength / 4, militarySkill: 70, weapon: 'krys', defending: true },
    Math.random(),
  )

  // Casualties land on the attacking crews either way.
  if (attackers.length > 0 && outcome.attackerLosses > 0) {
    const each = Math.floor(outcome.attackerLosses / attackers.length)
    for (const group of attackers) {
      const i = world.troopGroups.findIndex(g => g.id === group.id)
      if (i >= 0) world.troopGroups[i] = applyLosses(group, each)
    }
  }

  const place = world.villages.find(v => v.id === fortId)
  const name = place?.name ?? fortId

  if (outcome.attackerWins) {
    world.forts[index] = { ...fort, destroyed: true }
    world.flags['forts.destroyed'] = destroyedCount(world.forts)
    pushEvent('attack', `${name} falls. ${outcome.attackerLosses} Fedaykin bought it.`)
  } else {
    pushEvent('attack', `The assault on ${name} breaks. ${outcome.attackerLosses} lost.`)
  }
}
