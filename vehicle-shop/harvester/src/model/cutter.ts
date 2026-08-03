// vehicle-shop/harvester/src/model/cutter.ts
// COMPONENT 3 — the forward cutter, the film's signature and the machine's
// MOUTH. Round I3 rebuilt it around a working cutting head:
//
//   - an 8 m grinder head (spec BOOM.headHeight) filling the front, held
//     clear of the sand by a short deep boom
//   - a DRUM across its face (spec BOOM.drumRadius), seven twisted rings of
//     picks and two helical flights, turning the FEEDING way at a rate
//     proportional to the crawl — see THE FEEDING SIGN in ./cutterDetail
//   - a fixed row of seven lip teeth under the head's throat, behind the
//     drum's sweep, raking at the bed
//   - a truss conveyor from the throat up to the feed hopper, replacing the
//     plain dark pipe
//   - angled flank fairings and rib gussets on the boom, so it reads as a
//     structural member rather than a stick with rails
//   - two hydraulic rams from brackets at the nose face down onto the boom
//
// Round 5's ruling still holds and is still tested: the teeth scrape within
// half a metre of the sand — a dozer blade, not a mid-air boom.

import { CylinderGeometry, Group, Mesh, type BufferGeometry, type MeshStandardMaterial } from 'three'
import { box, rbox } from './hullDetail'
import { roundedBox } from './rounded'
import { ARM, HEAD, DRUM, CONVEYOR, buildDrum, drumAngularSpeed } from './cutterDetail'

export interface CutterParts {
  group: Group
  /** Spin the drum from the crawler's signed track speeds. */
  update(trackLeft: number, trackRight: number, dt: number): void
  dispose(): void
}

/** Ram anchor and its foot on the boom, per side. The anchor sits at the TOP
 *  of the nose housing's forward tier (hull.ts builds that tier to y = 8, and
 *  is another round's file — the rams reach it, they do not modify it), which
 *  is both the plausible pivot for a raise/lower mechanism and the height
 *  that keeps the ram clear of the boom's own flank fairing: a first pass
 *  anchored at y = 7.2 and the cylinders disappeared behind the fairing in
 *  every 3/4 view. */
const RAM_TOP = { y: 8.2, z: -24.2 }
const RAM_FOOT = { y: ARM.top + 0.1, z: -29.0 }
const RAM_X = 5.5

export function buildCutter(
  darkMaterial: MeshStandardMaterial,
  accentMaterial: MeshStandardMaterial,
): CutterParts {
  const group = new Group()
  group.name = 'cutter'
  const geometries: BufferGeometry[] = []

  const b = (w: number, h: number, d: number, mat: MeshStandardMaterial, x: number, y: number, z: number, name = ''): void =>
    box(geometries, group, w, h, d, mat, x, y, z, name)
  const rb = (w: number, h: number, d: number, r: number, mat: MeshStandardMaterial, x: number, y: number, z: number, name = ''): void =>
    rbox(geometries, group, w, h, d, r, mat, x, y, z, name)
  /** A rounded plate handed BACK so the caller can cant it — the fairings
   *  and the drum shroud are the only cutter parts that are not axis-aligned. */
  const plate = (w: number, h: number, d: number, r: number, mat: MeshStandardMaterial, name: string): Mesh => {
    const g = roundedBox(w, h, d, r)
    geometries.push(g)
    const mesh = new Mesh(g, mat)
    mesh.name = name
    mesh.castShadow = true
    mesh.receiveShadow = true
    group.add(mesh)
    return mesh
  }
  const cyl = (r: number, h: number, seg: number, mat: MeshStandardMaterial, x: number, y: number, z: number, rotX = 0, name = ''): Mesh => {
    const g = new CylinderGeometry(r, r, h, seg)
    geometries.push(g)
    const mesh = new Mesh(g, mat)
    mesh.name = name
    mesh.position.set(x, y, z)
    mesh.rotation.x = rotX
    mesh.castShadow = true
    mesh.receiveShadow = true
    group.add(mesh)
    return mesh
  }

  // ---- the boom, and the fairings that make it structural ----------------
  const armLen = ARM.aftZ - ARM.foreZ
  const armZ = (ARM.aftZ + ARM.foreZ) / 2
  rb(ARM.halfWidth * 2, ARM.height, armLen, 0.6, accentMaterial, 0, ARM.y, armZ, 'cutterArm')
  for (const side of [1, -1] as const) {
    const flankX = side * (ARM.halfWidth + 0.05)
    // Flank plate and top chamfer, both canted so the boom's section reads
    // as a faceted beam. rotation.z = side*a leans the plate's top INBOARD
    // on either flank (+Y maps to (-sin a, cos a), mirrored by the side).
    const flank = plate(0.35, 4.4, armLen - 0.8, 0.15, darkMaterial, 'cutterFairing')
    flank.position.set(flankX, ARM.y, armZ)
    flank.rotation.z = side * 0.2
    const chamfer = plate(0.35, 1.7, armLen - 0.8, 0.15, darkMaterial, 'cutterFairing')
    chamfer.position.set(side * (ARM.halfWidth - 0.55), ARM.y + ARM.height / 2 + 0.15, armZ)
    chamfer.rotation.z = side * 0.95
    for (const rz of [ARM.aftZ - 1.2, ARM.foreZ + 1.6] as const) {
      b(0.7, ARM.height + 0.5, 0.7, darkMaterial, side * (ARM.halfWidth + 0.25), ARM.y, rz, 'cutterRib')
    }
  }

  // ---- the head: 8 m of grinder filling the front ------------------------
  const headZ = HEAD.frontZ + HEAD.depth / 2
  const headY = HEAD.bottomY + HEAD.height / 2
  rb(HEAD.halfWidth * 2, HEAD.height, HEAD.depth, 0.8, darkMaterial, 0, headY, headZ, 'cutterHead')
  b(HEAD.halfWidth * 2 + 0.4, 0.4, HEAD.depth + 0.2, accentMaterial, 0, headY + HEAD.height / 2 + 0.1, headZ, 'cutterHeadTrim')
  b(HEAD.halfWidth * 2 - 5, 2.4, 0.5, darkMaterial, 0, DRUM.axisY + 0.9, HEAD.frontZ + 0.2, 'cutterThroat')
  for (const side of [1, -1] as const) {
    for (const rz of [headZ - 1.2, headZ + 1.2] as const) {
      b(0.5, HEAD.height - 1.6, 0.7, accentMaterial, side * (HEAD.halfWidth + 0.05), headY, rz, 'cutterHeadRib')
    }
    // Cheek plates carrying the drum's ends, from the head's face forward.
    rb(0.7, 4.4, 4.2, 0.3, darkMaterial, side * 8.75, 3.05, DRUM.axisZ + 0.3, 'cutterCheek')
  }
  // Shroud over the drum, canted down toward the sand at its leading edge.
  const shroud = plate(16.8, 0.7, 4.4, 0.25, accentMaterial, 'cutterShroud')
  shroud.position.set(0, 5.7, DRUM.axisZ + 0.35)
  shroud.rotation.x = -0.18

  // ---- the drum, and the fixed lip teeth behind its sweep -----------------
  const drum = buildDrum(darkMaterial, accentMaterial)
  group.add(drum.group)
  for (const tx of DRUM.stations) {
    b(1.9, 1.9, 2.6, accentMaterial, tx, 1.25, HEAD.frontZ + 1.3, 'cutterTooth')
  }

  // ---- hydraulic rams: nose bracket down onto the boom --------------------
  const dy = RAM_FOOT.y - RAM_TOP.y
  const dz = RAM_FOOT.z - RAM_TOP.z
  const ramLen = Math.hypot(dy, dz)
  // rotation.x = t sends the cylinder's own +Y axis to (0, cos t, sin t), so
  // atan2 of the ram's own direction is the angle that lays it along itself.
  const ramRot = Math.atan2(dz, dy)
  const at = (f: number): [number, number] => [RAM_TOP.y + dy * f, RAM_TOP.z + dz * f]
  for (const side of [1, -1] as const) {
    const [barrelY, barrelZ] = at(0.32)
    const [rodY, rodZ] = at(0.72)
    cyl(0.55, ramLen * 0.64, 10, darkMaterial, side * RAM_X, barrelY, barrelZ, ramRot, 'cutterRam')
    cyl(0.3, ramLen * 0.56, 8, accentMaterial, side * RAM_X, rodY, rodZ, ramRot, 'cutterRamRod')
    b(1.1, 1.0, 1.0, darkMaterial, side * RAM_X, RAM_TOP.y, RAM_TOP.z, 'cutterRamAnchor')
    b(1.0, 0.9, 0.9, darkMaterial, side * RAM_X, RAM_FOOT.y, RAM_FOOT.z, 'cutterRamFoot')
  }

  // ---- feed hopper, and the conveyor that fills it ------------------------
  const hopper = new CylinderGeometry(3.0, 5.2, 6.0, 6)
  geometries.push(hopper)
  const hopperMesh = new Mesh(hopper, accentMaterial)
  hopperMesh.name = 'cutterHopper'
  hopperMesh.position.set(0, 11.0, -19.5)
  hopperMesh.castShadow = true
  hopperMesh.receiveShadow = true
  group.add(hopperMesh)

  // Truss conveyor from the head's throat up to the hopper's flank, in the
  // deck conveyor's language (machinery.ts): a sloped slab with a rubber
  // strip on its carrying face, an end drum at each end with its axis along
  // X, and two truss-leg pairs standing on the boom. rotation.x = tilt is
  // NEGATIVE here, which raises the AFT end — the same sign machinery.ts
  // uses, so the machine's two conveyors cannot end up disagreeing.
  const cvDy = CONVEYOR.highY - CONVEYOR.lowY
  const cvDz = CONVEYOR.highZ - CONVEYOR.lowZ
  const cvY = (CONVEYOR.lowY + CONVEYOR.highY) / 2
  const cvZ = (CONVEYOR.lowZ + CONVEYOR.highZ) / 2
  const tilt = -Math.atan2(cvDy, cvDz)
  const beltMesh = plate(CONVEYOR.width, 0.7, Math.hypot(cvDy, cvDz), 0.25, accentMaterial, 'conveyorBelt')
  beltMesh.position.set(0, cvY, cvZ)
  beltMesh.rotation.x = tilt
  // 0.42 is along the BELT's own up, which the tilt has rotated with it.
  const strip = plate(CONVEYOR.width - 0.8, 0.16, Math.hypot(cvDy, cvDz) - 0.9, 0.06, darkMaterial, 'conveyorStrip')
  strip.position.set(0, cvY + 0.42 * Math.cos(tilt), cvZ + 0.42 * Math.sin(tilt))
  strip.rotation.x = tilt
  for (const [ey, ez] of [[CONVEYOR.lowY, CONVEYOR.lowZ], [CONVEYOR.highY, CONVEYOR.highZ]] as const) {
    cyl(CONVEYOR.drumRadius, CONVEYOR.width + 0.4, 12, darkMaterial, 0, ey, ez, 0, 'conveyorDrum').rotation.z = Math.PI / 2
  }
  for (const lz of CONVEYOR.legZ) {
    const legH = CONVEYOR.lowY + ((lz - CONVEYOR.lowZ) * cvDy) / cvDz - 0.4 - ARM.top
    for (const side of [1, -1] as const) {
      b(0.45, legH, 0.45, darkMaterial, side * 1.5, ARM.top + legH / 2, lz, 'conveyorLeg')
    }
  }

  return {
    group,
    update(trackLeft, trackRight, dt) {
      drum.group.rotation.x += drumAngularSpeed(trackLeft, trackRight) * dt
    },
    dispose() {
      for (const g of geometries) g.dispose()
      drum.dispose()
    },
  }
}
