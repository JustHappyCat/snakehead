'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { FilterDrawer, FilterState } from '@/components/filter-drawer'
import { IssuePanel, Issue } from '@/components/issue-panel'
import { Button } from '@/components/ui/button'
import {
  AlertTriangle,
  Download,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from 'lucide-react'

interface PageRow {
  id: string
  url: string
  finalUrl: string | null
  statusCode: number | null
  loadTimeMs: number | null
  depth: number
}

interface SummaryResponse {
  crawl?: {
    settingsJson?: string | null
  }
}

const SECURITY_ISSUE_TYPES = [
  'HTTPS_DISABLED',
  'MISSING_SECURITY_HEADERS',
  'WEAK_CONTENT_SECURITY_POLICY',
  'INSECURE_COOKIE_FLAGS',
  'PERMISSIVE_CORS',
  'TECH_STACK_EXPOSED',
  'OPEN_PORTS_EXPOSED',
]

const HEALTH_ISSUE_TYPES = ['BROKEN_PAGE', 'REDIRECT', ...SECURITY_ISSUE_TYPES]

export default function HealthPage() {
  const params = useParams()
  const crawlId = params.id as string

  const [pages, setPages] = useState<PageRow[]>([])
  const [issues, setIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null)
  const [isIssuePanelOpen, setIsIssuePanelOpen] = useState(false)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [filters, setFilters] = useState<FilterState>({})
  const [securityAuditEnabled, setSecurityAuditEnabled] = useState(false)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        const pageParams = new URLSearchParams()
        pageParams.set('limit', '10000')
        if (filters.search) pageParams.set('search', filters.search)
        if (filters.statusCodes?.length) pageParams.set('statusCodes', filters.statusCodes.join(','))

        const issueParams = new URLSearchParams()
        issueParams.set('limit', '10000')
        issueParams.set('types', (filters.issues?.length ? filters.issues : HEALTH_ISSUE_TYPES).join(','))
        if (filters.search) issueParams.set('search', filters.search)

        const [pagesRes, issuesRes, summaryRes] = await Promise.all([
          fetch(`/api/crawls/${crawlId}/pages?${pageParams}`),
          fetch(`/api/crawls/${crawlId}/issues?${issueParams}`),
          fetch(`/api/crawls/${crawlId}/summary`, { cache: 'no-store' }),
        ])

        if (!pagesRes.ok || !issuesRes.ok || !summaryRes.ok) {
          throw new Error('Failed to load site health data')
        }

        const [pagesData, issuesData, summaryData] = await Promise.all([
          pagesRes.json(),
          issuesRes.json(),
          summaryRes.json() as Promise<SummaryResponse>,
        ])

        if (cancelled) return

        const parsedSettings = summaryData?.crawl?.settingsJson
          ? JSON.parse(summaryData.crawl.settingsJson)
          : {}

        setPages(Array.isArray(pagesData.pages) ? pagesData.pages : [])
        setIssues(Array.isArray(issuesData.issues) ? issuesData.issues : [])
        setSecurityAuditEnabled(Boolean(parsedSettings.securityAudit))
      } catch (fetchError) {
        if (cancelled) return
        console.error('Failed to fetch site health data:', fetchError)
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to load site health data')
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [crawlId, filters])

  const brokenPages = useMemo(
    () => pages.filter((page) => (page.statusCode || 0) >= 400),
    [pages]
  )

  const redirectPages = useMemo(
    () => pages.filter((page) => Boolean(page.finalUrl) && page.finalUrl !== page.url),
    [pages]
  )

  const redirectIssues = useMemo(
    () => issues.filter((issue) => issue.issueType === 'REDIRECT'),
    [issues]
  )

  const securityIssues = useMemo(
    () => issues.filter((issue) => SECURITY_ISSUE_TYPES.includes(issue.issueType)),
    [issues]
  )

  const serverErrors = useMemo(
    () => pages.filter((page) => (page.statusCode || 0) >= 500),
    [pages]
  )

  const handleExport = () => {
    window.open(`/api/crawls/${crawlId}/export?type=issues`, '_blank')
  }

  const handleIssueClick = (issue: Issue) => {
    setSelectedIssue(issue)
    setIsIssuePanelOpen(true)
  }

  const statusBadgeColor = (statusCode: number | null) => {
    const value = statusCode || 0
    if (value >= 500) return 'bg-red-700 text-white'
    if (value >= 400) return 'bg-red-500 text-white'
    if (value >= 300) return 'bg-yellow-500 text-white'
    if (value === 200) return 'bg-green-500 text-white'
    return 'bg-gray-500 text-white'
  }

  const severityBadgeColor = (severity: Issue['severity']) => {
    if (severity === 'CRITICAL') return 'bg-red-700 text-white'
    if (severity === 'HIGH') return 'bg-red-500 text-white'
    if (severity === 'MEDIUM') return 'bg-yellow-500 text-white'
    return 'bg-green-500 text-white'
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Site Health</h1>
          <p className="text-muted-foreground">Broken pages, meaningful redirects, and security findings in one view</p>
        </div>
        <div className="flex items-center gap-2">
          <FilterDrawer
            isOpen={isFilterOpen}
            onOpenChange={setIsFilterOpen}
            filters={filters}
            onFiltersChange={setFilters}
            availableFilters={{
              statusCodes: ['200', '301', '302', '404', '500'],
              issues: HEALTH_ISSUE_TYPES,
            }}
          />
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Export Issues
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-destructive/40">
          <CardContent className="py-4 text-sm text-destructive">
            {error}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <XCircle className="h-4 w-4 text-destructive" />
              Broken Pages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{brokenPages.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Redirect Paths
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{redirectPages.length}</div>
            <p className="text-xs text-muted-foreground">{redirectIssues.length} redirect issues saved</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              {securityAuditEnabled ? <ShieldAlert className="h-4 w-4 text-amber-500" /> : <ShieldCheck className="h-4 w-4 text-emerald-500" />}
              Security Findings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{securityIssues.length}</div>
            <p className="text-xs text-muted-foreground">
              {securityAuditEnabled ? 'Advanced security audit enabled' : 'Audit disabled for this crawl'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Server Errors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{serverErrors.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Broken Pages & Errors</CardTitle>
            <CardDescription>Pages returning 4xx or 5xx responses</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              data={brokenPages}
              columns={[
                {
                  key: 'url',
                  header: 'URL',
                  cell: (row) => (
                    <a
                      href={row.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 font-medium text-primary hover:underline"
                    >
                      {row.url}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ),
                  sortable: true,
                },
                {
                  key: 'statusCode',
                  header: 'Status',
                  cell: (row) => (
                    <span className={`rounded px-2 py-1 text-xs ${statusBadgeColor(row.statusCode)}`}>
                      {row.statusCode ?? 'N/A'}
                    </span>
                  ),
                  sortable: true,
                },
                {
                  key: 'loadTimeMs',
                  header: 'Measured Time',
                  cell: (row) => <span className="text-sm">{row.loadTimeMs || 0} ms</span>,
                  sortable: true,
                },
                {
                  key: 'depth',
                  header: 'Depth',
                  cell: (row) => <span className="text-sm">{row.depth}</span>,
                  sortable: true,
                },
              ]}
              isLoading={loading}
              emptyMessage="No broken pages found"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Redirect Targets</CardTitle>
            <CardDescription>Only meaningful redirects are listed. Slash-only normalization is ignored.</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              data={redirectPages}
              columns={[
                {
                  key: 'url',
                  header: 'From',
                  cell: (row) => <span className="font-medium">{row.url}</span>,
                  sortable: true,
                },
                {
                  key: 'finalUrl',
                  header: 'To',
                  cell: (row) => (
                    <a
                      href={row.finalUrl || row.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {row.finalUrl || row.url}
                    </a>
                  ),
                  sortable: true,
                },
                {
                  key: 'loadTimeMs',
                  header: 'Measured Time',
                  cell: (row) => <span className="text-sm">{row.loadTimeMs || 0} ms</span>,
                  sortable: true,
                },
              ]}
              isLoading={loading}
              emptyMessage="No meaningful redirects found"
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Security Audit</CardTitle>
          <CardDescription>
            Common white-hat checks for HTTPS, headers, cookies, CORS, stack exposure, and common internet-facing ports
          </CardDescription>
        </CardHeader>
        <CardContent>
          {securityAuditEnabled ? (
            <DataTable
              data={securityIssues}
              columns={[
                {
                  key: 'title',
                  header: 'Finding',
                  cell: (row) => (
                    <div>
                      <div className="font-medium">{row.title}</div>
                      <div className="text-xs text-muted-foreground">{row.issueType}</div>
                    </div>
                  ),
                  sortable: true,
                },
                {
                  key: 'severity',
                  header: 'Severity',
                  cell: (row) => (
                    <span className={`rounded px-2 py-1 text-xs ${severityBadgeColor(row.severity)}`}>
                      {row.severity}
                    </span>
                  ),
                  sortable: true,
                },
                {
                  key: 'url',
                  header: 'Target',
                  cell: (row) => (
                    <a
                      href={row.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      {row.url}
                    </a>
                  ),
                },
              ]}
              onRowClick={handleIssueClick}
              isLoading={loading}
              emptyMessage="No security findings were recorded for this crawl"
            />
          ) : (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              Security audit was not enabled for this crawl. Start a new crawl in Advanced mode and toggle on Security Audit to run the common checks.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Health Issues</CardTitle>
          <CardDescription>Click any finding for details and fix steps</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={issues}
            columns={[
              {
                key: 'title',
                header: 'Issue',
                cell: (row) => (
                  <div>
                    <div className="font-medium">{row.title}</div>
                    <div className="text-xs text-muted-foreground">{row.issueType}</div>
                  </div>
                ),
                sortable: true,
              },
              {
                key: 'severity',
                header: 'Severity',
                cell: (row) => (
                  <span className={`rounded px-2 py-1 text-xs ${severityBadgeColor(row.severity)}`}>
                    {row.severity}
                  </span>
                ),
                sortable: true,
              },
              {
                key: 'url',
                header: 'Affected URL',
                cell: (row) => (
                  <a
                    href={row.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline"
                  >
                    {row.url}
                  </a>
                ),
              },
            ]}
            onRowClick={handleIssueClick}
            isLoading={loading}
            emptyMessage="No health issues found"
          />
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
