// src/ui/TravelAction.tsx
// The travel button, and — when travel is not possible — the reason.
//
// Split out of VillagePanel because "why can I not go there" is a question
// the player asks constantly early on: at the start of a game only one of the
// eight destinations is legal, the rest being either undiscovered or beyond
// walking range. Offering the same enabled button for all eight meant seven
// of them appeared to do nothing, with the explanation buried in an event log
// that has usually scrolled past by the time it is read.

import { travelCheckTo } from '../game-engine/TravelSystem'
import { rejectionMessage } from '../game-engine/travel/rules'
import type { VillageId } from '../types'
import { palette } from './theme'

export interface TravelActionProps {
  id: VillageId
  name: string
  isTraveling: boolean
  onTravel: () => void
}

export default function TravelAction({ id, name, isTraveling, onTravel }: TravelActionProps) {
  if (isTraveling) {
    return <button disabled style={styles.btn}>🐪 Traveling…</button>
  }

  const check = travelCheckTo(id)

  if (check.ok) {
    return (
      <button onClick={onTravel} style={styles.btn}>
        🐪 Travel to {name} · {check.durationSeconds}s
      </button>
    )
  }

  return (
    <div>
      <button disabled style={{ ...styles.btn, ...styles.btnBlocked }}>
        Cannot reach {name}
      </button>
      <p style={styles.reason}>{rejectionMessage(check.reason)}</p>
    </div>
  )
}

const styles = {
  btn: {
    width: '100%',
    padding: '8px 10px',
    background: palette.panelRaised,
    color: palette.gold,
    border: `1px solid ${palette.line}`,
    borderRadius: 3,
    fontSize: 13,
    cursor: 'pointer',
  },
  btnBlocked: {
    color: palette.textFaint,
    cursor: 'not-allowed',
    // Reads as unavailable rather than broken: still a button, visibly inert.
    opacity: 0.75,
  },
  reason: {
    margin: '6px 2px 0',
    color: palette.textDim,
    fontSize: 11.5,
    fontStyle: 'italic' as const,
    lineHeight: 1.35,
  },
}
