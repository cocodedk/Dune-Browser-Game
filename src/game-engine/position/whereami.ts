// src/game-engine/position/whereami.ts
// PURE: the one line that says where you are.
//
// Nothing in the interface ever named the player's location. The status bar
// carries day, time, spice, troops and influence; the village panel describes
// whichever village you last *clicked*, which is an inspection, not a fact
// about you. So with 19 settlements across a whole globe, "I don't know where
// I am on the planet" was simply true.
//
// Text rather than a minimap, because the globe already is the map — a second
// one would duplicate the screen's whole conceit — and because a name is the
// only answer that works in every scene mode, at every camera position.

import type { SceneModeId, WorldState } from '../../types'
import type { LatLon } from './playerAnchor'

export interface PositionReadout {
  /** The place, in the game's own currency: its name. */
  headline: string
  /** Where that is, or how far along the trip. */
  detail: string
}

/**
 * Which part of Arrakis a point is in.
 *
 * Derived rather than authored, so it stays true if settlements move. The
 * bands split the inhabited belt into groups that are all non-empty; the far
 * side is called out first because it is the distinction that matters most
 * once the player can reach it.
 */
export function regionDescriptor(ll: LatLon): string {
  if (Math.abs(ll.lon) >= 90) return 'far side'
  if (ll.lat >= 10) return 'northern reach'
  if (ll.lat <= -10) return 'southern reach'
  return 'central erg'
}

export interface ReadoutInput {
  world: WorldState
  mode: SceneModeId
  toLatLon: (p: { x: number; y: number }) => LatLon
}

/** One line naming where the player is, whatever they are looking at. */
export function describePosition({ world, mode, toLatLon }: ReadoutInput): PositionReadout {
  const here = world.villages.find(v => v.id === world.player.location)

  // A location id with no village behind it should degrade to something
  // sensible rather than throw in the middle of a render.
  if (!here) return { headline: 'Somewhere on Arrakis', detail: 'position unknown' }

  const target = world.player.travelTarget
    ? world.villages.find(v => v.id === world.player.travelTarget)
    : undefined

  if (world.player.state === 'traveling' && target) {
    return {
      headline: `${here.name} → ${target.name}`,
      detail: 'under way',
    }
  }

  if (mode === 'location') {
    return { headline: `Inside ${here.name}`, detail: regionDescriptor(toLatLon(here.position)) }
  }

  return { headline: here.name, detail: regionDescriptor(toLatLon(here.position)) }
}
