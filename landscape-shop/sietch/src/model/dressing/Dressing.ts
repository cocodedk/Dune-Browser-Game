// landscape-shop/sietch/src/model/dressing/Dressing.ts
// R3 — dressing (landscape-shop/docs/gauntlet-loop.md): the objects of
// habitation. Five critics through R1 and R2 asked for the same thing in
// five different wordings — the hall is carved, the hall is lit, but
// nobody lives in it. This is the round that answers them.
//
// Everything here is STATIC scenery (contracts.ts: no update()), and
// everything is placed for a reason recorded next to it in
// tools/bake/pieces.mjs. Nothing is scattered: three zones, each a named
// cluster with an authored radius, with the floor between them left clear
// so R2's desire lines still read as the paths that made them.
//
// The group tree is the guard's contract as much as the scene's:
//
//   dressing
//     hearthCircle   the fire, its ring of mats, jars, baskets
//     basinPalmary   the pool, its kerb, three palms, three scrub tufts
//     tierStores     the carved threshold, goods on the ramp and the tier
//
// src/dressing.test.ts walks exactly that tree — keep the names.

import { Group } from 'three'
import bake from '../dressingBake.json'
import type { PaletteMaterials } from '../materials'
import { buildPiece, type BakedPiece } from './buildPiece'
import { buildDressingMaterials, type DressingMaterials } from './dressingMaterials'
import { buildBasinPool } from './basinPool'

export const DRESSING_BAKE = bake

export interface DressingSet {
  group: Group
  materials: DressingMaterials
}

/** The zone a mesh belongs to is where it sits in the tree, so a piece
 *  cannot quietly leave its cluster without the guard seeing it. */
function zoneGroups(): Map<string, Group> {
  const zones = new Map<string, Group>()
  for (const zone of bake.zones) {
    const group = new Group()
    group.name = zone.name
    zones.set(zone.name, group)
  }
  return zones
}

export function buildDressing(hall: PaletteMaterials): DressingSet {
  const materials = buildDressingMaterials()
  const root = new Group()
  root.name = 'dressing'

  const zones = zoneGroups()
  for (const piece of bake.pieces as BakedPiece[]) {
    const zone = zones.get(piece.zone)
    if (!zone) throw new Error(`${piece.name}: bake names a zone that does not exist (${piece.zone})`)
    const material = piece.material === 'ember' ? materials.ember : materials.dressing
    zone.add(buildPiece(piece, bake.tones, material))
  }

  // The pool is authored, not baked: it is two lathed forms whose sizes
  // are decided by the camera's own sight line (basinPool.ts), not by
  // anything a kit could supply.
  const palmary = zones.get('basinPalmary')
  if (palmary) palmary.add(buildBasinPool(hall, materials))

  for (const zone of zones.values()) root.add(zone)
  return { group: root, materials }
}
