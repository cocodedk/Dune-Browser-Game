// landscape-shop/sietch/src/dressingFigures.test.ts
// R4 — THE FIGURES. Split out of dressing.test.ts at the 200-line rule
// (mirrors that file's own split from dressingBake.test.ts). Figures are
// found by the bake's own sourceUrl field — dressingBake.test.ts guards
// that it is set for exactly the figure pieces and null for the Desert
// Kingdom 23 — so this file never drifts out of sync with which pieces
// are figures without a name list to maintain by hand.

import { describe, it, expect } from 'vitest'
import { Box3, Vector3 } from 'three'
import type { Mesh, Object3D } from 'three'
import { createSietch } from './model/Sietch'
import { DRESSING_BAKE } from './model/dressing/Dressing'
import { DRESSING as SPEC_DRESSING } from './spec'

// "Nobody stands IN the fire" — horizontal (X-Z) clearance from a figure's
// own centre to DRESSING.hearthAtM. The fire's light column, not its
// footprint, is what a figure must stay clear of.
const HEARTH_FIRE_CLEARANCE_M = 1.5
const FIGURE_HEIGHT_RANGE_M: [number, number] = [1.5, 1.95]

function figurePieces() {
  return DRESSING_BAKE.pieces.filter((p) => p.sourceUrl != null)
}

describe('R4: the human figures stand clear of the fire, at a real human height', () => {
  it('keeps every figure at least 1.5 m (X-Z) from the hearth fire', () => {
    const set = createSietch()
    const root = set.root as unknown as Object3D
    root.updateMatrixWorld(true)
    const figures = figurePieces()
    expect(figures.length).toBeGreaterThanOrEqual(2)

    const [hearthX, , hearthZ] = SPEC_DRESSING.hearthAtM
    for (const piece of figures) {
      const mesh = root.getObjectByName(piece.name) as Mesh | undefined
      expect(mesh, `${piece.name} is not in the scene`).toBeTruthy()
      const centre = new Box3().setFromObject(mesh as Mesh).getCenter(new Vector3())
      const d = Math.hypot(centre.x - hearthX, centre.z - hearthZ)
      expect(d, `${piece.name} is ${d.toFixed(2)} m from the hearth fire`)
        .toBeGreaterThanOrEqual(HEARTH_FIRE_CLEARANCE_M)
    }
    set.dispose()
  })

  it('stands each figure between 1.5 and 1.95 m tall, as built', () => {
    const set = createSietch()
    const root = set.root as unknown as Object3D
    root.updateMatrixWorld(true)
    const figures = figurePieces()

    for (const piece of figures) {
      const mesh = root.getObjectByName(piece.name) as Mesh | undefined
      expect(mesh, `${piece.name} is not in the scene`).toBeTruthy()
      const box = new Box3().setFromObject(mesh as Mesh)
      const height = box.max.y - box.min.y
      expect(height, `${piece.name} stands ${height.toFixed(2)} m tall`)
        .toBeGreaterThanOrEqual(FIGURE_HEIGHT_RANGE_M[0])
      expect(height, `${piece.name} stands ${height.toFixed(2)} m tall`)
        .toBeLessThanOrEqual(FIGURE_HEIGHT_RANGE_M[1])
    }
    set.dispose()
  })
})
