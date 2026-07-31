import { useGameStore } from './store'

const EVENT_ICONS: Record<string, string> = {
  alliance_offer: '🤝',
  betrayal: '💀',
  attack: '⚔',
  dialogue_start: '💬',
  dialogue_end: '💬',
  village_selected: '📍',
  travel_start: '🐪',
  travel_complete: '✅',
  faction_decision: '🔴',
  poc_goal_achieved: '🏆',
}

export default function EventLog() {
  const { world } = useGameStore()

  return (
    <div style={styles.container}>
      <div style={styles.header}>Event Log</div>
      <div style={styles.list}>
        {world.events.length === 0 ? (
          <p style={{ color: '#6b5a2a', fontSize: 12, fontStyle: 'italic' }}>No events yet.</p>
        ) : (
          world.events.map(event => (
            <div key={event.id} style={styles.entry}>
              <span style={styles.icon}>{EVENT_ICONS[event.type] ?? '•'}</span>
              <span style={styles.msg}>{event.message}</span>
              <span style={styles.time}>{Math.floor(event.timestamp)}s</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

const styles = {
  container: { flex: 1, display: 'flex', flexDirection: 'column' as const, overflow: 'hidden' },
  header: {
    color: '#8b6914',
    fontSize: 11,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    padding: '8px 16px 4px',
    borderBottom: '1px solid #3d2b10',
  },
  list: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '8px 16px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 6,
  },
  entry: { display: 'flex', alignItems: 'flex-start', gap: 8 },
  icon: { fontSize: 13, flexShrink: 0, marginTop: 1 },
  msg: { color: '#c8a84b', fontSize: 12, lineHeight: 1.4, flex: 1 },
  time: { color: '#6b5a2a', fontSize: 11, flexShrink: 0 },
}
