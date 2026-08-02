// vehicle-shop/ornihopter/src/interior/mfdFaces.ts
// The two MFD pages and the up-front display strip, painted into DataTextures
// by faceBaker.ts. See that file for why this is not a canvas.
//
// WHAT A PAGE HAS TO SURVIVE. Each screen lands 214px wide at head pitch 0 and
// 240px at pitch 12 in the 1600x1000 pilot capture (docs/apache-gauntlet.md B3
// wants >= 140), measured by projecting the built mesh through the pilot camera
// — so a page has about a thumbnail to say what it is: a route leg with
// waypoints and an ownship symbol on one, a stack of bar gauges with limit
// marks on the other. Anything finer than about four texels — small type, dense
// grids — dissolves at that size and is only cost.
//
// BRIGHTNESS IS CAPPED ON PURPOSE. B3 also asks that luminance > 215 form
// exactly ONE connected region in the frame (the cockpit's dome light). A
// screen painted with 255-white lines and lit through an emissiveMap becomes a
// second one and fails that line. MEASURED on the round-9b capture: an ownship
// symbol at [196,202,186] (luminance 199) rendered ABOVE 215 and made two extra
// regions at pitch 0 and three at pitch 12, against the baseline's one. Nothing
// here now exceeds luminance ~155, which leaves the dome light the only region
// over the bar. Lit avionics, not a lightbox.

// ROUND 9f MADE TWO OF THEM LIVE, which is what the pages were built for: the
// map is TRACK-UP, so its terrain and its route turn under a fixed ownship as
// the craft turns, and its heading band scrolls with the compass; the systems
// page's top three bars are throttle, speed and altitude rather than decorative
// fill fractions. mfdLive.ts owns the repaint and its cadence — these stay pure
// painters that take a reading and return a colour, so a page can be asserted
// without a renderer.

import type { DataTexture } from 'three'
import { bakeFace, segmentDistance, type Painter, type RGB } from './faceBaker'
import type { HudReading } from '../hud/reading'

const SIZE = 128
export const MFD_SIZE = SIZE

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v))

const VOID: RGB = [8, 15, 13]
const GRID: RGB = [24, 44, 37]
const CONTOUR: RGB = [44, 72, 52]
const RING: RGB = [38, 78, 68]
const ROUTE: RGB = [186, 118, 196]
const WAYPOINT: RGB = [172, 150, 74]
const OWNSHIP: RGB = [150, 156, 142]
const BAND: RGB = [16, 27, 24]
const TICK: RGB = [120, 142, 122]

const TRACK: RGB = [30, 41, 35]
const GREEN: RGB = [68, 168, 92]
const AMBER: RGB = [180, 142, 58]
const RED: RGB = [180, 70, 55]
const LABEL: RGB = [118, 140, 118]
const TEXT: RGB = [140, 158, 136]

/** Screen surround: every page is a lit rectangle inside its own dark edge, so
 *  the face never bleeds into the bezel it sits in. */
function edge(nx: number, ny: number): RGB | undefined {
  if (Math.abs(nx) > 0.95 || Math.abs(ny) > 0.95) return VOID
  return undefined
}

const LEGS: ReadonlyArray<readonly [number, number, number, number]> = [
  [-0.62, -0.86, -0.18, -0.16],
  [-0.18, -0.16, 0.26, 0.34],
  [0.26, 0.34, 0.12, 0.74],
]
const WAYPOINTS: ReadonlyArray<readonly [number, number]> = [
  [-0.18, -0.16],
  [0.26, 0.34],
  [0.12, 0.74],
]

/** Diamond (rotated square) test — the standard waypoint symbol, and cheaper
 *  and crisper at this resolution than any circle. */
function diamond(nx: number, ny: number, cx: number, cy: number, r: number): boolean {
  return Math.abs(nx - cx) + Math.abs(ny - cy) < r
}

/**
 * The moving-map page: heading band across the top, terrain contours, two
 * range rings about the ownship symbol, and a magenta route with waypoint
 * diamonds — the shapes a stranger reads as "navigation display" before they
 * read any of the numbers on it.
 */
export function movingMapPainter(r: HudReading): Painter {
  // Track-up: the world rotates under a fixed ownship. One rotation applied to
  // the sampling coordinate turns the whole map — route, waypoints, terrain —
  // for the price of a sin and a cos per page rather than per element.
  const rad = (r.headingDeg * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const shipY = -0.34

  return (nx, ny) => {
    const border = edge(nx, ny)
    if (border) return border
    // Heading band: 1.6 units of nx*100 per degree, so the ticks scroll at the
    // rate the craft actually turns, under a fixed lubber line.
    if (ny > 0.76) {
      if (Math.abs(nx) < 0.035) return OWNSHIP
      if (Math.abs(((nx * 100 + 2000 - r.headingDeg * 1.6) % 16) - 8) < 1.6) return TICK
      return BAND
    }
    // Ownship first: it is the one symbol that does NOT turn.
    const up = ny - shipY
    if (up > -0.06 && up < 0.16 && Math.abs(nx) < 0.09 - up * 0.4) return OWNSHIP
    for (const radius of [0.42, 0.78]) {
      if (Math.abs(Math.hypot(nx, ny - shipY) - radius) < 0.012) return RING
    }
    const dy = ny - shipY
    const wx = nx * cos - dy * sin
    const wy = nx * sin + dy * cos + shipY
    for (const [ax, ay, bx, by] of LEGS) {
      if (segmentDistance(wx, wy, ax, ay, bx, by) < 0.035) return ROUTE
    }
    for (const [px, py] of WAYPOINTS) {
      if (diamond(wx, wy, px, py, 0.09) && !diamond(wx, wy, px, py, 0.05)) return WAYPOINT
    }
    // Terrain: two interfering waves thresholded into contour lines, which
    // gives closed irregular loops rather than the graph paper a plain grid
    // would read as. The 1.25 multiplier is measured off the capture, not
    // chosen: at 3 the loops were 3px apart on screen and read as scribble.
    const field = Math.sin(wx * 4.2 + wy * 1.4) + Math.cos(wy * 3.6 - wx * 0.9)
    if (Math.abs(((field * 1.25 + 30) % 1) - 0.5) < 0.07) return CONTOUR
    if (Math.abs(((wx * 100 + 2000) % 25) - 12.5) < 1) return GRID
    if (Math.abs(((wy * 100 + 2000) % 25) - 12.5) < 1) return GRID
    return VOID
  }
}

/** Bar rows: centre y, fill fraction 0..1, red limit fraction, colour. The top
 *  three are LIVE — throttle, speed, altitude — and the bottom two are the
 *  hydraulic/electrical rows that this shop has no state for and does not
 *  invent one for. The divisors are the craft's own working range: 70 m/s and
 *  260 m put cruise near two thirds of each bar, where a gauge is readable. */
function bars(r: HudReading): ReadonlyArray<readonly [number, number, number, RGB]> {
  return [
    [0.46, clamp01(r.throttle), 0.9, GREEN],
    [0.16, clamp01(r.speed / 70), 0.88, GREEN],
    [-0.14, clamp01(r.altitude / 260), 0.86, AMBER],
    [-0.44, 0.52, 0.92, GREEN],
    [-0.74, 0.73, 0.9, GREEN],
  ]
}

/**
 * The engine/systems page: a titled stack of horizontal bar gauges, each with
 * a track, a fill and a red limit mark, plus a label block at the left of every
 * row. This is the page that makes the pair read as a SYSTEM rather than as two
 * copies of the same picture.
 */
export function systemsPagePainter(r: HudReading): Painter {
  const rows = bars(r)
  return (nx, ny) => {
    const border = edge(nx, ny)
    if (border) return border
    if (ny > 0.76) {
      if (Math.abs(((nx * 100 + 200) % 14) - 7) < 3 && Math.abs(ny - 0.85) < 0.05) return TEXT
      return BAND
    }
    for (const [cy, fill, limit, colour] of rows) {
      if (Math.abs(ny - cy) > 0.1) continue
      if (nx < -0.62) return Math.abs(ny - cy) < 0.045 ? LABEL : BAND
      const t = (nx + 0.58) / 1.46
      if (Math.abs(t - limit) < 0.02) return RED
      return t < fill ? colour : TRACK
    }
    return VOID
  }
}

/**
 * The up-front display strip: three rows of data blocks over a dark field —
 * radio and nav readouts at the top of the panel, where the AH-64E's UFD sits.
 * Painted as blocks rather than glyphs because at this size glyphs are mush.
 */
export function ufdStripTexture(): DataTexture {
  return bakeFace(SIZE, (nx, ny) => {
    const border = edge(nx, ny)
    if (border) return border
    const row = Math.floor((1 - ny) * 1.5)
    const blocky = Math.abs(((nx * 100 + 400) % 22) - 11) < 6.5
    const inRow = Math.abs(((1 - ny) * 1.5 - row) - 0.45) < 0.24
    if (blocky && inRow) return row === 1 ? AMBER : TEXT
    return VOID
  })
}
