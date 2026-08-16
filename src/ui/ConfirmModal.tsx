// src/ui/ConfirmModal.tsx
// A generic centre-screen confirmation step (03-opening-experience.md Beat
// 4: "a concise confirmation... it is not an unlabelled ownership button" —
// the same one-extra-click, centre-screen shape this chunk also gives the
// crew-assign flow). SettlementModal.tsx's overlay/box pattern, reused
// rather than duplicated: content is passed in, not authored here.
//
// PORTALLED, and that is load-bearing. Both callers — PledgePanel and
// CrewCard — render inside the command column, and App.tsx's column sets
// `backdropFilter: blur(7px)`, which makes it the containing block for any
// `position: fixed` descendant. So "centre-screen" resolved to "centre of
// the 340px sidebar": measured live at 3067px wide, this box sat at x=2744
// w=293, hard against the right edge, when the scene's centre is x≈1180.
// The two confirmations it hosts are the pledge and the first crew order —
// exactly the two steps the player reported being unable to find. Escaping
// to document.body is what makes `inset: 0` mean the viewport again.

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { palette, type, space, panelShell, button } from './theme'

interface Props {
  title: string
  /** Short paragraphs, rendered in order. */
  lines: string[]
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({ title, lines, confirmLabel = 'Confirm', onConfirm, onCancel }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Enter') onConfirm()
      else if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onConfirm, onCancel])

  return createPortal(
    <div style={styles.overlay}>
      <div style={{ ...panelShell, ...styles.box }}>
        <div style={type.heading}>{title}</div>
        {lines.map((line, i) => (
          <p key={i} style={styles.line}>{line}</p>
        ))}
        <div style={styles.actions}>
          <button style={button.base} onClick={onCancel}>Cancel</button>
          <button style={{ ...button.base, ...button.active }} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

const styles = {
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    background: 'rgba(6,4,2,0.72)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200, // above SettlementModal (150) — a confirm step is never itself interrupted
  },
  box: {
    border: `1px solid ${palette.gold}`,
    borderRadius: 6,
    maxWidth: 360,
    width: '90%',
  },
  line: {
    ...type.value,
    margin: `${space.xs}px 0`,
    lineHeight: 1.4,
  },
  actions: {
    display: 'flex',
    gap: space.sm,
    marginTop: space.sm,
    justifyContent: 'flex-end' as const,
  },
}
