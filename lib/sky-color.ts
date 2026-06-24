import { SKY_PHASES } from './constants'
import type { DayTimes } from './weather'

export interface SkyColors {
  topColor: string
  bottomColor: string
}

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ]
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(c => Math.round(c).toString(16).padStart(2, '0')).join('')
}

function lerpColor(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a)
  const [br, bg, bb] = hexToRgb(b)
  return rgbToHex(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t)
}

function lerp(phaseA: { topColor: string; bottomColor: string }, phaseB: { topColor: string; bottomColor: string }, t: number): SkyColors {
  return {
    topColor: lerpColor(phaseA.topColor, phaseB.topColor, t),
    bottomColor: lerpColor(phaseA.bottomColor, phaseB.bottomColor, t),
  }
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n))
}

export function getSkyColors(times: DayTimes, nowMinutes: number): SkyColors {
  const { dawn, sunrise, sunset, dusk } = times
  const dayLength = sunset - sunrise
  const goldenHour = Math.min(dayLength * 0.08, 60)

  if (nowMinutes < dawn || nowMinutes >= dusk) {
    return SKY_PHASES.night
  }

  if (nowMinutes < sunrise) {
    const elapsed = nowMinutes - dawn
    const duration = sunrise - dawn
    const half = duration / 2
    if (elapsed < half) {
      return lerp(SKY_PHASES.night, SKY_PHASES.dawn, clamp01(elapsed / half))
    }
    return lerp(SKY_PHASES.dawn, SKY_PHASES.sunrise, clamp01((elapsed - half) / half))
  }

  if (nowMinutes < sunrise + goldenHour) {
    return lerp(SKY_PHASES.sunrise, SKY_PHASES.day, clamp01((nowMinutes - sunrise) / goldenHour))
  }

  if (nowMinutes < sunset - goldenHour) {
    return SKY_PHASES.day
  }

  if (nowMinutes < sunset) {
    return lerp(SKY_PHASES.day, SKY_PHASES.sunset, clamp01((nowMinutes - (sunset - goldenHour)) / goldenHour))
  }

  const elapsed = nowMinutes - sunset
  const duration = dusk - sunset
  const half = duration / 2
  if (elapsed < half) {
    return lerp(SKY_PHASES.sunset, SKY_PHASES.dusk, clamp01(elapsed / half))
  }
  return lerp(SKY_PHASES.dusk, SKY_PHASES.night, clamp01((elapsed - half) / half))
}
