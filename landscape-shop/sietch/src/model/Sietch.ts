// landscape-shop/sietch/src/model/Sietch.ts
// R1 — massing and silhouette (landscape-shop/docs/gauntlet-loop.md):
// primary forms of a carved Fremen cavern hall, through CAMERA_RIG.
// Assembles the vault shell (envelope.ts), the far wall and its galleries
// (backWall.ts), the floor and its habitation cues (floor.ts) and the
// mouth collar (entrance.ts) from one shared PALETTE material set
// (materials.ts). Static: no update() — see contracts.ts. Group names
// 'massing', 'skirt', 'entrance' are the seam test's contract; keep them.

import { Group, Mesh, BoxGeometry, MeshStandardMaterial } from 'three'
import type { Object3D } from 'three'
import type { LandscapeModel } from '../contracts'
import { FOOTPRINT } from '../spec'
import { buildPalette } from './materials'
import { buildEnvelope } from './envelope'
import { buildBackWall } from './backWall'
import { buildFloor } from './floor'
import { buildEntrance } from './entrance'
import { buildGalleryTier } from './galleryTier'
import { buildDressing } from './dressing/Dressing'
import { vaultScaleAt } from './vaultScale'

// Pulled 1cm below y=0: a skirt top exactly coplanar with floor.ts's floor
// plane z-fights at grazing angles (visible as vertical streaks in
// drift-right.png before this fix). The bottom stays at exactly
// -skirtDepthM, so the seam test's min-y band is unaffected.
const SKIRT_TOP_GAP_M = 0.01

// R1.3 root-cause fix: the skirt used to be a CONSTANT-width box, but the
// vault it sits under tapers (vaultScaleAt) — narrowest at the back wall
// (z=0). Everywhere the vault is narrower than the box, the skirt's own
// top-outer edge peeked out past the tapered wall and read, at CAMERA_RIG's
// grazing angle, as "a thin diagonal hairline... a stray edge/backface/
// helper line" (fresh critic, R1.3 clay pass). Sizing the skirt to the
// vault's own narrowest point (its global minimum scale, at the back wall)
// guarantees it never pokes past the wall at ANY depth — measured off the
// same function the wall itself sweeps by, never a hardcoded guess.
const SKIRT_SCALE = vaultScaleAt(0)

function buildSkirt(materials: ReturnType<typeof buildPalette>): Mesh {
  const { widthM, depthM, skirtDepthM } = FOOTPRINT
  const height = skirtDepthM - SKIRT_TOP_GAP_M
  const geometry = new BoxGeometry(widthM * SKIRT_SCALE, height, depthM)
  const mesh = new Mesh(geometry, materials.stoneShadow)
  mesh.name = 'skirt'
  mesh.position.set(0, -skirtDepthM + height / 2, -depthM / 2)
  return mesh
}

export function createSietch(): LandscapeModel {
  const materials = buildPalette()

  const root = new Group()
  root.name = 'sietch'

  const massing = new Group()
  massing.name = 'massing'
  massing.add(buildEnvelope(materials).mesh)
  massing.add(buildBackWall(materials))
  root.add(massing)

  root.add(buildFloor(materials))
  root.add(buildSkirt(materials))
  root.add(buildEntrance(materials))
  root.add(buildGalleryTier(materials))
  // R3: the objects of habitation, in three named clusters. Its own three
  // materials (dressing/dressingMaterials.ts) are freed by the sweep
  // below, which disposes whatever material it finds on a mesh.
  root.add(buildDressing(materials).group)

  const meshes: Mesh[] = []
  root.traverse((child) => {
    const m = child as Object3D & { isMesh?: boolean }
    if (m.isMesh) meshes.push(child as unknown as Mesh)
  })

  return {
    root,
    dispose(): void {
      const disposedMaterials = new Set<MeshStandardMaterial>()
      for (const mesh of meshes) {
        mesh.geometry.dispose()
        const material = mesh.material as MeshStandardMaterial
        if (!disposedMaterials.has(material)) {
          material.dispose()
          disposedMaterials.add(material)
        }
      }
      // R2: three does NOT free a material's textures when the material
      // goes, so without this the DataTexture set leaks its GPU upload
      // every time a location is re-entered.
      for (const texture of materials.textures) texture.dispose()
      root.clear()
    },
  }
}
