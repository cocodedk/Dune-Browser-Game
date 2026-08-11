// src/ui/coachAnchor.ts
// Shared DOM lookup for a `data-coach="<key>"` anchor. Split out of
// CoachMark.tsx (remediation W3h) so ObjectivePanel.tsx's one-shot Show
// flash and CoachMark's own persistent overlay point at the same element by
// the same key (coachMarkTarget.ts's naming) through one function, not two
// copies of the same querySelector.

export function findCoachAnchor(key: string): HTMLElement | null {
  return document.querySelector(`[data-coach="${key}"]`)
}
