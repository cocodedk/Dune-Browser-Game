// src/ui/ViewHint.tsx
// Tells the player what the controls do *here*.
//
// The hint used to be one fixed line describing the map, shown in every view
// including the ones where none of it applied. Standing in a location, it said
// "click a sietch to travel" over a scene with nothing clickable in it — which
// is worse than saying nothing, because it sends the player hunting for a
// control that does not exist.

import { useEffect, useState } from 'react'
import { EventBus } from '../EventBus'
import type { SceneModeId } from '../types'
import { palette } from './theme'

const HINTS: Record<SceneModeId, string> = {
  strategic: 'Click a location to travel · drag to turn Arrakis · scroll to zoom in',
  surface: 'Click a location to travel · shift-drag to pan · scroll out to leave',
  location: 'Click Speak to talk · Depart, scroll out or Esc to leave',
  flight: 'Press Esc to skip ahead',
  conversation: 'Choose a reply, or press Esc to step away',
}

export default function ViewHint() {
  const [mode, setMode] = useState<SceneModeId>('strategic')

  useEffect(() => {
    // The bus has no unsubscribe-on-subscribe return, so off() is explicit.
    const onMode = (e: { mode: SceneModeId }) => setMode(e.mode)
    EventBus.on('scene:mode', onMode)
    return () => EventBus.off('scene:mode', onMode)
  }, [])

  return <div style={styles.hint}>{HINTS[mode] ?? HINTS.strategic}</div>
}

/** Tight opaque halo plus a wide soft one — legible over sand or sky. */
const HALO = [
  '0 0 2px rgba(8,5,2,0.95)',
  '0 1px 3px rgba(8,5,2,0.9)',
  '0 2px 12px rgba(8,5,2,0.75)',
].join(', ')

const styles = {
  hint: {
    position: 'absolute' as const,
    bottom: 12,
    left: 20,
    color: palette.textDim,
    fontSize: 11,
    textShadow: HALO,
    pointerEvents: 'none' as const,
  },
}
