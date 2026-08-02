// vehicle-shop/harvester/src/model/tracks.ts
// COMPONENT 2 — the track assemblies, the machine's face ("concentrate
// around the tractors and the track around them"). Each side is a real
// crawler running-gear unit:
//
//   - a TALL belt loop (7m) with full-height transverse cleats on its outer
//     face — the segmented belt read, not a slab
//   - two big TOOTHED end sprockets the belt wraps around
//   - six road wheels in the lower run
//   - five small return rollers carrying the top run
//   - an upper housing over it all, tucked under the deck
//
// Every rotating part rolls from the crawler's signed track speeds
// (crawler/kinematics.ts wheelAngularSpeed, sign pinned by test), so the
// whole assembly visibly drives itself. Left and right come from one loop
// with a mirrored X — they cannot disagree.

import { BoxGeometry, CylinderGeometry, Group, Mesh, type MeshStandardMaterial } from 'three'
import { TRACK, BODY } from '../spec'
import { wheelAngularSpeed } from '../crawler/kinematics'

export interface Tracks {
  group: Group
  /** Advance the running gear from the crawler's signed track speeds. */
  update(trackLeft: number, trackRight: number, dt: number): void
  dispose(): void
}

/** Pods run the hull's own length, not the full footprint (which the forward
 *  cutter extends past). */
const POD_LENGTH = BODY.tailZ - BODY.noseZ
const BELT = TRACK.belt
const CLEAT_SPACING = POD_LENGTH / TRACK.cleatCount
const CLEAT_LENGTH = CLEAT_SPACING * 0.64
const TOOTH_COUNT = 5
/** Teeth on the UPPER arc only: a real belt covers the lower run, and teeth
 *  pointing at the ground would poke through it (they did — the component
 *  test caught the track footprint dipping to y = -4.2). */
const TOOTH_START = (18 * Math.PI) / 180
const TOOTH_STEP = (36 * Math.PI) / 180
const TOOTH_RADIUS = TRACK.sprocketRadius + 0.55

interface Runner {
  mesh: Mesh
  side: 1 | -1
  radius: number
}

export function buildTracks(darkMaterial: MeshStandardMaterial, wheelMaterial: MeshStandardMaterial): Tracks {
  const group = new Group()
  group.name = 'tracks'
  const geometries: (BoxGeometry | CylinderGeometry)[] = []

  const runners: Runner[] = []

  for (const side of [1, -1] as const) {
    const x = side * TRACK.centreX

    // The belt loop: one tall dark band. The running gear lives inside it;
    // the wheels and sprockets protrude past both faces so they read from
    // the side, and the cleats segment the outer face.
    const belt = new BoxGeometry(BELT.width, BELT.height, POD_LENGTH)
    geometries.push(belt)
    const beltMesh = new Mesh(belt, darkMaterial)
    beltMesh.position.set(x, BELT.height / 2, 0)
    beltMesh.castShadow = true
    beltMesh.receiveShadow = true
    group.add(beltMesh)

    for (let i = 0; i < TRACK.cleatCount; i++) {
      const cleat = new BoxGeometry(0.5, BELT.height + 0.1, CLEAT_LENGTH)
      geometries.push(cleat)
      const cleatMesh = new Mesh(cleat, wheelMaterial)
      cleatMesh.position.set(x + side * (BELT.width / 2 + 0.25), BELT.height / 2, -POD_LENGTH / 2 + CLEAT_SPACING * (i + 0.5))
      cleatMesh.castShadow = true
      group.add(cleatMesh)
    }

    // Road wheels in the lower run, standing on the ground line inside the
    // belt, proud of both faces.
    for (const wz of TRACK.roadWheelsZ) {
      const wheel = new CylinderGeometry(TRACK.roadWheelRadius, TRACK.roadWheelRadius, BELT.width + 1.0, 16)
      geometries.push(wheel)
      const mesh = new Mesh(wheel, wheelMaterial)
      mesh.name = 'wheel'
      mesh.rotation.z = Math.PI / 2
      mesh.position.set(x, TRACK.roadWheelRadius, wz)
      mesh.castShadow = true
      group.add(mesh)
      runners.push({ mesh, side, radius: TRACK.roadWheelRadius })
    }

    // End sprockets, bigger than the road wheels, with a ring of teeth — the
    // belt visibly wraps these.
    for (const sz of TRACK.sprocketZ) {
      const sprocket = new CylinderGeometry(TRACK.sprocketRadius, TRACK.sprocketRadius, BELT.width + 1.2, 16)
      geometries.push(sprocket)
      const mesh = new Mesh(sprocket, wheelMaterial)
      mesh.name = 'wheel'
      mesh.rotation.z = Math.PI / 2
      mesh.position.set(x, TRACK.sprocketRadius, sz)
      mesh.castShadow = true
      group.add(mesh)
      runners.push({ mesh, side, radius: TRACK.sprocketRadius })
      for (let t = 0; t < TOOTH_COUNT; t++) {
        const angle = TOOTH_START + t * TOOTH_STEP
        const tooth = new BoxGeometry(0.7, 0.9, 0.9)
        geometries.push(tooth)
        const toothMesh = new Mesh(tooth, darkMaterial)
        toothMesh.position.set(x + side * 0.1, TOOTH_RADIUS * Math.sin(angle), sz + TOOTH_RADIUS * Math.cos(angle))
        toothMesh.rotation.x = angle
        toothMesh.castShadow = true
        group.add(toothMesh)
      }
    }

    // Return rollers carrying the belt's top run.
    for (const rz of TRACK.returnRollersZ) {
      const roller = new CylinderGeometry(TRACK.returnRollerRadius, TRACK.returnRollerRadius, BELT.width + 0.4, 10)
      geometries.push(roller)
      const mesh = new Mesh(roller, wheelMaterial)
      mesh.name = 'wheel'
      mesh.rotation.z = Math.PI / 2
      mesh.position.set(x, BELT.height - TRACK.returnRollerRadius, rz)
      mesh.castShadow = true
      group.add(mesh)
      runners.push({ mesh, side, radius: TRACK.returnRollerRadius })
    }

    // Upper housing over the running gear, with a cap trim and two panel
    // breaks so it is a machine, not a slab.
    const housing = new BoxGeometry(TRACK.housing.width, TRACK.housing.yHigh - TRACK.housing.yLow, POD_LENGTH)
    geometries.push(housing)
    const housingMesh = new Mesh(housing, darkMaterial)
    housingMesh.position.set(x, (TRACK.housing.yLow + TRACK.housing.yHigh) / 2, 0)
    housingMesh.castShadow = true
    housingMesh.receiveShadow = true
    group.add(housingMesh)
    const cap = new BoxGeometry(TRACK.housing.width + 0.5, 0.5, POD_LENGTH)
    geometries.push(cap)
    const capMesh = new Mesh(cap, wheelMaterial)
    capMesh.position.set(x, TRACK.housing.yHigh - 0.25, 0)
    capMesh.castShadow = true
    group.add(capMesh)
    for (const pz of [-6, 6] as const) {
      const panel = new BoxGeometry(0.4, TRACK.housing.yHigh - TRACK.housing.yLow - 1.0, 0.3,)
      geometries.push(panel)
      const panelMesh = new Mesh(panel, wheelMaterial)
      panelMesh.position.set(x, (TRACK.housing.yLow + TRACK.housing.yHigh) / 2, pz)
      panelMesh.castShadow = true
      group.add(panelMesh)
    }
  }

  return {
    group,
    update(trackLeft, trackRight, dt) {
      for (const { mesh, side, radius } of runners) {
        const speed = side === 1 ? trackRight : trackLeft
        mesh.rotation.x += wheelAngularSpeed(speed, radius) * dt
      }
    },
    dispose() {
      for (const g of geometries) g.dispose()
    },
  }
}
