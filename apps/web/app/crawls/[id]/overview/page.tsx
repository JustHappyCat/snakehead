'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/stat-card'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { IssuePanel } from '@/components/issue-panel'
import {
  AlertTriangle,
  Clock3,
  Globe,
  Link2,
  Search,
  ShieldCheck,
} from 'lucide-react'

interface Issue {
  id: string
  issueType: string
  url: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  impact: 'HIGH' | 'MEDIUM' | 'LOW'
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'
  title: string
  explanation: string
  fixStepsJson?: string
}

interface FixOrderItem {
  issue: Issue
  score: number
  importance: string
}

interface CrawlSummary {
  crawl: {
    id: string
    startUrl: string
    status: string
    createdAt: string
    startedAt: string | null
    finishedAt: string | null
  }
  stats: {
    pages: number
    issues: number
    links: number
    internalLinks: number
    externalLinks: number
    nofollowLinks: number
    indexablePages: number
    notIndexablePages: number
    avgLoadTimeMs: number
    avgWordCount: number
    avgInternalLinks: number
    avgImagesPerPage: number
    avgImagesMissingAlt: number
    maxDepth: number
    pagesWithTitles: number
    pagesWithMetaDescriptions: number
    pagesWithCanonicals: number
    pagesWithH1: number
    pagesWithImages: number
    pagesWithMissingAlt: number
    pagesWithStructuredData: number
    pagesWithOpenGraph: number
    pagesWithTwitterCards: number
    pagesWithViewport: number
    pagesWithHreflang: number
    pagesWithoutTitles: number
    pagesWithoutMetaDescriptions: number
    pagesWithoutCanonicals: number
    pagesWithoutH1: number
    pagesWithoutStructuredData: number
    pagesWithoutOpenGraph: number
    pagesWithoutTwitterCards: number
    pagesWithoutViewport: number
    pagesWithoutHreflang: number
    errorEvents: number
    serpRecords: number
  }
  distributions: {
    statusCodes: Array<{ code: number; count: number }>
    severity: Array<{ severity: string; count: number }>
    issueTypes: Array<{ issueType: string; count: number }>
  }
  topSlowPages: Array<{
    id: string
    url: string
    title: string | null
    loadTimeMs: number | null
    statusCode: number | null
    depth: number
  }>
  topIssues: FixOrderItem[]
  recentEvents: Array<{
    id: string
    ts: string
    level: string
    message: string
  }>
}

export default function OverviewPage() {
  const params = useParams()
  const router = useRouter()
  const crawlId = params.id as string

  const [summary, setSummary] = useState<CrawlSummary | null>(null)
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null)
  const [isIssuePanelOpen, setIsIssuePanelOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void fetchSummary()
  }, [crawlId])

  useEffect(() => {
    if (summary?.crawl.status !== 'RUNNING') {
      return
    }

    const interval = setInterval(() => {
      void fetchSummary()
    }, 2500)

    return () => clearInterval(interval)
  }, [summary?.crawl.status, crawlId])

  const fetchSummary = async () => {
    try {
      const response = await fetch(`/api/crawls/${crawlId}/summary`, { cache: 'no-store' })
      if (!response.ok) {
        throw new Error('Failed to load crawl summary')
      }

      const data = await response.json()
      setSummary(data)
    } catch (error) {
      console.error('Failed to fetch crawl summary:', error)
    } finally {
      setLoading(false)
    }
  }

  const totalPages = summary?.stats.pages || 0

  const stats = useMemo(() => {
    if (!summary) return []

    const indexabilityRate = totalPages > 0
      ? `${Math.round((summary.stats.indexablePages / totalPages) * 100)}%`
      : '0%'
    const searchAppearanceCoverage = totalPages > 0
      ? Math.round(
          (
            summary.stats.pagesWithOpenGraph +
            summary.stats.pagesWithTwitterCards +
            summary.stats.pagesWithViewport +
            summary.stats.pagesWithStructuredData
          ) /
            (totalPages * 4) *
            100
        )
      : 0

    return [
      {
        title: 'Pages Crawled',
        value: summary.stats.pages,
        description: `${summary.stats.maxDepth} max depth reached`,
        icon: <Globe className="h-5 w-5 text-blue-500" />,
      },
      {
        title: 'Issues Found',
        value: summary.stats.issues,
        description: `${summary.stats.errorEvents} crawl errors logged`,
        icon: <AlertTriangle className="h-5 w-5 text-orange-500" />,
      },
      {
        title: 'Indexability',
        value: indexabilityRate,
        description: `${summary.stats.notIndexablePages} blocked pages`,
        icon: <Search className="h-5 w-5 text-emerald-500" />,
      },
      {
        title: 'Measured Load Time',
        value: `${summary.stats.avgLoadTimeMs} ms`,
        description: `Uncached crawl timing, ${summary.stats.avgImagesPerPage} images per page`,
        icon: <Clock3 className="h-5 w-5 text-violet-500" />,
      },
      {
        title: 'Internal Link Density',
        value: summary.stats.avgInternalLinks,
        description: `${summary.stats.internalLinks} total internal links`,
        icon: <Link2 className="h-5 w-5 text-sky-500" />,
      },
      {
        title: 'Search Appearance',
        value: `${searchAppearanceCoverage}%`,
        description: `${summary.stats.pagesWithStructuredData} pages with schema`,
        icon: <ShieldCheck className="h-5 w-5 text-fuchsia-500" />,
      },
    ]
  }, [summary, totalPages])

  const severityBadgeColor = (severity: string) => {
    const colors = {
      CRITICAL: 'bg-red-500 text-white',
      HIGH: 'bg-orange-500 text-white',
      MEDIUM: 'bg-yellow-500 text-white',
      LOW: 'bg-green-500 text-white',
    }

    return colors[severity as keyof typeof colors] || 'bg-gray-500 text-white'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Crawl summary is unavailable.
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Overview</h1>
          <p className="text-muted-foreground">
            {summary.crawl.startUrl} - {summary.crawl.status}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push(`/crawls/${crawlId}/health`)}>
            Site health
          </Button>
          <Button variant="outline" size="sm" onClick={() => router.push(`/crawls/${crawlId}/exports`)}>
            Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {stats.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Status Code Distribution</CardTitle>
            <CardDescription>Real crawl responses grouped by HTTP status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.distributions.statusCodes.length > 0 ? (
              summary.distributions.statusCodes.map((status) => {
                const percentage = totalPages > 0 ? Math.round((status.count / totalPages) * 100) : 0
                const color =
                  status.code === 0
                    ? 'bg-slate-500'
                    : status.code >= 500
                    ? 'bg-red-700'
                    : status.code >= 400
                    ? 'bg-red-500'
                    : status.code >= 300
                    ? 'bg-yellow-500'
                    : 'bg-green-500'

                return (
                  <div key={status.code} className="flex items-center gap-3">
                    <div className={`h-3 w-3 rounded-full ${color}`} />
                    <div className="flex-1">
                      <div className="mb-1 flex justify-between text-sm">
                        <span>{status.code === 0 ? '0 (No Response)' : status.code}</span>
                        <span className="text-muted-foreground">
                          {status.count} pages - {percentage}%
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted">
                        <div className={`h-2 rounded-full ${color}`} style={{ width: `${percentage}%` }} />
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="text-sm text-muted-foreground">No status code data yet.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Metadata Coverage</CardTitle>
            <CardDescription>Core indexing and snippet signals across crawled pages</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <CoverageRow
              label="Title tags"
              complete={summary.stats.pagesWithTitles}
              missing={summary.stats.pagesWithoutTitles}
              total={totalPages}
            />
            <CoverageRow
              label="Meta descriptions"
              complete={summary.stats.pagesWithMetaDescriptions}
              missing={summary.stats.pagesWithoutMetaDescriptions}
              total={totalPages}
            />
            <CoverageRow
              label="Canonical tags"
              complete={summary.stats.pagesWithCanonicals}
              missing={summary.stats.pagesWithoutCanonicals}
              total={totalPages}
            />
            <CoverageRow
              label="Primary headings"
              complete={summary.stats.pagesWithH1}
              missing={summary.stats.pagesWithoutH1}
              total={totalPages}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Search Appearance</CardTitle>
            <CardDescription>Social, mobile, schema, and hreflang coverage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <CoverageRow
              label="Open Graph"
              complete={summary.stats.pagesWithOpenGraph}
              missing={summary.stats.pagesWithoutOpenGraph}
              total={totalPages}
            />
            <CoverageRow
              label="Twitter cards"
              complete={summary.stats.pagesWithTwitterCards}
              missing={summary.stats.pagesWithoutTwitterCards}
              total={totalPages}
            />
            <CoverageRow
              label="Viewport tag"
              complete={summary.stats.pagesWithViewport}
              missing={summary.stats.pagesWithoutViewport}
              total={totalPages}
            />
            <CoverageRow
              label="Structured data"
              complete={summary.stats.pagesWithStructuredData}
              missing={summary.stats.pagesWithoutStructuredData}
              total={totalPages}
            />
            <CoverageRow
              label="Hreflang"
              complete={summary.stats.pagesWithHreflang}
              missing={summary.stats.pagesWithoutHreflang}
              total={totalPages}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Link Architecture</CardTitle>
            <CardDescription>Internal distribution and crawl path density</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <SummaryTile label="Internal links" value={summary.stats.internalLinks} icon={<Link2 className="h-4 w-4" />} />
              <SummaryTile label="External links" value={summary.stats.externalLinks} icon={<Globe className="h-4 w-4" />} />
              <SummaryTile label="Nofollow" value={summary.stats.nofollowLinks} icon={<ShieldCheck className="h-4 w-4" />} />
              <SummaryTile label="SERP records" value={summary.stats.serpRecords} icon={<Search className="h-4 w-4" />} />
            </div>
            <div className="rounded-md border bg-muted/30 p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Average internal links per page</div>
              <div className="mt-1 text-2xl font-semibold">{summary.stats.avgInternalLinks}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Content Structure</CardTitle>
            <CardDescription>Heading and image quality across the crawl</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <CoverageRow
              label="Pages with images"
              complete={summary.stats.pagesWithImages}
              missing={Math.max(0, totalPages - summary.stats.pagesWithImages)}
              total={totalPages}
            />
            <CoverageRow
              label="Pages without alt gaps"
              complete={Math.max(0, summary.stats.pagesWithImages - summary.stats.pagesWithMissingAlt)}
              missing={summary.stats.pagesWithMissingAlt}
              total={Math.max(summary.stats.pagesWithImages, 1)}
            />
            <div className="grid grid-cols-2 gap-3">
              <SummaryTile label="Avg images/page" value={summary.stats.avgImagesPerPage} icon={<Globe className="h-4 w-4" />} />
              <SummaryTile label="Avg missing alt" value={summary.stats.avgImagesMissingAlt} icon={<AlertTriangle className="h-4 w-4" />} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Issue Types</CardTitle>
            <CardDescription>Most common findings in this crawl</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.distributions.issueTypes.slice(0, 6).map((issueType) => (
              <div key={issueType.issueType} className="flex items-center justify-between rounded-md border px-3 py-2">
                <span className="text-sm font-medium">{formatIssueLabel(issueType.issueType)}</span>
                <span className="text-sm text-muted-foreground">{issueType.count}</span>
              </div>
            ))}
            {summary.distributions.issueTypes.length === 0 && (
              <div className="text-sm text-muted-foreground">No issues detected yet.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Slowest Pages</CardTitle>
            <CardDescription>Pages with the highest measured crawl timing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.topSlowPages.map((page) => (
              <div key={page.id} className="rounded-md border px-3 py-2">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{page.url}</div>
                    <div className="text-xs text-muted-foreground">
                      {page.statusCode ?? 'N/A'} - depth {page.depth}
                    </div>
                  </div>
                  <div className="shrink-0 text-sm font-semibold">{page.loadTimeMs || 0} ms</div>
                </div>
              </div>
            ))}
            {summary.topSlowPages.length === 0 && (
              <div className="text-sm text-muted-foreground">No page timing data yet.</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Fix Order
            </span>
            <Button variant="ghost" size="sm" onClick={() => router.push(`/crawls/${crawlId}/health`)}>
              View full audit
            </Button>
          </CardTitle>
          <CardDescription>Highest-impact fixes surfaced from severity, impact, and effort</CardDescription>
        </CardHeader>
        <CardContent>
          {summary.topIssues.length > 0 ? (
            <DataTable
              data={summary.topIssues}
              columns={[
                {
                  key: 'importance',
                  header: 'Priority',
                  cell: (row) => (
                    <span className={`rounded px-2 py-1 text-xs font-medium ${priorityClassName(row.importance)}`}>
                      {row.importance}
                    </span>
                  ),
                },
                {
                  key: 'title',
                  header: 'Issue',
                  cell: (row) => (
                    <div>
                      <div className="font-medium">{row.issue.title}</div>
                      <div className="text-xs text-muted-foreground">{row.issue.url}</div>
                    </div>
                  ),
                },
                {
                  key: 'severity',
                  header: 'Severity',
                  cell: (row) => (
                    <span className={`rounded px-2 py-1 text-xs ${severityBadgeColor(row.issue.severity)}`}>
                      {row.issue.severity}
                    </span>
                  ),
                },
                {
                  key: 'difficulty',
                  header: 'Difficulty',
                  cell: (row) => <span className="text-sm">{row.issue.difficulty}</span>,
                },
              ]}
              onRowClick={(row) => {
                setSelectedIssue(row.issue)
                setIsIssuePanelOpen(true)
              }}
            />
          ) : (
            <div className="py-8 text-center text-muted-foreground">No issues found.</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Crawl Events</CardTitle>
          <CardDescription>Latest worker messages for this crawl</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {summary.recentEvents.map((event) => (
            <div key={event.id} className="flex items-start gap-3 rounded-md border px-3 py-2">
              <span className={`mt-0.5 rounded px-2 py-0.5 text-xs ${eventLevelClassName(event.level)}`}>
                {event.level}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm">{event.message}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(event.ts).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
          {summary.recentEvents.length === 0 && (
            <div className="text-sm text-muted-foreground">No crawl events yet.</div>
          )}
        </CardContent>
      </Card>

      <IssuePanel
        issue={selectedIssue}
        isOpen={isIssuePanelOpen}
        onClose={() => setIsIssuePanelOpen(false)}
      />
    </div>
  )
}

function CoverageRow({
  label,
  complete,
  missing,
  total,
}: {
  label: string
  complete: number
  missing: number
  total: number
}) {
  const safeTotal = Math.max(total, 1)
  const percentage = Math.round((complete / safeTotal) * 100)

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground">
          {complete}/{safeTotal} - {percentage}%
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted">
        <div className="h-2 rounded-full bg-primary" style={{ width: `${percentage}%` }} />
      </div>
      <div className="text-xs text-muted-foreground">{missing} missing</div>
    </div>
  )
}

function SummaryTile({
  label,
  value,
  icon,
}: {
  label: string
  value: number
  icon: ReactNode
}) {
  return (
    <div className="rounded-md bg-muted/50 p-3">
      <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  )
}

function formatIssueLabel(issueType: string) {
  return issueType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())
}

function priorityClassName(priority: string) {
  if (priority === 'Fix First') return 'bg-red-500 text-white'
  if (priority === 'Priority') return 'bg-orange-500 text-white'
  if (priority === 'Important') return 'bg-yellow-500 text-black'
  if (priority === 'Quick Win') return 'bg-emerald-500 text-white'
  return 'bg-slate-200 text-slate-800'
}

function eventLevelClassName(level: string) {
  if (level === 'ERROR') return 'bg-red-500 text-white'
  if (level === 'WARN') return 'bg-yellow-500 text-black'
  return 'bg-emerald-500 text-white'
}

