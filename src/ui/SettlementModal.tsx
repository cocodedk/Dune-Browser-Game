// src/ui/SettlementModal.tsx
// The pending tribute decision — a functional, centre-screen modal (the
// standing art direction: the player reads only the centre of the screen).
// No polish; WP03 owns presentation. Renders whenever
// `world.pendingSettlement` is non-null and dispatches through
// CommandWiring's settle command exactly like DialoguePanel dispatches
// choices — this component computes no engine rule of its own, only a
// read-only preview via the pure settleQuota (same pattern QuotaLedger's
// projectIncome use — "UI never constructs a second estimate of an engine
// rule", 02 "Ownership contract").

import { useEffect, useState } from 'react'
import { useGameStore } from './store'
import { EventBus } from '../EventBus'
import { settleQuota } from '../game-engine/quota/quota'
import { defaultSettleAmount } from '../game-engine/quota/settlement'
import { getDifficultyConfig } from '../game-engine/difficulty'
import { palette, type, space, row, panelShell, button } from './theme'

export default function SettlementModal() {
  const { world } = useGameStore()
  const pending = world.pendingSettlement
  const [amount, setAmount] = useState<number | null>(null)

  // Reset the custom amount whenever a NEW decision appears (a different
  // cycleIndex), including after reload — defaultSettleAmount recomputes
  // from the reloaded payload, not a client-side amount carried over.
  useEffect(() => {
    setAmount(null)
  }, [pending?.cycleIndex])

  useEffect(() => {
    if (!pending) return
    const decision = pending
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Enter') settle(amount ?? defaultSettleAmount(decision))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pending, amount])

  if (!pending) return null

  const chosen = amount ?? defaultSettleAmount(pending)
  const config = getDifficultyConfig(world.difficulty)
  const preview = settleQuota(world.quota, chosen, config.quotaMultiplier)

  function settle(a: number) {
    EventBus.emit('player:settle_tribute', { amount: a })
  }

  return (
    <div style={styles.overlay}>
      <div style={{ ...panelShell, ...styles.box }}>
        <div style={type.heading}>Imperial Tribute — cycle {pending.cycleIndex + 1}</div>

        <div style={row}>
          <span style={type.label}>due</span>
          <span style={type.figure}>{pending.amountDue.toFixed(0)}</span>
        </div>
        <div style={row}>
          <span style={type.label}>in stock</span>
          <span style={type.figure}>{pending.stock.toFixed(0)}</span>
        </div>
        <div style={row}>
          <span style={type.label}>minimum partial</span>
          <span style={type.value}>{pending.minPartialPayment.toFixed(0)}</span>
        </div>

        <div style={styles.presets}>
          <button style={button.base} onClick={() => setAmount(pending.legalRange.max)}>
            Full ({pending.legalRange.max.toFixed(0)})
          </button>
          <button
            style={button.base}
            onClick={() => setAmount(Math.min(pending.minPartialPayment, pending.legalRange.max))}
          >
            Minimum ({Math.min(pending.minPartialPayment, pending.legalRange.max).toFixed(0)})
          </button>
        </div>

        <input
          type="number"
          min={pending.legalRange.min}
          max={pending.legalRange.max}
          value={chosen}
          onChange={e => setAmount(Number(e.target.value))}
          style={styles.input}
        />

        <div style={{ ...type.note, marginTop: space.xs }}>
          {preview.band === 'full' && 'Full payment: patience restored, arrears cleared.'}
          {preview.band === 'partial' &&
            `Partial: patience held, ${preview.quota.arrears.toFixed(0)} carried as arrears.`}
          {preview.band === 'short' &&
            `Short: patience falls to ${preview.quota.patience} of 3, ${preview.quota.arrears.toFixed(0)} carried.`}
        </div>

        <button style={{ ...button.base, ...button.active, marginTop: space.sm }} onClick={() => settle(chosen)}>
          Settle
        </button>
      </div>
    </div>
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
    zIndex: 150,
  },
  box: {
    border: `1px solid ${palette.gold}`,
    borderRadius: 6,
    maxWidth: 380,
    width: '90%',
  },
  presets: {
    display: 'flex',
    gap: space.sm,
    marginTop: space.sm,
  },
  input: {
    width: '100%',
    marginTop: space.sm,
    padding: '4px 6px',
    background: palette.panelRaised,
    color: palette.text,
    border: `1px solid ${palette.line}`,
    borderRadius: 2,
  },
}
