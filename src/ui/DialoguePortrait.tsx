// src/ui/DialoguePortrait.tsx
// The named-character portrait slot: a user-supplied image if one exists at
// public/assets/portraits/<characterId>.png (see data/userPortrait.ts for
// the exact contract), falling back to the procedural label box DialoguePanel
// always drew before this chunk. Split out of DialoguePanel.tsx to keep the
// onError/fallback state local rather than adding another field there, and
// to keep DialoguePanel under the file-length cap.
//
// `key={characterId}` at the call site (DialoguePanel.tsx) is load-bearing:
// it forces a fresh mount — and so a fresh `broken` state — whenever the
// speaking character changes, so one character's missing image never
// poisons the next character's chance to load theirs.

import { useState } from 'react'
import { userPortraitUrl } from '../data/userPortrait'

interface Props {
  /** Undefined for a generic (faction-archetype) speaker — always falls back. */
  characterId?: string
  color: string
  label: string
}

export default function DialoguePortrait({ characterId, color, label }: Props) {
  const [broken, setBroken] = useState(false)

  if (characterId && !broken) {
    return (
      <img
        src={userPortraitUrl(characterId)}
        alt={label}
        onError={() => setBroken(true)}
        style={{ ...styles.box, borderColor: color, objectFit: 'cover' as const }}
      />
    )
  }

  return (
    <div style={{ ...styles.box, ...styles.fallback, borderColor: color, color }}>
      {label}
    </div>
  )
}

const styles = {
  box: {
    width: 64,
    height: 64,
    border: '2px solid',
    borderRadius: 4,
    flexShrink: 0,
  },
  fallback: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 9,
    fontWeight: 'bold' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
}
