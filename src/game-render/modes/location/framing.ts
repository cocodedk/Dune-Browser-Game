// src/game-render/modes/location/framing.ts
// Keeps the location's orthographic camera matched to the window.
//
// Nothing ever resized these cameras. Renderer.applySize updates the
// *perspective* camera's aspect and nothing else, so a frustum authored at
// 1600x1000 was squashed or stretched into whatever shape the window happened
// to be — a 48% horizontal stretch on a 2.37 ultrawide, which is what "the
// aspects on the screen are strange" looks like.

import type { OrthographicCamera, Object3D } from 'three'
import { fitOrtho } from '../../core/orthoFit'
import type { OrthoFit } from '../../core/orthoFit'
import { FRAME_WIDTH, FRAME_HEIGHT } from './paintDiorama'

export interface Framing {
  readonly fit: OrthoFit
  /** Changes whenever the window shape does, for cache keys. */
  readonly key: string
  /** Re-measure and re-fit. Cheap; safe to call per frame. */
  refit(): OrthoFit
}

export function createFraming(
  view: OrthographicCamera,
  canvas: HTMLElement | undefined,
  planes: () => { backdrop: Object3D | null },
): Framing {
  let fit = fitOrtho(FRAME_WIDTH, FRAME_HEIGHT, FRAME_WIDTH, FRAME_HEIGHT)
  let key = ''

  function refit(): OrthoFit {
    const w = canvas?.clientWidth ?? FRAME_WIDTH
    const h = canvas?.clientHeight ?? FRAME_HEIGHT
    const next = `${w}x${h}`
    if (next !== key) {
      key = next
      fit = fitOrtho(FRAME_WIDTH, FRAME_HEIGHT, w, h)

      view.left = -fit.viewWidth / 2
      view.right = fit.viewWidth / 2
      view.top = fit.viewHeight / 2
      view.bottom = -fit.viewHeight / 2
      view.updateProjectionMatrix()
    }

    // Applied every call, not only on change: the label plane is rebuilt
    // whenever the hotspots change and would otherwise come back unscaled.
    planes().backdrop?.scale.setScalar(fit.coverScale)
    return fit
  }

  refit()
  return {
    get fit(): OrthoFit { return fit },
    get key(): string { return key },
    refit,
  }
}
