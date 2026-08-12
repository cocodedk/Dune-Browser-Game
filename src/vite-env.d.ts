// src/vite-env.d.ts
// Ambient declaration for the vite.config.ts `define` block. `vite/client`
// itself is already pulled in via tsconfig.json's "types" array, so no
// triple-slash reference is needed here — just the one build-time global.

/** package.json's `version`, inlined at build time (vite.config.ts). Read
 * by the title screen (ui/title/TitleHome.tsx) for its version identifier. */
declare const __APP_VERSION__: string
