// landscape-shop/cliff/src/model/socket.ts
// The carved sietch gate: a 66 x 38 m mouth in the prow, chamfered back
// through two courses of rock to the 16 x 12 m aperture spec.ts calls for,
// then a bent dark shaft. Every ring is sampled at the same angles, so
// consecutive rings weld into quad strips with no fan and no pole.

import { Mesh } from 'three'
import { buildGridGeometry, meshFrom, type GridPoint } from './grid'
import { gateWallZ, socketRadius, SOCKET } from './gateWall'
import { rockFrontAt } from './massif'
import { interiorMaterial, paintInterior, type SocketDepth } from './socketTone'
import { ENTRANCE, PALETTE } from '../spec'

const SAMPLES = 48
const LIP_OUTER = { halfW: 33, halfH: 19, centreY: 18, proud: 0.2 }
const LIP_INNER = { halfW: 20, halfH: 12, centreY: 13 }
// The mouth's inner rim hangs this far in front of the prow's own frontmost vertex, so the entrance owns -Z by construction.
const RIM_PROUD_M = 1.2
const THROAT = { halfW: 14, halfH: 9, centreY: 8, depth: 3 }
const GATE = { halfW: ENTRANCE.widthM / 2, halfH: ENTRANCE.heightM / 2, centreY: ENTRANCE.heightM / 2 }
const GATE_DEPTH_M = 3.8
// Mouth-to-back bends off the +X key light (main.ts). X only: the dune
// ground sits at y = 0 here, so a Y dogleg would dip the floor below grade.
const DOGLEG_X = -6
const DOGLEG_Y = 0
// LIP_OUTER's wobble can shrink it below gateWall.ts's punched SOCKET hole
// at some angles — a raw, unlipped hole-edge sliver. Pushed outside first.
const SOCKET_CLEARANCE = 1.08
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

/** Irregular, and deliberately not symmetric about any axis. */
function wobble(angle: number): number {
  return 1 + 0.13 * Math.sin(3 * angle + 1.1) + 0.08 * Math.sin(5 * angle + 2.3)
    + 0.05 * Math.sin(7 * angle + 0.4)
}

function ovalPoint(shape: { halfW: number; halfH: number; centreY: number }, angle: number): [number, number] {
  const k = wobble(angle)
  return [shape.halfW * k * Math.cos(angle), shape.centreY + shape.halfH * k * Math.sin(angle)]
}

/** Radially pushes (x, y) out until it clears gateWall.ts's punched hole by SOCKET_CLEARANCE, leaving clear points untouched. */
function pushOutsideSocket(x: number, y: number): [number, number] {
  const r = socketRadius(x, y)
  if (r >= SOCKET_CLEARANCE) return [x, y]
  const scale = SOCKET_CLEARANCE / Math.max(r, 0.01)
  return [x * scale, SOCKET.centreYM + (y - SOCKET.centreYM) * scale]
}

/** The 16 x 12 aperture, sampled at the SAME angles as the mouth rings so the chamfer strips stay quad-to-quad all the way in. */
function rectPoint(shape: { halfW: number; halfH: number; centreY: number }, angle: number): [number, number] {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  const k = 1 / Math.max(Math.abs(c) / shape.halfW, Math.abs(s) / shape.halfH)
  return [k * c, shape.centreY + k * s]
}

type Ring = GridPoint[]

function ring(at: (angle: number) => GridPoint): Ring {
  const points: Ring = []
  // SAMPLES + 1 points: the last repeats the first, which closes the loop.
  for (let i = 0; i <= SAMPLES; i++) points.push(at((2 * Math.PI * i) / SAMPLES))
  return points
}

function strip(a: Ring, b: Ring, color: number, name: string): Mesh {
  const columns = a.map((point, i) => [point, b[i]])
  const mesh = meshFrom(buildGridGeometry(columns), color)
  mesh.name = name
  return mesh
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

  // Capped at backZ: where the fluting runs deeper than the recess, the rim
  // stands a little proud instead, or it drags the z-span past recessM.
  const outer = ring((angle) => {
    const [x, y] = pushOutsideSocket(...ovalPoint(LIP_OUTER, angle))
    return { x, y, z: Math.min(gateWallZ(x, y) - LIP_OUTER.proud, backZ) }
  })
  const inner = ring((angle) => {
    const [x, y] = ovalPoint(LIP_INNER, angle)
    return { x, y, z: frontZ }
  })

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
      strip(outer, inner, PALETTE.rock, 'gateLip'),
      unlitStrip(inner, throat, 'gateChamfer', depth),
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
