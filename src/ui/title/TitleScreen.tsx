// src/ui/title/TitleScreen.tsx
// Full-screen DOM overlay shown at boot, before the renderer mounts
// (03-opening-experience.md "Title and run setup"). Orchestrates the four
// panes via titleState.ts's pure transition table; probes the rolling
// save's metadata once on mount (persistence.ts's probeSave(), read-only —
// never installs a world, see App.tsx/ui/store.ts's `screen` doc).

import { useEffect, useState } from 'react'
import { probeSave } from '../../game-engine/persistence'
import { titleStyles } from './titleStyles'
import { nextTitleView, toSaveAvailability, type TitleView, type SaveAvailability } from './titleState'
import TitleHome from './TitleHome'
import NewCampaignPanel from './NewCampaignPanel'
import LoadCampaignPanel from './LoadCampaignPanel'
import SettingsPanel from './SettingsPanel'

export default function TitleScreen() {
  const [view, setView] = useState<TitleView>('home')
  const [availability, setAvailability] = useState<SaveAvailability>({ kind: 'absent' })

  useEffect(() => {
    let cancelled = false
    void probeSave().then(probe => {
      if (!cancelled) setAvailability(toSaveAvailability(probe))
    })
    return () => { cancelled = true }
  }, [])

  function go(action: Parameters<typeof nextTitleView>[1]): void {
    setView(current => nextTitleView(current, action))
  }

  return (
    <div style={titleStyles.overlay}>
      {view === 'home' && (
        <TitleHome
          availability={availability}
          onNewCampaign={() => go('openNewCampaign')}
          onLoadCampaign={() => go('openLoadCampaign')}
          onSettings={() => go('openSettings')}
        />
      )}
      {view === 'newCampaign' && (
        <NewCampaignPanel availability={availability} onBack={() => go('back')} />
      )}
      {view === 'loadCampaign' && (
        <LoadCampaignPanel availability={availability} onBack={() => go('back')} />
      )}
      {view === 'settings' && <SettingsPanel onBack={() => go('back')} />}
    </div>
  )
}
