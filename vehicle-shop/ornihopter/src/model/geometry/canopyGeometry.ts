// vehicle-shop/ornihopter/src/model/geometry/canopyGeometry.ts
// The wraparound canopy shell: three cross-sections (nose / shoulder / rear),
// each a left-sill -> ridge -> right-sill triangle, joined by pillar beams at
// each station and rail beams between stations, infilled with glazing panes.
// One shell, built once here and mounted once by Ornithopter.ts — seen
// correctly from OUTSIDE (an angular, faceted, multi-pane greenhouse, per
// .shots/reference/mr-O4copy.jpg and mr-O9copy.jpg) and from INSIDE (the
// pilot's eye sits inside this same volume, per spec.ts PILOT_EYE, and sees
// the same beams as mullions framing the glazing, per
// .shots/reference/thopter-03.jpg).
//
// Round-1's canopy was a single-sided SphereGeometry: plausible enough from
// outside, but invisible from inside. A camera positioned inside a shell
// looks at every triangle's back face — the vertex normal points away from
// the shell's centre, the same general direction as the view ray from a
// camera near that centre, so the shader reads it as the back of the
// triangle — and the default FrontSide material culls exactly that face.
// DoubleSide on the glazing here fixes it at the material, not by fighting
// winding order.

import {
  BoxGeometry, BufferGeometry, BufferAttribute, Group, Mesh, MeshStandardMaterial,
  DoubleSide, Vector3, type Material,
} from 'three'
import { COCKPIT, stationFromNose } from '../../spec'
import { hullHalfHeightAt } from './hullProfile'

const FRAME_COLOR = 0x47443b
const GLASS_COLOR = 0x25333a
const BEAM_THICKNESS = 0.07
const RIDGE_THICKNESS = 0.1

/** Where the canopy's side glazing starts — shared with
 *  interior/cabinShell.ts's liner wall so the opaque cabin wall and the
 *  canopy glass meet with no gap and no step between them. */
export const CANOPY_SIDE_SILL_Y = COCKPIT.floorY + COCKPIT.clearHeight * 0.42

interface Station {
  readonly z: number
  readonly halfWidth: number
  readonly baseY: number
  readonly peakY: number
}

// peakY is hullHalfHeightAt(z) times a proud-ness factor, NOT a COCKPIT
// interior number. Measured miss, first pass: peakY was authored from
// COCKPIT.clearHeight (interior headroom) and landed at 0.8 / 1.55 / 1.2 —
// all BELOW hullHalfHeightAt at their own stations (1.72 / 2.15 / 2.15). The
// whole ridge sat inside the hull's own opaque ellipse and vanished from
// every outside view (hero.png, side.png). The interior clearance and the
// hull's own exterior surface are different numbers; the ridge has to clear
// the second one, or there is nothing to see from outside.
const noseZ = stationFromNose(1.1)
const shoulderZ = stationFromNose(2.7)
const rearZ = stationFromNose(4.9)

const NOSE: Station = { z: noseZ, halfWidth: 0.7, baseY: -0.95, peakY: hullHalfHeightAt(noseZ) * 1.05 }
const SHOULDER: Station = {
  z: shoulderZ, halfWidth: 2.5, baseY: CANOPY_SIDE_SILL_Y, peakY: hullHalfHeightAt(shoulderZ) * 1.55,
}
const REAR: Station = {
  z: rearZ, halfWidth: 2.15, baseY: CANOPY_SIDE_SILL_Y, peakY: hullHalfHeightAt(rearZ) * 1.35,
}
const STATIONS: readonly Station[] = [NOSE, SHOULDER, REAR]

/**
 * Ridge (roof spine) height at a craft-local z, so interior/layout.ts can
 * mount the overhead panel to the real frame instead of into open air.
 * Clamped to the NOSE..REAR span this structure actually occupies.
 */
export function ridgeHeightAt(z: number): number {
  const [a, b] = z <= SHOULDER.z ? [NOSE, SHOULDER] : [SHOULDER, REAR]
  const t = Math.min(1, Math.max(0, (z - a.z) / (b.z - a.z)))
  return a.peakY + t * (b.peakY - a.peakY)
}

const baseLeft = (s: Station): Vector3 => new Vector3(-s.halfWidth, s.baseY, s.z)
const baseRight = (s: Station): Vector3 => new Vector3(s.halfWidth, s.baseY, s.z)
const ridgePt = (s: Station): Vector3 => new Vector3(0, s.peakY, s.z)
const UP = new Vector3(0, 1, 0)

/** A structural beam between two points, sharing one unit box geometry that
 *  is scaled and oriented per instance — every mullion is the same stock. */
function beam(a: Vector3, b: Vector3, geometry: BoxGeometry, material: Material): Mesh {
  const mesh = new Mesh(geometry, material)
  mesh.position.copy(a).add(b).multiplyScalar(0.5)
  const dir = b.clone().sub(a)
  mesh.scale.set(1, dir.length(), 1)
  mesh.quaternion.setFromUnitVectors(UP, dir.normalize())
  return mesh
}

function facet(points: readonly Vector3[]): BufferGeometry {
  const array = new Float32Array(points.length * 3)
  points.forEach((p, i) => array.set([p.x, p.y, p.z], i * 3))
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(array, 3))
  geometry.computeVertexNormals()
  return geometry
}

/** Flat quad from four corners given in perimeter order; DoubleSide on the
 *  glazing material handles the pilot's inside view of the same triangles. */
function quad(a: Vector3, b: Vector3, c: Vector3, d: Vector3): BufferGeometry {
  return facet([a, b, c, a, c, d])
}

/** Flat triangle — the nose cap, the one pane the pilot looks straight
 *  through rather than to the side of. */
function tri(a: Vector3, b: Vector3, c: Vector3): BufferGeometry {
  return facet([a, b, c])
}

export interface CanopyBuild {
  group: Group
  geometries: BufferGeometry[]
  materials: Material[]
}

export function buildCanopy(): CanopyBuild {
  const group = new Group()
  group.name = 'canopy'

  const frameMaterial = new MeshStandardMaterial({ color: FRAME_COLOR, roughness: 0.55, metalness: 0.6 })
  const glassMaterial = new MeshStandardMaterial({
    color: GLASS_COLOR, roughness: 0.15, metalness: 0.25,
    transparent: true, opacity: 0.38, side: DoubleSide, depthWrite: false,
  })
  const beamGeometry = new BoxGeometry(BEAM_THICKNESS, 1, BEAM_THICKNESS)
  const ridgeGeometry = new BoxGeometry(RIDGE_THICKNESS, 1, RIDGE_THICKNESS)
  const geometries: BufferGeometry[] = [beamGeometry, ridgeGeometry]
  const materials: Material[] = [frameMaterial, glassMaterial]

  // Pillars: left-to-ridge and ridge-to-right at every station — the
  // mullions rising from the sill and meeting overhead.
  for (const s of STATIONS) {
    group.add(beam(baseLeft(s), ridgePt(s), beamGeometry, frameMaterial))
    group.add(beam(ridgePt(s), baseRight(s), beamGeometry, frameMaterial))
  }

  // Rails and glazing, one bay per pair of adjacent stations.
  for (let i = 0; i < STATIONS.length - 1; i++) {
    const a = STATIONS[i]
    const b = STATIONS[i + 1]
    group.add(beam(baseLeft(a), baseLeft(b), beamGeometry, frameMaterial))
    group.add(beam(baseRight(a), baseRight(b), beamGeometry, frameMaterial))
    group.add(beam(ridgePt(a), ridgePt(b), ridgeGeometry, frameMaterial))

    const left = quad(baseLeft(a), baseLeft(b), ridgePt(b), ridgePt(a))
    const right = quad(ridgePt(a), ridgePt(b), baseRight(b), baseRight(a))
    geometries.push(left, right)
    group.add(new Mesh(left, glassMaterial), new Mesh(right, glassMaterial))
  }

  // Windshield: the nose ring is otherwise an open hoop, and it is the one
  // pane directly in the pilot's forward sightline (spec.ts PILOT_EYE sits
  // aft of it, looking toward it down -Z) rather than off to a side.
  const windshield = tri(baseLeft(NOSE), ridgePt(NOSE), baseRight(NOSE))
  geometries.push(windshield)
  group.add(new Mesh(windshield, glassMaterial))

  return { group, geometries, materials }
}
