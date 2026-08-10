// landscape-shop/cliff/tools/devServer.mjs
// Attach to an already-running dev server on PORT, or spawn one and wait
// for it to report ready. Adapted from character-shop/chani/tools/
// devServer.mjs (never imported — shops don't share code, docs/
// gauntlet-loop.md) with this shop's own path and its own default port
// so multiple harnesses can run at once without colliding.

import { spawn } from 'node:child_process'

/** Returns { kill() } — kill() is a no-op if we attached to a server we
 *  did not start. Registers its own process.on('exit') so a thrown error
 *  still tears the spawned server down. */
export async function ensureDevServer(port) {
  const alive = await fetch(`http://127.0.0.1:${port}/`, { method: 'GET' })
    .then((r) => r.ok)
    .catch(() => false)

  if (alive) {
    console.log(`attaching to the dev server already on :${port}`)
    return { kill: () => {} }
  }

  // `detached` puts npx and the vite it execs into their own process
  // GROUP. Without it, SIGTERM to the npx wrapper leaves vite alive
  // holding --strictPort, so the NEXT capture attaches to a stale server
  // built from the previous source tree — a silent way to judge the
  // wrong geometry.
  const server = spawn('npx', ['vite', 'landscape-shop/cliff', '--port', String(port), '--strictPort'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  })
  const kill = () => {
    try {
      process.kill(-server.pid, 'SIGTERM')
    } catch {
      /* already gone */
    }
    // The piped stdio streams keep the event loop alive on their own,
    // which is the other half of why a capture script can hang forever.
    server.stdout.destroy()
    server.stderr.destroy()
    server.unref()
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
