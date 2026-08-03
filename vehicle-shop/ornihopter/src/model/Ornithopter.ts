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
import { buildLandingGearGeometry } from './geometry/gearGeometry'
import { buildWingBladeGeometry } from './geometry/wingGeometry'
import { seatForMount, pivotForMount, buildRootPodGeometries } from './geometry/wing/rootPod'
import { createWingRig, type WingRig } from './WingRig'
import type { WingSide } from './wingKinematics'

/** Wing-root posts and ball housings only — nothing else uses metalMaterial.
 *  Was 0x54514a at metalness 0.7: the same no-envMap metal bug as the blades
 *  below, so the eight balls rendered at ~28% of lit-hull luminance and, once
 *  the wings rejoined the airframe's tone, were the only near-black objects
 *  left on the craft — at the very joint this round exists to make legible.
 *  Still deliberately the darkest part of the airframe (~66-74% measured): a
 *  ball joint should read as hardware, just not as a hole. */
const METAL_COLOR = 0x8f887a
/** The kit prints hull and wings in ONE filament (docs/dune_ornihopter_kit-2.png),
 *  so the blades share GEAR_COLOR's family below — the same hue exactly, one
 *  value step down. DOWN, for the reason GEAR_COLOR had to go UP: the number
 *  that matters is the rendered one, and a blade's near-horizontal upper face
 *  meets the 57-degree sun almost square where a gear femur meets it
 *  obliquely. At the gear's own albedo the blades measured 96-108% of lit
 *  hull — the critique's inversion, the other way round. Measured back to the
 *  round 4c.2 target of 80-90%; see wingTone.test.ts. */
const WING_COLOR = 0xada89a
/** Same bone/tan family as the hull's own palette (hullTexel.ts's BONE and
 *  DECK_PANEL tones), not the wing-root pods' bare metalMaterial: metalness
 *  0.7 there crushes the diffuse response that makes the hull read bright, so
 *  the legs once measured near-black (~44% of lit-hull luminance) against
 *  reference photographs that show the legs in the body's own colour.
 *  DOWN from 0xddd6c4 in round 6d, and what moved is the RENDERED number, not
 *  the albedo. 4c.2 set 0xddd6c4 against legs of steep femur plate, which meet
 *  the 57-degree sun obliquely; round 6d's leg also carries a bracket flat on
 *  the flank and a skid flat on the ground, and both meet that sun nearly
 *  square. At the SAME albedo the gear measured 107 / 98 / 101% of the lit
 *  hull in side / hero / rear34, over the 80-90% band in all three. At
 *  0xada89a: 87.7 / 78.4 / 83.1 / 83.0 in side / hero / rear34 / top — hero
 *  1.6 under, where the wings' accepted 78.7-91.6% also sits. Method: two
 *  renders per frame, one with this constant forced to black, so the gear's
 *  pixels come out by DIFFERENCE, not by eye; the reference is the median of
 *  the brightest fifth of hull pixels, found the
 *  same way. Legs in the pod's own shadow measure 38-61% and should. It landed
 *  exactly on WING_COLOR, which is convergence, not a shortcut: the kit prints
 *  hull, wings and gear in ONE filament, and two parts tuned independently
 *  against one bar met. Roughness 0.78 keeps the legs reading as mechanism. */
const GEAR_COLOR = 0xada89a

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
  const metalMaterial = new MeshStandardMaterial({ color: METAL_COLOR, roughness: 0.5, metalness: 0.25 })
  // Airframe, not machined metal. The previous material chased "real specular
  // response" with metalness 0.65 and it backfired: stage/scene.ts has no
  // environment map, and in three.js a metal's reflection IS the environment,
  // so 65% of the albedo went into a lobe nothing could fill. Measured off the
  // render, the blades came in at 12-19% of lit-hull luminance in the hero
  // view and split into two sets in the top view — the pairs whose feather
  // angle pointed into the sun's narrow highlight read tan, the rest black.
  // Metalness 0.1 returns that response to diffuse, where the hemisphere light
  // reaches it; roughness 0.45 keeps a sheen sweeping the blade through the
  // beat without buying it with brightness.
  const wingMaterial = new MeshStandardMaterial({
    color: WING_COLOR, roughness: 0.45, metalness: 0.1, side: DoubleSide,
  })
  const gearMaterial = new MeshStandardMaterial({ color: GEAR_COLOR, roughness: 0.78, metalness: 0.08 })
  materials.push(hullMaterial, metalMaterial, wingMaterial, gearMaterial)

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

  // Six segmented insect legs in one mesh, already in craft-local space —
  // no per-leg transform, because no two legs are the same shape (each one's
  // length falls out of its own hip height above the shared ground plane;
  // geometry/gear/stance.ts).
  const gear = buildLandingGearGeometry()
  geometries.push(gear)
  const gearMesh = new Mesh(gear, gearMaterial)
  gearMesh.name = 'landing-gear'
  root.add(gearMesh)

  // Ball-joint root housings: static, seated on the hull at each WING_ROOTS
  // arm (geometry/wing/rootPod.ts). Fixed to the hull, NOT part of the wing
  // rig: mechanically the ball half of a ball joint mounts to the fuselage,
  // not the part that swings. seatForMount/pivotForMount read the hull's real
  // surface (geometry/hullProfile.ts) rather than a guessed coordinate — the
  // "black mounting plate... a visible gap" defect.
  //
  // Since round 6a there are two KINDS of arm, because the kit's mounting
  // frames have two kinds: deck arms whose post rises out of the dorsal shelf,
  // and flank arms whose post stands outboard from the side. The post is
  // rotated to match, or a flank post would lie along the hull instead of
  // reaching away from it.
  const pods = buildRootPodGeometries()
  geometries.push(pods.ball, pods.post)
  const stations = WING_ROOTS.map((mount) => ({
    seat: seatForMount(mount),
    pivot: pivotForMount(mount),
    z: mount.z,
    flank: mount.arm === 'flank',
  }))
  for (const station of stations) {
    for (const mirror of [1, -1] as const) {
      const post = new Mesh(pods.post, metalMaterial)
      post.name = 'wing-root-post'
      post.position.set(mirror * station.seat.x, station.seat.y, station.z)
      if (station.flank) post.rotation.z = mirror * -Math.PI / 2
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
      for (const wing of wings) wing.update(state.beatPhase, state.beatAmplitude ?? 1, state.foldProgress ?? 0)
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
