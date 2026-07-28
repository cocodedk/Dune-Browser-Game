// src/game-render/modes/strategic/SietchMarkers.ts
// Faction-coloured location markers standing on the dunes.
//
// Drawn as a small pillar plus a ground ring: the pillar stays readable when a
// dune crest is between the camera and the marker, the ring anchors it to the
// surface so it does not look like it is floating.

import {
  Group,
  Mesh,
  CylinderGeometry,
  RingGeometry,
  MeshBasicMaterial,
  Color,
  DoubleSide,
} from 'three'
import type { WorldState, FactionId } from '../../../types'
import { FACTION_HEX_COLORS } from '../../factionColors'
import { layoutMarkers, nearestMarker } from './markerLayout'
import type { MarkerPlacement } from './markerLayout'

// Sized for legibility at the strategic camera distance, not for realism.
// The first pass (26 high, 4.5 radius) was a speck the fog swallowed entirely.
//
// The second overcorrected: at 9 units across and 74 tall the pillar was a
// stub, and enlarged for the orbit view it read as a chunk of coloured
// plastic lying on the planet. A marker wants to be a *spire* — tall enough
// to find, thin enough that it never competes with the terrain it stands on.
export const PILLAR_HEIGHT = 72
const PILLAR_RADIUS = 3.4
const RING_INNER = 17
const RING_OUTER = 21

export interface SietchMarkers {
  group: Group
  placements: MarkerPlacement[]
  /** Nearest marker id to a world XZ, or null when the click missed. */
  pickAt(x: number, z: number, maxDistance: number): string | null
  /** Refresh ownership colours from world state. */
  refresh(world: WorldState): void
  dispose(): void
}

interface MarkerEntry {
  id: string
  pillar: MeshBasicMaterial
  ring: MeshBasicMaterial
  ringMesh: Mesh
}

/** The player's gold. A sietch wearing this one has sworn. */
const ALLY_COLOR = 0xf0c040

export function createSietchMarkers(
  world: WorldState,
  spread: number,
  heightAt: (x: number, z: number) => number,
): SietchMarkers {
  const group = new Group()
  group.name = 'sietch-markers'

  const placements = layoutMarkers(world.villages, spread)
  const entries: MarkerEntry[] = []

  // Shared geometry across every marker — only the materials differ.
  // Tapered to a point: a spire that narrows reads as deliberate signage,
  // where a parallel-sided rod reads as a mistake in the geometry.
  const pillarGeometry = new CylinderGeometry(
    PILLAR_RADIUS * 0.12,
    PILLAR_RADIUS,
    PILLAR_HEIGHT,
    6,
  )
  // Origin at the base, not the centre. A cylinder centred on its own origin
  // buries half of itself wherever you place it, and with depth testing off
  // that buried half draws straight through the ground. Basing it here also
  // means scaling the marker grows it upward from where it stands.
  pillarGeometry.translate(0, PILLAR_HEIGHT / 2, 0)
  const ringGeometry = new RingGeometry(RING_INNER, RING_OUTER, 24)
  ringGeometry.rotateX(-Math.PI / 2)

  for (const placement of placements) {
    const groundY = heightAt(placement.x, placement.z)

    // fog: false is deliberate — markers are gameplay UI standing in the
    // world, not scenery. Fogged, the far half of the map became unreadable.
    const pillarMaterial = new MeshBasicMaterial({ color: 0xffffff, fog: false })
    const pillar = new Mesh(pillarGeometry, pillarMaterial)
    pillar.name = `pillar:${placement.id}`
    pillar.position.set(placement.x, groundY, placement.z)
    // Always visible, even through a dune — a marker you cannot find is worse
    // than one that cheats on occlusion.
    pillar.renderOrder = 10
    pillarMaterial.depthTest = false
    group.add(pillar)

    const ringMaterial = new MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.55,
      side: DoubleSide,
      fog: false,
    })
    // Same reasoning as the pillar. Left depth-testing, a ring lying tangent
    // to displaced terrain has half its circumference below the local dune
    // and renders as a broken C rather than a ring.
    ringMaterial.depthTest = false
    const ring = new Mesh(ringGeometry, ringMaterial)
    ring.name = `ring:${placement.id}`
    ring.renderOrder = 9
    ring.position.set(placement.x, groundY + 0.6, placement.z)
    group.add(ring)

    entries.push({
      id: placement.id, pillar: pillarMaterial, ring: ringMaterial, ringMesh: ring,
    })
  }

  /**
   * Repaint markers for the current state of the world.
   *
   * The spire says who *holds* a sietch. The ring says whether it has sworn to
   * you, which is a different question and the one the player is actually
   * asking: an allied Fremen sietch is still Fremen, and used to be
   * indistinguishable on the map from one that had never met you.
   */
  function refresh(state: WorldState): void {
    for (const entry of entries) {
      const village = state.villages.find(v => v.id === entry.id)
      if (!village) continue

      const hex = FACTION_HEX_COLORS[village.owner as FactionId] ?? 0xc8a84b
      entry.pillar.color = new Color(hex)

      const sworn = state.sietches.some(
        sietch => sietch.villageId === entry.id && sietch.pledgedToPlayer,
      )
      const here = state.player.location === entry.id

      // A sworn sietch wears the player's gold as a full bright ring; an
      // unsworn one keeps its own colour, dim. The difference has to survive
      // being three pixels across at orbit, so it is hue *and* brightness
      // rather than either alone.
      entry.ring.color = new Color(sworn ? ALLY_COLOR : hex)
      entry.ring.opacity = sworn ? 0.95 : here ? 0.6 : 0.32
      // Recorded rather than applied: the globe rescales every marker child
      // each frame for zoom, and would overwrite a scale set here. Consumers
      // multiply by this instead.
      entry.ringMesh.userData.emphasis = sworn ? 1.4 : 1
      entry.ringMesh.scale.setScalar(entry.ringMesh.userData.emphasis)
    }
  }

  refresh(world)

  return {
    group,
    placements,
    pickAt(x, z, maxDistance): string | null {
      return nearestMarker(placements, x, z, maxDistance)?.id ?? null
    },
    refresh,
    dispose(): void {
      pillarGeometry.dispose()
      ringGeometry.dispose()
      for (const entry of entries) {
        entry.pillar.dispose()
        entry.ring.dispose()
      }
      group.clear()
    },
  }
}
