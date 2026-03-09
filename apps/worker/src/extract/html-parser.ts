import * as cheerio from 'cheerio'

export interface ExtractedMetadata {
  title?: string
  metaDescription?: string
  metaKeywords?: string
  canonical?: string
  metaRobots?: string
  viewport?: string
  htmlLang?: string
  alternativeLinks?: Array<{ rel: string; href: string }>
  hreflangLinks?: Array<{ hreflang: string; href: string }>
  openGraph?: Record<string, string>
  twitterCard?: Record<string, string>
  structuredDataTypes?: string[]
}

export interface ExtractedContent {
  h1s: string[]
  h2s: string[]
  h3s: string[]
  text: string
  wordCount: number
  internalLinks: Array<{ url: string; anchorText?: string; isNofollow?: boolean }>
  externalLinks: Array<{ url: string; anchorText?: string; isNofollow?: boolean }>
  images: Array<{ src: string; alt?: string }>
}

export class HtmlParser {
  parse(html: string, pageUrl: string): { metadata: ExtractedMetadata; content: ExtractedContent } {
    const $ = cheerio.load(html)

    const metadata = this.extractMetadata($, pageUrl)
    const content = this.extractContent($, pageUrl)

    return { metadata, content }
  }

  private extractMetadata($: cheerio.CheerioAPI, pageUrl: string): ExtractedMetadata {
    const metadata: ExtractedMetadata = {}

    const htmlLang = $('html').attr('lang')
    if (htmlLang) metadata.htmlLang = htmlLang.trim()

    metadata.title = $('title').first().text().trim()

    const metaDesc = $('meta[name="description"]').attr('content')
    if (metaDesc) metadata.metaDescription = metaDesc.trim()

    const metaKeywords = $('meta[name="keywords"]').attr('content')
    if (metaKeywords) metadata.metaKeywords = metaKeywords.trim()

    const canonical = $('link[rel="canonical"]').attr('href')
    if (canonical) {
      metadata.canonical = this.resolveUrl(canonical, pageUrl)
    }

    const metaRobots = $('meta[name="robots"]').attr('content')
    if (metaRobots) metadata.metaRobots = metaRobots.trim()

    const viewport = $('meta[name="viewport"]').attr('content')
    if (viewport) metadata.viewport = viewport.trim()

    const alternativeLinks: Array<{ rel: string; href: string }> = []
    const hreflangLinks: Array<{ hreflang: string; href: string }> = []
    $('link[rel="alternate"]').each((i, el) => {
      const rel = $(el).attr('rel')
      const href = $(el).attr('href')
      const hreflang = $(el).attr('hreflang')
      if (rel && href) {
        alternativeLinks.push({ rel, href: this.resolveUrl(href, pageUrl) })
      }
      if (hreflang && href) {
        hreflangLinks.push({
          hreflang: hreflang.trim().toLowerCase(),
          href: this.resolveUrl(href, pageUrl),
        })
      }
    })
    if (alternativeLinks.length > 0) metadata.alternativeLinks = alternativeLinks
    if (hreflangLinks.length > 0) metadata.hreflangLinks = hreflangLinks

    const openGraph: Record<string, string> = {}
    $('meta[property^="og:"]').each((i, el) => {
      const property = $(el).attr('property')
      const content = $(el).attr('content')
      if (property && content) {
        openGraph[property] = content.trim()
      }
    })
    if (Object.keys(openGraph).length > 0) metadata.openGraph = openGraph

    const twitterCard: Record<string, string> = {}
    $('meta[name^="twitter:"]').each((i, el) => {
      const name = $(el).attr('name')
      const content = $(el).attr('content')
      if (name && content) {
        twitterCard[name] = content.trim()
      }
    })
    if (Object.keys(twitterCard).length > 0) metadata.twitterCard = twitterCard

    const structuredDataTypes = new Set<string>()

    $('script[type="application/ld+json"]').each((i, el) => {
      const jsonText = $(el).contents().text().trim()
      if (!jsonText) return

      try {
        const parsed = JSON.parse(jsonText)
        for (const type of this.collectJsonLdTypes(parsed)) {
          structuredDataTypes.add(type)
        }
      } catch {
        // Ignore invalid JSON-LD blocks and continue crawling.
      }
    })

    $('[itemscope][itemtype]').each((i, el) => {
      const itemType = $(el).attr('itemtype')
      const normalized = this.normalizeSchemaType(itemType)
      if (normalized) {
        structuredDataTypes.add(normalized)
      }
    })

    if (structuredDataTypes.size > 0) {
      metadata.structuredDataTypes = Array.from(structuredDataTypes).sort()
    }

    return metadata
  }

  private extractContent($: cheerio.CheerioAPI, pageUrl: string): ExtractedContent {
    const content: ExtractedContent = {
      h1s: [],
      h2s: [],
      h3s: [],
      text: '',
      wordCount: 0,
      internalLinks: [],
      externalLinks: [],
      images: [],
    }

    $('h1').each((i, el) => {
      const text = $(el).text().trim()
      if (text) content.h1s.push(text)
    })

    $('h2').each((i, el) => {
      const text = $(el).text().trim()
      if (text) content.h2s.push(text)
    })

    $('h3').each((i, el) => {
      const text = $(el).text().trim()
      if (text) content.h3s.push(text)
    })

    // Extract links before trimming layout elements so navigation links are not lost.
    $('a[href]').each((i, el) => {
      const href = $(el).attr('href')
      if (!href) return

      const anchorText = $(el).text().trim()
      const rel = $(el).attr('rel') || ''
      const isNofollow = rel.toLowerCase().includes('nofollow')
      const resolvedUrl = this.resolveUrl(href, pageUrl)
      
      if (this.isSameDomain(resolvedUrl, pageUrl)) {
        content.internalLinks.push({ url: resolvedUrl, anchorText, isNofollow })
      } else {
        content.externalLinks.push({ url: resolvedUrl, anchorText, isNofollow })
      }
    })

    $('img[src]').each((i, el) => {
      const src = $(el).attr('src')
      const alt = $(el).attr('alt')
      if (src) {
        content.images.push({ src: this.resolveUrl(src, pageUrl), alt })
      }
    })

    const bodyClone = $('body').clone()
    bodyClone.find('script, style, nav, footer, header, aside').remove()

    let text = bodyClone.text()
    text = text.replace(/\s+/g, ' ').trim()
    content.text = text
    content.wordCount = text.split(/\s+/).filter(word => word.length > 0).length

    return content
  }

  private resolveUrl(url: string, baseUrl: string): string {
    try {
      return new URL(url, baseUrl).href
    } catch {
      if (url.startsWith('//')) {
        return 'http:' + url
      }
      return url
    }
  }

  private isSameDomain(url1: string, url2: string): boolean {
    try {
      const domain1 = new URL(url1).hostname
      const domain2 = new URL(url2).hostname
      return domain1 === domain2
    } catch {
      return false
    }
  }

  countRedirects(responseUrl: string, requestUrl: string): number {
    return responseUrl !== requestUrl ? 1 : 0
  }

  private collectJsonLdTypes(input: unknown): string[] {
    const discovered = new Set<string>()

    const visit = (value: unknown) => {
      if (Array.isArray(value)) {
        value.forEach(visit)
        return
      }

      if (!value || typeof value !== 'object') {
        return
      }

      const record = value as Record<string, unknown>
      const typeValue = record['@type']

      if (typeof typeValue === 'string') {
        const normalized = this.normalizeSchemaType(typeValue)
        if (normalized) discovered.add(normalized)
      } else if (Array.isArray(typeValue)) {
        typeValue.forEach((typeEntry) => {
          const normalized = this.normalizeSchemaType(typeEntry)
          if (normalized) discovered.add(normalized)
        })
      }

      Object.values(record).forEach(visit)
    }

    visit(input)
    return Array.from(discovered)
  }

  private normalizeSchemaType(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null
    }

    const trimmed = value.trim()
    if (!trimmed) {
      return null
    }

    const withoutFragment = trimmed.split('#')[0]
    const segments = withoutFragment.split(/[/:]/).filter(Boolean)
    return segments[segments.length - 1] || trimmed
  }
}
