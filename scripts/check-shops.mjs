#!/usr/bin/env node
// scripts/check-shops.mjs
// Type-checks every standalone shop under vehicle-shop/ and character-shop/
// — each shop has its own tsconfig.json (a separate program from the root
// src/ build), so the root `tsc -b` never sees these files and a shop-only
// break would otherwise slip past `npm run build`. Both roots are optional:
// a root that has not been scaffolded into yet (or at all) is tolerated,
// not an error.

import { readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const roots = ['vehicle-shop', 'character-shop']
const failures = []

for (const root of roots) {
  const shopsDir = path.resolve(root)
  let dirents
  try {
    dirents = await readdir(shopsDir, { withFileTypes: true })
  } catch {
    continue // root does not exist yet — tolerated
  }

  for (const dirent of dirents) {
    if (!dirent.isDirectory()) continue

    const shopPath = path.join(shopsDir, dirent.name)
    const tsconfigPath = path.join(shopPath, 'tsconfig.json')

    try {
      await stat(tsconfigPath)
    } catch {
      continue // no tsconfig.json — not a shop
    }

    const result = spawnSync('npx', ['tsc', '-p', shopPath, '--noEmit'], {
      stdio: 'inherit',
    })

    if (result.status !== 0) {
      failures.push(`${root}/${dirent.name}`)
    }
  }
}

if (failures.length > 0) {
  console.error(`Shop type-check failed: ${failures.join(', ')}`)
  process.exit(1)
}

console.log('All shops type-check clean.')
