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

import { BoxGeometry, Group, Mesh, type Object3D, type BufferGeometry, type MeshStandardMaterial } from 'three'
import { TRACK, BODY } from '../spec'
import { wheelAngularSpeed } from '../crawler/kinematics'
import { roundedBox } from './rounded'
import { buildWheel, type WheelPart } from './wheel'
import { buildBelt, type BeltPart } from './belt'
import { buildSprocket, type SprocketPart } from './sprocket'
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

/** How far each runner protrudes past the belt band — what makes the wheels
 *  visible from the side instead of hidden behind the belt. The rollers stay
 *  NARROWER than the belt's plates: they carry the top run from underneath,
 *  and their support brackets (below) are what makes that read. */
const ROAD_WHEEL_OVER = 1.1
const ROLLER_OVER = 0.5

interface Runner {
  group: Object3D
  side: 1 | -1
  radius: number
}

/** I6 material wiring, no geometry. `beltMaterial` now also takes a LIST —
 *  belt.ts deals it round-robin across the chain, which is how the belt gets
 *  per-link wear despite the links cycling (see materials/palette.ts).
 *  `tireMaterial` splits the wheels' own tone away from the general steel:
 *  the tire carries a dirt ring at its CONTACT radius (materials/maps.ts),
 *  and that map must not land on the housing caps and sprocket drums the
 *  wheel tone also serves. Defaults to wheelMaterial. */
export function buildTracks(
  darkMaterial: MeshStandardMaterial,
  wheelMaterial: MeshStandardMaterial,
  accentMaterial: MeshStandardMaterial,
  beltMaterial: MeshStandardMaterial | readonly MeshStandardMaterial[],
  tireMaterial: MeshStandardMaterial = wheelMaterial,
): Tracks {
  const group = new Group()
  group.name = 'tracks'
  const geometries: BufferGeometry[] = []
  const wheels: WheelPart[] = []
  const belts: Array<{ part: BeltPart; side: 1 | -1 }> = []
  const sprockets: SprocketPart[] = []
  const runners: Runner[] = []

  for (const side of [1, -1] as const) {
    const x = side * TRACK.centreX

    // The belt loop — its own component, one per side, RED.
    const belt = buildBelt(side, beltMaterial, darkMaterial)
    group.add(belt.group)
    belts.push({ part: belt, side })

    // Road wheels: the one wheel component, at each station. The belt is
    // the medium between wheel and ground, so the centre is the bottom
    // plate plus the radius. The FACE DISC takes bare steel (I6, and what
    // wheel.ts always called it) rather than the mapped rust: a cylinder's
    // cap UV is the disc inscribed in the unit square, so a plate map's
    // border and scribed line render as a SQUARE frame on a round wheel —
    // measured in the I6 first-pass capture, unmistakable at the tracks
    // close-up. Every big cap on this machine — these discs and the sprocket
    // drums — is on the one material deliberately left unmapped.
    const roadY = TRACK.sprocketY - TRACK.sprocketRadius + TRACK.roadWheelRadius
    for (const wz of TRACK.roadWheelsZ) {
      const wheel = buildWheel(TRACK.roadWheelRadius, BELT.width + ROAD_WHEEL_OVER * 2, tireMaterial, darkMaterial, wheelMaterial)
      wheel.group.position.set(x, roadY, wz)
      group.add(wheel.group)
      wheels.push(wheel)
      runners.push({ group: wheel.group, side, radius: TRACK.roadWheelRadius })
    }

    // End sprockets — the drum and its ring of teeth, model/sprocket.ts.
    for (const sz of TRACK.sprocketZ) {
      const sprocket = buildSprocket(side, x, sz, wheelMaterial, darkMaterial)
      group.add(sprocket.group)
      sprockets.push(sprocket)
      // The sprocket turns at the radius of the BELT it carries, not at its
      // own rim: that is the radius the belt's centreline orbits, so teeth
      // and plates advance by the same angle every frame and never slip.
      runners.push({ group: sprocket.group, side, radius: WRAP_RADIUS })
    }

    // Return rollers in the gaps between road wheels, top run — same wheel
    // component at the roller radius. They CARRY the top run: the roller's
    // crown meets the belt's under-face, the mirror of the road wheels
    // standing on the bottom run.
    //
    // A roller alone cannot show that from outside: it sits UNDER the belt it
    // carries, and at every camera angle in the shot list the plates hide the
    // contact — the crown and the belt's under-face are the same height, so
    // whichever is nearer occludes the join. What reads instead is the TRACK
    // FRAME below: see the rails after this loop.
    const topRunUnder = TOP_RUN_Y - BELT_THICKNESS / 2
    const rollerY = topRunUnder - TRACK.returnRollerRadius
    for (const rz of TRACK.returnRollersZ) {
      const roller = buildWheel(TRACK.returnRollerRadius, BELT.width + ROLLER_OVER * 2, tireMaterial, darkMaterial, wheelMaterial)
      roller.group.position.set(x, rollerY, rz)
      group.add(roller.group)
      wheels.push(roller)
      runners.push({ group: roller.group, side, radius: TRACK.returnRollerRadius })
    }

    // Track frame: the longitudinal rails every runner hangs from. They fill
    // the slot between the road wheels' crowns and the top run's under-face —
    // the open sky that made the top run read as floating — and they are the
    // one X station that clears the rollers inboard and the belt's plates
    // outboard. They stop short of the sprocket drums.
    const railBottom = roadY + TRACK.roadWheelRadius + 0.05
    const rail = new BoxGeometry(0.45, topRunUnder - railBottom, POD_LENGTH - 14)
    geometries.push(rail)
    for (const rs of [1, -1] as const) {
      const railMesh = new Mesh(rail, darkMaterial)
      railMesh.name = 'track-frame'
      railMesh.position.set(x + rs * (BELT.width / 2 + ROLLER_OVER + 0.325), (railBottom + topRunUnder) / 2, 0)
      railMesh.castShadow = true
      group.add(railMesh)
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
      for (const sprocket of sprockets) sprocket.dispose()
      for (const { part } of belts) part.dispose()
    },
  }
}
