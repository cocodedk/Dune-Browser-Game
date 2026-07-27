// src/ui/MarketPanel.tsx
// The smuggler's stock. Only shown when the player is standing in his den —
// the market being somewhere you travel to is what makes the trip a cost.

import { EventBus } from '../EventBus'
import { useGameStore } from './store'
import { MARKET_STOCK } from '../game-engine/market/market'

const DEN_KIND = 'smuggler_den'

export default function MarketPanel() {
  const { world } = useGameStore()
  const { player, equipment, troopGroups } = world

  const here = world.villages.find(v => v.id === player.location)
  const atDen = here?.kind === DEN_KIND && player.state === 'idle'

  const unissued = equipment.filter(e => e.groupId === null)

  // Equipment sitting in a crate helps nobody, so surface it wherever the
  // player is rather than only at the den.
  const issuePanel = unissued.length > 0 && troopGroups.length > 0 && (
    <div style={styles.issueBlock}>
      <div style={styles.subTitle}>Unissued</div>
      {unissued.map(item => (
        <div key={item.id} style={styles.issueRow}>
          <span style={styles.itemName}>{item.kind}</span>
          <button
            style={styles.btn}
            onClick={() =>
              EventBus.emit('player:issue_equipment', {
                equipmentId: item.id,
                groupId: troopGroups[0].id,
              })
            }
          >
            issue to crew
          </button>
        </div>
      ))}
    </div>
  )

  if (!atDen) {
    return unissued.length > 0 ? <div style={styles.panel}>{issuePanel}</div> : null
  }

  return (
    <div style={styles.panel}>
      <div style={styles.title}>Meko’s Stock</div>
      {MARKET_STOCK.map(item => {
        const affordable = player.spice >= item.price
        return (
          <div key={item.kind} style={styles.row}>
            <div style={styles.info}>
              <span style={styles.itemName}>{item.label}</span>
              <span style={styles.desc}>{item.description}</span>
            </div>
            <button
              style={{ ...styles.buyBtn, ...(affordable ? {} : styles.btnDisabled) }}
              disabled={!affordable}
              onClick={() => EventBus.emit('player:buy_equipment', { kind: item.kind })}
            >
              {item.price}
            </button>
          </div>
        )
      })}
      {issuePanel}
    </div>
  )
}

const styles = {
  panel: { padding: '10px 12px', borderBottom: '1px solid #3d2b10' },
  title: {
    color: '#d4a017', fontSize: 12, fontWeight: 'bold' as const,
    letterSpacing: '0.12em', textTransform: 'uppercase' as const, marginBottom: 6,
  },
  subTitle: { color: '#8b7a55', fontSize: 10, textTransform: 'uppercase' as const, marginBottom: 4 },
  row: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', gap: 8, marginBottom: 6,
  },
  info: { display: 'flex', flexDirection: 'column' as const },
  itemName: { color: '#e0cfa8', fontSize: 12 },
  desc: { color: '#8b7a55', fontSize: 10 },
  buyBtn: {
    background: '#3d2b10', color: '#e0cfa8', border: '1px solid #d4a017',
    borderRadius: 3, fontSize: 11, padding: '3px 9px', cursor: 'pointer',
    fontVariantNumeric: 'tabular-nums' as const,
  },
  btnDisabled: { opacity: 0.35, cursor: 'not-allowed', borderColor: '#3d2b10' },
  issueBlock: { marginTop: 8, paddingTop: 6, borderTop: '1px solid #241a0c' },
  issueRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  btn: {
    background: '#241a0c', color: '#c9b899', border: '1px solid #3d2b10',
    borderRadius: 3, fontSize: 10, padding: '3px 6px', cursor: 'pointer',
  },
}
