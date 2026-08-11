// src/ui/CrewPanel.tsx
// Crew orders — the player's main verb in Act 1.
//
// Thin list container as of chunk W3d: per-crew presentation and the
// assign-confirm flow live in CrewCard.tsx (split out to keep Beat 5's
// additions under the 200-line cap). App.tsx gates this panel's very mount
// on the first pledge (03 "Progressive disclosure": "Crew panel — First
// pledge creates a crew"), so the empty state below is a defensive
// fallback, not a state a player should ever actually see.

import { useGameStore } from './store'
import CrewCard from './CrewCard'
import { type as typo, space, panelShell } from './theme'

export default function CrewPanel() {
  const { world } = useGameStore()
  const { troopGroups, spiceFields, equipment, villages, player } = world

  if (troopGroups.length === 0) {
    return (
      <div style={styles.panel} data-coach="crew-panel">
        <div style={styles.title}>Crews</div>
        <div style={styles.empty}>No crews. Pledge a sietch to raise one.</div>
      </div>
    )
  }

  return (
    <div style={styles.panel} data-coach="crew-panel">
      <div style={styles.title}>Crews</div>
      {troopGroups.map(group => (
        <CrewCard
          key={group.id}
          group={group}
          spiceFields={spiceFields}
          equipment={equipment}
          villages={villages}
          prescienceLevel={player.prescience}
        />
      ))}
    </div>
  )
}

const styles = {
  panel: panelShell,
  title: { ...typo.heading, marginBottom: space.sm },
  empty: typo.note,
}
