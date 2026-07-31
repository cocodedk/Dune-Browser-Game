// src/ui/PositionStrip.tsx
// One line saying where you are.
//
// Nothing in the interface ever named the player's location. The status bar
// carries day, time, spice, troops and influence; the village panel describes
// whichever village was last *clicked*, which is an inspection rather than a
// fact about you. With nineteen settlements across a whole globe, "I don't
// know where I am on the planet" was simply true.
//
// Deliberately not a minimap: the globe already is the map, and a second one
// would duplicate the screen's entire conceit. Deliberately one line, forever
// — the moment it grows rows it has become a second status bar.

import { useEffect, useState } from 'react'
import { useGameStore } from './store'
import { EventBus } from '../EventBus'
import { describePosition } from '../game-engine/position/whereami'
import { canvasToLatLon } from '../game-render/planet/sphere'
import { SOURCE_WIDTH, SOURCE_HEIGHT } from '../game-render/modes/strategic/markerLayout'
import type { SceneModeId } from '../types'
import { palette } from './theme'

const toLatLon = (p: { x: number; y: number }) =>
  canvasToLatLon(p, SOURCE_WIDTH, SOURCE_HEIGHT)

export default function PositionStrip() {
  const { world } = useGameStore()
  const [mode, setMode] = useState<SceneModeId>('strategic')

  useEffect(() => {
    const onMode = (e: { mode: SceneModeId }) => setMode(e.mode)
    EventBus.on('scene:mode', onMode)
    return () => EventBus.off('scene:mode', onMode)
  }, [])

  const { headline, detail } = describePosition({ world, mode, toLatLon })

  return (
    <div style={styles.strip}>
      <span style={styles.place}>{headline}</span>
      <span style={styles.detail}>{detail}</span>
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
  strip: {
    position: 'absolute' as const,
    top: 40,
    left: 20,
    display: 'flex',
    alignItems: 'baseline',
    gap: 10,
    textShadow: HALO,
    pointerEvents: 'none' as const,
    maxWidth: 460,
  },
  place: {
    color: palette.gold,
    fontSize: 13,
    fontWeight: 600 as const,
    letterSpacing: '0.06em',
    whiteSpace: 'nowrap' as const,
  },
  detail: {
    color: palette.textDim,
    fontSize: 11,
    fontStyle: 'italic' as const,
    whiteSpace: 'nowrap' as const,
  },
}
