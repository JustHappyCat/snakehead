import { PrismaClient, CrawlStatus } from '@prisma/client'
import { URLFrontier } from './crawl/url-frontier'
import { RobotsParser } from './crawl/robots-parser'
import { PageExtractor } from './extract/page-extractor'
import { CrawlStorage } from './jobs/storage'
import { parseSettingsJson } from '@seo-spider/shared'
import { checkSoft404 } from '../lib/soft-404'
import { OrphanDetector } from '../lib/orphans'
import { NearDuplicatesDetector } from '../lib/near-duplicates'
import { fetchSitemapUrls } from './crawl/sitemap-parser'
import { ExternalLinkChecker } from './crawl/external-link-checker'
import { CrawlSafetyChecker, CrawlSafetyConfig } from '../lib/crawl-safety'
import { cleanupRenderer } from './crawl/js-renderer'
import { SecurityAuditor } from './audit/security-auditor'
import { runPerformanceAudit, PerformanceAuditMode } from './audit/performance-auditor'

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
    const runPerformanceChecks = Boolean(settings.performanceAudit)
    const performanceMode: PerformanceAuditMode =
      settings.performanceMode === 'lighthouse' ? 'lighthouse' : 'psi'
    const performanceMaxUrls = settings.performanceMaxUrls || 25

    const startHostname = new URL(crawl.startUrl).hostname
    const bareHostname = startHostname.replace(/^www\./, '')
    const safetyConfig: CrawlSafetyConfig = {
      // The extractor treats www/non-www hosts as internal, so allow both variants
      allowedDomains: Array.from(new Set([startHostname, bareHostname, `www.${bareHostname}`])),
      blockedDomains: [],
      maxPages: settings.maxPages,
      maxDepth: settings.maxDepth,
      maxTimeMs: 30 * 60 * 1000,
      startTime: Date.now(),
    }
    const safetyChecker = new CrawlSafetyChecker(safetyConfig)
    const duplicatesDetector = new NearDuplicatesDetector()
    const externalLinkChecker = new ExternalLinkChecker({ timeout: settings.timeout })

    if (settings.respectRobots) {
      await robotsParser.fetch()
      await storage.logEvent('INFO', 'Robots.txt fetched and parsed')
    }

    // Seed the frontier from XML sitemaps: those listed in robots.txt,
    // falling back to the conventional /sitemap.xml location.
    let sitemapUrls = robotsParser.getSitemaps()
    if (sitemapUrls.length === 0) {
      sitemapUrls = [new URL('/sitemap.xml', crawl.startUrl).href]
    }

    try {
      const sitemapResult = await fetchSitemapUrls(sitemapUrls, {
        maxUrls: settings.maxPages,
        timeout: settings.timeout,
      })

      let sitemapUrlsQueued = 0
      for (const sitemapPageUrl of sitemapResult.urls) {
        const safetyCheck = safetyChecker.isUrlSafe(sitemapPageUrl, 1)
        if (safetyCheck.safe && frontier.add(sitemapPageUrl, 1)) {
          sitemapUrlsQueued++
        }
      }

      if (sitemapResult.sitemapsProcessed > 0) {
        await storage.logEvent(
          'INFO',
          `Processed ${sitemapResult.sitemapsProcessed} sitemap(s): ${sitemapResult.urls.length} URLs found, ${sitemapUrlsQueued} queued`
        )
      }
      for (const sitemapError of sitemapResult.errors.slice(0, 5)) {
        await storage.logEvent('WARN', `Sitemap fetch failed: ${sitemapError}`)
      }
    } catch (error) {
      await storage.logEvent('WARN', `Sitemap processing failed: ${error}`)
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

          if (result.pageData.statusCode === 200) {
            duplicatesDetector.addPage(result.pageData.url, result.contentText)
          }

          pagesCrawled++

          for (const link of result.links) {
            if (link.isInternal) {
              frontier.add(link.url, depth + 1)
            } else {
              externalLinkChecker.addLink(result.pageData.url, link.url)
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

    const duplicateGroups = duplicatesDetector.findNearDuplicateGroups()
    await storage.logEvent(
      'INFO',
      `Found ${duplicateGroups.length} groups of duplicate or near-duplicate content`
    )

    for (const group of duplicateGroups) {
      const isExact = group.similarity >= 100
      for (const url of group.urls.slice(1)) {
        await storage.saveIssue({
          crawlId,
          issueType: 'DUPLICATE_CONTENT',
          url,
          severity: 'MEDIUM',
          impact: 'MEDIUM',
          difficulty: 'MEDIUM',
          title: isExact ? 'Duplicate Content' : 'Near-Duplicate Content',
          explanation: `This page's content is at least ${group.similarity}% similar to ${group.count - 1} other page(s). First found at: ${group.urls[0]}`,
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

    if (externalLinkChecker.uniqueTargetCount > 0) {
      await storage.logEvent(
        'INFO',
        `Validating ${externalLinkChecker.uniqueTargetCount} unique external links`
      )

      try {
        const externalCheck = await externalLinkChecker.checkAll()

        for (const [sourceUrl, brokenTargets] of externalCheck.brokenBySource.entries()) {
          const targetSummaries = brokenTargets
            .slice(0, 5)
            .map((t) => `${t.url} (${t.statusCode > 0 ? t.statusCode : t.error || 'unreachable'})`)
          await storage.saveIssue({
            crawlId,
            issueType: 'BROKEN_EXTERNAL_LINK',
            url: sourceUrl,
            severity: 'MEDIUM',
            impact: 'MEDIUM',
            difficulty: 'EASY',
            title: 'Broken External Links',
            explanation: `This page links to ${brokenTargets.length} external URL${brokenTargets.length === 1 ? '' : 's'} that could not be reached: ${targetSummaries.join(', ')}${brokenTargets.length > 5 ? ', …' : ''}`,
            fixSteps: [
              'Update or remove links to dead external pages',
              'Link to an archived copy if the original content is gone',
              'Check whether the destination site has moved the content',
            ],
          })
          issuesFound++
        }

        await storage.logEvent(
          'INFO',
          `External link check completed: ${externalCheck.checkedCount} checked, ${externalCheck.brokenCount} broken`
        )
      } catch (error) {
        await storage.logEvent('WARN', `External link validation failed: ${error}`)
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

    if (runPerformanceChecks) {
      try {
        // Sample the most prominent pages: shallowest first, then most linked
        const samplePages = await prisma.page.findMany({
          where: {
            crawlId,
            statusCode: 200,
            contentType: { contains: 'html' },
          },
          orderBy: [{ depth: 'asc' }, { internalLinkCount: 'desc' }],
          take: performanceMaxUrls,
          select: { url: true },
        })

        const sampleUrls = samplePages.map((page) => page.url)
        await storage.logEvent(
          'INFO',
          `Performance audit started (${performanceMode} mode, ${sampleUrls.length} pages)`
        )

        const performanceSummary = await runPerformanceAudit(
          crawlId,
          sampleUrls,
          performanceMode,
          storage
        )
        issuesFound += performanceSummary.issuesCreated

        await storage.logEvent(
          'INFO',
          `Performance audit completed: ${performanceSummary.urlsAudited} pages audited, ${performanceSummary.urlsFailed} failed, ${performanceSummary.issuesCreated} issues`
        )
      } catch (error) {
        await storage.logEvent('WARN', `Performance audit failed: ${error}`)
      }
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
