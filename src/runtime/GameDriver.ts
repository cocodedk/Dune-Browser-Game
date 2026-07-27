// src/runtime/GameDriver.ts
// Renderer-agnostic driver for the simulation. Owns the engine tick and the
// throttled `world:updated` broadcast so any renderer (Phaser today, three.js
// later) can drive the game without importing engine internals itself.
// The caller supplies delta each frame; nothing here touches a renderer API.

import { world } from '../game-engine/GameState'
import { update as engineUpdate, initLoop as engineInitLoop } from '../game-engine/GameLoop'
import { EventBus } from '../EventBus'

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

  updateTimer += deltaMs
  if (updateTimer < UI_UPDATE_INTERVAL_MS) return false

  updateTimer = 0
  EventBus.emit('world:updated', { state: world })
  return true
}
