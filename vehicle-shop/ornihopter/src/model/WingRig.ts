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
import { foldYawAt, foldTiltAt } from './wingFoldPose'

export interface WingAttachment {
  x: number
  y: number
  z: number
}

export interface WingRig {
  /** Outermost pivot (Fold), already translated to the attachment point. */
  root: Group
  /**
   * Drive Flap and Feather for this frame from the flight model's own
   * beatPhase.
   *
   * @param amplitude FlightState.beatAmplitude, the wing-drive spool: 1 in
   * flight, winding to 0 while the craft is parked on its gear. It scales the
   * STROKE, not the phase, which is what settles the wings: at 0 both pivots
   * sit at zero — blades flat and untwisted, the parked pose — and every value
   * between is the same stroke, smaller. Freezing the phase instead would stop
   * the wings wherever the last tick left them, mid-flap.
   *
   * @param fold FlightState.foldProgress, 0 spread .. 1 stowed. Above 0 the
   * beat is BYPASSED, not scaled: wingFoldPose.ts owns both pivots outright,
   * because a folded wing does not feather and a half-folded one does not
   * flap around a stowed mean. At exactly 0 this function is the expression it
   * has always been, evaluated in the same order — see wingFoldRig.test.ts,
   * which compares a beat sweep against a stashed unfolded baseline bit for
   * bit.
   */
  update(beatPhase: number, amplitude?: number, fold?: number): void
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

  const fold3 = new Group()
  fold3.name = `wing-fold-${side}-${pairIndex}`
  fold3.position.set(attachment.x, attachment.y, attachment.z)
  fold3.rotation.y = mirror * foldAngle(pairIndex)

  const flap = new Group()
  flap.name = 'wing-flap'
  fold3.add(flap)

  const feather = new Group()
  feather.name = 'wing-feather'
  flap.add(feather)

  const blade = new Mesh(bladeGeometry, bladeMaterial)
  blade.name = 'wing-blade'
  feather.add(blade)

  return {
    root: fold3,
    update(beatPhase: number, amplitude = 1, fold = 0): void {
      if (fold > 0) {
        fold3.rotation.y = mirror * foldYawAt(pairIndex, fold)
        flap.rotation.z = mirror * foldTiltAt(pairIndex, fold)
        feather.rotation.x = 0
        return
      }
      fold3.rotation.y = mirror * foldAngle(pairIndex)
      flap.rotation.z = mirror * flapAngle(beatPhase, pairIndex) * amplitude
      feather.rotation.x = featherAngle(beatPhase, pairIndex) * amplitude
    },
  }
}
