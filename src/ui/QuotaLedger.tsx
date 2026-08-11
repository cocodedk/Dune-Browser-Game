// src/ui/QuotaLedger.tsx
// The quota ledger — amount due, days left, and whether current assignments
// will actually get there. This is the single most important element on
// screen: it is where the player learns their plan is failing while there is
// still time to change it.

import { useGameStore } from './store'
import { totalDue, daysRemaining } from '../game-engine/quota/quota'
import { projectIncome } from '../game-engine/quota/projection'
import { currentDay } from '../game-engine/TimeSystem'
import { AUTO_SHIP_UNLOCKED_FLAG, AUTO_SHIP_ENABLED_FLAG } from '../game-engine/quota/settlement'
import { palette, type, space, panelShell, row } from './theme'
import { EventBus } from '../EventBus'

/** Patience shown as pips rather than a number — state read at a glance. */
function PatiencePips({ value }: { value: number }) {
  return (
    <span style={{ letterSpacing: 2 }}>
      {[0, 1, 2].map(i => (
        <span
          key={i}
          style={{
            color: i < value ? palette.gold : palette.lineSoft,
            fontSize: 13,
          }}
        >
          ●
        </span>
      ))}
    </span>
  )
}

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

  const short = !projection.onTrack
  const accent = short ? palette.danger : palette.good
  // The deadline tightens visually as it approaches, so urgency is felt
  // before it is read.
  const urgent = short && days <= 2

  // Auto-shipment (02 "Tribute"): unavailable until the first settlement of
  // any band has ever completed. This checkbox is the whole minimal-UI
  // surface for it — full configuration (a custom amount) is WP03.
  const autoShipUnlocked = world.flags[AUTO_SHIP_UNLOCKED_FLAG] === 1
  const autoShipEnabled = world.flags[AUTO_SHIP_ENABLED_FLAG] === 1
  function toggleAutoShip() {
    EventBus.emit('player:set_auto_ship', { enabled: !autoShipEnabled })
  }

  return (
    <div style={panelShell}>
      <div style={{ ...row, marginBottom: space.sm }}>
        <span style={type.heading}>Imperial Tribute</span>
        <PatiencePips value={quota.patience} />
      </div>

      <div style={styles.headline}>
        <span style={{ ...type.figure, fontSize: 22, color: accent }}>
          {due.toFixed(0)}
        </span>
        <span style={{ ...type.label, marginLeft: 5 }}>spice due</span>
        <span style={{ flex: 1 }} />
        <span style={{ ...type.figure, color: urgent ? palette.danger : palette.text }}>
          {days}
        </span>
        <span style={{ ...type.label, marginLeft: 4 }}>
          {days === 1 ? 'day' : 'days'}
        </span>
      </div>

      {quota.arrears > 0 && (
        <div style={row}>
          <span style={type.label}>carried arrears</span>
          <span style={{ ...type.value, color: palette.danger }}>
            {quota.arrears.toFixed(0)}
          </span>
        </div>
      )}
      <div style={row}>
        <span style={type.label}>in stock</span>
        <span style={type.value}>{player.spice.toFixed(1)}</span>
      </div>
      <div style={row}>
        <span style={type.label}>projected by deadline</span>
        <span style={type.value}>{projection.projectedTotal.toFixed(0)}</span>
      </div>

      <div style={{ ...styles.verdict, borderColor: accent, color: accent }}>
        {short
          ? `short by ${Math.abs(projection.surplus).toFixed(0)}`
          : `surplus ${projection.surplus.toFixed(0)}`}
      </div>

      <div style={{ ...type.note, textAlign: 'center', marginTop: space.xs }}>
        {projection.dailyRate > 0
          ? `${projection.dailyRate.toFixed(1)} spice per day at current orders`
          : 'no crews are harvesting'}
      </div>

      {autoShipUnlocked && (
        <label style={{ ...row, marginTop: space.xs, cursor: 'pointer' }}>
          <span style={type.label}>auto-ship in full</span>
          <input type="checkbox" checked={autoShipEnabled} onChange={toggleAutoShip} />
        </label>
      )}
    </div>
  )
}

const styles = {
  headline: {
    display: 'flex',
    alignItems: 'baseline',
    marginBottom: space.sm,
  },
  verdict: {
    marginTop: space.sm,
    padding: '5px 8px',
    border: '1px solid',
    borderRadius: 2,
    fontSize: 11,
    fontWeight: 700 as const,
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    textAlign: 'center' as const,
  },
}
