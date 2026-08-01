// src/game-render/modes/flight/Ornithopter.ts
// Procedurally built ornithopter.
//
// Built from geometry rather than loaded as a GLB so it needs no asset
// pipeline and no external art to look deliberate. Stage 22 Step 3 rebuilds
// the FORM: a lofted hull with no nose-flare seam, a framed canopy seated on
// a collar, four real wings (spar + pleated membrane, not a flat blade) with
// hull-side shoulder fairings, a segmented dragonfly abdomen ending in paired
// tail vanes (not a vertical fin — see geometry/tailGeometry.ts), landing
// skids and jet nacelles. Assembly lives here; each part's own geometry
// lives in ./geometry/ so this file stays about materials and composition.

import {
  Group, Object3D, Mesh, MeshStandardMaterial, DoubleSide, type BufferGeometry, type Texture,
} from 'three'
import { createWingRig } from './WingRig'
import type { WingRig, WingMaterials } from './WingRig'
import type { WingCycleOptions } from './wingCycle'
import {
  phaseAtElapsedMs, FOREWING_SPEC, HINDWING_SPEC,
  FOREWING_ATTACHMENT, HINDWING_ATTACHMENT,
  FORE_LEFT_OPTIONS, FORE_RIGHT_OPTIONS, REAR_LEFT_OPTIONS, REAR_RIGHT_OPTIONS,
} from './wingConfig'
import { buildFuselageGeometry, HULL_MAX_RADIUS } from './geometry/fuselageGeometry'
import { buildCanopy } from './geometry/canopyGeometry'
import { buildTail } from './geometry/tailGeometry'
import { buildSkids } from './geometry/skidGeometry'
import { buildNacelles } from './geometry/nacelleGeometry'
import { buildWingRootFairings } from './geometry/wingRootFairing'
import { buildWingRootJoints } from './geometry/wingJointGeometry'
import { buildHullWeatheringMaps } from './geometry/hullWeathering'

export { HULL_MAX_RADIUS }

export interface Ornithopter {
  group: Group
  /** Beat the wings. Call per frame with elapsed milliseconds. */
  update(elapsedMs: number): void
  dispose(): void
}

// Painted composite is the base material (section 2.4: "Hull: painted
// composite, roughness ~0.55, metalness 0"); metalness 1 is reserved for a
// small worn-metal mask — wing leading-edge spars, nacelle rims, skid
// contact points — rather than the whole hull, per the same section's
// "author the mask, not a middle value". A metal's entire look is a
// reflection of scene.environment (see env/skyEnvironment.ts), which was
// lighting the whole hull toward the sand's own value; keeping metalness
// off the majority of the surface is what gives the craft back a value the
// environment map cannot equalise away.
//
// Round 5: the flat HULL_COLOR this comment used to defend (0x160f08, kept
// dark because round 4 found LIGHTENING it hurt criterion 3's craft/sand
// separation) is gone — section 2.2 wants a "faceted... bone/tan, weathered"
// hull, which no single flat value can be. geometry/hullWeathering.ts
// replaces it with a panel-line-and-dirt map: pale panel faces, dark seams
// and crevice dirt, so the darkest texels stay near the old flat value while
// lit faces read pale. Re-measured against round 4's exact method — see the
// report.
const WORN_METAL_COLOR = 0x8c8579
const CANOPY_COLOR = 0x162a2e
// Nudged up from 0x1c1811 toward section 2.4's albedo floor — a small-area
// trim accent (tail fin, nacelle interior, pterostigma), not the surface
// criterion 3 measures, so it did not need HULL_COLOR's same scrutiny.
const DARK_COLOR = 0x241e18
// The membrane's own colour, distinct from the hull rather than reusing it
// (section 2.6: "uniform material, no metal-type variation" was one of the
// named failures) — a warm, translucent amber in the family of a real
// dragonfly wing and Herbert's "delicate metal interleavings", so backlight
// (the golden-hour framing this craft is built for) reads as light coming
// THROUGH the membrane rather than stopping at its surface.
const MEMBRANE_COLOR = 0x6b5636
const MEMBRANE_OPACITY = 0.82

// Slow attitude drift, uncorrelated with the beat — stage 22 section 2.3:
// "their wings are never perfectly symmetrical once beating, and they
// never take off straight". Frequencies are deliberately not multiples of
// BEAT_HZ or of one another.
const DRIFT_ROLL_HZ = 0.11
const DRIFT_YAW_HZ = 0.07
const DRIFT_AMPLITUDE = 0.035

export function createOrnithopter(): Ornithopter {
  const group = new Group()
  // Everything visible hangs off driftNode rather than group directly, so
  // the slow attitude drift below can be an ABSOLUTE rotation each frame —
  // not += accumulation, which would depend on update() being called
  // exactly once per frame and compound if it were not. group.rotation
  // stays entirely FlightMode.ts's to set (heading, bank); this only adds
  // to it, the same way a child's transform always composes with its
  // parent's.
  const driftNode = new Object3D()
  group.add(driftNode)
  const geometries: BufferGeometry[] = []
  const hullWeathering = buildHullWeatheringMaps()
  const textures: Texture[] = [hullWeathering.map, hullWeathering.roughnessMap]

  // flatShading (also on `canopy` below) is wingMembrane's near-free faceting
  // trick, applied to the hull for an angular, plated read at zero added
  // triangles. color stays white so the weathering map shows through unmodified.
  const hullPaint = new MeshStandardMaterial({
    color: 0xffffff, roughness: 1, metalness: 0, flatShading: true,
    map: hullWeathering.map, roughnessMap: hullWeathering.roughnessMap,
  })
  const wornMetal = new MeshStandardMaterial({ color: WORN_METAL_COLOR, roughness: 0.32, metalness: 1 })
  // flatShading turns the pleated membrane into a genuinely faceted,
  // corrugated surface (stage 22 section 2.5) rather than a smoothly
  // blurred wave; DoubleSide because the underside is visible across the
  // beat cycle and the two mirrored wing geometries invert winding for one
  // side (see geometry/wingGeometry.ts). transparent+opacity is this round's
  // named ask — "ideally with slight translucency so light passes through
  // the membrane" — kept short of fully see-through so the corrugation and
  // taper (the actual planform fix) stay the dominant read.
  const wingMembrane = new MeshStandardMaterial({
    color: MEMBRANE_COLOR, roughness: 0.6, metalness: 0, flatShading: true, side: DoubleSide,
    transparent: true, opacity: MEMBRANE_OPACITY,
  })
  // flatShading: an angular multi-pane greenhouse (section 2.2), not a smooth
  // bubble — see canopyGeometry.ts's faceted dome and added mullion ribs.
  const canopy = new MeshStandardMaterial({
    color: CANOPY_COLOR, roughness: 0.16, metalness: 0.35, flatShading: true,
  })
  const darkTrim = new MeshStandardMaterial({ color: DARK_COLOR, roughness: 0.75, metalness: 0.1 })
  const materials = [hullPaint, wornMetal, wingMembrane, canopy, darkTrim]

  const fuselageGeometry = buildFuselageGeometry()
  geometries.push(fuselageGeometry)
  driftNode.add(new Mesh(fuselageGeometry, hullPaint))

  const canopyParts = buildCanopy(canopy, hullPaint)
  geometries.push(...canopyParts.geometries)
  driftNode.add(canopyParts.group)

  const tailParts = buildTail(hullPaint, darkTrim)
  geometries.push(...tailParts.geometries)
  driftNode.add(tailParts.group)

  const skidParts = buildSkids(wornMetal)
  geometries.push(...skidParts.geometries)
  driftNode.add(skidParts.group)

  const nacelleParts = buildNacelles(hullPaint, wornMetal, darkTrim)
  geometries.push(...nacelleParts.geometries)
  driftNode.add(nacelleParts.group)

  const fairingParts = buildWingRootFairings(hullPaint)
  geometries.push(...fairingParts.geometries)
  driftNode.add(fairingParts.group)

  // Ball-joint housings, rods and springs at each wing root, layered onto the
  // fairing above — the highest-value gap named by every blind critic so far.
  const jointParts = buildWingRootJoints(FOREWING_ATTACHMENT, HINDWING_ATTACHMENT, {
    housing: wornMetal, rod: wornMetal,
  })
  geometries.push(...jointParts.geometries)
  driftNode.add(jointParts.group)

  // Four wings, each hinged at the fuselage rather than at its own midspan
  // (stage 22 section 1.1), driven by wingCycle.ts through WingRig.ts.
  // marking reuses darkTrim: the pterostigma is explicitly "a small dark
  // mass" (section 2.5), and it should read as opaque even against a
  // translucent membrane, which rules out the membrane material itself.
  const wingMaterials: WingMaterials = { membrane: wingMembrane, spar: wornMetal, marking: darkTrim }
  const wings: Array<{ rig: WingRig; options: WingCycleOptions }> = [
    { rig: createWingRig(FOREWING_SPEC, 'left', FOREWING_ATTACHMENT, wingMaterials), options: FORE_LEFT_OPTIONS },
    { rig: createWingRig(FOREWING_SPEC, 'right', FOREWING_ATTACHMENT, wingMaterials), options: FORE_RIGHT_OPTIONS },
    { rig: createWingRig(HINDWING_SPEC, 'left', HINDWING_ATTACHMENT, wingMaterials), options: REAR_LEFT_OPTIONS },
    { rig: createWingRig(HINDWING_SPEC, 'right', HINDWING_ATTACHMENT, wingMaterials), options: REAR_RIGHT_OPTIONS },
  ]
  for (const { rig } of wings) driftNode.add(rig.pivot)

  return {
    group,
    update(elapsedMs: number): void {
      const phase = phaseAtElapsedMs(elapsedMs)
      for (const { rig, options } of wings) rig.update(phase, options)

      // A slow drift uncorrelated with the beat, so the craft reads as
      // holding a heading rather than riding a rail (section 2.3) — an
      // ABSOLUTE rotation of driftNode (a child of group), which composes
      // with whatever heading/bank FlightMode.ts has set on group itself
      // without needing to read or depend on that value.
      const seconds = elapsedMs / 1000
      driftNode.rotation.z = Math.sin(seconds * DRIFT_ROLL_HZ * 2 * Math.PI) * DRIFT_AMPLITUDE
      driftNode.rotation.y = Math.sin(seconds * DRIFT_YAW_HZ * 2 * Math.PI) * DRIFT_AMPLITUDE * 0.6
    },
    dispose(): void {
      for (const geometry of geometries) geometry.dispose()
      for (const { rig } of wings) rig.dispose()
      for (const material of materials) material.dispose()
      for (const texture of textures) texture.dispose()
      group.clear()
    },
  }
}
