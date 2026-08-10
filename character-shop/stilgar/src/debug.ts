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
import { RIGS, type LightingControl, type RigName, type RigSpec } from './lighting'
import { headLandmarks, type HeadLandmarks } from './model/headReport'

export interface StilgarMeasurement {
  heightM: number
  shoulderHalfWidth: number
  hipHalfWidth: number
  triangles: number
  meshes: number
  /** Every face landmark this round is judged on, read off the built mesh —
   *  so the manifest beside the PNGs carries the numbers rather than a
   *  builder's report carrying them alone. */
  head: HeadLandmarks
}

export interface CaptureHandle {
  /** Park the camera on a sphere around a point at targetYFrac * heightM in
   *  the figure's own frame — azimuth 0 sits ahead of the face looking
   *  back (the face-toward -Z convention), 180 behind, elevation 90 is
   *  straight down. distance is in figure heights. */
  viewpoint(azimuthDeg: number, elevationDeg: number, distance: number, targetYFrac: number): void
  /** Swap the whole light rig and its backdrop — 'default' for the five
   *  full-body views and the silhouette, 'portrait' for bust and head
   *  framings. See lighting.ts. */
  setRig(name: RigName): void
  /** The rig table itself, so tools/shoot.mjs records the numbers actually
   *  in the scene rather than a copy that can drift from it. */
  rigs(): Record<RigName, RigSpec>
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
  lighting: LightingControl
}

export function installCaptureHandle({ camera, model, scene, lighting }: Deps): CaptureHandle {
  const root = model.root as unknown as Object3D
  const target = new Vector3()
  const eye = new Vector3()
  const silhouetteMaterial = new MeshBasicMaterial({ color: 0x000000 })
  const originalMaterials = new Map<Mesh, Material | Material[]>()

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
    setRig(name) {
      lighting.setRig(name)
    },
    rigs() {
      return RIGS
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
      // Restore the ACTIVE rig's backdrop rather than a cached colour: a rig
      // switch while the silhouette is on would otherwise put the wrong
      // background back.
      scene.background = new Color(on ? 0xffffff : lighting.backdrop())
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
        head: headLandmarks(root),
      }
    },
  }
}
