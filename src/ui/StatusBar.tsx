import { useGameStore } from './store'
import { EventBus } from '../EventBus'
import { useState, useEffect } from 'react'
import { type as typo, button } from './theme'

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** A labelled figure. Labels are words, not emoji — emoji do not scan. */
function Readout({ label, value }: { label: string; value: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4 }}>
      <span style={typo.label}>{label}</span>
      <span style={typo.value}>{value}</span>
    </span>
  )
}

export default function StatusBar() {
  const { world, lastSaveTime, saveGame, loadGame, newGame } = useGameStore()
  const { player, time, speed, goalAchieved, difficulty, paused } = world
  const [isMuted, setIsMuted] = useState(false)

  useEffect(() => {
    function onAudioChange(state: { isMuted: boolean }) {
      setIsMuted(state.isMuted)
    }
    EventBus.on('audio:changed', onAudioChange)
    return () => { EventBus.off('audio:changed', onAudioChange) }
  }, [])

  // Both critics' biggest gap (W3h): a manual pause, coexisting with the
  // engine's own pause reasons (pause.ts's `manual` input) — CommandWiring
  // already routed 'game:pause' to onPause; only an emitter was missing.
  // Spacebar too, guarded off text-entry targets so it does not fight
  // SettlementModal's own number input.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.code !== 'Space') return
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      e.preventDefault()
      EventBus.emit('game:pause', { paused: !world.paused })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const minutes = Math.floor(time / 60)
  const seconds = Math.floor(time % 60)

  function setSpeed(s: number) {
    EventBus.emit('game:speed', { speed: s })
  }

  function togglePause() {
    EventBus.emit('game:pause', { paused: !paused })
  }

  function toggleMute() {
    EventBus.emit('audio:mute')
  }

  const saveTimeStr = lastSaveTime
    ? new Date(lastSaveTime).toTimeString().slice(0, 5)
    : null

  // Reuses the current run's difficulty — the only surface that CHOOSES a
  // difficulty is the title screen's New Campaign setup panel
  // (ui/title/NewCampaignPanel.tsx); a mid-run reset still counts as one
  // createInitialState() write, just with today's value carried forward
  // rather than re-prompting (03-opening-experience.md "Title and run
  // setup": difficulty is written once per campaign, not once ever).
  async function handleNew() {
    if (!window.confirm('Start a new game? Current progress will be lost.')) return
    await newGame(difficulty)
  }

  return (
    <div style={styles.bar}>
      <span style={styles.item}>
        <button style={button.base} onClick={() => saveGame()}>Save</button>
        {saveTimeStr && <span style={styles.saveTime}> {saveTimeStr}</span>}
        <button style={button.base} onClick={() => loadGame()}>Load</button>
        <button style={button.base} onClick={handleNew}>New</button>
      </span>
      <Readout label="day" value={`${Math.floor(time / 60)}`} />
      <Readout label="time" value={`${minutes}:${seconds.toString().padStart(2, '0')}`} />
      <Readout label="spice" value={player.spice.toFixed(1)} />
      {!goalAchieved && (
        <span style={styles.item}>
          Speed:
          <button
            onClick={togglePause}
            aria-pressed={paused}
            style={{ ...button.base, ...(paused ? button.active : {}) }}
            title="Pause (Space)"
          >
            0×
          </button>
          {[1, 2, 5].map(s => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              style={{ ...button.base, ...(!paused && speed === s ? button.active : {}) }}
            >
              {s}×
            </button>
          ))}
        </span>
      )}
      {/*
        Read-only — 03-opening-experience.md "Title and run setup":
        "Difficulty is written once into campaign state and cannot change
        until another new campaign begins." The mutable buttons that used to
        sit here (game:difficulty) are gone from the whole app, not hidden;
        see runtime/CommandWiring.ts's header and types.bus.ts.
      */}
      <Readout label="difficulty" value={capitalize(difficulty)} />

      <span style={styles.item}>
        <button style={styles.speedBtn} onClick={toggleMute}>
          {isMuted ? '🔇 Off' : '🔊 On'}
        </button>
      </span>
    </div>
  )
}

const styles = {
  bar: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '8px 16px',
    background: '#12100a',
    borderBottom: '1px solid #3d2b10',
    flexWrap: 'wrap' as const,
    fontSize: 13,
  },
  item: { color: '#d4a017' },
  saveTime: { color: '#8a7a55', fontSize: 11, marginRight: 4 },
  speedBtn: {
    marginLeft: 4,
    padding: '2px 8px',
    border: '1px solid #d4a017',
    borderRadius: 3,
    cursor: 'pointer',
    fontSize: 12,
  },
}