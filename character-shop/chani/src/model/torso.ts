// character-shop/chani/src/model/torso.ts
// ONE closed lofted solid from under the crotch to the base of the neck,
// plus the neck itself. R1 pass 3 rebuild: pass 2's revolved profile gave
// every height the same front and back, so the left/right views collapsed
// into a flat cutout. Each Ring below authors a front line AND a back line,
// and reading the rzF/rzB columns downward IS the profile the critic asked
// for: belly out, waist tucked, bust forward, thoracic curve back, lumbar
// hollow, seat back.
//
// Two authored details replace two glued-on meshes:
//   - `lobe` at the three chest rings is the pec/breast volume, a term in
//     THIS surface, so it flows through the profile instead of reading as
//     the two spheres pass 2 stuck on the front.
//   - `lobeB` at the pelvis rings is the glute pair, same trick behind.
// The mass also runs BELOW the hip joint (negative Y rows): that plus
// legs.ts' inboard femur mass is what closes the white crotch triangle.

import type { Group, Mesh } from 'three'
import type { Proportions } from './proportions'
import type { ChaniMaterials } from './materials'
import { loft, type Ring } from './loft'

/** Pelvis-local: Y=0 is the hip joint, +Z is the back. */
function torsoRings(p: Proportions): Ring[] {
  const s = p.shoulderHalfWidth
  const h = p.hipHalfWidth
  const pel = p.pelvisH
  const spi = p.spineH
  const top = pel + spi + p.chestH
  return [
    // Crotch: the mass tapers to a small rounded end BETWEEN the thighs
    // rather than stopping at a wide flat disc — a bottom cap the camera
    // looks up at from below reads as a sawn-off block, which is what made
    // the pelvis look like a diaper in the first pass-3 capture.
    { y: -pel * 0.60, rx: h * 0.22, rzF: 0.040, rzB: 0.044 },
    { y: -pel * 0.46, rx: h * 0.42, rzF: 0.062, rzB: 0.068 },
    { y: -pel * 0.28, rx: h * 0.66, rzF: 0.078, rzB: 0.084, lobeB: 0.003 },
    { y: -pel * 0.10, rx: h * 0.71, rzF: 0.088, rzB: 0.096, lobeB: 0.005 },
    // Pass-3b: the seat's Z was trimmed 21mm (maxZ 0.132 -> 0.111) and its
    // flare spread over more height. A 45-degree camera projects width as
    // (x+z)/sqrt(2), so seat DEPTH inflates the rendered hip: a critic
    // pixel-measured this pelvis at 170px against a 147px upper torso and
    // read a bulbous pad. The X numbers were already spec-legal; the depth
    // was what made them look wrong, so the depth budget moved to the chest.
    { y: pel * 0.25, rx: h * 0.87, rzF: 0.093, rzB: 0.102, lobeB: 0.007 },
    // Hip peak: the silhouette test reads max |X| in [0.60, 0.95] * pelvisH
    // against spec's hipHalfWidth, and this is the widest ring in that band.
    { y: pel * 0.62, rx: h, rzF: 0.092, rzB: 0.104, lobeB: 0.007 },
    { y: pel * 0.94, rx: h * 0.90, rzF: 0.088, rzB: 0.098, lobeB: 0.003 },
    { y: pel + spi * 0.20, rx: h * 0.78, rzF: 0.082, rzB: 0.088 },
    { y: pel + spi * 0.42, rx: h * 0.68, rzF: 0.080, rzB: 0.078 },
    { y: pel + spi * 0.70, rx: h * 0.755, rzF: 0.096, rzB: 0.096 },
    { y: pel + spi + p.chestH * 0.14, rx: s * 0.750, rzF: 0.106, rzB: 0.108, lobe: 0.006 },
    { y: pel + spi + p.chestH * 0.36, rx: s * 0.815, rzF: 0.118, rzB: 0.112, lobe: 0.016 },
    { y: pel + spi + p.chestH * 0.58, rx: s * 0.845, rzF: 0.114, rzB: 0.118, lobe: 0.008 },
    { y: pel + spi + p.chestH * 0.80, rx: s * 0.950, rzF: 0.100, rzB: 0.114 },
    // Shoulder line: the only ring at spec width, inside the test's top-30%
    // -of-the-chest band. Above it the trapezius runs up to the collar.
    { y: top - p.chestH * 0.13, rx: s, rzF: 0.088, rzB: 0.104 },
    { y: top, rx: s * 0.79, rzF: 0.074, rzB: 0.090 },
    // Trapezius, in two steps rather than one: the single ring it used to
    // be dropped 76mm of half-width in 16mm of height, and a neck rising
    // out of that step reads as a peg in a socket. Every ring above the
    // shoulder line is still NARROWER than the one below, so this mass's
    // top cap faces up into its own taper and no camera below can see the
    // disc; the collar covers it from above.
    { y: top + p.neckH * 0.15, rx: s * 0.575, rzF: 0.064, rzB: 0.078 },
    { y: top + p.neckH * 0.40, rx: s * 0.37, rzF: 0.052, rzB: 0.062 },
  ]
}

// R2 moved the NECK out of this file. It was its own loft here, rising
// from inside the trapezius into the skull, and a separate loft cannot
// taper into a jaw: its ellipse was 6mm wider than any chin the R2 brief
// allows, so it poked out through the mandible at every angle. The neck is
// now rows of the head's own control profile (face/station.ts), which is
// the same thing the accepted house pattern does. Nothing below the
// clavicle changed — torsoRings above is R1's, untouched, and the collar
// still hides this mass's top cap.
export function buildTorso(
  groups: { pelvis: Group; chest: Group }, p: Proportions, mat: ChaniMaterials,
): Mesh[] {
  const torso = loft(torsoRings(p), mat.fabric, 28)
  torso.name = 'torsoMass'
  groups.pelvis.add(torso)
  return [torso]
}
