// landscape-shop/cliff/src/model/socket.ts
// The carved sietch gate: a 66 x 38 m mouth in the prow, chamfered back
// through two courses of rock to the 16 x 12 m aperture spec.ts calls for,
// then a bent dark shaft. Every ring is sampled at the same angles, so
// consecutive rings weld into quad strips with no fan and no pole.

import { Mesh } from 'three'
import { buildGridGeometry, type GridPoint } from './grid'
import { rockFrontAt } from './massif'
import { buildGateLip } from './gateLip'
import { rectPoint, ring, ovalPoint, type Ring } from './socketRings'
import { interiorMaterial, paintInterior, type SocketDepth } from './socketTone'
import { ENTRANCE } from '../spec'

// The mouth's inner rim hangs this far in front of the prow's own frontmost vertex, so the entrance owns -Z by construction.
const RIM_PROUD_M = 1.2
const THROAT = { halfW: 14, halfH: 9, centreY: 8, depth: 3 }
const GATE = { halfW: ENTRANCE.widthM / 2, halfH: ENTRANCE.heightM / 2, centreY: ENTRANCE.heightM / 2 }
const GATE_DEPTH_M = 3.8
// Mouth-to-back bends off the +X key light (main.ts). X only: the dune
// ground sits at y = 0 here, so a Y dogleg would dip the floor below grade.
const DOGLEG_X = -6
const DOGLEG_Y = 0
// Chamfer/jamb are a FUNNEL (LIP_INNER 40x24 -> THROAT 28x18 -> GATE 16x12
// over 3.8 m): every visible facet's normal points partly toward camera,
// axis AND floor — the key light's own direction — so no dogleg/taper turns
// a flare away from a light on the camera's own side (tried a progressive
// dogleg; measured worse). A DARKER lit material still fails: the scale
// shrinks a lit (N.L ~0.95) and a shadowed (N.L ~0) facet together, so the
// "box" edge survives, dimmer. So every interior face is UNLIT — and, since
// R1.4, carries model/socketTone.ts's depth gradient in its vertex colours,
// so the void has structure without a light ever touching it.
//
// Those interior meshes stop flat at y = 0 (GATE's floor) and the landing
// rig looks down shallow enough that a ray slips under that edge, through
// LIP_OUTER's wobble gap, onto the lit skirt behind — gateSill hangs an
// unlit curtain well below the floor so no edge is left to slip under.
const SILL_MARGIN_M = 2
const SILL_Y_TOP = 1
const SILL_Y_BOTTOM = -4
// gateWall.ts's hole only punches the PROCEDURAL prow; the baked massif
// (off-limits) is solid and unaware of it, reaching to about backZ - 1.6 m
// here — an uncarved, lit rock slab, a second "box". gateSeal reads the
// same bake data gateWall.ts already reads to find a z it never touches.
const SEAL_MARGIN_M = 1.5

/** Nearest the baked massif comes to camera, minus SEAL_MARGIN_M, clamped between the mouth and the true back. */
function safeSealZ(gateZ: number, backZ: number): number {
  const minX = Math.min(-GATE.halfW, -GATE.halfW + DOGLEG_X)
  const maxX = Math.max(GATE.halfW, GATE.halfW + DOGLEG_X)
  const minY = GATE.centreY - GATE.halfH + Math.min(0, DOGLEG_Y)
  const maxY = GATE.centreY + GATE.halfH + Math.max(0, DOGLEG_Y)
  const STEPS = 24
  let nearestRock = Infinity
  for (let i = 0; i <= STEPS; i++) {
    const x = minX + ((maxX - minX) * i) / STEPS
    for (let j = 0; j <= STEPS; j++) {
      const y = minY + ((maxY - minY) * j) / STEPS
      const rock = rockFrontAt(x, y)
      if (rock !== null) nearestRock = Math.min(nearestRock, rock)
    }
  }
  return Math.min(backZ, Math.max(gateZ, nearestRock - SEAL_MARGIN_M))
}

/** Unlit mesh carrying socketTone.ts's depth gradient: no N.L term, so a
 *  self-shadowed facet and a directly-lit one come out identically dark,
 *  and what varies inside the mouth is depth, never light. */
function darkMesh(columns: GridPoint[][], name: string, depth: SocketDepth): Mesh {
  const geometry = buildGridGeometry(columns)
  paintInterior(geometry, depth)
  const mesh = new Mesh(geometry, interiorMaterial())
  mesh.name = name
  return mesh
}

/** Same lattice as `strip`, but unlit — see `darkMesh`. */
function unlitStrip(a: Ring, b: Ring, name: string, depth: SocketDepth): Mesh {
  return darkMesh(a.map((point, i) => [point, b[i]]), name, depth)
}

export interface Socket {
  meshes: Mesh[]
  /** The set's frontmost point, by construction. */
  frontZ: number
}

export function buildSocket(gateWallMinZ: number): Socket {
  // Outer rim FOLLOWS the prow's surface (no step at the wall); the inner
  // rim is a flat plane a fixed step in front, so the lip always owns -Z.
  const frontZ = gateWallMinZ - RIM_PROUD_M
  const throatZ = frontZ + THROAT.depth
  const gateZ = frontZ + GATE_DEPTH_M
  const backZ = frontZ + ENTRANCE.recessM
  const lip = buildGateLip(frontZ, backZ)

  const throat = ring((angle) => {
    const [x, y] = ovalPoint(THROAT, angle)
    return { x, y, z: throatZ }
  })
  const mouth = ring((angle) => {
    const [x, y] = rectPoint(GATE, angle)
    return { x, y, z: gateZ }
  })
  // Same rectangle as mouth, slid off-axis at the unchanged backZ.
  const back = ring((angle) => {
    const [x, y] = rectPoint(GATE, angle)
    return { x: x + DOGLEG_X, y: y + DOGLEG_Y, z: backZ }
  })
  // `back`'s vertices hold the recess-depth contract; gateSeal sits in front of them (and the massif) as what shows.
  const sealZ = safeSealZ(gateZ, backZ)
  const sealT = (sealZ - gateZ) / (backZ - gateZ)
  // One gradient field, mouth rim to back, shared by every interior surface.
  const depth: SocketDepth = { frontZ, backZ }
  return {
    frontZ,
    meshes: [
      lip.mesh,
      unlitStrip(lip.inner, throat, 'gateChamfer', depth),
      unlitStrip(throat, mouth, 'gateJamb', depth),
      unlitStrip(mouth, back, 'gateShaft', depth),
      buildCap(sealZ, DOGLEG_X * sealT, DOGLEG_Y * sealT, 'gateSeal', depth),
      buildSill(gateZ, depth),
    ],
  }
}

/** gateSeal: what the camera sees terminate the passage (see buildSocket). */
function buildCap(z: number, offsetX: number, offsetY: number, name: string, depth: SocketDepth): Mesh {
  const columns = [-GATE.halfW + offsetX, GATE.halfW + offsetX].map((x) => (
    [GATE.centreY - GATE.halfH + offsetY, GATE.centreY + GATE.halfH + offsetY].map((y) => ({ x, y, z }))
  ))
  return darkMesh(columns, name, depth)
}

/** The curtain described above the SILL_* constants. */
function buildSill(gateZ: number, depth: SocketDepth): Mesh {
  const columns = [-GATE.halfW + DOGLEG_X - SILL_MARGIN_M, GATE.halfW + SILL_MARGIN_M].map((x) => (
    [SILL_Y_BOTTOM, SILL_Y_TOP].map((y) => ({ x, y, z: gateZ }))
  ))
  return darkMesh(columns, 'gateSill', depth)
}
