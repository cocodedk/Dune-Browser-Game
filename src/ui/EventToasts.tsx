// src/ui/EventToasts.tsx
// Messages, where the player is actually looking.
//
// Every message in this game went to EventLog, at the bottom of the right-hand
// command column. A player watching Arrakis in the centre of the screen never
// reads it, so a refused click ("Sietch Tabr is out of range on foot") landed
// somewhere invisible and the game appeared to ignore the input entirely.
//
// This layer floats the same messages over the middle of the scene and lets
// them pass on their own. It does not replace EventLog — the log remains the
// scrollback for anything missed.

import { useEffect, useState } from 'react'
import { EventBus } from '../EventBus'
import { COMMAND_COLUMN_WIDTH, palette } from './theme'
import { TOAST_TOP_CSS } from './centreBand'
import { toastDurationMs, MAX_VISIBLE } from './toastPolicy'
import type { GameEvent } from '../types'

interface Toast {
  id: string
  message: string
  /** Drives the fade-out, which starts before the toast is dropped. */
  leaving: boolean
}

/** How long the fade takes. Subtracted from the visible time, not added to it. */
const FADE_MS = 320

export default function EventToasts() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    // Timers are tracked so unmount cancels them; a setState after unmount is
    // both a React warning and a real leak when modes swap quickly.
    const timers = new Set<ReturnType<typeof setTimeout>>()

    const later = (fn: () => void, ms: number) => {
      const t = setTimeout(() => { timers.delete(t); fn() }, ms)
      timers.add(t)
    }

    const onEvent = ({ event }: { event: GameEvent }) => {
      const ms = toastDurationMs(event.type)
      if (ms <= 0) return

      setToasts(prev =>
        [...prev, { id: event.id, message: event.message, leaving: false }]
          .slice(-MAX_VISIBLE))

      later(() => {
        setToasts(prev => prev.map(t => t.id === event.id ? { ...t, leaving: true } : t))
      }, Math.max(0, ms - FADE_MS))

      later(() => setToasts(prev => prev.filter(t => t.id !== event.id)), ms)
    }

    EventBus.on('event:fired', onEvent)
    return () => {
      EventBus.off('event:fired', onEvent)
      for (const t of timers) clearTimeout(t)
    }
  }, [])

  if (toasts.length === 0) return null

  return (
    <div style={styles.layer} aria-live="polite">
      {toasts.map(t => (
        <div key={t.id} style={{ ...styles.toast, opacity: t.leaving ? 0 : 1 }}>
          {t.message}
        </div>
      ))}
    </div>
  )
}

const styles = {
  /**
   * Centred on the *scene*, not the window — the command column occupies the
   * right edge, so centring on the viewport would sit the text off to one side
   * of what the player is watching.
   *
   * Placed in the upper third rather than dead centre: the craft, the globe and
   * the descent all happen mid-frame, and covering them to say "task assigned"
   * trades one invisibility for a worse one.
   *
   * `top` is no longer the literal 18vh it once was: ObjectiveBanner.tsx now
   * occupies the band above, and at Playwright's 720px-tall viewport 18vh
   * left only 58px for a ~104px banner. centreBand.ts owns that arithmetic
   * for both surfaces and centreBand.test.ts pins it.
   *
   * pointerEvents none is load-bearing. The map is this game's primary control
   * surface and a transparent div over the middle of it would eat clicks on
   * exactly the sietches the message is usually about.
   */
  layer: {
    position: 'fixed' as const,
    top: TOAST_TOP_CSS,
    left: 0,
    width: `calc(100% - ${COMMAND_COLUMN_WIDTH}px)`,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 8,
    pointerEvents: 'none' as const,
    zIndex: 40,
  },
  toast: {
    maxWidth: '52%',
    padding: '10px 20px',
    borderRadius: 4,
    background: 'rgba(16, 11, 5, 0.82)',
    border: `1px solid ${palette.line}`,
    color: palette.text,
    fontSize: 15,
    lineHeight: 1.45,
    textAlign: 'center' as const,
    textShadow: '0 1px 3px rgba(0,0,0,0.9)',
    boxShadow: '0 6px 22px rgba(0,0,0,0.45)',
    transition: `opacity ${FADE_MS}ms ease-out`,
  },
}
