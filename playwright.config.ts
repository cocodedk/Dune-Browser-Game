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
  },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], headless: true },
    },
  ],
})
