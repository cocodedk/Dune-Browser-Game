// src/data/portraits.ts
// Per-character portrait direction.
//
// Style follows docs/PRD/dune92/02-architecture-3d.md: apricot and amber,
// deep blue-violet shadows, spice-blue as the single accent. Portraits are
// composed procedurally rather than generated, so the whole cast is guaranteed
// to look like one hand — the failure mode with fourteen separately generated
// images is that they do not.
//
// Each entry encodes who the person is, not just what colour they are. A
// soldier is framed tighter and lit harder than a planetologist.

export interface PortraitDef {
  /** Backdrop gradient, top to bottom. */
  backTop: string
  backBottom: string
  /** Rim light colour — the character's single identifying accent. */
  rim: string
  /** Silhouette fill. */
  figure: string
  /** 0 distant and formal, 1 close and intimate. */
  framing: number
  /** 0 soft and diffuse, 1 hard and directional. */
  keyHardness: number
  /** Head width relative to height; wider reads heavier, narrower ascetic. */
  build: number
  /**
   * What the figure is wearing, which is most of what identifies them at a
   * glance. Fremen get a stillsuit and the blue-in-blue eyes of Ibad; nobles
   * get a high formal collar; the Baron gets neither.
   */
  dress?: 'fremen' | 'noble' | 'plain'
}

const DEFAULT: PortraitDef = {
  backTop: '#a8763f', backBottom: '#3d2a15',
  rim: '#d4a017', figure: '#2a180b',
  framing: 0.5, keyHardness: 0.5, build: 1, dress: 'plain',
}

const PORTRAITS: Record<string, PortraitDef> = {
  // Nobility: cool, formal, lit from a distance.
  duke_armand: {
    backTop: '#6b5a7a', backBottom: '#241d33',
    rim: '#c9b8e0', figure: '#1d1628', framing: 0.25, keyHardness: 0.35, build: 1.05, dress: 'noble',
  },
  maren: {
    backTop: '#7a5a72', backBottom: '#2a1d2e',
    rim: '#e0b8d4', figure: '#221824', framing: 0.35, keyHardness: 0.3, build: 0.95, dress: 'noble',
  },

  // Imperial functionaries: bloodless, evenly lit, no warmth at all.
  corvin: {
    backTop: '#5a6a72', backBottom: '#1d2529',
    rim: '#9fc4d0', figure: '#161d21', framing: 0.2, keyHardness: 0.2, build: 0.9, dress: 'noble',
  },
  vell: {
    backTop: '#6b6355', backBottom: '#282419',
    rim: '#c4b89a', figure: '#1f1c14', framing: 0.4, keyHardness: 0.4, build: 1, dress: 'noble',
  },

  // Fremen: desert palette, hard sun, framed close.
  shadir: {
    backTop: '#b07038', backBottom: '#3d2413',
    rim: '#5aa9c8', figure: '#2a1809', framing: 0.7, keyHardness: 0.9, build: 1.1, dress: 'fremen',
  },
  ysane: {
    backTop: '#c08a4a', backBottom: '#422a15',
    rim: '#5aa9c8', figure: '#2d1b0c', framing: 0.85, keyHardness: 0.85, build: 0.85, dress: 'fremen',
  },
  sova: {
    backTop: '#8a5a3a', backBottom: '#301c10',
    rim: '#5aa9c8', figure: '#231407', framing: 0.6, keyHardness: 0.55, build: 0.9, dress: 'fremen',
  },
  pell: {
    backTop: '#c99a52', backBottom: '#4a3018',
    rim: '#7ac4d8', figure: '#2f1d0d', framing: 0.9, keyHardness: 0.8, build: 0.8, dress: 'fremen',
  },

  // The soldier: tightest framing, hardest key light in the cast.
  voss: {
    backTop: '#8a6a4a', backBottom: '#2e2216',
    rim: '#e8b84a', figure: '#1f1509', framing: 0.95, keyHardness: 1, build: 1,
  },

  // The scientist: soft, diffuse, the only green in the game.
  vast: {
    backTop: '#6a7a52', backBottom: '#252c19',
    rim: '#b8d49a', figure: '#1a2011', framing: 0.45, keyHardness: 0.15, build: 0.95,
  },

  // Outsiders and antagonists.
  meko: {
    backTop: '#7a5a3a', backBottom: '#2a1e12',
    rim: '#d4a017', figure: '#211709', framing: 0.75, keyHardness: 0.7, build: 1.15,
  },
  varn: {
    backTop: '#7a3a32', backBottom: '#2a1310',
    rim: '#e05a3a', figure: '#1f0d0a', framing: 0.8, keyHardness: 0.95, build: 1.2,
  },
  baron: {
    backTop: '#5a2a32', backBottom: '#1f0d12',
    rim: '#c04a5a', figure: '#180a0d', framing: 0.3, keyHardness: 0.6, build: 1.35,
  },

  // --- The far reaches -----------------------------------------------------
  // Fremen of the deep south: harder light, closer framing, spice-blue rim.
  sabiha: {
    backTop: '#a86a42', backBottom: '#38200f',
    rim: '#5aa9c8', figure: '#281607', framing: 0.72, keyHardness: 0.82,
    build: 0.9, dress: 'fremen',
  },
  orrin: {
    backTop: '#94603a', backBottom: '#2e1a0d',
    rim: '#6fbcd4', figure: '#221305', framing: 0.92, keyHardness: 0.95,
    build: 1.15, dress: 'fremen',
  },

  // Harkonnen and Guild: cold, even, and lit like an interrogation.
  krail: {
    backTop: '#6a3a34', backBottom: '#24100e',
    rim: '#d4604a', figure: '#1c0b09', framing: 0.85, keyHardness: 0.9,
    build: 1.25, dress: 'plain',
  },
  dessin: {
    backTop: '#5a5f6a', backBottom: '#1e2126',
    rim: '#b0bcc8', figure: '#171a1f', framing: 0.28, keyHardness: 0.18,
    build: 0.88, dress: 'noble',
  },
  hallock: {
    backTop: '#71574a', backBottom: '#281d18',
    rim: '#c88a5a', figure: '#1d1410', framing: 0.78, keyHardness: 0.62,
    build: 1.1, dress: 'plain',
  },

  // Duncan: Atreides colours worn by someone who has been living in a sietch.
  duncan: {
    backTop: '#7a6a52', backBottom: '#2a2418',
    rim: '#7fc48a', figure: '#1d1810', framing: 0.88, keyHardness: 0.75,
    build: 1.1, dress: 'plain',
  },

  // The waterseller: warm, close, and the only one who looks pleased to see you.
  zurrah: {
    backTop: '#b8834a', backBottom: '#3e2814',
    rim: '#e8c06a', figure: '#2a1a0a', framing: 0.8, keyHardness: 0.55,
    build: 1.2, dress: 'plain',
  },
}


export function portraitFor(characterId: string): PortraitDef {
  return PORTRAITS[characterId] ?? DEFAULT
}

export function portraitCount(): number {
  return Object.keys(PORTRAITS).length
}