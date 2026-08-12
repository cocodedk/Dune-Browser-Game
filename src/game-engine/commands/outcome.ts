// src/game-engine/commands/outcome.ts
// The command outcome contract — docs/PRD/game-completion/
// 02-runtime-consolidation.md "Command outcome contract".
//
// Every production mutation eventually returns one of these: a stable
// success CODE, or a stable refusal CODE. `reason` is a code, never
// player-facing prose — "No player-facing prose in pure rule functions;
// UI/event policy maps stable reason codes to text" is the spec's own
// wording, and mapping a code to text stays that separate layer's job, not
// this module's or any command's.
//
// `TReason` defaults to `string` so the type stays literally the shape the
// spec gives (`CommandOutcome<T>`) for a caller that only needs the success
// side typed. A caller that also wants its refusal codes typed narrowly —
// recommended, and what pledgeCommand.ts does — supplies both arguments.

export type CommandOutcome<TCode extends string, TReason extends string = string> =
  | { ok: true; code: TCode }
  | { ok: false; reason: TReason }

/** Build a success outcome. Assignable to any `CommandOutcome<TCode, ...>`. */
export function ok<TCode extends string>(code: TCode): CommandOutcome<TCode, never> {
  return { ok: true, code }
}

/** Build a refusal outcome. Assignable to any `CommandOutcome<..., TReason>`. */
export function fail<TReason extends string>(reason: TReason): CommandOutcome<never, TReason> {
  return { ok: false, reason }
}
