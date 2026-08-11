// src/ui/DestinationList.tsx
// The DOM destination list Beat 3 requires (03-opening-experience.md:
// "Red Wall is highlighted both on the globe and in an accessible
// destination list"; acceptance criterion 4: "Every required opening action
// has a visible legal path without clicking a canvas marker" — this is that
// path for travel, and W3g's keyboard scenario needs it).
//
// Every row renders travelCheckTo's own answer, never a second estimate
// (03: "the interface... can answer that question before the click" —
// TravelSystem.ts's own doc on travelCheckTo). Selecting/activating a
// reachable row travels on click OR Enter — a native <button> gets Enter
// for free once focused, so no extra key handling is needed here.

import { useGameStore } from './store'
import { EventBus } from '../EventBus'
import { travelCheckTo } from '../game-engine/TravelSystem'
import { rejectionMessage } from '../game-engine/travel/rules'
import { residentsAt } from '../game-engine/dialogue/residents'
import { INITIAL_CHARACTERS } from '../data/characters'
import { activeOpeningObjective } from '../game-engine/acts/openingObjectives'
import { type as typo, space, panelShell, divider } from './theme'

// Mount gated in App.tsx (destinationsDisclosed), same pattern as
// QuotaLedger — OrnamentFrame draws chrome around whatever child it gets,
// including null, so gating only here would still show an empty frame.
export default function DestinationList() {
  const { world } = useGameStore()

  const activeTarget = activeOpeningObjective(world)?.targetHint
  const objectiveTargetId = activeTarget?.kind === 'location' ? activeTarget.id : null

  const known = world.villages.filter(v => v.discovered && v.id !== world.player.location)

  function travel(id: string) {
    EventBus.emit('player:travel', { targetVillageId: id })
  }

  return (
    <div style={styles.panel}>
      <div style={styles.title}>Known destinations</div>
      {known.map(v => {
        const check = travelCheckTo(v.id)
        const residents = residentsAt(INITIAL_CHARACTERS, v.id)
        const isObjective = v.id === objectiveTargetId
        return (
          <button
            key={v.id}
            disabled={!check.ok}
            onClick={() => travel(v.id)}
            style={{
              ...styles.row,
              ...(check.ok ? {} : styles.rowDisabled),
              ...(isObjective ? styles.rowObjective : {}),
            }}
          >
            <div style={styles.rowHead}>
              <span style={styles.name}>{v.name}{isObjective ? ' ★' : ''}</span>
              <span style={styles.reason}>
                {check.ok ? `${check.durationSeconds}s` : rejectionMessage(check.reason)}
              </span>
            </div>
            {residents.length > 0 && (
              <div style={styles.residents}>known there: {residents.map(r => r.name).join(', ')}</div>
            )}
          </button>
        )
      })}
      {known.length === 0 && <div style={typo.note}>Nowhere else is known yet.</div>}
    </div>
  )
}

const styles = {
  panel: panelShell,
  title: { ...typo.heading, marginBottom: space.sm },
  row: {
    display: 'block' as const,
    width: '100%',
    textAlign: 'left' as const,
    background: 'transparent',
    border: 'none',
    padding: `${space.xs}px 0`,
    cursor: 'pointer' as const,
    ...divider,
  },
  rowDisabled: { cursor: 'not-allowed' as const, opacity: 0.55 },
  rowObjective: { background: 'rgba(212,160,23,0.08)' },
  rowHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' },
  name: { ...typo.value, fontWeight: 600 as const },
  reason: { ...typo.note, fontStyle: 'normal' as const },
  residents: { ...typo.note, marginTop: 2 },
}
