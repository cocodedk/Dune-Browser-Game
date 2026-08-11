// src/game-engine/sim/nodeFsShim.d.ts
// Minimal ambient declarations for the two Node builtins
// parityFixtures.generate.test.ts needs to write its JSON fixtures. This
// project has no @types/node dependency (grep confirms — every other Node-
// builtin use in the repo lives in scripts/*.mjs, plain JS the TS project
// never typechecks); adding the real @types/node package is a dependency
// change this chunk's scope does not call for, and this file's runtime
// behavior is already proven by vitest (which needs no type declarations to
// execute — only `tsc` does). Narrow on purpose: only the three functions
// actually called, not a general-purpose node:fs/node:url shim.

declare module 'node:fs' {
  export function writeFileSync(path: string, data: string): void
  export function mkdirSync(path: string, options?: { recursive?: boolean }): void
}

declare module 'node:url' {
  export function fileURLToPath(url: string | URL): string
}
