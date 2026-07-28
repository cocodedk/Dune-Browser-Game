import { useEffect } from 'react'
import { useGameStore } from './store'
import { EventBus } from '../EventBus'
import { endDialogue } from '../game-engine/DialogueSystem'
import { getPortraitKey, PORTRAIT_FACTION } from '../data/portraitConfig'
import { FACTION_CSS_COLORS } from '../game-render/factionColors'
import { COMMAND_COLUMN_WIDTH } from './theme'

export default function DialoguePanel() {
  const { currentDialogueNode, world } = useGameStore()

  useEffect(() => {
    if (!world.dialogue) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') endDialogue() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [world.dialogue])

  if (!currentDialogueNode || !world.dialogue) return null

  const portraitKey = world.dialogue ? getPortraitKey(world.dialogue.treeId) : undefined
  const factionId = portraitKey ? PORTRAIT_FACTION[portraitKey] : undefined
  const portraitColor = factionId ? FACTION_CSS_COLORS[factionId] : '#d4a017'
  const portraitLabel = portraitKey ? portraitKey.replace(/_/g, ' ').toUpperCase() : ''

  function choose(choiceId: string) {
    EventBus.emit('player:choose', { choiceId })
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.box}>
        <button onClick={endDialogue} style={styles.closeBtn} aria-label="Close">×</button>
        <div style={{ ...styles.portraitRow, marginBottom: 8 }}>
          <div style={{ ...styles.portrait, borderColor: portraitColor, color: portraitColor }}>
            {portraitLabel}
          </div>
          <div style={styles.portraitInfo}>
            <div style={styles.speaker}>{currentDialogueNode.speaker}</div>
          </div>
        </div>
        <p style={styles.text}>{currentDialogueNode.text}</p>
        <div style={styles.choices}>
          {currentDialogueNode.choices.map(choice => (
            <button
              key={choice.id}
              onClick={() => choose(choice.id)}
              style={styles.choiceBtn}
              onMouseEnter={e => (e.currentTarget.style.background = '#2a1e0a')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {choice.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed' as const,
    // Stops short of the command column: a flat 75% black over the whole
    // viewport dimmed the instruments too, so during a conversation the
    // player could not read their own spice, deadline or crew.
    top: 0,
    left: 0,
    bottom: 0,
    right: COMMAND_COLUMN_WIDTH,
    // Darkest at the bottom where the text sits, clearing toward the top so
    // the character is lit rather than veiled.
    background:
      'linear-gradient(to bottom, rgba(6,4,2,0.30) 0%,' +
      ' rgba(6,4,2,0.55) 55%, rgba(6,4,2,0.86) 100%)',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    padding: 32,
    zIndex: 100,
  },
  box: {
    position: 'relative' as const,
    background: '#12100a',
    border: '1px solid #d4a017',
    borderRadius: 8,
    padding: 24,
    maxWidth: 640,
    width: '100%',
    boxShadow: '0 0 40px rgba(212,160,23,0.2)',
  },
  closeBtn: {
    position: 'absolute' as const,
    top: 8,
    right: 12,
    background: 'transparent',
    border: 'none',
    color: '#8b6914',
    fontSize: 22,
    cursor: 'pointer' as const,
    lineHeight: 1,
    padding: '4px 8px',
  },
  portraitRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  portrait: {
    width: 64,
    height: 64,
    border: '2px solid #d4a017',
    borderRadius: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 9,
    fontWeight: 'bold' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    flexShrink: 0,
  },
  portraitInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  speaker: {
    color: '#d4a017',
    fontWeight: 'bold' as const,
    marginBottom: 4,
    fontSize: 14,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
  },
  text: {
    color: '#c8a84b',
    lineHeight: 1.6,
    marginBottom: 16,
    fontSize: 15,
    fontStyle: 'italic' as const,
  },
  choices: { display: 'flex', flexDirection: 'column' as const, gap: 8 },
  choiceBtn: {
    background: 'transparent',
    color: '#d4a017',
    border: '1px solid #3d2b10',
    borderRadius: 4,
    padding: '10px 16px',
    cursor: 'pointer',
    textAlign: 'left' as const,
    fontSize: 14,
    transition: 'background 0.15s',
  },
}
