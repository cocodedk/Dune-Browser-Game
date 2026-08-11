// src/ui/GiftPanel.tsx
// The gift command's production emitter (docs/PRD/game-completion/
// baseline/wp02-critic-verdict.md — C3-FAIL, finding 3a: "player:gift_sietch
// has no production emitter at all. The only thing that ever emits this
// command is a test."). Same split as PledgePanel.tsx (both come from the
// old SietchCommandSection.tsx), but visibility does NOT gate on
// `pledgedToPlayer` the way PledgePanel's does — see giftButtonVisibility.ts.

import { EventBus } from '../EventBus'
import type { SietchState } from '../game-engine/sietch/types'
import { GIFT_SPICE_COST } from '../game-engine/sietch/loyalty'
import { giftButtonVisible } from './giftButtonVisibility'

interface Props {
  villageId: string
  villageName: string
  villageOwner: string
  sietch: SietchState | null
  playerIsHere: boolean
  playerSpice: number
}

export default function GiftPanel({
  villageId,
  villageName,
  villageOwner,
  sietch,
  playerIsHere,
  playerSpice,
}: Props) {
  if (!giftButtonVisible({ villageOwner, sietch, playerIsHere, playerSpice })) return null

  function gift() {
    EventBus.emit('player:gift_sietch', { villageId })
  }

  return (
    <div style={styles.section}>
      <p style={styles.prose}>
        Offer spice to the Fremen of {villageName} to earn their trust.
      </p>
      <button onClick={gift} style={styles.btn}>
        Gift spice ({GIFT_SPICE_COST})
      </button>
    </div>
  )
}

const styles = {
  section: { marginTop: 8 },
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
    border: '1px solid #6b5a2a',
    borderRadius: 4,
    padding: '6px 14px',
    cursor: 'pointer' as const,
    fontSize: 12,
    width: '100%',
  },
}
