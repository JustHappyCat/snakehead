import { PrismaClient, CrawlStatus } from '@prisma/client'
import { URLFrontier } from './crawl/url-frontier'
import { RobotsParser } from './crawl/robots-parser'
import { PageExtractor } from './extract/page-extractor'
import { CrawlStorage } from './jobs/storage'
import { parseSettingsJson } from '@seo-spider/shared'
import { checkSoft404 } from '../lib/soft-404'
import { OrphanDetector } from '../lib/orphans'
import { DuplicatesDetector } from '../lib/duplicates-detector'
import { CrawlSafetyChecker, CrawlSafetyConfig } from '../lib/crawl-safety'
import { cleanupRenderer } from './crawl/js-renderer'
import { SecurityAuditor } from './audit/security-auditor'

const prisma = new PrismaClient()

export interface CrawlJobData {
  crawlId: string
}

export interface ProgressData {
  progress: number
  current: number
  total: number
  errors: number
  pagesCrawled: number
  linksFound: number
  issuesFound: number
}

type ProgressReporter = (progress: ProgressData) => Promise<void> | void

function findDuplicateTextGroups(
  pages: Array<{ url: string; value: string | null | undefined }>
) {
  const groups = new Map<string, string[]>()

  for (const page of pages) {
    const normalized = (page.value || '').trim().toLowerCase()
    if (!normalized) continue

    const current = groups.get(normalized) || []
    current.push(page.url)
    groups.set(normalized, current)
  }

  return Array.from(groups.values()).filter((urls) => urls.length > 1)
}

async function emitProgress(
  reporter: ProgressReporter | undefined,
  progressData: ProgressData
) {
  if (reporter) {
    await reporter(progressData)
  }
}

async function claimCrawl(crawlId: string) {
  const result = await prisma.crawl.updateMany({
    where: {
      id: crawlId,
      status: CrawlStatus.PENDING,
    },
    data: {
      status: CrawlStatus.RUNNING,
      startedAt: new Date(),
      finishedAt: null,
    },
  })

  return result.count > 0
}

export async function getNextPendingCrawlId() {
  const crawl = await prisma.crawl.findFirst({
    where: {
      status: CrawlStatus.PENDING,
    },
    orderBy: {
      createdAt: 'asc',
    },
    select: {
      id: true,
    },
  })

  return crawl?.id || null
}

export async function runCrawl(
  crawlId: string,
  reportProgress?: ProgressReporter
) {
  const claimed = await claimCrawl(crawlId)

  if (!claimed) {
    console.log(`Skipping crawl ${crawlId} because it is no longer pending`)
    return false
  }

  console.log(`Starting crawl job for crawl: ${crawlId}`)

  try {
    const crawl = await prisma.crawl.findUnique({
      where: { id: crawlId },
    })

    if (!crawl) {
      throw new Error(`Crawl ${crawlId} not found`)
    }

    const settings = parseSettingsJson(crawl.settingsJson)
    const storage = new CrawlStorage(crawlId)
    const frontier = new URLFrontier(crawl.startUrl, settings)
    const robotsParser = new RobotsParser(crawl.startUrl)
    const orphanDetector = new OrphanDetector()

    const useJsRendering = (settings as any).jsRendering || false
    const runSecurityAudit = Boolean((settings as any).securityAudit)

    const safetyConfig: CrawlSafetyConfig = {
      allowedDomains: [new URL(crawl.startUrl).hostname],
      blockedDomains: [],
      maxPages: settings.maxPages,
      maxDepth: settings.maxDepth,
      maxTimeMs: 30 * 60 * 1000,
      startTime: Date.now(),
    }
    const safetyChecker = new CrawlSafetyChecker(safetyConfig)
    const duplicatesDetector = new DuplicatesDetector()

    if (settings.respectRobots) {
      await robotsParser.fetch()
      await storage.logEvent('INFO', 'Robots.txt fetched and parsed')

      const sitemaps = robotsParser.getSitemaps()
      for (const sitemapUrl of sitemaps) {
        try {
          await storage.logEvent('INFO', `Processing sitemap: ${sitemapUrl}`)
        } catch (error) {
          await storage.logEvent('WARN', `Failed to process sitemap ${sitemapUrl}: ${error}`)
        }
      }
    }

    const extractor = new PageExtractor(crawlId, crawl.startUrl, settings, useJsRendering)
    const securityAuditor = runSecurityAudit ? new SecurityAuditor(crawlId) : null

    let pagesCrawled = 0
    let linksFound = 0
    let issuesFound = 0
    let errors = 0
    const totalPages = settings.maxPages

    await storage.logEvent('INFO', `Crawl started with max ${totalPages} pages`)

    if (securityAuditor) {
      try {
        await storage.logEvent('INFO', 'Running security audit checks')
        const securityIssues = await securityAuditor.audit(crawl.startUrl)
        for (const issue of securityIssues) {
          await storage.saveIssue(issue)
          issuesFound++
        }
        await storage.logEvent('INFO', `Security audit completed with ${securityIssues.length} findings`)
      } catch (error) {
        await storage.logEvent('WARN', `Security audit failed: ${error}`)
      }
    }

    while (frontier.hasNext() && pagesCrawled < settings.maxPages) {
      const nextItem = frontier.next()
      if (!nextItem) break

      const { url, depth } = nextItem

      if (settings.respectRobots && !robotsParser.canCrawl(url)) {
        await storage.logEvent('WARN', `URL blocked by robots.txt: ${url}`)
        continue
      }

      const safetyCheck = safetyChecker.isUrlSafe(url, depth)
      if (!safetyCheck.safe) {
        await storage.logEvent('WARN', `URL blocked by safety check: ${url} - ${safetyCheck.reason}`)
        continue
      }

      safetyChecker.markUrlAsCrawled(url)

      let progressData: ProgressData = {
        progress: Math.round((pagesCrawled / totalPages) * 100),
        current: pagesCrawled,
        total: totalPages,
        errors,
        pagesCrawled,
        linksFound,
        issuesFound,
      }

      try {
        const result = await extractor.processPage(url, depth)

        if (result.pageData) {
          await storage.savePage(result.pageData)
          orphanDetector.addCrawledUrl(result.pageData.url)

          if (result.pageData.title && result.pageData.metaDescription) {
            const content = `${result.pageData.title}\n${result.pageData.metaDescription}`
            duplicatesDetector.addPage(result.pageData.url, content)
          }

          pagesCrawled++

          for (const link of result.links) {
            if (link.isInternal) {
              frontier.add(link.url, depth + 1)
            }

            await storage.saveLink(
              crawlId,
              result.pageData.url,
              link.url,
              link.isInternal,
              link.anchorText,
              link.isNofollow
            )

            orphanDetector.addLink(result.pageData.url, link.url)
            linksFound++
          }

          if (result.pageData.wordCount && result.pageData.statusCode === 200) {
            const soft404Check = checkSoft404(
              `${result.pageData.title || ''} ${result.pageData.metaDescription || ''}`,
              result.pageData.wordCount
            )
            if (soft404Check.isSoft404) {
              await storage.saveIssue({
                crawlId,
                issueType: 'SOFT_404',
                url: result.pageData.url,
                severity: soft404Check.confidence === 'high' ? 'HIGH' : 'MEDIUM',
                impact: 'MEDIUM',
                difficulty: 'HARD',
                title: 'Possible Soft 404',
                explanation: `This page returns 200 OK but contains content that suggests it might not be a real page. Detected pattern: ${soft404Check.matchedPattern || 'Low word count'}.`,
                fixSteps: [
                  'Check if this page should actually exist',
                  'Return proper 404 status code for missing pages',
                  'Review content for proper structure',
                ],
              })
              issuesFound++
            }
          }
        }

        for (const issue of result.issues) {
          await storage.saveIssue(issue)
          issuesFound++
        }

        progressData = {
          progress: Math.round((pagesCrawled / totalPages) * 100),
          current: pagesCrawled,
          total: totalPages,
          errors,
          pagesCrawled,
          linksFound,
          issuesFound,
        }

        await emitProgress(reportProgress, progressData)

        if (pagesCrawled % 10 === 0) {
          await storage.logEvent(
            'INFO',
            `Progress: ${pagesCrawled}/${totalPages} pages, ${linksFound} links, ${issuesFound} issues`
          )
        }
      } catch (error) {
        console.error(`Error processing ${url}:`, error)
        await storage.logEvent('ERROR', `Failed to process ${url}: ${error}`)

        errors++
        progressData = {
          progress: Math.round((pagesCrawled / totalPages) * 100),
          current: pagesCrawled,
          total: totalPages,
          errors,
          pagesCrawled,
          linksFound,
          issuesFound,
        }
        await emitProgress(reportProgress, progressData)
      }
    }

    const orphanStats = orphanDetector.getStats()
    if (orphanStats.orphanCount > 0) {
      await storage.logEvent('INFO', `Found ${orphanStats.orphanCount} orphan pages`)
      for (const orphanUrl of orphanStats.orphans) {
        await storage.saveIssue({
          crawlId,
          issueType: 'ORPHAN_PAGE',
          url: orphanUrl,
          severity: 'LOW',
          impact: 'LOW',
          difficulty: 'EASY',
          title: 'Orphan Page',
          explanation: 'This page is not linked to from any other page on your site and may be difficult for users to discover.',
          fixSteps: [
            'Add internal links to this page',
            'Include it in your site navigation',
            'Add it to your XML sitemap',
          ],
        })
        issuesFound++
      }
    }

    const duplicateGroups = duplicatesDetector.findDuplicatePages()
    await storage.logEvent(
      'INFO',
      `Found ${duplicateGroups.length} groups of duplicate content`
    )

    for (const group of duplicateGroups) {
      for (const url of group.urls.slice(1)) {
        await storage.saveIssue({
          crawlId,
          issueType: 'DUPLICATE_CONTENT',
          url,
          severity: 'MEDIUM',
          impact: 'MEDIUM',
          difficulty: 'MEDIUM',
          title: 'Duplicate Content',
          explanation: `This page has duplicate content with ${group.count - 1} other page(s). First found at: ${group.urls[0]}`,
          fixSteps: [
            'Review all duplicate pages',
            'Decide which page should be the canonical version',
            'Use 301 redirects to consolidate duplicate pages',
            'Add canonical link tags to indicate preferred version',
          ],
        })
        issuesFound++
      }
    }

    const pagesForMetadata = await prisma.page.findMany({
      where: {
        crawlId,
        statusCode: 200,
      },
      select: {
        url: true,
        title: true,
        metaDescription: true,
      },
    })

    const duplicateTitleGroups = findDuplicateTextGroups(
      pagesForMetadata.map((page) => ({ url: page.url, value: page.title }))
    )
    for (const urls of duplicateTitleGroups) {
      for (const url of urls.slice(1)) {
        await storage.saveIssue({
          crawlId,
          issueType: 'DUPLICATE_TITLE',
          url,
          severity: 'MEDIUM',
          impact: 'MEDIUM',
          difficulty: 'EASY',
          title: 'Duplicate Title Tag',
          explanation: `This page shares its title tag with another page in the crawl. Primary duplicate: ${urls[0]}`,
          fixSteps: [
            'Rewrite the title tag to match the page intent',
            'Make the title unique for this URL',
            'Keep the most important keywords near the start',
          ],
        })
        issuesFound++
      }
    }

    const duplicateMetaGroups = findDuplicateTextGroups(
      pagesForMetadata.map((page) => ({ url: page.url, value: page.metaDescription }))
    )
    for (const urls of duplicateMetaGroups) {
      for (const url of urls.slice(1)) {
        await storage.saveIssue({
          crawlId,
          issueType: 'DUPLICATE_META_DESCRIPTION',
          url,
          severity: 'LOW',
          impact: 'MEDIUM',
          difficulty: 'EASY',
          title: 'Duplicate Meta Description',
          explanation: `This page shares its meta description with another page in the crawl. Primary duplicate: ${urls[0]}`,
          fixSteps: [
            'Write a unique summary for this page',
            'Make the description specific to the page content',
            'Keep the description under 155 characters',
          ],
        })
        issuesFound++
      }
    }

    const [pagesForLinkAnalysis, internalLinks] = await Promise.all([
      prisma.page.findMany({
        where: {
          crawlId,
        },
        select: {
          url: true,
          finalUrl: true,
          statusCode: true,
          contentType: true,
          internalLinkCount: true,
        },
      }),
      prisma.link.findMany({
        where: {
          crawlId,
          isInternal: true,
        },
        select: {
          fromUrl: true,
          toUrl: true,
        },
      }),
    ])

    const pagesByUrl = new Map(
      pagesForLinkAnalysis.map((page) => [page.url, page])
    )

    const brokenInternalLinksBySource = new Map<string, string[]>()
    const redirectedInternalLinksBySource = new Map<string, string[]>()

    for (const link of internalLinks) {
      const targetPage = pagesByUrl.get(link.toUrl)
      if (!targetPage) {
        continue
      }

      if ((targetPage.statusCode || 0) >= 400) {
        const current = brokenInternalLinksBySource.get(link.fromUrl) || []
        current.push(link.toUrl)
        brokenInternalLinksBySource.set(link.fromUrl, current)
        continue
      }

      if (targetPage.finalUrl && targetPage.finalUrl !== targetPage.url) {
        const current = redirectedInternalLinksBySource.get(link.fromUrl) || []
        current.push(link.toUrl)
        redirectedInternalLinksBySource.set(link.fromUrl, current)
      }
    }

    for (const [sourceUrl, targets] of brokenInternalLinksBySource.entries()) {
      const uniqueTargets = Array.from(new Set(targets))
      await storage.saveIssue({
        crawlId,
        issueType: 'BROKEN_INTERNAL_LINK',
        url: sourceUrl,
        severity: 'HIGH',
        impact: 'HIGH',
        difficulty: 'EASY',
        title: 'Broken Internal Links',
        explanation: `This page links to ${uniqueTargets.length} internal URL${uniqueTargets.length === 1 ? '' : 's'} that return an error.`,
        fixSteps: [
          'Update internal links to point at a live destination',
          'Replace removed URLs with the closest relevant page',
          'Add redirects only when a direct link update is not possible',
        ],
      })
      issuesFound++
    }

    for (const [sourceUrl, targets] of redirectedInternalLinksBySource.entries()) {
      const uniqueTargets = Array.from(new Set(targets))
      await storage.saveIssue({
        crawlId,
        issueType: 'INTERNAL_LINK_TO_REDIRECT',
        url: sourceUrl,
        severity: 'MEDIUM',
        impact: 'MEDIUM',
        difficulty: 'EASY',
        title: 'Internal Links Point to Redirects',
        explanation: `This page links to ${uniqueTargets.length} internal URL${uniqueTargets.length === 1 ? '' : 's'} that redirect before loading.`,
        fixSteps: [
          'Update internal links to point at the final destination URL',
          'Replace redirect hops in menus, breadcrumbs, and templates',
          'Keep internal navigation aligned with canonical destination URLs',
        ],
      })
      issuesFound++
    }

    for (const page of pagesForLinkAnalysis) {
      const isHtmlPage = (page.contentType || '').includes('html')
      if (!isHtmlPage || page.statusCode !== 200 || page.internalLinkCount > 0) {
        continue
      }

      await storage.saveIssue({
        crawlId,
        issueType: 'DEAD_END_PAGE',
        url: page.url,
        severity: 'LOW',
        impact: 'MEDIUM',
        difficulty: 'EASY',
        title: 'Dead-End Page',
        explanation: 'This page does not link to any other internal URL, which can trap users and crawlers at the end of the journey.',
        fixSteps: [
          'Add relevant internal links to related pages',
          'Review templates for missing next-step navigation',
          'Link back to category, parent, or conversion pages',
        ],
      })
      issuesFound++
    }

    await prisma.crawl.update({
      where: { id: crawlId },
      data: {
        status: CrawlStatus.COMPLETED,
        finishedAt: new Date(),
      },
    })

    await storage.logEvent(
      'INFO',
      `Crawl completed: ${pagesCrawled} pages, ${linksFound} links, ${issuesFound} issues, ${orphanStats.orphanCount} orphans`
    )

    if (useJsRendering) {
      await cleanupRenderer()
    }

    console.log(`Crawl ${crawlId} completed successfully: ${pagesCrawled} pages`)
    return true
  } catch (error) {
    console.error(`Crawl ${crawlId} failed:`, error)

    await prisma.crawl.update({
      where: { id: crawlId },
      data: {
        status: CrawlStatus.FAILED,
        finishedAt: new Date(),
      },
    })

    const storage = new CrawlStorage(crawlId)
    await storage.logEvent('ERROR', `Crawl failed: ${error}`)

    await cleanupRenderer()

    throw error
  }
}

export async function disconnectRunCrawlPrisma() {
  await prisma.$disconnect()
}
