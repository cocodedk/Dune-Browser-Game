// src/ui/settings/localSettings.ts
// Device-scoped settings — distinct from campaign state (WorldState), so
// they survive New Campaign/Load/reload and are not part of any save.
//
// 03-opening-experience.md "Title and run setup": "Guidance callouts
// default on and may be disabled in setup or settings." This module stores
// and exposes that one datum; W3f is the sole CONSUMER that reads it to
// gate coach marks (this chunk only wires the datum, per progress.md
// Round 11's scope reading).
//
// `store` is dependency-injected (defaulting to `window.localStorage`) so
// this is testable without a DOM — vitest's `environment: 'node'` has no
// `window` at all, which the guard below treats the same as a user who has
// blocked storage: silently fall back to the documented default.

export interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

const GUIDANCE_KEY = 'dune.settings.guidanceEnabled'
/** One JSON object, `{ [dataCoachKey]: true }` — which coach marks the
 * player has dismissed this guidance-on session (W3f). */
const DISMISSED_KEY = 'dune.settings.coachDismissed'

function defaultStore(): KeyValueStore | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null
    return window.localStorage
  } catch {
    return null // storage blocked (private mode, some browser policies)
  }
}

/** Whether coach marks and highlighted controls should appear. Defaults to
 * true — "Guidance callouts default on" — for a store with no prior write,
 * and for a caller with no storage available at all. */
export function getGuidanceEnabled(store: KeyValueStore | null = defaultStore()): boolean {
  if (!store) return true
  const raw = store.getItem(GUIDANCE_KEY)
  if (raw === null) return true
  return raw === 'true'
}

export function setGuidanceEnabled(enabled: boolean, store: KeyValueStore | null = defaultStore()): void {
  store?.setItem(GUIDANCE_KEY, String(enabled))
  // 03 "Guidance behavior": "Re-enabling guidance resumes at the current
  // unmet step" — read as every per-mark dismissal being cleared the
  // instant guidance turns back on, so nothing a player dismissed earlier
  // keeps suppressing that step's mark once they've asked for guidance
  // again. Turning guidance OFF leaves dismissals alone: marks are already
  // hidden while it is off regardless of their dismissed state.
  if (enabled) store?.setItem(DISMISSED_KEY, JSON.stringify({}))
}

function readDismissed(store: KeyValueStore): Record<string, boolean> {
  const raw = store.getItem(DISMISSED_KEY)
  if (!raw) return {}
  try {
    const parsed: unknown = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, boolean>) : {}
  } catch {
    return {} // malformed storage — same fallback shape as no prior write
  }
}

/** Whether one coach mark, by its `data-coach` key, has been dismissed. */
export function isMarkDismissed(key: string, store: KeyValueStore | null = defaultStore()): boolean {
  if (!store) return false
  return readDismissed(store)[key] === true
}

/** Dismiss one coach mark — stays gone until guidance is re-enabled. */
export function dismissMark(key: string, store: KeyValueStore | null = defaultStore()): void {
  if (!store) return
  store.setItem(DISMISSED_KEY, JSON.stringify({ ...readDismissed(store), [key]: true }))
}
