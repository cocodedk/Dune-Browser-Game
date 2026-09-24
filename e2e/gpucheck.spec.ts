import { test } from '@playwright/test'
test('gpu backend diagnostic', async ({ page }) => {
  await page.goto('about:blank')
  const info = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl')
    if (!gl) return 'NO_WEBGL_CONTEXT'
    const ext = gl.getExtension('WEBGL_debug_renderer_info')
    const renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)
    const vendor = ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR)
    return `vendor=${vendor} renderer=${renderer}`
  })
  console.log('GPU_BACKEND=' + info)
})
