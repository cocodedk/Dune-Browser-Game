// character-shop/chani/src/model/costume.ts
// The stillsuit's collar: the hood is down and the face cowl unclipped, so
// the fabric bunches around the neck and lies on the chest (spec.ts
// COSTUME.head). R1 pass 3 rebuild: pass 2 used a pale accent-coloured
// torus, which read as a clip-on ring rather than the suit's own fabric.
//
// The form is a lofted collar in the SUIT's fabric that stands proud of the
// chest and upper back in DEPTH (its front and back lines sit 10-25mm
// outside the torso's) while staying inside the shoulders in width — which
// is exactly how a rolled-down cowl sits: a band across the chest and nape
// that vanishes under the shoulder line at the sides. Its top ring is wider
// than the neck and stops ~10mm below the chin, so the throat is covered,
// the jaw is clear, and the trapezius' own top cap is hidden inside it.

import type { Group, Mesh } from 'three'
import type { Proportions } from './proportions'
import type { ChaniMaterials } from './materials'
import { loft, type Ring } from './loft'

/** Chest-local, same frame as torso.ts' neck. */
function collarRings(p: Proportions): Ring[] {
  const c = p.chestH
  return [
    // Bottom ring sits INSIDE the chest, so the fabric emerges from the
    // suit instead of ending in a disc the camera looks up at: a collar
    // that stands proud of the chest has nothing under its own bottom cap,
    // and the first pass-3 capture showed exactly that, as a dark bar
    // across the sternum.
    { y: c * 0.62, rx: 0.100, zc: 0.015, rzF: 0.095, rzB: 0.078 },
    // Bunched at the collarbone — ~18mm proud of the chest, ~24mm proud of
    // the back — then easing in as it wraps the neck. Those are the numbers
    // that make it read as fabric at bust framing; at half of them it
    // vanished into the suit entirely.
    // Emerges over two rings instead of one. A collar that jumped straight
    // from buried to 18mm proud made a hard ridge, and the harness key light
    // sits front-left, so that ridge lit on one side only and a critic read
    // a symmetric collar as an asymmetric lump. (Measured: every mesh in
    // this figure mirrors to 0.0000mm — the asymmetry was all lighting.)
    { y: c * 0.71, rx: 0.110, zc: 0.018, rzF: 0.114, rzB: 0.092 },
    { y: c * 0.80, rx: 0.115, zc: 0.020, rzF: 0.126, rzB: 0.102 },
    { y: c * 0.96, rx: 0.104, zc: 0.026, rzF: 0.118, rzB: 0.086 },
    { y: c + p.neckH * 0.34, rx: 0.092, zc: 0.028, rzF: 0.104, rzB: 0.072 },
    { y: c + p.neckH * 0.55, rx: 0.088, zc: 0.030, rzF: 0.086, rzB: 0.060 },
  ]
}

export function buildCollar(chest: Group, p: Proportions, mat: ChaniMaterials): Mesh[] {
  const collar = loft(collarRings(p), mat.fabric, 24)
  collar.name = 'collar'
  chest.add(collar)
  return [collar]
}
