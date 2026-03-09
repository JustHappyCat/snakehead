'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { IssuePanel, Issue } from '@/components/issue-panel'
import { Button } from '@/components/ui/button'
import { Download, FileSearch } from 'lucide-react'

export default function IndexingPage() {
  const params = useParams()
  const crawlId = params.id as string
  
  const [pages, setPages] = useState<any[]>([])
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
      const [pagesRes, issuesRes] = await Promise.all([
        fetch(`/api/crawls/${crawlId}/pages?limit=10000`),
        fetch(`/api/crawls/${crawlId}/issues?types=${encodeURIComponent('NOT_INDEXABLE')}&limit=10000`),
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

  const notIndexablePages = pages.filter(p => 
    (p.robotsMeta || '').toLowerCase().includes('noindex') ||
    (p.xRobotsTag || '').toLowerCase().includes('noindex')
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Indexing</h1>
          <p className="text-muted-foreground">Check which pages can be indexed by search engines</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
          <Download className="w-4 h-4" />
          Export
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Pages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pages.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FileSearch className="w-4 h-4 text-orange-500" />
              Not Indexable
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{notIndexablePages.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Indexable
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pages.length - notIndexablePages.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Not Indexable Pages</CardTitle>
          <CardDescription>
            Pages blocked from search engine indexing
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : notIndexablePages.length > 0 ? (
            <DataTable
              data={notIndexablePages}
              columns={[
                {
                  key: 'url',
                  header: 'URL',
                  cell: (row) => (
                    <span className="font-medium">{row.url}</span>
                  ),
                  sortable: true,
                },
                {
                  key: 'robotsMeta',
                  header: 'Meta Robots',
                  cell: (row) => (
                    <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
                      {row.robotsMeta || '-'}
                    </span>
                  ),
                },
                {
                  key: 'xRobotsTag',
                  header: 'X-Robots-Tag',
                  cell: (row) => (
                    <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
                      {row.xRobotsTag || '-'}
                    </span>
                  ),
                },
                {
                  key: 'title',
                  header: 'Title',
                  cell: (row) => <span className="text-sm">{row.title || 'No title'}</span>,
                },
              ]}
            />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              All pages are indexable
            </div>
          )}
        </CardContent>
      </Card>

      {issues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Indexing Issues</CardTitle>
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
                  key: 'severity',
                  header: 'Severity',
                  cell: (row) => (
                    <span className={`px-2 py-1 rounded text-xs bg-red-500 text-white`}>
                      {row.severity}
                    </span>
                  ),
                },
                {
                  key: 'difficulty',
                  header: 'Difficulty',
                  cell: (row) => <span className="text-sm">{row.difficulty}</span>,
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
