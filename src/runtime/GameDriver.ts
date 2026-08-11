// src/runtime/GameDriver.ts
// Renderer-agnostic driver for the simulation. Owns the engine tick and the
// throttled `world:updated` broadcast so any renderer (three.js today, others
// later) can drive the game without importing engine internals itself.
// The caller supplies delta each frame; nothing here touches a renderer API.

import { world } from '../game-engine/GameState'
import { update as engineUpdate, initLoop as engineInitLoop } from '../game-engine/GameLoop'
import { EventBus } from '../EventBus'
import { maybeOpenOpeningDialogue } from './openingBriefing'
import { maybeOpenQ1Debrief } from './q1Debrief'
import { maybeAutosavePendingSettlement } from './pendingSettlementAutosave'

const UI_UPDATE_INTERVAL_MS = 100 // throttle for world:updated / renderer refresh

let updateTimer = 0

/**
 * Reset engine time/events and the UI throttle, then broadcast the initial
 * world snapshot so listeners (React store, renderer) start in sync.
 */
export function initLoop(): void {
  engineInitLoop()
  updateTimer = 0
  EventBus.emit('world:updated', { state: world })
}

/**
 * Advance the simulation by deltaMs of real time.
 * Returns true on the frame the 100ms throttle fires — the caller should
 * refresh its own view (village colors, territory zones, etc.) on that frame,
 * since `world:updated` was just broadcast in step with it.
 */
export function tick(deltaMs: number): boolean {
  engineUpdate(deltaMs / 1000)
  // W3i remediation: the opening's own auto-open used to fire once, from
  // ThreeContainer's mount effect only — a fresh campaign started mid-session
  // (StatusBar's New button) never remounts ThreeContainer, so the briefing
  // never reopened and the clock froze forever (pause.ts's briefingPending).
  // Moved here, the same per-frame shape as maybeOpenQ1Debrief below, so it
  // self-heals on ANY path into a fresh world — title, StatusBar New, or any
  // future one — with no remount required. See runtime/openingBriefing.ts's
  // own doc for why its guards already re-arm correctly for a new world.
  maybeOpenOpeningDialogue()
  // Beat 7's debrief auto-open (03-opening-experience.md) — see
  // runtime/q1Debrief.ts's own doc for why this lives here rather than
  // inside settleCommand.ts itself.
  maybeOpenQ1Debrief()
  // Recovery row (f)'s settlement-pause autosave — see
  // runtime/pendingSettlementAutosave.ts's own doc.
  maybeAutosavePendingSettlement()

  updateTimer += deltaMs
  if (updateTimer < UI_UPDATE_INTERVAL_MS) return false

  updateTimer = 0
  EventBus.emit('world:updated', { state: world })
  return true
}
