import type { VillageId } from '../../types'

export type SietchTask = 'harvest_spice' | 'train_troops'

export interface SietchState {
  villageId: VillageId
  pledgedToPlayer: boolean
  fremenWorkers: number
  currentTask: SietchTask | null
  outputProgress: number
}

export const HARVEST_PROGRESS_PER_DAY = 1.0
export const HARVEST_PAYOUT_THRESHOLD = 3.0
export const HARVEST_SPICE_PAYOUT = 12
export const HARVEST_MIN_WORKERS = 5

export const TRAIN_PROGRESS_PER_DAY = 1.0
export const TRAIN_PAYOUT_THRESHOLD = 3.0
export const TRAIN_TROOPS_PAYOUT = 6
export const TRAIN_MIN_WORKERS = 10
