/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    // Shop release seam: game imports the shop public surface only, and
    // ESLint (eslint.config.js) enforces that boundary at lint time. Three
    // roots, one seam each — vehicle-shop/ for machines, character-shop/
    // for the cast, landscape-shop/ for static terrain sets
    // (docs/PRD/dune92/04-asset-pipeline.md).
    alias: {
      '@shop': fileURLToPath(new URL('./vehicle-shop', import.meta.url)),
      '@cast': fileURLToPath(new URL('./character-shop', import.meta.url)),
      '@land': fileURLToPath(new URL('./landscape-shop', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    // vehicle-shop/, character-shop/ and landscape-shop/ hold standalone
    // rigs for building one asset at a time before it is folded into the
    // game. Their pure modules carry the same unit-test obligation as
    // src/, so the suite has to see them — without this line they are
    // silently untested.
    include: [
      'src/**/*.test.ts',
      'vehicle-shop/**/*.test.ts',
      'character-shop/**/*.test.ts',
      'landscape-shop/**/*.test.ts',
    ],
    passWithNoTests: true,
    // Cap worker count and recycle workers. On 2026-07-24 unbounded vitest
    // workers grew to 2.6-4 GiB RSS each and drove the machine low enough for
    // earlyoom to start SIGTERMing node processes. The suite is pure-TS and
    // sub-second, so it loses nothing by running on a small, bounded pool.
    // Vitest 4 moved these to top level; poolOptions is removed and ignored.
    pool: 'forks',
    minWorkers: 1,
    maxWorkers: 4,
  },
  build: {
    chunkSizeWarningLimit: 550,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Each shop asset ships as its own budgeted chunk (scripts/check-bundle-size.mjs).
          if (id.includes('/vehicle-shop/')) {
            return `vehicle-${id.split('/vehicle-shop/')[1].split('/')[0]}`
          }

          if (id.includes('/character-shop/')) {
            return `character-${id.split('/character-shop/')[1].split('/')[0]}`
          }

          if (id.includes('/landscape-shop/')) {
            const shop = id.split('/landscape-shop/')[1].split('/')[0]
            // A single bake's Int16/Uint16 payload can still blow the
            // 150,000-byte budget on its own (landscape-shop/cliff's
            // massif: 386 KB of plain JSON, still ~192 KB quantized —
            // tools/bake/quantize.mjs's header has the arithmetic). Its own
            // named chunk, split from the shop's code and every other bake,
            // is what CODEX.md's bundle-budget section now documents as the
            // multi-chunk fallback.
            if (id.endsWith('BakeIndex.json')) return `landscape-${shop}-index`
            if (id.endsWith('BakeGeo.json')) return `landscape-${shop}-geo`
            return `landscape-${shop}`
          }

          if (!id.includes('node_modules')) {
            return undefined
          }

          // Split three the same way phaser is split, so the budget script can
          // hold core and addons to separate ceilings.
          if (id.includes('/node_modules/three/')) {
            return id.includes('/examples/jsm/') ? 'three-addons' : 'three-core'
          }

          if (
            id.includes('/node_modules/react/') ||
            id.includes('/node_modules/react-dom/')
          ) {
            return 'react-vendor'
          }

          if (id.includes('/node_modules/zustand/')) {
            return 'state-vendor'
          }

          return 'vendor'
        },
      },
    },
  },
})
