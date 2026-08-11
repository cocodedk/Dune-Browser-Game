// src/ui/title/NewCampaignPanel.tsx
// The New Campaign setup panel: Easy/Normal/Hard, a replace-warning when a
// run already exists, and the one call to newGame(difficulty) — the sole
// write site for a campaign's difficulty (03-opening-experience.md "Title
// and run setup").

import { useState } from 'react'
import { useGameStore } from '../store'
import { titleStyles } from './titleStyles'
import { button, space } from '../theme'
import DifficultyCard from './DifficultyCard'
import { DIFFICULTY_ORDER, difficultySummary } from './difficultyCopy'
import { formatSaveMetadata, type SaveAvailability } from './titleState'
import type { Difficulty } from '../../types'

export default function NewCampaignPanel({
  availability, onBack,
}: {
  availability: SaveAvailability
  onBack: () => void
}) {
  const [difficulty, setDifficulty] = useState<Difficulty>('normal')
  const [confirmingReplace, setConfirmingReplace] = useState(false)
  const newGame = useGameStore(s => s.newGame)

  function handleStart(): void {
    if (availability.kind === 'valid' && !confirmingReplace) {
      setConfirmingReplace(true)
      return
    }
    void newGame(difficulty)
  }

  return (
    <div style={{ ...titleStyles.panel, maxWidth: 480 }}>
      <div style={titleStyles.heading}>New Campaign</div>
      <p style={titleStyles.note}>
        Choose a difficulty. It cannot be changed for this campaign once started —
        starting another new campaign is the only way to pick again.
      </p>

      {DIFFICULTY_ORDER.map(id => (
        <DifficultyCard
          key={id}
          id={id}
          selected={difficulty === id}
          onSelect={() => { setDifficulty(id); setConfirmingReplace(false) }}
        />
      ))}

      {!confirmingReplace ? (
        <button
          style={{ ...button.base, ...button.active, marginTop: space.sm, width: '100%' }}
          onClick={handleStart}
        >
          Start Campaign
        </button>
      ) : (
        <div style={{ marginTop: space.sm }}>
          <p style={titleStyles.error}>
            {availability.kind === 'valid'
              ? `This will replace your existing campaign (${formatSaveMetadata(availability.metadata)}). This cannot be undone.`
              : 'This will replace your existing campaign. This cannot be undone.'}
          </p>
          <div style={{ display: 'flex', gap: space.sm }}>
            <button style={{ ...button.base, ...button.active }} onClick={handleStart}>
              Replace and Start ({difficultySummary(difficulty).label})
            </button>
            <button style={button.base} onClick={() => setConfirmingReplace(false)}>Cancel</button>
          </div>
        </div>
      )}

      <button style={titleStyles.backButton} onClick={onBack}>Back</button>
    </div>
  )
}
