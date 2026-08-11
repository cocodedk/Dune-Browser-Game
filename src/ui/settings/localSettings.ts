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
}
