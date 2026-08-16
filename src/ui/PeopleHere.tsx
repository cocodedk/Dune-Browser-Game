// src/ui/PeopleHere.tsx
// Lists everyone residentsAt() finds at the selected village, each wired to
// player:speak_to.
//
// Before this, VisitPolicy handed the click straight to whichever character
// INITIAL_CHARACTERS happened to declare first for that address — nine
// locations hid a second or third resident with no route to them at all.
// This is the part the player actually sees: the missing choice, made visible.

import { EventBus } from '../EventBus'
import { INITIAL_CHARACTERS } from '../data/characters'
import { residentsAt } from '../game-engine/dialogue/residents'
import { visitRefusalMessage } from '../runtime/visitRefusal'
import { useGameStore } from './store'

interface Props {
  villageId: string
  playerIsHere: boolean
}

export default function PeopleHere({ villageId, playerIsHere }: Props) {
  // Whole-store read, not a `s => s.world` selector: GameDriver re-emits the
  // same mutated world object every tick, so an object selector is
  // Object.is-equal forever and this list would freeze on its first render
  // (the same trap CoachMark.tsx hit in chunk W3f).
  const { world } = useGameStore()

  // residentsAt has no notion of distance — decideSpeakTo is what actually
  // enforces "you cannot talk to someone across the planet". Gating the list
  // here too means the player is never shown a roster they cannot act on.
  if (!playerIsHere) return null

  const residents = residentsAt(INITIAL_CHARACTERS, villageId)
  if (residents.length === 0) return null

  // The dialogue overlay stops short of the command column, so this list sits
  // in plain sight beside an open conversation — including the opening's own
  // auto-opened briefing, which the player cannot dismiss. Every click here
  // was refused in silence. Show the refusal the way DestinationList shows
  // travel's: the control goes dead and says why, before the click.
  const busy = world.dialogue !== null
  const travelling = world.player.state === 'traveling'
  const reason = busy ? 'in-dialogue' as const : travelling ? 'traveling' as const : null

  function speakTo(characterId: string) {
    EventBus.emit('player:speak_to', { characterId })
  }

  return (
    <div style={styles.section}>
      <div style={styles.header}>PEOPLE HERE</div>
      {residents.map(person => (
        <button
          key={person.id}
          onClick={() => speakTo(person.id)}
          disabled={reason !== null}
          style={{ ...styles.btn, ...(reason ? styles.btnDisabled : {}) }}
        >
          <span style={styles.name}>{person.name}</span>
          <span style={styles.role}>{person.role}</span>
        </button>
      ))}
      {reason && <p style={styles.refusal}>{visitRefusalMessage(reason)}</p>}
    </div>
  )
}

const styles = {
  section: { marginTop: 12, paddingTop: 10, borderTop: '1px solid #3d2b10' },
  header: {
    color: '#d4a017',
    fontSize: 10,
    letterSpacing: '0.15em',
    fontWeight: 'bold' as const,
    marginBottom: 6,
  },
  btn: {
    display: 'flex' as const,
    flexDirection: 'column' as const,
    alignItems: 'flex-start' as const,
    background: '#2a1e0a',
    color: '#d4a017',
    border: '1px solid #d4a017',
    borderRadius: 4,
    padding: '6px 10px',
    cursor: 'pointer' as const,
    fontSize: 13,
    width: '100%',
    marginTop: 6,
    textAlign: 'left' as const,
  },
  btnDisabled: {
    opacity: 0.45,
    cursor: 'not-allowed' as const,
    borderColor: '#3d2b10',
  },
  refusal: {
    color: '#8b6914',
    fontSize: 11,
    fontStyle: 'italic' as const,
    margin: '6px 0 0',
  },
  name: { fontWeight: 'bold' as const },
  role: {
    color: '#8b6914',
    fontSize: 11,
    fontStyle: 'italic' as const,
    marginTop: 2,
  },
}
