export type PerformanceSource = 'PSI_LAB' | 'CRUX_FIELD' | 'LIGHTHOUSE_LOCAL'

export interface PerformanceMetrics {
  source: PerformanceSource
  /** Lighthouse performance score, 0-100. Absent for field data. */
  performanceScore?: number
  lcpMs?: number
  cls?: number
  /** Interaction to Next Paint — field data only. */
  inpMs?: number
  tbtMs?: number
  fcpMs?: number
  speedIndexMs?: number
  ttfbMs?: number
  /** True when CrUX had no URL-level data and origin-level data was used. */
  originFallback?: boolean
}

export interface PagePerformanceResult {
  url: string
  lab?: PerformanceMetrics
  field?: PerformanceMetrics
  error?: string
}
