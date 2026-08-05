import { readdir, stat } from 'node:fs/promises'
import path from 'node:path'

const assetsDir = path.resolve('dist/assets')
// First matching pattern wins, so keep the catch-all last.
const budgets = [
  { pattern: /^three-core-.*\.js$/, maxBytes: 700_000 },
  { pattern: /^three-addons-.*\.js$/, maxBytes: 200_000 },
  { pattern: /^react-vendor-.*\.js$/, maxBytes: 250_000 },
  { pattern: /^game-.*\.js$/, maxBytes: 200_000 },
  { pattern: /^vehicle-.*\.js$/, maxBytes: 150_000 },
  { pattern: /^character-.*\.js$/, maxBytes: 150_000 },
  { pattern: /\.js$/, maxBytes: 500_000 },
]

function formatKiB(bytes) {
  return `${(bytes / 1024).toFixed(1)} KiB`
}

const files = await readdir(assetsDir)
const failures = []

for (const file of files) {
  const budget = budgets.find(entry => entry.pattern.test(file))
  if (!budget) continue

  const filePath = path.join(assetsDir, file)
  const { size } = await stat(filePath)

  if (size > budget.maxBytes) {
    failures.push(
      `${file}: ${formatKiB(size)} exceeds budget ${formatKiB(budget.maxBytes)}`
    )
  }
}

if (failures.length > 0) {
  console.error('Bundle size budget exceeded:')
  for (const failure of failures) {
    console.error(`- ${failure}`)
  }
  process.exit(1)
}

console.log('Bundle size budgets passed.')
