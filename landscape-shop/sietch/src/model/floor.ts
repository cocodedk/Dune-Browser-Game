// landscape-shop/sietch/src/model/floor.ts
// The walkable base: a floor strip at y = 0 that tapers with the vault
// (vaultScaleAt(z) — the same function envelope.ts sweeps by, so the
// floor's edge always lands under the wall instead of poking past it),
// a hearth lip at DRESSING.hearthAtM and a basin depression at
// DRESSING.basinAtM. The centre strip (x near 0) stays flat — the seam
// test's floor-flatness guard walks that line, and a worn floor IS flat:
// R2 puts everything the feet did into the map, not the mesh.
//
// R2 UV: world-planar, (x + widthM/2) / widthM by -z / depthM, so the
// floor map (surface/maps.ts) is authored in true metres. The desire
// lines between the mouth, the hearth, the galleries and the stair are
// baked at their real world positions — move DRESSING.hearthAtM and they
// move with it.
//
// R1.3: the corner-hugging side ledges (LEDGE_CENTER_Z_M = -28, +-16m out)
// are GONE — a fresh critic caught them clipped by the frame at all four
// corners in every view (they sat right at the CAMERA_RIG frustum's own
// edge, so they could only ever half-show). The composition doesn't need
// them; galleryTier.ts carries the "walkable, human-scaled" cue instead.

import { Group, Mesh, CylinderGeometry } from 'three'
import { FOOTPRINT, DRESSING } from '../spec'
import { buildRuledTube } from './loftGeometry'
import { vaultScaleAt } from './vaultScale'
import { RING_COUNT } from './surface/carvedProfile'
import { buildHearthStone } from './hearthStone'
import type { PaletteMaterials } from './materials'

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
// measurable change to the floor's walkable extent. R2 keeps the inset:
// carvedProfile.ts gates its displacement to zero at the floor corners
// precisely so this margin survives the carving.
const FLOOR_EDGE_INSET_M = 0.04

function basinDepression(materials: PaletteMaterials): Mesh {
  const [x, , z] = DRESSING.basinAtM
  const mesh = new Mesh(
    new CylinderGeometry(BASIN_RADIUS_M, BASIN_RADIUS_M * 0.85, 0.02, 20),
    materials.stoneShadow,
  )
  mesh.name = 'basinDepression'
  mesh.position.set(x, -BASIN_DEPTH_M, z)
  return mesh
}

function taperedFloorStrip(materials: PaletteMaterials): Mesh {
  const geometry = buildRuledTube(
    (z) => {
      const hw = (FOOTPRINT.widthM / 2 - FLOOR_EDGE_INSET_M) * vaultScaleAt(z)
      const v = -z / FOOTPRINT.depthM
      const u = (x: number): number => (x + FOOTPRINT.widthM / 2) / FOOTPRINT.widthM
      // Points run RIGHT to LEFT, the opposite of every other ring in the
      // set. buildRuledTube winds so the surface faces a tube's interior,
      // which for a two-point ring swept along -Z put the floor's normal
      // at (0, -1, 0): measured, and it meant the FrontSide floor was
      // invisible from above and what the render actually showed was the
      // skirt's top face underneath it. Reversing the ring reverses the
      // winding and the floor faces up, which is also what makes its
      // lighting correct rather than merely visible.
      return {
        points: [{ x: hw, y: 0 }, { x: -hw, y: 0 }],
        uv: [[u(hw), v], [u(-hw), v]] as Array<[number, number]>,
      }
    },
    0, -FOOTPRINT.depthM, RING_COUNT,
  )
  const mesh = new Mesh(geometry, materials.floor)
  mesh.name = 'floorPlane'
  return mesh
}

export function buildFloor(materials: PaletteMaterials): Group {
  const group = new Group()
  group.name = 'floor'

  group.add(taperedFloorStrip(materials))
  // R3 FINAL: the lip is now an irregular hand-set hearth stone
  // (hearthStone.ts), not a lathed disc — see that module for why.
  group.add(buildHearthStone(materials))
  group.add(basinDepression(materials))

  return group
}
