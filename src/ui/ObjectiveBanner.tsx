// src/ui/ObjectiveBanner.tsx
// The ACTIVE objective, where the player is actually looking.
//
// This block was ObjectivePanel.tsx's — top-left corner, fontSize 13 — and
// the owner's verdict on the M1 build was "I have no idea how to harvest or
// collect spice", against his earlier standing note: "my focus is on the
// center of the screen and I don't read the sidebar". So the one line naming
// the next action MOVED here; the corner panel keeps only the completed-✓
// history.
//
// MOVED, never duplicated. Six e2e assertions use bare `text=…` locators,
// which Playwright resolves strictly — rendering the objective title in both
// the corner and the centre is an instant strict-mode violation in all of
// them. Net text on screen is unchanged.
//
// Scene-centred, not viewport-centred: the command column owns the right
// edge and ThreeContainer.tsx already shifts the camera's optical centre by
// half of it, so `width: calc(100% - COMMAND_COLUMN_WIDTH)` is what makes
// this land on the part of the screen he is watching. Same geometry
// EventToasts.tsx uses; the vertical budget that keeps the two from
// overlapping is centreBand.ts's, not a literal here.
//
// Rules this surface must keep (each pinned by an existing spec):
//  - ACTIVE step only, never a preview — game.spec.ts:196 asserts `Stilgar`
//    is not visible during the briefing, and act1.earn_trust's title names
//    him. `activeOpeningObjective` already returns only the first incomplete
//    step; no look-ahead is added here.
//  - No raw ids — opening6.spec.ts:20 asserts `sietch_tabr` count 0, hence
//    the `replace(/_/g, ' ')` treatment on a location target's label.

import { useState } from 'react'
import { useGameStore } from './store'
import { EventBus } from '../EventBus'
import { activeOpeningObjective } from '../game-engine/acts/openingObjectives'
import type { ObjectiveTargetHint } from '../game-engine/acts/openingObjectives'
import { OBJECTIVE_COPY, PANEL_LABELS, POST_OPENING_PLACEHOLDER } from './objectiveCopy'
import { findCoachAnchor } from './coachAnchor'
import { COMMAND_COLUMN_WIDTH, palette, type as typo } from './theme'
import { BANNER_TOP_CSS, BANNER_MAX_HEIGHT_PX } from './centreBand'

const FLASH_MS = 900

/** Brief outline/glow on whatever `data-coach="<key>"` currently owns —
 * plain imperative style mutation, reverted after FLASH_MS, so a panel that
 * is not mounted right now (its objective step not yet reachable on
 * screen) is a silent no-op rather than a broken promise (evidence
 * finding F4: "a button that lies is worse than an absent one"). */
function flashPanel(key: string): void {
  const el = findCoachAnchor(key)
  if (!el) return
  const prevOutline = el.style.outline
  const prevShadow = el.style.boxShadow
  el.style.outline = `2px solid ${palette.gold}`
  el.style.boxShadow = '0 0 0 4px rgba(212,160,23,0.35)'
  window.setTimeout(() => {
    el.style.outline = prevOutline
    el.style.boxShadow = prevShadow
  }, FLASH_MS)
}

function showTarget(hint: ObjectiveTargetHint): void {
  if (hint.kind === 'location') EventBus.emit('village:selected', { villageId: hint.id })
  else flashPanel(hint.key)
}

function targetLabel(hint: ObjectiveTargetHint): string {
  return hint.kind === 'location' ? hint.id.replace(/_/g, ' ') : PANEL_LABELS[hint.key] ?? hint.key
}

export default function ObjectiveBanner() {
  // NOT `useGameStore(s => s.world)` — GameDriver re-emits the SAME mutable
  // object every tick, so a selector keyed on it never re-renders (the bug
  // CoachMark.tsx:52-61 documents at length).
  const { world } = useGameStore()
  const [showWhy, setShowWhy] = useState(false)

  const active = activeOpeningObjective(world)
  // `opening.complete` never appears as the active line — once every real
  // step is done there is nothing left to surface here (03: "At no point
  // may the only current goal be ... a raw flag name").
  const displayActive = active && active.id !== 'opening.complete' ? active : null
  const pastOpening = active === null

  if (!displayActive && !pastOpening) return null

  const copy = displayActive ? OBJECTIVE_COPY[displayActive.id] : undefined

  return (
    <div style={styles.layer}>
      <div style={styles.block}>
        {pastOpening && <div style={styles.title}>{POST_OPENING_PLACEHOLDER}</div>}
        {displayActive && copy && (
          <>
            <div style={styles.title}>{copy.title}</div>
            {/* Substeps step aside while Why is open rather than stacking
                under it: centreBand.ts budgets this block a fixed height,
                and the explanation supersedes the summary it explains. */}
            {!showWhy && copy.substeps?.map(s => (
              <div key={s} style={styles.substep}>· {s}</div>
            ))}
            {showWhy && <p style={styles.why}>{copy.why}</p>}
            {displayActive.progress && (
              <div style={styles.progress}>
                {displayActive.progress.current.toFixed(0)} / {displayActive.progress.target.toFixed(0)}
              </div>
            )}
            <div style={styles.actions}>
              <button style={styles.link} onClick={() => showTarget(displayActive.targetHint)}>
                Show — {targetLabel(displayActive.targetHint)}
              </button>
              <button style={styles.link} onClick={() => setShowWhy(w => !w)}>
                {showWhy ? 'Hide why' : 'Why?'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/** Tight opaque halo plus a wide soft one — legible over sand or sky. */
const HALO = [
  '0 0 2px rgba(8,5,2,0.95)',
  '0 1px 3px rgba(8,5,2,0.9)',
  '0 2px 12px rgba(8,5,2,0.75)',
].join(', ')

const styles = {
  layer: {
    position: 'fixed' as const,
    top: BANNER_TOP_CSS,
    left: 0,
    width: `calc(100% - ${COMMAND_COLUMN_WIDTH}px)`,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    // The map is this game's primary control surface; a transparent strip
    // across it must not eat clicks. Only the two links opt back in.
    pointerEvents: 'none' as const,
    zIndex: 40,
  },
  block: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 3,
    maxWidth: 620,
    // The budget centreBand.ts hands EventToasts its top from — capped so a
    // long authored title (WP05's Act 2-4 objectives) cannot grow down into
    // the message band on a 720px-tall viewport.
    maxHeight: BANNER_MAX_HEIGHT_PX,
    overflow: 'hidden' as const,
    textAlign: 'center' as const,
  },
  title: { color: palette.gold, fontSize: 16, fontWeight: 600 as const, lineHeight: 1.25, textShadow: HALO },
  substep: { color: palette.textDim, fontSize: 12, lineHeight: 1.3, textShadow: HALO },
  progress: {
    color: palette.text, fontSize: 12,
    fontVariantNumeric: 'tabular-nums' as const, textShadow: HALO,
  },
  actions: { display: 'flex', gap: 12, marginTop: 1 },
  link: {
    pointerEvents: 'auto' as const,
    background: 'transparent',
    border: 'none',
    color: palette.textDim,
    fontSize: 11,
    letterSpacing: '0.04em',
    textDecoration: 'underline',
    cursor: 'pointer',
    padding: 0,
    textShadow: HALO,
  },
  why: { ...typo.note, fontSize: 12, margin: 0, maxWidth: 560, textShadow: HALO },
}
