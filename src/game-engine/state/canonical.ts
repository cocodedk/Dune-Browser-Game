// src/game-engine/state/canonical.ts
// Deterministic serialization of the canonical campaign state.
//
// docs/PRD/game-completion/02-runtime-consolidation.md ("Campaign status"):
// `goalAchieved` may remain temporarily as a derived compatibility value
// "but it must not be serialized ... independently". `factionProfiles` is
// excluded for a different reason (WP02f, see state/schema.ts's v5 note):
// it is static, quarantined-sandbox content with no live campaign writer,
// reseeded fresh on every load instead of persisted. `paused` (W3i
// remediation) follows the SAME "Campaign status" precedent as
// `goalAchieved`: it is a derived, transient control-surface value, not
// campaign content, and a save taken while paused (e.g. the travel-start
// autosave) must not restore frozen with the 0x control desynced from the
// visible controls — persistence.ts's fromEnvelope forces it back to
// `false` on every load instead. None of the three is part of the canonical
// form a save or a state hash is built from. ("Randomness") adds the seeded
// `rng` — already part of `WorldState` — as canonical instead.

import type { WorldState } from '../../types'
import type { CanonicalCampaignState } from './schema'

/**
 * Recursively sort object keys so two structurally-equal states always
 * produce byte-identical JSON, regardless of property insertion order.
 * Array element order is meaningful game data (village lists, event logs)
 * and is left untouched — only object keys are sorted.
 */
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    const out: Record<string, unknown> = {}
    for (const [key, val] of entries) out[key] = canonicalize(val)
    return out
  }
  return value
}

/**
 * The canonical campaign object itself — `goalAchieved`/`factionProfiles`/
 * `paused` omitted (see module header), everything else including
 * `lastProcessedDay` included as-is, key order untouched. This is what
 * persistence.ts stores: IndexedDB structured-clones a plain object fine,
 * and sorted keys only matter for the string form below.
 */
export function toCanonicalState(world: WorldState): CanonicalCampaignState {
  const { goalAchieved: _goalAchieved, factionProfiles: _factionProfiles, paused: _paused, ...rest } = world
  void _goalAchieved
  void _factionProfiles
  void _paused
  return rest
}

/**
 * Canonical, deterministic JSON of campaign state: stable key order, with
 * `goalAchieved`/`factionProfiles`/`paused` omitted (see module header) and
 * `rng` included.
 */
export function serializeCanonical(world: WorldState): string {
  return JSON.stringify(canonicalize(toCanonicalState(world)))
}
