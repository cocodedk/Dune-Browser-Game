// src/game-render/modes/conversation/figureSilhouette.ts
// Pure geometry: the outer edge of whatever covers the head, per headgear.
//
// CharacterCard's rim light used to trace a fixed hood-shaped ellipse no
// matter what the figure actually wore, so a bare head or a helm got a rim
// light floating well outside its own silhouette — the "halo" bug. This
// gives each headgear its own approximate outer radius so the rim light
// (and its clip) can hug the shape that is actually drawn.

import type { PortraitDef } from '../../../data/portraits'
import { jawWidth } from './figureFaceLayout'

export interface SilhouetteRadii {
  rx: number
  ry: number
  /** Vertical offset of the silhouette's centre from headY. */
  offsetY: number
}

export function headSilhouette(def: PortraitDef, headR: number): SilhouetteRadii {
  switch (def.headgear) {
    case 'hood':
      // Matches the two ellipses figureHeadgear.ts's drawHood actually fills.
      return { rx: headR * 1.16, ry: headR * 1.28, offsetY: -headR * 0.06 }
    case 'helm':
      // ry is solved against the drawn crest, not guessed. figureHelm puts the
      // crest top at -1.24R and the dome apex at -1.22R, so from a centre at
      // -0.42R the radius that lands on the crown is 1.24 - 0.42 = 0.82. At
      // 1.32 the rim ellipse topped out at -1.74R and hung half a head-radius
      // of lit accent colour over bare backdrop — the exact floating-halo bug
      // this module exists to remove, and worse than the fixed hood ellipse it
      // replaced. Cheek guards still reach wider than the bare jaw.
      return { rx: jawWidth(headR, def.jaw) * 1.3, ry: headR * 0.82, offsetY: -headR * 0.42 }
    case 'cap':
      // Same solve: drawCap's crown is an ellipse at cy -0.5R with ry 0.46R,
      // so it tops out at -0.96R and the radius from -0.12R is 0.84.
      return { rx: jawWidth(headR, def.jaw) * 1.05, ry: headR * 0.84, offsetY: -headR * 0.12 }
    case 'scarf':
      return { rx: jawWidth(headR, def.jaw) * 1.1, ry: headR * 1.3, offsetY: headR * 0.15 }
    case 'bare':
    default:
      return { rx: jawWidth(headR, def.jaw) * 1.05, ry: headR * 0.98, offsetY: 0 }
  }
}
