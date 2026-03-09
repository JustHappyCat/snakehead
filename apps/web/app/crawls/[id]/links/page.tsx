'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { Download, ExternalLink, Link2, ShieldCheck } from 'lucide-react'
import { IssuePanel, Issue } from '@/components/issue-panel'

interface CrawlLink {
  id: string
  fromUrl: string
  toUrl: string
  isInternal: boolean
  anchorText?: string | null
  isNofollow: boolean
}

interface LinksResponse {
  links: CrawlLink[]
  summary: {
    total: number
    internal: number
    external: number
    nofollow: number
  }
}

interface PageRow {
  url: string
  statusCode: number | null
  finalUrl: string | null
  internalLinkCount: number
}

export default function LinksPage() {
  const params = useParams()
  const crawlId = params.id as string
  
  const [links, setLinks] = useState<CrawlLink[]>([])
  const [pages, setPages] = useState<PageRow[]>([])
  const [issues, setIssues] = useState<Issue[]>([])
  const [summary, setSummary] = useState<LinksResponse['summary'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null)
  const [isIssuePanelOpen, setIsIssuePanelOpen] = useState(false)

  useEffect(() => {
    void fetchData()
  }, [crawlId])

  const fetchData = async () => {
    setLoading(true)
    try {
      const issueTypes = ['BROKEN_INTERNAL_LINK', 'INTERNAL_LINK_TO_REDIRECT', 'DEAD_END_PAGE']
      const [linksRes, pagesRes, issuesRes] = await Promise.all([
        fetch(`/api/crawls/${crawlId}/links?limit=10000`),
        fetch(`/api/crawls/${crawlId}/pages?limit=10000`),
        fetch(`/api/crawls/${crawlId}/issues?types=${encodeURIComponent(issueTypes.join(','))}&limit=10000`),
      ])

      if (linksRes.ok) {
        const data: LinksResponse = await linksRes.json()
        setLinks(data.links || [])
        setSummary(data.summary)
      }

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

  const handleExport = async () => {
    window.open(`/api/crawls/${crawlId}/export?type=links`, '_blank')
  }

  const topLinkedDestinations = useMemo(() => {
    const counts = new Map<string, number>()
    const internalLinks = links.filter((link) => link.isInternal)
    for (const link of internalLinks) {
      counts.set(link.toUrl, (counts.get(link.toUrl) || 0) + 1)
    }

    const pagesByUrl = new Map(pages.map((page) => [page.url, page]))

    return Array.from(counts.entries())
      .map(([url, count]) => ({
        url,
        count,
        statusCode: pagesByUrl.get(url)?.statusCode ?? null,
        finalUrl: pagesByUrl.get(url)?.finalUrl ?? null,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 50)
  }, [links, pages])

  const deadEndPages = useMemo(
    () => pages.filter((page) => (page.statusCode || 0) === 200 && page.internalLinkCount === 0),
    [pages]
  )

  const brokenLinkSources = issues.filter((issue) => issue.issueType === 'BROKEN_INTERNAL_LINK')
  const redirectLinkSources = issues.filter((issue) => issue.issueType === 'INTERNAL_LINK_TO_REDIRECT')

  const linkColumns = [
    {
      key: 'fromUrl',
      header: 'From URL',
      cell: (row: CrawlLink) => (
        <span className="font-medium">{row.fromUrl}</span>
      ),
      sortable: true,
    },
    {
      key: 'toUrl',
      header: 'To URL',
      cell: (row: CrawlLink) => (
        <a
          href={row.toUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          {row.toUrl}
          <ExternalLink className="w-3 h-3" />
        </a>
      ),
      sortable: true,
    },
    {
      key: 'anchorText',
      header: 'Anchor Text',
      cell: (row: CrawlLink) => (
        <span className="text-sm">{row.anchorText?.trim() || 'No anchor text'}</span>
      ),
      sortable: true,
    },
    {
      key: 'isInternal',
      header: 'Type',
      cell: (row: CrawlLink) => (
        <span className={`rounded px-2 py-1 text-xs ${row.isInternal ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>
          {row.isInternal ? 'Internal' : 'External'}
        </span>
      ),
    },
    {
      key: 'isNofollow',
      header: 'Follow',
      cell: (row: CrawlLink) => (
        <span className={`rounded px-2 py-1 text-xs ${row.isNofollow ? 'bg-yellow-100 text-yellow-800' : 'bg-slate-100 text-slate-700'}`}>
          {row.isNofollow ? 'Nofollow' : 'Follow'}
        </span>
      ),
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Links</h1>
          <p className="text-muted-foreground">View internal and external links, backlink structure</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
          <Download className="w-4 h-4" />
          Export
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        <MetricCard title="Internal Links" value={summary?.internal || 0} icon={<Link2 className="w-4 h-4 text-blue-500" />} />
        <MetricCard title="External Links" value={summary?.external || 0} />
        <MetricCard title="Nofollow" value={summary?.nofollow || 0} icon={<ShieldCheck className="w-4 h-4 text-yellow-500" />} />
        <MetricCard title="Broken Sources" value={brokenLinkSources.length} />
        <MetricCard title="Redirect Sources" value={redirectLinkSources.length} />
        <MetricCard title="Dead-End Pages" value={deadEndPages.length} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Linked Internal Pages</CardTitle>
            <CardDescription>Pages receiving the most internal links</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              data={topLinkedDestinations}
              columns={[
                {
                  key: 'url',
                  header: 'Destination URL',
                  cell: (row) => <span className="font-medium">{row.url}</span>,
                  sortable: true,
                },
                {
                  key: 'count',
                  header: 'Links In',
                  cell: (row) => <span className="text-sm">{row.count}</span>,
                  sortable: true,
                },
                {
                  key: 'statusCode',
                  header: 'Status',
                  cell: (row) => <span className="text-sm">{row.statusCode ?? 'N/A'}</span>,
                },
                {
                  key: 'finalUrl',
                  header: 'Final URL',
                  cell: (row) => <span className="text-xs text-muted-foreground">{row.finalUrl || row.url}</span>,
                },
              ]}
              isLoading={loading}
              emptyMessage="No internal destinations found yet."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Link Opportunity Issues</CardTitle>
            <CardDescription>Broken internal links, redirecting links, and dead-end pages</CardDescription>
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
                  key: 'url',
                  header: 'Affected URL',
                  cell: (row) => <span className="text-sm">{row.url}</span>,
                },
                {
                  key: 'severity',
                  header: 'Severity',
                  cell: (row) => (
                    <span className="rounded bg-orange-500 px-2 py-1 text-xs text-white">
                      {row.severity}
                    </span>
                  ),
                },
              ]}
              onRowClick={(issue) => {
                setSelectedIssue(issue)
                setIsIssuePanelOpen(true)
              }}
              isLoading={loading}
              emptyMessage="No link opportunity issues detected."
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Link Graph</CardTitle>
          <CardDescription>Internal and external links discovered during the crawl</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={links}
            columns={linkColumns}
            isLoading={loading}
            emptyMessage="No links found"
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
