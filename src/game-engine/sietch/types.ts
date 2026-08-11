import type { VillageId } from '../../types'

export interface SietchState {
  villageId: VillageId
  pledgedToPlayer: boolean
  fremenWorkers: number

  /**
   * docs/PRD/game-completion/02-runtime-consolidation.md "Sietches and
   * loyalty": SietchState is now the sole authority for loyalty, morale,
   * visit history and gift allowance — `Village`/`Location` keeps identity,
   * kind, discovery, owner and position only, and no longer answers for a
   * sietch's loyalty (see actRun.ts's averagePledgedSietchLoyalty and
   * VillagePanel.tsx's kind-gated LoyaltyBar).
   *
   * Optional, not required: several test fixtures across the codebase still
   * construct SietchState object literals without these fields. (The three
   * baseline characterization tests that originally motivated this —
   * spiceTripleCredit/sietchPayoutLoop/combatPledgePath, under baseline/ —
   * are gone: combatPledgePath was deleted in W2b, spiceTripleCredit and
   * sietchPayoutLoop in W2e, each citing the pinned legacy behavior their
   * deletion removes.) Every production reader falls back to a documented
   * default (see loyalty.ts's PLEDGE_THRESHOLD-adjacent 0 and morale.ts's
   * MORALE_NEUTRAL) when a value is absent — a save from before this chunk,
   * or a fixture outside its scope, both read the same way a migrated one
   * would.
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

// The eight HARVEST_*/TRAIN_* threshold-payout constants that used to live
// here (progress-per-day, payout threshold, payout amount, min workers, one
// set per task) were removed in WP02e along with sietch/updateSietches.ts,
// their only reader — see legacy-authority-inventory.md category 2.
// `currentTask`/`outputProgress` (and the `SietchTask` type they used) are
// removed from the type entirely as of WP02f, unlike Village.productionRate
// (still inert-but-present): nothing reads or writes them in campaign code
// (grep confirmed — only test fixtures constructed them), and
// saveMigration.v5.ts's migrateV4ToV5 strips them off any old save that
// still carries them on disk.
