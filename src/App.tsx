import { lazy, Suspense } from 'react'
import StatusBar from './ui/StatusBar'
import QuotaLedger from './ui/QuotaLedger'
import CrewPanel from './ui/CrewPanel'
import MarketPanel from './ui/MarketPanel'
import FortPanel from './ui/FortPanel'
import VillagePanel from './ui/VillagePanel'
import DialoguePanel from './ui/DialoguePanel'
import SettlementModal from './ui/SettlementModal'
import EventLog from './ui/EventLog'
import GoalOverlay from './ui/GoalOverlay'
import { COMMAND_COLUMN_WIDTH, palette } from './ui/theme'
import EventToasts from './ui/EventToasts'
import OrnamentFrame from './ui/Ornament'
import ViewHint from './ui/ViewHint'
import PositionStrip from './ui/PositionStrip'

// three.js is now the only renderer; Phaser is gone. Kept lazy so the 3D
// chunk stays out of the initial payload.
const GameContainer = lazy(() => import('./ui/ThreeContainer'))

/**
 * The map IS the screen.
 *
 * The 3D view fills the entire viewport and the interface floats over it as
 * translucent panes, rather than the map living in a box beside a sidebar.
 * Arrakis is the subject; the panels are instruments read against it.
 */
export default function App() {
  return (
    <div style={styles.root}>
      {/* Full-bleed 3D view, underneath everything */}
      <div style={styles.stage}>
        <Suspense fallback={<div style={styles.fallback}>Loading Arrakis…</div>}>
          <GameContainer />
        </Suspense>
      </div>

      {/* Title, floating top-left over the sand */}
      <div style={styles.title}>DUNE</div>
      <PositionStrip />

      {/* Command column, floating right. Scrolls independently of the map. */}
      <div style={styles.column}>
        <OrnamentFrame plain><StatusBar /></OrnamentFrame>
        <OrnamentFrame><QuotaLedger /></OrnamentFrame>
        <OrnamentFrame><CrewPanel /></OrnamentFrame>
        <OrnamentFrame><MarketPanel /></OrnamentFrame>
        <OrnamentFrame><FortPanel /></OrnamentFrame>
        <OrnamentFrame plain><VillagePanel /></OrnamentFrame>
        <OrnamentFrame plain><EventLog /></OrnamentFrame>
      </div>

      <ViewHint />

      {/* Messages over the middle of the scene — see ui/toastPolicy.ts. */}
      <EventToasts />

      <DialoguePanel />
      <SettlementModal />
      <GoalOverlay />
    </div>
  )
}

/** Tight opaque halo plus a wide soft one — legible over sand or sky. */
const HALO = [
  '0 0 2px rgba(8,5,2,0.95)',
  '0 1px 3px rgba(8,5,2,0.9)',
  '0 2px 12px rgba(8,5,2,0.75)',
].join(', ')

const styles = {
  root: {
    flex: 1,
    width: '100%',
    height: '100vh',
    position: 'relative' as const,
    background: palette.ink,
    overflow: 'hidden',
  },
  // Absolutely positioned so the canvas covers the viewport edge to edge and
  // the overlays do not steal any of it via flex layout.
  stage: {
    position: 'absolute' as const,
    inset: 0,
    display: 'flex',
  },
  title: {
    position: 'absolute' as const,
    top: 14,
    left: 20,
    color: palette.gold,
    fontSize: 15,
    fontWeight: 700 as const,
    letterSpacing: '0.42em',
    textTransform: 'uppercase' as const,
    // Gold on a night sky is easy; gold on noon sand is not, and a single soft
    // shadow left the title invisible over bright dunes. A tight opaque halo
    // plus a wider soft one keeps it readable against anything.
    textShadow: HALO,
    pointerEvents: 'none' as const,
  },
  column: {
    position: 'absolute' as const,
    top: 0,
    right: 0,
    bottom: 0,
    width: COMMAND_COLUMN_WIDTH,
    display: 'flex',
    flexDirection: 'column' as const,
    overflowY: 'auto' as const,
    // Translucent so the desert stays visible behind the instruments, with a
    // blur so text never has to fight dune detail for legibility.
    background: 'rgba(13, 9, 6, 0.82)',
    backdropFilter: 'blur(7px)',
    WebkitBackdropFilter: 'blur(7px)',
    borderLeft: `1px solid ${palette.line}`,
    boxShadow: '-14px 0 34px rgba(0,0,0,0.45)',
  },
  fallback: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: palette.gold,
    background: palette.panel,
    fontSize: 13,
    letterSpacing: '0.14em',
    textTransform: 'uppercase' as const,
  },
}
