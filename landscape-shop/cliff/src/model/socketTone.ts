// landscape-shop/cliff/src/model/socketTone.ts
// How dark the inside of the gate is, point by point.
//
// R1.3 painted every interior face one flat unlit near-black. That killed
// the "lit box" the round before it, and overshot: the critic read the
// result as "solid black with no gradient, no visible back wall or floor
// catching light, no depth falloff — a painted-on hole". A hole has to be
// dark AND have structure, and the structure cannot come from lighting: a
// lit interior is the failure this replaced.
//
// So the tone is authored as a FIELD over (y, z) and baked into vertex
// colours on an unlit material. Two gradients, both physical:
//
//   depth  — light from outside falls off going in, so the back of the
//            shaft is a quarter of the tone of the mouth plane.
//   floor  — daylight bounces off the sand outside onto the floor just
//            inside the sill, so the sill line is the brightest thing in
//            there and the roof is the darkest. Below the floor line the
//            tone dies again: what shows under the sill is a slot, not a
//            surface.
//
// Ceiling is deliberate. The brightest point displays around 7% luminance;
// rock in full shadow outside sits near 13%, so the mouth still reads as
// obviously darker than anything around it. socketTone guards in
// massingR1.test.ts pin both the ceiling and the spread.

import { BufferAttribute, Color, DoubleSide, MeshBasicMaterial, SRGBColorSpace } from 'three'
import type { BufferGeometry } from 'three'
import { PALETTE } from '../spec'

/** The mouth plane and the back of the shaft, in world z. */
export interface SocketDepth {
  frontZ: number
  backZ: number
}

// Fraction of PALETTE.rockShadow the interior may reach. AMBIENT is the
// floor no surface ever drops below, so nothing in there is ever #000.
//
// R1.5: R1.4's 0.38 rendered the sill at 9->24/255 top-to-bottom — a real
// gradient, but still black-on-black to a human critic. Retuned against
// rendered-pixel sampling at the landing rig (model/massif.ts's shadowSide
// fix changed the scene's own shadow rock, so the old "48/255" reference
// no longer held): the darkest LIT rock in shadow outside the mouth now
// measures ~39-40/255, so CATCH is set to land the sill's genuine peak
// (before the mouth's own silhouette edge, which anti-aliases into the lit
// rim behind it) at 31-32/255 — clearly a warm gradient, clearly still
// short of anything lit. The back of the shaft falls to about 5/255.
const AMBIENT = 0.025
const CATCH = 0.66
// Deliberately NOT crushing: at 0.8 the back wall went flat near-black and
// the mouth was a painted hole again, which is the finding this fixes. The
// depth read comes from the back wall being dimmer than the sill AND from
// the vertical gradient below, not from erasing the back wall.
const DEPTH_FALLOFF = 0.45

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

/** Tone at (y, z) as a fraction of PALETTE.rockShadow. A pure function of
 *  world position, which is what keeps it continuous across the rings the
 *  chamfer, jamb, shaft, seal and sill share: two meshes meeting at a ring
 *  read the same numbers there, so no ring edge can show. */
export function interiorTone(y: number, z: number, depth: SocketDepth): number {
  const into = Math.min(1, Math.max(0, (z - depth.frontZ) / (depth.backZ - depth.frontZ)))
  const byDepth = 1 - DEPTH_FALLOFF * into
  // Ramped over 0..16 m, which is the height range the rig actually sees
  // inside: the back wall spans y = 0..12, so a ramp tuned to the 38 m
  // mouth would leave that wall one flat tone.
  const overhead = 1 - 0.78 * smoothstep(0, 16, y)
  // The passage FLOOR sits at y = 0 and the throat's own lower rim at
  // y = -1, so the fall-off has to start below both: dimming from y = 0
  // would darken exactly the surface the landing rig looks down onto.
  const underSill = 0.45 + 0.55 * smoothstep(-4, -1, y)
  return AMBIENT + CATCH * byDepth * overhead * underSill
}

/** Unlit, so a self-shadowed facet and a directly-lit one come out
 *  identically: the tone is the geometry's own, never the sun's. */
export function interiorMaterial(): MeshBasicMaterial {
  return new MeshBasicMaterial({ vertexColors: true, side: DoubleSide })
}

const SHADOW = [16, 8, 0].map((shift) => ((PALETTE.rockShadow >> shift) & 0xff) / 255)

/** Bakes `interiorTone` onto a finished interior lattice as vertex colours.
 *  Written through SRGBColorSpace so the numbers above are the DISPLAYED
 *  fractions, not linear ones — a 5% linear value would render at 24%. */
export function paintInterior(geometry: BufferGeometry, depth: SocketDepth): void {
  const position = geometry.attributes.position
  const colors = new Float32Array(position.count * 3)
  const color = new Color()
  for (let i = 0; i < position.count; i++) {
    const tone = interiorTone(position.getY(i), position.getZ(i), depth)
    color.setRGB(SHADOW[0] * tone, SHADOW[1] * tone, SHADOW[2] * tone, SRGBColorSpace)
    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b
  }
  geometry.setAttribute('color', new BufferAttribute(colors, 3))
}
