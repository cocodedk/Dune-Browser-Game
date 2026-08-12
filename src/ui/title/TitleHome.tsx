// src/ui/title/TitleHome.tsx
// The title's home pane: wordmark, Continue (only with a valid save),
// New Campaign, Load Campaign, Settings, and the version identifier
// (03-opening-experience.md "Title and run setup").

import { useGameStore } from '../store'
import { titleStyles } from './titleStyles'
import { canContinue, formatSaveMetadata, type SaveAvailability } from './titleState'

export default function TitleHome({
  availability, onNewCampaign, onLoadCampaign, onSettings,
}: {
  availability: SaveAvailability
  onNewCampaign: () => void
  onLoadCampaign: () => void
  onSettings: () => void
}) {
  const loadGame = useGameStore(s => s.loadGame)
  const showContinue = canContinue(availability)

  return (
    <div style={{ ...titleStyles.panel, background: 'transparent', border: 'none', boxShadow: 'none' }}>
      <div style={titleStyles.wordmark}>Dune</div>
      <div style={titleStyles.tagline}>Arrakis awaits a Duke's decision</div>

      <div style={titleStyles.menu}>
        {showContinue && availability.kind === 'valid' && (
          <button
            style={titleStyles.menuButton}
            onClick={() => void loadGame()}
            // 03: reload/boot resolves to the title with Continue focused.
            autoFocus
          >
            Continue — {formatSaveMetadata(availability.metadata)}
          </button>
        )}
        <button style={titleStyles.menuButton} onClick={onNewCampaign} autoFocus={!showContinue}>
          New Campaign
        </button>
        <button style={titleStyles.menuButton} onClick={onLoadCampaign}>Load Campaign</button>
        <button style={titleStyles.menuButton} onClick={onSettings}>Settings</button>
      </div>

      <div style={titleStyles.version}>v{__APP_VERSION__}</div>
    </div>
  )
}
