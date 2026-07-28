// src/game-render/modes/location/pointerRouter.ts
// Turns canvas pointer events into hotspot hits.
//
// This deliberately does not implement SceneMode.pickAt(). ThreeContainer
// raycasts the shared *perspective* camera onto the y=0 plane; a location
// renders through its own orthographic camera looking down -z, so that ray is
// parallel to the plane and its hit coordinates are meaningless here. A
// pickAt() would compile, read correctly, and never once fire.

import { pickHotspot } from './hotspotPick'
import type { Hotspot } from './locationDefs'

export interface PointerRouter {
  dispose(): void
}

export interface PointerHandlers {
  spots: () => readonly Hotspot[]
  hover: (id: string | null) => void
  activate: (id: string) => void
}

export function createPointerRouter(
  canvas: HTMLElement | undefined,
  handlers: PointerHandlers,
): PointerRouter {
  function hitAt(e: PointerEvent): Hotspot | null {
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return null

    const nx = (e.clientX - rect.left) / rect.width
    const ny = (e.clientY - rect.top) / rect.height

    // The label plane spans exactly the visible frustum, so canvas-normalised
    // coordinates *are* frame coordinates and no fit inverse is needed. That
    // equivalence is the reason the layer is sized to the viewport rather
    // than to the authored art frame.
    return pickHotspot(handlers.spots(), nx, ny)
  }

  function onMove(e: PointerEvent): void {
    const hit = hitAt(e)
    handlers.hover(hit?.id ?? null)
    if (canvas instanceof HTMLElement) canvas.style.cursor = hit ? 'pointer' : ''
  }

  function onDown(e: PointerEvent): void {
    const hit = hitAt(e)
    if (hit) handlers.activate(hit.id)
  }

  canvas?.addEventListener('pointermove', onMove)
  canvas?.addEventListener('pointerdown', onDown)

  return {
    dispose(): void {
      canvas?.removeEventListener('pointermove', onMove)
      canvas?.removeEventListener('pointerdown', onDown)
      if (canvas instanceof HTMLElement) canvas.style.cursor = ''
    },
  }
}
