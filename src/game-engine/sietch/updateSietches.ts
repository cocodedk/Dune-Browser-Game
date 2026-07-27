// src/game-engine/sietch/updateSietches.ts
// Pure function called once per day boundary to advance sietch progress and
// compute payouts. No side-effects — caller applies results to world state.

import type { VillageId } from '../../types'
import type { SietchState } from './types'
import {
  HARVEST_PROGRESS_PER_DAY,
  HARVEST_PAYOUT_THRESHOLD,
  HARVEST_SPICE_PAYOUT,
  TRAIN_PROGRESS_PER_DAY,
  TRAIN_PAYOUT_THRESHOLD,
  TRAIN_TROOPS_PAYOUT,
} from './types'

export type SietchPayout =
  | { kind: 'spice'; villageId: VillageId; amount: number }
  | { kind: 'troops'; villageId: VillageId; amount: number }

export interface SietchUpdateResult {
  sietches: SietchState[]
  payouts: SietchPayout[]
}

function processOne(sietch: SietchState, payouts: SietchPayout[]): SietchState {
  if (!sietch.pledgedToPlayer || sietch.currentTask === null) return sietch

  if (sietch.currentTask === 'harvest_spice') {
    const scale = sietch.fremenWorkers / 50
    const newProgress = sietch.outputProgress + HARVEST_PROGRESS_PER_DAY * scale
    if (newProgress >= HARVEST_PAYOUT_THRESHOLD) {
      payouts.push({ kind: 'spice', villageId: sietch.villageId, amount: HARVEST_SPICE_PAYOUT })
      return { ...sietch, outputProgress: 0 }
    }
    return { ...sietch, outputProgress: newProgress }
  }

  if (sietch.currentTask === 'train_troops') {
    const scale = sietch.fremenWorkers / 50
    const newProgress = sietch.outputProgress + TRAIN_PROGRESS_PER_DAY * scale
    if (newProgress >= TRAIN_PAYOUT_THRESHOLD) {
      payouts.push({ kind: 'troops', villageId: sietch.villageId, amount: TRAIN_TROOPS_PAYOUT })
      return { ...sietch, outputProgress: 0 }
    }
    return { ...sietch, outputProgress: newProgress }
  }

  return sietch
}

export function updateSietches(sietches: SietchState[]): SietchUpdateResult {
  const payouts: SietchPayout[] = []
  const updated = sietches.map((s) => processOne(s, payouts))
  return { sietches: updated, payouts }
}
