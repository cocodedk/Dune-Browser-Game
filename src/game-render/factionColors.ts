import type { FactionId } from '../types'

/** CSS color strings — for React UI components */
export const FACTION_CSS_COLORS: Record<FactionId, string> = {
  player:    '#d4a017',
  harkonnen: '#c62828',
  fremen:    '#1565c0',
  atreides:  '#2e7d32',
  smugglers: '#6a1b9a',
  emperor:   '#f57f17',
  neutral:   '#5a5a5a',
}

/** Phaser hex colors — for Phaser Graphics/Text objects */
export const FACTION_PHASER_COLORS: Record<FactionId, number> = {
  player:    0xd4a017,
  harkonnen: 0xc62828,
  fremen:    0x1565c0,
  atreides:  0x2e7d32,
  smugglers: 0x6a1b9a,
  emperor:   0xf57f17,
  neutral:   0x5a5a5a,
}

/** Faction single-character abbreviation — for map badges */
export const FACTION_ABBREV: Record<FactionId, string> = {
  player:    '★',
  harkonnen: 'H',
  fremen:    'F',
  atreides:  'A',
  smugglers: 'S',
  emperor:   'E',
  neutral:   '?',
}
