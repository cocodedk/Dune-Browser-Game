import { defineConfig, devices } from '@playwright/test'

// Keep the loopback address off any HTTP proxy.
//
// Tooling in this environment (Socket Firewall) exports HTTP_PROXY into every
// npm script but sets no NO_PROXY, so Playwright's health check for the
// preview server was being routed through the proxy, which answers 405 to it
// forever. `npm test` then timed out after two minutes waiting for a server
// that had in fact started immediately — including inside the pre-commit hook.
//
// Prepended rather than assigned, so an existing NO_PROXY is preserved.
const LOOPBACK = '127.0.0.1,localhost,::1'
process.env.NO_PROXY = process.env.NO_PROXY
  ? `${LOOPBACK},${process.env.NO_PROXY}`
  : LOOPBACK
process.env.no_proxy = process.env.NO_PROXY

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    screenshot: 'only-on-failure',
    ...devices['Desktop Chrome'],
    headless: true,
    // Headless Chromium falls back to SwiftShader software GL, and the 3D
    // location interiors (landscape-shop sets) saturate the main thread under
    // it — page.evaluate and click handlers starve, and any spec that dwells
    // inside a location hangs to its 30s timeout while the same steps pass
    // headed in ~6s (measured on e2e/opening2.spec.ts, 2026-08-11). Let the
    // headless browser use the real GPU instead.
    launchOptions: {
      args: ['--use-gl=angle', '--use-angle=gl', '--ignore-gpu-blocklist', '--enable-gpu'],
    },
  },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    // Never reuse: a leftover preview server silently serves a stale dist,
    // and the suite then tests OLD code against NEW expectations — this
    // produced two phantom gate failures (W4b's and W4e's reports both hit
    // it) that vanished the moment the stale server died. The ~1s startup
    // cost buys version coherence on every run.
    reuseExistingServer: false,
    timeout: 120000,
  },
  projects: [
    {
      // launchOptions inherit from the top-level `use` block above — do not
      // re-spread devices here or the GPU args get clobbered.
      name: 'chromium',
      use: { headless: true },
    },
  ],
})
