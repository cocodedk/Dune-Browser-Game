// src/game-render/modes/location/sietchRig.ts
// PURE camera math for the sietch 3D set: the visible frustum size at a
// given depth (for sizing camera-attached HUD planes, see sietchHud.ts) and
// the parallax drift offset. No three.js import — plain trig, so this is
// unit-testable without a DOM or WebGL context.

export interface FrustumSize {
  width: number
  height: number
}

/**
 * Visible width/height of a PerspectiveCamera's frustum at `depthM` in front
 * of it, in world units. The sietch model and its camera share one
 * true-metre coordinate space (spec.ts CAMERA_RIG, FOOTPRINT), so this
 * result needs no further scaling to size a HUD plane that fills the frame
 * at that depth.
 *
 * @param fovDeg Vertical field of view, degrees — three.js's own convention
 *   for `PerspectiveCamera.fov`, so callers can pass `camera.fov` directly.
 */
export function frustumSizeAt(fovDeg: number, aspect: number, depthM: number): FrustumSize {
  const height = 2 * depthM * Math.tan((fovDeg * Math.PI) / 360)
  return { width: height * aspect, height }
}

export interface DriftOffset {
  x: number
  y: number
}

/**
 * The location diorama's own slow parallax gesture — sin/cos at these exact
 * frequencies (see LocationMode.ts's `root.position` drift) — reused here as
 * CAMERA motion instead of backdrop motion: spec.ts's CAMERA_RIG comment
 * says the adapter "adds the existing slow drift... as CAMERA motion; the
 * set itself never moves."
 *
 * Amplitude is `driftM` exactly, since sin/cos both peak at +-1 — that is
 * the enclosure's raycast-guarded envelope (spec.ts LIGHTING.driftM) and
 * must never be widened here.
 */
export function driftOffset(elapsedMs: number, driftM: DriftOffset): DriftOffset {
  return {
    x: Math.sin(elapsedMs * 0.00016) * driftM.x,
    y: Math.cos(elapsedMs * 0.00012) * driftM.y,
  }
}
