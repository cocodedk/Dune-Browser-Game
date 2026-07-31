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

interface Props {
  villageId: string
  playerIsHere: boolean
}

export default function PeopleHere({ villageId, playerIsHere }: Props) {
  // residentsAt has no notion of distance — decideSpeakTo is what actually
  // enforces "you cannot talk to someone across the planet". Gating the list
  // here too means the player is never shown a roster they cannot act on.
  if (!playerIsHere) return null

  const residents = residentsAt(INITIAL_CHARACTERS, villageId)
  if (residents.length === 0) return null

  function speakTo(characterId: string) {
    EventBus.emit('player:speak_to', { characterId })
  }

  return (
    <div style={styles.section}>
      <div style={styles.header}>PEOPLE HERE</div>
      {residents.map(person => (
        <button key={person.id} onClick={() => speakTo(person.id)} style={styles.btn}>
          <span style={styles.name}>{person.name}</span>
          <span style={styles.role}>{person.role}</span>
        </button>
      ))}
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
  name: { fontWeight: 'bold' as const },
  role: {
    color: '#8b6914',
    fontSize: 11,
    fontStyle: 'italic' as const,
    marginTop: 2,
  },
}
