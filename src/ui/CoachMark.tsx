// src/ui/CoachMark.tsx
// The single guidance overlay (03-opening-experience.md "Guidance
// behavior", all five rules):
//
// 1. Targets exactly one control, never blocks the rest of the screen —
//    the wrapper is `pointerEvents: 'none'`, no backdrop; only the small ×
//    is clickable.
// 2. Disappears when the player performs the action, not a timer — the
//    mark is DERIVED from `activeOpeningObjective(world)` every render, so
//    the instant the objective advances (the real signal) the key changes
//    or disappears with it. No setTimeout anywhere in this file.
// 3. Dismissable per mark, stored in localSettings — the × calls
//    dismissMark(key); isMarkDismissed(key) hides it on every render after.
// 4. Re-enabling guidance resumes at the current unmet step — localSettings'
//    setGuidanceEnabled(true) clears every dismissal; this component just
//    reads that state fresh each render, no cache of its own to invalidate.
// 5. Always carries a text label (coachMarkCopy.ts) — never color/animation
//    alone.
//
// Positions a pulse outline over whatever DOM node currently owns
// `data-coach="<key>"`, found fresh rather than held onto: the target can
// unmount (a destination row disappears once you're standing there) or move
// (the command column scrolls independently — theme.ts's COMMAND_COLUMN_WIDTH
// panel). No canvas marker anywhere (03: "No guidance relies only on...a
// canvas marker") — this is a plain positioned DOM overlay.

import { useEffect, useLayoutEffect, useState } from 'react'
import { useGameStore } from './store'
import { activeOpeningObjective } from '../game-engine/acts/openingObjectives'
import { coachMarkKey } from './coachMarkTarget'
import { coachMarkLabel } from './coachMarkCopy'
import { getGuidanceEnabled, isMarkDismissed, dismissMark } from './settings/localSettings'
import { findCoachAnchor } from './coachAnchor'
import { palette } from './theme'

interface Rect { top: number; left: number; width: number; height: number }

function measure(key: string): Rect | null {
  const el = findCoachAnchor(key)
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { top: r.top, left: r.left, width: r.width, height: r.height }
}

function rectsEqual(a: Rect | null, b: Rect | null): boolean {
  if (a === b) return true
  if (!a || !b) return false
  return a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height
}

export default function CoachMark() {
  // NOT `useGameStore(s => s.world)`. GameDriver.ts's throttled broadcast
  // re-emits the SAME mutable `world` object every tick (GameState.ts's
  // singleton, mutated in place, never cloned) — a selector keyed on that
  // reference is Object.is-equal forever, so zustand would never re-render
  // this component past its first mount (measured: a mark froze on a stale
  // step and kept showing after the dialogue it should have been suppressed
  // by had opened). Destructuring the whole store is the pattern every
  // other panel here already uses (DestinationList.tsx, QuotaLedger.tsx,
  // ObjectivePanel.tsx, ...) for exactly this reason.
  const { world } = useGameStore()
  const [rect, setRect] = useState<Rect | null>(null)

  const active = getGuidanceEnabled() ? activeOpeningObjective(world) : null
  const rawKey = coachMarkKey(active, world)
  const key = rawKey && !isMarkDismissed(rawKey) ? rawKey : null

  // Remeasure after every render, not a dependency array naming `world` —
  // that reference never changes (see above), so an effect keyed on it
  // would never re-run either. Guarded against an infinite loop: setRect
  // only fires when the measured rect actually differs from what is
  // already shown, so a render that measures the same rect is a no-op.
  useLayoutEffect(() => {
    const next = key ? measure(key) : null
    setRect(prev => (rectsEqual(prev, next) ? prev : next))
  })

  // Resize/scroll are real DOM events, not store ticks — kept in their own
  // effect, scoped to `key` alone, so listeners are not torn down and
  // rebuilt on every render. `true` (capture) catches scroll from the
  // command column's own nested `overflow-y: auto`, which does not bubble
  // to window in the bubble phase.
  useEffect(() => {
    if (!key) return
    const onReflow = () => setRect(measure(key))
    window.addEventListener('resize', onReflow)
    window.addEventListener('scroll', onReflow, true)
    return () => {
      window.removeEventListener('resize', onReflow)
      window.removeEventListener('scroll', onReflow, true)
    }
  }, [key])

  if (!key || !rect) return null

  return (
    <div
      style={{
        position: 'fixed',
        // Above SettlementModal's overlay (150), below ConfirmModal's (200)
        // — a mark must be visible even while the pending-settlement modal
        // is open (it can target 'settle-button', inside that modal), but a
        // confirm step is never itself interrupted.
        zIndex: 160,
        pointerEvents: 'none',
        top: rect.top - 5,
        left: rect.left - 5,
        width: rect.width + 10,
        height: rect.height + 10,
      }}
    >
      <div style={styles.outline} />
      <div style={styles.tag}>
        <span style={styles.label}>{coachMarkLabel(key)}</span>
        {/* U+2715 (✕), not DialoguePanel.tsx's U+00D7 (×): e2e/helpers.ts's
            clickButton('×') matches raw textContent app-wide, and a real
            dialogue can be open at the same moment a mark is dismissable
            elsewhere on screen — a shared glyph would make that helper pick
            whichever button happens to render first in the DOM. */}
        <button style={styles.dismiss} aria-label="Dismiss guidance" onClick={() => dismissMark(key)}>
          ✕
        </button>
      </div>
    </div>
  )
}

const styles = {
  outline: {
    position: 'absolute' as const,
    inset: 0,
    border: `2px solid ${palette.gold}`,
    borderRadius: 4,
    boxShadow: '0 0 0 3px rgba(212,160,23,0.25)',
  },
  tag: {
    position: 'absolute' as const,
    top: -22,
    left: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    pointerEvents: 'auto' as const,
  },
  label: {
    background: palette.ink,
    color: palette.gold,
    fontSize: 10,
    fontWeight: 700 as const,
    letterSpacing: '0.04em',
    padding: '2px 6px',
    borderRadius: 2,
    border: `1px solid ${palette.gold}`,
    whiteSpace: 'nowrap' as const,
  },
  dismiss: {
    background: palette.ink,
    color: palette.textDim,
    border: `1px solid ${palette.line}`,
    borderRadius: 2,
    fontSize: 10,
    lineHeight: 1,
    padding: '2px 5px',
    cursor: 'pointer' as const,
  },
}
