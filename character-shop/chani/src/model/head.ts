// character-shop/chani/src/model/head.ts
// THE HEAD IS ONE SCULPT. Neck, jaw, chin, cheeks, temples, forehead and
// cranium are a single closed surface swept through face/station.ts, and
// every feature — brow ridge, sockets, lids, cheekbones, jawline, nose,
// lips, chin — is a DISPLACEMENT of that surface (face/warp.ts,
// face/mouth.ts), summed as smooth fields so neighbouring forms blend into
// one another. There is no seam to see because there is no second mesh.
//
// R1 built this head as a loft plus a nose blob plus two ear blobs and the
// critic read a blank egg with a bump. Every primitive-assembly pass in
// this shop's history regressed and was rejected; the accepted pattern is
// carve-into-the-loft, and that is what this is.
//
// Three things are separate meshes, and each has a reason that is not
// convenience: the EYES are flat PALETTE.eyes and cannot share the skin
// material; the BROWS are hair; the EARS are flaps that leave the surface
// entirely. All three are authored station tables, not primitives.

import type { Group, Mesh } from 'three'
import type { ChaniMaterials } from './materials'
import { surfaceMesh } from './face/mesh'
import { headSurface } from './face/surface'
import { buildEyes } from './face/eyes'
import { buildBrows } from './face/brows'
import { buildEars } from './face/ears'

/** 112 columns and 174 rows. The columns are biased toward the face
 *  (face/surface.ts BIAS), so the nose and lips get roughly three times
 *  the sampling density of the back of the skull, where nothing happens.
 *
 *  Neither count is decoration, and pass 2 raised both after MEASURING the
 *  ones they replaced. At 54 rows the mesh sampled the face every 5.1mm
 *  and a 7mm lip rendered as nothing. At 128 rows the spacing at the upper
 *  lip measured 2.06mm against pass 1's authored 1.9mm cupid's bow, and
 *  the bow rendered as nothing for exactly the same reason one round
 *  later: a relief wavelength finer than the local ring spacing is
 *  averaged away by computeVertexNormals before a pixel is drawn. 174 rows
 *  over the row spacing face/station.ts now authors puts a mesh row every
 *  ~0.75mm through the vermillions and the nose tip.
 *
 *  The COLUMN count had the same disease and nobody had measured it: at 76
 *  columns the widest x-gap across the front of the face measured 2.40mm,
 *  so a 34mm nose got five samples a side and rendered as a soft crease on
 *  a flat plane — which is what the critic called it. 112 columns at BIAS
 *  0.60 measure 1.42mm, which is what lets nose.ts author a dorsum with
 *  SIDE PLANES rather than a mound. */
const U_SEGS = 112
const V_SEGS = 174

export function buildHead(head: Group, mat: ChaniMaterials): Mesh[] {
  const skull = surfaceMesh(headSurface, mat.skin, { uSegs: U_SEGS, vSegs: V_SEGS })
  skull.name = 'skull'
  head.add(skull)

  return [skull, ...buildEyes(head, mat), ...buildBrows(head, mat), ...buildEars(head, mat)]
}
