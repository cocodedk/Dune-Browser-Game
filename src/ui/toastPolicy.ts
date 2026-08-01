// src/ui/toastPolicy.ts
// How long a message stays on screen, and whether it appears there at all.
//
// PURE — takes a GameEventType, returns a duration. No React, no DOM, so the
// policy is unit-testable and the component stays a renderer.
//
// The problem this solves: every message in the game went to the event log at
// the bottom of the right-hand command column. Measured against how the game is
// actually played, that is the wrong place — a player watching Arrakis in the
// centre of the screen never looks there, so travel refusals ("out of range",
// "undiscovered") read as the game silently ignoring the click. The messages
// were being written and never delivered.

import type { GameEventType } from '../types'

/** The default. Long enough to read a short line, short enough not to nag. */
export const BRIEF_MS = 2000

/**
 * For consequences rather than confirmations. An attack resolving or an act
 * turning is worth a beat longer than "task assigned" — but still passes on its
 * own, because none of these ask the player for anything.
 */
export const WEIGHTY_MS = 5000

const WEIGHTY: ReadonlySet<GameEventType> = new Set([
  'attack',
  'betrayal',
  'tribute_refused',
  'alliance_offer',
  'poc_goal_achieved',
  'fedaykin_ready',
])

/**
 * Events that already own a piece of the screen, and so must not be duplicated
 * as a floating message.
 *
 * The dialogue pair is the whole reason this set exists: `dialogue_start` fires
 * at the same moment DialoguePanel opens a modal card carrying the same words.
 * Toasting it would put the speaker's name on screen twice, in two places, for
 * the same event.
 */
const OWNS_ITS_OWN_UI: ReadonlySet<GameEventType> = new Set([
  'dialogue_start',
  'dialogue_end',
])

/**
 * How long this event should sit in the centre of the screen.
 *
 * @returns milliseconds, or 0 when the event must not be shown as a toast.
 */
export function toastDurationMs(type: GameEventType): number {
  if (OWNS_ITS_OWN_UI.has(type)) return 0
  return WEIGHTY.has(type) ? WEIGHTY_MS : BRIEF_MS
}

/** Whether this event appears in the centre of the screen at all. */
export function isToasted(type: GameEventType): boolean {
  return toastDurationMs(type) > 0
}

/**
 * Most messages the player can act on arrive in bursts — a day boundary fires
 * several at once. Showing all of them stacks a wall of text over the map, so
 * the layer keeps only the newest few.
 */
export const MAX_VISIBLE = 3
