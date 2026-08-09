// landscape-shop/sietch/src/model/entrance.ts
// The mouth: a short collar sweeping the SAME per-z scaled profile as
// envelope.ts (vaultScale.ts) for the front-most 2m, so it lands flush on
// the envelope's own mouth ring rather than mismatching its (now tapered)
// size. Never expanded past the envelope's own scale at that z, so it can
// never push the footprint's max X past FOOTPRINT.widthM — the seam test
// measures the whole root, and the entrance's own front face has to land
// exactly on FOOTPRINT.depthM (seam.test.ts: entranceMinZ ~= rootMinZ).

import { Group, Mesh } from 'three'
import { buildVaultProfile } from './crossSection'
import { buildRuledTube } from './loftGeometry'
import { vaultScaleAt } from './vaultScale'
import { vaultAsymmetryAt } from './vaultAsymmetry'
import { FOOTPRINT } from '../spec'
import type { PaletteMaterials } from './materials'

const COLLAR_DEPTH_M = 2

export function buildEntrance(halfWidth: number, heightM: number, materials: PaletteMaterials): Group {
  const group = new Group()
  group.name = 'entrance'

  const zFront = -FOOTPRINT.depthM
  const zBack = zFront + COLLAR_DEPTH_M
  const geometry = buildRuledTube(
    (z) => {
      const scale = vaultScaleAt(z)
      const asymmetry = vaultAsymmetryAt(z, FOOTPRINT.depthM)
      return buildVaultProfile(halfWidth * scale, heightM * scale, asymmetry).points
    },
    zFront, zBack, 3,
  )
  const collar = new Mesh(geometry, materials.rockGlowlit)
  collar.name = 'entranceCollar'
  group.add(collar)

  return group
}
