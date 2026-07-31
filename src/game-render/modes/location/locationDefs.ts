// src/game-render/modes/location/locationDefs.ts
// PURE per-location diorama definitions.
//
// Each location kind gets a palette and a horizon treatment rather than its own
// bespoke scene. Twelve hand-built interiors is a content bill this project
// cannot pay; a small set of well-differentiated moods, tinted by the hour, is
// both cheaper and more consistent.

import type { LocationKind } from '../../../types'

export interface DioramaDef {
  /** Sky/backdrop gradient, top to bottom. */
  skyTop: string
  skyBottom: string
  /** Colour of the massing that frames the view. */
  massing: string
  /** How much of the frame the massing occupies, 0..1. */
  enclosure: number
  /** Warm interior glow strength, 0..1. */
  hearth: number
}

const DEFS: Record<LocationKind, DioramaDef> = {
  // Carved rock, enclosed and lit from within.
  sietch: {
    skyTop: '#3a2414', skyBottom: '#1a1109',
    massing: '#2b1c10', enclosure: 0.72, hearth: 0.8,
  },
  // High vaulted stone, cooler and more formal.
  palace: {
    skyTop: '#4a3a2a', skyBottom: '#241a12',
    massing: '#3a2e22', enclosure: 0.55, hearth: 0.45,
  },
  // Cramped, cluttered, lamplit.
  smuggler_den: {
    skyTop: '#2e2416', skyBottom: '#15100a',
    massing: '#241c11', enclosure: 0.8, hearth: 0.95,
  },
  // Hard angles against an open sky.
  fort: {
    skyTop: '#5a3a2a', skyBottom: '#2a1a12',
    massing: '#1f1710', enclosure: 0.5, hearth: 0.2,
  },
  // Barely sheltered — mostly sky.
  field_camp: {
    skyTop: '#c98a52', skyBottom: '#7d4a24',
    massing: '#4a3018', enclosure: 0.25, hearth: 0.35,
  },
  // Functional, exposed.
  station: {
    skyTop: '#8a6a44', skyBottom: '#3a2a1a',
    massing: '#2e2418', enclosure: 0.4, hearth: 0.3,
  },
}

export function dioramaFor(kind: LocationKind): DioramaDef {
  return DEFS[kind] ?? DEFS.field_camp
}

export interface Hotspot {
  id: string
  label: string
  /** Normalised frame position, 0..1 from the left and bottom. */
  x: number
  y: number
}

/**
 * Hotspots offered at a location.
 *
 * Deliberately few: the diorama is for atmosphere and orientation, not a
 * second control surface competing with the panels. Anything the panels
 * already do well is not duplicated here.
 */
export function hotspotsFor(kind: LocationKind, hasSpeaker: boolean): Hotspot[] {
  const spots: Hotspot[] = []
  if (hasSpeaker) spots.push({ id: 'talk', label: 'Speak', x: 0.5, y: 0.42 })
  if (kind === 'smuggler_den') {
    spots.push({ id: 'trade', label: 'Trade', x: 0.74, y: 0.36 })
  }
  spots.push({ id: 'leave', label: 'Depart', x: 0.5, y: 0.12 })
  return spots
}
