// src/game-engine/economy/endgameOps.ts
// The two acts that end things: taking the water of life, and storming a fort.

import { world } from '../GameState'
import { pushEvent } from '../EventSystem'
import {
  checkGrant, grantRefusalMessage, levelDescription,
} from '../prescience/prescience'
import { checkAssault, assaultRefusalMessage, destroyedCount } from '../acts/endgame'
import { resolveCombat, weaponTier } from '../combat/resolve'
import { applyCasualty } from '../troops/casualty'
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

/** The attacking force a fort assault would field right now. Shared by the
 * command's pre-check (commands/assaultCommand.ts) and this module's own
 * defensive re-check, so the two can never compute a different number. */
export function attackForce(fortId: string): { size: number; militarySkill: number } {
  const attackers = world.troopGroups.filter(
    g => g.locationId === fortId && g.changeoverDaysLeft === 0,
  )
  const size = attackers.reduce((sum, g) => sum + g.size, 0)
  const militarySkill = attackers.length
    ? attackers.reduce((sum, g) => sum + g.skills.military, 0) / attackers.length
    : 0
  return { size, militarySkill }
}

/**
 * Storm a Harkonnen stronghold with every drilled crew standing at the fort.
 *
 * Assault is resolved against the fort's garrison; the attacker carries no
 * defender bonus, so taking a wall costs materially more than holding one.
 *
 * `roll` replaces the direct `Math.random()` call this used to make —
 * commands/assaultCommand.ts draws it from the campaign's one seeded RNG
 * (`createRng(world.rng)`) before calling this, and writes the advanced
 * state back after. This module stays pure of RNG plumbing; it only
 * consumes the roll it is handed, same as combat/resolve.ts's own
 * `resolveCombat` already does.
 */
export function assaultFort(fortId: string, roll: number): void {
  const index = world.forts.findIndex(f => f.locationId === fortId)
  if (index < 0) return
  const fort = world.forts[index]

  const attackers = world.troopGroups.filter(
    g => g.locationId === fortId && g.changeoverDaysLeft === 0,
  )
  const { size, militarySkill: skill } = attackForce(fortId)

  const check = checkAssault(fort, { size, militarySkill: skill }, destroyedCount(world.forts))
  if (!check.ok) {
    pushEvent('attack', assaultRefusalMessage(check.reason))
    return
  }

  const weapon = weaponTier(attackers.flatMap(g => carriedKinds(g.id)))
  const outcome = resolveCombat(
    { size, militarySkill: skill, weapon, defending: false },
    { size: fort.strength / 4, militarySkill: 70, weapon: 'krys', defending: true },
    roll,
  )

  // Casualties land on the attacking crews either way, through the one
  // casualty rule (troops/casualty.ts) — a losing assault can dissolve or
  // merge an attacking crew, not just shrink it.
  if (attackers.length > 0 && outcome.attackerLosses > 0) {
    const each = Math.floor(outcome.attackerLosses / attackers.length)
    for (const group of attackers) {
      const result = applyCasualty(world.troopGroups, world.equipment, world.sietches, group.id, each)
      world.troopGroups = result.groups
      world.equipment = result.equipment
      world.sietches = result.sietches
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
