'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Download, 
  FileSpreadsheet, 
  Globe, 
  AlertTriangle,
  FileText,
  Link2,
} from 'lucide-react'

interface CrawlSummary {
  stats: {
    pages: number
    issues: number
    links: number
  }
}

export default function ExportsPage() {
  const params = useParams()
  const crawlId = params.id as string
  const [summary, setSummary] = useState<CrawlSummary | null>(null)

  useEffect(() => {
    void fetchSummary()
  }, [crawlId])

  const fetchSummary = async () => {
    try {
      const response = await fetch(`/api/crawls/${crawlId}/summary`, { cache: 'no-store' })
      if (!response.ok) return
      const data = await response.json()
      setSummary(data)
    } catch (error) {
      console.error('Failed to fetch export summary:', error)
    }
  }

  const exportOptions = [
    {
      type: 'pages',
      title: 'Pages Export',
      description: 'All crawled pages with metadata',
      icon: <Globe className="w-8 h-8 text-blue-500" />,
      columns: ['URL', 'Final URL', 'Status Code', 'Title', 'Meta Description', 'Canonical', 'Word Count', 'Load Time', 'Depth'],
      filename: 'pages.csv',
    },
    {
      type: 'issues',
      title: 'Issues Export',
      description: 'All SEO issues detected',
      icon: <AlertTriangle className="w-8 h-8 text-orange-500" />,
      columns: ['URL', 'Issue Type', 'Severity', 'Impact', 'Difficulty', 'Title', 'Explanation'],
      filename: 'issues.csv',
    },
    {
      type: 'links',
      title: 'Links Export',
      description: 'Internal and external link relationships',
      icon: <Link2 className="w-8 h-8 text-sky-500" />,
      columns: ['From URL', 'To URL', 'Internal', 'Anchor Text', 'Nofollow'],
      filename: 'links.csv',
    },
    {
      type: 'all',
      title: 'Complete Export',
      description: 'Full crawl results with pages and issues',
      icon: <FileSpreadsheet className="w-8 h-8 text-green-500" />,
      columns: ['URL', 'Status Code', 'Title', 'Meta Description', 'Word Count', 'Load Time', 'Issues'],
      filename: 'complete_export.csv',
    },
  ]

  const categoryExports = [
    {
      title: 'Health Issues',
      description: 'Broken pages, redirects, server errors',
      icon: <AlertTriangle className="w-6 h-6 text-red-500" />,
      pageCount: summary?.stats.issues ?? 0,
    },
    {
      title: 'Content Issues',
      description: 'Titles, meta descriptions, word count',
      icon: <FileText className="w-6 h-6 text-yellow-500" />,
      pageCount: summary?.stats.pages ?? 0,
    },
    {
      title: 'Link Structure',
      description: 'Internal and external links',
      icon: <Link2 className="w-6 h-6 text-blue-500" />,
      pageCount: summary?.stats.links ?? 0,
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Exports</h1>
        <p className="text-muted-foreground">Download crawl results as CSV files</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Full Exports</CardTitle>
          <CardDescription>
            Download complete CSV exports of crawl data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {exportOptions.map((exportOpt) => (
              <Card key={exportOpt.type}>
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-muted rounded-lg">
                      {exportOpt.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{exportOpt.title}</h3>
                      <p className="text-xs text-muted-foreground">
                        {exportOpt.filename}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {exportOpt.description}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Includes:</p>
                    <ul className="text-xs text-muted-foreground space-y-0.5">
                      {exportOpt.columns.slice(0, 4).map((col) => (
                        <li key={col} className="flex items-center gap-1">
                          <span className="w-1 h-1 bg-current rounded-full" />
                          {col}
                        </li>
                      ))}
                      {exportOpt.columns.length > 4 && (
                        <li className="text-muted-foreground">
                          +{exportOpt.columns.length - 4} more
                        </li>
                      )}
                    </ul>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => window.open(`/api/crawls/${crawlId}/export?type=${exportOpt.type}`, '_blank')}
                  >
                    <Download className="w-4 h-4" />
                    Download CSV
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Category-Specific Exports</CardTitle>
          <CardDescription>
            Export data by category for focused analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {categoryExports.map((cat) => (
              <div
                key={cat.title}
                className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg">
                    {cat.icon}
                  </div>
                  <div>
                    <h4 className="font-medium">{cat.title}</h4>
                    <p className="text-xs text-muted-foreground">{cat.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{cat.pageCount} pages</p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="mt-1"
                    onClick={() => window.open(`/api/crawls/${crawlId}/export?type=${cat.title === 'Link Structure' ? 'links' : cat.title === 'Health Issues' ? 'issues' : 'pages'}`, '_blank')}
                  >
                    Export
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Export Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-current rounded-full mt-1.5" />
              <span>Use &quot;Complete Export&quot; for the full picture of your website</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-current rounded-full mt-1.5" />
              <span>Use &quot;Issues Export&quot; to share problems with your team</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-current rounded-full mt-1.5" />
              <span>CSV files can be opened in Excel, Google Sheets, or similar tools</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-current rounded-full mt-1.5" />
              <span>The &quot;Pages Export&quot; includes all metadata for each URL</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
