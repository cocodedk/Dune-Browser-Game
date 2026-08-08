// character-shop/duncan/src/debug.ts
// The capture handle tools/shoot.mjs drives — every named view and the
// silhouette pass go through here, so a headless browser can place the
// camera and toggle silhouette mode deterministically instead of
// screenshotting whatever the harness happens to be showing. Duncan is
// STATIC (contracts.ts: no update()), so unlike the vehicle shops' debug.ts
// (vehicle-shop/harvester/src/debug.ts, read as reference only, never
// imported — the fence forbids it) there is no pose/drive/tick, only camera
// placement and a material swap.

import { Box3, Color, MeshBasicMaterial, Vector3 } from 'three'
import type { Mesh, Object3D, PerspectiveCamera, Scene } from 'three'
import { PROPORTIONS } from './spec'
import type { CharacterModel } from './contracts'
import type { LightRig } from './lighting'

export interface FigureMeasurement {
  height: number
  width: number
  depth: number
  triangles: number
  meshes: number
}

export interface DebugHandle {
  /** Park the camera on a sphere centred on the figure's own vertical axis.
   *  azimuth 0 sits ahead of the face (-Z), 180 behind it, 90 the figure's
   *  own right (+X) — the vehicle shops' viewpoint convention
   *  (vehicle-shop/harvester/src/camera/rig.ts). distanceHeights and
   *  targetYFraction are both multiples of PROPORTIONS.heightM, never a
   *  bare metre count, so every named view scales with spec.ts. */
  viewpoint(azimuthDeg: number, elevationDeg: number, distanceHeights: number, targetYFraction: number): void
  /** true: every mesh renders flat black, unlit, on a white background — a
   *  true silhouette, not just a dark render. false: restores the figure's
   *  own materials and the scene background. */
  setSilhouette(on: boolean): void
  /** Swap between lighting.ts's two rigs and their backdrops. Call it AFTER
   *  viewpoint() for the same framing: the portrait rig's three beams are
   *  offsets from the camera's own azimuth, so it needs to know where the
   *  camera just went. */
  setPortrait(on: boolean): void
  measure(): FigureMeasurement
}

declare global {
  interface Window {
    __DUNCAN__?: DebugHandle
  }
}

export function installDebugHandle(
  scene: Scene, camera: PerspectiveCamera, model: CharacterModel, lights: LightRig,
): DebugHandle {
  const root = model.root as unknown as Object3D
  const black = new MeshBasicMaterial({ color: 0x000000 })
  const originals = new Map<Mesh, Mesh['material']>()
  // The framing viewpoint() last placed, so setPortrait() can hang the
  // three-point rig off the camera instead of off the world.
  let framing = { az: 0, targetY: PROPORTIONS.heightM * 0.5 }
  let silhouette = false
  // Captured EAGERLY, at handle-creation time — not lazily inside
  // setSilhouette(true). Pass 2 bug (progress.md): shoot.mjs calls
  // setSilhouette(false) for every non-silhouette view, including the
  // very first one in the list, before setSilhouette(true) ever runs; a
  // lazily-captured original was still its `null` placeholder at that
  // point, so the very first "false" call clobbered main.ts's dark-neutral
  // background to null (the renderer's own default clear colour, black) —
  // every colour render silently lost the lighting fix to this.
  //
  // R2 keeps the eager capture and makes it a VARIABLE rather than a
  // constant, because setPortrait() now legitimately changes what "the
  // scene's own background" means. The invariant the bug taught is
  // unchanged and is the only thing that matters: this is never null and is
  // never read before it has been written.
  let baseBackground: Scene['background'] = scene.background

  const handle: DebugHandle = {
    viewpoint(azimuthDeg, elevationDeg, distanceHeights, targetYFraction) {
      const az = (azimuthDeg * Math.PI) / 180
      const el = (elevationDeg * Math.PI) / 180
      const r = PROPORTIONS.heightM * distanceHeights
      const targetY = PROPORTIONS.heightM * targetYFraction
      camera.position.set(
        Math.cos(el) * Math.sin(az) * r,
        targetY + Math.sin(el) * r,
        -Math.cos(el) * Math.cos(az) * r,
      )
      camera.lookAt(0, targetY, 0)
      framing = { az: azimuthDeg, targetY }
    },
    setPortrait(on) {
      lights.apply(on, framing.az, framing.targetY)
      baseBackground = lights.backdrop(on)
      if (!silhouette) scene.background = baseBackground
    },
    setSilhouette(on) {
      silhouette = on
      if (on) {
        scene.background = new Color(0xffffff)
        root.traverse((child) => {
          const mesh = child as Mesh
          if (!mesh.isMesh) return
          if (!originals.has(mesh)) originals.set(mesh, mesh.material)
          mesh.material = black
        })
      } else {
        scene.background = baseBackground
        for (const [mesh, material] of originals) mesh.material = material
      }
    },
    measure() {
      root.updateMatrixWorld(true)
      const size = new Box3().setFromObject(root).getSize(new Vector3())
      let triangles = 0
      let meshes = 0
      root.traverse((child) => {
        const mesh = child as Object3D & {
          isMesh?: boolean
          geometry?: { index?: { count: number } | null; attributes?: { position?: { count: number } } }
        }
        if (!mesh.isMesh || !mesh.geometry) return
        meshes++
        const index = mesh.geometry.index
        const position = mesh.geometry.attributes?.position
        triangles += index ? index.count / 3 : position ? position.count / 3 : 0
      })
      return { height: size.y, width: size.x, depth: size.z, triangles, meshes }
    },
  }

  window.__DUNCAN__ = handle
  return handle
}
