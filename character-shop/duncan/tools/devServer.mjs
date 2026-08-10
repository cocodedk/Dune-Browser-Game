// character-shop/duncan/tools/devServer.mjs
// Attach to an already-running dev server on PORT, or spawn one and wait
// for it to report ready. Adapted from vehicle-shop/harvester/tools/
// devServer.mjs (read as reference only, never imported — the fence
// forbids cross-shop imports even from tooling) so shoot.mjs has one
// bring-up path instead of reinventing it.

import { spawn } from 'node:child_process'

/** Returns { kill() } — kill() is a no-op if we attached to a server we did
 *  not start. Registers its own process.on('exit') so a thrown error still
 *  tears the spawned server down. */
export async function ensureDevServer(port) {
  const alive = await fetch(`http://127.0.0.1:${port}/`, { method: 'GET' })
    .then((r) => r.ok)
    .catch(() => false)

  if (alive) {
    console.log(`attaching to the dev server already on :${port}`)
    return { kill: () => {} }
  }

  const server = spawn('npx', ['vite', 'character-shop/duncan', '--port', String(port), '--strictPort'], {
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const kill = () => {
    try {
      server.kill('SIGTERM')
    } catch {
      /* already gone */
    }
  }
  process.on('exit', kill)

  const ready = await new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), 60000)
    const watch = (chunk) => {
      if (String(chunk).includes(`:${port}`)) {
        clearTimeout(timer)
        resolve(true)
      }
    }
    server.stdout.on('data', watch)
    server.stderr.on('data', watch)
  })
  if (!ready) {
    kill()
    throw new Error('vite did not start')
  }
  return { kill }
}
