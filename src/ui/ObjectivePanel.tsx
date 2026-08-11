// src/ui/ObjectivePanel.tsx
// The active-objective surface (03-opening-experience.md "Objective
// presentation"): one verb-first sentence, at most two substeps, a Show
// action, progress where meaningful, a Why expander, and a compact history
// of completed opening steps. Wording lives in objectiveCopy.ts — this
// component renders it, never authors it (02-runtime-consolidation.md
// "Campaign status": "UI wording is authored outside the engine query").
//
// Placed under PositionStrip, left edge — EventToasts already owns the
// top-centre band (its own doc: "where the player is actually looking"),
// and the command column is for panels, not the one always-on objective
// line. `Show` for a location target reuses the existing pick/selection
// store (EventBus 'village:selected' — the same event a canvas click
// emits); a panel-key target (W3h) briefly flashes the same `data-coach`
// anchor CoachMark.tsx points at (coachAnchor.ts) — a one-shot highlight,
// not a persistent coach mark, so Show never blocks the rest of the screen
// either.

import { useState } from 'react'
import { useGameStore } from './store'
import { EventBus } from '../EventBus'
import { activeOpeningObjective, completedOpeningObjectives } from '../game-engine/acts/openingObjectives'
import type { ObjectiveTargetHint } from '../game-engine/acts/openingObjectives'
import { OBJECTIVE_COPY, PANEL_LABELS, POST_OPENING_PLACEHOLDER } from './objectiveCopy'
import { findCoachAnchor } from './coachAnchor'
import { palette, type as typo } from './theme'

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

export default function ObjectivePanel() {
  const { world } = useGameStore()
  const [showWhy, setShowWhy] = useState(false)

  const active = activeOpeningObjective(world)
  // `opening.complete` never appears as the active line — once every real
  // step is done there is nothing left to surface here (03: "At no point
  // may the only current goal be ... a raw flag name"); WP05 replaces this
  // with Act 1's own objectives once they exist.
  const displayActive = active && active.id !== 'opening.complete' ? active : null
  const history = completedOpeningObjectives(world).filter(r => r.id !== 'opening.complete')
  // `active === null` only once the WHOLE chain, including opening.complete,
  // is done (openingObjectives.ts's activeOpeningObjective) — task item 3's
  // "the objective surface moves past the opening chain" reading.
  const pastOpening = active === null

  if (!displayActive && !pastOpening && history.length === 0) return null

  const copy = displayActive ? OBJECTIVE_COPY[displayActive.id] : undefined

  return (
    <div style={styles.box}>
      {pastOpening && <div style={styles.title}>{POST_OPENING_PLACEHOLDER}</div>}
      {displayActive && copy && (
        <>
          <div style={styles.title}>{copy.title}</div>
          {copy.substeps?.map(s => (
            <div key={s} style={styles.substep}>· {s}</div>
          ))}
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
          {showWhy && <p style={styles.why}>{copy.why}</p>}
        </>
      )}
      {history.length > 0 && (
        <div style={styles.history}>
          {history.map(r => (
            <div key={r.id} style={styles.historyItem}>✓ {OBJECTIVE_COPY[r.id].title}</div>
          ))}
        </div>
      )}
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
  box: {
    position: 'absolute' as const,
    top: 72,
    left: 20,
    maxWidth: 320,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 3,
    pointerEvents: 'none' as const,
  },
  title: { color: palette.gold, fontSize: 13, fontWeight: 600 as const, textShadow: HALO },
  substep: { color: palette.textDim, fontSize: 11, textShadow: HALO },
  progress: {
    color: palette.text, fontSize: 11,
    fontVariantNumeric: 'tabular-nums' as const, textShadow: HALO,
  },
  actions: { display: 'flex', gap: 10, marginTop: 2 },
  link: {
    pointerEvents: 'auto' as const,
    background: 'transparent',
    border: 'none',
    color: palette.textDim,
    fontSize: 10,
    letterSpacing: '0.04em',
    textDecoration: 'underline',
    cursor: 'pointer',
    padding: 0,
    textShadow: HALO,
  },
  why: { ...typo.note, marginTop: 2, maxWidth: 300, textShadow: HALO },
  history: { marginTop: 6, display: 'flex', flexDirection: 'column' as const, gap: 2 },
  historyItem: { color: palette.textFaint, fontSize: 10, textShadow: HALO },
}
