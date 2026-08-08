// character-shop/chani/src/debug.ts
// The capture handle tools/shoot.mjs drives. Characters are static (no
// pose/drive/tick — contracts.ts, character-shop/docs/gauntlet-loop.md), so
// this is a lot smaller than a vehicle shop's debug.ts: park a camera on a
// sphere around the figure, measure it, and — for the one silhouette shot —
// swap every material for flat black on a white background.

import { Box3, Vector3, Color, MeshBasicMaterial } from 'three'
import type { PerspectiveCamera, Scene, Object3D, Mesh, Material } from 'three'
import type { CharacterModel } from './contracts'
import type { LightRig, RigNumbers } from './lighting'
import { RIGS } from './lighting'
import { PROPORTIONS } from './spec'
import { headReport, type HeadReport } from './headReport'

export interface ChaniMeasurement {
  height: number
  shoulderSpan: number
  hipSpan: number
  meshes: number
  triangles: number
  /** R2's own head numbers, so a capture carries the measurements that
   *  describe it. See headReport.ts — all read off the built vertices. */
  head: HeadReport | null
}

export interface DebugHandle {
  /** Park the camera on a sphere of radius `distance * heightM` around
   *  (0, targetY * heightM, 0), looking at that point. Mirrors the vehicle
   *  shops' azimuth/elevation convention (vehicle-shop/harvester/tools/
   *  views.mjs): 0 sits in front (the face's -Z side), 180 is behind,
   *  -90/+90 are the figure's own left/right flanks. targetY is a FRACTION
   *  of heightM (0 = ground, 1 = crown), same units as `distance`, so a
   *  view is defined purely in figure-relative terms, never raw metres. */
  /** `fovDeg` is the camera's VERTICAL field of view; it defaults to the
   *  harness's own 50, which every R1 view uses. Head framings pass a
   *  long lens and stand further back for the same crop: 50 degrees at
   *  0.37m is a 24mm lens at arm's length, and it stretched the first
   *  head capture into a caricature — long jaw, ballooned nose. */
  viewpoint(
    azimuthDeg: number, elevationDeg: number, distance: number, targetY: number,
    fovDeg?: number,
  ): void
  /** Apply a named lighting rig (lighting.ts RIGS) oriented for a view at
   *  `azimuthDeg`. Bust and head framings take the 3-point rig and its
   *  mid-grey backdrop; every other view keeps R1's. */
  setRig(name: string, azimuthDeg: number): void
  setSilhouette(on: boolean): void
  /** The rig table itself, so tools/shoot.mjs can record the numbers the
   *  BROWSER used into .shots/manifest.json rather than a node-side copy
   *  of them that could drift. */
  rigs(): Record<string, RigNumbers>
  measure(): ChaniMeasurement
}

interface Deps {
  camera: PerspectiveCamera
  scene: Scene
  model: CharacterModel
  lights: LightRig
}

function worldXOf(root: Object3D, name: string): number {
  const obj = root.getObjectByName(name)
  if (!obj) return 0
  const v = new Vector3()
  obj.getWorldPosition(v)
  return v.x
}

export function installDebugHandle({ camera, scene, model, lights }: Deps): DebugHandle {
  const root = model.root as unknown as Object3D
  const originalMaterials = new Map<Mesh, Material | Material[]>()
  const black = new MeshBasicMaterial({ color: 0x000000 })
  // The rig owns the backdrop, so the silhouette override has to restore
  // whatever the CURRENT rig wants — not a background captured at install
  // time, which would repaint a bust framing in R1's dark neutral.
  let rigBackground = 0x3a3530

  const handle: DebugHandle = {
    viewpoint(azimuthDeg, elevationDeg, distance, targetY, fovDeg = 50) {
      camera.fov = fovDeg
      camera.updateProjectionMatrix()
      const az = (azimuthDeg * Math.PI) / 180
      const el = (elevationDeg * Math.PI) / 180
      const r = PROPORTIONS.heightM * distance
      const target = new Vector3(0, targetY * PROPORTIONS.heightM, 0)
      camera.position.set(
        target.x + Math.cos(el) * Math.sin(az) * r,
        target.y + Math.sin(el) * r,
        target.z - Math.cos(el) * Math.cos(az) * r,
      )
      camera.lookAt(target)
    },
    setRig(name, azimuthDeg) {
      rigBackground = lights.apply(name, azimuthDeg)
    },
    setSilhouette(on) {
      root.traverse((child) => {
        const mesh = child as Object3D & { isMesh?: boolean }
        if (!mesh.isMesh) return
        const m = child as unknown as Mesh
        if (on) {
          if (!originalMaterials.has(m)) originalMaterials.set(m, m.material)
          m.material = black
        } else {
          const original = originalMaterials.get(m)
          if (original) m.material = original
        }
      })
      scene.background = new Color(on ? 0xffffff : rigBackground)
    },
    rigs: () => RIGS,
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
      const shoulderSpan = Math.abs(worldXOf(root, 'armR') - worldXOf(root, 'armL'))
      const hipSpan = Math.abs(worldXOf(root, 'legR') - worldXOf(root, 'legL'))
      return {
        height: size.y, shoulderSpan, hipSpan, meshes: meshCount, triangles,
        head: headReport(root),
      }
    },
  }

  window.__CHANI__ = handle
  return handle
}

declare global {
  interface Window {
    __CHANI__?: DebugHandle
  }
}
