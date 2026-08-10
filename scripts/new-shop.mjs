#!/usr/bin/env node
// scripts/new-shop.mjs
// Scaffolds a new standalone shop dev harness: `npm run shop:new -- <name>`
// under vehicle-shop/ (default), `npm run cast:new -- <name>` under
// character-shop/ (--root character-shop), or `npm run land:new -- <name>`
// under landscape-shop/ (--root landscape-shop). Generates the minimal
// public surface (model/, contracts.ts, spec.ts, provenance.ts) plus a
// passing seam test and a three.js dev harness, then registers the shop's
// npm scripts. Doc templates live in ./new-shop-templates.mjs (shared,
// kind-aware); vehicle code templates in ./new-shop-templates-src.mjs;
// character (HUMANOID) code templates in ./new-shop-templates-cast.mjs and
// ./new-shop-templates-cast-model.mjs; landscape (STATIC SCENERY) code
// templates in ./new-shop-templates-land.mjs and
// ./new-shop-templates-land-model.mjs — split so every file stays under
// the 200-line cap.

import { existsSync, mkdirSync, writeFileSync, copyFileSync } from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { renderIndexHtml, renderReadme, renderProgress } from './new-shop-templates.mjs'
import {
  renderContracts, renderSpec, renderProvenance, renderSeamTest, renderMain, renderModel,
} from './new-shop-templates-src.mjs'
import {
  renderCastContracts, renderCastSpec, renderCastProvenance, renderCastMain,
} from './new-shop-templates-cast.mjs'
import { renderCastModel, renderCastSeamTest } from './new-shop-templates-cast-model.mjs'
import {
  renderLandContracts, renderLandSpec, renderLandProvenance, renderLandMain,
} from './new-shop-templates-land.mjs'
import { renderLandModel, renderLandSeamTest } from './new-shop-templates-land-model.mjs'

const NAME_PATTERN = /^[a-z][a-z0-9-]*$/
// Each root's identity: the npm script prefix, its @alias, and the label
// used in generated docs. Adding a fourth root means adding one entry here.
const ROOTS = {
  'vehicle-shop': { scriptPrefix: 'shop', alias: '@shop', kindLabel: 'vehicle' },
  'character-shop': { scriptPrefix: 'cast', alias: '@cast', kindLabel: 'character' },
  'landscape-shop': { scriptPrefix: 'land', alias: '@land', kindLabel: 'landscape' },
}

function toPascalCase(name) {
  return name.split('-').map((part) => part[0].toUpperCase() + part.slice(1)).join('')
}

function fail(message) {
  console.error(message)
  process.exit(1)
}

function parseArgs(argv) {
  let root = 'vehicle-shop'
  let name
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--root') {
      root = argv[++i]
    } else if (name === undefined) {
      name = argv[i]
    }
  }
  return { name, root }
}

const { name, root } = parseArgs(process.argv.slice(2))
if (!name) fail('Usage: npm run shop:new -- <name>  (or: npm run cast:new -- <name>, npm run land:new -- <name>)')
if (!NAME_PATTERN.test(name)) fail(`Shop name "${name}" must match ${NAME_PATTERN}`)
if (!ROOTS[root]) fail(`--root must be one of: ${Object.keys(ROOTS).join(', ')}`)

const { scriptPrefix, alias, kindLabel } = ROOTS[root]
const shopDir = path.join(path.resolve(root), name)
if (existsSync(shopDir)) fail(`${root}/${name} already exists`)

// Copied verbatim, never inlined as a template — this is the compiler
// contract every shop shares regardless of root (no @shop/@cast alias
// inside a shop; see eslint.config.js's "shops are standalone" fences).
const sharedTsconfig = path.join('vehicle-shop', 'harvester', 'tsconfig.json')
if (!existsSync(sharedTsconfig)) {
  fail('vehicle-shop/harvester/tsconfig.json missing — cannot copy it verbatim')
}

const Name = toPascalCase(name)
const ctx = { name, Name, root, scriptPrefix, alias, kindLabel }

mkdirSync(path.join(shopDir, 'src', 'model'), { recursive: true })

const docs = {
  'index.html': renderIndexHtml(ctx),
  'README.md': renderReadme(ctx),
  'progress.md': renderProgress(ctx),
}
const code = kindLabel === 'character'
  ? {
      'src/main.ts': renderCastMain(name, Name),
      'src/contracts.ts': renderCastContracts(name),
      'src/spec.ts': renderCastSpec(name, Name),
      'src/provenance.ts': renderCastProvenance(name, Name),
      'src/seam.test.ts': renderCastSeamTest(name, Name),
      [`src/model/${Name}.ts`]: renderCastModel(name, Name),
    }
  : kindLabel === 'landscape'
  ? {
      'src/main.ts': renderLandMain(name, Name),
      'src/contracts.ts': renderLandContracts(name),
      'src/spec.ts': renderLandSpec(name),
      'src/provenance.ts': renderLandProvenance(name),
      'src/seam.test.ts': renderLandSeamTest(name, Name),
      [`src/model/${Name}.ts`]: renderLandModel(name, Name),
    }
  : {
      'src/main.ts': renderMain(name, Name),
      'src/contracts.ts': renderContracts(name, Name),
      'src/spec.ts': renderSpec(name, Name),
      'src/provenance.ts': renderProvenance(name, Name),
      'src/seam.test.ts': renderSeamTest(name, Name),
      [`src/model/${Name}.ts`]: renderModel(name, Name),
    }
const files = { ...docs, ...code }

for (const [rel, content] of Object.entries(files)) {
  writeFileSync(path.join(shopDir, rel), content)
}
copyFileSync(sharedTsconfig, path.join(shopDir, 'tsconfig.json'))

const scripts = {
  [`${scriptPrefix}:${name}`]: `vite ${root}/${name}`,
  [`${scriptPrefix}:${name}:build`]: `vite build ${root}/${name}`,
  [`${scriptPrefix}:${name}:check`]: `tsc -p ${root}/${name} --noEmit`,
}
const pkgSetArgs = ['pkg', 'set', ...Object.entries(scripts).map(([key, value]) => `scripts.${key}=${value}`)]
const result = spawnSync('npm', pkgSetArgs, { stdio: 'inherit' })
if (result.status !== 0) fail('npm pkg set failed')

console.log(`\nScaffolded ${root}/${name}/`)
for (const rel of [...Object.keys(files), 'tsconfig.json']) {
  console.log(`  ${root}/${name}/${rel}`)
}
console.log('\nRegistered scripts:')
for (const key of Object.keys(scripts)) console.log(`  ${key}`)
console.log(`\nNext: npm run ${scriptPrefix}:${name}`)
