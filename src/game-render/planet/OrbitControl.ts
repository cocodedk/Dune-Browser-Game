// src/game-render/planet/OrbitControl.ts
// The camera you fly around Arrakis with.
//
// Not a free-look camera: the target is locked to the planet's centre and the
// only degrees of freedom are yaw, pitch and altitude. That is the whole point
// of a strategic view — the player should never be able to lose the world.

import { Vector3, type PerspectiveCamera } from 'three'
import { zoomToDistance } from './sphere'

export interface OrbitControl {
  /** Eased altitude, 0 at orbit and 1 at the surface. */
  readonly zoom: number
  /**
   * The point on the globe directly under the camera, in degrees.
   *
   * This is what the surface view descends *to*. Without it the ground was a
   * single fixed dune field at the origin, so coming down over the far side
   * of the planet landed you in exactly the same place.
   */
  readonly centre: { lat: number; lon: number }
  /** Advance the easing. Returns true when the camera actually moved. */
  step(deltaMs: number): boolean
  dispose(): void
}

export interface OrbitOptions {
  radius: number
  /** Fired once the player has zoomed all the way down. */
  onDescend?: () => void
}

export function createOrbitControl(
  camera: PerspectiveCamera,
  canvas: HTMLElement,
  { radius, onDescend }: OrbitOptions,
): OrbitControl {
  // Near limit stops well above the surface. At 1.09 the camera sat 90 units
  // over terrain with 35 units of relief and the sphere's tessellation could
  // not carry it — the view became a flat brown wall. 1.32 keeps the closest
  // zoom reading as terrain seen from altitude, which is what a strategic map
  // wants anyway.
  // Far limit widened from 4.2 once the moons went in. Krelln orbits at 3.45
  // radii, so at a 4.2 ceiling the camera sat almost exactly on the moon's
  // orbit and both moons spent most of their time outside a 50-degree frustum
  // — measured once at x = -3310 on a 1400-wide screen. At 8 the whole system
  // fits, so pulling all the way out now means "see Arrakis and its moons".
  const range = { far: radius * 8, near: radius * 1.32 }

  // Start zoom re-solved for the wider range so the opening framing is
  // unchanged: distance = far * (near/far)^zoom, and 0.475 lands at the same
  // ~3400 units 0.18 used to give.
  let zoom = 0.475         // Start pulled back: the first sight is a world.
  let eased = zoom
  // The inhabited band centres on +X (lat 0, lon 0 maps there), so the camera
  // must start a quarter turn round or every sietch sits on the limb.
  let yaw = Math.PI / 2
  let pitch = 0.18
  const target = new Vector3(0, 0, 0)

  camera.near = 1
  camera.far = radius * 80
  camera.updateProjectionMatrix()

  function applyAt(z: number): void {
    const distance = zoomToDistance(z, range)
    const cp = Math.cos(pitch)
    camera.position.set(
      target.x + Math.sin(yaw) * cp * distance,
      target.y + Math.sin(pitch) * distance,
      target.z + Math.cos(yaw) * cp * distance,
    )
    camera.lookAt(target)
  }
  applyAt(zoom)

  let dragging = false
  let lastX = 0
  let lastY = 0

  function onWheel(e: WheelEvent): void {
    e.preventDefault()
    // Fraction of remaining distance per notch, so it never feels glacial far
    // out nor violent up close.
    zoom = Math.max(0, Math.min(1, zoom - e.deltaY * 0.00075))

    // Bottoming out the zoom is the player asking to land. Handing off to the
    // surface view beats letting them press against a sphere whose
    // tessellation cannot carry a close look.
    if (zoom >= 0.999 && onDescend) onDescend()
  }

  function onDown(e: PointerEvent): void {
    if (e.button !== 0) return
    dragging = true
    lastX = e.clientX
    lastY = e.clientY
  }

  function onMove(e: PointerEvent): void {
    if (!dragging) return
    const dx = e.clientX - lastX
    const dy = e.clientY - lastY
    lastX = e.clientX
    lastY = e.clientY
    // Rotation slows as you descend, or the surface tears past unreadably.
    const rate = 0.005 * (1 - zoom * 0.72)
    yaw -= dx * rate
    pitch = Math.max(-1.2, Math.min(1.2, pitch + dy * rate))
    applyAt(eased)
  }

  function onUp(): void { dragging = false }

  canvas.addEventListener('wheel', onWheel, { passive: false })
  canvas.addEventListener('pointerdown', onDown)
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)

  return {
    get zoom(): number { return eased },
    get centre(): { lat: number; lon: number } {
      // Camera position inverted through the same convention latLonToVec3
      // uses, so descending lands where the player was looking.
      const p = camera.position
      const length = Math.hypot(p.x, p.y, p.z) || 1
      return {
        lat: (Math.asin(Math.max(-1, Math.min(1, p.y / length))) * 180) / Math.PI,
        lon: (Math.atan2(p.z, p.x) * 180) / Math.PI,
      }
    },
    step(deltaMs: number): boolean {
      // Ease rather than snap, so a wheel notch reads as movement toward the
      // planet instead of a jump cut.
      if (Math.abs(zoom - eased) <= 0.0005) return false
      eased += (zoom - eased) * Math.min(1, deltaMs * 0.006)
      applyAt(eased)
      return true
    },
    dispose(): void {
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    },
  }
}
