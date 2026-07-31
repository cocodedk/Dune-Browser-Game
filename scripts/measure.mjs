// measure.mjs — objective statistics over a region of a captured frame.
//
// Decodes PNGs in headless Chromium (no native image libs in this tree) and
// reports the numbers that decide whether terrain "reads": mean luma, the
// fraction sitting in near-black, and local contrast at two scales.
//
// Usage: node measure.mjs <x> <y> <w> <h> [--floor N] <file.png> [more.png ...]
//
// --floor sets the luma below which a pixel counts as empty space and is
// excluded from every statistic. Default 12, which drops the starfield on a
// globe frame. Pass --floor 0 to measure ground that has genuinely gone black,
// where the default would report a coverage of zero and no mean at all.

import { chromium } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'

const argv = process.argv.slice(2)
const fi = argv.indexOf('--floor')
const FLOOR = fi >= 0 ? Number(argv[fi + 1]) : 12
const rest = fi >= 0 ? argv.filter((_, i) => i !== fi && i !== fi + 1) : argv
const [x, y, w, h, ...files] = rest
const RECT = { x: +x, y: +y, w: +w, h: +h }

const browser = await chromium.launch()
const page = await browser.newPage()

const stats = async (dataUrl, rect, floor) =>
  page.evaluate(
    async ([url, r, floor]) => {
      const img = new Image()
      img.src = url
      await img.decode()
      const c = document.createElement('canvas')
      c.width = r.w
      c.height = r.h
      const ctx = c.getContext('2d', { willReadFrequently: true })
      ctx.drawImage(img, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h)
      const d = ctx.getImageData(0, 0, r.w, r.h).data

      const luma = new Float64Array(r.w * r.h)
      for (let i = 0; i < r.w * r.h; i++) {
        luma[i] = 0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]
      }

      // Mean over pixels above a floor: on a globe frame most of the rect is
      // empty space, which would drag every statistic toward zero.
      let sum = 0, n = 0, dark = 0, max = 0
      let rSum = 0, gSum = 0, bSum = 0
      for (let i = 0; i < luma.length; i++) {
        if (luma[i] <= floor) continue // space / letterbox
        sum += luma[i]; n++
        if (luma[i] < 40) dark++
        if (luma[i] > max) max = luma[i]
        rSum += d[i * 4]; gSum += d[i * 4 + 1]; bSum += d[i * 4 + 2]
      }

      // Local contrast at two scales: BLOCK-scale catches large landforms,
      // FINE-scale catches grain. Block means are robust to per-pixel noise.
      const blockContrast = size => {
        const bw = Math.floor(r.w / size), bh = Math.floor(r.h / size)
        const m = new Float64Array(bw * bh)
        const cnt = new Float64Array(bw * bh)
        for (let py = 0; py < bh * size; py++) {
          for (let px = 0; px < bw * size; px++) {
            const li = py * r.w + px
            if (luma[li] <= floor) continue
            const bi = Math.floor(py / size) * bw + Math.floor(px / size)
            m[bi] += luma[li]; cnt[bi]++
          }
        }
        for (let i = 0; i < m.length; i++) m[i] = cnt[i] > 0 ? m[i] / cnt[i] : -1
        let acc = 0, k = 0
        for (let by = 0; by < bh; by++) {
          for (let bx = 0; bx < bw - 1; bx++) {
            const a = m[by * bw + bx], b = m[by * bw + bx + 1]
            if (a < 0 || b < 0) continue
            acc += Math.abs(a - b); k++
          }
        }
        for (let by = 0; by < bh - 1; by++) {
          for (let bx = 0; bx < bw; bx++) {
            const a = m[by * bw + bx], b = m[(by + 1) * bw + bx]
            if (a < 0 || b < 0) continue
            acc += Math.abs(a - b); k++
          }
        }
        return k > 0 ? acc / k : 0
      }

      return {
        covered: n,
        coverage: n / (r.w * r.h),
        mean: n ? sum / n : 0,
        max,
        darkPct: n ? (dark / n) * 100 : 0,
        rgb: n ? [rSum / n, gSum / n, bSum / n] : [0, 0, 0],
        block2: blockContrast(2),
        block6: blockContrast(6),
        block24: blockContrast(24),
      }
    },
    [dataUrl, rect, floor],
  )

console.log(
  `${'frame'.padEnd(26)} ${'cover'.padStart(6)} ${'mean'.padStart(7)} ${'max'.padStart(5)} ` +
  `${'dark%'.padStart(6)} ${'blk2'.padStart(6)} ${'blk6'.padStart(6)} ${'blk24'.padStart(6)}  rgb`,
)
for (const f of files) {
  const b64 = (await readFile(f)).toString('base64')
  const s = await stats(`data:image/png;base64,${b64}`, RECT, FLOOR)
  console.log(
    `${basename(f).padEnd(26)} ${(s.coverage * 100).toFixed(1).padStart(5)}% ` +
    `${s.mean.toFixed(1).padStart(7)} ${s.max.toFixed(0).padStart(5)} ` +
    `${s.darkPct.toFixed(1).padStart(6)} ${s.block2.toFixed(2).padStart(6)} ` +
    `${s.block6.toFixed(2).padStart(6)} ` +
    `${s.block24.toFixed(2).padStart(6)}  ` +
    `${s.rgb.map(v => v.toFixed(0).padStart(3)).join(',')}`,
  )
}

await browser.close()
