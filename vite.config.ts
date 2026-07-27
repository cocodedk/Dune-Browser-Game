/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react()],
  base: './',
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      phaser: 'phaser/src/phaser.js',
      phaser3spectorjs: fileURLToPath(new URL('./src/shims/phaser3spectorjs.cjs', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    passWithNoTests: true,
    // Cap worker count and recycle workers. On 2026-07-24 unbounded vitest
    // workers grew to 2.6-4 GiB RSS each and drove the machine low enough for
    // earlyoom to start SIGTERMing node processes. The suite is pure-TS and
    // sub-second, so it loses nothing by running on a small, bounded pool.
    pool: 'forks',
    poolOptions: {
      forks: {
        minForks: 1,
        maxForks: 4,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 550,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined
          }

          // Split three the same way phaser is split, so the budget script can
          // hold core and addons to separate ceilings.
          if (id.includes('/node_modules/three/')) {
            return id.includes('/examples/jsm/') ? 'three-addons' : 'three-core'
          }

          if (id.includes('/node_modules/phaser/')) {
            if (id.includes('/src/input/')) return 'phaser-input'
            if (id.includes('/src/textures/')) return 'phaser-textures'
            if (id.includes('/src/scene/') || id.includes('/src/cameras/')) {
              return 'phaser-scene'
            }
            if (id.includes('/src/gameobjects/')) return 'phaser-gameobjects'
            if (id.includes('/src/geom/') || id.includes('/src/math/')) return 'phaser-math'
            if (id.includes('/src/renderer/')) return 'phaser-renderer'
            if (id.includes('/src/physics/') || id.includes('/src/tilemaps/')) return 'phaser-world'
            return 'phaser-core'
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
