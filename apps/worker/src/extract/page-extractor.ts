import { PrismaClient, CrawlStatus, Severity, Impact, Difficulty } from '@prisma/client'
import { HttpFetcher, FetchResult } from '../crawl/fetcher'
import { HtmlParser, ExtractedMetadata, ExtractedContent } from './html-parser'
import { normalizeUrl, isInternalUrl, getDomain } from '@seo-spider/shared'

const prisma = new PrismaClient()

export interface PageData {
  crawlId: string
  url: string
  finalUrl: string
  statusCode: number
  contentType: string
  title?: string
  metaDescription?: string
  metaKeywords?: string
  canonical?: string
  robotsMeta?: string
  xRobotsTag?: string
  viewport?: string
  htmlLang?: string
  wordCount?: number
  loadTimeMs: number
  depth: number
  isInternal: boolean
  h1Count: number
  h2Count: number
  internalLinkCount: number
  externalLinkCount: number
  imageCount: number
  imagesWithoutAlt: number
  hreflangCount: number
  hasStructuredData: boolean
  structuredDataTypesJson?: string
  hasOpenGraph: boolean
  hasTwitterCard: boolean
  hasViewport: boolean
  hasHreflang: boolean
}

export interface IssueData {
  crawlId: string
  issueType: string
  url: string
  severity: Severity
  impact: Impact
  difficulty: Difficulty
  title: string
  explanation: string
  fixSteps: string[]
}

export class PageExtractor {
  private fetcher: HttpFetcher
  private htmlParser: HtmlParser
  private crawlId: string
  private baseUrl: string
  private baseDomain: string

  constructor(crawlId: string, startUrl: string, settings: any, useJsRendering = false) {
    this.crawlId = crawlId
    this.baseUrl = startUrl
    this.baseDomain = getDomain(startUrl)
    this.fetcher = new HttpFetcher(settings, useJsRendering)
    this.htmlParser = new HtmlParser()
  }

  async processPage(url: string, depth: number): Promise<{
    pageData?: PageData
    issues: IssueData[]
    links: { url: string; isInternal: boolean; anchorText?: string; isNofollow: boolean }[]
  }> {
    const fetchResult = await this.fetcher.fetch(url)
    const issues: IssueData[] = []
    const links: { url: string; isInternal: boolean; anchorText?: string; isNofollow: boolean }[] = []

    if (fetchResult.statusCode >= 400 && fetchResult.statusCode < 600) {
      issues.push(this.createBrokenPageIssue(url, fetchResult.statusCode))
    }

    if (this.hasMeaningfulRedirect(url, fetchResult.finalUrl, fetchResult.redirectChain)) {
      issues.push(this.createRedirectIssue(url, Math.max(1, fetchResult.redirectChain.length - 1)))
    }

    let pageData: PageData | undefined
    let metadata: ExtractedMetadata | undefined
    let content: ExtractedContent | undefined

    if (this.fetcher.isHtmlContent(fetchResult.contentType) && fetchResult.body) {
      const parsed = this.htmlParser.parse(fetchResult.body, fetchResult.finalUrl)
      metadata = parsed.metadata
      content = parsed.content

      if (metadata) {
        if (!metadata.title || metadata.title.trim() === '') {
          issues.push(this.createMissingTitleIssue(url))
        } else if (metadata.title.length < 10) {
          issues.push(this.createShortTitleIssue(url, metadata.title))
        } else if (metadata.title.length > 60) {
          issues.push(this.createLongTitleIssue(url, metadata.title))
        }

        if (!metadata.metaDescription || metadata.metaDescription.trim() === '') {
          issues.push(this.createMissingMetaDescriptionIssue(url))
        } else if (metadata.metaDescription.length < 70) {
          issues.push(this.createShortMetaDescriptionIssue(url))
        } else if (metadata.metaDescription.length > 155) {
          issues.push(this.createLongMetaDescriptionIssue(url))
        }

        if (!metadata.canonical) {
          issues.push(this.createMissingCanonicalIssue(url))
        }

        if (content && content.h1s.length === 0) {
          issues.push(this.createMissingH1Issue(url))
        } else if (content && content.h1s.length > 1) {
          issues.push(this.createMultipleH1Issue(url, content.h1s.length))
        }

        if (content && content.wordCount < 100) {
          issues.push(this.createLowWordCountIssue(url, content.wordCount))
        }

        const missingAltImages = content?.images.filter((image) => !image.alt || image.alt.trim() === '') || []
        if (missingAltImages.length > 0) {
          issues.push(this.createMissingImageAltIssue(url, missingAltImages.length))
        }

        const openGraph = metadata.openGraph || {}
        if (!openGraph['og:title'] || !openGraph['og:description'] || !openGraph['og:image']) {
          issues.push(this.createMissingOpenGraphIssue(url))
        }

        if (!metadata.twitterCard?.['twitter:card']) {
          issues.push(this.createMissingTwitterCardIssue(url))
        }

        if (!metadata.viewport) {
          issues.push(this.createMissingViewportIssue(url))
        }

        if (fetchResult.loadTimeMs > 1500) {
          issues.push(this.createSlowPageIssue(url, fetchResult.loadTimeMs))
        }

        if (metadata.canonical) {
          const canonicalUrl = normalizeUrl(metadata.canonical)
          const finalUrl = normalizeUrl(fetchResult.finalUrl)
          if (canonicalUrl !== finalUrl && canonicalUrl !== normalizeUrl(this.baseUrl + '/')) {
            issues.push(this.createCanonicalMismatchIssue(url, metadata.canonical))
          }
        }

        if (metadata.metaRobots) {
          if (metadata.metaRobots.toLowerCase().includes('noindex')) {
            issues.push(this.createNotIndexableIssue(url, 'meta robots tag'))
          }
        }

        if (
          fetchResult.headers['x-robots-tag'] &&
          fetchResult.headers['x-robots-tag'].toLowerCase().includes('noindex')
        ) {
          issues.push(this.createNotIndexableIssue(url, 'X-Robots-Tag header'))
        }

        if (content) {
          for (const link of [...content.internalLinks, ...content.externalLinks]) {
            const normalizedLink = normalizeUrl(link.url)
            const isInternal = this.isInternalToCrawl(link.url, fetchResult.finalUrl)
            
            links.push({
              url: normalizedLink,
              isInternal,
              anchorText: link.anchorText,
              isNofollow: link.isNofollow || false,
            })
          }
        }
      }
    }

    pageData = {
      crawlId: this.crawlId,
      url: normalizeUrl(url),
      finalUrl: normalizeUrl(fetchResult.finalUrl),
      statusCode: fetchResult.statusCode,
      contentType: fetchResult.contentType,
      title: metadata?.title,
      metaDescription: metadata?.metaDescription,
      metaKeywords: metadata?.metaKeywords,
      canonical: metadata?.canonical,
      robotsMeta: metadata?.metaRobots,
      xRobotsTag: fetchResult.headers['x-robots-tag'],
      viewport: metadata?.viewport,
      htmlLang: metadata?.htmlLang,
      wordCount: content?.wordCount,
      loadTimeMs: fetchResult.loadTimeMs,
      depth,
      isInternal: true,
      h1Count: content?.h1s.length || 0,
      h2Count: content?.h2s.length || 0,
      internalLinkCount: content?.internalLinks.length || 0,
      externalLinkCount: content?.externalLinks.length || 0,
      imageCount: content?.images.length || 0,
      imagesWithoutAlt: content?.images.filter((image) => !image.alt || image.alt.trim() === '').length || 0,
      hreflangCount: metadata?.hreflangLinks?.length || 0,
      hasStructuredData: (metadata?.structuredDataTypes?.length || 0) > 0,
      structuredDataTypesJson: metadata?.structuredDataTypes?.length ? JSON.stringify(metadata.structuredDataTypes) : undefined,
      hasOpenGraph: Object.keys(metadata?.openGraph || {}).length > 0,
      hasTwitterCard: Object.keys(metadata?.twitterCard || {}).length > 0,
      hasViewport: Boolean(metadata?.viewport),
      hasHreflang: (metadata?.hreflangLinks?.length || 0) > 0,
    }

    return { pageData, issues, links }
  }

  private normalizeHost(hostname: string): string {
    return hostname.toLowerCase().replace(/^www\./, '')
  }

  private hasMeaningfulRedirect(url: string, finalUrl: string, redirectChain: string[]): boolean {
    if (redirectChain.length === 0) {
      return false
    }

    return normalizeUrl(url) !== normalizeUrl(finalUrl)
  }

  private isInternalToCrawl(linkUrl: string, currentPageUrl: string): boolean {
    try {
      const linkHost = this.normalizeHost(new URL(linkUrl).hostname)
      const crawlHost = this.normalizeHost(this.baseDomain)
      const currentHost = this.normalizeHost(getDomain(currentPageUrl))

      return linkHost === crawlHost || linkHost === currentHost
    } catch {
      return isInternalUrl(linkUrl, this.baseUrl)
    }
  }

  private createBrokenPageIssue(url: string, statusCode: number): IssueData {
    return {
      crawlId: this.crawlId,
      issueType: 'BROKEN_PAGE',
      url,
      severity: Severity.HIGH,
      impact: Impact.HIGH,
      difficulty: Difficulty.EASY,
      title: statusCode === 404 ? '404 Not Found' : `Server Error (${statusCode})`,
      explanation: 'This page returns an error and cannot be accessed by users or search engines.',
      fixSteps: [
        'Check if the URL is correct',
        'Restore the page if it was removed',
        'Set up a 301 redirect to a related page',
      ],
    }
  }

  private createRedirectIssue(url: string, chainLength: number): IssueData {
    return {
      crawlId: this.crawlId,
      issueType: 'REDIRECT',
      url,
      severity: chainLength > 1 ? Severity.HIGH : Severity.LOW,
      impact: Impact.MEDIUM,
      difficulty: Difficulty.EASY,
      title: chainLength > 1 ? 'Multiple Redirects' : 'Redirect',
      explanation: chainLength > 2 
        ? 'This page redirects through multiple URLs before reaching the final destination, which can slow down crawling.'
        : 'This page redirects to another URL.',
      fixSteps: [
        'Update links to point directly to the final URL',
        'Consider consolidating redirects',
      ],
    }
  }

  private createMissingTitleIssue(url: string): IssueData {
    return {
      crawlId: this.crawlId,
      issueType: 'MISSING_TITLE',
      url,
      severity: Severity.MEDIUM,
      impact: Impact.MEDIUM,
      difficulty: Difficulty.EASY,
      title: 'Missing Title Tag',
      explanation: 'This page does not have a title tag.',
      fixSteps: [
        'Add a unique, descriptive title',
        'Keep it under 60 characters',
        'Include relevant keywords',
      ],
    }
  }

  private createShortTitleIssue(url: string, title: string): IssueData {
    return {
      crawlId: this.crawlId,
      issueType: 'SHORT_TITLE',
      url,
      severity: Severity.LOW,
      impact: Impact.LOW,
      difficulty: Difficulty.EASY,
      title: 'Title Too Short',
      explanation: `The title is only ${title.length} characters and may not be descriptive enough.`,
      fixSteps: [
        'Expand the title to describe the page content',
        'Aim for 30-60 characters',
      ],
    }
  }

  private createLongTitleIssue(url: string, title: string): IssueData {
    return {
      crawlId: this.crawlId,
      issueType: 'LONG_TITLE',
      url,
      severity: Severity.LOW,
      impact: Impact.LOW,
      difficulty: Difficulty.EASY,
      title: 'Title Too Long',
      explanation: `The title is ${title.length} characters and may be truncated in search results.`,
      fixSteps: [
        'Shorten the title to under 60 characters',
        'Focus on the most important keywords',
      ],
    }
  }

  private createMissingMetaDescriptionIssue(url: string): IssueData {
    return {
      crawlId: this.crawlId,
      issueType: 'MISSING_META_DESCRIPTION',
      url,
      severity: Severity.LOW,
      impact: Impact.MEDIUM,
      difficulty: Difficulty.EASY,
      title: 'Missing Meta Description',
      explanation: 'This page does not have a meta description.',
      fixSteps: [
        'Add a compelling summary of the page',
        'Keep it between 70-155 characters',
        'Include a call-to-action',
      ],
    }
  }

  private createShortMetaDescriptionIssue(url: string): IssueData {
    return {
      crawlId: this.crawlId,
      issueType: 'SHORT_META_DESCRIPTION',
      url,
      severity: Severity.LOW,
      impact: Impact.LOW,
      difficulty: Difficulty.EASY,
      title: 'Meta Description Too Short',
      explanation: 'The meta description is shorter than recommended and may not provide enough information.',
      fixSteps: [
        'Expand to fully describe the page content',
        'Aim for 120-155 characters',
      ],
    }
  }

  private createLongMetaDescriptionIssue(url: string): IssueData {
    return {
      crawlId: this.crawlId,
      issueType: 'LONG_META_DESCRIPTION',
      url,
      severity: Severity.LOW,
      impact: Impact.LOW,
      difficulty: Difficulty.EASY,
      title: 'Meta Description Too Long',
      explanation: 'The meta description may be truncated in search results.',
      fixSteps: [
        'Shorten to under 155 characters',
        'Focus on the most important information',
      ],
    }
  }

  private createMissingH1Issue(url: string): IssueData {
    return {
      crawlId: this.crawlId,
      issueType: 'MISSING_H1',
      url,
      severity: Severity.LOW,
      impact: Impact.MEDIUM,
      difficulty: Difficulty.EASY,
      title: 'Missing H1 Heading',
      explanation: 'This page does not have an H1 heading.',
      fixSteps: [
        'Add an H1 heading that describes the main topic',
        'Use only one H1 per page',
      ],
    }
  }

  private createMultipleH1Issue(url: string, count: number): IssueData {
    return {
      crawlId: this.crawlId,
      issueType: 'MULTIPLE_H1',
      url,
      severity: Severity.LOW,
      impact: Impact.LOW,
      difficulty: Difficulty.EASY,
      title: 'Multiple H1 Headings',
      explanation: `This page has ${count} H1 headings, but should have only one.`,
      fixSteps: [
        'Convert other H1s to H2 headings',
        'Ensure the single H1 describes the main topic',
      ],
    }
  }

  private createLowWordCountIssue(url: string, wordCount: number): IssueData {
    return {
      crawlId: this.crawlId,
      issueType: 'LOW_WORD_COUNT',
      url,
      severity: Severity.LOW,
      impact: Impact.LOW,
      difficulty: Difficulty.MEDIUM,
      title: 'Low Word Count',
      explanation: `This page has only ${wordCount} words, which may not provide enough content for search engines.`,
      fixSteps: [
        'Add more detailed content',
        'Include relevant information and examples',
        'Aim for at least 300 words on main pages',
      ],
    }
  }

  private createCanonicalMismatchIssue(url: string, canonical: string): IssueData {
    return {
      crawlId: this.crawlId,
      issueType: 'CANONICAL_MISMATCH',
      url,
      severity: Severity.LOW,
      impact: Impact.LOW,
      difficulty: Difficulty.MEDIUM,
      title: 'Canonical Points to Different URL',
      explanation: `The canonical tag points to ${canonical}, which is different from the current URL.`,
      fixSteps: [
        'Update the canonical to point to the preferred version',
        'Or remove if the page is the primary version',
      ],
    }
  }

  private createMissingCanonicalIssue(url: string): IssueData {
    return {
      crawlId: this.crawlId,
      issueType: 'MISSING_CANONICAL',
      url,
      severity: Severity.LOW,
      impact: Impact.MEDIUM,
      difficulty: Difficulty.EASY,
      title: 'Missing Canonical Tag',
      explanation: 'This page does not declare a canonical URL.',
      fixSteps: [
        'Add a self-referencing canonical tag if this page is the preferred version',
        'Point the canonical tag at the preferred URL when duplicates exist',
        'Keep the canonical absolute and crawlable',
      ],
    }
  }

  private createMissingOpenGraphIssue(url: string): IssueData {
    return {
      crawlId: this.crawlId,
      issueType: 'MISSING_OPEN_GRAPH',
      url,
      severity: Severity.LOW,
      impact: Impact.MEDIUM,
      difficulty: Difficulty.EASY,
      title: 'Incomplete Open Graph Markup',
      explanation: 'This page is missing one or more core Open Graph tags such as og:title, og:description, or og:image.',
      fixSteps: [
        'Add og:title, og:description, and og:image tags',
        'Keep Open Graph content aligned with the live page content',
        'Use a valid image URL that social platforms can fetch',
      ],
    }
  }

  private createMissingTwitterCardIssue(url: string): IssueData {
    return {
      crawlId: this.crawlId,
      issueType: 'MISSING_TWITTER_CARD',
      url,
      severity: Severity.LOW,
      impact: Impact.LOW,
      difficulty: Difficulty.EASY,
      title: 'Missing Twitter Card Markup',
      explanation: 'This page is missing a twitter:card declaration, which weakens link previews on X and compatible platforms.',
      fixSteps: [
        'Add a twitter:card meta tag',
        'Mirror key Open Graph fields in your Twitter card tags',
        'Validate social previews after deployment',
      ],
    }
  }

  private createMissingViewportIssue(url: string): IssueData {
    return {
      crawlId: this.crawlId,
      issueType: 'MISSING_VIEWPORT',
      url,
      severity: Severity.MEDIUM,
      impact: Impact.MEDIUM,
      difficulty: Difficulty.EASY,
      title: 'Missing Viewport Meta Tag',
      explanation: 'This page does not define a viewport, which can harm mobile rendering and usability.',
      fixSteps: [
        'Add a viewport meta tag such as width=device-width, initial-scale=1',
        'Test the page on mobile breakpoints after deployment',
        'Avoid fixed-width layouts that break on smaller screens',
      ],
    }
  }

  private createNotIndexableIssue(url: string, source: string): IssueData {
    return {
      crawlId: this.crawlId,
      issueType: 'NOT_INDEXABLE',
      url,
      severity: Severity.HIGH,
      impact: Impact.HIGH,
      difficulty: Difficulty.MEDIUM,
      title: 'Not Indexable',
      explanation: `This page is blocked from indexing via ${source}.`,
      fixSteps: [
        'Review if this page should be indexed',
        'Remove the noindex directive if needed',
        'Check robots.txt for additional restrictions',
      ],
    }
  }

  private createMissingImageAltIssue(url: string, count: number): IssueData {
    return {
      crawlId: this.crawlId,
      issueType: 'MISSING_IMAGE_ALT',
      url,
      severity: Severity.LOW,
      impact: Impact.LOW,
      difficulty: Difficulty.EASY,
      title: 'Images Missing Alt Text',
      explanation: `${count} image${count === 1 ? '' : 's'} on this page ${count === 1 ? 'is' : 'are'} missing alt text.`,
      fixSteps: [
        'Add descriptive alt text to each informative image',
        'Use empty alt text only for decorative images',
        'Keep alt text concise and relevant to the image content',
      ],
    }
  }

  private createSlowPageIssue(url: string, loadTimeMs: number): IssueData {
    return {
      crawlId: this.crawlId,
      issueType: 'SLOW_PAGE',
      url,
      severity: loadTimeMs > 3000 ? Severity.HIGH : Severity.MEDIUM,
      impact: Impact.MEDIUM,
      difficulty: Difficulty.MEDIUM,
      title: 'Slow Page Response',
      explanation: `This page recorded ${loadTimeMs}ms during an uncached crawl, which can indicate response or rendering bottlenecks.`,
      fixSteps: [
        'Review server response times and heavy backend operations',
        'Optimize render-blocking assets and large media files',
        'Enable caching or a CDN for repeat requests',
      ],
    }
  }
}
