// landscape-shop/sietch/src/model/dressing/dressingMaterials.ts
// Three materials for everything the R3 round adds, kept apart from the
// hall's own six (model/materials.ts) because they answer a different
// question: the hall is mapped rock, the dressing is flat-shaded objects
// that carry their colour per facet.
//
//   dressing  every object. vertexColors + flatShading: the tone a facet
//             was baked with IS its colour, and flat shading is what makes
//             a 300-triangle jar read as a turned pot instead of a blob.
//   ember     the brazier's coals, and only those. NOT a light — the
//             hearth PointLight is still the set's sole light source
//             (main.ts). This is the BODY that light finally comes out
//             of: R2's last critic could see a glow with nothing making
//             it, and an emissive surface at DRESSING.hearthColor is the
//             cheapest honest answer.
//   water     the pool. The one smooth, low-roughness surface in a hall
//             where everything else is rough rock — which is precisely
//             how a viewer reads "that is liquid" at this distance.
//
// No textures: nothing here is mapped, so there is nothing for dispose()
// to leak beyond the materials themselves.

import { DoubleSide, MeshStandardMaterial } from 'three'
import { DRESSING, PALETTE } from '../../spec'

// Objects are lit almost entirely by one warm point light a few metres
// away. Below ~0.7 the props start throwing specular hotspots that read
// as wet plastic; at 1.0 they lose the sheen that separates a glazed jar
// from the rock behind it.
const ROUGH_OBJECT = 0.86
// Still water under firelight: glossy enough to hold a highlight, never a
// mirror (there is no environment map in this scene to reflect).
const ROUGH_WATER = 0.22
// Coals, not a torch. Tuned against the hearth's own exposure: the point
// light already clips the floor within ~2 m, so the embers only have to
// be brighter than the metal around them, not brighter than the pool of
// light they sit in.
const EMBER_GLOW = 0.5

export interface DressingMaterials {
  dressing: MeshStandardMaterial
  ember: MeshStandardMaterial
  water: MeshStandardMaterial
  /** Every material this module owns, for the dispose sweep and for the
   *  guard that counts the family. */
  all: MeshStandardMaterial[]
}

export function buildDressingMaterials(): DressingMaterials {
  // DoubleSide throughout the props: decimation collapses thin frond
  // blades and mat edges into single-sided slivers, and a sliver seen
  // from its back face would simply vanish.
  const dressing = new MeshStandardMaterial({
    vertexColors: true, flatShading: true, side: DoubleSide, roughness: ROUGH_OBJECT,
  })
  const ember = new MeshStandardMaterial({
    vertexColors: true, flatShading: true, side: DoubleSide, roughness: 1,
    emissive: DRESSING.hearthColor, emissiveIntensity: EMBER_GLOW,
  })
  const water = new MeshStandardMaterial({
    color: PALETTE.water, side: DoubleSide, roughness: ROUGH_WATER, metalness: 0.15,
  })
  return { dressing, ember, water, all: [dressing, ember, water] }
}
