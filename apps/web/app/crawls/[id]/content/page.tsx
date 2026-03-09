'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { IssuePanel, Issue } from '@/components/issue-panel'
import { Button } from '@/components/ui/button'
import { Download, FileText, Search, Type } from 'lucide-react'

interface PageRow {
  id: string
  url: string
  title: string | null
  metaDescription: string | null
  canonical: string | null
  statusCode: number | null
  wordCount: number | null
  h1Count: number
  imageCount: number
  imagesWithoutAlt: number
  hasStructuredData: boolean
  hasOpenGraph: boolean
  hasTwitterCard: boolean
  hasViewport: boolean
  hasHreflang: boolean
}

export default function ContentPage() {
  const params = useParams()
  const crawlId = params.id as string

  const [pages, setPages] = useState<PageRow[]>([])
  const [issues, setIssues] = useState<Issue[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null)
  const [isIssuePanelOpen, setIsIssuePanelOpen] = useState(false)

  useEffect(() => {
    void fetchData()
  }, [crawlId])

  const fetchData = async () => {
    setLoading(true)
    try {
      const contentIssueTypes = [
        'MISSING_TITLE',
        'SHORT_TITLE',
        'LONG_TITLE',
        'MISSING_META_DESCRIPTION',
        'SHORT_META_DESCRIPTION',
        'LONG_META_DESCRIPTION',
        'LOW_WORD_COUNT',
        'MISSING_H1',
        'MULTIPLE_H1',
        'MISSING_CANONICAL',
        'MISSING_OPEN_GRAPH',
        'MISSING_TWITTER_CARD',
        'MISSING_VIEWPORT',
        'MISSING_IMAGE_ALT',
      ]

      const [pagesRes, issuesRes] = await Promise.all([
        fetch(`/api/crawls/${crawlId}/pages?limit=10000`),
        fetch(`/api/crawls/${crawlId}/issues?types=${encodeURIComponent(contentIssueTypes.join(','))}&limit=10000`),
      ])

      if (pagesRes.ok) {
        const data = await pagesRes.json()
        setPages(data.pages || [])
      }

      if (issuesRes.ok) {
        const data = await issuesRes.json()
        setIssues(data.issues || [])
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleIssueClick = (issue: Issue) => {
    setSelectedIssue(issue)
    setIsIssuePanelOpen(true)
  }

  const handleExport = async () => {
    window.open(`/api/crawls/${crawlId}/export?type=pages`, '_blank')
  }

  const missingTitle = useMemo(() => pages.filter((page) => !page.title), [pages])
  const missingMeta = useMemo(() => pages.filter((page) => !page.metaDescription), [pages])
  const missingCanonical = useMemo(() => pages.filter((page) => !page.canonical), [pages])
  const searchAppearanceGaps = useMemo(
    () =>
      pages.filter(
        (page) =>
          !page.hasOpenGraph ||
          !page.hasTwitterCard ||
          !page.hasStructuredData ||
          !page.hasViewport ||
          !page.hasHreflang
      ),
    [pages]
  )
  const structureGaps = useMemo(
    () => pages.filter((page) => page.h1Count !== 1 || page.imagesWithoutAlt > 0),
    [pages]
  )

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Content</h1>
          <p className="text-muted-foreground">Titles, snippets, headings, social cards, and structured data</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
          <Download className="w-4 h-4" />
          Export
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        <MetricCard title="Pages" value={pages.length} />
        <MetricCard title="Missing Titles" value={missingTitle.length} icon={<Type className="h-4 w-4 text-yellow-500" />} />
        <MetricCard title="Missing Meta" value={missingMeta.length} icon={<FileText className="h-4 w-4 text-orange-500" />} />
        <MetricCard title="Missing Canonicals" value={missingCanonical.length} icon={<Search className="h-4 w-4 text-blue-500" />} />
        <MetricCard title="Search Gaps" value={searchAppearanceGaps.length} />
        <MetricCard title="Content Issues" value={issues.length} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Snippet Coverage</CardTitle>
            <CardDescription>Pages missing title, description, or canonical controls</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              data={pages.filter((page) => !page.title || !page.metaDescription || !page.canonical)}
              columns={[
                {
                  key: 'url',
                  header: 'URL',
                  cell: (row) => <span className="font-medium">{row.url}</span>,
                  sortable: true,
                },
                {
                  key: 'title',
                  header: 'Title',
                  cell: (row) => <SignalCell ok={Boolean(row.title)} okLabel="Present" missingLabel="Missing" />,
                },
                {
                  key: 'metaDescription',
                  header: 'Meta',
                  cell: (row) => <SignalCell ok={Boolean(row.metaDescription)} okLabel="Present" missingLabel="Missing" />,
                },
                {
                  key: 'canonical',
                  header: 'Canonical',
                  cell: (row) => <SignalCell ok={Boolean(row.canonical)} okLabel="Present" missingLabel="Missing" />,
                },
              ]}
              isLoading={loading}
              emptyMessage="All crawled pages have title, meta, and canonical coverage."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Search Appearance Gaps</CardTitle>
            <CardDescription>Social cards, schema, viewport, and hreflang opportunities</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              data={searchAppearanceGaps}
              columns={[
                {
                  key: 'url',
                  header: 'URL',
                  cell: (row) => <span className="font-medium">{row.url}</span>,
                  sortable: true,
                },
                {
                  key: 'hasOpenGraph',
                  header: 'OG',
                  cell: (row) => <SignalCell ok={row.hasOpenGraph} okLabel="Good" missingLabel="Missing" />,
                },
                {
                  key: 'hasTwitterCard',
                  header: 'Twitter',
                  cell: (row) => <SignalCell ok={row.hasTwitterCard} okLabel="Good" missingLabel="Missing" />,
                },
                {
                  key: 'hasStructuredData',
                  header: 'Schema',
                  cell: (row) => <SignalCell ok={row.hasStructuredData} okLabel="Present" missingLabel="None" />,
                },
                {
                  key: 'hasViewport',
                  header: 'Viewport',
                  cell: (row) => <SignalCell ok={row.hasViewport} okLabel="Present" missingLabel="Missing" />,
                },
                {
                  key: 'hasHreflang',
                  header: 'Hreflang',
                  cell: (row) => <SignalCell ok={row.hasHreflang} okLabel="Present" missingLabel="None" />,
                },
              ]}
              isLoading={loading}
              emptyMessage="Search appearance signals look complete on crawled pages."
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Heading And Image Diagnostics</CardTitle>
          <CardDescription>Find pages with heading structure problems or missing alt text</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={structureGaps}
            columns={[
              {
                key: 'url',
                header: 'URL',
                cell: (row) => <span className="font-medium">{row.url}</span>,
                sortable: true,
              },
              {
                key: 'h1Count',
                header: 'H1 Count',
                cell: (row) => <span className="text-sm">{row.h1Count}</span>,
                sortable: true,
              },
              {
                key: 'imageCount',
                header: 'Images',
                cell: (row) => <span className="text-sm">{row.imageCount}</span>,
                sortable: true,
              },
              {
                key: 'imagesWithoutAlt',
                header: 'Missing Alt',
                cell: (row) => <span className="text-sm">{row.imagesWithoutAlt}</span>,
                sortable: true,
              },
              {
                key: 'wordCount',
                header: 'Words',
                cell: (row) => <span className="text-sm">{row.wordCount || 0}</span>,
                sortable: true,
              },
            ]}
            isLoading={loading}
            emptyMessage="No heading or image accessibility gaps detected."
          />
        </CardContent>
      </Card>

      {issues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Content Issues</CardTitle>
            <CardDescription>All content and search-appearance findings for this crawl</CardDescription>
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
                      <div className="text-xs text-muted-foreground">{row.url}</div>
                    </div>
                  ),
                  sortable: true,
                },
                {
                  key: 'issueType',
                  header: 'Type',
                  cell: (row) => <span className="text-sm font-mono">{row.issueType}</span>,
                },
                {
                  key: 'severity',
                  header: 'Severity',
                  cell: (row) => (
                    <span className="rounded bg-yellow-500 px-2 py-1 text-xs text-white">
                      {row.severity}
                    </span>
                  ),
                },
              ]}
              onRowClick={handleIssueClick}
            />
          </CardContent>
        </Card>
      )}

      <IssuePanel
        issue={selectedIssue}
        isOpen={isIssuePanelOpen}
        onClose={() => setIsIssuePanelOpen(false)}
      />
    </div>
  )
}

function MetricCard({
  title,
  value,
  icon,
}: {
  title: string
  value: number
  icon?: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  )
}

function SignalCell({
  ok,
  okLabel,
  missingLabel,
}: {
  ok: boolean
  okLabel: string
  missingLabel: string
}) {
  return (
    <span className={`rounded px-2 py-1 text-xs ${ok ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
      {ok ? okLabel : missingLabel}
    </span>
  )
}
