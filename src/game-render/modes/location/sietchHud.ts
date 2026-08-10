// src/game-render/modes/location/sietchHud.ts
// The hotspot labels and location title for the sietch 3D set, as
// camera-attached overlays.
//
// Renderer.render(scene, override) is called exactly once per frame
// (ThreeContainer.tsx) — there is no second orthographic pass available for
// a screen-space layer the way the painted diorama gets one for free. The
// fix reuses the existing HotspotLayer (still a plane sized to fill the
// visible frame) but parents it to the perspective camera at a fixed local
// depth instead of sitting in world space under an ortho camera; the camera
// itself must be added to the scene for its children to render at all.
// pointerRouter's hit test is pure screen-space (canvas-normalised
// coordinates against each hotspot's own 0..1 position), so it needs no
// changes to keep working here — see pointerRouter.ts.

import {
  PerspectiveCamera, Mesh, PlaneGeometry, MeshBasicMaterial, CanvasTexture,
  LinearFilter, SRGBColorSpace,
} from 'three'
import type { Hotspot } from './locationDefs'
import { createHotspotLayer } from './HotspotLayer'
import type { HotspotLayer } from './HotspotLayer'
import { frustumSizeAt } from './sietchRig'
import { paintWidthFor } from './paintResolution'

/** Metres in front of the camera the HUD plane sits at. Both HUD meshes use
 *  depthTest:false + a high renderOrder, so this only has to stay within the
 *  camera's near/far range — it never has to clear real geometry. */
const HUD_DEPTH_M = 6
const TITLE_BASE_PX = 120
const TITLE_MAX_RATIO = 2
/** Fraction of the frame height the title band occupies. */
const TITLE_HEIGHT_FRACTION = 0.09

function paintTitle(name: string, width: number, height: number): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!

  ctx.font = `600 ${Math.round(height * 0.42)}px system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const chipWidth = ctx.measureText(name).width + height * 0.7
  const chipHeight = height * 0.8

  ctx.fillStyle = 'rgba(16, 11, 5, 0.6)'
  ctx.beginPath()
  ctx.roundRect(width / 2 - chipWidth / 2, height / 2 - chipHeight / 2, chipWidth, chipHeight, chipHeight * 0.16)
  ctx.fill()

  ctx.fillStyle = 'rgba(240, 224, 190, 0.95)'
  ctx.fillText(name, width / 2, height / 2 + 1)

  const texture = new CanvasTexture(canvas)
  texture.minFilter = LinearFilter
  texture.magFilter = LinearFilter
  texture.colorSpace = SRGBColorSpace
  return texture
}

export interface SietchHud {
  update(elapsedMs: number, spots: readonly Hotspot[], name: string): void
  setHover(id: string | null): void
  dispose(): void
}

export function createSietchHud(
  camera: PerspectiveCamera,
  displayHeight: () => number,
  displayRatio: () => number,
): SietchHud {
  let layer: HotspotLayer | null = null
  let titleMesh: Mesh | null = null
  let titleTexture: CanvasTexture | null = null
  let key = ''

  function rebuildSpots(spots: readonly Hotspot[], frame: { width: number; height: number }): void {
    if (layer) { camera.remove(layer.mesh); layer.dispose() }
    layer = createHotspotLayer(spots, frame.width, frame.height, displayHeight(), displayRatio())
    layer.mesh.position.set(0, 0, -HUD_DEPTH_M)
    camera.add(layer.mesh)
  }

  function rebuildTitle(name: string, frame: { width: number; height: number }): void {
    if (titleMesh) {
      camera.remove(titleMesh)
      titleMesh.geometry.dispose()
      ;(titleMesh.material as MeshBasicMaterial).dispose()
    }
    titleTexture?.dispose()

    const titleHeightM = frame.height * TITLE_HEIGHT_FRACTION
    const ratio = Math.min(Math.max(displayRatio(), 1), TITLE_MAX_RATIO)
    const pixelHeight = Math.round(TITLE_BASE_PX * ratio)
    const aspectGuess = Math.max(1, name.length * 0.55)
    const pixelWidth = paintWidthFor(pixelHeight, aspectGuess)
    titleTexture = paintTitle(name, pixelWidth, pixelHeight)

    const titleWidthM = titleHeightM * (pixelWidth / pixelHeight)
    const material = new MeshBasicMaterial({
      map: titleTexture, transparent: true, depthTest: false, fog: false, toneMapped: false,
    })
    titleMesh = new Mesh(new PlaneGeometry(titleWidthM, titleHeightM), material)
    titleMesh.position.set(0, frame.height / 2 - titleHeightM * 0.8, -HUD_DEPTH_M)
    titleMesh.renderOrder = 61
    camera.add(titleMesh)
  }

  return {
    update(elapsedMs, spots, name): void {
      const nextKey = `${spots.map(s => s.id).join(',')}@${name}@${camera.aspect.toFixed(2)}`
      if (nextKey !== key) {
        key = nextKey
        const frame = frustumSizeAt(camera.fov, camera.aspect, HUD_DEPTH_M)
        rebuildSpots(spots, frame)
        rebuildTitle(name, frame)
      }
      layer?.update(elapsedMs)
    },
    setHover(id): void {
      layer?.setHover(id)
    },
    dispose(): void {
      if (layer) { camera.remove(layer.mesh); layer.dispose(); layer = null }
      if (titleMesh) {
        camera.remove(titleMesh)
        titleMesh.geometry.dispose()
        ;(titleMesh.material as MeshBasicMaterial).dispose()
        titleMesh = null
      }
      titleTexture?.dispose()
      titleTexture = null
    },
  }
}
