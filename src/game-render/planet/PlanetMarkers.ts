// src/game-render/planet/PlanetMarkers.ts
// Sietch markers and name plates, standing on a globe.
//
// The marker and label builders themselves are shared with the flat strategic
// map — they only know positions and a height lookup. Everything specific to
// putting them on a *sphere* lives here: anchoring to the displaced surface,
// standing them along the outward normal, scaling with altitude, and hiding
// the ones that have gone round the back.

import { Group, Object3D, Vector3, type PerspectiveCamera, type Sprite } from 'three'
import type { WorldState } from '../../types'
import { createSietchMarkers, PILLAR_HEIGHT } from '../modes/strategic/SietchMarkers'
import { createMarkerLabels } from '../modes/strategic/MarkerLabels'
import { latLonToVec3, canvasToLatLon } from './sphere'
import { SOURCE_WIDTH, SOURCE_HEIGHT } from '../modes/strategic/markerLayout'

export interface PlanetMarkers {
  /** Add this to the scene; it holds both the markers and their labels. */
  group: Group
  /** Surface anchor per village id, for hit-testing. */
  anchors: Map<string, Vector3>
  /**
   * @param zoom 0 at orbit, 1 at the surface.
   */
  update(world: WorldState, camera: PerspectiveCamera, zoom: number): void
  dispose(): void
}

/** One seated object with the outward normal it stands on. */
interface Seat {
  object: Object3D
  out: Vector3
  /** Only labels carry an anchor: they are re-seated as the spire resizes. */
  anchor?: Vector3
}

// lookAt aims an object's -Z at a target, but the marker pillars are built
// along +Y, so lookAt lays them flat. A quaternion from +Y to the outward
// normal is what actually stands them up.
const UP = new Vector3(0, 1, 0)

/** Local smoothstep — keeps this module free of a util dependency. */
function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

export function createPlanetMarkers(
  world: WorldState,
  radius: number,
  radiusAt: (direction: Vector3) => number,
): PlanetMarkers {
  const group = new Group()
  group.name = 'planet-markers'

  // Place each location on the globe, standing on its actual displaced height.
  const anchors = new Map<string, Vector3>()
  for (const village of world.villages) {
    const ll = canvasToLatLon(village.position, SOURCE_WIDTH, SOURCE_HEIGHT)
    const dir = latLonToVec3(ll, 1)
    const v = new Vector3(dir.x, dir.y, dir.z)
    anchors.set(village.id, v.clone().multiplyScalar(radiusAt(v)))
  }

  const markers = createSietchMarkers(world, radius * 2, () => 0)
  const labels = createMarkerLabels(
    markers.placements,
    world.villages.map(v => ({ id: v.id, name: v.name })),
    () => 0,
    0,
    // Pinned to the spire tip and lifted one plate-height clear of it, so the
    // name never sits on top of the marker it names.
    1.0,
  )
  group.add(markers.group)
  group.add(labels.group)

  const seats: Seat[] = []

  // Markers emit a pillar and a ring per location, in placement order.
  markers.group.children.forEach((child, index) => {
    const anchor = anchors.get(markers.placements[Math.floor(index / 2)]?.id ?? '')
    if (!anchor) return
    const out = anchor.clone().normalize()
    child.position.copy(anchor)
    child.quaternion.setFromUnitVectors(UP, out)
    seats.push({ object: child, out })
  })

  // Labels are sprites and always face the camera, so they need position only
  // — rotating a sprite does nothing. They are re-seated every frame because
  // the spire beneath them grows and shrinks with zoom, and a name plate that
  // detaches from its marker is worse than no name plate.
  labels.group.children.forEach((child, index) => {
    const anchor = anchors.get(markers.placements[index]?.id ?? '')
    if (!anchor) return
    seats.push({ object: child, out: anchor.clone().normalize(), anchor })
  })

  const toCamera = new Vector3()

  return {
    group,
    anchors,
    update(state, camera, zoom): void {
      markers.refresh(state)

      // Marker geometry is sized for the surface view. Against a whole planet
      // that reads as a speck, so they are enlarged at orbit and shrink back
      // to their natural size as the camera descends.
      //
      // Scaled per child, never on the group: a group scale multiplies child
      // *positions* as well, which lifted every marker to 2.8 planet radii and
      // left one hanging in the sky like a moon.
      const scale = 1.55 - zoom * 0.55
      // Multiplied by each child's own emphasis, so the larger ring on a
      // sworn sietch survives the per-frame zoom rescale.
      for (const child of markers.group.children) {
        const emphasis = (child.userData.emphasis as number | undefined) ?? 1
        child.scale.setScalar(scale * emphasis)
      }

      // Hide everything standing on the far side of the globe. Markers draw
      // with depth testing off so a dune can never swallow one, but on a
      // sphere that same trick shows the sietches on the back of the planet
      // through the front of it — which destroys the one thing this view
      // exists to communicate: that Arrakis is a ball, not a disc.
      const distance = camera.position.length()
      if (distance <= 0) return
      toCamera.copy(camera.position).normalize()
      // Cosine of the angle to the horizon from this altitude. Anything past
      // it is over the edge of the world.
      const horizon = radius / distance
      const lift = PILLAR_HEIGHT * scale

      // Name plates are screen-relative, so pulling back to see the whole
      // system piles all eight on top of each other in a heap of overlapping
      // text. Fade them out down there: at that distance the player is
      // looking at Arrakis and its moons, not choosing a sietch.
      const labelOpacity = smoothstep(0.12, 0.38, zoom)

      for (const seat of seats) {
        seat.object.visible = seat.out.dot(toCamera) > horizon
        if (!seat.anchor) continue
        seat.object.position.copy(seat.anchor).addScaledVector(seat.out, lift)
        const material = (seat.object as Sprite).material
        if (material) material.opacity = labelOpacity
        if (labelOpacity <= 0.01) seat.object.visible = false
      }
    },
    dispose(): void {
      markers.dispose()
      labels.dispose()
      group.clear()
    },
  }
}
