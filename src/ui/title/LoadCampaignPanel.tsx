// src/ui/title/LoadCampaignPanel.tsx
// The rolling save's own metadata + explicit corrupt/incompatible handling
// (03-opening-experience.md "Title and run setup": "Load Campaign with
// slot metadata and corrupt/incompatible-state handling"). Multiple slots
// are WP11 — today there is exactly one rolling save, the same one
// Continue reads, shown here with its own screen and error state rather
// than folded silently into "no save".

import { useGameStore } from '../store'
import { titleStyles } from './titleStyles'
import { button, space } from '../theme'
import { formatSaveMetadata, CORRUPT_SAVE_MESSAGE, type SaveAvailability } from './titleState'

export default function LoadCampaignPanel({
  availability, onBack,
}: {
  availability: SaveAvailability
  onBack: () => void
}) {
  const loadGame = useGameStore(s => s.loadGame)

  return (
    <div style={titleStyles.panel}>
      <div style={titleStyles.heading}>Load Campaign</div>

      {availability.kind === 'absent' && (
        <p style={titleStyles.note}>No saved campaign found.</p>
      )}

      {availability.kind === 'corrupt' && (
        <p style={titleStyles.error}>{CORRUPT_SAVE_MESSAGE}</p>
      )}

      {availability.kind === 'valid' && (
        <>
          <p style={titleStyles.note}>{formatSaveMetadata(availability.metadata)}</p>
          <button
            style={{ ...button.base, ...button.active, width: '100%' }}
            onClick={() => void loadGame()}
          >
            Load
          </button>
        </>
      )}

      <button style={{ ...titleStyles.backButton, marginTop: space.lg }} onClick={onBack}>Back</button>
    </div>
  )
}
