export interface SkyPhase {
  topColor: string
  bottomColor: string
}

export const SKY_PHASES = {
  night:    { topColor: '#0b0b2e', bottomColor: '#1a1a3e' },
  dawn:     { topColor: '#2d1b4e', bottomColor: '#ff7e5f' },
  sunrise:  { topColor: '#ff7e5f', bottomColor: '#feb47b' },
  day:      { topColor: '#3b82f6', bottomColor: '#93c5fd' },
  sunset:   { topColor: '#dc2626', bottomColor: '#f97316' },
  dusk:     { topColor: '#7c2d5a', bottomColor: '#2d1b4e' },
} as const satisfies Record<string, SkyPhase>
