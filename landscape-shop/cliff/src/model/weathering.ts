// landscape-shop/cliff/src/model/weathering.ts
// What a few thousand years of Arrakis does to a course of rock once
// model/strata.ts has said which course it is. Five named agents, each one
// directional and each one with a reason a geologist would give:
//
//   WIND      Prevailing wind runs along +Z. MEASURED, not chosen: the
//             harness ground (main.ts) stretches its dunes 3.2x along Z, so
//             the crests run long across X — and a transverse dune's crest
//             lies across the wind. Wind therefore blows down the Z axis,
//             and the massif's front (-Z) wall is the WINDWARD face: the one
//             both camera rigs look at is the one the sand has polished.
//             Windward rock is bleached and smoothed; lee rock keeps its
//             dark, sharp fracture.
//   VARNISH   Desert varnish — manganese and clay, decades per micron. It
//             only survives where nothing scours it off, so it collects on
//             high, up-facing, sheltered rock: the crests and plateaus.
//   SAND      Blown sand settles on every up-facing ledge low on the wall,
//             and the drift at the foot buries the lowest courses outright.
//             This is what seats the massif IN the desert instead of on it.
//   GRIME     Under an overhang the rock never gets rinsed or blasted: it
//             stays dark.
//   SCARS     Where a block let go, the rock behind it is fresh and pale and
//             carries no varnish at all — and the block is lying at the foot
//             directly below. model/scars.ts pins each scar to a real debris
//             mass in the bake, so the pairing is a fact, not a decoration.
//
// EVERY BOUNDARY IS STEPPED (see beddedHeight). R2's first pass faded each
// agent smoothly with height, and the landing critic read the result as "a
// blur pass that ignores all form edges ... no rock-like edges". Weather does
// not fade smoothly down a cliff: it stops where a harder bed stops it.

import { PALETTE } from '../spec'
import { hexRgb, mix, type Rgb } from './rockRamp'
import { COURSE_M } from './strata'
import { scarAt } from './scars'

export interface Point {
  x: number
  y: number
  z: number
}

/** Unit vector the wind TRAVELS along. Mostly +Z (see the header); the small
 *  +X skew keeps flute and polish off the mirror line, and the slight
 *  downward tilt puts the strongest scour on the upper wall, where a real
 *  prevailing wind spills over the crest. */
export const WIND: Point = normalize({ x: 0.28, y: -0.1, z: 0.95 })

// R2.1 widened the value spread these mix toward. Through the harness's own
// light and 900 m of fog an albedo move of one third lands as about five
// levels of 255, so a "subtle" stain is not subtle — it is invisible.
const POLISH = hexRgb(0xcbbb98)
const VARNISH = hexRgb(0x241a10)
const SAND = hexRgb(PALETTE.sandApron)
const DRIFT = hexRgb(0xb99668)
const FRESH = hexRgb(0xcdbf9f)

function normalize(v: Point): Point {
  const length = Math.hypot(v.x, v.y, v.z) || 1
  return { x: v.x / length, y: v.y / length, z: v.z / length }
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

function scale(c: Rgb, k: number): Rgb {
  return [c[0] * k, c[1] * k, c[2] * k]
}

/** The height every weathering boundary is measured at: the point's own
 *  height snapped to a bedding line, with a lateral wander along the wall.
 *  Two consequences, both deliberate. The edge of a stain lands ON a bed
 *  contact instead of wherever a smooth falloff happened to reach, and the
 *  line it draws there is broken and stepped rather than a clean curve —
 *  which is the difference between weathered rock and an airbrush. */
export function beddedHeight(p: Point, step = COURSE_M): number {
  // ALONG THE WALL ONLY, and slowly — 60 m and 300 m wavelengths, so the
  // wander moves less than a meter across any one facet. A first pass wandered
  // with DEPTH as well, and on relief that swings 13 m in z the rounding then
  // flipped back and forth between neighbouring facets: measured on the shot,
  // that came out as a two-level dither across the prow, which is a worse
  // artifact than the smooth falloff it replaced.
  const wander = 3 * Math.sin(p.x * 0.055 + 1.4) + 1.8 * Math.sin(p.x * 0.021 - 2.2)
  return Math.round((p.y + wander) / step) * step
}

/** How square-on this face stands to the wind, 1 windward and 0 lee. */
export function windwardness(n: Point): number {
  return clamp01(-(n.x * WIND.x + n.y * WIND.y + n.z * WIND.z))
}

export function leewardness(n: Point): number {
  return clamp01(n.x * WIND.x + n.y * WIND.y + n.z * WIND.z)
}

/** THE FLUTE FIELD — one wind-scour rhythm, shared by the whole set. 1 in the
 *  bottom of a scoop, 0 on the rib between two. model/prowRelief.ts cuts the
 *  prow's geometry on exactly this function, and the varnish streaks below
 *  stain exactly these grooves, so the carved shape and the stain that
 *  collects in it are the same form rather than two patterns crossing.
 *  The ribs lean with the bedding: scour eats out the softer beds and runs
 *  along them.
 *
 *  Shaped toward its own ends rather than left as a bare sine: a sine spends
 *  most of its span half-way between groove and rib, which paints a wash. */
export function fluteGrooveAt(p: Point): number {
  const raw = 0.5 - 0.5 * Math.sin(flutePhase(p.x, p.y))
  return raw * raw * (3 - 2 * raw)
}

export function flutePhase(x: number, y: number): number {
  return (x + 0.42 * y) * 0.262 + 0.9 * Math.sin(y * 0.045)
}

/** Fraction of this face that is dark desert varnish.
 *
 *  TWO forms, because one of them is invisible from the rig that matters. The
 *  PLATEAU term is varnish lying on high, up-facing, sheltered rock; measured
 *  against the approach rig it contributes almost nothing, because that camera
 *  sits at y = 90 and looks UP at a 190 m crest, so every plateau top is
 *  edge-on. The STREAK term is the one a person sees: dust-laden runoff
 *  spilling over the rim stains long dark tails down the wall below it, and it
 *  runs down the flute grooves because that is where the water goes. */
export function varnishAt(p: Point, n: Point): number {
  const h = beddedHeight(p)
  const up = clamp01(n.y)
  const plateau = Math.pow(up, 1.3) * smoothstep(45, 125, h)
    // Scoured rock cannot hold varnish, so windward faces keep less of it.
    * (1 - 0.35 * windwardness(n))
  const streak = clamp01(-n.z) * smoothstep(42, 140, h) * fluteGrooveAt(p)
  return clamp01(Math.max(plateau, streak))
}

/** Blown sand lying on this face: ledge dust low on the wall, plus the drift
 *  banked against the foot that the skirt apron rises out of. The drift term
 *  is what makes the massif sit IN the desert — it carries the ground's own
 *  colour up onto the lowest courses and dies out well under the gate, so the
 *  mouth still opens in rock. Stepped on the FULL course, like the varnish:
 *  a half-course step measured badly on the shot, because the prow samples
 *  three rows to a course, so a 4.75 m quantum falls every one-and-a-half
 *  rows and beats against the lattice into a facet-scale plaid. A 9.5 m
 *  quantum is exactly three rows and lands on the bed lines instead. */
export function sandAt(p: Point, n: Point): number {
  const h = beddedHeight(p)
  const ledge = Math.pow(clamp01(n.y), 2) * (1 - smoothstep(6, 64, h))
  // Deepened with R2.1's banding. The members now swing about 0.4 of
  // luminance between a chalk course and an iron one, and the lowest courses
  // of all are hero-plane rock (the skirt), so whichever member happens to
  // land there used to decide whether the base read lighter than the wall
  // above it. A drift that genuinely buries the foot decides it instead —
  // which is also what the base of a desert scarp looks like.
  const drift = Math.pow(smoothstep(24, -12, h), 1.15)
  return clamp01(0.6 * ledge + drift)
}

/** Soot and wear around the sietch gate: generations of traffic in and out,
 *  cook-smoke leaning out of the mouth. `halo` is 1 on the rock touching the
 *  aperture and 0 well clear of it (model/surface.ts measures it off
 *  gateWall.ts's own socketRadius). Its job is optical as much as narrative:
 *  a hole cut into flat rock reads as a decal, and a graded rim is what tells
 *  the eye the opening is carved into something. */
const SOOT = hexRgb(0x3d2f22)

/** The full surface colour of one point of rock: its course, then the agents
 *  in the order they act on real rock — polish and shadow first, varnish on
 *  top of that, sand over everything, the gate's soot where it reaches, and
 *  the scars last because fresh rock is by definition what nothing has got to
 *  yet. */
export function weather(course: Rgb, p: Point, n: Point, halo = 0): Rgb {
  const windward = windwardness(n)
  let c = mix(course, POLISH, 0.3 * Math.pow(windward, 1.2))
  c = scale(c, 1 - 0.14 * leewardness(n))
  c = scale(c, 1 - 0.3 * Math.pow(clamp01(-n.y), 1.3))
  c = mix(c, VARNISH, 0.78 * varnishAt(p, n))
  c = mix(c, mix(SAND, DRIFT, 0.5), 0.9 * sandAt(p, n))
  c = scale(mix(c, SOOT, 0.34 * halo), 1 - 0.08 * halo)
  // A scar is fresher than WHATEVER it broke out of, which is why it both
  // mixes toward fresh rock AND lifts. Mixing alone was enough while every
  // member was a shade of the same brown; against R2.1's chalk members a
  // pale target has nothing left to add, and the three scars measured 1.09
  // against their own walls — invisible. The lift is what keeps the contrast
  // a ratio rather than a hope.
  const fresh = scarAt(p, n)
  return scale(mix(c, FRESH, 0.72 * fresh), 1 + 0.42 * fresh).map(clamp01) as Rgb
}
