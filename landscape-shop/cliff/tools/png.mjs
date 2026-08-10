// landscape-shop/cliff/tools/png.mjs
// A minimal PNG reader, so the round's claims about the RENDERED image are
// measurements rather than impressions. Playwright writes 8-bit non-
// interlaced RGBA, which is the only shape this needs to read; anything else
// throws rather than returning quietly wrong numbers.
//
// No dependency is added for this: node's own zlib does the inflate.

import { readFileSync } from 'node:fs'
import { inflateSync } from 'node:zlib'

const SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10]

function paeth(a, b, c) {
  const p = a + b - c
  const pa = Math.abs(p - a)
  const pb = Math.abs(p - b)
  const pc = Math.abs(p - c)
  if (pa <= pb && pa <= pc) return a
  return pb <= pc ? b : c
}

function unfilter(raw, width, height, bpp) {
  const stride = width * bpp
  const out = Buffer.alloc(stride * height)
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]
    const from = y * (stride + 1) + 1
    const to = y * stride
    const up = to - stride
    for (let i = 0; i < stride; i++) {
      const x = raw[from + i]
      const left = i >= bpp ? out[to + i - bpp] : 0
      const above = y > 0 ? out[up + i] : 0
      const corner = y > 0 && i >= bpp ? out[up + i - bpp] : 0
      let value = x
      if (filter === 1) value = x + left
      else if (filter === 2) value = x + above
      else if (filter === 3) value = x + ((left + above) >> 1)
      else if (filter === 4) value = x + paeth(left, above, corner)
      else if (filter !== 0) throw new Error(`png: unsupported row filter ${filter}`)
      out[to + i] = value & 0xff
    }
  }
  return out
}

/** { width, height, channels, data } — data is row-major, 8 bits a channel. */
export function readPng(file) {
  const buffer = readFileSync(file)
  for (let i = 0; i < SIGNATURE.length; i++) {
    if (buffer[i] !== SIGNATURE[i]) throw new Error(`png: ${file} is not a PNG`)
  }
  let at = 8
  let header = null
  const parts = []
  while (at < buffer.length) {
    const length = buffer.readUInt32BE(at)
    const type = buffer.toString('ascii', at + 4, at + 8)
    const body = buffer.subarray(at + 8, at + 8 + length)
    if (type === 'IHDR') {
      header = {
        width: body.readUInt32BE(0),
        height: body.readUInt32BE(4),
        depth: body[8],
        colorType: body[9],
        interlace: body[12],
      }
    } else if (type === 'IDAT') parts.push(Buffer.from(body))
    else if (type === 'IEND') break
    at += 12 + length
  }
  if (!header) throw new Error('png: no IHDR')
  if (header.depth !== 8 || header.interlace !== 0) throw new Error('png: need 8-bit, non-interlaced')
  const channels = header.colorType === 6 ? 4 : header.colorType === 2 ? 3 : 0
  if (!channels) throw new Error(`png: unsupported colour type ${header.colorType}`)
  const data = unfilter(inflateSync(Buffer.concat(parts)), header.width, header.height, channels)
  return { width: header.width, height: header.height, channels, data }
}

/** Displayed relative luminance, 0-255, at one pixel. */
export function luminanceAt(image, x, y) {
  const at = (y * image.width + x) * image.channels
  return 0.2126 * image.data[at] + 0.7152 * image.data[at + 1] + 0.0722 * image.data[at + 2]
}

export function rgbAt(image, x, y) {
  const at = (y * image.width + x) * image.channels
  return [image.data[at], image.data[at + 1], image.data[at + 2]]
}
