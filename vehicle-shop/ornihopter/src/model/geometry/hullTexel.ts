// vehicle-shop/ornihopter/src/model/geometry/hullTexel.ts
// What one texel of the hull's skin looks like. hullWeathering.ts owns the
// buffers and the DataTexture objects; this file owns the look, so neither is
// over 200 lines and the palette can be re-read without wading through
// texture plumbing.
//
// PALETTE AND CONTRAST STRUCTURE. The two prints of this kit contradict each
// other on colour — docs/dune_ornihopter_kit-2.png is light grey filament,
// docs/dune_ornihopter_kit-3.png is black and grey — which proves filament is
// not colour authority. So the family stays the accepted pale bone/tan (a
// desert craft has to separate from sand at noon; an earlier round measured
// this and had to be pushed brighter), but the CONTRAST STRUCTURE is taken
// from the close-up: darker inset panel faces, LIGHTER raised trim along the
// seams between them, a dark belly, dark grilles, and a pale deck.
//
// That inverts the usual "pale panel, dark seam" recipe, and deliberately: on
// the close-up the trim strips catch the light and the panel fields sit back
// from them. A thin crevice line still runs down the middle of each trim band,
// so the seam reads as a real gap between two raised strips rather than a
// painted stripe.
//
// Deterministic: every "noise" value is a fixed sine hash of its texel
// coordinate, never Math.random(). A non-deterministic material makes every
// render-vs-reference comparison a moving target.

import { HULL_U_MAX, UV_COLUMNS, UV_ROWS, GRILLE_U, NOSE_U, MACHINERY_U } from './hullUv'

export type Rgb = readonly [number, number, number]

const BONE: Rgb = [201, 193, 173]
const TRIM: Rgb = [235, 229, 211]
const INSET: Rgb = [154, 148, 130]
const FLANK: Rgb = [138, 132, 116]
const KEEL: Rgb = [94, 90, 78]
const OLIVE: Rgb = [113, 112, 92]
const SLOT: Rgb = [46, 45, 40]
const DIRT: Rgb = [84, 76, 58]

/** Ring panel indices, matching hullCrossSection.ts's documented point order. */
const DECK_PANEL = 2
const KEEL_PANEL = 6
const LOWER_FLANK_PANELS = [5, 7]
/** u range of the four WING_ROOTS bays — stations 8..12 of 20 across HULL_U_MAX. */
const WING_ROW_U: readonly [number, number] = [(HULL_U_MAX * 8) / 20, (HULL_U_MAX * 12) / 20]

/** Transverse seams are drawn only every Nth bay, never on all twenty.
 *  MEASURED, first render: a seam on every bay boundary put a line across the
 *  hull roughly every 1.1m, which at capture distance read as scales or a
 *  corrugated roof rather than as plating — "dense generic panelling", the
 *  exact thing the close-up's few-large-trapezoids language is not. Every
 *  seam still lands ON a real bay boundary, so painted lines and geometric
 *  facet edges still agree; there are simply a third as many of them.
 *  Longitudinal seams stay on every panel boundary, because those ARE the
 *  section's hard edges — chine, deck edge, keel edge. */
const SEAM_EVERY_BAYS = 3

// In cell units, either side of a drawn seam. Measured at 0.2: the trim then
// covered 40% of every panel band and washed the whole craft pale, losing the
// panel-field-versus-trim contrast it exists to create. 0.12 leaves the field
// dominant and the trim a strip.
const TRIM_HALF_WIDTH = 0.12
const CREVICE_HALF_WIDTH = 0.03

export function hash01(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return s - Math.floor(s)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function lerpRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]
}

export interface Texel {
  albedo: Rgb
  roughness01: number
}

/** Distance to the nearest cell boundary, in cell units (0 = on the boundary). */
function boundaryDistance(coord: number): number {
  const frac = coord % 1
  return Math.min(frac, 1 - frac)
}

/** The base tone of a hull cell before trim, inset and grime are applied. */
function bandTone(panel: number, col: number): Rgb {
  if (panel === KEEL_PANEL) return KEEL
  if (LOWER_FLANK_PANELS.includes(panel)) return FLANK
  if (panel === DECK_PANEL) return lerpRgb(BONE, TRIM, 0.45)
  // A few LARGE inset fields rather than per-cell noise: the hash is taken per
  // DRAWN panel, so an inset spans the whole run between two seams and reads
  // as one big trapezoid, which is the close-up's panel language.
  return hash01(Math.floor(col / SEAM_EVERY_BAYS), panel) > 0.5 ? INSET : BONE
}

/** The lofted skin: panel fields, raised trim, chine grime, wing-row wear. */
function hullTexel(u: number, v: number): Texel {
  const col = (u / HULL_U_MAX) * UV_COLUMNS
  const row = v * UV_ROWS
  const panel = Math.min(UV_ROWS - 1, Math.floor(row))
  // Distance to the nearest DRAWN transverse seam, still expressed in single
  // bay units so the trim keeps the same width whatever SEAM_EVERY_BAYS is.
  const colSeam = boundaryDistance(col / SEAM_EVERY_BAYS) * SEAM_EVERY_BAYS
  const seam = Math.min(colSeam, boundaryDistance(row))

  const base = bandTone(panel, Math.floor(col))
  const onTrim = seam < TRIM_HALF_WIDTH
  const onCrevice = seam < CREVICE_HALF_WIDTH
  let albedo = onCrevice ? SLOT : onTrim ? lerpRgb(TRIM, base, seam / TRIM_HALF_WIDTH) : base

  // Grime: heaviest right at the chines (the v = 0 and v = 5/8 point rows,
  // where the section's hard edges shed dirt downward), around the wing-root
  // bays, and in the crevices generally.
  const chine = Math.min(Math.abs(v - 0), Math.abs(v - 0.625), Math.abs(v - 1))
  const chineDirt = Math.max(0, 1 - chine / 0.09) * 0.45
  const inWingRow = u >= WING_ROW_U[0] && u <= WING_ROW_U[1]
  const wingDirt = inWingRow && panel === DECK_PANEL ? 0.4 : 0
  const crevice = Math.max(0, 1 - seam / (TRIM_HALF_WIDTH * 1.4)) * 0.3
  const mottle = hash01(Math.floor(u * 23), Math.floor(v * 17)) > 0.78 ? 0.22 : 0
  const grain = hash01(Math.floor(u * 512), Math.floor(v * 512)) * 0.07
  const dirt = Math.min(1, chineDirt + wingDirt + crevice + mottle + grain)

  albedo = lerpRgb(albedo, DIRT, dirt * (onCrevice ? 0.4 : 0.34))
  if (inWingRow && panel === DECK_PANEL && !onTrim) albedo = lerpRgb(albedo, OLIVE, 0.55)
  const roughness01 = Math.min(1, (onTrim ? 0.44 : 0.62) + dirt * 0.38)
  return { albedo, roughness01 }
}

/** Fine vertical-rib intake grille — hullGreebles.ts points the flank intakes
 *  at this island. Ribs run along v, which is the long axis of that face. */
function grilleTexel(u: number, v: number): Texel {
  const edge = Math.min(u - GRILLE_U[0], GRILLE_U[1] - u) / (GRILLE_U[1] - GRILLE_U[0])
  if (edge < 0.08) return { albedo: TRIM, roughness01: 0.42 }
  const rib = (v * 15) % 1
  const inSlot = rib < 0.52
  const shade = hash01(0, Math.floor(v * 15)) * 0.12
  return inSlot
    ? { albedo: lerpRgb(SLOT, DIRT, shade), roughness01: 0.95 }
    : { albedo: lerpRgb(lerpRgb(BONE, TRIM, 0.3), DIRT, shade), roughness01: 0.5 }
}

/** The blunt nose face plate: two stacked horizontal slots, per the close-up. */
function noseTexel(u: number, v: number): Texel {
  const edge = Math.min(u - NOSE_U[0], NOSE_U[1] - u) / (NOSE_U[1] - NOSE_U[0])
  const inSlot = (v > 0.335 && v < 0.435) || (v > 0.565 && v < 0.665)
  if (inSlot && edge > 0.18) return { albedo: SLOT, roughness01: 0.95 }
  if (edge < 0.1) return { albedo: lerpRgb(TRIM, DIRT, 0.15), roughness01: 0.5 }
  return { albedo: lerpRgb(BONE, INSET, 0.5), roughness01: 0.6 }
}

/** One texel's albedo and roughness, anywhere in the layout. */
export function texelAt(u: number, v: number): Texel {
  if (u < HULL_U_MAX) return hullTexel(u, v)
  if (u < GRILLE_U[1]) return grilleTexel(u, v)
  if (u < NOSE_U[1]) return noseTexel(u, v)
  const grain = hash01(Math.floor(u * 512), Math.floor(v * 512)) * 0.16
  if (u < MACHINERY_U[1]) return { albedo: lerpRgb(OLIVE, SLOT, grain), roughness01: 0.72 }
  return { albedo: lerpRgb(TRIM, DIRT, grain * 0.6), roughness01: 0.46 }
}
