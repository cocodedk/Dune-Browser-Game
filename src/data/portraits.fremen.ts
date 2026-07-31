// src/data/portraits.fremen.ts
// The sietch cast: desert palette, hard sun, framed close. Every entry here
// carries dress: 'fremen', which is what gates the stillsuit tubing and the
// blue-in-blue eyes of Ibad in figureDetails.ts — the one detail everybody
// remembers, so it stays exclusive to this file's roster.

import type { PortraitDef } from './portraits'

export const FREMEN_PORTRAITS: Record<string, PortraitDef> = {
  // Stilgar: naib of Red Wall, the commanding jaw and full beard of a leader.
  shadir: {
    backTop: '#b07038', backBottom: '#3d2413',
    rim: '#5aa9c8', figure: '#2a1809', framing: 0.7, keyHardness: 0.9, build: 1.1, dress: 'fremen',
    headgear: 'hood', beard: 'full', hairStyle: 'short',
    skinTone: 'weathered', hairTone: 'black', age: 'middle', jaw: 1.1, eyeTilt: -0.1, mark: 'none',
  },
  // Chani: young, narrow-jawed, alert — must not share a face with Ramallo.
  ysane: {
    backTop: '#c08a4a', backBottom: '#422a15',
    rim: '#5aa9c8', figure: '#2d1b0c', framing: 0.85, keyHardness: 0.85, build: 0.85, dress: 'fremen',
    headgear: 'hood', beard: 'none', hairStyle: 'long',
    skinTone: 'bronzed', hairTone: 'black', age: 'young', jaw: 0.85, eyeTilt: 0.06, mark: 'none',
  },
  // Reverend Mother Ramallo: ancient, gaunt, a scarf rather than a hood — an
  // elder indoors, not a warrior in the open sand.
  sova: {
    backTop: '#8a5a3a', backBottom: '#301c10',
    rim: '#5aa9c8', figure: '#231407', framing: 0.6, keyHardness: 0.55, build: 0.9, dress: 'fremen',
    headgear: 'scarf', beard: 'none', hairStyle: 'none',
    skinTone: 'ashen', hairTone: 'white', age: 'old', jaw: 0.75, eyeTilt: -0.15, mark: 'tattoo',
  },
  // Shishakli: young prospector, overconfident, eyes tilted up and eager.
  pell: {
    backTop: '#c99a52', backBottom: '#4a3018',
    rim: '#7ac4d8', figure: '#2f1d0d', framing: 0.9, keyHardness: 0.8, build: 0.8, dress: 'fremen',
    headgear: 'hood', beard: 'none', hairStyle: 'short',
    skinTone: 'bronzed', hairTone: 'brown', age: 'young', jaw: 1, eyeTilt: 0.1, mark: 'none',
  },

  // --- The far reaches -----------------------------------------------------
  // Fremen of the deep south: harder light, closer framing, spice-blue rim.
  // Harah: reads the sand, marked as a diviner.
  sabiha: {
    backTop: '#a86a42', backBottom: '#38200f',
    rim: '#5aa9c8', figure: '#281607', framing: 0.72, keyHardness: 0.82,
    build: 0.9, dress: 'fremen',
    headgear: 'hood', beard: 'none', hairStyle: 'long',
    skinTone: 'deepBronze', hairTone: 'black', age: 'middle', jaw: 0.95, eyeTilt: 0.05, mark: 'tattoo',
  },
  // Otheym: has ridden makers, guarded, and carries the scar to prove it.
  orrin: {
    backTop: '#94603a', backBottom: '#2e1a0d',
    rim: '#6fbcd4', figure: '#221305', framing: 0.92, keyHardness: 0.95,
    build: 1.15, dress: 'fremen',
    headgear: 'hood', beard: 'full', hairStyle: 'short',
    skinTone: 'deepBronze', hairTone: 'black', age: 'middle', jaw: 1.1, eyeTilt: -0.08, mark: 'scar',
  },
}
