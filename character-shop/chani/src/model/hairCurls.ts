// character-shop/chani/src/model/hairCurls.ts
// Named curl MASSES — eleven per side, mirrored — not strands and not
// noise. Each is a closed loft whose rings snake in X and Z as they fall
// and whose radius swells and pinches on a fixed period: that beading is
// what makes a lock read as curled at bust framing, where an actual curl's
// pitch is smaller than a pixel. Jitter is not detail; a named mass with
// authored lobes is.
//
// The masses exist for a second, measured reason. R1's finding on this very
// hair was that PALETTE.hair against a dark backdrop reads as a HOLE — a
// pixel scan found no gap, but every critic saw one. Silhouette-legible
// masses that break the outline and catch the rig's rim light are the fix
// that does not depend on the lighting being kind.
//
// PASS 3 IS ABOUT ROUNDNESS, and the cause was not the authored shape. Every
// judge called these masses hard, angular, claw-like or dreadlocked, and all
// three of the shaping functions below had a CORNER in them: `anchor` kinked
// at t = 0.25, `bud` at t = 0.16 and `tip` at t = 0.60, each a
// min()/ternary joining two curves with different slopes. At 20 rings those
// three kinks landed on rings 5, 3 and 12 of every one of twenty-two masses,
// and loft() runs STRAIGHT between rings — so each kink rendered as a hard
// horizontal crease right across the lock. They are smoothsteps now, and the
// ring count is 34, which also puts 11-13 rings on each beading period
// instead of 6-8.

import type { Group, Mesh } from 'three'
import type { ChaniMaterials } from './materials'
import { loft, type Ring } from './loft'

interface Curl {
  name: string
  /** Anchor of the fall, head-local. */
  x0: number
  z0: number
  yTop: number
  yBot: number
  /** Total sideways and forward drift from top to bottom. */
  out: number
  fwd: number
  /** Mass radius, curl period along the fall, and its phase. */
  r: number
  lobes: number
  phase: number
  swayX: number
  swayZ: number
}

// The anchors sit further BACK than R1's did. At z0 = 0 the 'Cheek' mass
// hung over the zygomatic arch and cropped the visible face to 96mm across
// a 134mm skull. Hair frames a face from beside it, not across it.
//
// PASS 3 MOVED TWO GROUPS, both for measured silhouette defects.
//
// FaceFrame started at y = 172mm, which is BELOW the shell's own widest
// rows, so in the 3/4 frame its top edge and the shell's front edge crossed
// with a wedge of BACKDROP between them — the stair-step notch beside the
// brow a judge reported at x150-350/y680-950. It starts at 190mm now, up
// inside the shell, with 5mm more radius: the lock has to be born under the
// mass it falls from, not beside it.
//
// FaceFrame and Cheek also moved OUT 6mm each, on a projection
// measurement rather than a 3D one. Both masses hang BEHIND the face
// plane — 56mm behind it at cheek height — and a front camera therefore
// projects them at a smaller screen offset than the skin at the same
// world X. Measured on the pass-3 capture: the widest SKIN in headfront
// spans 129mm against a bizygomatic of 146, so the hair was cropping 8mm
// of cheekbone per side and the visible face read as a long narrow oval
// with a chin hanging out of the bottom of it. The heart shape station.ts
// builds cannot be judged if the hair covers the widest part of it.
//
// The three CROWN masses were poking through the top of the shell. Their
// tops sat at 236-239mm against a shell apex of 239.5, so each one broke the
// crown silhouette as a flat-capped slab — loft() caps a ring with a hub
// fan, and at 12mm of top radius that cap IS a facet — with backdrop showing
// in the gaps between them. That is both crown notches. They now start
// 2-4mm lower and, more importantly, sweep 88mm outward instead of 56, so
// they emerge through the SIDE of the shell around y = 190 and run down into
// the tops of the side masses. A lock that leaves the scalp at the part and
// comes out over the temple is a lock; one that pokes 1mm out of the top of
// the head is a lump.
const CURLS: readonly Curl[] = [
  { name: 'FaceFrame', x0: 0.0824, z0: 0.0110, yTop: 0.1900, yBot: 0.0180, out: 0.0180, fwd: -0.0250, r: 0.0235, lobes: 2.8, phase: 0.00, swayX: 0.0080, swayZ: 0.0075 },
  { name: 'Cheek', x0: 0.0908, z0: 0.0185, yTop: 0.1900, yBot: -0.0480, out: 0.0230, fwd: -0.0320, r: 0.0295, lobes: 2.6, phase: 1.15, swayX: 0.0105, swayZ: 0.0095 },
  { name: 'Ear', x0: 0.0928, z0: 0.0455, yTop: 0.1930, yBot: -0.0720, out: 0.0250, fwd: -0.0180, r: 0.0330, lobes: 2.5, phase: 2.30, swayX: 0.0115, swayZ: 0.0115 },
  { name: 'SideBack', x0: 0.0830, z0: 0.0760, yTop: 0.1960, yBot: -0.0900, out: 0.0265, fwd: -0.0040, r: 0.0350, lobes: 2.6, phase: 0.55, swayX: 0.0125, swayZ: 0.0125 },
  { name: 'NapeOuter', x0: 0.0570, z0: 0.1060, yTop: 0.1960, yBot: -0.1080, out: 0.0300, fwd: 0.0140, r: 0.0360, lobes: 2.7, phase: 1.75, swayX: 0.0125, swayZ: 0.0125 },
  { name: 'NapeInner', x0: 0.0225, z0: 0.1220, yTop: 0.1940, yBot: -0.1260, out: 0.0265, fwd: 0.0200, r: 0.0350, lobes: 2.8, phase: 2.85, swayX: 0.0105, swayZ: 0.0115 },
  // Hair falling BESIDE the neck. Without it the throat is bare skin from
  // jawline to collar and reads wider than the jaw above it, which is what
  // made the first head captures look thick-necked. It is also half of what
  // makes 'past the shoulders' read at bust framing.
  { name: 'Neck', x0: 0.0625, z0: 0.0400, yTop: 0.1000, yBot: -0.1200, out: 0.0175, fwd: -0.0420, r: 0.0280, lobes: 2.4, phase: 2.05, swayX: 0.0085, swayZ: 0.0090 },
  { name: 'Shoulder', x0: 0.0780, z0: -0.0100, yTop: 0.1150, yBot: -0.1000, out: 0.0400, fwd: -0.0980, r: 0.0260, lobes: 2.8, phase: 0.85, swayX: 0.0095, swayZ: 0.0100 },
  { name: 'CrownFront', x0: 0.0150, z0: -0.0180, yTop: 0.2350, yBot: 0.1450, out: 0.0880, fwd: 0.0140, r: 0.0235, lobes: 1.5, phase: 1.90, swayX: 0.0075, swayZ: 0.0075 },
  { name: 'CrownMid', x0: 0.0170, z0: 0.0280, yTop: 0.2360, yBot: 0.1420, out: 0.0900, fwd: 0.0180, r: 0.0250, lobes: 1.4, phase: 0.30, swayX: 0.0080, swayZ: 0.0080 },
  { name: 'CrownBack', x0: 0.0180, z0: 0.0740, yTop: 0.2335, yBot: 0.1380, out: 0.0870, fwd: 0.0280, r: 0.0250, lobes: 1.5, phase: 2.60, swayX: 0.0080, swayZ: 0.0080 },
]

/** 34, not 20. See the header: the ring count is both the beading's
 *  sampling rate and the mass's vertical faceting, because loft() has no
 *  Catmull-Rom in it. */
const RINGS = 34
const smooth = (t: number): number => t * t * (3 - 2 * t)
/** Smoothstep from 0 to 1 over [0, edge], flat outside — the C1 replacement
 *  for the min()/ternary kinks that were creasing every lock. */
const ease = (t: number, edge: number): number =>
  smooth(t <= 0 ? 0 : t >= edge ? 1 : t / edge)

/** The top ring is pulled 38% toward the head's axis so it starts INSIDE
 *  the shell: a curl whose first cap is in the open is a disc floating in
 *  the hair, which is what R1's locks looked like from behind. */
const anchor = (t: number): number => 0.62 + 0.38 * ease(t, 0.30)

/** Fat through the body, budding at the top, tapered to a small capped tip.
 *  `lobes` full cosine periods along the fall give the beading. */
function radiusAt(c: Curl, t: number): number {
  // 0.26 of the mass radius, sampled 11-13 times per period at 34 rings. At
  // 0.23 the masses rendered as smooth faceted panels and the head read as
  // a HOOD — the one thing spec.ts COSTUME.head rules out. Pass 1 answered
  // that with 0.34, which at 12 rings was a beat the mesh could not carry
  // and came back as a zigzag.
  const lobe = 1 + 0.26 * Math.cos(t * c.lobes * Math.PI * 2 + c.phase)
  // 0.34 at the top, not 0.58: the top ring's cap is a flat hub fan, and at
  // 0.58 of a 23mm mass that is a 12mm disc facing the camera. On the crown
  // masses those discs WERE the notches in the crown silhouette.
  const bud = 0.34 + 0.66 * ease(t, 0.24)
  // Tapered to 3% of radius over the last 45% of the fall. A curl that ends
  // in a 9mm disc punches through the chest as a floating dark wedge; the
  // honest fix is not to stop the curl short — a lock ending in mid-air is
  // worse — it is to end it in a point small enough that the overshoot is
  // under a pixel at bust framing.
  const tip = 1 - 0.97 * smooth(t <= 0.55 ? 0 : Math.min(1, (t - 0.55) / 0.45))
  return c.r * lobe * bud * tip
}

function curlRings(c: Curl, side: number): Ring[] {
  const rings: Ring[] = []
  for (let i = 0; i < RINGS; i++) {
    const t = i / (RINGS - 1)
    const a = anchor(t)
    const wave = t * c.lobes * Math.PI + c.phase
    const r = radiusAt(c, t)
    rings.push({
      y: c.yTop + (c.yBot - c.yTop) * t,
      rx: r,
      xc: side * (c.x0 * a + c.out * t + c.swayX * Math.sin(wave)),
      zc: c.z0 * a + c.fwd * t ** 1.9 + c.swayZ * Math.cos(wave),
      rzF: r * 0.96,
      rzB: r * 0.96,
    })
  }
  // Rings run top-down; loft() wants them bottom-first or its winding
  // inverts and depth.test.ts finds a negative volume.
  return rings.reverse()
}

export function buildCurls(head: Group, mat: ChaniMaterials): Mesh[] {
  const out: Mesh[] = []
  for (const curl of CURLS) {
    for (const side of [-1, 1]) {
      // 32 radial segments, not 20. At bust framing the big masses are
      // 65-72mm across and 20 segments put a facet edge every 18 degrees;
      // the critic saw those facets and called the result carved.
      const mesh = loft(curlRings(curl, side), mat.hair, 32)
      mesh.name = `hairCurl${curl.name}${side < 0 ? 'L' : 'R'}`
      head.add(mesh)
      out.push(mesh)
    }
  }
  return out
}

export const CURL_NAMES = CURLS.map((c) => c.name)
