// src/ui/MarketPanel.tsx
// The smuggler's stock. Only shown when the player is standing in his den —
// the market being somewhere you travel to is what makes the trip a cost.

import { EventBus } from '../EventBus'
import { useGameStore } from './store'
import { availableStock } from '../game-engine/market/market'
import { palette, type as typo, space, panelShell, button } from './theme'

const DEN_KIND = 'smuggler_den'
const STANDING_FLAG = 'smuggler.standing'

export default function MarketPanel() {
  const { world, selectedGroupId, selectGroup } = useGameStore()
  const { player, equipment, troopGroups } = world

  const here = world.villages.find(v => v.id === player.location)
  const atDen = here?.kind === DEN_KIND && player.state === 'idle'

  const unissued = equipment.filter(e => e.groupId === null)
  const standing = typeof world.flags[STANDING_FLAG] === 'number' ? (world.flags[STANDING_FLAG] as number) : 0
  // The single stock-query authority (02 "Market"): this panel renders only
  // what it returns, never the raw MARKET_STOCK table.
  const stock = availableStock({ spice: player.spice, standing, act: world.act })

  // A lone crew is not an ambiguous choice, so it auto-targets. With more
  // than one, "issue to the first crew" is exactly what 02 "Equipment"
  // forbids — the player must pick, and the button stays disabled with no
  // pick made.
  const targetId = troopGroups.length === 1 ? troopGroups[0].id : selectedGroupId

  // Equipment sitting in a crate helps nobody, so surface it wherever the
  // player is rather than only at the den.
  const issuePanel = unissued.length > 0 && troopGroups.length > 0 && (
    <div style={styles.issueBlock}>
      <div style={styles.subTitle}>Unissued</div>
      {troopGroups.length > 1 && (
        <select
          style={styles.select}
          value={selectedGroupId ?? ''}
          onChange={e => selectGroup(e.target.value || null)}
        >
          <option value="">choose a crew…</option>
          {troopGroups.map(g => (
            <option key={g.id} value={g.id}>{g.homeSietchId} ({g.size} hands)</option>
          ))}
        </select>
      )}
      {unissued.map(item => (
        <div key={item.id} style={styles.issueRow}>
          <span style={styles.itemName}>{item.kind}</span>
          <button
            style={{ ...styles.btn, ...(targetId ? {} : styles.btnDisabled) }}
            disabled={!targetId}
            onClick={() =>
              EventBus.emit('player:issue_equipment', { equipmentId: item.id, groupId: targetId })
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
      {stock.map(item => {
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
  panel: panelShell,
  title: { ...typo.heading, marginBottom: space.sm },
  subTitle: { ...typo.note, textTransform: 'uppercase' as const, fontStyle: 'normal' as const, marginBottom: 4 },
  row: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', gap: space.sm, marginBottom: space.sm,
  },
  info: { display: 'flex', flexDirection: 'column' as const },
  itemName: { color: palette.text, fontSize: 12 },
  desc: typo.note,
  buyBtn: { ...button.base, color: palette.text, borderColor: palette.gold, padding: '4px 10px' },
  btnDisabled: button.disabled,
  issueBlock: { marginTop: space.sm, paddingTop: space.sm, borderTop: `1px solid ${palette.lineSoft}` },
  issueRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  btn: button.base,
  select: {
    ...button.base, width: '100%', marginBottom: space.sm, color: palette.text,
  },
}
