// src/ui/FlightSkipButton.tsx
// The visible Skip control 03-opening-experience.md Beat 3 requires
// alongside Escape ("after that, Escape and a visible Skip control are
// legal"). Plain React with no access to the renderer's `modes` handle, so
// it only emits a bus event — ui/sceneInput.ts owns the actual skip and
// applies the same canSkipFlight() gate Escape uses, from the SAME
// closure, so the two paths cannot disagree about when three seconds have
// passed.

import { useEffect, useState } from 'react'
import { useGameStore } from './store'
import { EventBus } from '../EventBus'
import { FLIGHT_SKIP_GATE_MS } from '../runtime/travelSkipGate'
import { palette, type as typo } from './theme'

export default function FlightSkipButton() {
  const traveling = useGameStore(s => s.world.player.state === 'traveling')
  const [skippable, setSkippable] = useState(false)

  // Real (wall-clock) timer, matching travelSkipGate.ts's own "how long the
  // player has actually watched" reasoning — not tied to world.time, which
  // game speed or a pause would otherwise let race ahead of it.
  useEffect(() => {
    if (!traveling) { setSkippable(false); return }
    const timer = setTimeout(() => setSkippable(true), FLIGHT_SKIP_GATE_MS)
    return () => clearTimeout(timer)
  }, [traveling])

  if (!traveling) return null

  function skip() {
    EventBus.emit('player:skip_travel', {})
  }

  return (
    <button
      onClick={skip}
      disabled={!skippable}
      style={{ ...styles.btn, ...(skippable ? {} : styles.btnDisabled) }}
    >
      {skippable ? 'Skip' : 'Skip (available shortly)'}
    </button>
  )
}

const styles = {
  btn: {
    ...typo.label,
    position: 'absolute' as const,
    bottom: 24,
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(21, 15, 9, 0.82)',
    color: palette.text,
    border: `1px solid ${palette.line}`,
    borderRadius: 3,
    padding: '6px 16px',
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    cursor: 'pointer' as const,
  },
  btnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed' as const,
  },
}
