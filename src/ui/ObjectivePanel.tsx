// src/ui/ObjectivePanel.tsx
// The completed-step history, and nothing else.
//
// This file used to carry the whole objective surface: the active line
// (title, substeps, progress, Show, Why), the post-opening placeholder AND
// the ✓ history, all at `top:72 left:20`, fontSize 13. The owner does not
// read the corners — "my focus is on the center of the screen and I don't
// read the sidebar" — so the ACTIVE line MOVED to ObjectiveBanner.tsx in the
// scene-centred band. Read that file for the reasoning and for the rules the
// moved block still has to keep.
//
// The history STAYED here on purpose. 03-opening-experience.md asks for "a
// compact history"; centre-screen it would grow, step by step, straight into
// the toast band and end up covering the desert it is meant to sit over.
//
// Moved, never duplicated: six e2e assertions use bare `text=…` locators,
// which Playwright resolves strictly, so net text on screen is unchanged and
// each of them still matches exactly one element.

import { useGameStore } from './store'
import { completedOpeningObjectives } from '../game-engine/acts/openingObjectives'
import { OBJECTIVE_COPY } from './objectiveCopy'
import { palette } from './theme'

export default function ObjectivePanel() {
  // NOT `useGameStore(s => s.world)` — see CoachMark.tsx:52-61 for why a
  // selector on that reference never re-renders.
  const { world } = useGameStore()

  // `opening.complete` is a bookkeeping flag, not a step the player did —
  // it never appears in the history, exactly as it never appeared as the
  // active line.
  const history = completedOpeningObjectives(world).filter(r => r.id !== 'opening.complete')
  if (history.length === 0) return null

  return (
    <div style={styles.box}>
      {history.map(r => (
        <div key={r.id} style={styles.historyItem}>✓ {OBJECTIVE_COPY[r.id].title}</div>
      ))}
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
    gap: 2,
    pointerEvents: 'none' as const,
  },
  historyItem: { color: palette.textFaint, fontSize: 10, textShadow: HALO },
}
