// vehicle-shop/harvester/src/model/materials/deckSeams.ts
// Where the deck's plates actually begin and end, and what UV a point on the
// deck lands on. This is the bridge that makes "the panel lines follow the
// machine's real construction" a checkable claim rather than a hope:
// deckSeams.test.ts walks the seam stations computed HERE — from hullDetail's
// own SEAM_COUNT and SEAM_WIDTH, the numbers buildDeck() lays the geometry
// out with — into the body map built by maps.ts, and asserts the texture is
// dark there and clean at the plate centres.
//
// THE TOP-FACE V CONVENTION, measured off the real geometry rather than
// assumed (see plateTexel.ts's header for the probe): on both BoxGeometry and
// RoundedBoxGeometry the top face runs v = 1 at the -Z (nose) edge down to
// v = 0 at the +Z (tail) edge. RoundedBoxGeometry then spends about 8.6% of
// that range on each 1 m corner shoulder, which topV() models exactly rather
// than smoothing over: a test that assumed a linear face would put the seam
// stations in the wrong texels and pass anyway.

import { BODY } from '../../spec'
import { SEAM_COUNT, SEAM_WIDTH } from '../hullDetail'

export const DECK_PLATE_COUNT = SEAM_COUNT + 1
export const DECK_LENGTH = BODY.tailZ - BODY.noseZ
export const DECK_SEG_LEN = DECK_LENGTH / DECK_PLATE_COUNT
/** buildDeck() pulls each plate back from its nominal station by half the
 *  seam's width, which is what opens the recessed gap between plates. */
export const SEAM_HALF_GAP = SEAM_WIDTH / 2
const HALF_GAP = SEAM_HALF_GAP
/** Corner radius buildDeck() rounds every plate with. */
const PLATE_RADIUS = 1.0

/** The transverse seam stations, nose to tail: the z values where one deck
 *  plate ends and the next begins. */
export function deckSeamStations(): number[] {
  const stations: number[] = []
  for (let i = 1; i <= SEAM_COUNT; i++) stations.push(BODY.noseZ + i * DECK_SEG_LEN)
  return stations
}

/** Plate `index`'s own z span, gaps included — the box buildDeck() builds. */
export function deckPlateSpan(index: number): readonly [number, number] {
  const start = BODY.noseZ + index * DECK_SEG_LEN + (index > 0 ? HALF_GAP : 0)
  const end = BODY.noseZ + (index + 1) * DECK_SEG_LEN - (index < SEAM_COUNT ? HALF_GAP : 0)
  return [start, end]
}

/** Which plate covers world z, or -1 in a seam gap or off the deck. */
export function deckPlateAt(z: number): number {
  for (let i = 0; i < DECK_PLATE_COUNT; i++) {
    const [start, end] = deckPlateSpan(i)
    if (z >= start && z <= end) return i
  }
  return -1
}

/** The v a point `along` metres from a face's -Z edge lands on, for a face of
 *  total length `len` rounded at radius `r`. The two shoulders take
 *  arcUv = 0.5 * (pi*r/2) / (pi*r/2 + len - 2r) of the axis each; the flat
 *  middle shares the rest linearly. Reproduces RoundedBoxGeometry's own
 *  getUv() for the only case this shop needs. */
export function topV(along: number, len: number, r: number): number {
  const arc = (Math.PI * r) / 2
  const flat = Math.max(len - 2 * r, 0)
  const arcUv = (0.5 * arc) / (arc + flat)
  if (along <= r) return 1 - (along / r) * arcUv
  if (along >= len - r) return ((len - along) / r) * arcUv
  return 1 - arcUv - ((along - r) / flat) * (1 - 2 * arcUv)
}

/** The v of world z on the top face of the deck plate covering it. Throws
 *  rather than guessing when z is in a gap: a test that silently sampled the
 *  wrong plate would be worse than one that failed. */
export function deckTopV(z: number): number {
  const index = deckPlateAt(z)
  if (index < 0) throw new Error(`z=${z} is not on a deck plate`)
  const [start, end] = deckPlateSpan(index)
  return topV(z - start, end - start, PLATE_RADIUS)
}
