import type { SkyColors } from './sky-color.js'
import { makeRamp } from './color.js'

// The glow radiates from a point centred on the bottom edge (the horizon).
// Horizontal distance is compressed so the gradient stays vertical-dominant —
// a tall sunset arc rather than a perfect circle — on wide canvases.
const HORIZ_FACTOR = 0.45
// Peak-to-peak amplitude of the luminance grain.
const GRAIN = 20
// Resolution of the precomputed colour ramp.
const LUT_STEPS = 1024

export function generateSvg({ core, mid, edge }: SkyColors, width = 1920, height = 1080): string {
  const ramp = makeRamp(core, mid, edge)
  // Bake intermediate stops so the SVG gradient follows the OKLab path too,
  // rather than letting the renderer lerp in sRGB.
  const stops = Array.from({ length: 9 }, (_, k) => {
    const t = k / 8
    return `<stop offset="${(t * 100).toFixed(1)}%" stop-color="${ramp.hexAt(t)}"/>`
  }).join('\n      ')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <radialGradient id="sky" cx="50%" cy="100%" r="115%">
      ${stops}
    </radialGradient>
    <filter id="grain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.7 0"/>
    </filter>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#sky)"/>
  <rect width="${width}" height="${height}" filter="url(#grain)" opacity="0.07"/>
</svg>`
}

export async function generatePng({ core, mid, edge }: SkyColors, width = 1920, height = 1080): Promise<Buffer> {
  const ramp = makeRamp(core, mid, edge)

  // Precompute the colour ramp once (perceptual conversion is the costly part);
  // the per-pixel loop is then just a table lookup plus grain.
  const lut = new Uint8Array((LUT_STEPS + 1) * 3)
  for (let k = 0; k <= LUT_STEPS; k++) {
    const [r, g, b] = ramp.rgbAt(k / LUT_STEPS)
    lut[k * 3] = r
    lut[k * 3 + 1] = g
    lut[k * 3 + 2] = b
  }

  const cx = width / 2
  const cy = height // horizon sits on the bottom edge
  const radius = height

  const pixels = Buffer.alloc(width * height * 3)
  let i = 0
  for (let y = 0; y < height; y++) {
    const dy = y - cy
    const dy2 = dy * dy
    for (let x = 0; x < width; x++) {
      const dx = (x - cx) * HORIZ_FACTOR
      let t = Math.sqrt(dx * dx + dy2) / radius
      if (t > 1) t = 1
      const idx = ((t * LUT_STEPS + 0.5) | 0) * 3

      const n = (Math.random() - 0.5) * GRAIN
      pixels[i++] = clamp255(lut[idx] + n)
      pixels[i++] = clamp255(lut[idx + 1] + n)
      pixels[i++] = clamp255(lut[idx + 2] + n)
    }
  }

  const sharp = await import('sharp').then(m => m.default)
  return sharp(pixels, { raw: { width, height, channels: 3 } }).png().toBuffer()
}

function clamp255(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v
}
