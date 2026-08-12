// src/game-render/core/DebugHandle.ts
// window.__DUNE__ — the observation surface for Playwright.
//
// E2E must never assert on pixels: headless WebGL runs through SwiftShader and
// pixel comparison is both slow and flaky. Instead we expose the facts a test
// actually cares about — is it rendering, which mode, how many draw calls —
// and let assertions run against those.
//
// This is the TYPE surface only (the DebugHandle interface + attach/detach).
// The `DebugSources`/`wireDebugHandle` assignment wiring lives in
// wireDebugHandle.ts (WP04 chunk W4b split — this file was at exactly
// 200/200 with no room for the parity affordances below).

import type { SceneModeId, Difficulty } from '../../types'
import { inspectScene } from './inspectScene'
import type { InspectedLight } from './inspectLights'

export { inspectScene }

/** One object in the live scene, with where it actually lands on screen. */
export interface InspectedObject {
  name: string
  type: string
  visible: boolean
  /** World-space position. */
  world: [number, number, number]
  /** The object's local +Y in world space — its orientation, as a unit vector. */
  up: [number, number, number]
  /** Pixel position in the canvas, or null when behind the camera. */
  screen: [number, number] | null
  /** Approximate on-screen radius in pixels, from the bounding sphere. */
  screenRadius: number | null
}

export interface DebugHandle {
  mode: SceneModeId
  frame: number
  worldTime: number
  renderInfo: { calls: number; triangles: number }
  pick(id: string): void
  /** Populated by ThreeContainer; audio state for diagnosis. */
  audio?: () => Record<string, unknown>
  /**
   * Populated by ThreeContainer. Walks the live scene and reports where every
   * mesh actually lands on screen.
   *
   * This exists because "that object looks wrong" is not a diagnosis. Guessing
   * from a screenshot has cost this project whole sessions; reading the real
   * transform takes one call.
   */
  inspect?: () => InspectedObject[]
  /**
   * Every light in the active scene, with the angle each makes to the camera.
   * The number that says whether a body seen from orbit should read as lit.
   */
  lights?: () => InspectedLight[]
  /**
   * Populated by ThreeContainer. Scrubs the engine clock, so the whole day
   * cycle can be inspected without waiting a minute per rotation.
   */
  setTime?: (seconds: number) => void
  /**
   * Populated by ThreeContainer. Forces every region's vegetation, so the
   * long ecology game can be inspected without playing sixty game-days for
   * each check.
   */
  setVegetation?: (value: number) => void
  /** Populated by ThreeContainer. Live worm sightings, for driver scripts. */
  worms?: () => { fieldId: string; atTime: number }[]
  /**
   * Populated by ThreeContainer. Stages a worm attack on a field.
   *
   * Worms only take crews working a *harvester*, which has to be bought from
   * the smugglers first — so reaching a real attack takes a long game, and
   * checking that the sign draws should not.
   */
  signWorm?: (fieldId: string) => void
  /** Populated by ThreeContainer. Reveals every deep-desert site at once. */
  revealSites?: () => void
  /**
   * Populated by ThreeContainer. Puts the player at a location outright.
   *
   * Travel range is deliberately tight early on, so reaching the far side of
   * the map to check that somebody is standing there takes most of a game.
   */
  teleport?: (villageId: string) => void
  /**
   * Populated by ThreeContainer. Issues a harvester to every crew.
   *
   * Buying one takes an act's worth of spice, and checking that the machine
   * draws on the sand should not.
   */
  giveHarvester?: () => void
  /** Populated by ThreeContainer. Issues any equipment kind to every crew. */
  giveEquipment?: (kind: string) => void
  /** Populated by ThreeContainer. Ends the run with a chosen ending. */
  endRun?: (ending: string) => void
  /**
   * Populated by ThreeContainer. A small snapshot of engine state, so a
   * driver script can tell "the click did nothing" from "the engine refused"
   * without reading the DOM.
   */
  player?: () => {
    state: string
    location: string
    travelTarget: string | null
    spice: number
    inDialogue: boolean
    /**
     * Written once at campaign creation (03-opening-experience.md "Title
     * and run setup") — exposed here so an E2E driver can prove the New
     * Campaign setup panel's choice actually reached engine state, without
     * reading the DOM (chunk W3b's difficulty-immutability check).
     */
    difficulty: Difficulty
  }
  /**
   * Populated by debugSources.ts. Read-only campaign state hash
   * (game-engine/state/hash.ts) — never mutates `world`. Closes WP01's
   * "hashState has zero production callers" carry-forward: a browser trace
   * can call this before and after a reload and compare the two strings
   * directly, instead of eyeballing individual fields for drift.
   */
  hashState?: () => string
  /**
   * Populated by debugSources.ts (WP04 W4b). state/parityView.ts's
   * parityHash(world) — the cross-runtime hash e2e/parity.spec.ts compares,
   * over the view excluding `events`/`wormSightings` (parityView.ts's own
   * header). Read-only, like hashState.
   */
  parityHash?: () => string
  /** Populated by debugSources.ts (WP04 W4b). Full parityView(world) JSON —
   * parityHash alone proves THAT two states diverge, not WHERE; this is
   * 07's "both state summaries" on a reported divergence. */
  parityViewJSON?: () => string
  /**
   * Populated by debugSources.ts (WP04 W4b). Harness scaffolding, NOT a
   * trace command: sets `world.paused = true` (hash-excluded, W3i
   * precedent) so the ambient GameDriver rAF loop can never nudge
   * `world.time` between two Playwright round-trips. `advanceTo` un-pauses
   * for its own synchronous span and re-pauses after. Idempotent; call once
   * right after entering a fresh campaign, before any ambient frame runs.
   */
  pauseForParity?: () => void
  /**
   * Populated by debugSources.ts (WP04 W4b). Advances to EXACTLY
   * `targetSeconds` via one synchronous call to sim/advance.ts's
   * `advanceSeconds` — the SAME function the headless runner calls, so a
   * day boundary or travel arrival runs through one shared code path. Not
   * `setTime`: that does a raw `world.time =` write with no runtimeTick
   * call, relying on the next ambient frame to notice — exactly the
   * real-frame-timing drift this hash cannot tolerate (parityView.ts's
   * wormSightings citation). Returns parityHash() from inside the same
   * synchronous call, so no ambient frame can land between the two.
   */
  advanceTo?: (targetSeconds: number) => string
  /**
   * Populated by debugSources.ts (WP04 W4b). Dispatches ONE recorded trace
   * tuple (sim/trace.ts's `[eventName, payload]`) through the LIVE
   * EventBus — the production seam CommandWiring.ts registers and every UI
   * button uses (Round 9's labeled-affordance precedent). Returns
   * parityHash() atomically, same reason as `advanceTo`.
   */
  replay?: (entry: [string, unknown]) => string
}

declare global {
  interface Window {
    __DUNE__?: DebugHandle
  }
}

/**
 * Attach the handle. Enabled in dev, or in any build with `?debug=1`, so a
 * production bundle stays clean unless explicitly asked.
 */
export function shouldAttachDebug(): boolean {
  if (typeof window === 'undefined') return false
  if (import.meta.env?.DEV) return true
  return new URLSearchParams(window.location.search).has('debug')
}

export function attachDebugHandle(pick: (id: string) => void): DebugHandle | null {
  if (!shouldAttachDebug()) return null

  const handle: DebugHandle = {
    mode: 'strategic',
    frame: 0,
    worldTime: 0,
    renderInfo: { calls: 0, triangles: 0 },
    pick,
  }
  window.__DUNE__ = handle
  return handle
}

export function detachDebugHandle(): void {
  if (typeof window !== 'undefined') delete window.__DUNE__
}
