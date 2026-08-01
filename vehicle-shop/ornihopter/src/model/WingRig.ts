// vehicle-shop/ornihopter/src/model/WingRig.ts
// The three.js side of one wing: three nested pivots — Fold, Flap, Feather —
// sharing a single point, the mechanical root, so no matter how they rotate
// that point never moves relative to the hull. wingKinematics.ts owns the
// pure angle maths this only turns into real Object3D rotations.
//
// Geometry and material are shared across all four same-side wings (spec.ts
// gives every pair the identical span/chord/thickness — only the per-pair
// Fold angle and beat phase differ), so this module never builds or owns
// either; Ornithopter.ts disposes them once, centrally.
//
// Mirror derivation: geometry/wingGeometry.ts builds the blade with its span
// running toward +X for the right wing and -X for the left (root always at
// local x=0). Fold rotates about local Y and Flap about local Z, both
// through that same root point. Working the rotation formulas through for a
// point at local (x, 0, 0): the SAME signed angle sends the right wing's
// point (positive x) and the left wing's point (negative x) to opposite
// signs of y (Flap) or z (Fold) — so both pivots need `mirror` to land both
// sides on the same physical direction at the same phase ("left and right
// of a pair beat together", progress.md bar item 2). Feather rotates about
// the span axis itself (local X): its formula only touches (y, z), never x,
// so the same signed angle already produces the same effect on both sides
// without any flip.

import { Group, Mesh, type BufferGeometry, type Material } from 'three'
import { foldAngle, flapAngle, featherAngle, type WingSide } from './wingKinematics'

export interface WingAttachment {
  x: number
  y: number
  z: number
}

export interface WingRig {
  /** Outermost pivot (Fold), already translated to the attachment point. */
  root: Group
  /** Drive Flap and Feather for this frame from the flight model's own beatPhase. */
  update(beatPhase: number): void
}

/**
 * @param side Which flank this wing mounts to.
 * @param pairIndex 0 (frontmost) .. 3 (rearmost) — spec.ts WING_ROOTS order.
 * @param attachment World-relative-to-hull mount point; WING_ROOT_X mirrored per side.
 */
export function createWingRig(
  side: WingSide,
  pairIndex: number,
  attachment: WingAttachment,
  bladeGeometry: BufferGeometry,
  bladeMaterial: Material,
): WingRig {
  const mirror = side === 'right' ? 1 : -1

  const fold = new Group()
  fold.name = `wing-fold-${side}-${pairIndex}`
  fold.position.set(attachment.x, attachment.y, attachment.z)
  fold.rotation.y = mirror * foldAngle(pairIndex)

  const flap = new Group()
  flap.name = 'wing-flap'
  fold.add(flap)

  const feather = new Group()
  feather.name = 'wing-feather'
  flap.add(feather)

  const blade = new Mesh(bladeGeometry, bladeMaterial)
  blade.name = 'wing-blade'
  feather.add(blade)

  return {
    root: fold,
    update(beatPhase: number): void {
      flap.rotation.z = mirror * flapAngle(beatPhase, pairIndex)
      feather.rotation.x = featherAngle(beatPhase, pairIndex)
    },
  }
}
