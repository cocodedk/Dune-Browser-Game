#!/usr/bin/env node
// scripts/check-shops.mjs
// Type-checks every standalone shop under vehicle-shop/ — each shop has its
// own tsconfig.json (a separate program from the root src/ build), so the
// root `tsc -b` never sees these files and a shop-only break would otherwise
// slip past `npm run build`.

import { readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const shopsDir = path.resolve('vehicle-shop')
const dirents = await readdir(shopsDir, { withFileTypes: true })
const failures = []

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
    failures.push(dirent.name)
  }
}

if (failures.length > 0) {
  console.error(`Shop type-check failed: ${failures.join(', ')}`)
  process.exit(1)
}

console.log('All shops type-check clean.')
