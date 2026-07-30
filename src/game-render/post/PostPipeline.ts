// src/game-render/post/PostPipeline.ts
// Post-processing composer: RenderPass -> Bloom -> Grade -> [SMAA] -> Output.
// Thin orchestration only — the decisions live in passes.ts/grade.ts (pure,
// tested); this file just wires three.js objects together, so it's covered
// by E2E rather than unit tests (same split as core/Renderer.ts).
//
// Integration notes (read before wiring this into Renderer.ts):
//
// - renderer.toneMapping / renderer.toneMappingExposure / renderer.
//   outputColorSpace: leave these exactly as Renderer.ts sets them today.
//   Do NOT set them anywhere else, and do NOT call setExposure() differently
//   because a composer is now in the loop. OutputPass reads
//   renderer.toneMappingExposure fresh on every render() call (see three's
//   OutputPass.render), so the existing per-frame setExposure() call keeps
//   working unmodified through the composer.
// - Every pass before OutputPass renders into an offscreen WebGLRenderTarget.
//   three's WebGLRenderer already disables tone mapping AND colour-space
//   encoding automatically whenever the current render target is non-null
//   (WebGLRenderer.setProgram: `toneMapping = NoToneMapping` unless
//   `_currentRenderTarget === null`) — so RenderPass and the grade pass see
//   the scene in raw linear space, and OutputPass is the ONLY pass that ever
//   applies tone mapping or sRGB encoding. This is automatic in three
//   0.185+; nothing in this file replicates or double-applies it. Adding a
//   pass that sets `material.toneMapped = false` or forces a colour-space
//   define would break that — don't.
// - enabled is false on the 'low' tier. The caller MUST check it and fall
//   back to renderer.render(scene, camera) directly in that case; this
//   module does not do that fallback itself so it never allocates an
//   EffectComposer (two full-size HalfFloat render targets) on low tier.

import {
  Vector2, Scene, Camera, WebGLRenderTarget, HalfFloatType, type WebGLRenderer,
} from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import type { QualitySettings } from '../core/Quality'
import { passPlanFor, bloomParamsFor, devicePixelSize, msaaSamplesFor } from './passes'
import { createGradeShader } from './grade'

export interface PostPipeline {
  render(scene: Scene, camera: Camera): void
  setSize(width: number, height: number): void
  dispose(): void
  /** False on 'low' tier — caller falls back to a direct renderer.render(). */
  readonly enabled: boolean
}

function disabledPipeline(): PostPipeline {
  return {
    enabled: false,
    render(): void {},
    setSize(): void {},
    dispose(): void {},
  }
}

export function createPostPipeline(
  renderer: WebGLRenderer,
  quality: QualitySettings,
): PostPipeline {
  const plan = passPlanFor(quality)
  if (!plan.enabled) return disabledPipeline()

  const size = renderer.getSize(new Vector2())
  const ratio = renderer.getPixelRatio()

  // A multisampled target of our own rather than EffectComposer's default,
  // which is a plain HalfFloat target with no samples. See msaaSamplesFor: the
  // canvas's own MSAA stops applying to scene geometry the moment a composer is
  // in the loop, so without this the whole image loses geometric AA.
  //
  // Sized in device pixels because that is what WebGLRenderTarget takes;
  // EffectComposer reads _width/_height straight off a supplied target, so the
  // setSize call below immediately restores them to CSS pixels, which is the
  // unit every later setSize uses.
  const target = new WebGLRenderTarget(
    Math.max(1, Math.round(size.x * ratio)),
    Math.max(1, Math.round(size.y * ratio)),
    { type: HalfFloatType, samples: msaaSamplesFor(quality) },
  )
  const composer = new EffectComposer(renderer, target)
  composer.setPixelRatio(ratio)
  composer.setSize(size.x, size.y)

  // RenderPass needs a scene/camera at construction; render() below swaps
  // its .scene/.camera (public, mutable fields on the three.js class) each
  // call so the pipeline can serve whichever mode and camera
  // Renderer.render() is currently pointing at, same contract as
  // RendererHandle.render(scene, override?). The placeholder Scene/Camera
  // are never actually rendered — both are replaced before the first
  // composer.render() call.
  const renderPass = new RenderPass(new Scene(), new Camera())
  composer.addPass(renderPass)

  let bloomPass: UnrealBloomPass | null = null
  if (plan.bloom) {
    const b = bloomParamsFor(quality)
    bloomPass = new UnrealBloomPass(new Vector2(size.x, size.y), b.strength, b.radius, b.threshold)
    composer.addPass(bloomPass)
  }

  const gradeDef = createGradeShader()
  const gradePass = plan.grade ? new ShaderPass(gradeDef) : null
  if (gradePass) composer.addPass(gradePass)

  let smaaPass: SMAAPass | null = null
  if (plan.smaa) {
    smaaPass = new SMAAPass()
    composer.addPass(smaaPass)
  }

  const outputPass = new OutputPass()
  composer.addPass(outputPass)

  syncGradeResolution(gradePass, renderer, size.x, size.y)

  return {
    enabled: true,
    render(scene: Scene, camera: Camera): void {
      renderPass.scene = scene
      renderPass.camera = camera
      if (gradePass) gradePass.uniforms.uTime.value = performance.now() * 0.001
      composer.render()
    },
    setSize(width: number, height: number): void {
      // Resync pixel ratio before resizing — the composer only remembers the
      // ratio it was given, and if that ever drifts from the live renderer
      // (e.g. a quality-tier change re-clamping it) a plain setSize would
      // resize the composer's render targets to the WRONG resolution on a
      // HiDPI screen (the user runs 3440x1440) without ever erroring.
      composer.setPixelRatio(renderer.getPixelRatio())
      composer.setSize(width, height)
      syncGradeResolution(gradePass, renderer, width, height)
    },
    dispose(): void {
      bloomPass?.dispose()
      gradePass?.dispose()
      smaaPass?.dispose()
      outputPass.dispose()
      composer.dispose()
      // composer.dispose() releases the buffers it cloned, not the target it
      // was handed, so this one is ours to free.
      target.dispose()
    },
  }
}

function syncGradeResolution(
  gradePass: ShaderPass | null,
  renderer: WebGLRenderer,
  cssWidth: number,
  cssHeight: number,
): void {
  if (!gradePass) return
  const px = devicePixelSize(cssWidth, cssHeight, renderer.getPixelRatio())
  ;(gradePass.uniforms.uResolution.value as Vector2).set(px.width, px.height)
}
