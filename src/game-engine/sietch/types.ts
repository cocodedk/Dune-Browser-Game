import type { VillageId } from '../../types'

export type SietchTask = 'harvest_spice' | 'train_troops'

export interface SietchState {
  villageId: VillageId
  pledgedToPlayer: boolean
  fremenWorkers: number
  currentTask: SietchTask | null
  outputProgress: number

  /**
   * docs/PRD/game-completion/02-runtime-consolidation.md "Sietches and
   * loyalty": SietchState is now the sole authority for loyalty, morale,
   * visit history and gift allowance — `Village`/`Location` keeps identity,
   * kind, discovery, owner and position only, and no longer answers for a
   * sietch's loyalty (see actRun.ts's averagePledgedSietchLoyalty and
   * VillagePanel.tsx's kind-gated LoyaltyBar).
   *
   * Optional, not required: the three protected baseline characterization
   * tests (spiceTripleCredit/sietchPayoutLoop/combatPledgePath, under
   * baseline/) construct SietchState object literals without these fields
   * and must not be edited. Every production reader falls back to a
   * documented default (see loyalty.ts's PLEDGE_THRESHOLD-adjacent 0 and
   * morale.ts's MORALE_NEUTRAL) when a value is absent — a save from before
   * this chunk, or a fixture outside its scope, both read the same way a
   * migrated one would.
   */
  loyalty?: number
  /** See morale.ts's MoraleState; MORALE_NEUTRAL (50) is the default read. */
  morale?: number
  /** Game day of the sietch's last visit — loyalty.ts's LoyaltyState.lastVisitedDay. */
  lastVisitedDay?: number
  /** Loyalty already bought this visit, against loyalty.ts's GIFT_PER_VISIT_CAP. */
  giftedThisVisit?: number
  /** Game day of the sietch's last morale-raising visit — morale.ts's cooldown gate. */
  lastMoraleVisitDay?: number
  /** Crew (TroopGroup) ids raised at or attached to this sietch — populated by a pledge. */
  crewIds?: string[]
}

export const HARVEST_PROGRESS_PER_DAY = 1.0
export const HARVEST_PAYOUT_THRESHOLD = 3.0
export const HARVEST_SPICE_PAYOUT = 12
export const HARVEST_MIN_WORKERS = 5

export const TRAIN_PROGRESS_PER_DAY = 1.0
export const TRAIN_PAYOUT_THRESHOLD = 3.0
export const TRAIN_TROOPS_PAYOUT = 6
export const TRAIN_MIN_WORKERS = 10
