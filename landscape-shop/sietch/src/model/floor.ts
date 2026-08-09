// landscape-shop/sietch/src/model/floor.ts
// The walkable base: a floor strip at y = 0 that tapers with the vault
// (vaultScaleAt(z) — the same function envelope.ts sweeps by, so the
// floor's edge always lands under the wall instead of poking past it),
// a hearth lip at DRESSING.hearthAtM and a basin depression at
// DRESSING.basinAtM (empty this round: shape only, no water). The centre
// strip (x near 0) stays flat — the seam test's floor-flatness guard
// walks that line.
//
// R1.3: the corner-hugging side ledges (LEDGE_CENTER_Z_M = -28, +-16m out)
// are GONE — a fresh critic caught them clipped by the frame at all four
// corners in every view (they sat right at the CAMERA_RIG frustum's own
// edge, so they could only ever half-show). The composition doesn't need
// them; the new galleryTier.ts carries the "walkable, human-scaled"
// habitation cue instead.

import { Group, Mesh, CylinderGeometry } from 'three'
import { FOOTPRINT, DRESSING } from '../spec'
import { buildRuledTube } from './loftGeometry'
import { vaultScaleAt } from './vaultScale'
import type { PaletteMaterials } from './materials'

const HEARTH_RADIUS_M = 2.2
const HEARTH_LIP_HEIGHT_M = 0.35

const BASIN_RADIUS_M = 3
const BASIN_DEPTH_M = 0.35

// R1.3: the floor's own outer edge used to land EXACTLY on the wall's own
// base vertex (both `(widthM/2) * vaultScaleAt(z)`, the same formula) —
// coincident geometry a fresh critic read as "a thin diagonal hairline...
// a stray edge/backface/helper line" in the clay pass (two unwelded
// meshes sharing one 3D line, each with a different normal, z-fight at
// the grazing view angle CAMERA_RIG happens to see that seam from).
// Pulling the floor in by a few centimetres leaves the wall's OWN shell
// (which already reaches y=0 at its base — envelope.ts has no floor cap)
// as the sole surface along that sliver: same rock tone, no seam, no
// measurable change to the floor's walkable extent.
const FLOOR_EDGE_INSET_M = 0.04

function hearthLip(materials: PaletteMaterials): Mesh {
  const [x, , z] = DRESSING.hearthAtM
  const mesh = new Mesh(
    new CylinderGeometry(HEARTH_RADIUS_M, HEARTH_RADIUS_M * 1.1, HEARTH_LIP_HEIGHT_M, 16),
    materials.rockGlowlit,
  )
  mesh.name = 'hearthLip'
  mesh.position.set(x, HEARTH_LIP_HEIGHT_M / 2, z)
  return mesh
}

function basinDepression(materials: PaletteMaterials): Mesh {
  const [x, , z] = DRESSING.basinAtM
  const mesh = new Mesh(
    new CylinderGeometry(BASIN_RADIUS_M, BASIN_RADIUS_M * 0.85, 0.02, 20),
    materials.rockShadow,
  )
  mesh.name = 'basinDepression'
  mesh.position.set(x, -BASIN_DEPTH_M, z)
  return mesh
}

function taperedFloorStrip(materials: PaletteMaterials): Mesh {
  const rings = Math.ceil(FOOTPRINT.depthM / 2) + 1
  const geometry = buildRuledTube(
    (z) => {
      const hw = (FOOTPRINT.widthM / 2 - FLOOR_EDGE_INSET_M) * vaultScaleAt(z)
      return [{ x: -hw, y: 0 }, { x: hw, y: 0 }]
    },
    0, -FOOTPRINT.depthM, rings,
  )
  const mesh = new Mesh(geometry, materials.rock)
  mesh.name = 'floorPlane'
  return mesh
}

export function buildFloor(materials: PaletteMaterials): Group {
  const group = new Group()
  group.name = 'floor'

  group.add(taperedFloorStrip(materials))
  group.add(hearthLip(materials))
  group.add(basinDepression(materials))

  return group
}
