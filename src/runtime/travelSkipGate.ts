// src/runtime/travelSkipGate.ts
// The flight cinematic's first-three-seconds skip gate (docs/PRD/
// game-completion/03-opening-experience.md "Teaching sequence" Beat 3: "The
// first flight may not be skipped during its first three seconds; after
// that, Escape and a visible Skip control are legal.") Read as EVERY flight
// (a superset of "literally only the player's first-ever flight" that also
// satisfies it, and the simpler rule to build and explain), not a one-time
// unlock — FlightMode.ts's own header already treats skipping as routine
// and repeatable ("skipping is render-only... the engine still lands the
// trip on time"), so gating only the very first flight and never any other
// would be an arbitrary, undocumented exception the very next trip.
//
// Wall-clock (real, not simulated game-time): the gate is about how long the
// player has actually watched the cinematic, which game speed/pause must
// not shrink. ui/sceneInput.ts's Escape handler and ui/FlightSkipButton.tsx
// both consult this one function so the two input paths cannot drift apart.

/** How long a flight must play, in real milliseconds, before it may be skipped. */
export const FLIGHT_SKIP_GATE_MS = 3000

/** Whether a flight that started `elapsedMs` real milliseconds ago may be skipped now. */
export function canSkipFlight(elapsedMs: number): boolean {
  return elapsedMs >= FLIGHT_SKIP_GATE_MS
}
