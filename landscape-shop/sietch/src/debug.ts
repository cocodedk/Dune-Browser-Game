// landscape-shop/sietch/src/debug.ts
// The capture handle tools/shoot.mjs drives. The set is static (no
// pose/drive — contracts.ts), so this only needs to move the CAMERA along
// CAMERA_RIG's x (the release adapter's drift — spec.ts) and swap the
// scene between the lit hearth look and a matte clay pass for a pure-form
// read (R1 bar: a blind critic on a clay render — gauntlet-loop.md).

import {
  Box3, Vector3, Color, MeshStandardMaterial, AmbientLight, PointLight,
  DirectionalLight, ACESFilmicToneMapping, NoToneMapping,
} from 'three'
import type { PerspectiveCamera, Scene, Object3D, Mesh, Material, WebGLRenderer } from 'three'
import type { LandscapeModel } from './contracts'
import { CAMERA_RIG, DRESSING } from './spec'

export interface SietchMeasurement {
  width: number
  height: number
  depth: number
  meshes: number
  triangles: number
}

export interface DebugHandle {
  /** Camera x only — y and lookAt stay pinned to CAMERA_RIG, matching the
   *  release adapter's parallax drift (spec.ts comment on CAMERA_RIG). */
  setCameraX(x: number): void
  setClay(on: boolean): void
  measure(): SietchMeasurement
  /** CAMERA_RIG straight from spec.ts, so tools/shoot.mjs can record the
   *  numbers the BROWSER used rather than a node-side copy that could
   *  drift (mirrors character-shop/chani/src/debug.ts's rigs()). */
  rig(): typeof CAMERA_RIG
  /** Bisection aid (R1.3): hide every mesh whose name is NOT in `names`,
   *  or restore all if `names` is null — lets a round-trip screenshot
   *  isolate exactly which mesh is drawing a suspect line/shape. */
  isolate(names: string[] | null): void
}

interface Deps {
  camera: PerspectiveCamera
  scene: Scene
  model: LandscapeModel
  ambient: AmbientLight
  hearth: PointLight
  /** Sourced fills (R2's gallery spill). Off in the clay pass, which is a
   *  pure-form read and must not be tinted by anything. */
  fills: PointLight[]
  /** Harness-only key for setClay()'s pure-form pass — never part of the
   *  released hearth-lit look (main.ts's header comment). */
  clayLight: DirectionalLight
  /** Harness-only camera-collocated fill, clay pass only (main.ts's R3
   *  comment on it). */
  clayFill: DirectionalLight
  /** Owns the tone-mapping mode so setClay() can bypass ACES for the
   *  diagnostic pass and restore it for the lit look (main.ts's R3 note
   *  on renderer.toneMapping). */
  renderer: WebGLRenderer
}

export function installDebugHandle(
  { camera, scene, model, ambient, hearth, fills, clayLight, clayFill, renderer }: Deps,
): DebugHandle {
  const root = model.root as unknown as Object3D
  const originalMaterials = new Map<Mesh, Material | Material[]>()
  const clay = new MeshStandardMaterial({ color: 0x808080, roughness: 1 })

  const applyCamera = () => {
    camera.fov = CAMERA_RIG.fovDeg
    camera.updateProjectionMatrix()
    const [, y, z] = CAMERA_RIG.positionM
    camera.position.y = y
    camera.position.z = z
    camera.lookAt(...(CAMERA_RIG.lookAtM as [number, number, number]))
  }

  const handle: DebugHandle = {
    setCameraX(x) {
      camera.position.x = x
      applyCamera()
    },
    setClay(on) {
      root.traverse((child) => {
        const mesh = child as Object3D & { isMesh?: boolean }
        if (!mesh.isMesh) return
        const m = child as unknown as Mesh
        if (on) {
          if (!originalMaterials.has(m)) originalMaterials.set(m, m.material)
          m.material = clay
        } else {
          const original = originalMaterials.get(m)
          if (original) m.material = original
        }
      })
      // Clay = a raking key (clayLight) plus a dim camera-headlamp fill
      // (clayFill), under LINEAR response — ambient alone has no
      // directional component, so it lights every normal identically and
      // the shape disappears (measured: an ambient-only pass rendered as
      // one flat colour, no silhouette at all). R3: 1.5 ambient (R1.2's
      // own fix for a different flattening) was ITSELF flooding the far
      // hemisphere flat once the key's rake actually started shading it.
      // Retuned alongside the key/fill by the same histogram loop, low
      // enough that the walls still shade but no surface ever reads pure
      // black. R3: ACES's shoulder/toe made "clipped" and "crushed" the
      // same read for a diagnostic pass meant to sit mid-grey, so clay
      // renders under NoToneMapping (main.ts's R3 comment); lit keeps the
      // consumer's ACES curve.
      renderer.toneMapping = on ? NoToneMapping : ACESFilmicToneMapping
      ambient.intensity = on ? 0.35 : 0.18
      ambient.color = new Color(on ? 0xffffff : 0x201812)
      hearth.visible = !on
      for (const fill of fills) fill.visible = !on
      clayLight.visible = on
      clayFill.visible = on
      scene.background = new Color(on ? 0x4a4a4a : 0x0b0a09)
    },
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
      return { width: size.x, height: size.y, depth: size.z, meshes: meshCount, triangles }
    },
    rig: () => CAMERA_RIG,
    isolate(names) {
      root.traverse((child) => {
        const mesh = child as Object3D & { isMesh?: boolean }
        if (!mesh.isMesh) return
        child.visible = names === null || names.includes(child.name)
      })
    },
  }

  window.__SIETCH__ = handle
  return handle
}

// Re-exported so main.ts and shoot.mjs share one source for the hearth
// colour without a second hand-picked hex.
export const HEARTH_COLOR = DRESSING.hearthColor

declare global {
  interface Window {
    __SIETCH__?: DebugHandle
  }
}
