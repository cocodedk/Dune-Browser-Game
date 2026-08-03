// vehicle-shop/ornihopter/src/interior/crewPalette.test.ts
// ROUND 9d guard. Round 7's interior critic, unresolved through 9a-9c:
// "uniformly warm sage-olive ... no separation between inside and out" and
// "no second seat, no second yoke, no centre divider ... nothing implies a
// companion position." docs/apache-gauntlet.md's B2 wants "dark grey/black
// panel carrier against olive structure" and a legible second crew position.
// This mechanises both off the built meshes and materials.ts's own exported
// colours -- nothing here restates a hex materials.ts already owns.
//
// FAIL-FIRST, measured against the tree before this round: seat-copilot held
// cushion/trim boxes only -- 'seat-frame'/'seat-cushion'/'seat-strap' were
// not names anything in the tree carried, so every existence count below was
// 0 against a >=1 (or >=2) bar. 'coaming' and 'sill-rail' were likewise
// unnamed. The ratio check does not have a meaningful "before" number of its
// own: `armorMaterial` is new this round, so referencing it from the old
// tree throws (TypeError: make is not a function) rather than measuring
// something -- recorded as that, not dressed up as a numeric near-miss.
//
// THE PROXY, spelled out because a luminance number is meaningless
// undocumented: each material's own THREE.Color dotted with Rec.709 luma
// weights (0.2126/0.7152/0.0722) -- the exact formula apachePanel.test.ts's
// own luminance() helper already uses for its carrier-vs-body contrast
// check, in the SAME colour space (three r152+ stores Color components in
// LINEAR light after converting the sRGB hex literal on construction, so
// these numbers do not match a naive hex/255 calculation -- both guards
// agree regardless, because both read material.color directly rather than
// re-deriving it from the hex literal). EQUIPMENT = the console/dash body
// and face, the round-9b panel trio (carrier/bezel/key) and the new armor
// tone (coaming, sills, seat frames). STRUCTURE = the roof/wall liner plus
// the machined plate materials.ts's own top comment already names as "the
// cabin's structural tone". Both sides read straight off materials.ts's
// exported factories, never off a restated hex.

import { describe, it, expect, afterAll } from 'vitest'
import { Vector3, type Object3D, type MeshStandardMaterial } from 'three'
import { createCockpit } from './Cockpit'
import { seatX } from './layout'
import {
  consoleBodyMaterial, consoleFaceMaterial, panelCarrierMaterial, bezelMaterial,
  keyMaterial, armorMaterial, hullLinerMaterial, machinedMaterial,
} from './materials'

const cockpit = createCockpit()
const root = cockpit.root as unknown as Object3D
root.updateMatrixWorld(true)

afterAll(() => cockpit.dispose())

const EQUIPMENT = [
  consoleBodyMaterial, consoleFaceMaterial, panelCarrierMaterial, bezelMaterial,
  keyMaterial, armorMaterial,
]
const STRUCTURE = [hullLinerMaterial, machinedMaterial]

function allNamed(from: Object3D, name: string): Object3D[] {
  const found: Object3D[] = []
  from.traverse((child) => {
    if (child.name === name) found.push(child)
  })
  return found
}

/** sRGB relative luminance of a material's own colour -- see the file header
 *  for the proxy and why it matches apachePanel.test.ts's convention. */
function luminance(material: MeshStandardMaterial): number {
  const c = material.color
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b
}

function meanLuminance(factories: Array<() => MeshStandardMaterial>): number {
  const values = factories.map((make) => {
    const material = make()
    const value = luminance(material)
    material.dispose()
    return value
  })
  return values.reduce((a, b) => a + b, 0) / values.length
}

function materialOf(object: Object3D): MeshStandardMaterial {
  return (object as unknown as { material: MeshStandardMaterial }).material
}

describe('a second crew station at the copilot seat (B2, B4.5)', () => {
  const copilot = allNamed(root, 'seat-copilot')

  it('exists exactly once', () => {
    expect(copilot.length).toBe(1)
  })

  it('carries a visible frame distinct from the cushion (was: cushion boxes only)', () => {
    expect(allNamed(copilot[0], 'seat-frame').length).toBeGreaterThanOrEqual(1)
  })

  it('carries at least one cushion mesh, sitting at the mirrored seatX(1)', () => {
    // The seat GROUP itself sits at local (0,0,0); each part mesh carries the
    // seatX(side) offset individually (seats.ts's buildSeat) -- so "mirrored"
    // is measured on a part, not on the group's own transform.
    const cushions = allNamed(copilot[0], 'seat-cushion')
    expect(cushions.length).toBeGreaterThanOrEqual(1)
    const world = cushions[0].getWorldPosition(new Vector3())
    expect(world.x).toBeCloseTo(seatX(1), 10)
  })

  it('carries a crossed harness of at least 2 straps', () => {
    expect(allNamed(copilot[0], 'seat-strap').length).toBeGreaterThanOrEqual(2)
  })
})

describe('two tonal families: dark equipment vs olive structure (B2)', () => {
  it('the equipment family sits at or below 0.55x the structure family (measured)', () => {
    const equipmentMean = meanLuminance(EQUIPMENT)
    const structureMean = meanLuminance(STRUCTURE)
    const ratio = equipmentMean / structureMean
    const report = `ratio ${ratio.toFixed(3)} (equip ${equipmentMean.toFixed(4)}, structure ${structureMean.toFixed(4)})`
    expect(ratio <= 0.55 ? report : `OVER 0.55 -- ${report}`).toBe(report)
  })
})

describe('the tub reads as a distinct dark band, not olive structure (B2)', () => {
  it('the coaming and both side sills sample into the dark equipment family', () => {
    const coamings = allNamed(root, 'coaming')
    const sills = allNamed(root, 'sill-rail')
    expect(coamings.length).toBeGreaterThanOrEqual(1)
    expect(sills.length).toBeGreaterThanOrEqual(2)
    const structureMean = meanLuminance(STRUCTURE)
    const offenders = [...coamings, ...sills]
      .map((mesh) => ({ name: mesh.name, lum: Number(luminance(materialOf(mesh)).toFixed(4)) }))
      .filter((entry) => entry.lum >= structureMean * 0.55)
    expect(offenders).toEqual([])
  })
})
