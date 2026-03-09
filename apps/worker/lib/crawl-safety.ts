import { URL } from 'url'

export interface CrawlSafetyConfig {
  allowedDomains: string[]
  blockedDomains: string[]
  maxPages: number
  maxDepth: number
  maxTimeMs: number
  startTime: number
}

export class CrawlSafetyChecker {
  private config: CrawlSafetyConfig
  private crawledUrls: Set<string> = new Set()
  private urlCountsByDomain: Map<string, number> = new Map()

  constructor(config: CrawlSafetyConfig) {
    this.config = config
  }

  isUrlSafe(url: string, depth: number): {
    safe: boolean
    reason?: string
  } {
    const normalizedUrl = this.normalizeUrl(url)

    if (this.crawledUrls.has(normalizedUrl)) {
      return { safe: true }
    }

    if (!this.domainCheck(url)) {
      return { safe: false, reason: 'Domain not allowed' }
    }

    if (!this.pageCountCheck()) {
      return { safe: false, reason: 'Maximum page limit reached' }
    }

    if (!this.depthCheck(depth)) {
      return { safe: false, reason: 'Maximum depth exceeded' }
    }

    if (!this.timeCheck()) {
      return { safe: false, reason: 'Maximum crawl time exceeded' }
    }

    return { safe: true }
  }

  markUrlAsCrawled(url: string): void {
    const normalizedUrl = this.normalizeUrl(url)
    const domain = this.getDomain(url)

    this.crawledUrls.add(normalizedUrl)
    
    const currentCount = this.urlCountsByDomain.get(domain) || 0
    this.urlCountsByDomain.set(domain, currentCount + 1)
  }

  getUrlCount(): number {
    return this.crawledUrls.size
  }

  getDomainCount(domain: string): number {
    return this.urlCountsByDomain.get(domain) || 0
  }

  shouldContinue(): boolean {
    return (
      this.pageCountCheck() &&
      this.timeCheck()
    )
  }

  private domainCheck(url: string): boolean {
    const domain = this.getDomain(url)

    if (this.config.blockedDomains.includes(domain)) {
      return false
    }

    if (this.config.allowedDomains.length === 0) {
      return true
    }

    return this.config.allowedDomains.includes(domain)
  }

  private pageCountCheck(): boolean {
    return this.crawledUrls.size < this.config.maxPages
  }

  private depthCheck(depth: number): boolean {
    return depth <= this.config.maxDepth
  }

  private timeCheck(): boolean {
    const elapsed = Date.now() - this.config.startTime
    return elapsed < this.config.maxTimeMs
  }

  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url)
      parsed.hash = ''
      parsed.search = ''
      return parsed.href
    } catch {
      return url
    }
  }

  private getDomain(url: string): string {
    try {
      return new URL(url).hostname
    } catch {
      return ''
    }
  }

  getSafetyReport(): {
    urlsCrawled: number
    maxPages: number
    elapsedMs: number
    maxTimeMs: number
    canContinue: boolean
    domainCounts: Record<string, number>
  } {
    const elapsedMs = Date.now() - this.config.startTime
    
    return {
      urlsCrawled: this.crawledUrls.size,
      maxPages: this.config.maxPages,
      elapsedMs,
      maxTimeMs: this.config.maxTimeMs,
      canContinue: this.shouldContinue(),
      domainCounts: Object.fromEntries(this.urlCountsByDomain),
    }
  }
}
