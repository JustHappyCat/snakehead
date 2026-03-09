export class OrphanDetector {
  private crawledUrls: Set<string> = new Set()
  private linkTargets: Map<string, number> = new Map()

  constructor() {}

  addCrawledUrl(url: string): void {
    this.crawledUrls.add(url)
  }

  addLink(fromUrl: string, toUrl: string): void {
    const currentCount = this.linkTargets.get(toUrl) || 0
    this.linkTargets.set(toUrl, currentCount + 1)
  }

  findOrphans(): string[] {
    const orphans: string[] = []

    for (const crawledUrl of this.crawledUrls) {
      if (!this.linkTargets.has(crawledUrl)) {
        orphans.push(crawledUrl)
      }
    }

    return orphans
  }

  getLinkCount(url: string): number {
    return this.linkTargets.get(url) || 0
  }

  getStats() {
    const orphans = this.findOrphans()
    const totalPages = this.crawledUrls.size
    const orphanCount = orphans.length
    const orphanPercentage = totalPages > 0 ? (orphanCount / totalPages) * 100 : 0

    return {
      totalPages,
      orphanCount,
      orphanPercentage,
      orphans,
    }
  }
}
