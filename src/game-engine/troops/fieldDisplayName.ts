// src/game-engine/troops/fieldDisplayName.ts
// Human name for a spice field id — SpiceField (troops/types.ts) has no
// name slot, only an id authored by convention ('field_<place>_<qualifier>',
// data/spiceFields.ts). Blind-play finding C5: those raw ids were leaking
// into player-facing text (crew buttons, order confirmations, the
// assignment event log) alongside otherwise-authored prose. Pure string
// formatting, not a data addition, so every caller stays a one-line swap.

/** 'field_red_wall_pan' -> 'Red Wall Pan'. Drops the leading 'field' token
 * and title-cases the rest; any id with no leading 'field_' still formats
 * sensibly (title-cased, underscores to spaces). */
export function fieldDisplayName(fieldId: string): string {
  return fieldId
    .split('_')
    .filter((token, i) => !(i === 0 && token === 'field'))
    .map(token => token.length === 0 ? token : token[0].toUpperCase() + token.slice(1))
    .join(' ')
}
