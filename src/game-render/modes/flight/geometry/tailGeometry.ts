// src/game-render/modes/flight/geometry/tailGeometry.ts
// The tail, rebuilt as a dragonfly abdomen instead of an aeroplane-style
// vertical fin.
//
// The user's own words: "an Ornithopter has no rotor at the back. An
// ornithopter looks much like a dragonfly, yet more stylish." A blind critic
// independently called the old 6.4-unit standing fin "a bare cylinder of no
// legible purpose". Both readings are right, and so is the fiction: a
// dragonfly has no vertical stabiliser — it has a long, slender, tapering,
// segmented abdomen. The reference photographs
// (.shots/reference/thopter-mr.jpg, mr-O8.jpg) show exactly that: a slim
// tail boom ending in two small paired vanes, not a shark fin. tailVanes.ts
// builds those; this file builds the abdomen they mount to.
//
// Built as one LatheGeometry, continuing the fuselage's own lofted taper
// (fuselageGeometry.ts) from the old fin's mount station outward past the
// hull's own tail cap to a fine point — no fillet needed, because the root
// radius here is DERIVED from `hullRadiusAt`, not a separately chosen
// number, so the two surfaces meet exactly rather than needing a joint.
// A `ring` factor gives it insect-style segmentation (a taper modulated by
// waist constrictions, not a smooth aerodynamic cone), and a post-build
// vertex offset bends the spine gently upward toward the tip — the same
// "displace a generated primitive's position buffer" technique
// wingGeometry.ts already uses for the wing's own corrugation.

import { Group, Mesh, LatheGeometry, Vector2, type BufferGeometry, type Material } from 'three'
import { hullRadiusAt, FUSELAGE_LENGTH_SCALE, HULL_TAIL_Z } from './fuselageGeometry'
import { buildTailVanes } from './tailVanes'

/** Where the abdomen picks up — the old fin's own mount station, reused so the join lands where the hull is already this wide. */
export const TAIL_Z = 10.5 * FUSELAGE_LENGTH_SCALE

const ABDOMEN_LENGTH = 5.2
const PROFILE_POINTS = 22
const RADIAL_SEGMENTS = 10
const TIP_RADIUS = 0.03
const RING_COUNT = 5 // visible waist constrictions along the length
const RING_DEPTH = 0.16 // fractional radius dip at each waist
const CURVE_LIFT = 1.6 // world units the tip lifts, eased in toward the tip

const ROOT_RADIUS = hullRadiusAt(TAIL_Z)

/**
 * Insect-abdomen radius at fraction `t` (0 = root, 1 = tip), z given
 * separately so the caller does not have to invert the mapping back. An
 * overall taper (slow at first, steepening toward the tip, `t^1.4`) is
 * modulated by `RING_COUNT` waist constrictions, then CLAMPED to never sink
 * inside the fuselage's own surface while the two overlap (root..
 * HULL_TAIL_Z) — guaranteed by construction rather than by hand-tuning the
 * taper curve to just miss it, which is fragile (the hull is tapering fast
 * of its own accord through exactly this stretch). The clamp is exact
 * (no added margin) at t=0 so the join has no visible step, and margins in
 * gradually after that to keep the two surfaces from sitting exactly
 * coincident (a z-fighting risk) anywhere past the seam itself.
 */
function abdomenRadiusAt(t: number, z: number): number {
  const taper = ROOT_RADIUS + (TIP_RADIUS - ROOT_RADIUS) * Math.pow(t, 1.4)
  const ring = 1 - RING_DEPTH * (0.5 - 0.5 * Math.cos(t * RING_COUNT * Math.PI * 2))
  const candidate = taper * ring
  if (z > HULL_TAIL_Z) return candidate
  const margin = 0.02 * Math.min(1, t / 0.05)
  return Math.max(candidate, hullRadiusAt(z) + margin)
}

function buildAbdomenGeometry(): BufferGeometry {
  const points: Vector2[] = []
  for (let i = 0; i <= PROFILE_POINTS; i++) {
    const t = i / PROFILE_POINTS
    const z = TAIL_Z + t * ABDOMEN_LENGTH
    points.push(new Vector2(abdomenRadiusAt(t, z), z))
  }
  const geometry = new LatheGeometry(points, RADIAL_SEGMENTS)
  geometry.rotateX(Math.PI / 2) // same hull convention: height -> world Z

  // Bend the spine upward toward the tip. Post-rotation, position.z IS the
  // fuselage-length coordinate and position.y IS vertical, so this is a
  // direct y += f(z) rather than a re-derivation of the lathe's native axes.
  const position = geometry.attributes.position
  for (let i = 0; i < position.count; i++) {
    const t = Math.min(1, Math.max(0, (position.getZ(i) - TAIL_Z) / ABDOMEN_LENGTH))
    position.setY(i, position.getY(i) + CURVE_LIFT * t * t)
  }
  position.needsUpdate = true
  geometry.computeVertexNormals()
  return geometry
}

export interface TailParts {
  group: Group
  geometries: BufferGeometry[]
}

/**
 * @param bodyMaterial Hull paint, so the abdomen reads as a continuation of
 * the fuselage's own weathered skin rather than a bolted-on trim part.
 * @param trimMaterial The small paired tip vanes — a dark accent, matching
 * how every other small mechanism on this craft (spar, joints) is trimmed.
 */
export function buildTail(bodyMaterial: Material, trimMaterial: Material): TailParts {
  const group = new Group()
  const geometries: BufferGeometry[] = []

  const abdomenGeometry = buildAbdomenGeometry()
  geometries.push(abdomenGeometry)
  group.add(new Mesh(abdomenGeometry, bodyMaterial))

  // Vanes mount on the abdomen's OWN surface near the tip, so the mount
  // point must account for the same curve lift and taper applied above
  // rather than assume a straight, unmodulated cone.
  const vaneT = 0.8
  const vaneZ = TAIL_Z + vaneT * ABDOMEN_LENGTH
  const vaneParts = buildTailVanes(
    { x: 0, y: CURVE_LIFT * vaneT * vaneT, z: vaneZ, radius: abdomenRadiusAt(vaneT, vaneZ) },
    trimMaterial,
  )
  geometries.push(...vaneParts.geometries)
  group.add(vaneParts.group)

  return { group, geometries }
}
