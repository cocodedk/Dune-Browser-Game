#!/usr/bin/env node
// scripts/new-shop.mjs
// Scaffolds a new standalone vehicle-shop/<name>/ dev harness:
// `npm run shop:new -- <name>`. Generates the minimal public surface
// (model/, contracts.ts, spec.ts, provenance.ts) plus a passing seam test
// and a three.js dev harness, then registers the shop's npm scripts.
// Templates live in ./new-shop-templates.mjs (docs) and
// ./new-shop-templates-src.mjs (code) to keep every file under 200 lines.

import { existsSync, mkdirSync, writeFileSync, copyFileSync } from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { renderIndexHtml, renderReadme, renderProgress } from './new-shop-templates.mjs'
import {
  renderContracts, renderSpec, renderProvenance, renderSeamTest, renderMain, renderModel,
} from './new-shop-templates-src.mjs'

const NAME_PATTERN = /^[a-z][a-z0-9-]*$/

function toPascalCase(name) {
  return name.split('-').map((part) => part[0].toUpperCase() + part.slice(1)).join('')
}

function fail(message) {
  console.error(message)
  process.exit(1)
}

const name = process.argv[2]
if (!name) fail('Usage: npm run shop:new -- <name>')
if (!NAME_PATTERN.test(name)) fail(`Shop name "${name}" must match ${NAME_PATTERN}`)

const shopsDir = path.resolve('vehicle-shop')
const shopDir = path.join(shopsDir, name)
if (existsSync(shopDir)) fail(`vehicle-shop/${name} already exists`)

// Copied verbatim, never inlined as a template — this is the compiler
// contract every shop shares (no @shop alias inside a shop; see
// eslint.config.js's "shops are standalone" fence).
const harvesterTsconfig = path.join(shopsDir, 'harvester', 'tsconfig.json')
if (!existsSync(harvesterTsconfig)) {
  fail('vehicle-shop/harvester/tsconfig.json missing — cannot copy it verbatim')
}

const Name = toPascalCase(name)

mkdirSync(path.join(shopDir, 'src', 'model'), { recursive: true })

const files = {
  'index.html': renderIndexHtml(name, Name),
  'README.md': renderReadme(name, Name),
  'progress.md': renderProgress(name, Name),
  'src/main.ts': renderMain(name, Name),
  'src/contracts.ts': renderContracts(name, Name),
  'src/spec.ts': renderSpec(name, Name),
  'src/provenance.ts': renderProvenance(name, Name),
  'src/seam.test.ts': renderSeamTest(name, Name),
  [`src/model/${Name}.ts`]: renderModel(name, Name),
}

for (const [rel, content] of Object.entries(files)) {
  writeFileSync(path.join(shopDir, rel), content)
}
copyFileSync(harvesterTsconfig, path.join(shopDir, 'tsconfig.json'))

const scripts = {
  [`shop:${name}`]: `vite vehicle-shop/${name}`,
  [`shop:${name}:build`]: `vite build vehicle-shop/${name}`,
  [`shop:${name}:check`]: `tsc -p vehicle-shop/${name} --noEmit`,
}
const pkgSetArgs = ['pkg', 'set', ...Object.entries(scripts).map(([key, value]) => `scripts.${key}=${value}`)]
const result = spawnSync('npm', pkgSetArgs, { stdio: 'inherit' })
if (result.status !== 0) fail('npm pkg set failed')

console.log(`\nScaffolded vehicle-shop/${name}/`)
for (const rel of [...Object.keys(files), 'tsconfig.json']) {
  console.log(`  vehicle-shop/${name}/${rel}`)
}
console.log('\nRegistered scripts:')
for (const key of Object.keys(scripts)) console.log(`  ${key}`)
console.log(`\nNext: npm run shop:${name}`)
