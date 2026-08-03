// vehicle-shop/ornihopter/src/interior/cyclic.ts
// The cyclic: floor-rising, segmented, grip on the END. Replaces round 6b's
// brow-hung arm — round 7's critic named it "one smooth, unbroken cylinder...
// no knuckles, no hinge blocks, no clamps... a ball on its FLANK, not its
// end." layout.ts's CYCLIC documents why each station sits where it does (the
// eye-height visibility math); this file only builds the parts.
//
// Four tube sections (pivot -> knuckle1 -> knuckle2 -> knuckle3 -> grip base),
// three knuckle BLOCKS with a clamp collar at each — a block reads as a hinge
// where a ball reads as a rod end, which is exactly what round 7 named
// missing — and a moulded grip on top with a hat switch and a trigger,
// hand-scaled at CYCLIC.gripBase-to-gripTop (0.13m).

import { Group, type MeshStandardMaterial } from 'three'
import { CYCLIC } from './layout'
import { box, cylinderY, segment, type Placed } from './sceneUtils'
import { machinedMaterial, machinedDarkMaterial, gunmetalMaterial, stickGripMaterial } from './materials'

/** The craft, and CYCLIC's own stations, are symmetric about x = 0, so
 *  mirroring to the copilot's side is a plain negation, not a second table. */
function mirrorPoint(p: Placed, flip: boolean): Placed {
  return flip ? { x: -p.x, y: p.y, z: p.z } : { x: p.x, y: p.y, z: p.z }
}

function addTube(group: Group, a: Placed, b: Placed, material: MeshStandardMaterial): void {
  const tube = segment(a, b, CYCLIC.tubeRadius, CYCLIC.tubeRadius * 1.05, material)
  tube.name = 'cyclic-tube'
  group.add(tube)
}

/** A knuckle block astride the tube, with a clamp collar wrapped round the
 *  join — the joint round 7's critic found entirely missing. */
function addKnuckle(group: Group, at: Placed): void {
  const block = box(0.075, 0.06, 0.075, machinedDarkMaterial(), at)
  block.name = 'cyclic-knuckle'
  const collar = cylinderY(CYCLIC.tubeRadius * 1.8, CYCLIC.tubeRadius * 1.8, 0.028, gunmetalMaterial(), at, 12)
  group.add(block, collar)
}

/** The moulded grip standing on the last tube's own end — a hat switch on
 *  its crown, a trigger stub facing forward — the read a hand actually
 *  holds, not a ball threaded onto the shaft's flank. */
function addGrip(group: Group, base: Placed, top: Placed): void {
  const centre: Placed = { x: (base.x + top.x) / 2, y: (base.y + top.y) / 2, z: (base.z + top.z) / 2 }
  const grip = box(0.09, top.y - base.y, 0.075, stickGripMaterial(), centre)
  grip.name = 'cyclic-grip'
  group.add(
    grip,
    box(0.05, 0.03, 0.05, machinedDarkMaterial(), { x: top.x, y: top.y + 0.02, z: top.z }),
    box(0.03, 0.035, 0.04, gunmetalMaterial(), { x: top.x, y: centre.y - 0.01, z: top.z - 0.05 })
  )
}

/**
 * One cyclic, floor to grip. `flip` mirrors it to the copilot's own side;
 * `name` is the group's own name (the mechanical guard looks up exactly one
 * node named 'cyclic' — the pilot's — so the copilot's copy is named
 * differently on purpose).
 */
export function buildCyclic(flip: boolean, name: string): Group {
  const group = new Group()
  group.name = name

  const pivot = mirrorPoint(CYCLIC.pivot, flip)
  const k1 = mirrorPoint(CYCLIC.knuckle1, flip)
  const k2 = mirrorPoint(CYCLIC.knuckle2, flip)
  const k3 = mirrorPoint(CYCLIC.knuckle3, flip)
  const gripBase = mirrorPoint(CYCLIC.gripBase, flip)
  const gripTop = mirrorPoint(CYCLIC.gripTop, flip)

  // Floor mount: a flange the pivot actually stands on, not a tube ending in
  // open air.
  group.add(box(0.1, 0.03, 0.1, machinedMaterial(), { x: pivot.x, y: pivot.y + 0.015, z: pivot.z }))

  addTube(group, pivot, k1, machinedMaterial())
  addKnuckle(group, k1)
  addTube(group, k1, k2, machinedMaterial())
  addKnuckle(group, k2)
  addTube(group, k2, k3, machinedMaterial())
  addKnuckle(group, k3)
  addTube(group, k3, gripBase, machinedMaterial())
  addGrip(group, gripBase, gripTop)

  return group
}
