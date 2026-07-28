// src/game-engine/economy/marketOps.ts
// Buying equipment from the smugglers, and issuing it to a crew.

import { world } from '../GameState'
import { pushEvent } from '../EventSystem'
import { checkPurchase, purchaseRefusalMessage } from '../market/market'
import type { EquipmentKind } from '../troops/types'

/** Buy from the smuggler. Guards live in market/market.ts. */
export function buyEquipment(kind: EquipmentKind): void {
  const standing = typeof world.flags['smuggler.standing'] === 'number'
    ? (world.flags['smuggler.standing'] as number)
    : 0

  const check = checkPurchase(kind, {
    spice: world.player.spice,
    standing,
    tier3Unlocked: false,
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

/** Hand a piece of equipment to a crew. */
export function issueEquipment(equipmentId: string, groupId: string): void {
  const item = world.equipment.find(e => e.id === equipmentId)
  if (!item) return
  if (item.groupId) {
    pushEvent('sietch_task_assigned', 'That equipment is already with a crew.')
    return
  }
  item.groupId = groupId
  item.locationId = null
  pushEvent('sietch_task_assigned', 'Equipment issued to the crew.')
}
