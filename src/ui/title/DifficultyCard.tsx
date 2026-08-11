// src/ui/title/DifficultyCard.tsx
// One difficulty's card in the New Campaign setup panel: the selector
// button IS the difficulty's name (same label convention StatusBar's old
// mutable buttons used), its one-sentence effect, and a native <details>
// expander for the raw multipliers — 03-opening-experience.md "Title and
// run setup": "internal multipliers are available in a details expander."

import { difficultySummary, MULTIPLIER_LABELS } from './difficultyCopy'
import { button, type, space, row, panelShell, palette } from '../theme'
import type { Difficulty } from '../../types'

export default function DifficultyCard({
  id, selected, onSelect,
}: {
  id: Difficulty
  selected: boolean
  onSelect: () => void
}) {
  const summary = difficultySummary(id)

  return (
    <div
      style={{
        ...panelShell,
        borderTop: `1px solid ${selected ? palette.gold : palette.lineSoft}`,
        marginBottom: space.sm,
      }}
    >
      <button
        style={{ ...button.base, ...(selected ? button.active : {}) }}
        onClick={onSelect}
        // Normal is this panel's default focus (03: "Normal is the default").
        autoFocus={id === 'normal'}
      >
        {summary.label}
      </button>
      <p style={{ ...type.note, marginTop: space.xs }}>{summary.sentence}</p>
      <details>
        <summary style={{ ...type.label, cursor: 'pointer' }}>Internal multipliers</summary>
        <div style={{ marginTop: space.xs }}>
          {MULTIPLIER_LABELS.map(([key, label]) => (
            <div style={row} key={key}>
              <span style={type.label}>{label}</span>
              <span style={type.value}>×{summary.config[key]}</span>
            </div>
          ))}
        </div>
      </details>
    </div>
  )
}
