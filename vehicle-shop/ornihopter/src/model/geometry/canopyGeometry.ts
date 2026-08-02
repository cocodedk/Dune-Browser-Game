// vehicle-shop/ornihopter/src/model/geometry/canopyGeometry.ts
// The canopy as the kit builds it: a FLUSH GLAZED DECK. See canopyPlan.ts for
// the measurement and the placement; this file is the mesh alone.
//
// WHAT REPLACED WHAT. Round 1 built a single-sided SphereGeometry, invisible
// from inside. Rounds 2-5 built a tent — three cross-sections, each a
// left-sill -> ridge -> right-sill triangle, pillared and railed and glazed.
// It read from outside as "a short windshield box perched on the fore-deck
// like a truck cab", and measured, it was: 1.14m of ridge standing above a
// deck line at 2.7m aft. The kit's Canopy.stl is a 1.80mm plate. So the tent
// is gone, and what stands here now is what a plate looks like when it is
// installed: an outboard edge lying ON the deck, a chamfered rim rising 0.22m
// off it, and a recessed strip of glazing between the rims.
//
// Six longitudinal stations (canopyPlan.ts), five bays, every surface a flat
// quad, per-face vertices so nothing Gouraud-smooths across the chamfer — the
// same discipline hullLoft.ts's loftRingsFlat keeps for the hull.
//
// GLAZING STAYS TRANSPARENT, and that is load-bearing beyond looks: main.ts
// exempts see-through materials from the shadow map by testing
// `transparent === true && opacity < 0.95`, and an opaque canopy sealed the
// cabin in darkness the last time that check did not fire. The fore cap is
// glazed too — it is the one pane directly in the pilot's forward sightline
// (spec.ts PILOT_EYE looks down -Z toward it) and the round before this one
// put a windshield triangle in exactly that place for exactly that reason.

import {
  BoxGeometry, BufferGeometry, BufferAttribute, Group, Mesh, MeshStandardMaterial,
  DoubleSide, Vector3, type Material,
} from 'three'
import {
  CANOPY_Z, FRAMED_CANOPY_Z, CANOPY_RIM, CANOPY_RECESS, RIM_TOP_FRACTION, GLAZE_FRACTION,
  canopyHalfWidthAt, deckYAt,
} from './canopyPlan'

export {
  canopySectionAt, ridgeHeightAt, CANOPY_STATION_Z, CANOPY_SIDE_SILL_Y,
  type CanopySection,
} from './canopyPlan'

const FRAME_COLOR = 0x47443b
const GLASS_COLOR = 0x2c4550
/** Cross-section of the transverse rim ribs that break the glazing strip into
 *  panes — mullions, at the plate's own scribed panel lines. */
const RIB_THICKNESS = 0.13

/** Right-hand half of a station's section, outboard to inboard: the edge on
 *  the deck, the top of the chamfer, and the outboard lip of the recessed
 *  glazing. The left half is the same x negated. */
interface Rail {
  edge: Vector3
  rim: Vector3
  glaze: Vector3
}

function railAt(z: number, sign: 1 | -1): Rail {
  const halfWidth = canopyHalfWidthAt(z)
  const deck = deckYAt(z)
  return {
    edge: new Vector3(sign * halfWidth, deck, z),
    rim: new Vector3(sign * halfWidth * RIM_TOP_FRACTION, deck + CANOPY_RIM, z),
    glaze: new Vector3(sign * halfWidth * GLAZE_FRACTION, deck + CANOPY_RIM - CANOPY_RECESS, z),
  }
}

function facet(points: readonly Vector3[]): BufferGeometry {
  const array = new Float32Array(points.length * 3)
  points.forEach((p, i) => array.set([p.x, p.y, p.z], i * 3))
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(array, 3))
  geometry.computeVertexNormals()
  return geometry
}

/** Flat quad from four corners in perimeter order. DoubleSide on the glazing
 *  material handles the pilot's inside view of the same triangles; the frame
 *  is DoubleSide too because a 0.22m rim is thin enough to be seen edge-on
 *  from the pilot camera and a culled back face there is a hole. */
function quad(a: Vector3, b: Vector3, c: Vector3, d: Vector3): BufferGeometry {
  return facet([a, b, c, a, c, d])
}

/** The six-point closed section at one station, as a triangle fan about its
 *  own centre — the fore windscreen and the aft closure. */
function cap(z: number): BufferGeometry {
  const right = railAt(z, 1)
  const left = railAt(z, -1)
  const loop = [left.edge, left.rim, left.glaze, right.glaze, right.rim, right.edge]
  const centre = new Vector3(0, deckYAt(z) + CANOPY_RIM * 0.5, z)
  const points: Vector3[] = []
  for (let i = 0; i < loop.length - 1; i++) points.push(centre, loop[i], loop[i + 1])
  return facet(points)
}

export interface CanopyBuild {
  group: Group
  geometries: BufferGeometry[]
  materials: Material[]
}

export function buildCanopy(): CanopyBuild {
  const group = new Group()
  group.name = 'canopy'

  const frameMaterial = new MeshStandardMaterial({
    color: FRAME_COLOR, roughness: 0.55, metalness: 0.6, side: DoubleSide,
  })
  // Round 3's critic read opacity 0.38 with depthWrite OFF as "neither
  // occludes anything nor catches a visible highlight". depthWrite stays on,
  // and the low roughness that gives a tight highlight instead of a blob stays
  // too; opacity must also stay under 0.95 or main.ts starts casting an opaque
  // shadow through it (this file's header).
  //
  // OPACITY LOWERED, round 6b, 0.60 -> 0.34, and this is the one number in the
  // exterior the cockpit round touched. MEASURED from the pilot's eye with the
  // interior's own inner pane disabled, so the exterior glazing was the only
  // layer in the path: bare sky renders at 188/255 and sky through this glass
  // at 74-120, while the cabin wall beside the window renders at 117-125. The
  // canopy sits in the hull's own shadow (main.ts) so its lit contribution is
  // near zero, which makes the transmitted value almost exactly (1 - opacity)
  // x sky — at 0.60 that is 75, and a window darker than the wall next to it
  // is not a window. No interior change can lift it: the loss happens before
  // any cabin surface is involved. At 0.34 the same sightline lands near 124,
  // a step of about a third off bare sky, which is a tinted canopy rather than
  // a dark panel. The exterior captures were re-shot to confirm the canopy
  // still reads as glazing from outside — the liner behind it is opaque and
  // dark now (interior/canopyFrame.ts), which it was not when 0.6 was chosen.
  const glassMaterial = new MeshStandardMaterial({
    color: GLASS_COLOR, roughness: 0.22, metalness: 0.12,
    transparent: true, opacity: 0.34, side: DoubleSide, depthWrite: true,
  })
  const ribGeometry = new BoxGeometry(1, RIB_THICKNESS * 0.6, RIB_THICKNESS)
  const geometries: BufferGeometry[] = [ribGeometry]
  const materials: Material[] = [frameMaterial, glassMaterial]

  const add = (geometry: BufferGeometry, material: Material): void => {
    geometries.push(geometry)
    group.add(new Mesh(geometry, material))
  }

  for (let i = 0; i < CANOPY_Z.length - 1; i++) {
    const zA = CANOPY_Z[i]
    const zB = CANOPY_Z[i + 1]
    // The forward-most bay is the WINDSCREEN: it lies on the nose chamfer,
    // raked toward the pilot's own sightline, and it is the only part of the
    // panel a seated pilot looks THROUGH rather than up at. Glazed edge to
    // edge there, framed everywhere else. Without this the flush panel is all
    // frame at the one place the pilot camera can see it, and the cockpit
    // capture loses the tinted greenhouse read the tent canopy used to give.
    const chamfer = i === 0 ? glassMaterial : frameMaterial
    for (const sign of [1, -1] as const) {
      const a = railAt(zA, sign)
      const b = railAt(zB, sign)
      // The chamfer, rising inboard from the deck to the rim's crown, and the
      // rim's inner face dropping into the recess — the frame the glazing
      // sits in.
      add(quad(a.edge, b.edge, b.rim, a.rim), chamfer)
      add(quad(a.rim, b.rim, b.glaze, a.glaze), chamfer)
    }
    // The recessed glazing strip itself, one pane per bay.
    const aR = railAt(zA, 1)
    const aL = railAt(zA, -1)
    const bR = railAt(zB, 1)
    const bL = railAt(zB, -1)
    add(quad(aL.glaze, bL.glaze, bR.glaze, aR.glaze), glassMaterial)

    // A mullion on every interior FRAMED station, spanning the pane it
    // closes. Round 6f, user finding #2: skips the 1.2m-aft station, which
    // canopyPlan.ts's FRAMED_CANOPY_Z leaves out of this set because the
    // pilot's level sightline crosses the deck 43mm under a member there
    // (interior/canopyFrame.ts) — a rib on the OUTSIDE at that z would put
    // frame dead centre in the forward view even with the interior member
    // gone, so both layers share this one list.
    if (i > 0 && FRAMED_CANOPY_Z.includes(zA)) {
      const rib = new Mesh(ribGeometry, frameMaterial)
      rib.scale.set(canopyHalfWidthAt(zA) * GLAZE_FRACTION * 2, 1, 1)
      rib.position.set(0, deckYAt(zA) + CANOPY_RIM - CANOPY_RECESS * 0.5, zA)
      group.add(rib)
    }
  }

  add(cap(CANOPY_Z[0]), glassMaterial)
  add(cap(CANOPY_Z[CANOPY_Z.length - 1]), frameMaterial)

  return { group, geometries, materials }
}
