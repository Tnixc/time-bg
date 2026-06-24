import type { SkyColors } from './sky-color'

export function generateSvg({ topColor, bottomColor }: SkyColors, width = 1920, height = 1080): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <defs>
    <linearGradient id="sky" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${topColor}"/>
      <stop offset="100%" stop-color="${bottomColor}"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#sky)"/>
</svg>`
}

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ]
}

export async function generatePng({ topColor, bottomColor }: SkyColors, width = 1920, height = 1080): Promise<Buffer> {
  const [tr, tg, tb] = hexToRgb(topColor)
  const [br, bg, bb] = hexToRgb(bottomColor)

  const pixels = Buffer.alloc(height * 3)
  for (let y = 0; y < height; y++) {
    const t = y / height
    pixels[y * 3]     = Math.round(tr + (br - tr) * t)
    pixels[y * 3 + 1] = Math.round(tg + (bg - tg) * t)
    pixels[y * 3 + 2] = Math.round(tb + (bb - tb) * t)
  }

  const sharp = await import('sharp').then(m => m.default)
  return sharp(pixels, { raw: { width: 1, height, channels: 3 } })
    .resize(width, height, { kernel: 'nearest' })
    .png()
    .toBuffer()
}
