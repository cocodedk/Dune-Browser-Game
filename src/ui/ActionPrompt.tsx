// src/ui/ActionPrompt.tsx
// The decision card: the two verbs that produce ALL spice income, offered
// where the player is looking instead of only in the command column.
//
// Both — pledge a sietch, put a crew on a field — existed solely as sidebar
// controls, so a player watching the centre did the only thing the centre
// afforded (clicking the globe) and lost the day-12 tribute with no crew.
//
// It sits at the BOTTOM of the scene band, the same place the dialogue box
// appears (DialoguePanel.styles.ts: `alignItems: 'flex-end'`, `padding: 32`).
// The briefing, the ledger and Stilgar all trained the player to read there,
// so this inherits a habit rather than asking for a new one. z-index 90 —
// under DialoguePanel's 100, so an open conversation covers it.
//
// WHAT IT DOES NOT DO: it never emits a bus event straight from its own
// button. Both actions are authored as confirmed steps (03-opening-
// experience.md Beat 4's "concise confirmation... not an unlabelled
// ownership button", Beat 5's changeover consequence "before confirmation"),
// so the primary button opens the SAME ConfirmModal the sidebar path
// raises, with the same wording (confirmCopy.ts). ConfirmModal portals to
// document.body, which is what makes that modal genuinely centre-screen
// rather than trapped in the column's backdrop-filter containing block.
//
// GATING lives here, not in centreGuidance.ts: guidance is device state in
// localStorage (settings/localSettings.ts), which vitest's `environment:
// 'node'` has no access to — and prompt state must never reach WorldState,
// whose `flags` are hashed by parityView.ts.

import { useState } from 'react'
import { useGameStore } from './store'
import { EventBus } from '../EventBus'
import { livePrompt, promptKey, type LivePrompt } from './centreGuidance'
import { promptCopy, DEFER_LABEL } from './centreGuidanceCopy'
import { getGuidanceEnabled, isMarkDismissed, dismissMark } from './settings/localSettings'
import { pledgeConfirmCopy, orderConfirmCopy, harvestOrderLabel, yieldRangeText } from './confirmCopy'
import { rangeFor } from './crewCardHelpers'
import ConfirmModal from './ConfirmModal'
import { COMMAND_COLUMN_WIDTH, palette, button } from './theme'
import type { WorldState } from '../types'

type HarvestPrompt = Extract<LivePrompt, { kind: 'first-harvest' }>

/** CrewCard's own projected-yield bracket for this crew/field pair, or null
 * if either has gone (a crew dissolved between render and click). */
function harvestRangeText(world: WorldState, prompt: HarvestPrompt): string | null {
  const crew = world.troopGroups.find(g => g.id === prompt.groupId)
  const field = world.spiceFields.find(f => f.id === prompt.fieldId)
  if (!crew || !field) return null
  return yieldRangeText(rangeFor(crew, field, world.equipment))
}

/** The one place a prompt turns into a command. Exactly the two bus events
 * PledgePanel.tsx and CrewCard.tsx already emit — no new command surface,
 * so every engine-side rule, refusal and event stays where it is. Module
 * level, not a closure, so the discriminated union narrows properly. */
function dispatch(prompt: LivePrompt): void {
  if (prompt.kind === 'pledge') {
    EventBus.emit('player:pledge_sietch', { villageId: prompt.villageId })
  } else {
    EventBus.emit('player:assign_crew', {
      groupId: prompt.groupId, task: 'harvest', targetId: prompt.fieldId,
    })
  }
}

export default function ActionPrompt() {
  // NOT `useGameStore(s => s.world)` — see CoachMark.tsx:52-61.
  const { world } = useGameStore()
  // Both keyed by prompt key, not a bare boolean: the world ticks every
  // ~100ms underneath an open modal, and confirming a pledge flips
  // livePrompt straight to the first-harvest card — a stale `pending` would
  // otherwise show the previous step's wording over the new prompt.
  const [confirmingKey, setConfirmingKey] = useState<string | null>(null)
  const [deferredKey, setDeferredKey] = useState<string | null>(null)

  const prompt = livePrompt(world)
  if (!prompt) return null
  if (!getGuidanceEnabled()) return null

  const key = promptKey(prompt)
  // deferredKey hides the card on the same tick as the click; isMarkDismissed
  // is the durable answer, read fresh every render (no cache to invalidate).
  if (deferredKey === key || isMarkDismissed(key)) return null

  const copy = promptCopy(prompt)
  const confirmStep = prompt.kind === 'pledge'
    ? pledgeConfirmCopy(prompt.name)
    : orderConfirmCopy(harvestOrderLabel(prompt.fieldName), harvestRangeText(world, prompt))

  const act = () => {
    setConfirmingKey(null)
    dispatch(prompt)
  }

  const notYet = () => {
    dismissMark(key)
    setDeferredKey(key)
  }

  return (
    <div style={styles.layer}>
      <div style={styles.card}>
        <div style={styles.title}>{copy.title}</div>
        {copy.lines.map(line => (
          <p key={line} style={styles.line}>{line}</p>
        ))}
        <div style={styles.actions}>
          <button style={styles.defer} onClick={notYet}>{DEFER_LABEL}</button>
          <button style={styles.primary} onClick={() => setConfirmingKey(key)}>
            {copy.primaryLabel}
          </button>
        </div>
      </div>
      {confirmingKey === key && (
        <ConfirmModal {...confirmStep} onConfirm={act} onCancel={() => setConfirmingKey(null)} />
      )}
    </div>
  )
}

const styles = {
  /** Scene-centred, stopping short of the command column — the same band
   * DialoguePanel occupies. pointerEvents none so the map underneath stays
   * clickable everywhere the card itself is not. */
  layer: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    bottom: 0,
    right: COMMAND_COLUMN_WIDTH,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    padding: 32,
    pointerEvents: 'none' as const,
    zIndex: 90,
  },
  card: {
    pointerEvents: 'auto' as const,
    width: '100%',
    maxWidth: 560,
    background: 'rgba(16, 11, 5, 0.94)',
    border: `1px solid ${palette.gold}`,
    borderRadius: 6,
    padding: '14px 20px 16px',
    boxShadow: '0 10px 34px rgba(0,0,0,0.55)',
  },
  title: {
    color: palette.gold,
    fontSize: 15,
    fontWeight: 600 as const,
    marginBottom: 6,
  },
  line: {
    color: palette.text,
    fontSize: 13,
    lineHeight: 1.5,
    margin: '0 0 4px',
  },
  actions: {
    display: 'flex',
    gap: 10,
    marginTop: 12,
    justifyContent: 'flex-end' as const,
  },
  defer: { ...button.base, fontSize: 12, padding: '7px 14px' },
  primary: { ...button.base, ...button.active, fontSize: 12, padding: '7px 14px' },
}
