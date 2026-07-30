// src/data/portraits.cast.ts
// Nobility, Imperials, antagonists and outsiders — everyone in the Act 1-4
// roster who is not Fremen. Split from portraits.ts so that file stays a
// contract rather than a 500-line table; see portraits.fremen.ts for the
// sietch cast.

import type { PortraitDef } from './portraits'

export const CAST_PORTRAITS: Record<string, PortraitDef> = {
  // Nobility: cool, formal, lit from a distance, and — unlike everyone
  // wearing a hood in their own household — bare-headed.
  duke_armand: {
    backTop: '#6b5a7a', backBottom: '#241d33',
    rim: '#c9b8e0', figure: '#1d1628', framing: 0.25, keyHardness: 0.35, build: 1.05, dress: 'noble',
    headgear: 'bare', beard: 'stubble', hairStyle: 'short',
    skinTone: 'bronzed', hairTone: 'darkBrown', age: 'middle', jaw: 1.05, eyeTilt: -0.05, mark: 'none',
  },
  maren: {
    backTop: '#7a5a72', backBottom: '#2a1d2e',
    rim: '#e0b8d4', figure: '#221824', framing: 0.35, keyHardness: 0.3, build: 0.95, dress: 'noble',
    headgear: 'bare', beard: 'none', hairStyle: 'long',
    skinTone: 'fair', hairTone: 'sandy', age: 'middle', jaw: 0.9, eyeTilt: 0.04, mark: 'none',
  },

  // Imperial functionaries: bloodless, evenly lit, no warmth at all.
  corvin: {
    backTop: '#5a6a72', backBottom: '#1d2529',
    rim: '#9fc4d0', figure: '#161d21', framing: 0.2, keyHardness: 0.2, build: 0.9, dress: 'noble',
    headgear: 'cap', beard: 'none', hairStyle: 'short',
    skinTone: 'fair', hairTone: 'grey', age: 'old', jaw: 0.85, eyeTilt: -0.08, mark: 'none',
  },
  vell: {
    backTop: '#6b6355', backBottom: '#282419',
    rim: '#c4b89a', figure: '#1f1c14', framing: 0.4, keyHardness: 0.4, build: 1, dress: 'noble',
    headgear: 'bare', beard: 'full', hairStyle: 'short',
    skinTone: 'weathered', hairTone: 'white', age: 'old', jaw: 0.95, eyeTilt: -0.06, mark: 'none',
  },

  // The soldier: tightest framing, hardest key light in the cast, and a
  // helm rather than cloth — the one silhouette in the game with a hard edge.
  voss: {
    backTop: '#8a6a4a', backBottom: '#2e2216',
    rim: '#e8b84a', figure: '#1f1509', framing: 0.95, keyHardness: 1, build: 1,
    headgear: 'helm', beard: 'stubble', hairStyle: 'short',
    skinTone: 'weathered', hairTone: 'sandy', age: 'middle', jaw: 1.15, eyeTilt: -0.05, mark: 'scar',
  },

  // The scientist: soft, diffuse, the only green in the game, and a
  // desert scarf rather than a Fremen hood — adapted, not native.
  vast: {
    backTop: '#6a7a52', backBottom: '#252c19',
    rim: '#b8d49a', figure: '#1a2011', framing: 0.45, keyHardness: 0.15, build: 0.95,
    headgear: 'scarf', beard: 'full', hairStyle: 'long',
    skinTone: 'weathered', hairTone: 'sandy', age: 'middle', jaw: 1, eyeTilt: 0, mark: 'none',
  },

  // Outsiders and antagonists.
  meko: {
    backTop: '#7a5a3a', backBottom: '#2a1e12',
    rim: '#d4a017', figure: '#211709', framing: 0.75, keyHardness: 0.7, build: 1.15,
    headgear: 'cap', beard: 'full', hairStyle: 'short',
    skinTone: 'weathered', hairTone: 'grey', age: 'old', jaw: 1.1, eyeTilt: -0.05, mark: 'scar',
  },
  varn: {
    backTop: '#7a3a32', backBottom: '#2a1310',
    rim: '#e05a3a', figure: '#1f0d0a', framing: 0.8, keyHardness: 0.95, build: 1.2,
    headgear: 'helm', beard: 'none', hairStyle: 'bald',
    skinTone: 'ashen', hairTone: 'black', age: 'middle', jaw: 1.25, eyeTilt: -0.1, mark: 'insignia',
  },
  baron: {
    backTop: '#5a2a32', backBottom: '#1f0d12',
    rim: '#c04a5a', figure: '#180a0d', framing: 0.3, keyHardness: 0.6, build: 1.35,
    headgear: 'bare', beard: 'none', hairStyle: 'bald',
    skinTone: 'ashen', hairTone: 'black', age: 'old', jaw: 1.3, eyeTilt: -0.12, mark: 'insignia',
  },

  // Harkonnen and Guild: cold, even, and lit like an interrogation.
  krail: {
    backTop: '#6a3a34', backBottom: '#24100e',
    rim: '#d4604a', figure: '#1c0b09', framing: 0.85, keyHardness: 0.9,
    build: 1.25, dress: 'plain',
    headgear: 'cap', beard: 'stubble', hairStyle: 'short',
    skinTone: 'weathered', hairTone: 'grey', age: 'middle', jaw: 1.1, eyeTilt: -0.1, mark: 'none',
  },
  dessin: {
    backTop: '#5a5f6a', backBottom: '#1e2126',
    rim: '#b0bcc8', figure: '#171a1f', framing: 0.28, keyHardness: 0.18,
    build: 0.88, dress: 'noble',
    headgear: 'bare', beard: 'none', hairStyle: 'short',
    skinTone: 'fair', hairTone: 'grey', age: 'old', jaw: 0.85, eyeTilt: 0, mark: 'none',
  },
  hallock: {
    backTop: '#71574a', backBottom: '#281d18',
    rim: '#c88a5a', figure: '#1d1410', framing: 0.78, keyHardness: 0.62,
    build: 1.1, dress: 'plain',
    headgear: 'helm', beard: 'stubble', hairStyle: 'short',
    skinTone: 'weathered', hairTone: 'brown', age: 'middle', jaw: 1.05, eyeTilt: -0.03, mark: 'scar',
  },

  // Duncan: Atreides colours worn by someone who has been living in a
  // sietch — a scarf, not a full hood, and not bare-headed either.
  duncan: {
    backTop: '#7a6a52', backBottom: '#2a2418',
    rim: '#7fc48a', figure: '#1d1810', framing: 0.88, keyHardness: 0.75,
    build: 1.1, dress: 'plain',
    headgear: 'scarf', beard: 'stubble', hairStyle: 'short',
    skinTone: 'bronzed', hairTone: 'darkBrown', age: 'middle', jaw: 1, eyeTilt: 0, mark: 'scar',
  },

  // The waterseller: warm, close, and the only one who looks pleased to see you.
  zurrah: {
    backTop: '#b8834a', backBottom: '#3e2814',
    rim: '#e8c06a', figure: '#2a1a0a', framing: 0.8, keyHardness: 0.55,
    build: 1.2, dress: 'plain',
    headgear: 'scarf', beard: 'none', hairStyle: 'long',
    skinTone: 'bronzed', hairTone: 'sandy', age: 'middle', jaw: 0.95, eyeTilt: 0.12, mark: 'none',
  },
}
