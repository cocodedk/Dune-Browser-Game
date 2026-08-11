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
import { settleQuota, type PaymentOutcome } from '../game-engine/quota/quota'
import { defaultSettleAmount } from '../game-engine/quota/settlement'
import { getDifficultyConfig } from '../game-engine/difficulty'
import { palette, type, space, row, panelShell, button } from './theme'

/**
 * 03-opening-experience.md Beat 7's settlement wording, shared by every
 * preview this modal shows (full-result, minimum-result, and the live
 * selected-amount preview) — one function, called against settleQuota's own
 * PaymentOutcome each time, never a second estimate of the band rule.
 */
function bandMessage(outcome: PaymentOutcome): string {
  if (outcome.band === 'full') return 'Patience restored, arrears cleared.'
  if (outcome.band === 'partial') return `Patience held, ${outcome.quota.arrears.toFixed(0)} carried as arrears.`
  return `Patience falls to ${outcome.quota.patience} of 3, ${outcome.quota.arrears.toFixed(0)} carried.`
}

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
  const minAmount = Math.min(pending.minPartialPayment, pending.legalRange.max)
  // Three calls to the same pure engine function — 03 Beat 7's full-result,
  // minimum-result, and "the patience consequence of the SELECTED amount
  // before confirmation" are three different amounts, not three different
  // rules (W2c's recorded pattern: "the modal calls the engine's own
  // function, never a second estimate").
  const fullPreview = settleQuota(world.quota, pending.legalRange.max, config.quotaMultiplier)
  const minPreview = settleQuota(world.quota, minAmount, config.quotaMultiplier)
  const chosenPreview = settleQuota(world.quota, chosen, config.quotaMultiplier)

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
          <button style={button.base} onClick={() => setAmount(minAmount)}>
            Minimum ({minAmount.toFixed(0)})
          </button>
        </div>
        {/* Full-payment result and minimum-partial result (03 Beat 7): static
            reference previews, independent of whatever is currently selected
            below. */}
        <div style={type.note}>Full: {bandMessage(fullPreview)}</div>
        <div style={type.note}>Minimum: {bandMessage(minPreview)}</div>

        <input
          type="number"
          min={pending.legalRange.min}
          max={pending.legalRange.max}
          value={chosen}
          onChange={e => setAmount(Number(e.target.value))}
          style={styles.input}
        />

        {/* The patience consequence of the CURRENTLY SELECTED amount, before
            confirmation (03 Beat 7) — a distinct "Selected —" prefix keeps
            this line unambiguous against the two static previews above. */}
        <div style={{ ...type.note, marginTop: space.xs }}>
          Selected — {bandMessage(chosenPreview)}
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
