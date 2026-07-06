import axios from 'axios'
import { PagePerformanceResult, PerformanceMetrics } from './performance-types'

/**
 * PageSpeed Insights client. One request per URL returns both Lighthouse lab
 * metrics and CrUX field data (real-user 28-day percentiles) when available.
 *
 * Provider selection:
 *  - PERFORMANCE_API_PROVIDER=mock forces mock data (development default when
 *    no PSI_API_KEY is configured).
 *  - Otherwise the live PSI API is used; PSI_API_KEY raises quota limits and
 *    is strongly recommended (free at https://developers.google.com/speed/docs/insights/v5/get-started).
 */

const PSI_ENDPOINT = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed'
const REQUEST_INTERVAL_MS = 1200

export type PsiProvider = 'psi' | 'mock'

export function getPsiProvider(): PsiProvider {
  const configured = process.env.PERFORMANCE_API_PROVIDER?.toLowerCase()
  if (configured === 'mock') return 'mock'
  if (configured === 'psi') return 'psi'
  return process.env.PSI_API_KEY ? 'psi' : 'mock'
}

export class PsiClient {
  private provider: PsiProvider
  private apiKey: string | undefined
  private lastRequestAt = 0

  constructor(provider?: PsiProvider) {
    this.provider = provider ?? getPsiProvider()
    this.apiKey = process.env.PSI_API_KEY
  }

  get providerName(): PsiProvider {
    return this.provider
  }

  async fetchMetrics(url: string): Promise<PagePerformanceResult> {
    if (this.provider === 'mock') {
      return this.mockMetrics(url)
    }

    await this.rateLimit()

    try {
      const response = await axios.get(PSI_ENDPOINT, {
        timeout: 90000,
        params: {
          url,
          strategy: 'mobile',
          category: 'performance',
          ...(this.apiKey ? { key: this.apiKey } : {}),
        },
      })

      return {
        url,
        lab: this.parseLab(response.data),
        field: this.parseField(response.data),
      }
    } catch (error) {
      const err = error as { response?: { status?: number }; message?: string }
      return {
        url,
        error: err.response?.status
          ? `PSI API returned ${err.response.status}`
          : err.message || 'PSI request failed',
      }
    }
  }

  private parseLab(data: any): PerformanceMetrics | undefined {
    const lighthouse = data?.lighthouseResult
    if (!lighthouse) return undefined

    const audits = lighthouse.audits || {}
    const numeric = (id: string): number | undefined => {
      const value = audits[id]?.numericValue
      return typeof value === 'number' ? value : undefined
    }
    const round = (value: number | undefined) =>
      value === undefined ? undefined : Math.round(value)

    const score = lighthouse.categories?.performance?.score

    return {
      source: 'PSI_LAB',
      performanceScore: typeof score === 'number' ? Math.round(score * 100) : undefined,
      lcpMs: round(numeric('largest-contentful-paint')),
      cls: numeric('cumulative-layout-shift'),
      tbtMs: round(numeric('total-blocking-time')),
      fcpMs: round(numeric('first-contentful-paint')),
      speedIndexMs: round(numeric('speed-index')),
      ttfbMs: round(numeric('server-response-time')),
    }
  }

  private parseField(data: any): PerformanceMetrics | undefined {
    const experience = data?.loadingExperience
    const metrics = experience?.metrics
    if (!metrics || Object.keys(metrics).length === 0) return undefined

    const percentile = (id: string): number | undefined => {
      const value = metrics[id]?.percentile
      return typeof value === 'number' ? value : undefined
    }

    const clsRaw = percentile('CUMULATIVE_LAYOUT_SHIFT_SCORE')

    return {
      source: 'CRUX_FIELD',
      lcpMs: percentile('LARGEST_CONTENTFUL_PAINT_MS'),
      // CrUX reports CLS multiplied by 100 as an integer percentile
      cls: clsRaw === undefined ? undefined : clsRaw / 100,
      inpMs: percentile('INTERACTION_TO_NEXT_PAINT'),
      fcpMs: percentile('FIRST_CONTENTFUL_PAINT_MS'),
      ttfbMs: percentile('EXPERIMENTAL_TIME_TO_FIRST_BYTE'),
      originFallback: Boolean(experience?.origin_fallback),
    }
  }

  /**
   * Deterministic pseudo-random metrics keyed on the URL so development
   * dashboards stay stable across runs without hitting the live API.
   */
  private mockMetrics(url: string): PagePerformanceResult {
    let seed = 0
    for (let i = 0; i < url.length; i++) {
      seed = (seed * 31 + url.charCodeAt(i)) >>> 0
    }
    const rand = (min: number, max: number) => {
      seed = (seed * 1664525 + 1013904223) >>> 0
      return min + (seed / 0xffffffff) * (max - min)
    }

    const lcp = Math.round(rand(1200, 5200))
    const cls = Math.round(rand(0, 0.4) * 1000) / 1000
    const tbt = Math.round(rand(50, 900))
    const score = Math.max(5, Math.min(99, Math.round(100 - lcp / 60 - tbt / 25 - cls * 80)))

    return {
      url,
      lab: {
        source: 'PSI_LAB',
        performanceScore: score,
        lcpMs: lcp,
        cls,
        tbtMs: tbt,
        fcpMs: Math.round(lcp * rand(0.4, 0.7)),
        speedIndexMs: Math.round(lcp * rand(0.9, 1.4)),
        ttfbMs: Math.round(rand(100, 900)),
      },
      field: {
        source: 'CRUX_FIELD',
        lcpMs: Math.round(lcp * rand(0.8, 1.2)),
        cls: Math.round(cls * rand(0.7, 1.3) * 1000) / 1000,
        inpMs: Math.round(rand(80, 650)),
        fcpMs: Math.round(lcp * rand(0.4, 0.7)),
        ttfbMs: Math.round(rand(100, 900)),
        originFallback: false,
      },
    }
  }

  private async rateLimit(): Promise<void> {
    const elapsed = Date.now() - this.lastRequestAt
    if (elapsed < REQUEST_INTERVAL_MS) {
      await new Promise((resolve) => setTimeout(resolve, REQUEST_INTERVAL_MS - elapsed))
    }
    this.lastRequestAt = Date.now()
  }
}
