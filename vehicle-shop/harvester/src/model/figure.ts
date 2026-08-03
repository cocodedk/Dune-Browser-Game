// vehicle-shop/harvester/src/model/figure.ts
// A single standing crew figure (I5, immediate-improvements.md §7) — a
// scale cue, not a character. Silhouette only: legs, head and torso,
// stacked to exactly FIGURE.height (1.8m, an average adult) standing on the
// deck plane beside the cab. Reads spec.BODY/CAB only; no scene access.
// Built standalone so machinery.ts (which places it on the deck) stays
// under the 200-line cap.
//
// I5 pass 2: the round critic found the all-dark figure invisible in the
// cab's shadow at zoom. Verified by crop (see progress.md): in the `cab`
// view the figure's own screen position falls right across the inboard
// rail's horizontal bar — dark silhouette against a dark bar, no edge to
// read; in `hero` it is a barely-there sliver. Position is kept (moving it
// closer to the cab leaves under 0.2m clearance against the cab's own
// widest point, its glass side panel at x=-5.85 — too tight to risk). The
// torso is now ACCENT (rust brown) instead of dark — the fix that holds
// regardless of what happens to sit behind it on screen, sanctioned by this
// round as a stillsuit read, not a colour pop.

import { Group, type BufferGeometry, type MeshStandardMaterial } from 'three'
import { BODY, CAB } from '../spec'
import { box } from './hullDetail'

/** Position beside the cab (CAB.zCenter = -8), PORT of its halfWidth (5.5) —
 *  the sunlit, camera-facing flank at the `hero`/`cab` views' negative
 *  azimuths (views.mjs: "NEGATIVE azimuths are the port side ... those
 *  flanks read lit"). Placing the figure on the far starboard side would
 *  hide it behind the cab's own bulk in exactly the two views the round
 *  needs it visible in. */
export const FIGURE = {
  height: 1.8,
  x: -7.0,
  z: CAB.zCenter,
} as const

const LEG_H = 0.9
const TORSO_H = 0.58
const HEAD_H = FIGURE.height - LEG_H - TORSO_H

export interface FigureParts {
  group: Group
  dispose(): void
}

/** One 1.8m standing silhouette. The correctness question I5 must answer:
 *  does the machine read huge because THIS is genuinely 1.8m against the
 *  12m deck, not because the cue itself shrank to fit.
 *  accentMaterial (rust brown) carries the torso only — a stillsuit jacket,
 *  not a colour pop — legs and head stay dark. */
export function buildFigure(darkMaterial: MeshStandardMaterial, accentMaterial: MeshStandardMaterial): FigureParts {
  const group = new Group()
  group.name = 'figure'
  const geometries: BufferGeometry[] = []
  const deck = BODY.deckTop

  box(geometries, group, 0.5, LEG_H, 0.3, darkMaterial, FIGURE.x, deck + LEG_H / 2, FIGURE.z, 'figureLegs')
  box(geometries, group, 0.6, TORSO_H, 0.35, accentMaterial, FIGURE.x, deck + LEG_H + TORSO_H / 2, FIGURE.z, 'figureTorso')
  box(geometries, group, 0.32, HEAD_H, 0.32, darkMaterial, FIGURE.x, deck + LEG_H + TORSO_H + HEAD_H / 2, FIGURE.z, 'figureHead')

  return {
    group,
    dispose() {
      for (const g of geometries) g.dispose()
    },
  }
}
