// src/ui/sceneInput.ts
// Pointer picking + keyboard shortcuts for the 3D scene, split out of
// ThreeContainer.tsx (chunk W3d — HARD BOUNDARY: that file sat at 199/200,
// with no room left for the flight skip gate this chunk adds).
//
// The gate itself (03-opening-experience.md Beat 3: "The first flight may
// not be skipped during its first three seconds; after that, Escape and a
// visible Skip control are legal") lives in travelSkipGate.ts. Both input
// paths — Escape here, and the visible control in FlightSkipButton.tsx —
// call the SAME canSkipFlight() through the SAME trySkipFlight() closure
// (the button reaches this module via the 'player:skip_travel' bus event,
// since it is plain React with no access to `modes`), so the rule cannot
// drift between the two.

import { Raycaster, Vector2, Vector3, Plane, type PerspectiveCamera } from 'three'
import type { ModeManager } from '../game-render/core/ModeManager'
import { EventBus } from '../EventBus'
import { canSkipFlight } from '../runtime/travelSkipGate'

export interface SceneInput {
  /**
   * Call once per frame with the current travel state. Timestamps a
   * flight's start in real (wall-clock) time on the false -> true edge,
   * independent of game speed or pause — the 3s gate is about how long the
   * player has actually watched, not simulated time.
   */
  noteTravelState(traveling: boolean): void
  dispose(): void
}

export function attachSceneInput(
  canvas: HTMLCanvasElement,
  camera: PerspectiveCamera,
  modes: ModeManager,
  dispatchPick: (id: string) => void,
): SceneInput {
  const raycaster = new Raycaster()
  const pointer = new Vector2()
  const groundPlane = new Plane(new Vector3(0, 1, 0), 0)
  const hit = new Vector3()

  let flightStartedAtMs = 0
  let wasTraveling = false

  function onPointerDown(event: PointerEvent): void {
    const rect = canvas.getBoundingClientRect()
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(pointer, camera)

    // Ray-based picking wins where a mode offers it: the globe's content is
    // on a sphere, and flattening the ray onto y=0 first made most of the
    // planet unclickable.
    const byRay = modes.active?.pickRay?.(raycaster.ray)
    if (byRay) { dispatchPick(byRay); return }
    if (modes.active?.pickRay) return

    if (!raycaster.ray.intersectPlane(groundPlane, hit)) return
    const id = modes.active?.pickAt?.(hit.x, hit.z)
    if (id) dispatchPick(id)
  }

  function trySkipFlight(): void {
    if (modes.currentId !== 'flight') return
    if (!canSkipFlight(performance.now() - flightStartedAtMs)) return
    modes.handleSignal({ kind: 'travel_complete' })
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (event.key !== 'Escape') return
    trySkipFlight()
    // Escape also backs out of a location, which used to have no exit at all.
    if (modes.currentId === 'location') modes.handleSignal({ kind: 'ascend' })
  }

  function onSkipRequested(): void {
    trySkipFlight()
  }

  canvas.addEventListener('pointerdown', onPointerDown)
  window.addEventListener('keydown', onKeyDown)
  EventBus.on('player:skip_travel', onSkipRequested)

  return {
    noteTravelState(traveling) {
      if (traveling && !wasTraveling) flightStartedAtMs = performance.now()
      wasTraveling = traveling
    },
    dispose() {
      canvas.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
      EventBus.off('player:skip_travel', onSkipRequested)
    },
  }
}
