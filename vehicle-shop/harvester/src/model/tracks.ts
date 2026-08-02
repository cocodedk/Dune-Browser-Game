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
import { WRAP_RADIUS, TOP_RUN_Y, BELT_THICKNESS } from './beltPhase'

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
/** Five teeth, 36 degrees apart — the belt puts a lug every 36 degrees too,
 *  starting half a pitch away, so teeth fall between lugs. Both turn at the
 *  same rate (see the sprocket runner below), so they stay meshed. */
const TOOTH_START = 0
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
  beltMaterial: MeshStandardMaterial,
): Tracks {
  const group = new Group()
  group.name = 'tracks'
  const geometries: BufferGeometry[] = []
  const wheels: WheelPart[] = []
  const belts: Array<{ part: BeltPart; side: 1 | -1 }> = []
  const runners: Runner[] = []

  for (const side of [1, -1] as const) {
    const x = side * TRACK.centreX

    // The belt loop — its own component, one per side, RED.
    const belt = buildBelt(side, beltMaterial)
    group.add(belt.group)
    belts.push({ part: belt, side })

    // Road wheels: the one wheel component, at each station. The belt is
    // the medium between wheel and ground, so the centre is the bottom
    // plate plus the radius.
    const roadY = TRACK.sprocketY - TRACK.sprocketRadius + TRACK.roadWheelRadius
    for (const wz of TRACK.roadWheelsZ) {
      const wheel = buildWheel(TRACK.roadWheelRadius, BELT.width + ROAD_WHEEL_OVER * 2, wheelMaterial, darkMaterial, accentMaterial)
      wheel.group.position.set(x, roadY, wz)
      group.add(wheel.group)
      wheels.push(wheel)
      runners.push({ group: wheel.group, side, radius: TRACK.roadWheelRadius })
    }

    // End sprockets, bigger than the road wheels, with a ring of teeth — the
    // belt visibly wraps these and the teeth ENGAGE the belt's lugs (built
    // in belt.ts at the same arc, interleaved). The sprocket is a GROUP at
    // the axle holding the cylinder plus its teeth, so the update loop rolls
    // the whole toothed wheel.
    for (const sz of TRACK.sprocketZ) {
      const sprocketGroup = new Group()
      sprocketGroup.name = 'wheel'
      sprocketGroup.position.set(x, TRACK.sprocketY, sz)
      const sprocket = new CylinderGeometry(TRACK.sprocketRadius, TRACK.sprocketRadius, BELT.width + SPROCKET_OVER * 2, 18)
      geometries.push(sprocket)
      const mesh = new Mesh(sprocket, wheelMaterial)
      mesh.rotation.z = Math.PI / 2
      mesh.castShadow = true
      sprocketGroup.add(mesh)
      // Teeth span from just inside the belt's outer face to past the
      // sprocket face, so they pass THROUGH the belt and meet its lugs. The
      // X station follows the pod's side — built unsigned, the port pod's
      // teeth faced the hull and were invisible from outside.
      const toothLocalX = side * (BELT.width / 2 + 0.55)
      for (let t = 0; t < TOOTH_COUNT; t++) {
        const angle = TOOTH_START + t * TOOTH_STEP
        const tooth = new BoxGeometry(1.5, 0.9, 0.9)
        geometries.push(tooth)
        const toothMesh = new Mesh(tooth, darkMaterial)
        toothMesh.position.set(toothLocalX, TOOTH_RADIUS * Math.sin(angle), TOOTH_RADIUS * Math.cos(angle))
        toothMesh.rotation.x = angle
        toothMesh.castShadow = true
        sprocketGroup.add(toothMesh)
      }
      group.add(sprocketGroup)
      // The sprocket turns at the radius of the BELT it carries, not at its
      // own rim: that is the radius the belt's centreline orbits, so teeth
      // and lugs advance by the same angle every frame and never slip.
      runners.push({ group: sprocketGroup, side, radius: WRAP_RADIUS })
    }

    // Return rollers in the gaps between road wheels, top run — same wheel
    // component at the roller radius. They CARRY the top run: the roller's
    // crown meets the belt's under-face, the mirror of the road wheels
    // standing on the bottom run.
    const topRunUnder = TOP_RUN_Y - BELT_THICKNESS / 2
    for (const rz of TRACK.returnRollersZ) {
      const roller = buildWheel(TRACK.returnRollerRadius, BELT.width + ROLLER_OVER * 2, wheelMaterial, darkMaterial, accentMaterial)
      roller.group.position.set(x, topRunUnder - TRACK.returnRollerRadius, rz)
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
      // +X is starboard, so side 1 is the starboard band.
      for (const { part, side } of belts) {
        part.update(side === 1 ? trackRight : trackLeft, dt)
      }
    },
    dispose() {
      for (const g of geometries) g.dispose()
      for (const wheel of wheels) wheel.dispose()
      for (const { part } of belts) part.dispose()
    },
  }
}
