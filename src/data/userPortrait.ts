// src/data/userPortrait.ts
// The user-supplied 2D portrait drop-in slot (chunk W3c — closes the open
// item recorded in project memory: "future figures are 2D ChatGPT images,
// need a portrait slot in dialogue UI").
//
// Contract, also documented for the user in public/assets/portraits/README.md:
//
//   public/assets/portraits/<characterId>.png
//   - characterId matches data/characters.ts's Character.id (e.g. duke_armand,
//     vell, shadir) — see the README's id/name table.
//   - square, 512×512 suggested, face centered and filling most of the frame
//     (DialoguePortrait.tsx renders it at 64×64 with object-fit: cover).
//
// Pure characterId -> candidate URL, so the resolution logic is unit-testable
// with no DOM. DialoguePanel prefers this image over the procedural
// portrait; onError falls back to it (see ui/DialoguePortrait.tsx). The
// folder ships with the README and a .gitkeep only — no sample binaries —
// so this always falls back today, exactly as before this chunk.

// No leading slash — matches game-render/audio/AudioManager.ts's own
// ASSET_BASE convention (a relative URL resolved against the document,
// not an absolute one), so this keeps working the same way audio assets do
// if the app is ever served from anything other than the domain root.
export function userPortraitUrl(characterId: string): string {
  return `assets/portraits/${characterId}.png`
}
