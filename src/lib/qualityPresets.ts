export const QUALITY_PRESETS = {
  low: 0.4,
  medium: 0.65,
  high: 0.85,
} as const

export type QualityPreset = keyof typeof QUALITY_PRESETS
