// src/game-render/modes/flight/WingRig.ts
// The three.js side of the wing hinge: a pivot AT the fuselage attachment,
// never at midspan, that only ever rotates — so the wing root cannot
// leave the hull no matter how it beats. See stage 22 sections 1.1 and 2.3.
//
// wingCycle.ts owns all the motion maths; this module turns its angles into
// a three.js transform, plus propagates feather along the span as a
// torsional wave (tip leading root) via a per-vertex twist — a rigid mesh
// cannot show that with a single rotation. The wing is now TWO meshes (a
// spar and a pleated membrane, see geometry/wingGeometry.ts — stage 22's
// highest-priority fix, real wing surfaces instead of a flat blade) so the
// twist is applied generically to whichever parts are given to it, rather
// than to one hard-coded mesh.

import { Object3D, Mesh, BufferAttribute, type BufferGeometry, type Material } from 'three'
import { wingAngles, featherAtSpan } from './wingCycle'
import type { WingCycleOptions } from './wingCycle'
import { buildSparGeometry, buildMembraneGeometry } from './geometry/wingGeometry'
import {
  buildPterostigmaGeometry, buildNodusGeometry, buildSegmentRibGeometry, SEGMENT_RIB_SPAN_FRACTIONS,
} from './geometry/wingMarkings'
import type { WingGeometrySpec, WingAttachment, WingSide } from './wingConfig'

export interface WingMaterials {
  membrane: Material
  spar: Material
  /** The pterostigma's small dark mass — section 2.5's two "nearly free" markings. */
  marking: Material
}

export interface WingRig {
  /** Positioned at the shoulder attachment point. Translated once, never again. */
  pivot: Object3D
  /** Drive the wing for this frame; phase is the caller's clock, in radians. */
  update(phase: number, options: WingCycleOptions): void
  dispose(): void
}

interface WingPart {
  mesh: Mesh
  position: BufferAttribute
  /** Snapshot of the pristine rest pose — feather is recomputed from this every frame, never accumulated. */
  rest: Float32Array
}

function makePart(geometry: BufferGeometry, material: Material, name: string): WingPart {
  const mesh = new Mesh(geometry, material)
  mesh.name = name
  const position = geometry.attributes.position as BufferAttribute
  return { mesh, position, rest: Float32Array.from(position.array as ArrayLike<number>) }
}

/**
 * Twist one part's vertices about the LOCAL X (span) axis, staggered by span
 * fraction so the flip travels tip-to-root (wingCycle.ts's `featherAtSpan`)
 * instead of snapping the whole wing at once. Generic over any geometry whose
 * root sits at local x=0 and whose span axis is X — true of both the spar
 * and the membrane, so one function drives both.
 */
function applyFeatherTwist(part: WingPart, span: number, phase: number, options: WingCycleOptions): void {
  const { position, rest } = part
  const count = position.count
  for (let i = 0; i < count; i++) {
    const rx = rest[i * 3]
    const ry = rest[i * 3 + 1]
    const rz = rest[i * 3 + 2]
    const spanFraction = Math.min(1, Math.abs(rx) / span)
    const featherAngle = featherAtSpan(phase, spanFraction, options)
    const cos = Math.cos(featherAngle)
    const sin = Math.sin(featherAngle)
    position.setXYZ(i, rx, ry * cos - rz * sin, ry * sin + rz * cos)
  }
  position.needsUpdate = true
}

export function createWingRig(
  spec: WingGeometrySpec,
  side: WingSide,
  attachment: WingAttachment,
  materials: WingMaterials,
): WingRig {
  const span = spec.span
  // The two sides rotate oppositely for the same visible motion: they sit
  // on opposite sides of the flap/sweep rotation axes, so the same signed
  // angle would otherwise send them in mirrored (wrong) directions.
  // Feather needs no such flip — it rotates about the span axis itself,
  // which both sides share the same sense of.
  const mirror: 1 | -1 = side === 'right' ? -1 : 1

  const pivot = new Object3D()
  pivot.position.set(attachment.x, attachment.y, attachment.z)

  // Named 'wing' (the hinge invariant test looks for exactly this name) and
  // 'wing-spar' / 'wing-pterostigma' / 'wing-nodus' / 'wing-rib-N' (untested
  // directly — each shares the same pivot and the same per-vertex twist
  // below, so none can detach independently of the part that is tested).
  // Segment-joint ribs (round 5) reuse the spar material: they read as
  // structural members, the same family as the spar and nodus rather than
  // the membrane or its biological markings.
  const parts: WingPart[] = [
    makePart(buildMembraneGeometry(spec, side), materials.membrane, 'wing'),
    makePart(buildSparGeometry(spec, side), materials.spar, 'wing-spar'),
    makePart(buildPterostigmaGeometry(spec, side), materials.marking, 'wing-pterostigma'),
    makePart(buildNodusGeometry(spec, side), materials.spar, 'wing-nodus'),
    ...SEGMENT_RIB_SPAN_FRACTIONS.map((fraction, i) => (
      makePart(buildSegmentRibGeometry(spec, side, fraction), materials.spar, `wing-rib-${i}`)
    )),
  ]
  for (const part of parts) pivot.add(part.mesh)

  return {
    pivot,
    update(phase: number, options: WingCycleOptions): void {
      const angles = wingAngles(phase, options)
      pivot.rotation.z = mirror * angles.flap
      pivot.rotation.y = mirror * angles.sweep
      for (const part of parts) applyFeatherTwist(part, span, phase, options)
    },
    dispose(): void {
      for (const part of parts) part.mesh.geometry.dispose()
    },
  }
}
