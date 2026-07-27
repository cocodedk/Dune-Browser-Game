// src/game-engine/market/market.ts
// PURE smuggler-market rules.
//
// The market is what turns spice into capability, and therefore what makes the
// quota a dilemma rather than a treadmill: 100 spice spent on a harvester is
// 100 spice not paid to the Emperor this cycle, in exchange for roughly triple
// output next cycle. That trade is the spine of the Act 1 slice.

import type { EquipmentKind } from '../troops/types'

export interface MarketItem {
  kind: EquipmentKind
  label: string
  price: number
  /** Act 1 stock is tier 1-2; tier 3 needs standing and a later act. */
  tier: 1 | 2 | 3
  description: string
}

export const MARKET_STOCK: readonly MarketItem[] = [
  {
    kind: 'harvester',
    label: 'Harvester',
    price: 100,
    tier: 2,
    description: 'Roughly triples a crew’s extraction.',
  },
  {
    kind: 'thopter',
    label: 'Ornithopter',
    price: 80,
    tier: 2,
    description: 'Lets a crew prospect, and outruns worms.',
  },
  {
    kind: 'krys',
    label: 'Krys blades',
    price: 40,
    tier: 1,
    description: 'Arms a crew for the fighting to come.',
  },
]

export type PurchaseRefusal = 'unknown-item' | 'cannot-afford' | 'tier-locked'

export type PurchaseCheck =
  | { ok: true; item: MarketItem }
  | { ok: false; reason: PurchaseRefusal }

export interface MarketContext {
  spice: number
  /** Rises with each purchase; unlocks tier 3 later in the game. */
  standing: number
  /** Act 3 gates tier-3 stock regardless of standing. */
  tier3Unlocked: boolean
}

export function checkPurchase(kind: EquipmentKind, ctx: MarketContext): PurchaseCheck {
  const item = MARKET_STOCK.find(i => i.kind === kind)
  if (!item) return { ok: false, reason: 'unknown-item' }
  if (item.tier === 3 && (!ctx.tier3Unlocked || ctx.standing < 2)) {
    return { ok: false, reason: 'tier-locked' }
  }
  if (ctx.spice < item.price) return { ok: false, reason: 'cannot-afford' }
  return { ok: true, item }
}

export function purchaseRefusalMessage(reason: PurchaseRefusal): string {
  switch (reason) {
    case 'unknown-item':
      return 'Meko does not deal in that.'
    case 'cannot-afford':
      return 'Not enough spice.'
    case 'tier-locked':
      return 'Meko keeps that for buyers he trusts.'
  }
}

/** Items visible to the player right now. */
export function availableStock(ctx: MarketContext): MarketItem[] {
  return MARKET_STOCK.filter(
    item => item.tier < 3 || (ctx.tier3Unlocked && ctx.standing >= 2),
  )
}
