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
  type Camera,
} from 'three'
import type { QualitySettings } from './Quality'
import { createPostPipeline, type PostPipeline } from '../post/PostPipeline'
import { enableShadows, shadowSettingsFor } from '../env/shadowRig'

export interface RendererHandle {
  readonly renderer: WebGLRenderer
  readonly camera: PerspectiveCamera
  render(scene: Scene, override?: Camera): void
  /** Whether the composer is in the loop. False on the 'low' tier. */
  readonly postEnabled: boolean
  /** Tone-mapping exposure for the current hour. */
  setExposure(value: number): void
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
  /** Width of UI overlaying the right edge of the canvas, in CSS pixels. */
  rightInset = 0,
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

  // Shadow maps on for any tier that has them. Which meshes actually cast or
  // receive is each mode's decision — the surface view opts its dunes in, the
  // globe deliberately does not, since self-shadowing a displaced sphere from
  // one directional light needs a different technique and reads as broken.
  const shadowSettings = shadowSettingsFor(quality)
  if (shadowSettings) enableShadows(renderer, shadowSettings)

  // The composer calls renderer.render() once per pass, and info resets on each
  // call — so by the time a frame ends, info describes OutputPass's fullscreen
  // quad and nothing else. Reported cost collapsed to 1 draw call and 1 triangle
  // the moment post-processing went in, which is a measurement artefact rather
  // than an optimisation. Taking over the reset means info accumulates across
  // every pass of a frame and the numbers mean something again.
  renderer.info.autoReset = false

  const camera = new PerspectiveCamera(50, 1, 0.1, 4000)

  function applySize(): void {
    const parent = canvas.parentElement
    const width = parent?.clientWidth || canvas.clientWidth || 1
    const height = parent?.clientHeight || canvas.clientHeight || 1
    renderer.setSize(width, height, false)
    camera.aspect = width / height

    // Slide the optical centre left by half the overlaid column so what the
    // camera points at lands in the middle of the *uncovered* screen. Done on
    // the projection rather than by moving the camera, because moving it would
    // also swing the orbit centre and change what "look at the planet" means.
    //
    // Guarded: on a narrow window the column can be most of the screen, and
    // shifting by half of that would push the subject off the left edge.
    const inset = Math.min(rightInset, width * 0.4)
    camera.setViewOffset(width, height, inset / 2, 0, width, height)
    camera.updateProjectionMatrix()

    // The composer owns its own render targets and does not learn about a
    // resize from the renderer, so it has to be told separately or every pass
    // keeps rendering at the size the canvas had when the page loaded.
    post?.setSize(width, height)
  }

  // Declared before applySize so the resize path can reach it, but built after
  // the first applySize call below: createPostPipeline sizes its render targets
  // from renderer.getSize(), which is only correct once the canvas has been
  // measured.
  let post: PostPipeline | null = null
  applySize()
  post = createPostPipeline(renderer, quality)

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
    get postEnabled(): boolean {
      return post?.enabled ?? false
    },
    render(scene: Scene, override?: Camera): void {
      // Manual, once per frame, because autoReset is off above.
      renderer.info.reset()
      // The composer is skipped entirely on the 'low' tier rather than run with
      // every optional pass disabled — an EffectComposer still allocates two
      // full-size HalfFloat targets and costs the fill rate that tier exists to
      // save. Tone mapping and exposure are untouched either way: passes before
      // OutputPass render into non-null targets, where three disables tone
      // mapping automatically, and OutputPass reads toneMappingExposure fresh
      // each frame, so setExposure keeps driving the hour through the composer.
      if (post?.enabled) post.render(scene, override ?? camera)
      else renderer.render(scene, override ?? camera)
    },
    setExposure(value: number): void {
      // Clamped: the palette is data, and a bad keyframe should wash the
      // image out a little rather than turn the screen white or black.
      renderer.toneMappingExposure = Math.max(0.2, Math.min(2, value))
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
      post?.dispose()
      renderer.dispose()
    },
  }
}
