import { CrawlStorage } from '../jobs/storage'
import { IssueData } from '../extract/page-extractor'
import { PagePerformanceResult, PerformanceMetrics } from './performance-types'
import { PsiClient } from './psi-api'
import { runLocalLighthouse } from './lighthouse-runner'

export type PerformanceAuditMode = 'psi' | 'lighthouse'

// Google's Core Web Vitals thresholds (needs-improvement / poor)
const LCP_NEEDS_IMPROVEMENT = 2500
const LCP_POOR = 4000
const CLS_NEEDS_IMPROVEMENT = 0.1
const CLS_POOR = 0.25
const INP_NEEDS_IMPROVEMENT = 200
const INP_POOR = 500
const LOW_SCORE_THRESHOLD = 50

export interface PerformanceAuditSummary {
  urlsAudited: number
  urlsFailed: number
  issuesCreated: number
}

export async function runPerformanceAudit(
  crawlId: string,
  urls: string[],
  mode: PerformanceAuditMode,
  storage: CrawlStorage
): Promise<PerformanceAuditSummary> {
  const psiClient = mode === 'psi' ? new PsiClient() : null

  if (psiClient?.providerName === 'mock') {
    await storage.logEvent(
      'WARN',
      'Performance audit running in mock mode (set PSI_API_KEY or PERFORMANCE_API_PROVIDER=psi for live data)'
    )
  }

  let urlsAudited = 0
  let urlsFailed = 0
  let issuesCreated = 0

  for (const url of urls) {
    const result: PagePerformanceResult = psiClient
      ? await psiClient.fetchMetrics(url)
      : await runLocalLighthouse(url)

    if (result.error) {
      urlsFailed++
      await storage.logEvent('WARN', `Performance check failed for ${url}: ${result.error}`)
      continue
    }

    urlsAudited++

    if (result.lab) {
      await storage.savePerformance(url, result.lab)
    }
    if (result.field) {
      await storage.savePerformance(url, result.field)
    }

    for (const issue of buildIssues(crawlId, url, result)) {
      await storage.saveIssue(issue)
      issuesCreated++
    }
  }

  return { urlsAudited, urlsFailed, issuesCreated }
}

/**
 * Prefer real-user field data for issue detection; fall back to lab data.
 * INP only exists in field data; the performance score only in lab data.
 */
function buildIssues(crawlId: string, url: string, result: PagePerformanceResult): IssueData[] {
  const issues: IssueData[] = []
  const field = result.field
  const lab = result.lab

  const pick = (selector: (m: PerformanceMetrics) => number | undefined): { value: number; from: string } | null => {
    const fieldValue = field ? selector(field) : undefined
    if (fieldValue !== undefined) return { value: fieldValue, from: 'real-user (CrUX) data' }
    const labValue = lab ? selector(lab) : undefined
    if (labValue !== undefined) return { value: labValue, from: 'a Lighthouse lab test' }
    return null
  }

  const lcp = pick((m) => m.lcpMs)
  if (lcp && lcp.value > LCP_NEEDS_IMPROVEMENT) {
    const poor = lcp.value > LCP_POOR
    issues.push({
      crawlId,
      issueType: 'POOR_LCP',
      url,
      severity: poor ? 'HIGH' : 'MEDIUM',
      impact: 'HIGH',
      difficulty: 'MEDIUM',
      title: poor ? 'Poor Largest Contentful Paint' : 'LCP Needs Improvement',
      explanation: `Largest Contentful Paint is ${(lcp.value / 1000).toFixed(1)}s according to ${lcp.from}. Google considers over 2.5s in need of improvement and over 4s poor.`,
      fixSteps: [
        'Optimize and compress the largest above-the-fold image or text block',
        'Reduce server response time and use a CDN',
        'Eliminate render-blocking CSS and JavaScript',
        'Preload critical resources such as hero images and fonts',
      ],
    })
  }

  const cls = pick((m) => m.cls)
  if (cls && cls.value > CLS_NEEDS_IMPROVEMENT) {
    const poor = cls.value > CLS_POOR
    issues.push({
      crawlId,
      issueType: 'POOR_CLS',
      url,
      severity: poor ? 'HIGH' : 'MEDIUM',
      impact: 'MEDIUM',
      difficulty: 'MEDIUM',
      title: poor ? 'Poor Cumulative Layout Shift' : 'CLS Needs Improvement',
      explanation: `Cumulative Layout Shift is ${cls.value.toFixed(2)} according to ${cls.from}. Google considers over 0.1 in need of improvement and over 0.25 poor.`,
      fixSteps: [
        'Set explicit width and height attributes on images and embeds',
        'Reserve space for ads, banners, and late-loading content',
        'Avoid inserting content above existing content after load',
        'Use font-display: optional or preload web fonts to avoid layout jumps',
      ],
    })
  }

  const inp = field?.inpMs
  if (inp !== undefined && inp > INP_NEEDS_IMPROVEMENT) {
    const poor = inp > INP_POOR
    issues.push({
      crawlId,
      issueType: 'POOR_INP',
      url,
      severity: poor ? 'HIGH' : 'MEDIUM',
      impact: 'MEDIUM',
      difficulty: 'HARD',
      title: poor ? 'Poor Interaction to Next Paint' : 'INP Needs Improvement',
      explanation: `Interaction to Next Paint is ${inp}ms according to real-user (CrUX) data. Google considers over 200ms in need of improvement and over 500ms poor.`,
      fixSteps: [
        'Break up long JavaScript tasks on the main thread',
        'Reduce or defer third-party scripts',
        'Debounce expensive input handlers and avoid layout thrash',
        'Use web workers for heavy computation',
      ],
    })
  }

  const score = lab?.performanceScore
  if (score !== undefined && score < LOW_SCORE_THRESHOLD) {
    issues.push({
      crawlId,
      issueType: 'LOW_PERFORMANCE_SCORE',
      url,
      severity: 'MEDIUM',
      impact: 'HIGH',
      difficulty: 'MEDIUM',
      title: 'Low Lighthouse Performance Score',
      explanation: `This page scored ${score}/100 in a Lighthouse performance test. Scores below 50 indicate significant loading and interactivity problems.`,
      fixSteps: [
        'Review the individual Core Web Vitals findings for this page',
        'Compress images and serve modern formats (WebP/AVIF)',
        'Minify and code-split JavaScript bundles',
        'Enable text compression and browser caching',
      ],
    })
  }

  return issues
}
