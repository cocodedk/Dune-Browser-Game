// src/game-render/core/Renderer.ts
// WebGLRenderer lifecycle. Deliberately thin — anything worth unit testing
// lives in the pure modules (SceneModes, Quality, Atmosphere, terrain/*).
// This file is covered by E2E instead, since it needs a real GL context.

import {
  WebGLRenderer,
  PerspectiveCamera,
  ACESFilmicToneMapping,
  SRGBColorSpace,
  Color,
  type Scene,
} from 'three'
import type { QualitySettings } from './Quality'

export interface RendererHandle {
  readonly renderer: WebGLRenderer
  readonly camera: PerspectiveCamera
  render(scene: Scene): void
  /** Paint the clear colour with no scene — used before a mode has loaded. */
  clear(): void
  info(): { calls: number; triangles: number }
  dispose(): void
}

/** Deep desert night — what shows through before any mode has loaded. */
const CLEAR_COLOR = new Color('#1a1208')

export function createRenderer(
  canvas: HTMLCanvasElement,
  quality: QualitySettings,
): RendererHandle {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: quality.tier !== 'low',
    powerPreference: 'high-performance',
    // The desert is opaque; skipping alpha saves a blend on every pixel.
    alpha: false,
  })

  renderer.setPixelRatio(quality.pixelRatio)
  renderer.setClearColor(CLEAR_COLOR, 1)
  renderer.outputColorSpace = SRGBColorSpace
  // ACES keeps the sun's highlights from clipping to flat white, which is what
  // sells a hot sky. Exposure is tuned per-mode.
  renderer.toneMapping = ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.0

  const camera = new PerspectiveCamera(50, 1, 0.1, 4000)

  function applySize(): void {
    const parent = canvas.parentElement
    const width = parent?.clientWidth || canvas.clientWidth || 1
    const height = parent?.clientHeight || canvas.clientHeight || 1
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
  }

  applySize()

  const resizeObserver =
    typeof ResizeObserver !== 'undefined' ? new ResizeObserver(applySize) : null
  if (resizeObserver && canvas.parentElement) {
    resizeObserver.observe(canvas.parentElement)
  }

  // A lost context must not take the game down — the engine keeps simulating
  // and we resume drawing when the GPU comes back.
  function onContextLost(event: Event): void {
    event.preventDefault()
  }
  canvas.addEventListener('webglcontextlost', onContextLost)

  return {
    renderer,
    camera,
    render(scene: Scene): void {
      renderer.render(scene, camera)
    },
    clear(): void {
      renderer.clear()
    },
    info(): { calls: number; triangles: number } {
      return {
        calls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
      }
    },
    dispose(): void {
      resizeObserver?.disconnect()
      canvas.removeEventListener('webglcontextlost', onContextLost)
      renderer.dispose()
    },
  }
}
