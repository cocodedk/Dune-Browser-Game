import { useEffect } from 'react'
import { useGameStore } from './store'
import { EventBus } from '../EventBus'
import { endDialogue, canCloseDialogue } from '../game-engine/DialogueSystem'
import { getPortraitKey, PORTRAIT_FACTION } from '../data/portraitConfig'
import { FACTION_CSS_COLORS } from '../game-render/factionColors'
import { displaySpeaker } from '../game-engine/dialogue/resident'
import { speakerCharacter } from '../game-engine/dialogue/speakerCharacter'
import { INITIAL_CHARACTERS } from '../data/characters'
import { portraitFor } from '../data/portraits'
import DialoguePortrait from './DialoguePortrait'
import { styles } from './DialoguePanel.styles'

export default function DialoguePanel() {
  const { currentDialogueNode, world } = useGameStore()

  useEffect(() => {
    if (!world.dialogue) return
    // endDialogue() is already a no-op while canCloseDialogue() is false
    // (DialogueSystem.ts); checked here too so Escape does not even push a
    // spurious keydown-handled no-op during the opening's mandatory beats.
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && canCloseDialogue()) endDialogue() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [world.dialogue])

  if (!currentDialogueNode || !world.dialogue) return null

  // The generic trees say "Village Elder"; the character card behind them
  // names whoever actually lives here. Reconciled so the player is not shown
  // two names for one speaker.
  const locationResident = INITIAL_CHARACTERS.find(c => c.locationId === world.player.location)
  const speakerName = displaySpeaker(currentDialogueNode.speaker, locationResident?.name)

  const portraitKey = getPortraitKey(world.dialogue.treeId)
  const factionId = portraitKey ? PORTRAIT_FACTION[portraitKey] : undefined

  // getPortraitKey only covers the seven generic trees; every other
  // conversation resolves the actual speaking character BY NAME, not by
  // "whoever lives here" — see speakerCharacter.ts's own doc for the bug
  // that location-only resolution caused (the wrong portrait for a second
  // named resident at the same address, e.g. Thufir at Arrakeen).
  const speaker = !portraitKey
    ? speakerCharacter(INITIAL_CHARACTERS, currentDialogueNode.speaker, world.player.location)
    : undefined
  const residentPortrait = speaker ? portraitFor(speaker.id) : undefined
  const portraitColor = factionId
    ? FACTION_CSS_COLORS[factionId]
    : residentPortrait?.rim ?? '#d4a017'
  const portraitLabel = portraitKey
    ? portraitKey.replace(/_/g, ' ').toUpperCase()
    : speakerName.toUpperCase()

  // The opening's two mandatory beats refuse to close early (canCloseDialogue
  // in DialogueSystem.ts) — hiding the × here avoids leaving a dead button
  // on screen rather than relying only on the engine no-op.
  const closable = canCloseDialogue()

  function choose(choiceId: string) {
    EventBus.emit('player:choose', { choiceId })
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.box}>
        {closable && (
          <button onClick={endDialogue} style={styles.closeBtn} aria-label="Close">×</button>
        )}
        <div style={{ ...styles.portraitRow, marginBottom: 8 }}>
          {portraitKey ? (
            <div style={{ ...styles.portrait, borderColor: portraitColor, color: portraitColor }}>
              {portraitLabel}
            </div>
          ) : (
            <DialoguePortrait
              key={speaker?.id ?? portraitLabel}
              characterId={speaker?.id}
              color={portraitColor}
              label={portraitLabel}
            />
          )}
          <div style={styles.portraitInfo}>
            <div style={styles.speaker}>{speakerName}</div>
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
