// vehicle-shop/harvester/src/model/hullDetail.ts
// Deck plates, seams, seam lips and the deck's own edge trim — split out of
// hull.ts (I2 pass 3) to keep hull.ts under the 200-line cap once the
// nose-step taper (destination 1) and the widened seam lips (destination 3)
// landed. Also hosts the box/rbox mesh helpers hull.ts shares for its other
// parts, so there is one definition, not two. Pure geometry; no scene
// access, no crawler state.

import { BoxGeometry, Mesh, MeshStandardMaterial, Group, type BufferGeometry } from 'three'
import { BODY } from '../spec'
import { roundedBox } from './rounded'

export function box(
  geometries: BufferGeometry[], group: Group,
  w: number, h: number, d: number, mat: MeshStandardMaterial,
  x: number, y: number, z: number, name = ''
): void {
  const g = new BoxGeometry(w, h, d)
  geometries.push(g)
  const m = new Mesh(g, mat)
  m.name = name
  m.position.set(x, y, z)
  m.castShadow = true
  m.receiveShadow = true
  group.add(m)
}

export function rbox(
  geometries: BufferGeometry[], group: Group,
  w: number, h: number, d: number, radius: number, mat: MeshStandardMaterial,
  x: number, y: number, z: number, name = ''
): void {
  const g = roundedBox(w, h, d, radius)
  geometries.push(g)
  const m = new Mesh(g, mat)
  m.name = name
  m.position.set(x, y, z)
  m.castShadow = true
  m.receiveShadow = true
  group.add(m)
}

// Nose taper (destination 1, pass 3): the foremost deck plate's own TOP
// drops from BODY.deckTop toward the cutter — a clean step in the top
// silhouette that stays ABOVE the track housing's own top (spec
// TRACK.housing.yHigh = 11.0), the line below which every profile camera is
// occluded by the full-length pods (the pass-2 critic's finding, confirmed
// by re-measuring the pass-2 side.png skyline: it is dead flat, no seam or
// tier below y=11 reaches it). Only plate 0 (the nose-most, z < -14.75)
// steps: plate 1 carries the cab (spec CAB.zCenter = -8, halfDepth = 3.5,
// so it spans -11.5..-4.5, almost entirely plate 1's own span) and cab.ts
// assumes a flush BODY.deckTop meeting point — stepping plate 1 too would
// float the cab over a visible gap.
export const NOSE_DECK_STEPS: readonly number[] = [11.25]
export const deckTopAt = (i: number): number => (i < NOSE_DECK_STEPS.length ? NOSE_DECK_STEPS[i] : BODY.deckTop)

/** Exported (I6) so materials/deckSeams.ts can compute the deck's real plate
 *  stations from the same two numbers the geometry is built from, instead of
 *  re-asserting 48/5 as a literal the way machineryDetail.ts had to. */
export const SEAM_COUNT = 4
export const SEAM_WIDTH = 0.7
const SEAM_RECESS = 0.6
// Pass-3 (destination 3): lips widened/heightened so they read as nubs on
// the profile's TOP EDGE (silhouetted against the sky) — the pass-2
// 0.14m/0.3m lips measured invisible at render scale. Why the top edge is
// the only channel that can work: sampled the pass-2 side.png flank face
// directly (a row sweep across the whole hull) and it renders near-uniform
// near-black (RGB ~13-16) regardless of body vs dark material — a high sun
// leaves a vertical flank in deep self-shadow, so no seam recess or fill
// can show as a COLOUR break there; only geometry that changes the
// silhouette against the bright sky is visible.
//
// Deviation from the destination's illustrative "0.2-0.3m proud" figure,
// recorded here per the same rule that corrected destination 1's numbers:
// the deck's own edge TRIM (below, unchanged from pass 2) already stands
// 0.36m proud of each plate's top and runs the full length continuously —
// a "side" skyline scan of a first 0.28m-tall lip attempt (within the
// suggested range) showed ZERO pixel change anywhere, because the
// ever-present trim is taller and wins every column regardless of the
// lip's own height. A lip must clear 0.36m to ever reach the skyline at
// all; 0.5m gives a visible margin above it (verified below).
const SEAM_LIP_HEIGHT = 0.5
const SEAM_LIP_WIDTH = 0.6

export interface DeckResult {
  segLen: number
}

/** Deck plates (each may sit at its own stepped top), transverse seams with
 *  proud flanking lips, and the deck's own edge trim, which rides each
 *  plate's own top so the trim line steps with the taper instead of
 *  floating above (or burying into) a lowered plate.
 *
 *  I6 material wiring, no geometry: the seam LIPS and the edge trim take the
 *  sixth tone. The pass-3 note above explains why they are the only channel
 *  that can carry the deck's plate breaks at all — they are the parts that
 *  reach the skyline — and they spent five rounds the same near-black as the
 *  recessed seam they flank, so the proud nub and the sunk gap were one dark
 *  smear. Light lip / dark seam / light lip is the read the geometry was
 *  always shaped for. The seam INSET stays dark: it is the shadow. */
export function buildDeck(
  geometries: BufferGeometry[], group: Group,
  bodyMaterial: MeshStandardMaterial, darkMaterial: MeshStandardMaterial,
  length: number, noseZ: number, deckHalf: number,
  trimMaterial: MeshStandardMaterial = darkMaterial,
): DeckResult {
  const segLen = length / (SEAM_COUNT + 1)
  const halfGap = SEAM_WIDTH / 2

  for (let i = 0; i <= SEAM_COUNT; i++) {
    const start = noseZ + i * segLen + (i > 0 ? halfGap : 0)
    const end = noseZ + (i + 1) * segLen - (i < SEAM_COUNT ? halfGap : 0)
    const top = deckTopAt(i)
    rbox(geometries, group, deckHalf * 2, BODY.deckThickness, end - start, 1.0, bodyMaterial, 0, top - BODY.deckThickness / 2, (start + end) / 2, 'deckPlate')
  }

  for (let i = 1; i <= SEAM_COUNT; i++) {
    const seamZ = noseZ + i * segLen
    const topA = deckTopAt(i - 1)
    const topB = deckTopAt(i)
    const localTop = Math.min(topA, topB)
    const seamHeight = BODY.deckThickness - SEAM_RECESS
    const seamTop = localTop - SEAM_RECESS
    box(geometries, group, deckHalf * 2, seamHeight, SEAM_WIDTH, darkMaterial, 0, seamTop - seamHeight / 2, seamZ, 'deckSeam')
    // Proud lips flank the seam, each on ITS OWN side's plate top — at a
    // step boundary (topA !== topB) this reinforces the step itself; at a
    // level seam (topA === topB, the common case) it reproduces the
    // original symmetric nub.
    const lipOffset = halfGap + SEAM_LIP_WIDTH / 2
    box(geometries, group, deckHalf * 2, SEAM_LIP_HEIGHT, SEAM_LIP_WIDTH, trimMaterial, 0, topA + SEAM_LIP_HEIGHT / 2, seamZ - lipOffset, 'deckSeamLip')
    box(geometries, group, deckHalf * 2, SEAM_LIP_HEIGHT, SEAM_LIP_WIDTH, trimMaterial, 0, topB + SEAM_LIP_HEIGHT / 2, seamZ + lipOffset, 'deckSeamLip')
  }

  // Edge trim, per plate, riding that plate's own top.
  for (let i = 0; i <= SEAM_COUNT; i++) {
    const start = noseZ + i * segLen
    const end = noseZ + (i + 1) * segLen
    const ly = deckTopAt(i) + 0.18
    box(geometries, group, 0.5, 0.36, end - start, trimMaterial, -deckHalf + 0.05, ly, (start + end) / 2, 'deckTrim')
    box(geometries, group, 0.5, 0.36, end - start, trimMaterial, deckHalf - 0.05, ly, (start + end) / 2, 'deckTrim')
  }
  box(geometries, group, deckHalf * 2, 0.36, 0.5, trimMaterial, 0, deckTopAt(0) + 0.18, noseZ + 0.05, 'deckTrim')
  box(geometries, group, deckHalf * 2, 0.36, 0.5, trimMaterial, 0, deckTopAt(SEAM_COUNT) + 0.18, noseZ + length - 0.05, 'deckTrim')

  return { segLen }
}
