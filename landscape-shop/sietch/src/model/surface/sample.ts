// landscape-shop/sietch/src/model/surface/sample.ts
// WHAT THE ROCK LOOKS LIKE AT A WORLD POINT. Every map this round bakes
// goes through one of the three functions below, so a course, a stain or
// a worn line lands at the same world position on whichever surface it
// crosses. Colour is mixed only within PALETTE's own family — there is no
// hue in this set that spec.ts did not name.
//
// The height each function returns is in METRES and is negative into the
// rock; bake.ts differentiates it into the normal map. It is deliberately
// only the FINE relief: everything a silhouette would show is real
// geometry (surface/carvedProfile.ts), and doubling it here would read as
// a surface arguing with its own shape.

import { Color } from 'three'
import { PALETTE, FOOTPRINT } from '../../spec'
import { bedToneAt, beddingLiftAt, partingDepthAt } from './bedding'
import { fluteDepthAt, sweepToneAt } from './carveSweep'
import { SPRING_FADE_M, springHeightAt } from './carvedProfile'
import { blockToneAt } from './leftBlocks'
import { smokeStainAt } from './smoke'
import { handPolishAt } from './handWear'
import { basinWetAt, footPathAt, hearthScorchAt, levellingCutAt } from './floorWear'
import { dressingDepthAt, dressingShadeAt } from './wallFace'
import { clamp01, mix, smoothstep } from './curves'

const ROCK = new Color(PALETTE.rock)
const SHADOW = new Color(PALETTE.rockShadow)
const GLOW = new Color(PALETTE.rockGlowlit)
const WATER = new Color(PALETTE.water)
const SOOT = new Color(PALETTE.rockShadow).multiplyScalar(0.34)

export interface RockSample {
  r: number
  g: number
  b: number
  roughness: number
  /** Metres; negative is into the rock. */
  height: number
}

type Rgb = [number, number, number]

/** -1 walks PALETTE.rock toward rockShadow, +1 toward rockGlowlit. */
function toneColor(tone: number): Rgb {
  const target = tone >= 0 ? GLOW : SHADOW
  const w = Math.min(1, Math.abs(tone))
  return [mix(ROCK.r, target.r, w), mix(ROCK.g, target.g, w), mix(ROCK.b, target.b, w)]
}

function blend(c: Rgb, target: Color, w: number): Rgb {
  return [mix(c[0], target.r, w), mix(c[1], target.g, w), mix(c[2], target.b, w)]
}

/** Height above which a point is vault rather than wall — the sweeps and
 *  the quarry blocks hand over to each other across this band. */
const VAULT_LO_Y_M = 5.0
const VAULT_HI_Y_M = 9.5

const SHELL_ROUGH = 0.99
const POLISH_ROUGH_DROP = 0.30

/** The swept vault and the quarried side walls: one continuous surface,
 *  two carving families crossfaded by height. */
export function sampleShell(x: number, y: number, z: number): RockSample {
  const t = clamp01(-z / FOOTPRINT.depthM)
  const vault = smoothstep(VAULT_LO_Y_M, VAULT_HI_Y_M, y)
  const side: -1 | 1 = x < 0 ? -1 : 1

  const lift = beddingLiftAt(x, z, FOOTPRINT.depthM)
  // t goes to bedToneAt as well as to bedProudAt: a course that has run
  // out (beds.ts) or been trimmed back at the collar must stop being
  // PAINTED there too, or the albedo prints a band the rock does not have
  // — the exact lie the R2 critic caught on the back wall.
  // ...and the bed tone stops where the bed relief stops. carvedProfile.ts
  // fades the courses out below the springing — the vault above was swept,
  // not quarried — and painting them on up there would put a stripe on
  // rock with no step under it, which is the lie this round exists to
  // remove.
  const springY = springHeightAt(z, x)
  const bedFade = 1 - smoothstep(springY - SPRING_FADE_M, springY, y)
  const tone = bedToneAt(y, lift, t) * bedFade +
    sweepToneAt(t) * vault + blockToneAt(side, t, y) * (1 - vault)
  const polish = handPolishAt(x, y, z)
  const stain = smokeStainAt(x, y, z)

  let colour = toneColor(Math.max(-1, Math.min(1, tone)))
  colour = blend(colour, GLOW, 0.22 * polish)
  colour = blend(colour, SOOT, stain)

  const roughness = clamp01(
    SHELL_ROUGH - 0.09 * Math.max(0, tone) + 0.04 * Math.max(0, -tone)
    - POLISH_ROUGH_DROP * polish + 0.04 * stain,
  )
  const height = -partingDepthAt(y, lift, t) - fluteDepthAt(x, y)
  return { r: colour[0], g: colour[1], b: colour[2], roughness, height }
}

/** The dressed back-wall face at z = CAP_Z. Same courses as the shell —
 *  that continuity is the point — crossed by its own vertical strokes. */
export function sampleWall(x: number, y: number, z: number): RockSample {
  const t = clamp01(-z / FOOTPRINT.depthM)
  const polish = handPolishAt(x, y, z)
  const stain = smokeStainAt(x, y, z)
  const stroke = dressingShadeAt(x, y)
  const lift = beddingLiftAt(x, z, FOOTPRINT.depthM)

  let colour = toneColor(Math.max(-1, Math.min(1, bedToneAt(y, lift, t) - 0.04 * stroke)))
  colour = blend(colour, GLOW, 0.32 * polish)
  colour = blend(colour, SOOT, stain)

  const roughness = clamp01(SHELL_ROUGH + 0.04 * stroke - POLISH_ROUGH_DROP * polish + 0.04 * stain)
  const height = -partingDepthAt(y, lift, t) - dressingDepthAt(x, y)
  return { r: colour[0], g: colour[1], b: colour[2], roughness, height }
}

const FLOOR_BASE_TONE = -0.34
/** floorWear.ts's own cut depth, so `cut` below is a clean 0..1. */
const LEVELLING_CUT_DEPTH_M = 0.009
const FLOOR_ROUGH = 0.99
const PATH_ROUGH_DROP = 0.54
const WET_ROUGH = 0.26

/** The walkable strip. Nothing here comes from bedding — a floor is a cut
 *  plane through the courses, not a face of them — so its whole story is
 *  the levelling cuts the tools left and the wear the feet added. */
export function sampleFloor(x: number, z: number): RockSample {
  const cut = levellingCutAt(z) / LEVELLING_CUT_DEPTH_M
  const path = footPathAt(x, z)
  const scorch = hearthScorchAt(x, z)
  const wet = basinWetAt(x, z)

  let colour = toneColor(FLOOR_BASE_TONE + 0.85 * path - 0.45 * cut)
  colour = blend(colour, SOOT, 0.55 * scorch)
  colour = blend(colour, WATER, 0.55 * wet)

  const roughness = clamp01(
    FLOOR_ROUGH - PATH_ROUGH_DROP * path - WET_ROUGH * wet + 0.03 * scorch,
  )
  const height = -levellingCutAt(z) - 0.005 * path
  return { r: colour[0], g: colour[1], b: colour[2], roughness, height }
}
