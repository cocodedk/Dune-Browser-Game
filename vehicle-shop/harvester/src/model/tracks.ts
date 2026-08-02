// vehicle-shop/harvester/src/model/tracks.ts
// COMPONENT 2 — the track assemblies, the machine's face. Each side is a
// real crawler running-gear unit:
//
//   - a TALL belt loop (7m) with SHORT GROUSER teeth on its lower outer
//     face — tread at the ground-contact line, NOT full-height cleats:
//     those read as a vertical fence and hid the wheels (user finding)
//   - two big TOOTHED end sprockets the belt wraps around
//   - six road wheels in the lower run, protruding WELL past the belt face
//     so the running gear is what the side view shows
//   - five small return rollers carrying the top run
//   - an upper housing over it all, tucked under the deck
//
// Every rotating part rolls from the crawler's signed track speeds
// (crawler/kinematics.ts wheelAngularSpeed, sign pinned by test). Left and
// right come from one loop with a mirrored X — they cannot disagree.

import { BoxGeometry, CylinderGeometry, Group, Mesh, type BufferGeometry, type MeshStandardMaterial } from 'three'
import { TRACK, BODY } from '../spec'
import { wheelAngularSpeed } from '../crawler/kinematics'
import { roundedBox } from './rounded'

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
const GROUSER_SPACING = POD_LENGTH / TRACK.grouserCount
const GROUSER_LENGTH = GROUSER_SPACING * 0.55
const TOOTH_COUNT = 5
/** Teeth on the UPPER arc only: a real belt covers the lower run, and teeth
 *  pointing at the ground would poke through it. */
const TOOTH_START = (18 * Math.PI) / 180
const TOOTH_STEP = (36 * Math.PI) / 180
const TOOTH_RADIUS = TRACK.sprocketRadius + 0.55

/** How far each runner protrudes past the belt's outer face — what makes
 *  the wheels visible from the side instead of hidden behind the belt. */
const ROAD_WHEEL_OVER = 1.1
const SPROCKET_OVER = 1.0
const ROLLER_OVER = 0.4

interface Runner {
  mesh: Mesh
  side: 1 | -1
  radius: number
}

export function buildTracks(darkMaterial: MeshStandardMaterial, wheelMaterial: MeshStandardMaterial): Tracks {
  const group = new Group()
  group.name = 'tracks'
  const geometries: BufferGeometry[] = []

  const runners: Runner[] = []

  for (const side of [1, -1] as const) {
    const x = side * TRACK.centreX

    // The belt loop: one tall dark band. The running gear lives inside it;
    // the wheels and sprockets protrude past both faces so they read from
    // the side. Edges rounded so the belt reads as a wrapped loop.
    const belt = roundedBox(BELT.width, BELT.height, POD_LENGTH, 0.6)
    geometries.push(belt)
    const beltMesh = new Mesh(belt, darkMaterial)
    beltMesh.position.set(x, BELT.height / 2, 0)
    beltMesh.castShadow = true
    beltMesh.receiveShadow = true
    group.add(beltMesh)

    // Grousers: short tread teeth on the belt's LOWER outer face only.
    for (let i = 0; i < TRACK.grouserCount; i++) {
      const grouser = new BoxGeometry(0.45, 1.4, GROUSER_LENGTH)
      geometries.push(grouser)
      const grouserMesh = new Mesh(grouser, wheelMaterial)
      grouserMesh.position.set(
        x + side * (BELT.width / 2 + 0.25),
        0.7,
        -POD_LENGTH / 2 + GROUSER_SPACING * (i + 0.5)
      )
      grouserMesh.castShadow = true
      group.add(grouserMesh)
    }

    // Road wheels in the lower run, standing on the ground line inside the
    // belt, protruding past the belt face.
    for (const wz of TRACK.roadWheelsZ) {
      const wheel = new CylinderGeometry(TRACK.roadWheelRadius, TRACK.roadWheelRadius, BELT.width + ROAD_WHEEL_OVER * 2, 16)
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
      const sprocket = new CylinderGeometry(TRACK.sprocketRadius, TRACK.sprocketRadius, BELT.width + SPROCKET_OVER * 2, 16)
      geometries.push(sprocket)
      const mesh = new Mesh(sprocket, wheelMaterial)
      mesh.name = 'wheel'
      mesh.rotation.z = Math.PI / 2
      mesh.position.set(x, TRACK.sprocketRadius, sz)
      mesh.castShadow = true
      group.add(mesh)
      runners.push({ mesh, side, radius: TRACK.sprocketRadius })
      const faceX = x + side * (BELT.width + SPROCKET_OVER * 2) / 2
      for (let t = 0; t < TOOTH_COUNT; t++) {
        const angle = TOOTH_START + t * TOOTH_STEP
        const tooth = new BoxGeometry(0.5, 0.9, 0.9)
        geometries.push(tooth)
        const toothMesh = new Mesh(tooth, darkMaterial)
        toothMesh.position.set(faceX, TOOTH_RADIUS * Math.sin(angle), sz + TOOTH_RADIUS * Math.cos(angle))
        toothMesh.rotation.x = angle
        toothMesh.castShadow = true
        group.add(toothMesh)
      }
    }

    // Return rollers carrying the belt's top run.
    for (const rz of TRACK.returnRollersZ) {
      const roller = new CylinderGeometry(TRACK.returnRollerRadius, TRACK.returnRollerRadius, BELT.width + ROLLER_OVER * 2, 10)
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
    // breaks so it is a machine, not a slab. Rounded like the hull.
    const housing = roundedBox(TRACK.housing.width, TRACK.housing.yHigh - TRACK.housing.yLow, POD_LENGTH, 0.9)
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
      const panel = new BoxGeometry(0.4, TRACK.housing.yHigh - TRACK.housing.yLow - 1.0, 0.3)
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
