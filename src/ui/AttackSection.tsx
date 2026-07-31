// src/ui/AttackSection.tsx
// Shows the Fedaykin attack UI when a player-attackable village is selected.

import { EventBus } from '../EventBus'
import { DEFENDER_STRENGTH, SCOUT_COST } from '../game-engine/CombatSystem'

interface Props {
  villageId: string
  villageName: string
  villageOwner: string
  playerTroops: number
  playerSpice: number
  playerTraveling: boolean
  sietchPledged: boolean  // true if matching sietch is pledged — block attack
  scoutedDefense?: number // if set, defender strength is known exactly
}

const STRONG_HOUSE = new Set(['harkonnen', 'emperor'])

function headerLabel(owner: string): string {
  if (STRONG_HOUSE.has(owner)) return 'ENEMY STRONGHOLD'
  return 'CONTESTED'
}

export default function AttackSection({
  villageId,
  villageName,
  villageOwner,
  playerTroops,
  playerSpice,
  playerTraveling,
  sietchPledged,
  scoutedDefense,
}: Props) {
  // Gate 1: player-owned village
  if (villageOwner === 'player') return null

  // Gate 2: pledged fremen — off-limits
  if (villageOwner === 'fremen' && sietchPledged) return null

  // Gate 3: traveling
  if (playerTraveling) return null

  const defenderBase =
    DEFENDER_STRENGTH[villageOwner as keyof typeof DEFENDER_STRENGTH] ??
    DEFENDER_STRENGTH.neutral
  const defenseMin = Math.round(defenderBase * 0.85)
  const defenseMax = Math.round(defenderBase * 1.15)
  const certainWin = defenseMax + 1

  function dispatch(amount: number) {
    EventBus.emit('player:attack_village', {
      targetVillageId: villageId,
      troopsCommitted: amount,
    })
  }

  // Gate 4: too few troops — show disabled hint only
  if (playerTroops < 10) {
    return (
      <div style={styles.section}>
        <div style={styles.header}>{headerLabel(villageOwner)}</div>
        <p style={styles.hint}>Need &ge; 10 Fedaykin to attack {villageName}.</p>
      </div>
    )
  }

  const small = Math.max(10, Math.floor(playerTroops * 0.25))
  const strike = Math.max(10, Math.floor(playerTroops * 0.5))
  const allIn = playerTroops

  return (
    <div style={styles.section}>
      <div style={styles.header}>{headerLabel(villageOwner)}</div>
      <div style={styles.row}>
        <span style={styles.label}>Defender strength</span>
        <span style={styles.value}>
          {scoutedDefense !== undefined ? `${scoutedDefense} (scouted)` : `${defenseMin}–${defenseMax}`}
        </span>
      </div>
      <div style={styles.row}>
        <span style={styles.label}>{scoutedDefense !== undefined ? 'Need to win' : 'Certain win'}</span>
        <span style={styles.value}>
          {scoutedDefense !== undefined ? `${scoutedDefense + 1}+ Fedaykin` : `${certainWin}+ Fedaykin`}
        </span>
      </div>
      <div style={styles.row}>
        <span style={styles.label}>Your Fedaykin</span>
        <span style={styles.value}>{playerTroops}</span>
      </div>
      {scoutedDefense === undefined && (
        <button
          onClick={() => EventBus.emit('player:scout_village', { targetVillageId: villageId })}
          disabled={playerSpice < SCOUT_COST}
          style={{ ...styles.scoutBtn, opacity: playerSpice < SCOUT_COST ? 0.4 : 1 }}
        >
          {playerSpice < SCOUT_COST
            ? `Scout — need ${SCOUT_COST} spice`
            : `Scout for ${SCOUT_COST} spice`}
        </button>
      )}
      <button onClick={() => dispatch(small)} style={styles.btn}>
        Small raid — {small} Fedaykin
      </button>
      <button onClick={() => dispatch(strike)} style={styles.btn}>
        Strike force — {strike} Fedaykin
      </button>
      <button onClick={() => dispatch(allIn)} style={styles.btn}>
        All-in attack — {allIn} Fedaykin
      </button>
    </div>
  )
}

const styles = {
  section: { marginTop: 12, paddingTop: 10, borderTop: '1px solid #3d2b10' },
  header: {
    color: '#c62828',
    fontSize: 10,
    letterSpacing: '0.15em',
    fontWeight: 'bold' as const,
    marginBottom: 6,
  },
  hint: {
    color: '#6b5a2a',
    fontSize: 12,
    fontStyle: 'italic' as const,
    margin: 0,
  },
  row: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 },
  label: { color: '#8b6914', fontSize: 12 },
  value: { color: '#d4a017', fontSize: 13 },
  btn: {
    background: '#1a0a0a',
    color: '#c62828',
    border: '1px solid #c62828',
    borderRadius: 4,
    padding: '6px 14px',
    cursor: 'pointer' as const,
    fontSize: 12,
    width: '100%',
    marginTop: 4,
  },
  scoutBtn: {
    background: 'transparent',
    color: '#6a1b9a',
    border: '1px solid #6a1b9a',
    borderRadius: 4,
    padding: '5px 12px',
    cursor: 'pointer' as const,
    fontSize: 11,
    width: '100%',
    marginTop: 8,
    marginBottom: 4,
  },
}
