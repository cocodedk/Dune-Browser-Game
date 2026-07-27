import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { loadFromSave } from './game-engine/GameState'

loadFromSave()
  .catch(() => { /* IndexedDB unavailable; use fresh state */ })
  .then(() => {
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    )
  })