// Perceptual colour mixing in OKLCH (Björn Ottosson's OKLab in polar form).
// Blending in OKLCH keeps lightness and chroma perceptually even across the
// warm/cool sunset transitions, instead of dipping through the muddy grey
// mid-tones that a naive sRGB lerp produces.

export type Oklab = [number, number, number] // L, a, b
export type Oklch = [number, number, number] // L, C, h (radians)

function srgbToLinear(c: number): number {
  c /= 255
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

function linearToSrgb(c: number): number {
  const v = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055
  return Math.round(Math.max(0, Math.min(1, v)) * 255)
}

export function hexToOklab(hex: string): Oklab {
  const r = srgbToLinear(parseInt(hex.slice(1, 3), 16))
  const g = srgbToLinear(parseInt(hex.slice(3, 5), 16))
  const b = srgbToLinear(parseInt(hex.slice(5, 7), 16))
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
  ]
}

export function oklabToRgb([L, a, b]: Oklab): [number, number, number] {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b
  const l = l_ * l_ * l_
  const m = m_ * m_ * m_
  const s = s_ * s_ * s_
  return [
    linearToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s),
  ]
}

export function oklabToOklch([L, a, b]: Oklab): Oklch {
  let h = Math.atan2(b, a)
  if (h < 0) h += 2 * Math.PI
  return [L, Math.hypot(a, b), h]
}

export function oklchToOklab([L, C, h]: Oklch): Oklab {
  return [L, C * Math.cos(h), C * Math.sin(h)]
}

export function hexToOklch(hex: string): Oklch {
  return oklabToOklch(hexToOklab(hex))
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('')
}

export function oklchToRgb(c: Oklch): [number, number, number] {
  return oklabToRgb(oklchToOklab(c))
}

export function oklchToHex(c: Oklch): string {
  return rgbToHex(oklchToRgb(c))
}

// Interpolate two OKLCH colours, taking the shortest path around the hue circle
// and carrying a defined hue when the other endpoint is (near-)achromatic.
export function mixOklch(a: Oklch, b: Oklch, t: number): Oklch {
  let [L1, C1, h1] = a
  let [L2, C2, h2] = b
  if (C1 < 1e-4) h1 = h2
  else if (C2 < 1e-4) h2 = h1
  let dh = h2 - h1
  if (dh > Math.PI) dh -= 2 * Math.PI
  else if (dh < -Math.PI) dh += 2 * Math.PI
  return [L1 + (L2 - L1) * t, C1 + (C2 - C1) * t, h1 + dh * t]
}
