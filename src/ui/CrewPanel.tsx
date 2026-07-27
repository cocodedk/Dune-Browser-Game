// src/ui/CrewPanel.tsx
// Crew orders — the player's main verb in Act 1.
//
// Every crew is listed with what it is doing and what it is producing, so the
// answer to "why am I short on spice?" is always one glance away.

import { EventBus } from '../EventBus'
import { useGameStore } from './store'
import { harvestYield } from '../game-engine/troops/harvest'
import { effectiveDensity, extractionTier } from '../game-engine/troops/types'
import type { TroopGroup, SpiceField, Equipment } from '../game-engine/troops/types'

function tierFor(group: TroopGroup, equipment: Equipment[]) {
  return extractionTier(
    equipment.filter(e => group.equipmentIds.includes(e.id)).map(e => e.kind),
  )
}

function rateFor(group: TroopGroup, field: SpiceField | undefined, equipment: Equipment[]): number {
  if (!field || group.task !== 'harvest') return 0
  return harvestYield({
    tier: tierFor(group, equipment),
    density: effectiveDensity(field),
    size: group.size,
    spiceSkill: group.skills.spice,
    morale: group.morale,
  })
}

export default function CrewPanel() {
  const { world } = useGameStore()
  const { troopGroups, spiceFields, equipment } = world

  const availableFields = spiceFields.filter(f => f.discovered && f.remaining > 0)

  function order(groupId: string, task: 'harvest' | 'prospect' | 'idle', targetId: string | null) {
    EventBus.emit('player:assign_crew', { groupId, task, targetId })
  }

  if (troopGroups.length === 0) {
    return (
      <div style={styles.panel}>
        <div style={styles.title}>Crews</div>
        <div style={styles.empty}>No crews. Pledge a sietch to raise one.</div>
      </div>
    )
  }

  return (
    <div style={styles.panel}>
      <div style={styles.title}>Crews</div>
      {troopGroups.map(group => {
        const field = spiceFields.find(f => f.id === group.taskTargetId)
        const rate = rateFor(group, field, equipment)
        const busy = group.changeoverDaysLeft > 0

        return (
          <div key={group.id} style={styles.crew}>
            <div style={styles.crewHead}>
              <span style={styles.crewName}>{group.homeSietchId}</span>
              <span style={styles.crewMeta}>
                {group.size} hands · skill {group.skills.spice}
              </span>
            </div>

            <div style={styles.status}>
              {busy
                ? 'Moving to new orders…'
                : group.task === 'harvest' && field
                  ? `Harvesting ${field.id} · ${rate.toFixed(1)}/day`
                  : group.task === 'prospect'
                    ? 'Prospecting for new sand'
                    : 'Idle'}
            </div>

            <div style={styles.actions}>
              {availableFields.map(f => (
                <button
                  key={f.id}
                  style={{
                    ...styles.btn,
                    ...(group.taskTargetId === f.id ? styles.btnActive : {}),
                  }}
                  onClick={() => order(group.id, 'harvest', f.id)}
                  title={`Density ${effectiveDensity(f).toFixed(0)}, ${f.remaining.toFixed(0)} left`}
                >
                  {f.id.replace('field_', '')}
                </button>
              ))}
              <button
                  style={{
                    ...styles.btn,
                    ...(group.task === 'prospect' ? styles.btnActive : {}),
                  }}
                  onClick={() => order(group.id, 'prospect', group.locationId)}
                  title="Look for new spice sand. Needs an ornithopter."
                >
                  prospect
                </button>
              {group.task !== 'idle' && (
                <button style={styles.btn} onClick={() => order(group.id, 'idle', null)}>
                  stand down
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

const styles = {
  panel: { padding: '10px 12px', borderBottom: '1px solid #3d2b10' },
  title: {
    color: '#d4a017', fontSize: 12, fontWeight: 'bold' as const,
    letterSpacing: '0.12em', textTransform: 'uppercase' as const, marginBottom: 6,
  },
  empty: { color: '#8b7a55', fontSize: 12, fontStyle: 'italic' as const },
  crew: { marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid #241a0c' },
  crewHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' },
  crewName: { color: '#e0cfa8', fontSize: 12, fontWeight: 'bold' as const },
  crewMeta: { color: '#8b7a55', fontSize: 10 },
  status: { color: '#c9b899', fontSize: 11, margin: '3px 0 5px' },
  actions: { display: 'flex', flexWrap: 'wrap' as const, gap: 4 },
  btn: {
    background: '#241a0c', color: '#c9b899', border: '1px solid #3d2b10',
    borderRadius: 3, fontSize: 10, padding: '3px 6px', cursor: 'pointer',
  },
  btnActive: { background: '#d4a017', color: '#1a1208', borderColor: '#d4a017' },
}
