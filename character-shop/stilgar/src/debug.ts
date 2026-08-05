// character-shop/stilgar/src/debug.ts
// The capture and measurement handle tools/shoot.mjs drives through a
// headless browser — mirrors vehicle-shop/harvester/src/debug.ts's role,
// simplified because the figure is STATIC (no pause/resume/drive/tick: see
// contracts.ts and gauntlet-loop.md's "characters are static" rule). Every
// number in the bar that is not a unit test is read through here.

import { Box3, Color, MeshBasicMaterial, Vector3 } from 'three'
import type { Object3D, Mesh, Material, Scene, PerspectiveCamera } from 'three'
import type { CharacterModel } from './contracts'
import { PROPORTIONS } from './spec'
import { namedOrThrow, directMeshBBox, halfWidthX } from './model/measure'

export interface StilgarMeasurement {
  heightM: number
  shoulderHalfWidth: number
  hipHalfWidth: number
  triangles: number
  meshes: number
}

export interface CaptureHandle {
  /** Park the camera on a sphere around a point at targetYFrac * heightM in
   *  the figure's own frame — azimuth 0 sits ahead of the face looking
   *  back (the face-toward -Z convention), 180 behind, elevation 90 is
   *  straight down. distance is in figure heights. */
  viewpoint(azimuthDeg: number, elevationDeg: number, distance: number, targetYFrac: number): void
  /** All meshes -> one shared unlit black material on a white background
   *  (on), or their original materials back (off). */
  setSilhouette(on: boolean): void
  measure(): StilgarMeasurement
}

declare global {
  interface Window {
    __STILGAR__?: CaptureHandle
  }
}

interface Deps {
  camera: PerspectiveCamera
  model: CharacterModel
  scene: Scene
}

export function installCaptureHandle({ camera, model, scene }: Deps): CaptureHandle {
  const root = model.root as unknown as Object3D
  const target = new Vector3()
  const eye = new Vector3()
  const silhouetteMaterial = new MeshBasicMaterial({ color: 0x000000 })
  const originalMaterials = new Map<Mesh, Material | Material[]>()
  let originalBackground: Scene['background'] = null

  return {
    viewpoint(azimuthDeg, elevationDeg, distance, targetYFrac) {
      root.updateMatrixWorld(true)
      target.set(0, PROPORTIONS.heightM * targetYFrac, 0)
      const az = (azimuthDeg * Math.PI) / 180
      const el = (elevationDeg * Math.PI) / 180
      const r = PROPORTIONS.heightM * distance
      eye.set(Math.cos(el) * Math.sin(az), Math.sin(el), -Math.cos(el) * Math.cos(az)).multiplyScalar(r).add(target)
      camera.position.copy(eye)
      camera.lookAt(target)
    },
    setSilhouette(on) {
      root.traverse((child) => {
        const mesh = child as Mesh
        if (!mesh.isMesh) return
        if (on) {
          if (!originalMaterials.has(mesh)) originalMaterials.set(mesh, mesh.material)
          mesh.material = silhouetteMaterial
        } else {
          const original = originalMaterials.get(mesh)
          if (original) mesh.material = original
        }
      })
      if (on) {
        originalBackground = scene.background
        scene.background = new Color(0xffffff)
      } else {
        scene.background = originalBackground
      }
    },
    measure() {
      root.updateMatrixWorld(true)
      const size = new Box3().setFromObject(root).getSize(new Vector3())
      let triangles = 0
      let meshes = 0
      root.traverse((child) => {
        const mesh = child as Mesh
        if (!mesh.isMesh || !mesh.geometry) return
        meshes += 1
        const index = mesh.geometry.index
        const position = mesh.geometry.attributes.position
        triangles += (index ? index.count : position.count) / 3
      })
      return {
        heightM: size.y,
        shoulderHalfWidth: halfWidthX(directMeshBBox(namedOrThrow(root, 'chest'))),
        hipHalfWidth: halfWidthX(directMeshBBox(namedOrThrow(root, 'pelvis'))),
        triangles,
        meshes,
      }
    },
  }
}
