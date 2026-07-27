import { useGameStore } from './store'
import { EventBus } from '../EventBus'
import type { Difficulty } from '../types'
import { useState, useEffect } from 'react'

export default function StatusBar() {
  const { world, lastSaveTime, saveGame, loadGame, newGame } = useGameStore()
  const { player, time, speed, goalAchieved, goalType, villages, difficulty } = world
  const [isMuted, setIsMuted] = useState(false)

  useEffect(() => {
    function onAudioChange(state: { isMuted: boolean }) {
      setIsMuted(state.isMuted)
    }
    EventBus.on('audio:changed', onAudioChange)
    return () => { EventBus.off('audio:changed', onAudioChange) }
  }, [])

  const minutes = Math.floor(time / 60)
  const seconds = Math.floor(time % 60)
  const playerVillages = villages.filter(v => v.owner === 'player').length

  const goalText = goalType === 'control_all_villages'
    ? `Villages: ${playerVillages}/${villages.length}`
    : `Survive: ${minutes}m ${seconds}s / 20m`

  function setSpeed(s: number) {
    EventBus.emit('game:speed', { speed: s })
  }

  function setDifficulty(d: Difficulty) {
    EventBus.emit('game:difficulty', { difficulty: d })
  }

  function toggleMute() {
    EventBus.emit('audio:mute')
  }

  const saveTimeStr = lastSaveTime
    ? new Date(lastSaveTime).toTimeString().slice(0, 5)
    : null

  async function handleNew() {
    if (!window.confirm('Start a new game? Current progress will be lost.')) return
    await newGame()
  }

  return (
    <div style={styles.bar}>
      <span style={styles.item}>
        <button style={styles.speedBtn} onClick={() => saveGame()}>Save</button>
        {saveTimeStr && <span style={styles.saveTime}> {saveTimeStr}</span>}
        <button style={styles.speedBtn} onClick={() => loadGame()}>Load</button>
        <button style={styles.speedBtn} onClick={handleNew}>New</button>
      </span>
      <span style={styles.item}>⏱ {minutes}:{seconds.toString().padStart(2, '0')}</span>
      <span style={styles.item}>🌿 Spice: {player.spice.toFixed(1)}</span>
      <span style={styles.item}>⚔ Troops: {player.troops ?? 0}</span>
      <span style={styles.item}>⭐ Influence: {player.influence}</span>
      <span style={{ ...styles.item, color: goalAchieved ? '#4caf50' : '#d4a017' }}>
        🎯 {goalAchieved ? '✔ GOAL ACHIEVED!' : goalText}
      </span>
      {!goalAchieved && (
        <span style={styles.item}>
          Speed:
          {[1, 2, 5].map(s => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              style={{
                ...styles.speedBtn,
                background: speed === s ? '#d4a017' : '#2a1e0a',
                color: speed === s ? '#0a0a0f' : '#d4a017',
              }}
            >
              {s}×
            </button>
          ))}
        </span>
      )}
      {!goalAchieved && (
        <span style={styles.item}>
          Difficulty:
          {(['easy', 'normal', 'hard'] as Difficulty[]).map(d => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              style={{
                ...styles.speedBtn,
                background: difficulty === d ? '#d4a017' : '#2a1e0a',
                color: difficulty === d ? '#0a0a0f' : '#d4a017',
              }}
            >
              {d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
        </span>
      )}
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