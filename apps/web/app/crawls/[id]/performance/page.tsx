'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { Gauge, Download, Clock } from 'lucide-react'

interface PageRow {
  id: string
  url: string
  statusCode: number | null
  loadTimeMs: number | null
  depth: number
  wordCount: number | null
  imageCount: number
  internalLinkCount: number
}

export default function PerformancePage() {
  const params = useParams()
  const crawlId = params.id as string
  
  const [pages, setPages] = useState<PageRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void fetchData()
  }, [crawlId])

  const fetchData = async () => {
    setLoading(true)
    try {
      const pagesRes = await fetch(`/api/crawls/${crawlId}/pages?limit=10000`)
      if (pagesRes.ok) {
        const data = await pagesRes.json()
        setPages(data.pages || [])
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    window.open(`/api/crawls/${crawlId}/export?type=pages`, '_blank')
  }

  const sortedByLoadTime = useMemo(
    () => [...pages].sort((a, b) => (b.loadTimeMs || 0) - (a.loadTimeMs || 0)),
    [pages]
  )
  const avgLoadTime = pages.length > 0 
    ? pages.reduce((sum, p) => sum + (p.loadTimeMs || 0), 0) / pages.length 
    : 0
  const avgImages = pages.length > 0
    ? pages.reduce((sum, p) => sum + (p.imageCount || 0), 0) / pages.length
    : 0
  const slowPages = pages.filter((page) => (page.loadTimeMs || 0) >= 1500)

  const loadTimeCategory = (loadTime: number) => {
    if (loadTime < 200) return { label: 'Fast', color: 'bg-green-500' }
    if (loadTime < 500) return { label: 'Good', color: 'bg-blue-500' }
    if (loadTime < 1000) return { label: 'Moderate', color: 'bg-yellow-500' }
    return { label: 'Slow', color: 'bg-red-500' }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Performance</h1>
          <p className="text-muted-foreground">Measured crawl timing, response codes, and page size context</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
          <Download className="w-4 h-4" />
          Export
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
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
              <Clock className="w-4 h-4 text-blue-500" />
              Avg Measured Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgLoadTime.toFixed(0)} ms</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Slowest Page
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sortedByLoadTime[0]?.loadTimeMs || 0} ms</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Slow Pages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{slowPages.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Images
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgImages.toFixed(0)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Load Time Distribution</CardTitle>
            <CardDescription>
              Pages sorted by measured crawl timing (slowest first)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              data={sortedByLoadTime}
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
                  key: 'loadTimeMs',
                  header: 'Measured Time',
                  cell: (row) => {
                    const time = row.loadTimeMs || 0
                    const category = loadTimeCategory(time)
                    return (
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{time} ms</span>
                        <span className={`rounded px-2 py-0.5 text-xs text-white ${category.color}`}>
                          {category.label}
                        </span>
                      </div>
                    )
                  },
                  sortable: true,
                },
                {
                  key: 'statusCode',
                  header: 'Status',
                  cell: (row) => (
                    <span className="text-sm font-medium">{row.statusCode}</span>
                  ),
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
              emptyMessage="No performance data available"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance Context</CardTitle>
            <CardDescription>
              Page weight indicators that help explain slow URLs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              data={sortedByLoadTime}
              columns={[
                {
                  key: 'url',
                  header: 'URL',
                  cell: (row) => <span className="font-medium">{row.url}</span>,
                  sortable: true,
                },
                {
                  key: 'wordCount',
                  header: 'Words',
                  cell: (row) => <span className="text-sm">{row.wordCount || 0}</span>,
                  sortable: true,
                },
                {
                  key: 'imageCount',
                  header: 'Images',
                  cell: (row) => <span className="text-sm">{row.imageCount || 0}</span>,
                  sortable: true,
                },
                {
                  key: 'internalLinkCount',
                  header: 'Internal Links',
                  cell: (row) => <span className="text-sm">{row.internalLinkCount || 0}</span>,
                  sortable: true,
                },
              ]}
              isLoading={loading}
              emptyMessage="No page context available"
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Performance Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-current rounded-full mt-1.5" />
              <span>Pages with load time over 1000ms need optimisation</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-current rounded-full mt-1.5" />
              <span>Consider optimising images and compressing files</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-current rounded-full mt-1.5" />
              <span>Use a CDN to serve static assets faster</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-current rounded-full mt-1.5" />
              <span>Enable browser caching for static resources</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
