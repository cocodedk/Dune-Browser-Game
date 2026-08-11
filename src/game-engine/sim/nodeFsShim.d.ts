// src/game-engine/sim/nodeFsShim.d.ts
// Minimal ambient declarations for the Node builtins parityFixtures
// .generate.test.ts and the WP04 chunk W4d sweep need. This project has no
// @types/node dependency (grep confirms — every other Node-builtin use in
// the repo lives in scripts/*.mjs, plain JS the TS project never
// typechecks); adding the real @types/node package is a dependency change
// this chunk's scope does not call for, and this file's runtime behavior is
// already proven by vitest (which needs no type declarations to execute —
// only `tsc` does). Narrow on purpose: only the functions actually called,
// not a general-purpose node:fs/node:url shim. `readFileSync` (W4d) reads
// the published baseline/wp04-sweep/seeds.txt contract file. `process.env`
// (W4d, sweep.run.test.ts's own RUN_SWEEP guard) is the same category of
// gap — no @types/node means no ambient `process` either.

declare module 'node:fs' {
  export function writeFileSync(path: string, data: string): void
  export function mkdirSync(path: string, options?: { recursive?: boolean }): void
  export function readFileSync(path: string, encoding: 'utf-8'): string
}

declare module 'node:url' {
  export function fileURLToPath(url: string | URL): string
}

declare const process: { env: Record<string, string | undefined> }
