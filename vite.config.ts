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
  },
  build: {
    chunkSizeWarningLimit: 550,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined
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
