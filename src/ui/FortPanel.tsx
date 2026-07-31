// src/ui/FortPanel.tsx
// The Harkonnen strongholds. Only shown once the campaign opens in Act 3 —
// before that the player has no business storming walls, and an inert panel
// would just be noise.

import { EventBus } from '../EventBus'
import { useGameStore } from './store'
import { destroyedCount, RAID_SKILL_REQUIRED } from '../game-engine/acts/endgame'
import { palette, type as typo, space, panelShell, button, row } from './theme'

export default function FortPanel() {
  const { world } = useGameStore()
  const { forts, troopGroups, player, act } = world

  // Act 1 and 2 have no campaign; hide rather than disable.
  if (act === 'act1' || act === 'act2' || forts.length === 0) return null

  const taken = destroyedCount(forts)

  return (
    <div style={panelShell}>
      <div style={{ ...row, marginBottom: space.sm }}>
        <span style={typo.heading}>Strongholds</span>
        <span style={typo.label}>{taken} of {forts.length} taken</span>
      </div>

      {forts.map(fort => {
        const place = world.villages.find(v => v.id === fort.locationId)
        const here = troopGroups.filter(
          g => g.locationId === fort.locationId && g.changeoverDaysLeft === 0,
        )
        const size = here.reduce((sum, g) => sum + g.size, 0)
        const skill = here.length
          ? Math.round(here.reduce((sum, g) => sum + g.skills.military, 0) / here.length)
          : 0

        const lockedCapital = fort.isCapital && taken < 2
        const ready = size >= 20 && skill >= RAID_SKILL_REQUIRED && !lockedCapital
        const standing = player.location === fort.locationId

        return (
          <div key={fort.locationId} style={styles.fort}>
            <div style={row}>
              <span style={{
                ...styles.name,
                textDecoration: fort.destroyed ? 'line-through' : 'none',
                color: fort.destroyed ? palette.textFaint : palette.text,
              }}>
                {place?.name ?? fort.locationId}
                {fort.isCapital && <span style={styles.capital}> capital</span>}
              </span>
              <span style={typo.label}>garrison {fort.strength}</span>
            </div>

            {!fort.destroyed && (
              <div style={styles.detail}>
                {!standing
                  ? 'You are not there.'
                  : lockedCapital
                    ? 'Its outposts still stand.'
                    : `${size} hands · skill ${skill}${ready ? '' : ` (need ${RAID_SKILL_REQUIRED})`}`}
              </div>
            )}

            {!fort.destroyed && standing && (
              <button
                style={{ ...button.base, ...(ready ? {} : button.disabled) }}
                disabled={!ready}
                onClick={() =>
                  EventBus.emit('player:assault_fort', { fortId: fort.locationId })
                }
              >
                storm the wall
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

const styles = {
  fort: { marginBottom: space.sm, paddingBottom: space.xs },
  name: { fontSize: 12, fontWeight: 600 as const },
  capital: { ...typo.note, color: palette.danger, fontStyle: 'normal' as const },
  detail: { ...typo.note, margin: `2px 0 ${space.xs}px` },
}
