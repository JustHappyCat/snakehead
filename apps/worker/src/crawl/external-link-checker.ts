import axios from 'axios'

export interface ExternalLinkResult {
  url: string
  statusCode: number
  ok: boolean
  error?: string
}

interface ExternalLinkCheckerOptions {
  maxLinks?: number
  concurrency?: number
  timeout?: number
}

const DEFAULT_MAX_LINKS = 1000
const DEFAULT_CONCURRENCY = 5
const DEFAULT_TIMEOUT = 10000

/**
 * Collects external link targets during a crawl and validates them
 * afterwards with HEAD requests (falling back to GET when HEAD is rejected).
 */
export class ExternalLinkChecker {
  private sourcesByTarget = new Map<string, Set<string>>()
  private maxLinks: number
  private concurrency: number
  private timeout: number

  constructor(options: ExternalLinkCheckerOptions = {}) {
    this.maxLinks = options.maxLinks ?? DEFAULT_MAX_LINKS
    this.concurrency = options.concurrency ?? DEFAULT_CONCURRENCY
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT
  }

  addLink(fromUrl: string, toUrl: string): void {
    if (!/^https?:\/\//i.test(toUrl)) {
      return
    }

    const existing = this.sourcesByTarget.get(toUrl)
    if (existing) {
      existing.add(fromUrl)
      return
    }

    if (this.sourcesByTarget.size >= this.maxLinks) {
      return
    }

    this.sourcesByTarget.set(toUrl, new Set([fromUrl]))
  }

  get uniqueTargetCount(): number {
    return this.sourcesByTarget.size
  }

  /**
   * Validate all collected targets. Returns broken targets grouped by
   * the source page that links to them.
   */
  async checkAll(): Promise<{
    brokenBySource: Map<string, ExternalLinkResult[]>
    checkedCount: number
    brokenCount: number
  }> {
    const targets = Array.from(this.sourcesByTarget.keys())
    const results = new Map<string, ExternalLinkResult>()

    let index = 0
    const workers = Array.from({ length: Math.min(this.concurrency, targets.length) }, async () => {
      while (index < targets.length) {
        const target = targets[index++]
        results.set(target, await this.checkUrl(target))
      }
    })
    await Promise.all(workers)

    const brokenBySource = new Map<string, ExternalLinkResult[]>()
    let brokenCount = 0

    for (const [target, sources] of this.sourcesByTarget) {
      const result = results.get(target)
      if (!result || result.ok) continue

      brokenCount++
      for (const source of sources) {
        const list = brokenBySource.get(source) || []
        list.push(result)
        brokenBySource.set(source, list)
      }
    }

    return { brokenBySource, checkedCount: targets.length, brokenCount }
  }

  private async checkUrl(url: string): Promise<ExternalLinkResult> {
    const headResult = await this.request(url, 'head')

    // Some servers reject HEAD; retry those with GET before flagging
    if (!headResult.ok && (headResult.statusCode === 405 || headResult.statusCode === 403 || headResult.statusCode === 501 || headResult.statusCode === 0)) {
      return this.request(url, 'get')
    }

    return headResult
  }

  private async request(url: string, method: 'head' | 'get'): Promise<ExternalLinkResult> {
    try {
      const response = await axios.request({
        url,
        method,
        timeout: this.timeout,
        maxRedirects: 5,
        validateStatus: () => true,
        // Avoid downloading large bodies during GET fallback
        maxContentLength: 1024 * 1024,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; snakehead/1.0)',
          'Accept': '*/*',
        },
      })

      return {
        url,
        statusCode: response.status,
        ok: response.status < 400,
      }
    } catch (error) {
      const err = error as { code?: string; message?: string }
      return {
        url,
        statusCode: 0,
        ok: false,
        error: err.code || err.message || 'Request failed',
      }
    }
  }
}
