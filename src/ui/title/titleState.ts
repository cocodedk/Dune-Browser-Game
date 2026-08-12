// src/ui/title/titleState.ts
// Pure title-screen state machine + save-metadata formatting — no DOM, no
// IndexedDB. persistence.ts's probeSave()/classifySave() supply the raw
// envelope facts; this module turns them into what the title UI renders and
// decides, and is unit-tested on its own (03-opening-experience.md "Title
// and run setup").

import type { SaveProbe } from '../../game-engine/persistence'

/**
 * Which pane of the title flow is showing. Distinct from ui/store.ts's
 * `screen: 'title' | 'game'` — that decides whether the WHOLE title flow or
 * the game is mounted; this decides which pane of the title flow itself is
 * up, and never leaves the title flow on its own (there is no 'game' value
 * here — TitleScreen.tsx unmounts the whole tree once the store's `screen`
 * flips, it does not transition through this machine to get there).
 */
export type TitleView = 'home' | 'newCampaign' | 'loadCampaign' | 'settings'

export type TitleAction = 'openNewCampaign' | 'openLoadCampaign' | 'openSettings' | 'back'

const TRANSITIONS: Record<TitleView, Partial<Record<TitleAction, TitleView>>> = {
  home: { openNewCampaign: 'newCampaign', openLoadCampaign: 'loadCampaign', openSettings: 'settings' },
  newCampaign: { back: 'home' },
  loadCampaign: { back: 'home' },
  settings: { back: 'home' },
}

/** The one legal-transition table. An action not valid from the current
 * view is a no-op — returns the SAME view rather than throwing — so a
 * stray event (e.g. a second `back` while already home) can never crash
 * the title screen. */
export function nextTitleView(current: TitleView, action: TitleAction): TitleView {
  return TRANSITIONS[current]?.[action] ?? current
}

export interface SaveMetadataView {
  /** Epoch ms — display metadata only, matches persistence.ts's
   * CanonicalSaveEnvelope.savedAt doc: never read by simulation. */
  savedAt: number
  day: number
}

/**
 * What the title screen needs to know about the one rolling save. The
 * three-way split is 03's own requirement: "explicit corrupt/incompatible-
 * state handling... never a silent fresh start and never a crash."
 */
export type SaveAvailability =
  | { kind: 'absent' }
  | { kind: 'corrupt' }
  | { kind: 'valid'; metadata: SaveMetadataView }

/** Convert persistence.ts's raw probe result into the title's own type —
 * kept as a separate conversion (rather than reusing SaveProbe by another
 * name) so this module's own tests need no IndexedDB import at all. */
export function toSaveAvailability(probe: SaveProbe): SaveAvailability {
  if (probe.status === 'absent') return { kind: 'absent' }
  if (probe.status === 'corrupt') return { kind: 'corrupt' }
  return { kind: 'valid', metadata: { savedAt: probe.savedAt, day: probe.day } }
}

/** Continue is visible only for a save that migrated cleanly — 03: "when a
 * valid autosave or most-recent manual save exists." */
export function canContinue(availability: SaveAvailability): boolean {
  return availability.kind === 'valid'
}

const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS

/** "Day 12 — saved 3h ago" — the Continue/Load Campaign metadata line.
 * Takes `now` as a parameter (default Date.now()) so it is testable against
 * a fixed clock instead of racing the real one. */
export function formatSaveMetadata(metadata: SaveMetadataView, now: number = Date.now()): string {
  const age = Math.max(0, now - metadata.savedAt)
  let ago: string
  if (age < MINUTE_MS) ago = 'just now'
  else if (age < HOUR_MS) ago = `${Math.floor(age / MINUTE_MS)}m ago`
  else if (age < DAY_MS) ago = `${Math.floor(age / HOUR_MS)}h ago`
  else ago = `${Math.floor(age / DAY_MS)}d ago`
  return `Day ${metadata.day} — saved ${ago}`
}

/** The corrupt-save error line — one fixed message, never a raw exception
 * or a silent fallback to "no save". */
export const CORRUPT_SAVE_MESSAGE =
  'This save could not be loaded — it may be corrupted or from an incompatible game version.'
