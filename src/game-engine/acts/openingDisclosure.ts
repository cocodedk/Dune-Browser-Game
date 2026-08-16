// src/game-engine/acts/openingDisclosure.ts
// One more "First appears" query from 03-opening-experience.md's
// Progressive disclosure table — split into its own file rather than added
// to openingObjectives.ts, which sits at this repository's 200-line cap.
//
// "Market | Smuggler den is discovered and entered." Read as den.discovered
// alone: travel/rules.ts's own `undiscovered` rejection is what actually
// stands between the player and entering it, so there is nothing an
// "entered at least once" flag would gate that discovery does not already
// gate — adding one would duplicate that rule for no player-visible
// difference. MarketPanel.tsx's own atDen/unissued checks already decide
// what to render once mounted (never a real stock list away from the den);
// this function only decides whether the panel's FRAME should exist at all
// (App.tsx gates every progressive-disclosure surface the same way —
// OrnamentFrame draws its chrome around whatever child it is given,
// including null, so gating inside MarketPanel itself would still show an
// empty carved box before the den is even found).
//
// Deliberately NO lastProcessedDay escape hatch, unlike openingObjectives.ts's
// ledgerDisclosed/destinationsDisclosed: those hatches are sound only
// because the opening's pause chain makes their flag unavoidable before day
// 1 can ever elapse (see ledgerDisclosed's own doc). No such ordering exists
// for den discovery — every fresh campaign crosses day 1 within a minute of
// unpaused play (TimeSystem.DAY_SECONDS is 60), so an OR'd lastProcessedDay
// hatch would mount the panel's empty frame at Arrakeen for every campaign
// during the opening — the exact defect this function exists to close, not
// a legacy save's special case.

import type { WorldState } from '../../types'

export function marketDisclosed(world: WorldState): boolean {
  const den = world.villages.find(v => v.id === world.player.location)
  // "Smuggler den is discovered AND ENTERED" — 03's own disclosure row, now
  // read literally. Gating on discovery alone was what closed the equipment
  // economy: the den had to stay hidden to keep an empty market frame off
  // the Arrakeen view, and hiding it left no way to buy the ornithopter that
  // prospecting — the only path that discovers anything — requires (user
  // report, 2026-08-16). Presence keeps the frame off every other view
  // without costing the player the shop: the den is seeded discovered now
  // (data/villages.ts) and sits one hop from Arrakeen.
  return den?.kind === 'smuggler_den' && den.discovered === true
}
