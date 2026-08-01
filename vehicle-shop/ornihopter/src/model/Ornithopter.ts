// vehicle-shop/ornihopter/src/model/Ornithopter.ts
// Entry point: assembles the hull, canopy, tail vanes, landing gear and the
// eight-wing rig into one CraftModel.
//
// "Flyable first, pretty later" (progress.md) — every part here is a flat
// MeshStandardMaterial with an authored colour, no textures, no greebles;
// this round's job is proportion, wing count, pivot placement and the beat
// motion, not surface finish. A later round adds panel lines, weathering and
// real cockpit/canopy detailing.
//
// The root Group never sets its own position or quaternion — the host
// (main.ts) drives those from the flight model's state every frame, per
// contracts.ts's CraftModel contract.

import {
  Group, Mesh, MeshStandardMaterial, DoubleSide,
  type BufferGeometry, type Material, type Texture,
} from 'three'
import type { CraftModel, FlightState } from '../contracts'
import { WING, WING_ROOTS } from '../spec'
import { buildHullGeometry } from './geometry/hullGeometry'
import { buildHullWeatheringMaps } from './geometry/hullWeathering'
import { buildCanopy } from './geometry/canopyGeometry'
import { GEAR_LEG_MOUNTS, buildGearGeometries, footDropFromHip } from './geometry/gearGeometry'
import { buildWingBladeGeometry } from './geometry/wingGeometry'
import { seatOnHull, wingPivotAt, buildRootPodGeometries } from './geometry/wing/rootPod'
import { createWingRig, type WingRig } from './WingRig'
import type { WingSide } from './wingKinematics'

const METAL_COLOR = 0x54514a
const WING_COLOR = 0x5c5548

export function createOrnithopter(): CraftModel {
  const root = new Group()
  root.name = 'ornithopter'
  const geometries: BufferGeometry[] = []
  const materials: Material[] = []
  const textures: Texture[] = []

  // The hull's colour now comes from geometry/hullWeathering.ts's procedural
  // maps rather than a single authored constant — panel fields, raised trim,
  // dark belly, chine grime, the fine-rib intake grilles and the nose's two
  // slots are all painted into them, and hullLoft.ts emits the UVs they land
  // on. color stays white so the maps carry the palette unmodulated;
  // flatShading keeps the facets hard even where a future edit might share a
  // vertex the loft currently duplicates.
  const hull = buildHullWeatheringMaps()
  textures.push(...hull.textures)
  const hullMaterial = new MeshStandardMaterial({
    color: 0xffffff, map: hull.map, roughnessMap: hull.roughnessMap,
    roughness: 1, metalness: 0.08, flatShading: true,
  })
  const metalMaterial = new MeshStandardMaterial({ color: METAL_COLOR, roughness: 0.5, metalness: 0.7 })
  // Dark metal with real specular response, not flat unlit black: a blind
  // critic read the previous wings as "black pencil lines" and the whole
  // craft as too dark against the reference's pale bone/tan. Lower roughness
  // and higher metalness than the hull's own material so the beat cycle's
  // motion actually sweeps a highlight across the blade.
  const wingMaterial = new MeshStandardMaterial({
    color: WING_COLOR, roughness: 0.32, metalness: 0.65, side: DoubleSide,
  })
  materials.push(hullMaterial, metalMaterial, wingMaterial)

  const hullGeometry = buildHullGeometry()
  geometries.push(hullGeometry)
  root.add(new Mesh(hullGeometry, hullMaterial))

  const canopy = buildCanopy()
  geometries.push(...canopy.geometries)
  materials.push(...canopy.materials)
  root.add(canopy.group)

  // The tail's crossed vanes are GONE, not moved. They sat in the same place
  // as the hull's own tail fork and doubled it up; a blind critic read the
  // pair as "leftover quill spikes". geometry/hullTailFork.ts now owns the
  // tail tip alone, as the flattened slotted paddle the reference shows, and
  // it is part of the hull mesh rather than two separate meshes floating at
  // the end of the boom.

  const gear = buildGearGeometries()
  geometries.push(gear.strut, gear.foot)
  const footDrop = footDropFromHip()
  for (const mount of GEAR_LEG_MOUNTS) {
    const strut = new Mesh(gear.strut, metalMaterial)
    strut.position.set(mount.x, mount.hipY, mount.z)
    root.add(strut)
    const foot = new Mesh(gear.foot, metalMaterial)
    foot.position.set(mount.x, mount.hipY - footDrop, mount.z)
    root.add(foot)
  }

  // Ball-joint root housings: static, faired into the hull deck at each
  // WING_ROOTS station (geometry/wing/rootPod.ts) — a row along the dorsal
  // deck, per .shots/reference/kit-assembled.png. Fixed to the hull, NOT
  // part of the wing rig: mechanically the ball half of a ball joint mounts
  // to the fuselage, not the part that swings. seatOnHull/wingPivotAt read
  // the hull's real surface (geometry/hullProfile.ts) rather than the old
  // guessed WING_ROOT_X/mount.y, which floated outside the hull's actual
  // faceted skin — the "black mounting plate... a visible gap" defect.
  const pods = buildRootPodGeometries()
  geometries.push(pods.ball, pods.post)
  const stations = WING_ROOTS.map((mount) => ({
    seat: seatOnHull(mount.z),
    pivot: wingPivotAt(mount.z),
    z: mount.z,
  }))
  for (const station of stations) {
    for (const mirror of [1, -1] as const) {
      const post = new Mesh(pods.post, metalMaterial)
      post.name = 'wing-root-post'
      post.position.set(mirror * station.seat.x, station.seat.y, station.z)
      root.add(post)
      const ball = new Mesh(pods.ball, metalMaterial)
      ball.name = 'wing-root-ball'
      ball.position.set(mirror * station.pivot.x, station.pivot.y, station.z)
      root.add(ball)
    }
  }

  // All four pairs on a side share one blade geometry (spec.ts's WING
  // constants do not vary per pair — only the static Fold fan angle and the
  // beat phase do), so this builds it exactly twice, not eight times.
  const leftBlade = buildWingBladeGeometry('left', WING.reach)
  const rightBlade = buildWingBladeGeometry('right', WING.reach)
  geometries.push(leftBlade, rightBlade)

  // Attachment is the SAME real hull-seated pivot the ball housings above
  // are drawn at (wingPivotAt), so the rotating arm always reaches exactly
  // into the static ball at every station, not a separately guessed point.
  const sides: readonly WingSide[] = ['left', 'right']
  const wings: WingRig[] = stations.flatMap((station, pairIndex) => sides.map((side) => {
    const blade = side === 'left' ? leftBlade : rightBlade
    const mirror = side === 'right' ? 1 : -1
    const attachment = { x: mirror * station.pivot.x, y: station.pivot.y, z: station.z }
    const rig = createWingRig(side, pairIndex, attachment, blade, wingMaterial)
    root.add(rig.root)
    return rig
  }))

  return {
    root,
    update(state: Readonly<FlightState>): void {
      for (const wing of wings) wing.update(state.beatPhase)
    },
    dispose(): void {
      for (const geometry of geometries) geometry.dispose()
      for (const material of materials) material.dispose()
      // Textures are NOT released by Material.dispose(); they hold their own
      // GPU allocation and have to be disposed by whoever created them.
      for (const texture of textures) texture.dispose()
      root.clear()
    },
  }
}
