// src/game-render/planet/aiming.ts
// Turning a cursor into a place on the globe.
//
// Split from OrbitControl once it grew cursor-aimed descent. The longitude
// convention here is the load-bearing part and it is easy to get backwards:
// latLonToVec3 builds x = cos(lat)cos(lon) and z = -cos(lat)sin(lon), so
// recovering longitude needs atan2(-z, x). Using atan2(z, x) negates it and
// mirrors the whole planet east-west, which shipped once and put descents
// aimed at Carthag down beside Sietch Tabr.

import { Vector2, Vector3, Raycaster, Sphere } from 'three'
import type { PerspectiveCamera } from 'three'

export interface LatLon {
  lat: number
  lon: number
}

export interface Aiming {
  /** Unit direction under the cursor, or null when the ray misses the globe. */
  pointUnderCursor(e: { clientX: number; clientY: number }): Vector3 | null
  /** Degrees for a unit direction, in latLonToVec3's convention. */
  anglesFor(u: Vector3): LatLon
  /** Where the camera itself is looking. */
  centreOfView(): LatLon
}

export function createAiming(
  camera: PerspectiveCamera,
  canvas: HTMLElement,
  radius: number,
): Aiming {
  const raycaster = new Raycaster()
  const pointer = new Vector2()
  const surfacePoint = new Vector3()
  // Slightly above the mean radius, so a ray grazing the limb still lands.
  const globe = new Sphere(new Vector3(0, 0, 0), radius * 1.02)

  function anglesFor(u: Vector3): LatLon {
    return {
      lat: (Math.asin(Math.max(-1, Math.min(1, u.y))) * 180) / Math.PI,
      lon: (Math.atan2(-u.z, u.x) * 180) / Math.PI,
    }
  }

  return {
    anglesFor,
    pointUnderCursor(e): Vector3 | null {
      const rect = canvas.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return null

      pointer.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      )
      raycaster.setFromCamera(pointer, camera)
      if (!raycaster.ray.intersectSphere(globe, surfacePoint)) return null
      return surfacePoint.clone().normalize()
    },
    centreOfView(): LatLon {
      const p = camera.position
      const length = Math.hypot(p.x, p.y, p.z) || 1
      return anglesFor(new Vector3(p.x / length, p.y / length, p.z / length))
    },
  }
}
