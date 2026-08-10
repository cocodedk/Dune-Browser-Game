// landscape-shop/sietch/src/model/envelope.ts
// The vaulted cave shell: walls and ceiling swept the full depth of the
// hall by the CARVED cross-section (surface/carvedProfile.ts) — R1's arch
// profile scaled per-ring by vaultScaleAt(z), then pushed inward by the
// three named carving families (bedding courses, blade-sweep ridges,
// unquarried wall blocks). Lateral surface only (no floor, no end caps) —
// floor.ts and backWall.ts fill those in; entrance.ts collars the mouth.
//
// R2 UV: U is arc length round the carved section (0 at the left floor
// corner, 1 at the right), V is depth into the hall measured from the
// back wall. Both are world-anchored, which is what lets
// surface/bake.ts's maps be baked by sampling the real geometry instead
// of guessing where a feature lands.

import { Mesh } from 'three'
import { buildRuledTube } from './loftGeometry'
import { carvedRingAt, RING_COUNT } from './surface/carvedProfile'
import { FOOTPRINT } from '../spec'
import type { PaletteMaterials } from './materials'

export interface Envelope {
  mesh: Mesh
  halfWidth: number
  heightM: number
}

// R2.1: the shell is finished with crease normals, not a flat average —
// see creasedGrid.ts. 30 degrees sits between the arch's own facets (a
// few degrees apart, and they must stay smooth or the vault reads as a
// polygon) and a bedding course's riser (50 degrees and up, and it must
// keep its edge or the course reads as a ripple). entrance.ts sweeps the
// same profile with the same value so the two meshes shade alike where
// they overlap.
export const SHELL_CREASE_DEG = 30

export function buildEnvelope(materials: PaletteMaterials): Envelope {
  const halfWidth = FOOTPRINT.widthM / 2
  const heightM = FOOTPRINT.heightM
  const geometry = buildRuledTube(
    (z) => {
      const ring = carvedRingAt(z)
      const v = -z / FOOTPRINT.depthM
      return { points: ring.points, uv: ring.u.map((u): [number, number] => [u, v]) }
    },
    0, -FOOTPRINT.depthM, RING_COUNT, SHELL_CREASE_DEG,
  )
  const mesh = new Mesh(geometry, materials.shell)
  mesh.name = 'envelopeShell'
  return { mesh, halfWidth, heightM }
}
