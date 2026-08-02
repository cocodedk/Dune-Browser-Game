// vehicle-shop/harvester/src/model/tracks.ts
// COMPONENT 2 — the track assemblies, the machine's face. Each side is a
// real crawler running-gear unit, with NO overlapping wheels (user finding:
// the front and rear clusters collided):
//
//   - a TALL belt loop (7m) with short grouser teeth on its lower face
//   - two big TOOTHED end sprockets at z = +-20.5
//   - four road wheels evenly spaced z = -14..+14, radius 3.0 — the wheel
//     component (model/wheel.ts), one wheel built once and reused
//   - three return rollers IN the gaps between road wheels, top run
//   - an upper housing over it all, tucked under the deck
//
// Spacing is the point: sprocket edge (-17.3) clears the first road wheel
// edge (-17.0), and every gap between road wheels holds one roller. Every
// runner rolls from the crawler's signed track speeds at its own radius.

import { BoxGeometry, CylinderGeometry, Group, Mesh, type Object3D, type BufferGeometry, type MeshStandardMaterial } from 'three'
import { TRACK, BODY } from '../spec'
import { wheelAngularSpeed } from '../crawler/kinematics'
import { roundedBox } from './rounded'
import { buildWheel, type WheelPart } from './wheel'
import { buildBelt, type BeltPart } from './belt'

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
  group: Object3D
  side: 1 | -1
  radius: number
}

export function buildTracks(
  darkMaterial: MeshStandardMaterial,
  wheelMaterial: MeshStandardMaterial,
  accentMaterial: MeshStandardMaterial,
): Tracks {
  const group = new Group()
  group.name = 'tracks'
  const geometries: BufferGeometry[] = []
  const wheels: WheelPart[] = []
  const belts: BeltPart[] = []
  const runners: Runner[] = []

  for (const side of [1, -1] as const) {
    const x = side * TRACK.centreX

    // The belt loop — its own component, one per side.
    const belt = buildBelt(side, darkMaterial, wheelMaterial)
    group.add(belt.group)
    belts.push(belt)

    // Road wheels: the one wheel component, at each station.
    for (const wz of TRACK.roadWheelsZ) {
      const wheel = buildWheel(TRACK.roadWheelRadius, BELT.width + ROAD_WHEEL_OVER * 2, wheelMaterial, darkMaterial, accentMaterial)
      wheel.group.position.set(x, TRACK.roadWheelRadius, wz)
      group.add(wheel.group)
      wheels.push(wheel)
      runners.push({ group: wheel.group, side, radius: TRACK.roadWheelRadius })
    }

    // End sprockets, bigger than the road wheels, with a ring of teeth — the
    // belt visibly wraps these. Bespoke: they are the toothed ends, not the
    // plain wheel component.
    for (const sz of TRACK.sprocketZ) {
      const sprocket = new CylinderGeometry(TRACK.sprocketRadius, TRACK.sprocketRadius, BELT.width + SPROCKET_OVER * 2, 18)
      geometries.push(sprocket)
      const mesh = new Mesh(sprocket, wheelMaterial)
      mesh.name = 'wheel'
      mesh.rotation.z = Math.PI / 2
      mesh.position.set(x, TRACK.sprocketRadius, sz)
      mesh.castShadow = true
      group.add(mesh)
      const faceX = x + (side * (BELT.width + SPROCKET_OVER * 2)) / 2
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
      const sprocketRunner = { group: mesh, side, radius: TRACK.sprocketRadius }
      runners.push(sprocketRunner)
    }

    // Return rollers in the gaps between road wheels, top run — same wheel
    // component at the roller radius.
    for (const rz of TRACK.returnRollersZ) {
      const roller = buildWheel(TRACK.returnRollerRadius, BELT.width + ROLLER_OVER * 2, wheelMaterial, darkMaterial, accentMaterial)
      roller.group.position.set(x, BELT.height - TRACK.returnRollerRadius, rz)
      group.add(roller.group)
      wheels.push(roller)
      runners.push({ group: roller.group, side, radius: TRACK.returnRollerRadius })
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
      for (const { group: runner, side, radius } of runners) {
        const speed = side === 1 ? trackRight : trackLeft
        runner.rotation.x += wheelAngularSpeed(speed, radius) * dt
      }
    },
    dispose() {
      for (const g of geometries) g.dispose()
      for (const wheel of wheels) wheel.dispose()
      for (const belt of belts) belt.dispose()
    },
  }
}
