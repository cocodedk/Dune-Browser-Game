// src/data/dialogue/reaches-basin.ts
// Imperial Basin, Carthag and the road between: the people who can be bought,
// and the ones who cannot be bothered. All writing original to this project.
//
// Krail is where the player learns that Harkonnen strength arrives on a
// schedule and from a direction — which is what makes the named worlds in the
// sky more than scenery.

import type { DialogueNode } from '../../types'

export const REACHES_BASIN_NODES: DialogueNode[] = [
  // --- Overseer Krail — the Basin ------------------------------------------
  {
    id: 'krail_root',
    speaker: 'Overseer Krail',
    text:
      'Atreides. You are a long way from your father’s roof. The Basin runs ' +
      'eleven crews and loses two a season, which the ledger calls wastage and ' +
      'I call Tuesday. You want something or you would have flown over.',
    choices: [
      { id: 'kra_a1', text: 'Two crews a season to what?', nextId: 'krail_wastage' },
      { id: 'kra_a2', text: 'Where does your relief come from?',
        nextId: 'krail_relief' },
      { id: 'kra_a3', text: 'Nothing. I am counting.', nextId: null,
        effect: { setFlags: { 'scouted.basin': true } } },
    ],
  },
  {
    id: 'krail_wastage',
    speaker: 'Overseer Krail',
    text:
      'Makers, mostly. We work without thopter cover because cover costs more ' +
      'than crews do. You are welcome to think that says something about us. ' +
      'It says something about the price of spice.',
    choices: [
      { id: 'kra_w1', text: 'It says something about you.', nextId: null,
        effect: { influenceDelta: -1 } },
      { id: 'kra_w2', text: 'It says something about the Emperor.', nextId: null,
        effect: { setFlags: { 'krail.softened': true } } },
    ],
  },
  {
    id: 'krail_relief',
    speaker: 'Overseer Krail',
    text:
      'Giedi Prime, when the Baron remembers we exist. A heighliner every ' +
      'seventy days, and every one of them arrives full of men who have never ' +
      'seen sand. That is not a secret. Look up on a clear night and you can ' +
      'see where they come from.',
    choices: [
      { id: 'kra_r1', text: 'Seventy days.', nextId: null,
        effect: { setFlags: { 'known.harkonnen_relief': true } } },
    ],
  },

  // --- Factor Dessin — the Guild's accounts --------------------------------
  {
    id: 'dessin_root',
    speaker: 'Factor Dessin',
    text:
      'I keep accounts. I do not keep opinions, and I would ask you not to ' +
      'leave any here. What the Guild will tell you is this: spice moves, and ' +
      'the Guild does not care whose hands it passes through on the way.',
    choices: [
      { id: 'des_a1', text: 'Then you will trade with me.', nextId: 'dessin_trade' },
      { id: 'des_a2', text: 'And if the Harkonnens object?', nextId: 'dessin_object' },
    ],
  },
  {
    id: 'dessin_trade',
    speaker: 'Factor Dessin',
    text:
      'I will trade with whoever is holding. That is not friendship and you ' +
      'should not mistake it for any. It does mean that taking a place is the ' +
      'same as being owed by it, which is more than most conquerors get.',
    choices: [{ id: 'des_t1', text: 'That will do.', nextId: null }],
  },
  {
    id: 'dessin_object',
    speaker: 'Factor Dessin',
    text:
      'Then they will object to the Guild, and the Guild will note the ' +
      'objection, and the ships will continue. I have watched three houses ' +
      'discover this. Two of them are gone and the ledgers are not.',
    choices: [{ id: 'des_o1', text: 'Noted.', nextId: null }],
  },

  // --- Zurrah — sells water, hears everything ------------------------------
  {
    id: 'zurrah_root',
    speaker: 'Zurrah',
    text:
      'Water! And news, which is free, because a man who charges for news gets ' +
      'told nothing. You are the one from Arrakeen. Everybody has an opinion ' +
      'about you and none of them have met you, which is the best kind.',
    choices: [
      { id: 'zur_a1', text: 'What are they saying?', nextId: 'zurrah_news' },
      { id: 'zur_a2', text: 'What do you sell besides water?',
        nextId: 'zurrah_trade' },
    ],
  },
  {
    id: 'zurrah_news',
    speaker: 'Zurrah',
    text:
      'That you pay. That is the whole of it, and you would be amazed how rare ' +
      'it is. The Harkonnens take and the Emperor demands and you *pay*, and ' +
      'out here that is nearly a religion. Keep doing it and the sietches will ' +
      'come to you before you go to them.',
    choices: [
      { id: 'zur_n1', text: 'I intend to keep doing it.', nextId: null,
        effect: { influenceDelta: 2 } },
    ],
  },
  {
    id: 'zurrah_trade',
    speaker: 'Zurrah',
    text:
      'Nothing you would want and everything you will need. Stilltents, bulb ' +
      'caches for the planting people, patches for a suit. Ask the smuggler ' +
      'for machines. Ask me for the things that keep the people running them ' +
      'alive.',
    choices: [{ id: 'zur_t1', text: 'I will remember that.', nextId: null }],
  },

  // --- Sergeant Hallock — tired enough to be bought ------------------------
  {
    id: 'hallock_root',
    speaker: 'Sergeant Hallock',
    text:
      'Do not stand where the tower can see you. I am eleven years in this ' +
      'garrison and I have been paid for four of them. I am not going to shoot ' +
      'you. I am not going to help you either, unless you make that an easier ' +
      'sentence to say.',
    choices: [
      { id: 'hal_a1', text: 'What would make it easier?', nextId: 'hallock_price' },
      { id: 'hal_a2', text: 'Why are you telling me this?',
        nextId: 'hallock_why' },
      { id: 'hal_a3', text: 'Then say nothing.', nextId: null },
    ],
  },
  {
    id: 'hallock_price',
    speaker: 'Sergeant Hallock',
    text:
      'Water for my section. Not spice — spice buys me a knife in the ration ' +
      'queue. Water, quietly, and I will tell you when the garrison is thin ' +
      'and when it is not. That is worth more than the wall.',
    choices: [
      { id: 'hal_p1', text: 'Done.', nextId: null,
        effect: { setFlags: { 'bought.hallock': true }, influenceDelta: 3 } },
      { id: 'hal_p2', text: 'I have no water to spare.', nextId: null },
    ],
  },
  {
    id: 'hallock_why',
    speaker: 'Sergeant Hallock',
    text:
      'Because the Baron will not come to Arrakis and I will not leave it. ' +
      'Whatever happens here happens to me. It has never once happened to him.',
    choices: [{ id: 'hal_w1', text: 'That may change.', nextId: 'hallock_price' }],
  },
]
