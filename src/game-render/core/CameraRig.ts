// src/game-render/core/CameraRig.ts
// Clamped orbital camera for the strategic map.
//
// Deliberately not free-look. This is a map you read: pitch is fixed, yaw is
// limited, and pan is bounded to the playable area so the player can never
// lose the map or wander far enough to see the terrain's edge.

import { Vector3, type PerspectiveCamera } from 'three'

export interface CameraLimits {
  minDistance: number
  maxDistance: number
  /** Half-extent of allowed pan on each axis, in world units. */
  panExtent: number
  pitchRadians: number
}

export interface CameraRig {
  /** Apply the current state to the camera. */
  apply(): void
  zoomBy(delta: number): void
  panBy(dx: number, dz: number): void
  orbitBy(radians: number): void
  dispose(): void
}

/** Clamp helper — kept local so the rig has no dependency on a util module. */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function createCameraRig(
  camera: PerspectiveCamera,
  canvas: HTMLElement,
  limits: CameraLimits,
): CameraRig {
  let distance = clamp(
    (limits.minDistance + limits.maxDistance) / 2,
    limits.minDistance,
    limits.maxDistance,
  )
  let yaw = 0
  const target = new Vector3(0, 0, 0)

  function apply(): void {
    const horizontal = Math.cos(limits.pitchRadians) * distance
    camera.position.set(
      target.x + Math.sin(yaw) * horizontal,
      Math.sin(limits.pitchRadians) * distance,
      target.z + Math.cos(yaw) * horizontal,
    )
    camera.lookAt(target)
  }

  function zoomBy(delta: number): void {
    distance = clamp(distance + delta, limits.minDistance, limits.maxDistance)
    apply()
  }

  function panBy(dx: number, dz: number): void {
    // Pan in the camera's own frame so dragging feels direct at any yaw.
    const cos = Math.cos(yaw)
    const sin = Math.sin(yaw)
    target.x = clamp(target.x + dx * cos - dz * sin, -limits.panExtent, limits.panExtent)
    target.z = clamp(target.z + dx * sin + dz * cos, -limits.panExtent, limits.panExtent)
    apply()
  }

  function orbitBy(radians: number): void {
    yaw += radians
    apply()
  }

  let dragging = false
  let lastX = 0
  let lastY = 0

  function onPointerDown(e: PointerEvent): void {
    // Middle button or shift-drag orbits; plain drag is reserved for picking.
    if (e.button !== 1 && !e.shiftKey) return
    dragging = true
    lastX = e.clientX
    lastY = e.clientY
  }

  function onPointerMove(e: PointerEvent): void {
    if (!dragging) return
    const dx = e.clientX - lastX
    const dy = e.clientY - lastY
    lastX = e.clientX
    lastY = e.clientY

    if (e.shiftKey) {
      // Scale pan with distance so it feels constant on screen.
      const scale = distance * 0.0016
      panBy(-dx * scale, -dy * scale)
    } else {
      orbitBy(-dx * 0.005)
    }
  }

  function onPointerUp(): void {
    dragging = false
  }

  function onWheel(e: WheelEvent): void {
    e.preventDefault()
    zoomBy(e.deltaY * 0.6)
  }

  canvas.addEventListener('pointerdown', onPointerDown)
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  canvas.addEventListener('wheel', onWheel, { passive: false })

  apply()

  return {
    apply,
    zoomBy,
    panBy,
    orbitBy,
    dispose(): void {
      canvas.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('wheel', onWheel)
    },
  }
}
