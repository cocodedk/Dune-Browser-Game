// src/game-render/core/SceneModes.ts
// PURE scene-mode reducer. No three.js, no EventBus, no world access.
//
// This is the load-bearing seam of the render layer: the renderer does not
// decide what to show, it obeys this function. Keeping it pure means mode
// transitions are exhaustively unit-testable without a GL context.

import type { SceneModeId } from '../../types'

export type EngineSignal =
  | { kind: 'travel_start' }
  | { kind: 'travel_complete' }
  | { kind: 'dialogue_start' }
  | { kind: 'dialogue_end' }

/**
 * Next scene mode for a signal.
 *
 * `previous` is the mode to fall back to when a conversation ends — the caller
 * (ModeManager) owns that one-deep history so this stays a pure function of its
 * arguments rather than holding state.
 *
 * A signal that makes no sense for the current mode returns `current`
 * unchanged. This never throws: a dropped or duplicated engine signal must
 * degrade to "no visual change", never to a crash mid-game.
 */
export function nextMode(
  current: SceneModeId,
  signal: EngineSignal,
  previous: SceneModeId = 'strategic',
): SceneModeId {
  switch (signal.kind) {
    case 'travel_start':
      // Conversations are modal — a stray travel signal must not yank the
      // player out of one.
      return current === 'conversation' ? current : 'flight'

    case 'travel_complete':
      // Only meaningful while flying; arriving from anywhere else is a no-op.
      return current === 'flight' ? 'location' : current

    case 'dialogue_start':
      return 'conversation'

    case 'dialogue_end':
      // Never resume into another conversation, and never strand the player
      // mid-flight: flight is a timed cinematic that has already moved on.
      if (current !== 'conversation') return current
      return previous === 'conversation' || previous === 'flight'
        ? 'strategic'
        : previous
  }
}
