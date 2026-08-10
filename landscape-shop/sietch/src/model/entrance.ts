// landscape-shop/sietch/src/model/entrance.ts
// The mouth: a short collar sweeping the SAME carved profile as
// envelope.ts (surface/carvedProfile.ts) for the front-most 2 m, so it
// lands flush on the envelope's own mouth ring rather than mismatching
// its size or its carving. Never expanded past the envelope's own scale
// at that z, so it can never push the footprint's max X past
// FOOTPRINT.widthM — the seam test measures the whole root, and the
// entrance's own front face has to land exactly on FOOTPRINT.depthM
// (seam.test.ts: entranceMinZ ~= rootMinZ).
//
// The collar sits BEHIND CAMERA_RIG (the rig stands at z = -40, the
// collar at z = -52..-50), so it is structure and seam-guard anchor, not
// something the round's look depends on. Its rings match the envelope's
// own ring spacing so the two meshes share vertex depths exactly — R2.1
// moved that spacing from 0.667 m to 0.5 m (carvedProfile.RING_COUNT), so
// 4 rings became 5. Left at 4 the two coincident surfaces would no longer
// share depths and would z-fight along the whole collar.

import { Group, Mesh } from 'three'
import { buildRuledTube } from './loftGeometry'
import { carvedRingAt } from './surface/carvedProfile'
import { SHELL_CREASE_DEG } from './envelope'
import { FOOTPRINT } from '../spec'
import type { PaletteMaterials } from './materials'

const COLLAR_DEPTH_M = 2
const COLLAR_RINGS = 5

export function buildEntrance(materials: PaletteMaterials): Group {
  const group = new Group()
  group.name = 'entrance'

  const zFront = -FOOTPRINT.depthM
  const zBack = zFront + COLLAR_DEPTH_M
  const geometry = buildRuledTube(
    (z) => {
      const ring = carvedRingAt(z)
      const v = -z / FOOTPRINT.depthM
      return { points: ring.points, uv: ring.u.map((u): [number, number] => [u, v]) }
    },
    zFront, zBack, COLLAR_RINGS, SHELL_CREASE_DEG,
  )
  const collar = new Mesh(geometry, materials.shell)
  collar.name = 'entranceCollar'
  group.add(collar)

  return group
}
