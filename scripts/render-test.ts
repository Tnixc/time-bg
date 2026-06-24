// Visual preview harness — renders every phase, a day-long walk, an sRGB-vs-OKLCH
// comparison, and the SVG path to /tmp for eyeballing. Run with:
//   vp dlx esbuild scripts/render-test.ts --bundle --platform=node --format=esm \
//     --external:sharp --outfile=scripts/.render.mjs && node scripts/.render.mjs
import sharp from 'sharp'
import { SKY_PHASES } from '../lib/constants.ts'
import { generatePng, generateSvg } from '../lib/image.ts'
import { getSkyColors } from '../lib/sky-color.ts'
import type { SkyColors } from '../lib/sky-color.ts'

const W = 320
const H = 640

const times = { dawn: 5 * 60, sunrise: 6 * 60, sunset: 20 * 60, dusk: 21 * 60 }

const samples: { label: string; minutes: number }[] = [
  { label: 'night-3am', minutes: 3 * 60 },
  { label: 'dawn-5:30', minutes: 5 * 60 + 30 },
  { label: 'sunrise-6:10', minutes: 6 * 60 + 10 },
  { label: 'day-1pm', minutes: 13 * 60 },
  { label: 'sunset-7:50', minutes: 19 * 60 + 50 },
  { label: 'dusk-8:40', minutes: 20 * 60 + 40 },
]

// Naive sRGB radial for side-by-side comparison with the OKLCH path.
function srgbPng({ core, mid, edge }: SkyColors): Promise<Buffer> {
  const hex = (h: string) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))
  const [c, m, e] = [hex(core), hex(mid), hex(edge)]
  const cx = W / 2, cy = H, radius = H
  const px = Buffer.alloc(W * H * 3)
  let i = 0
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = (x - cx) * 0.45, dy = y - cy
      let t = Math.min(1, Math.hypot(dx, dy) / radius)
      const [a, b, u] = t < 0.5 ? [c, m, t / 0.5] : [m, e, (t - 0.5) / 0.5]
      px[i++] = a[0] + (b[0] - a[0]) * u
      px[i++] = a[1] + (b[1] - a[1]) * u
      px[i++] = a[2] + (b[2] - a[2]) * u
    }
  }
  return sharp(px, { raw: { width: W, height: H, channels: 3 } }).png().toBuffer()
}

async function row(tiles: Buffer[]) {
  return sharp({ create: { width: W * tiles.length, height: H, channels: 3, background: '#000' } })
    .composite(tiles.map((input, idx) => ({ input, left: idx * W, top: 0 })))
    .png()
    .toBuffer()
}

const phaseRow = await row(
  await Promise.all(Object.values(SKY_PHASES).map(p => generatePng(p, W, H))),
)
const timeRow = await row(
  await Promise.all(samples.map(s => {
    const c = getSkyColors(times, s.minutes)
    console.log(s.label.padEnd(14), JSON.stringify(c))
    return generatePng(c, W, H)
  })),
)
// comparison: sRGB vs OKLCH for the warm/cool sunset and the blue->yellow day
const cmpRow = await row([
  await srgbPng(SKY_PHASES.sunset),
  await generatePng(SKY_PHASES.sunset, W, H),
  await srgbPng(SKY_PHASES.day),
  await generatePng(SKY_PHASES.day, W, H),
])

// sunset time-lapse: minutes relative to sunset (20:00), to see the 90-min ramp
const sunsetOffsets = [-100, -75, -45, -15, 15, 45]
const rampRow = await row(
  await Promise.all(sunsetOffsets.map(off => {
    const c = getSkyColors(times, 20 * 60 + off)
    console.log(`sunset${off >= 0 ? '+' : ''}${off}`.padEnd(14), JSON.stringify(c))
    return generatePng(c, W, H)
  })),
)

const cols = 6
const out = sharp({ create: { width: W * cols, height: H * 4, channels: 3, background: '#000' } })
  .composite([
    { input: phaseRow, left: 0, top: 0 },
    { input: timeRow, left: 0, top: H },
    { input: cmpRow, left: 0, top: H * 2 },
    { input: rampRow, left: 0, top: H * 3 },
  ])
await out.png().toFile('/tmp/sky-preview.png')
console.log('wrote /tmp/sky-preview.png', W * cols, 'x', H * 4)
console.log('row1: phases  row2: day-walk  row3: [sunset sRGB | OKLCH | day sRGB | OKLCH]  row4: sunset ramp -100..+45min')

await sharp(await generatePng(getSkyColors(times, 19 * 60 + 50), 1920, 1080)).toFile('/tmp/sky-landscape.png')
console.log('wrote /tmp/sky-landscape.png 1920x1080')

// rasterise the SVG path to confirm the radial + feTurbulence grain are valid
const svg = generateSvg(SKY_PHASES.sunset, 600, 800)
await sharp(Buffer.from(svg)).png().toFile('/tmp/sky-svg.png')
console.log('wrote /tmp/sky-svg.png from SVG')
