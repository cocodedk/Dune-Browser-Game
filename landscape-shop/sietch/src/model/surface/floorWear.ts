// landscape-shop/sietch/src/model/surface/floorWear.ts
// DESIRE LINES. A floor is not worn evenly; it is worn where people
// actually walk, and where they walk is decided by what is in the room.
// Every path below runs between two things this set already has — the
// mouth, DRESSING.hearthAtM, DRESSING.basinAtM, the three galleries on
// the back wall and the foot of the tier stair — so the wear pattern is a
// consequence of the composition rather than a decoration laid over it.
// Each path bows, because nobody walks a straight line between two points
// in a room; each carries its own traffic, because the hearth is busier
// than the last gallery on the left.
//
// Plus the two marks the room's two fixed points leave on the stone
// around them: the scorch ring the hearth has burned into the floor, and
// the darkened rim the basin keeps permanently damp.

import { DRESSING, FOOTPRINT } from '../../spec'
import { GALLERY_LAYOUT } from '../galleryLayout'
import { bump, clamp01, distanceToBowedPath, smoothstep } from './curves'

const [HEARTH_X, , HEARTH_Z] = DRESSING.hearthAtM
const [BASIN_X, , BASIN_Z] = DRESSING.basinAtM

const MOUTH: [number, number] = [0, -FOOTPRINT.depthM + 6]
const STAIR_FOOT: [number, number] = [13.2, -4.2]
const GALLERY_THRESHOLD_Z = -3.2

function thresholdOf(name: string): [number, number] {
  const gallery = GALLERY_LAYOUT.find((g) => g.name === name)
  return [gallery ? gallery.x : 0, GALLERY_THRESHOLD_Z]
}

export interface FootPath {
  from: [number, number]
  to: [number, number]
  /** Half-width of the worn band, in metres. */
  widthM: number
  /** Sideways bow of the line, in metres. Sign picks which way it bends. */
  bowM: number
  /** 0..1 — how much of the sietch's traffic this line carries. */
  traffic: number
  name: string
}

export const FOOT_PATHS: FootPath[] = [
  { from: MOUTH, to: [HEARTH_X, HEARTH_Z], widthM: 2.5, bowM: 2.0, traffic: 1.0, name: 'mouth to hearth — the way everyone comes in' },
  { from: [HEARTH_X, HEARTH_Z], to: thresholdOf('galleryLeftB'), widthM: 1.9, bowM: -1.1, traffic: 0.85, name: 'hearth to the near left gallery' },
  { from: [HEARTH_X, HEARTH_Z], to: thresholdOf('galleryLeftA'), widthM: 1.5, bowM: 1.0, traffic: 0.6, name: 'hearth to the far left gallery' },
  { from: [HEARTH_X, HEARTH_Z], to: [BASIN_X, BASIN_Z], widthM: 1.8, bowM: -1.4, traffic: 0.8, name: 'hearth to the water — the walk nobody skips' },
  { from: [BASIN_X, BASIN_Z], to: STAIR_FOOT, widthM: 1.4, bowM: 0.9, traffic: 0.5, name: 'water to the stair' },
  { from: MOUTH, to: STAIR_FOOT, widthM: 1.6, bowM: 3.0, traffic: 0.55, name: 'mouth to the stair, keeping out of the hearth' },
  { from: [HEARTH_X, HEARTH_Z], to: thresholdOf('galleryRightHigh'), widthM: 1.3, bowM: -2.2, traffic: 0.45, name: 'hearth to the raised gallery ramp' },
]

const GATHER_INNER_M = 2.6
const GATHER_OUTER_M = 4.6

/** 0 (untrodden) to 1 (polished by feet) at a floor point. Includes the
 *  ring around the hearth where people stand and sit, which is wider than
 *  any path and is why the paths all fade into one another there. */
export function footPathAt(x: number, z: number): number {
  let wear = 0
  for (const path of FOOT_PATHS) {
    const d = distanceToBowedPath(x, z, path.from[0], path.from[1], path.to[0], path.to[1], path.bowM)
    // A worn line has an EDGE. smoothstep gave every path a soft
    // shoulder wide enough that neighbouring paths merged into one broad
    // brightening near the hearth and no line read as a line.
    const w = clamp01(1 - d / path.widthM)
    const value = path.traffic * Math.pow(w, 0.6)
    if (value > wear) wear = value
  }
  const r = Math.hypot(x - HEARTH_X, z - HEARTH_Z)
  const gather = 0.8 * smoothstep(GATHER_OUTER_M, GATHER_INNER_M, r) * smoothstep(1.6, GATHER_INNER_M, r)
  return Math.max(wear, gather)
}

const SCORCH_LIP_M = 2.4
const SCORCH_OUTER_M = 9.5

/** Soot the hearth has burned into the floor around itself. 0..1. */
export function hearthScorchAt(x: number, z: number): number {
  const r = Math.hypot(x - HEARTH_X, z - HEARTH_Z)
  return smoothstep(SCORCH_OUTER_M, SCORCH_LIP_M, r)
}

const BASIN_RIM_M = 3.05
const BASIN_WET_BAND_M = 1.5

/** The permanently damp rim of the basin, and the short wet trail toward
 *  the hearth where water is carried. 0..1. */
export function basinWetAt(x: number, z: number): number {
  const r = Math.hypot(x - BASIN_X, z - BASIN_Z)
  const rim = bump(r - (BASIN_RIM_M - BASIN_WET_BAND_M / 2), BASIN_WET_BAND_M)
  const pool = smoothstep(BASIN_RIM_M, BASIN_RIM_M - 1.2, r)
  const trail = 0.45 * clamp01(1 - distanceToBowedPath(x, z, BASIN_X, BASIN_Z, HEARTH_X, HEARTH_Z, -1.4) / 0.9)
    * smoothstep(9, 3, r)
  return clamp01(Math.max(rim, pool) * 0.95 + trail)
}

// THE LEVELLING CUTS. The floor is not a slab, it is rock cut flat, and
// it was cut in strips across the hall. The lines between strips still
// show. They run at right angles to every desire line above — the one
// direction on the floor that was decided by tools and not by feet.
const CUT_RHYTHM_Z_M = [0, 2.4, 4.1, 6.7, 8.2, 11.0]
const CUT_RHYTHM_M = 13.4
const CUT_HALF_M = 0.16
const CUT_DEPTH_M = 0.009

export function levellingCutAt(z: number): number {
  const local = ((-z % CUT_RHYTHM_M) + CUT_RHYTHM_M) % CUT_RHYTHM_M
  let depth = 0
  for (const at of CUT_RHYTHM_Z_M) {
    for (const shift of [-CUT_RHYTHM_M, 0, CUT_RHYTHM_M]) {
      const d = CUT_DEPTH_M * bump(local - at - shift, CUT_HALF_M)
      if (d > depth) depth = d
    }
  }
  return depth
}
