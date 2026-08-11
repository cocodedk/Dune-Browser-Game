// src/game-engine/market/market.ts
// PURE smuggler-market rules.
//
// The market is what turns spice into capability, and therefore what makes the
// quota a dilemma rather than a treadmill: 100 spice spent on a harvester is
// 100 spice not paid to the Emperor this cycle, in exchange for roughly 2.9x
// output next cycle (WP04 chunk W4e round 2: EXTRACTION_RATE.hand 6->7 moved
// this ratio from 20/6 to 20/7 — see troops/types.ts's own citation). That
// trade is the spine of the Act 1 slice.

import type { EquipmentKind } from '../troops/types'
import type { ActId } from '../acts/transitions'

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
    description: 'Raises a crew’s extraction roughly 2.9x.',
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
  // Tier 3: the smuggler holds his best gear for buyers he trusts, in a
  // theatre worth bringing it to. `checkPurchase`'s tier-3 branch existed
  // since before this chunk but had nothing to gate — no item ever used
  // `tier: 3`, so it could never actually appear (02 "Market": the stock
  // query's act gate was unwired; marketOps.ts hardcoded `tier3Unlocked:
  // false` regardless of `world.act`). sonic_disruptor is already consumed
  // by combat/resolve.ts's weaponTier — the strongest weapon a crew can
  // carry — so wiring it as the one tier-3 item closes a real dead branch
  // instead of inventing new content. Priced above the harvester (100): its
  // 1.8x combat multiplier (WEAPON_MULTIPLIER) is a bigger swing than the
  // harvester's ~2.9x extraction swing applied to a much smaller number.
  {
    kind: 'sonic_disruptor',
    label: 'Sonic disruptor',
    price: 150,
    tier: 3,
    description: 'The smuggler’s best weapon. Also speeds drill (see training).',
  },
]

export type PurchaseRefusal = 'unknown-item' | 'cannot-afford' | 'tier-locked'

export type PurchaseCheck =
  | { ok: true; item: MarketItem }
  | { ok: false; reason: PurchaseRefusal }

/**
 * The stock query's own gate inputs — 02 "Market": "Market stock queries
 * include act and smuggler-standing gates. The UI renders only stock
 * returned by that query." `act` is the sole authority for whether tier 3
 * exists at all this run; `standing` (world.flags['smuggler.standing'],
 * already live — see marketOps.ts) gates it further once act3 arrives.
 */
export interface MarketContext {
  spice: number
  standing: number
  act: ActId
}

function tier3Unlocked(ctx: MarketContext): boolean {
  return (ctx.act === 'act3' || ctx.act === 'act4') && ctx.standing >= 2
}

export function checkPurchase(kind: EquipmentKind, ctx: MarketContext): PurchaseCheck {
  const item = MARKET_STOCK.find(i => i.kind === kind)
  if (!item) return { ok: false, reason: 'unknown-item' }
  if (item.tier === 3 && !tier3Unlocked(ctx)) {
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

/**
 * Items visible to the player right now — the single query authority (02
 * "Market"). `MarketPanel.tsx` must render exactly this list, never the raw
 * `MARKET_STOCK` table.
 */
export function availableStock(ctx: MarketContext): MarketItem[] {
  return MARKET_STOCK.filter(item => item.tier < 3 || tier3Unlocked(ctx))
}
