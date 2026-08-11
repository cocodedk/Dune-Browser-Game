// src/ui/CrewCard.tsx
// One crew's card — split out of CrewPanel.tsx (chunk W3d: that file was at
// 187/200 with no room for Beat 5's additions). Owns its own confirm-step
// state, since only one crew's confirm can be open at a time in practice and
// nothing above it needs to know which.
//
// 03-opening-experience.md Beat 5: home/location/size/morale/skill, ONE
// recommended known field with a projected yield RANGE (exact density
// stays hidden — troops/harvestRecommendation.ts's previewYieldRange), and
// the one-day changeover consequence surfaced BEFORE confirmation, not
// after. Pure display math lives in crewCardHelpers.ts, split out for the
// same line-budget reason.

import { useState } from 'react'
import { EventBus } from '../EventBus'
import { effectiveDensity } from '../game-engine/troops/types'
import { recommendedField } from '../game-engine/troops/harvestRecommendation'
import type { TroopGroup, SpiceField, Equipment } from '../game-engine/troops/types'
import type { PrescienceLevel } from '../game-engine/prescience/prescience'
import type { Village } from '../types'
import { rateFor, densityKnown, rangeFor } from './crewCardHelpers'
import ConfirmModal from './ConfirmModal'
import { palette, type as typo, space, button, divider } from './theme'

interface Props {
  group: TroopGroup
  spiceFields: SpiceField[]
  equipment: Equipment[]
  villages: Village[]
  prescienceLevel: PrescienceLevel
}

type PendingOrder = {
  task: 'harvest' | 'prospect' | 'train' | 'ecology'
  targetId: string | null
  label: string
  rangeText: string | null
}

function statusText(group: TroopGroup, field: SpiceField | undefined, rate: number, rateKnown: boolean): string {
  if (group.changeoverDaysLeft > 0) return 'Moving to new orders…'
  if (group.task === 'harvest' && field) return `Harvesting ${field.id} · ${rateKnown ? `${rate.toFixed(1)}/day` : 'yield unclear'}`
  if (group.task === 'prospect') return 'Prospecting for new sand'
  if (group.task === 'train') return `Drilling · skill ${group.skills.military}`
  if (group.task === 'ecology') return 'Planting'
  return 'Idle'
}

export default function CrewCard({ group, spiceFields, equipment, villages, prescienceLevel }: Props) {
  const [pending, setPending] = useState<PendingOrder | null>(null)

  const field = spiceFields.find(f => f.id === group.taskTargetId)
  const rate = rateFor(group, field, equipment)
  const rateKnown = field ? densityKnown(field, prescienceLevel, villages) : false

  const home = villages.find(v => v.id === group.homeSietchId)
  const current = villages.find(v => v.id === group.locationId)
  const availableFields = spiceFields.filter(f => f.discovered && f.remaining > 0)
  const best = recommendedField(current?.position ?? { x: 0, y: 0 }, spiceFields)
  const bestRange = best ? rangeFor(group, best, equipment) : null

  function order(task: PendingOrder['task'], targetId: string | null, label: string, rangeText: string | null) {
    setPending({ task, targetId, label, rangeText })
  }
  function confirmOrder() {
    if (!pending) return
    EventBus.emit('player:assign_crew', { groupId: group.id, task: pending.task, targetId: pending.targetId })
    setPending(null)
  }
  function standDown() {
    // Free (troops/assign.ts's applyAssign: idle costs no changeover) —
    // no confirm step needed for a reversal that costs nothing.
    EventBus.emit('player:assign_crew', { groupId: group.id, task: 'idle', targetId: null })
  }

  return (
    <div style={styles.crew}>
      <div style={styles.crewHead}>
        <span style={styles.crewName}>{group.homeSietchId}</span>
        <span style={styles.crewMeta}>{group.size} hands · skill {group.skills.spice}</span>
      </div>
      <div style={styles.meta}>
        home {home?.name ?? group.homeSietchId} · at {current?.name ?? group.locationId} · morale {group.morale.toFixed(0)}
      </div>

      <div style={styles.status}>{statusText(group, field, rate, rateKnown)}</div>

      {best && bestRange && (
        <div style={styles.recommend}>
          Recommended: {best.id.replace('field_', '')} · projected {bestRange.min.toFixed(1)}–{bestRange.max.toFixed(1)}/day
        </div>
      )}

      <div style={styles.actions}>
        {availableFields.map(f => {
          const known = densityKnown(f, prescienceLevel, villages)
          const density = known ? effectiveDensity(f).toFixed(0) : '—'
          const range = rangeFor(group, f, equipment)
          return (
            <button
              key={f.id}
              style={{
                ...styles.btn,
                ...(group.taskTargetId === f.id ? styles.btnActive : {}),
                ...(f.id === best?.id ? styles.btnRecommended : {}),
              }}
              onClick={() => order('harvest', f.id, `harvest ${f.id}`, `${range.min.toFixed(1)}–${range.max.toFixed(1)}/day`)}
              title={`Density ${density}, ${f.remaining.toFixed(0)} left`}
            >
              {f.id.replace('field_', '')}{f.id === best?.id ? ' ★' : ''}
            </button>
          )
        })}
        <button
          style={{ ...styles.btn, ...(group.task === 'prospect' ? styles.btnActive : {}) }}
          onClick={() => order('prospect', group.locationId, 'prospect', null)}
          title="Look for new spice sand. Needs an ornithopter."
        >
          prospect
        </button>
        <button
          style={{ ...styles.btn, ...(group.task === 'train' ? styles.btnActive : {}) }}
          onClick={() => order('train', null, 'train', null)}
          title="Drill for war. Costs income now, buys survival later."
        >
          train
        </button>
        <button
          style={{ ...styles.btn, ...(group.task === 'ecology' ? styles.btnActive : {}) }}
          onClick={() => order('ecology', group.locationId, 'plant', null)}
          title="Plant. No spice ever, but the desert holds and the Fremen remember."
        >
          plant
        </button>
        {group.task !== 'idle' && (
          <button style={styles.btn} onClick={standDown}>stand down</button>
        )}
      </div>

      {pending && (
        <ConfirmModal
          title={`Order: ${pending.label}`}
          lines={[
            'Moving to new orders — no yield today; the changeover costs one full day before this crew produces again.',
            ...(pending.rangeText ? [`Once working, projected yield: ${pending.rangeText}.`] : []),
          ]}
          confirmLabel="Issue order"
          onConfirm={confirmOrder}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  )
}

const styles = {
  crew: { marginBottom: space.sm, paddingBottom: space.sm, ...divider },
  crewHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' },
  crewName: { color: palette.text, fontSize: 12, fontWeight: 600 as const },
  crewMeta: { ...typo.note, fontStyle: 'normal' as const },
  meta: { ...typo.note, fontStyle: 'normal' as const, marginTop: 2 },
  status: { color: palette.textDim, fontSize: 11, margin: `${space.xs}px 0 ${space.sm}px` },
  recommend: { color: palette.good, fontSize: 10, marginBottom: space.xs },
  actions: { display: 'flex', flexWrap: 'wrap' as const, gap: 4 },
  btn: button.base,
  btnActive: button.active,
  btnRecommended: { borderColor: palette.good },
}
