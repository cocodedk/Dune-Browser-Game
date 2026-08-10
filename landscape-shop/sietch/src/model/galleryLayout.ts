// landscape-shop/sietch/src/model/galleryLayout.ts
// Where the three galleries are, on its own so the R2 surface layer can
// read it without importing backWall.ts (which imports the material
// family, which imports the surface layer — a cycle). backWall.ts
// re-exports both names, so every existing importer, seam.test.ts
// included, is unaffected.
//
// Placement is deliberately UNEVEN, never a metered row (R1 critic,
// twice): two openings clustered left-of-centre at floor level with a
// narrow rock pier between them, one set higher on the right over a
// stepped rock ramp (galleryRamp.ts).

import { GALLERIES } from '../spec'
import type { GalleryLayout } from './galleryRecess'

/** The plane the back-wall cap sits in — 4 m in front of the tube's own
 *  open end, leaving GALLERIES.recessM for real sockets behind it. */
export const CAP_Z = -4

export const GALLERY_LAYOUT: GalleryLayout[] = [
  { name: 'galleryLeftA', x: -11, baseY: 0, width: GALLERIES.widthM, height: GALLERIES.heightM },
  { name: 'galleryLeftB', x: -5.5, baseY: 0, width: GALLERIES.widthM, height: GALLERIES.heightM },
  { name: 'galleryRightHigh', x: 9, baseY: 2.4, width: GALLERIES.widthM, height: GALLERIES.heightM },
]
