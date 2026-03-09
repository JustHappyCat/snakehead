import { normalizeUrl, getDomain, shouldCrawlUrl, CrawlSettings } from '@seo-spider/shared'

export interface URLFrontierItem {
  url: string
  depth: number
  discoveredAt: Date
}

export class URLFrontier {
  private queue: URLFrontierItem[] = []
  private visited: Set<string> = new Set()
  private baseDomain: string
  private settings: CrawlSettings
  private discoveredUrls: Set<string> = new Set()

  constructor(startUrl: string, settings: CrawlSettings) {
    this.baseDomain = getDomain(startUrl)
    this.settings = settings
    this.add(startUrl, 0)
  }

  add(url: string, depth: number): boolean {
    const normalizedUrl = normalizeUrl(url)
    
    if (this.visited.has(normalizedUrl)) {
      return false
    }

    if (depth > this.settings.maxDepth) {
      return false
    }

    if (this.visited.size >= this.settings.maxPages) {
      return false
    }

    if (!shouldCrawlUrl(normalizedUrl, this.settings.excludeExtensions)) {
      return false
    }

    if (this.settings.allowlist.length > 0) {
      const matchesAllowlist = this.settings.allowlist.some(pattern => 
        normalizedUrl.includes(pattern)
      )
      if (!matchesAllowlist) {
        return false
      }
    }

    if (this.settings.denylist.length > 0) {
      const matchesDenylist = this.settings.denylist.some(pattern => 
        normalizedUrl.includes(pattern)
      )
      if (matchesDenylist) {
        return false
      }
    }

    this.queue.push({
      url: normalizedUrl,
      depth,
      discoveredAt: new Date(),
    })

    this.visited.add(normalizedUrl)
    return true
  }

  next(): URLFrontierItem | null {
    return this.queue.shift() || null
  }

  hasNext(): boolean {
    return this.queue.length > 0
  }

  size(): number {
    return this.queue.length
  }

  visitedCount(): number {
    return this.visited.size
  }

  isVisited(url: string): boolean {
    return this.visited.has(normalizeUrl(url))
  }

  isDomainInternal(url: string): boolean {
    return getDomain(url) === this.baseDomain
  }

  getStats() {
    return {
      queueSize: this.queue.length,
      visitedCount: this.visited.size,
      maxPages: this.settings.maxPages,
      maxDepth: this.settings.maxDepth,
    }
  }
}
