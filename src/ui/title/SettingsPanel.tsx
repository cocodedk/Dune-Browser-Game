// src/ui/title/SettingsPanel.tsx
// A minimal settings panel (03-opening-experience.md "Title and run
// setup"): the existing audio toggle MIRRORED — same 'audio:mute' EventBus
// contract StatusBar.tsx already uses, no new audio state — plus the
// guidance-callouts toggle, persisted to local settings
// (ui/settings/localSettings.ts). Guidance's CONSUMERS (coach marks) arrive
// in W3f; this chunk only stores and exposes the datum.

import { useEffect, useState } from 'react'
import { EventBus } from '../../EventBus'
import { titleStyles } from './titleStyles'
import { type as typo } from '../theme'
import { getGuidanceEnabled, setGuidanceEnabled } from '../settings/localSettings'

export default function SettingsPanel({ onBack }: { onBack: () => void }) {
  const [isMuted, setIsMuted] = useState(false)
  const [guidance, setGuidance] = useState(() => getGuidanceEnabled())

  useEffect(() => {
    function onAudioChange(state: { isMuted: boolean }) {
      setIsMuted(state.isMuted)
    }
    EventBus.on('audio:changed', onAudioChange)
    return () => { EventBus.off('audio:changed', onAudioChange) }
  }, [])

  function toggleGuidance(): void {
    const next = !guidance
    setGuidanceEnabled(next)
    setGuidance(next)
  }

  return (
    <div style={titleStyles.panel}>
      <div style={titleStyles.heading}>Settings</div>

      <label style={rowStyle}>
        <input type="checkbox" checked={!isMuted} onChange={() => EventBus.emit('audio:mute')} />
        <span style={typo.value}>Ambient audio</span>
      </label>

      <label style={rowStyle}>
        <input type="checkbox" checked={guidance} onChange={toggleGuidance} />
        <span style={typo.value}>Guidance callouts</span>
      </label>
      <p style={titleStyles.note}>
        Disabling guidance removes coach marks and highlighted controls. It never skips
        dialogue, flags, travel, pledges, or tribute.
      </p>

      <button style={titleStyles.backButton} onClick={onBack}>Back</button>
    </div>
  )
}

const rowStyle = { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 } as const
