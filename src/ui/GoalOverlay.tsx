import { useGameStore } from './store'
import { isVictory } from '../game-engine/acts/transitions'

/**
 * The end of a run.
 *
 * Three of this game's five endings are losses, and every one of them used to
 * be captioned "Victory!" — the overlay read only "has the run ended" and
 * assumed the answer meant winning. Losing Arrakis to the Emperor was
 * announced with a trophy.
 */
export default function GoalOverlay() {
  const { world } = useGameStore()
  if (!world.goalAchieved) return null

  const goalEvent = [...world.events].reverse().find(e => e.type === 'poc_goal_achieved')
  const subtitle = goalEvent?.message ?? 'The run is over.'
  const won = isVictory(world.ending)

  return (
    <div style={styles.overlay}>
      <div style={styles.box}>
        <div style={{ ...styles.title, color: won ? WIN_GOLD : LOSS_RED }}>
          {won ? 'Arrakis is yours' : 'Your house falls'}
        </div>
        <p style={styles.subtitle}>{subtitle}</p>
        <button
          style={styles.btn}
          onClick={() => window.location.reload()}
          onMouseEnter={e => (e.currentTarget.style.background = '#2a1e0a')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          Play Again
        </button>
      </div>
    </div>
  )
}

const WIN_GOLD = '#e8c060'
const LOSS_RED = '#c05a4a'

const styles = {
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    background: 'rgba(0,0,0,0.82)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
  },
  box: {
    background: '#12100a',
    border: '1px solid #d4a017',
    borderRadius: 8,
    padding: 40,
    maxWidth: 480,
    width: '90%',
    textAlign: 'center' as const,
    boxShadow: '0 0 60px rgba(212,160,23,0.3)',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold' as const,
    marginBottom: 16,
    letterSpacing: '0.05em',
  },
  subtitle: {
    color: '#c8a84b',
    fontSize: 15,
    fontStyle: 'italic' as const,
    lineHeight: 1.6,
    marginBottom: 28,
  },
  btn: {
    background: 'transparent',
    color: '#d4a017',
    border: '1px solid #d4a017',
    borderRadius: 4,
    padding: '10px 32px',
    cursor: 'pointer',
    fontSize: 15,
    letterSpacing: '0.08em',
    transition: 'background 0.15s',
  },
}
