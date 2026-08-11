// src/game-engine/CombatSystem.ts
// Handler: player dispatches Fedaykin to attack an enemy-held village.
// Mutates world.villages, world.sietches, world.player.troops.

import type { FactionId, VillageId } from '../types'
import { world } from './GameState'
import { pushEvent } from './EventSystem'

export const DEFENDER_STRENGTH: Record<FactionId, number> = {
  harkonnen: 30,
  emperor:   25,
  atreides:  18,
  smugglers: 15,
  neutral:   10,
  fremen:    20,
  player:    999,
}

/**
 * Resolve a Fedaykin attack on targetVillageId.
 *
 * roll = 0.85 + Math.random() * 0.30  (matches resolveBattle pattern)
 * effectiveDefense = round(DEFENDER_STRENGTH[owner] * roll)
 * playerWins = troopsCommitted > effectiveDefense
 *
 * Victory  → village.owner = 'fremen', status = 'friendly', loyalty = 60;
 *            attackerLosses = floor(committed * 0.20). Taking a sietch by
 *            force no longer pledges it (chunk W2b killed the combat pledge
 *            path — docs/PRD/game-completion/02-runtime-consolidation.md
 *            "Sietches and loyalty" names one atomic chain as the sole way
 *            to pledge). The village-ownership/loyalty mutation above is
 *            legacy production the doc's "Current conflicts to retire"
 *            table marks for removal in a later chunk (W2e), not this one.
 * Defeat   → village unchanged; attackerLosses = floor(committed * 0.55)
 */
export const SCOUT_COST = 10

/**
 * Spend spice to scout a target. Locks in the exact defense for the next attack on it.
 */
export function scoutVillage(targetVillageId: VillageId): void {
  if (world.player.spice < SCOUT_COST) return
  const village = world.villages.find(v => v.id === targetVillageId)
  if (!village) return
  if (village.owner === 'player') return
  if (world.scoutedDefense[targetVillageId] !== undefined) return

  world.player.spice -= SCOUT_COST
  const defenderBase = DEFENDER_STRENGTH[village.owner] ?? DEFENDER_STRENGTH.neutral
  const roll = 0.85 + Math.random() * 0.30
  const effective = Math.round(defenderBase * roll)
  world.scoutedDefense = { ...world.scoutedDefense, [targetVillageId]: effective }
  pushEvent(
    'attack',
    `\ud83d\udd75 Scouts at ${village.name} report: defenders number ${effective}.`,
  )
}

export function attackVillage(
  targetVillageId: VillageId,
  troopsCommitted: number,
): void {
  // Guards
  if (troopsCommitted <= 0) return
  if (troopsCommitted > world.player.troops) return

  const village = world.villages.find(v => v.id === targetVillageId)
  if (!village) return
  if (village.owner === 'player') return

  // Block pledged-fremen sietches
  if (village.owner === 'fremen') {
    const sietch = world.sietches.find(s => s.villageId === targetVillageId)
    if (sietch?.pledgedToPlayer) return
  }

  const defenderBase = DEFENDER_STRENGTH[village.owner] ?? DEFENDER_STRENGTH.neutral
  const scouted = world.scoutedDefense[targetVillageId]
  const effectiveDefense = scouted !== undefined
    ? scouted
    : Math.round(defenderBase * (0.85 + Math.random() * 0.30))
  // Scouted intel is consumed by the attack (one-shot)
  if (scouted !== undefined) {
    const { [targetVillageId]: _used, ...rest } = world.scoutedDefense
    void _used
    world.scoutedDefense = rest
  }
  const playerWins = troopsCommitted > effectiveDefense

  if (playerWins) {
    const lost = Math.floor(troopsCommitted * 0.20)
    world.player.troops -= lost

    village.owner = 'fremen'
    village.status = 'friendly'
    village.loyalty = 60

    pushEvent(
      'attack',
      `\u2694 Victory at ${village.name}! Fedaykin lose ${lost}, village falls.`,
    )
  } else {
    const lost = Math.floor(troopsCommitted * 0.55)
    world.player.troops -= lost

    pushEvent(
      'attack',
      `\u2694 Defeat at ${village.name}. ${lost} Fedaykin fall; survivors retreat.`,
    )
  }
}
