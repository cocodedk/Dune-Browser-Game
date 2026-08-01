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
  Group, Mesh, MeshStandardMaterial, DoubleSide, type BufferGeometry, type Material,
} from 'three'
import type { CraftModel, FlightState } from '../contracts'
import { WING, WING_ROOTS, WING_ROOT_X } from '../spec'
import { buildHullGeometry } from './geometry/hullGeometry'
import { buildCanopy } from './geometry/canopyGeometry'
import { buildTailVanes } from './geometry/tailGeometry'
import { GEAR_LEG_MOUNTS, buildGearGeometries, footDropFromHip } from './geometry/gearGeometry'
import { buildWingBladeGeometry } from './geometry/wingGeometry'
import { createWingRig, type WingRig } from './WingRig'
import type { WingSide } from './wingKinematics'

const HULL_COLOR = 0x9c9280
const METAL_COLOR = 0x54514a
const WING_COLOR = 0x2b2822
const CANOPY_COLOR = 0x1c2f33

export function createOrnithopter(): CraftModel {
  const root = new Group()
  root.name = 'ornithopter'
  const geometries: BufferGeometry[] = []
  const materials: Material[] = []

  const hullMaterial = new MeshStandardMaterial({ color: HULL_COLOR, roughness: 0.75, metalness: 0.1 })
  const metalMaterial = new MeshStandardMaterial({ color: METAL_COLOR, roughness: 0.5, metalness: 0.7 })
  const wingMaterial = new MeshStandardMaterial({
    color: WING_COLOR, roughness: 0.45, metalness: 0.5, side: DoubleSide,
  })
  const canopyMaterial = new MeshStandardMaterial({
    color: CANOPY_COLOR, roughness: 0.2, metalness: 0.2, transparent: true, opacity: 0.55,
  })
  materials.push(hullMaterial, metalMaterial, wingMaterial, canopyMaterial)

  const hullGeometry = buildHullGeometry()
  geometries.push(hullGeometry)
  root.add(new Mesh(hullGeometry, hullMaterial))

  const canopy = buildCanopy()
  geometries.push(canopy.geometry)
  const canopyMesh = new Mesh(canopy.geometry, canopyMaterial)
  canopyMesh.name = 'canopy'
  canopyMesh.position.set(canopy.position.x, canopy.position.y, canopy.position.z)
  root.add(canopyMesh)

  const vanes = buildTailVanes()
  geometries.push(vanes.geometry)
  for (const placement of vanes.placements) {
    const vane = new Mesh(vanes.geometry, metalMaterial)
    vane.position.set(placement.position.x, placement.position.y, placement.position.z)
    vane.rotation.z = placement.rotationZ
    root.add(vane)
  }

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

  // All four pairs on a side share one blade geometry (spec.ts's WING
  // constants do not vary per pair — only the static Fold fan angle and the
  // beat phase do), so this builds it exactly twice, not eight times.
  const leftBlade = buildWingBladeGeometry('left', WING.reach)
  const rightBlade = buildWingBladeGeometry('right', WING.reach)
  geometries.push(leftBlade, rightBlade)

  const sides: readonly WingSide[] = ['left', 'right']
  const wings: WingRig[] = WING_ROOTS.flatMap((mount, pairIndex) => sides.map((side) => {
    const blade = side === 'left' ? leftBlade : rightBlade
    const attachment = { x: side === 'right' ? WING_ROOT_X : -WING_ROOT_X, y: mount.y, z: mount.z }
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
      root.clear()
    },
  }
}
