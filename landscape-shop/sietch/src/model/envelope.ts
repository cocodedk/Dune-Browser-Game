// landscape-shop/sietch/src/model/envelope.ts
// The vaulted cave shell: walls and ceiling swept the full depth of the
// hall by crossSection.ts's arch profile, scaled per-ring by
// vaultScaleAt(z) — a swell mid-hall, a lower shoulder near the back
// wall, a gentler taper at the mouth (R1 critic finding: a constant
// cross-section read as "uniform extrusion... bunker" rather than a
// carved hall). Lateral surface only (no floor, no end caps) — floor.ts
// and backWall.ts fill those in; entrance.ts collars the open mouth.

import { Mesh } from 'three'
import { buildVaultProfile } from './crossSection'
import { buildRuledTube } from './loftGeometry'
import { vaultScaleAt } from './vaultScale'
import { vaultAsymmetryAt } from './vaultAsymmetry'
import { FOOTPRINT } from '../spec'
import type { PaletteMaterials } from './materials'

export interface Envelope {
  mesh: Mesh
  halfWidth: number
  heightM: number
}

export function buildEnvelope(materials: PaletteMaterials): Envelope {
  const halfWidth = FOOTPRINT.widthM / 2
  const heightM = FOOTPRINT.heightM
  // One ring roughly every 2m of depth: smooth at the rig's viewing
  // distance without spending triangles the camera never resolves.
  const rings = Math.ceil(FOOTPRINT.depthM / 2) + 1
  const geometry = buildRuledTube(
    (z) => {
      const scale = vaultScaleAt(z)
      const asymmetry = vaultAsymmetryAt(z, FOOTPRINT.depthM)
      return buildVaultProfile(halfWidth * scale, heightM * scale, asymmetry).points
    },
    0, -FOOTPRINT.depthM, rings,
  )
  const mesh = new Mesh(geometry, materials.rock)
  mesh.name = 'envelopeShell'
  return { mesh, halfWidth, heightM }
}
