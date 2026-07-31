// scripts/render-og.mjs
// Render website/og-image.html into a 1200x630 og.png for social previews.
//
// og-image.html is a static HTML/CSS mockup with its own header comment
// explaining the "why", but nothing ever rasterized it, so every og:image /
// twitter:image tag on the site pointed at a file that did not exist. This
// renders it headlessly at exactly the dimensions the meta tags declare
// (og:image:width / og:image:height = 1200x630), so what ships is provably
// that size rather than "close enough". The source page has no external
// fonts or scripts, so this runs fully offline.
//
// Usage: node scripts/render-og.mjs <output-path>
//   e.g. node scripts/render-og.mjs website/og.png
//        node scripts/render-og.mjs .pages-site/og.png   (used by deploy-pages.yml)

import { chromium } from '@playwright/test'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'
import { mkdir } from 'node:fs/promises'

const WIDTH = 1200
const HEIGHT = 630

const outputPath = process.argv[2]
if (!outputPath) {
  console.error('Usage: node scripts/render-og.mjs <output-path>')
  process.exit(1)
}

const here = path.dirname(fileURLToPath(import.meta.url))
const sourcePath = path.resolve(here, '..', 'website', 'og-image.html')
const sourceUrl = pathToFileURL(sourcePath).href

async function main() {
  const resolvedOut = path.resolve(outputPath)
  await mkdir(path.dirname(resolvedOut), { recursive: true })

  const browser = await chromium.launch()
  const page = await browser.newPage({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
  })

  await page.goto(sourceUrl, { waitUntil: 'load' })
  await page.screenshot({ path: resolvedOut, animations: 'disabled' })

  await browser.close()
  console.log(`Rendered ${sourceUrl} -> ${resolvedOut} (${WIDTH}x${HEIGHT})`)
}

main().catch(e => {
  console.error(e)
  process.exitCode = 1
})
