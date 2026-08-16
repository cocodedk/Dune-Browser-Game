// src/ui/PledgePanel.tsx
// Split from SietchCommandSection.tsx (WP02e — legacy-authority-inventory.md
// category 2): that file mixed the LIVE pledge trigger with the retired
// threshold task-assignment UI (currentTask buttons, progress bar). Only the
// pledge trigger survives — crews (CrewPanel, the assign-crew command) are
// the sole production authority for a pledged sietch now, so there is
// nothing left to show here once pledgedToPlayer is true.
//
// Chunk W3d (03-opening-experience.md Beat 4) extends this with the numbers
// the beat requires visible ("loyalty numerically... the pledge threshold
// of 60 and the charisma capacity... visible"), the disabled-reason +
// recovery route Recovery row 1/2 call for, and a confirm step before the
// command fires ("a concise confirmation that a pledge grants
// responsibility for one crew; it is not an unlabelled ownership button").
// `checkPledgeChain` is the SAME read-only check the command itself runs
// (game-engine/SietchSystem.ts) — this panel renders its answer, never a
// second guess at the rule.

import { useState } from 'react'
import { EventBus } from '../EventBus'
import type { SietchState } from '../game-engine/sietch/types'
import { checkPledgeChain, type PledgeRefusal } from '../game-engine/SietchSystem'
import { pledgeChainRefusalMessage } from '../game-engine/sietch/pledgeRefusal'
import { pledgedCount } from '../game-engine/sietch/assignTask'
import { PLEDGE_THRESHOLD, maxPledged } from '../game-engine/sietch/loyalty'
import { useGameStore } from './store'
import ConfirmModal from './ConfirmModal'
import { pledgeConfirmCopy } from './confirmCopy'

interface Props {
  villageId: string
  villageName: string
  villageOwner: string
  sietch: SietchState | null
  playerIsHere: boolean
}

/** Recovery row 1/2: a valid route back, appended to the engine's own refusal text. */
function recoveryHint(reason: PledgeRefusal, charisma: number): string {
  switch (reason) {
    case 'not-loyal-enough':
      return 'Speak with them again, or offer a gift, to raise loyalty.'
    case 'charisma-cap': {
      // 03 "Recovery and refusal behavior": "Explain cap, current charisma,
      // next known source, and that existing pledges remain safe." Sources
      // cited are the three that actually exist in loyalty.ts —
      // CHARISMA_PER_PLEDGE, CHARISMA_PER_QUOTA, CHARISMA_PER_RAID — no
      // invented mechanism.
      const cap = maxPledged(charisma)
      return `Your cap is ${cap} pledged sietch${cap === 1 ? '' : 'es'} at charisma ${charisma}. ` +
        'Pledging and story events raise charisma — a sietch pledged, a tribute paid in ' +
        'full, or a raid survived. Existing pledges remain safe.'
    }
    case 'already-pledged':
    case 'not-present':
    case 'no-sietch':
    case 'not-fremen':
      return ''
  }
}

export default function PledgePanel({
  villageId,
  villageName,
  villageOwner,
  sietch,
  playerIsHere,
}: Props) {
  const { world } = useGameStore()
  const [confirming, setConfirming] = useState(false)

  if (!playerIsHere) return null
  if (villageOwner !== 'fremen') return null
  if (!sietch) return null
  if (sietch.pledgedToPlayer) return null

  const check = checkPledgeChain(villageId)
  const cap = maxPledged(world.charisma)

  function requestPledge() {
    setConfirming(true)
  }
  function confirmPledge() {
    setConfirming(false)
    EventBus.emit('player:pledge_sietch', { villageId })
  }

  return (
    <div style={styles.section}>
      <div style={styles.header}>SIETCH</div>
      <p style={styles.prose}>
        The Fremen of {villageName} watch you. They have not yet sworn to your cause.
      </p>
      <div style={styles.row}>
        <span>Loyalty {sietch.loyalty} / need {PLEDGE_THRESHOLD}</span>
      </div>
      <div style={styles.row}>
        <span>Pledges {pledgedCount(world.sietches)}/{cap}</span>
      </div>
      <button
        onClick={requestPledge}
        disabled={!check.ok}
        data-coach="pledge-button"
        style={{ ...styles.btn, ...(check.ok ? {} : styles.btnDisabled) }}
      >
        Pledge the Fremen of {villageName}
      </button>
      {!check.ok && (
        <p style={styles.reason}>
          {pledgeChainRefusalMessage(check.reason)} {recoveryHint(check.reason, world.charisma)}
        </p>
      )}
      {confirming && (
        // Wording shared with ActionPrompt.tsx's centre-screen card, which
        // raises this same confirmation — confirmCopy.ts.
        <ConfirmModal
          {...pledgeConfirmCopy(villageName)}
          onConfirm={confirmPledge}
          onCancel={() => setConfirming(false)}
        />
      )}
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
  row: {
    color: '#c9b27a',
    fontSize: 12,
    marginBottom: 4,
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
  btnDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed' as const,
    borderColor: '#6b5a2a',
  },
  reason: {
    color: '#c0392b',
    fontSize: 11,
    fontStyle: 'italic' as const,
    margin: '6px 0 0',
    lineHeight: 1.4,
  },
}
