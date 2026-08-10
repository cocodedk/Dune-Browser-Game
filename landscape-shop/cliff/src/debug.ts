// landscape-shop/cliff/src/debug.ts
// The capture handle tools/shoot.mjs drives. Landscape sets are static
// (contracts.ts) so this only needs a rig switch and a clay-material
// override for the pure silhouette read, unlike a character shop's
// pose/viewpoint surface.

import { Box3, Color, DoubleSide, Mesh, MeshStandardMaterial, Vector3 } from 'three'
import type { Fog, FogExp2, Material, Object3D, PerspectiveCamera, Scene } from 'three'
import type { LandscapeModel } from './contracts'
import { CAMERA_RIGS } from './spec'

export type RigName = keyof typeof CAMERA_RIGS

export interface CliffMeasurement {
  widthM: number
  heightM: number
  depthM: number
  meshes: number
  triangles: number
}

export interface DebugHandle {
  setRig(name: RigName): void
  setClay(on: boolean): void
  measure(): CliffMeasurement
  rigs(): typeof CAMERA_RIGS
}

interface Deps {
  camera: PerspectiveCamera
  scene: Scene
  model: LandscapeModel
  groundMaterial: MeshStandardMaterial
}

export function installDebugHandle({ camera, scene, model, groundMaterial }: Deps): DebugHandle {
  const root = model.root as unknown as Object3D
  const originals = new Map<Mesh, Material | Material[]>()
  const clay = new MeshStandardMaterial({ color: 0x808080, roughness: 1, metalness: 0, side: DoubleSide })
  const groundOriginalColor = groundMaterial.color.clone()
  const originalFog: Fog | FogExp2 | null = scene.fog

  const handle: DebugHandle = {
    setRig(name) {
      const rig = CAMERA_RIGS[name]
      camera.fov = rig.fovDeg
      camera.position.set(rig.positionM[0], rig.positionM[1], rig.positionM[2])
      camera.lookAt(new Vector3(rig.lookAtM[0], rig.lookAtM[1], rig.lookAtM[2]))
      camera.updateProjectionMatrix()
    },
    setClay(on) {
      root.traverse((child) => {
        const mesh = child as Object3D & { isMesh?: boolean }
        if (!mesh.isMesh) return
        const m = child as unknown as Mesh
        if (on) {
          if (!originals.has(m)) originals.set(m, m.material)
          m.material = clay
        } else {
          const original = originals.get(m)
          if (original) m.material = original
        }
      })
      scene.fog = on ? null : originalFog
      groundMaterial.color.copy(on ? clay.color : groundOriginalColor)
      scene.background = new Color(on ? 0xbdbdbd : 0xc9a06c)
    },
    rigs: () => CAMERA_RIGS,
    measure() {
      root.updateMatrixWorld(true)
      const size = new Box3().setFromObject(root).getSize(new Vector3())
      let triangles = 0
      let meshCount = 0
      root.traverse((child) => {
        const mesh = child as Object3D & {
          isMesh?: boolean
          geometry?: { index?: { count: number } | null; attributes?: { position?: { count: number } } }
        }
        if (!mesh.isMesh || !mesh.geometry) return
        meshCount++
        const index = mesh.geometry.index
        const position = mesh.geometry.attributes?.position
        triangles += index ? index.count / 3 : position ? position.count / 3 : 0
      })
      return { widthM: size.x, heightM: size.y, depthM: size.z, meshes: meshCount, triangles }
    },
  }

  window.__CLIFF__ = handle
  return handle
}

declare global {
  interface Window {
    __CLIFF__?: DebugHandle
  }
}
