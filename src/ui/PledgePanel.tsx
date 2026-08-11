// src/ui/PledgePanel.tsx
// Split from SietchCommandSection.tsx (WP02e — legacy-authority-inventory.md
// category 2): that file mixed the LIVE pledge trigger with the retired
// threshold task-assignment UI (currentTask buttons, progress bar). Only the
// pledge trigger survives — crews (CrewPanel, the assign-crew command) are
// the sole production authority for a pledged sietch now, so there is
// nothing left to show here once pledgedToPlayer is true.

import { EventBus } from '../EventBus'
import type { SietchState } from '../game-engine/sietch/types'

interface Props {
  villageId: string
  villageName: string
  villageOwner: string
  sietch: SietchState | null
  playerIsHere: boolean
}

export default function PledgePanel({
  villageId,
  villageName,
  villageOwner,
  sietch,
  playerIsHere,
}: Props) {
  if (!playerIsHere) return null
  if (villageOwner !== 'fremen') return null
  if (!sietch) return null
  if (sietch.pledgedToPlayer) return null

  function pledge() {
    EventBus.emit('player:pledge_sietch', { villageId })
  }

  return (
    <div style={styles.section}>
      <div style={styles.header}>SIETCH</div>
      <p style={styles.prose}>
        The Fremen of {villageName} watch you. They have not yet sworn to your cause.
      </p>
      <button onClick={pledge} style={styles.btn}>
        Pledge the Fremen of {villageName}
      </button>
    </div>
  )
}

const styles = {
  section: { marginTop: 12, paddingTop: 10, borderTop: '1px solid #3d2b10' },
  header: {
    color: '#d4a017',
    fontSize: 10,
    letterSpacing: '0.15em',
    fontWeight: 'bold' as const,
    marginBottom: 6,
  },
  prose: {
    color: '#a89060',
    fontSize: 12,
    fontStyle: 'italic' as const,
    margin: '0 0 8px',
    lineHeight: 1.4,
  },
  btn: {
    background: '#2a1e0a',
    color: '#d4a017',
    border: '1px solid #d4a017',
    borderRadius: 4,
    padding: '6px 14px',
    cursor: 'pointer' as const,
    fontSize: 12,
    width: '100%',
    marginTop: 6,
  },
}
