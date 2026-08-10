// character-shop/stilgar/tools/devServer.mjs
// Attach to an already-running dev server on PORT, or spawn one and wait
// for it to report ready. Adapted from vehicle-shop/harvester/tools/
// devServer.mjs (read as reference, never imported — shops stay standalone)
// for this shop's own root and port: 5231, distinct from the ornithopter's
// 5219 and the harvester's 5220. NOTE (found 2026-08-05): a parallel
// character-shop builder (chani) independently chose 5230 for its own
// tools/, so 5230 is taken on this machine when multiple character loops
// run at once (gauntlet-loop.md sanctions up to three in parallel) — ports
// are a shared global resource with no cross-shop coordination mechanism;
// worth a lead-level convention (e.g. one port block per shop) if this
// keeps colliding.

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

  // detached so the spawn gets its own process group: `npx vite` is a
  // launcher with a real vite child under it, and SIGTERM to npx alone
  // leaves that child holding the port.
  const server = spawn('npx', ['vite', 'character-shop/stilgar', '--port', String(port), '--strictPort'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  })
  const kill = () => {
    try {
      process.kill(-server.pid, 'SIGTERM')
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
