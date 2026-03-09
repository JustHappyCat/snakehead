import axios from 'axios'

interface RobotRule {
  userAgent: string
  allow: string[]
  disallow: string[]
  crawlDelay?: number
  sitemap?: string
}

export class RobotsParser {
  private baseUrl: string
  private rules: RobotRule[] = []
  private fetched: boolean = false

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  async fetch(): Promise<void> {
    try {
      const robotsUrl = new URL('/robots.txt', this.baseUrl).href
      const response = await axios.get(robotsUrl, {
        timeout: 5000,
        headers: {
          'User-Agent': 'snakehead-bot/1.0',
        },
      })

      this.parse(response.data)
      this.fetched = true
    } catch (error) {
      this.rules = []
      this.fetched = true
    }
  }

  parse(content: string): void {
    const lines = content.split('\n')
    let currentRule: RobotRule | null = null

    for (const line of lines) {
      const trimmed = line.trim()
      
      if (trimmed.startsWith('#') || trimmed === '') {
        continue
      }

      const [directive, ...valueParts] = trimmed.split(':')
      const value = valueParts.join(':').trim()

      switch (directive.toLowerCase()) {
        case 'user-agent':
          if (currentRule) {
            this.rules.push(currentRule)
          }
          currentRule = {
            userAgent: value,
            allow: [],
            disallow: [],
          }
          break

        case 'allow':
          if (currentRule) {
            currentRule.allow.push(value)
          }
          break

        case 'disallow':
          if (currentRule) {
            currentRule.disallow.push(value)
          }
          break

        case 'crawl-delay':
          if (currentRule) {
            const delay = parseFloat(value)
            if (!isNaN(delay)) {
              currentRule.crawlDelay = delay
            }
          }
          break

        case 'sitemap':
          if (currentRule) {
            currentRule.sitemap = value
          }
          break
      }
    }

    if (currentRule) {
      this.rules.push(currentRule)
    }
  }

  canCrawl(url: string, userAgent: string = '*'): boolean {
    if (!this.fetched || this.rules.length === 0) {
      return true
    }

    const matchingRule = this.findMatchingRule(userAgent)
    if (!matchingRule) {
      return true
    }

    const path = new URL(url).pathname

    for (const allowPath of matchingRule.allow) {
      if (this.matchPattern(path, allowPath)) {
        return true
      }
    }

    for (const disallowPath of matchingRule.disallow) {
      if (this.matchPattern(path, disallowPath)) {
        return false
      }
    }

    return true
  }

  private findMatchingRule(userAgent: string): RobotRule | null {
    const specificRule = this.rules.find(rule => 
      rule.userAgent.toLowerCase() === userAgent.toLowerCase()
    )

    if (specificRule) {
      return specificRule
    }

    const wildcardRule = this.rules.find(rule => rule.userAgent === '*')
    return wildcardRule || null
  }

  private matchPattern(path: string, pattern: string): boolean {
    if (pattern === '/') {
      return path === '/'
    }

    if (pattern.endsWith('/')) {
      return path.startsWith(pattern)
    }

    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$')
      return regex.test(path)
    }

    return path.startsWith(pattern)
  }

  getCrawlDelay(userAgent: string = '*'): number {
    const rule = this.findMatchingRule(userAgent)
    return rule?.crawlDelay || 0
  }

  getSitemaps(): string[] {
    const sitemaps: string[] = []
    for (const rule of this.rules) {
      if (rule.sitemap) {
        sitemaps.push(rule.sitemap)
      }
    }
    return sitemaps
  }
}
