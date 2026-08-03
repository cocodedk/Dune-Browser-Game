/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    // Shop release seam: game imports the shop public surface only, and
    // ESLint (eslint.config.js) enforces that boundary at lint time.
    alias: { '@shop': fileURLToPath(new URL('./vehicle-shop', import.meta.url)) },
  },
  test: {
    environment: 'node',
    // vehicle-shop/ holds standalone rigs for building one vehicle at a time
    // before it is folded into the game. Its pure modules (flight dynamics,
    // control mapping) carry the same unit-test obligation as src/, so the
    // suite has to see them — without this line they are silently untested.
    include: ['src/**/*.test.ts', 'vehicle-shop/**/*.test.ts'],
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
