import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'

// No pre-mount save load here (03-opening-experience.md "Title and run
// setup"): a save must never install a running world before the player has
// chosen Continue/New/Load on the title screen. ui/store.ts's `screen`
// starts 'title', so App renders TitleScreen first; TitleScreen itself
// prefetches the rolling save's metadata (persistence.ts's probeSave(),
// read-only) for the Continue button, and only ui/store.ts's loadGame()/
// newGame() ever install a WorldState into GameState.world.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
