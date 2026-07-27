// src/ui/QuotaLedger.tsx
// The quota ledger — amount due, days left, and whether current assignments
// will actually get there. This is the single most important element on
// screen: it is where the player learns their plan is failing while there is
// still time to change it.

import { useGameStore } from './store'
import { totalDue, daysRemaining } from '../game-engine/quota/quota'
import { projectIncome } from '../game-engine/quota/projection'
import { currentDay } from '../game-engine/TimeSystem'

export default function QuotaLedger() {
  const { world } = useGameStore()
  const { quota, player, troopGroups, spiceFields, equipment } = world

  const due = totalDue(quota)
  const days = daysRemaining(quota, currentDay())

  const projection = projectIncome({
    groups: troopGroups,
    fields: spiceFields,
    equipment,
    daysRemaining: days,
    currentStock: player.spice,
    amountDue: due,
  })

  const urgent = !projection.onTrack
  const accent = urgent ? '#c0392b' : '#4caf50'

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.title}>Imperial Tribute</span>
        <span style={{ ...styles.patience, color: quota.patience <= 1 ? '#c0392b' : '#d4a017' }}>
          Patience {quota.patience}/3
        </span>
      </div>

      <div style={styles.row}>
        <span style={styles.label}>Due</span>
        <span style={styles.value}>{due.toFixed(0)} spice</span>
      </div>
      {quota.arrears > 0 && (
        <div style={styles.row}>
          <span style={styles.label}>…of which arrears</span>
          <span style={{ ...styles.value, color: '#c0392b' }}>{quota.arrears.toFixed(0)}</span>
        </div>
      )}
      <div style={styles.row}>
        <span style={styles.label}>Days remaining</span>
        <span style={styles.value}>{days}</span>
      </div>
      <div style={styles.row}>
        <span style={styles.label}>In stock</span>
        <span style={styles.value}>{player.spice.toFixed(1)}</span>
      </div>
      <div style={styles.row}>
        <span style={styles.label}>Projected by deadline</span>
        <span style={styles.value}>{projection.projectedTotal.toFixed(0)}</span>
      </div>

      <div style={{ ...styles.verdict, borderColor: accent, color: accent }}>
        {urgent
          ? `Short by ${Math.abs(projection.surplus).toFixed(0)}`
          : `Surplus ${projection.surplus.toFixed(0)}`}
      </div>

      <div style={styles.rate}>
        {projection.dailyRate > 0
          ? `${projection.dailyRate.toFixed(1)} spice/day at current orders`
          : 'No crews are harvesting.'}
      </div>
    </div>
  )
}

const styles = {
  panel: {
    padding: '10px 12px',
    borderBottom: '1px solid #3d2b10',
    background: '#150f08',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  title: {
    color: '#d4a017',
    fontSize: 12,
    fontWeight: 'bold' as const,
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
  },
  patience: { fontSize: 11 },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 12,
    color: '#c9b899',
    padding: '1px 0',
  },
  label: { opacity: 0.75 },
  value: { fontVariantNumeric: 'tabular-nums' as const },
  verdict: {
    marginTop: 8,
    padding: '4px 8px',
    border: '1px solid',
    borderRadius: 3,
    fontSize: 12,
    fontWeight: 'bold' as const,
    textAlign: 'center' as const,
  },
  rate: {
    marginTop: 5,
    fontSize: 11,
    color: '#8b7a55',
    textAlign: 'center' as const,
  },
}
