import { SKY_PHASES } from './constants'
import type { SkyPhase } from './constants'
import { hexToOklch, mixOklch, oklchToHex } from './color'
import type { DayTimes } from './weather'

export interface SkyColors {
  core: string
  mid: string
  edge: string
}

function lerpColor(a: string, b: string, t: number): string {
  return oklchToHex(mixOklch(hexToOklch(a), hexToOklch(b), t))
}

function lerp(phaseA: SkyPhase, phaseB: SkyPhase, t: number): SkyColors {
  return {
    core: lerpColor(phaseA.core, phaseB.core, t),
    mid: lerpColor(phaseA.mid, phaseB.mid, t),
    edge: lerpColor(phaseA.edge, phaseB.edge, t),
  }
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n))
}

export function getSkyColors(times: DayTimes, nowMinutes: number): SkyColors {
  const { dawn, sunrise, sunset, dusk } = times
  // Fixed warm window on each side of sunrise/sunset, independent of day length.
  const goldenHour = 90

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
