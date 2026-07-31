import { useGameStore } from './store'
import type { FactionProfile } from '../types'

const FACTION_COLORS: Record<string, string> = {
  harkonnen: '#c62828',
  fremen:    '#1565c0',
  atreides:  '#2e7d32',
  smugglers: '#6a1b9a',
  emperor:   '#f57f17',
}

function TrustBar({ trust }: { trust: number }) {
  const pct = ((Math.max(-100, Math.min(100, trust)) + 100) / 200) * 100
  const fill = trust >= 20 ? '#4caf50' : trust >= -20 ? '#c8a84b' : '#c62828'
  return (
    <div style={styles.trustTrack}>
      <div style={{ position: 'absolute', top: 0, left: '50%', width: 1, height: '100%', background: '#5a3d1a' }} />
      <div style={{ height: '100%', width: `${pct}%`, background: fill, borderRadius: 2, transition: 'width 0.4s' }} />
    </div>
  )
}

function FactionRow({ fp }: { fp: FactionProfile }) {
  const trust = fp.relations['player']?.trust ?? 0
  const color = FACTION_COLORS[fp.id] ?? '#888'
  const spice = fp.resources.spice.toFixed(0)

  return (
    <div style={styles.row}>
      <div style={{ ...styles.badge, background: color }}>{fp.id[0].toUpperCase()}</div>
      <div style={styles.info}>
        <div style={styles.name}>{fp.name}</div>
        <TrustBar trust={trust} />
        <div style={styles.meta}>
          <span style={{ color: trust >= 0 ? '#4caf50' : '#c62828' }}>
            {trust >= 0 ? '+' : ''}{trust}
          </span>
          <span style={styles.spice}> · {spice} spice</span>
        </div>
      </div>
    </div>
  )
}

export default function FactionPanel() {
  const { world } = useGameStore()
  const factions = world.factionProfiles
  if (factions.length === 0) return null

  return (
    <div style={styles.panel}>
      <div style={styles.header}>Factions</div>
      {factions.map(fp => <FactionRow key={fp.id} fp={fp} />)}
    </div>
  )
}

const styles = {
  panel: {
    borderTop: '1px solid #3d2b10',
    padding: '8px 12px',
    overflowY: 'auto' as const,
    flex: '0 0 auto',
  },
  header: {
    color: '#d4a017',
    fontSize: 11,
    fontWeight: 'bold' as const,
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
    marginBottom: 6,
  },
  row: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 7,
    marginBottom: 7,
  },
  badge: {
    width: 20,
    height: 20,
    borderRadius: 3,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    fontWeight: 'bold' as const,
    color: '#ffffff',
    flexShrink: 0,
    lineHeight: '20px',
    textAlign: 'center' as const,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: '#c8a84b',
    fontSize: 11,
    marginBottom: 3,
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  trustTrack: {
    height: 4,
    background: '#2a1e0a',
    borderRadius: 2,
    marginBottom: 2,
    position: 'relative' as const,
    overflow: 'hidden',
  },
  meta: {
    fontSize: 10,
    color: '#6b5a2a',
  },
  spice: {
    color: '#6b5a2a',
  },
}
