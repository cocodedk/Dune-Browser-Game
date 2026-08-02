// vehicle-shop/harvester/src/model/belt.ts
// COMPONENT 7 — one belt BAND, with CURVED wraps around the sprockets
// (user finding: "the belt is not wrapped around the wheels. the belt
// itself looks square and angled"). A real track belt wraps its end
// sprockets — it is not a rectangle with a wheel behind it. Each sprocket
// now sits inside a half-cylinder of belt material whose outer surface
// carries the engagement lugs, and the sprocket teeth poke through it so
// the belt visibly loops around the wheel.
//
//   - thick bottom and top plates (the straight runs)
//   - a HALF-CYLINDER WRAP at each sprocket — the belt curving around it
//   - lugs on the wrap's outer face, sprocket teeth emerging through
//   - tread shoes on the bottom plate's outer edge

import { BoxGeometry, CylinderGeometry, Group, Mesh, type BufferGeometry, type MeshStandardMaterial } from 'three'
import { TRACK, BODY } from '../spec'
import { roundedBox } from './rounded'

export interface BeltPart {
  group: Group
  dispose(): void
}

/** Pods run the hull's own length, not the full footprint (which the forward
 *  cutter extends past). */
const POD_LENGTH = BODY.tailZ - BODY.noseZ
const BELT = TRACK.belt
const SHOE_SPACING = POD_LENGTH / TRACK.grouserCount
const SHOE_LENGTH = SHOE_SPACING * 0.85

const BOTTOM_THICK = 0.7
const TOP_THICK = 0.5

/** The CURVED wrap around each sprocket: a half-cylinder the sprocket sits
 *  inside, at a radius just larger than the sprocket itself so the teeth
 *  (at a slightly larger radius) emerge through the belt surface. */
const WRAP_RADIUS = 3.6
const WRAP_SEGMENTS = 24

/** Engagement lugs: on the wrap's outer face, at the same arc as the
 *  sprocket teeth so the teeth pass between them. */
const LUG_RADIUS = TRACK.sprocketRadius + 0.55
const LUG_START = (36 * Math.PI) / 180
const LUG_STEP = (36 * Math.PI) / 180
const LUG_COUNT = 4

/** One belt loop for one side. `side` 1 = starboard, -1 = port; the whole
 *  group is positioned at that side's track centreline. */
export function buildBelt(
  side: 1 | -1,
  beltMaterial: MeshStandardMaterial,
): BeltPart {
  const group = new Group()
  group.name = 'belt'
  group.position.x = side * TRACK.centreX
  const geometries: BufferGeometry[] = []

  const add = (geometry: BufferGeometry, x: number, y: number, z: number): void => {
    geometries.push(geometry)
    const mesh = new Mesh(geometry, beltMaterial)
    mesh.position.set(x, y, z)
    mesh.castShadow = true
    mesh.receiveShadow = true
    group.add(mesh)
  }

  // The straight runs: thick plates.
  add(roundedBox(BELT.width, BOTTOM_THICK, POD_LENGTH, 0.3), 0, BOTTOM_THICK / 2, 0)
  add(roundedBox(BELT.width, TOP_THICK, POD_LENGTH, 0.25), 0, BELT.height - TOP_THICK / 2, 0)

  const outerX = side * (BELT.width / 2)

  // A half-cylinder wrap at each sprocket: the belt curving around the wheel.
  // The half opens toward the machine centre (away from the hull end) so the
  // curved back faces outward — the belt wrapping the sprocket from the side.
  for (const sz of TRACK.sprocketZ) {
    const openToward = sz < 0 ? Math.PI : 0 // front opens +Z, rear opens -Z
    const wrap = new CylinderGeometry(WRAP_RADIUS, WRAP_RADIUS, BELT.width, WRAP_SEGMENTS, 1, true, openToward, Math.PI)
    geometries.push(wrap)
    const wrapMesh = new Mesh(wrap, beltMaterial)
    wrapMesh.rotation.z = Math.PI / 2 // axis from Y to X
    wrapMesh.position.set(0, BELT.height / 2, sz)
    wrapMesh.castShadow = true
    group.add(wrapMesh)

    // Lugs on the wrap's outer face — interleaved with the sprocket teeth.
    for (let t = 0; t < LUG_COUNT; t++) {
      const angle = LUG_START + t * LUG_STEP
      const lug = new BoxGeometry(0.6, 1.0, 0.8)
      geometries.push(lug)
      const lugMesh = new Mesh(lug, beltMaterial)
      lugMesh.position.set(
        outerX + side * 0.4,
        LUG_RADIUS * Math.sin(angle),
        sz + LUG_RADIUS * Math.cos(angle)
      )
      lugMesh.castShadow = true
      group.add(lugMesh)
    }
  }

  // Tread shoes on the bottom plate's outer edge — the segmented ground read.
  for (let i = 0; i < TRACK.grouserCount; i++) {
    const z = -POD_LENGTH / 2 + SHOE_SPACING * (i + 0.5)
    const shoe = new BoxGeometry(0.35, 1.0, SHOE_LENGTH)
    geometries.push(shoe)
    const shoeMesh = new Mesh(shoe, beltMaterial)
    shoeMesh.position.set(outerX + side * 0.2, 0.5, z)
    shoeMesh.castShadow = true
    group.add(shoeMesh)
  }

  return {
    group,
    dispose() {
      for (const g of geometries) g.dispose()
    },
  }
}
