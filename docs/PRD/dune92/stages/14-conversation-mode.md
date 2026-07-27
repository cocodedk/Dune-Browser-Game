# Stage 14 — Conversation mode

**Phase:** 2 · **Depends on:** 13, 06 · **Est. tasks:** 2 · **Builder:** Sonnet
**Status:** TODO — **OUTLINE ONLY, spec before building**

## Goal

The character card view. Conversations are the interface to the whole game, so this is
where perceived quality is won or lost.

**Completing this stage ships the Act 1 vertical slice.**

## Sketch

- `ConversationMode.ts` — frames the character card over the dimmed location
- `CharacterCard.ts` — portrait plane, rim-light shader, breathing and parallax drift

Choices stay React buttons emitting `player:choose`. `DialoguePanel` becomes the text
layer over the 3D view.

## Hard rule

**Portrait cards, never 3D humans.** Rigged characters are where small projects die.
Eight portraits at 1024², all original, produced from one written style bible and a
fixed prompt template so the set reads as one hand.

## Open questions for the spec pass

- Does the portrait need expression variants per emotional beat, or does one portrait
  plus text carry it?
- How does the card handle a character with no portrait yet — a silhouette placeholder,
  or fall back to the text-only panel?
