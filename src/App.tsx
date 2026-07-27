import { lazy, Suspense } from 'react'
import StatusBar from './ui/StatusBar'
import QuotaLedger from './ui/QuotaLedger'
import CrewPanel from './ui/CrewPanel'
import VillagePanel from './ui/VillagePanel'
import DialoguePanel from './ui/DialoguePanel'
import EventLog from './ui/EventLog'
import FactionPanel from './ui/FactionPanel'
import GoalOverlay from './ui/GoalOverlay'

// three.js is now the only renderer; Phaser is gone. Kept lazy so the 3D
// chunk stays out of the initial payload.
const GameContainer = lazy(() => import('./ui/ThreeContainer'))

export default function App() {
  return (
    <div style={styles.root}>
      {/* Left: 3D game view */}
      <div style={styles.left}>
        <div style={styles.title}>DUNE: BROWSER GAME</div>
        <Suspense fallback={<div style={styles.canvasFallback}>Loading Arrakis...</div>}>
          <GameContainer />
        </Suspense>
        <div style={styles.hint}>Click a village on the map to travel or talk · Speed controls in right panel</div>
      </div>

      {/* Right: React panels */}
      <div style={styles.right}>
        <StatusBar />
        <QuotaLedger />
        <CrewPanel />
        <VillagePanel />
        <FactionPanel />
        <EventLog />
      </div>

      {/* Dialogue modal overlay */}
      <DialoguePanel />

      {/* Goal achieved overlay */}
      <GoalOverlay />
    </div>
  )
}

const styles = {
  root: {
    display: 'flex',
    height: '100vh',
    background: '#0a0a0f',
    overflow: 'hidden',
  },
  left: {
    display: 'flex',
    flexDirection: 'column' as const,
    padding: 16,
    gap: 8,
  },
  title: {
    color: '#d4a017',
    fontSize: 13,
    fontWeight: 'bold' as const,
    letterSpacing: '0.15em',
    textTransform: 'uppercase' as const,
  },
  hint: {
    color: '#6b5a2a',
    fontSize: 11,
    textAlign: 'center' as const,
  },
  canvasFallback: {
    width: 800,
    height: 500,
    flexShrink: 0,
    border: '1px solid #3d2b10',
    borderRadius: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#8b6914',
    background: '#120d07',
    fontSize: 13,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
  },
  right: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    borderLeft: '1px solid #3d2b10',
    overflow: 'hidden',
    minWidth: 280,
    maxWidth: 380,
  },
}
