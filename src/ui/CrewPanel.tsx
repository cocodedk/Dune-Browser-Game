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
import { canSeeDensity } from '../game-engine/prescience/prescience'
import { isRegionDiscovered } from '../game-engine/prescience/regionDiscovery'
import type { PrescienceLevel } from '../game-engine/prescience/prescience'
import type { Village } from '../types'
import { palette, type as typo, space, panelShell, button, divider } from './theme'

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

/**
 * Whether a field's density can be shown for this player, right now.
 *
 * Region is not itself markable "discovered" (see regionDiscovery.ts), so
 * this is the same composition CrewPanel needs at both call sites below —
 * kept in one place so the two never drift apart.
 */
function densityKnown(field: SpiceField, level: PrescienceLevel, villages: readonly Village[]): boolean {
  return canSeeDensity(level, isRegionDiscovered(field.regionId, villages))
}

export default function CrewPanel() {
  const { world } = useGameStore()
  const { troopGroups, spiceFields, equipment, villages, player } = world

  const availableFields = spiceFields.filter(f => f.discovered && f.remaining > 0)

  function order(
    groupId: string,
    task: 'harvest' | 'prospect' | 'train' | 'ecology' | 'idle',
    targetId: string | null,
  ) {
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
        // The rate is a function of density (see rateFor -> harvestYield), so
        // showing an exact number would leak the very figure canSeeDensity is
        // gating a few lines below. Tie its visibility to the same check
        // rather than exposing it unconditionally.
        const rateKnown = field ? densityKnown(field, player.prescience, villages) : false
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
                  ? `Harvesting ${field.id} · ${rateKnown ? `${rate.toFixed(1)}/day` : 'yield unclear'}`
                  : group.task === 'prospect'
                    ? 'Prospecting for new sand'
                    : group.task === 'train'
                      ? `Drilling · skill ${group.skills.military}`
                      : group.task === 'ecology'
                        ? 'Planting'
                        : 'Idle'}
            </div>

            <div style={styles.actions}>
              {availableFields.map(f => {
                // Foresight's documented grant is seeing density without
                // prospecting; showing it to everyone unconditionally is the
                // exact bug that made the level inert. "—" marks it unknown
                // rather than a number nobody paid for.
                const known = densityKnown(f, player.prescience, villages)
                const density = known ? effectiveDensity(f).toFixed(0) : '—'
                return (
                  <button
                    key={f.id}
                    style={{
                      ...styles.btn,
                      ...(group.taskTargetId === f.id ? styles.btnActive : {}),
                    }}
                    onClick={() => order(group.id, 'harvest', f.id)}
                    title={`Density ${density}, ${f.remaining.toFixed(0)} left`}
                  >
                    {f.id.replace('field_', '')}
                  </button>
                )
              })}
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
              <button
                style={{
                  ...styles.btn,
                  ...(group.task === 'train' ? styles.btnActive : {}),
                }}
                onClick={() => order(group.id, 'train', null)}
                title="Drill for war. Costs income now, buys survival later."
              >
                train
              </button>
              <button
                style={{
                  ...styles.btn,
                  ...(group.task === 'ecology' ? styles.btnActive : {}),
                }}
                onClick={() => order(group.id, 'ecology', group.locationId)}
                title="Plant. No spice ever, but the desert holds and the Fremen remember."
              >
                plant
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
  panel: panelShell,
  title: { ...typo.heading, marginBottom: space.sm },
  empty: typo.note,
  crew: { marginBottom: space.sm, paddingBottom: space.sm, ...divider },
  crewHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' },
  crewName: { color: palette.text, fontSize: 12, fontWeight: 600 as const },
  crewMeta: { ...typo.note, fontStyle: 'normal' as const },
  status: { color: palette.textDim, fontSize: 11, margin: `${space.xs}px 0 ${space.sm}px` },
  actions: { display: 'flex', flexWrap: 'wrap' as const, gap: 4 },
  btn: button.base,
  btnActive: button.active,
}
