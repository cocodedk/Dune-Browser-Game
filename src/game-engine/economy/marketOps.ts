// src/game-engine/economy/marketOps.ts
// Buying equipment from the smugglers.
//
// Issuing bought equipment to a crew is commands/issueEquipmentCommand.ts
// now — that command needs a CommandOutcome refusal for "no crew selected"
// (02 "Equipment"), which this file's old bare `issueEquipment(id, groupId)`
// had no way to report; see troops/equipment.ts's checkIssue.

import { world } from '../GameState'
import { pushEvent } from '../EventSystem'
import { checkPurchase, purchaseRefusalMessage } from '../market/market'
import type { EquipmentKind } from '../troops/types'

/**
 * Buy from the smuggler. Guards live in market/market.ts.
 *
 * `act: world.act` is what actually gates tier-3 stock now — this used to
 * pass a hardcoded `tier3Unlocked: false`, so no purchase could ever reach
 * act3's gate regardless of the campaign's real act (02 "Market": the act
 * gate was unwired). `standing` was already a live datum
 * (world.flags['smuggler.standing'], incremented below on every purchase;
 * see dialogue/engineFlags.ts's registry) — not deferred, just now actually
 * read by the query it was always meant to feed.
 */
export function buyEquipment(kind: EquipmentKind): void {
  // Presence is the command's own precondition, not the panel's. The market
  // renders only at the den (acts/openingDisclosure.ts), but a bus dispatch
  // does not go through the panel — and buying an ornithopter from the far
  // side of the planet was legal until this check existed.
  const here = world.villages.find(v => v.id === world.player.location)
  if (here?.kind !== 'smuggler_den') {
    pushEvent('sietch_task_assigned', purchaseRefusalMessage('not-at-market'))
    return
  }

  const standing = typeof world.flags['smuggler.standing'] === 'number'
    ? (world.flags['smuggler.standing'] as number)
    : 0

  const check = checkPurchase(kind, {
    spice: world.player.spice,
    standing,
    act: world.act,
  })

  if (!check.ok) {
    pushEvent('sietch_task_assigned', purchaseRefusalMessage(check.reason))
    return
  }

  world.player.spice -= check.item.price
  world.flags['smuggler.standing'] = standing + 1
  world.equipment.push({
    id: `eq_${kind}_${world.equipment.length}`,
    kind,
    locationId: world.player.location,
    groupId: null,
    condition: 100,
  })
  pushEvent('spice_shipment_received', `Bought ${check.item.label} for ${check.item.price} spice.`)
}
