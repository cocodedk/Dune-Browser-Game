// landscape-shop/sietch/src/debug.ts
// The capture handle tools/shoot.mjs drives. The set is static (no
// pose/drive — contracts.ts), so this only needs to move the CAMERA along
// CAMERA_RIG's x (the release adapter's drift — spec.ts) and swap the
// scene between the lit hearth look and a matte clay pass for a pure-form
// read (R1 bar: a blind critic on a clay render — gauntlet-loop.md).

import { Box3, Vector3, Color, MeshStandardMaterial, AmbientLight, PointLight, DirectionalLight } from 'three'
import type { PerspectiveCamera, Scene, Object3D, Mesh, Material } from 'three'
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
  /** Harness-only fill for setClay()'s pure-form pass — never part of the
   *  released hearth-lit look (main.ts's header comment). */
  clayLight: DirectionalLight
}

export function installDebugHandle({ camera, scene, model, ambient, hearth, clayLight }: Deps): DebugHandle {
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
      // Clay = angled white key (clayLight) plus a LOW white fill, pure
      // form — ambient alone has no directional component, so it lights
      // every normal identically and the shape disappears (measured: an
      // ambient-only pass rendered as one flat colour, no silhouette at
      // all). R1.2: 0.9 ambient measured as flooding every gallery
      // socket's shadow to flat mid-grey — dropped to 0.3 so the angled
      // key's own shading (and the jamb's cast shadow into each socket)
      // actually reads. Lit = near-black ambient plus the one authored
      // hearth point light (main.ts's own setup).
      ambient.intensity = on ? 0.3 : 0.18
      ambient.color = new Color(on ? 0xffffff : 0x201812)
      hearth.visible = !on
      clayLight.visible = on
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
