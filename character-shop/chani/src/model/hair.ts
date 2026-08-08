// character-shop/chani/src/model/hair.ts
// Loose dark curls with real volume, hood DOWN — spec.ts COSTUME.head, and
// a recognition feature in its own right. The build is two parts and the
// split is deliberate:
//
//   1. hairShell.ts — the base mass over scalp, temples and nape, whose
//      front line crosses the forehead AT the hairline so the transition
//      is a tangency rather than an edge.
//   2. hairCurls.ts — twenty-two named curl masses, mirrored in pairs, that
//      break the outline and give the interior enough authored form to
//      hold a value step. Overlapping masses are what make an outline read
//      as curly; a single shell cannot do it at any radius.
//
// Both are exact mirror pairs. Real hair is not symmetric, but R1's
// pass-4 critic read a symmetric collar as an asymmetric lump under a
// one-sided key light, and a measurable mirror is worth more here than a
// naturalism nobody can verify.

import type { Group, Mesh } from 'three'
import type { ChaniMaterials } from './materials'
import { buildShell } from './hairShell'
import { buildCurls } from './hairCurls'

export function buildHair(head: Group, mat: ChaniMaterials): Mesh[] {
  return [buildShell(head, mat), ...buildCurls(head, mat)]
}
