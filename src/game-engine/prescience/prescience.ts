// src/game-engine/prescience/prescience.ts
// PURE prescience rules — the capability ladder.
//
// Each level removes a specific friction rather than granting raw power. L2 in
// particular retires most travel, which is correct pacing for a late game but
// has to be earned: it is the difference between running an operation and
// flying errands for it.

export type PrescienceLevel = 0 | 1 | 2 | 3

export const AWARENESS = 1 // Act 1 finale: hidden sietches become findable
export const FARSPEECH = 2 // Act 2: remote orders, no travel required
export const FORESIGHT = 3 // Act 3: raid warnings and a density overlay

export const FARSPEECH_CHARISMA = 50
export const FORESIGHT_FORTS = 2
export const RAID_WARNING_DAYS = 3

export interface PrescienceView {
  level: PrescienceLevel
  charisma: number
  ritualsUsed: number
  fortsDestroyed: number
  act: string
}

export type GrantRefusal = 'already-held' | 'wrong-act' | 'charisma' | 'forts'

export type GrantCheck =
  | { ok: true; level: PrescienceLevel }
  | { ok: false; reason: GrantRefusal }

/**
 * Whether the next level can be granted.
 *
 * Refusals are distinct so the seer can say what is still missing, rather than
 * the player repeatedly attempting a ritual that silently does nothing.
 */
export function checkGrant(view: PrescienceView): GrantCheck {
  const next = (view.level + 1) as PrescienceLevel
  if (next > FORESIGHT) return { ok: false, reason: 'already-held' }

  if (next === AWARENESS) {
    return view.act === 'act1' || view.act === 'act2'
      ? { ok: true, level: AWARENESS }
      : { ok: false, reason: 'wrong-act' }
  }

  if (next === FARSPEECH) {
    if (view.act === 'act1') return { ok: false, reason: 'wrong-act' }
    return view.charisma >= FARSPEECH_CHARISMA
      ? { ok: true, level: FARSPEECH }
      : { ok: false, reason: 'charisma' }
  }

  // Foresight.
  if (view.act === 'act1' || view.act === 'act2') {
    return { ok: false, reason: 'wrong-act' }
  }
  return view.fortsDestroyed >= FORESIGHT_FORTS
    ? { ok: true, level: FORESIGHT }
    : { ok: false, reason: 'forts' }
}

export function grantRefusalMessage(reason: GrantRefusal): string {
  switch (reason) {
    case 'already-held':
      return 'There is nothing further the spice will show you.'
    case 'wrong-act':
      return 'The time for that sight has not come.'
    case 'charisma':
      return 'Too few follow you for your voice to carry that far.'
    case 'forts':
      return 'The future stays clouded while their strongholds stand.'
  }
}

// --- Capabilities -----------------------------------------------------------

/** Hidden locations become findable by prospecting. */
export function canSenseHidden(level: PrescienceLevel): boolean {
  return level >= AWARENESS
}

/**
 * Orders can be issued without standing there.
 *
 * This is the single biggest reduction in busywork in the game, and the reason
 * it is gated behind an act and a charisma threshold.
 */
export function canOrderRemotely(level: PrescienceLevel): boolean {
  return level >= FARSPEECH
}

/** Raids are announced in advance. */
export function raidWarningDays(level: PrescienceLevel): number {
  return level >= FORESIGHT ? RAID_WARNING_DAYS : 0
}

/**
 * Spice density is visible without prospecting.
 *
 * Restricted to already-discovered regions so it never makes prospecting
 * pointless — it reveals how good known sand is, not where unknown sand lies.
 */
export function canSeeDensity(level: PrescienceLevel, regionDiscovered: boolean): boolean {
  return level >= FORESIGHT && regionDiscovered
}

/** Player-facing description of what a level granted. */
export function levelDescription(level: PrescienceLevel): string {
  switch (level) {
    case 0: return 'The sand is only sand.'
    case 1: return 'You feel the shape of places you have not walked.'
    case 2: return 'Your voice reaches those who follow you, wherever they stand.'
    case 3: return 'You see the raid before it forms, and the spice beneath the dunes.'
  }
}
