'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { NewCrawlDialog } from '@/components/new-crawl-dialog'
import {
  Globe,
  AlertTriangle,
  XCircle,
  FileText,
  RefreshCw,
  ArrowRight,
} from 'lucide-react'

interface CrawlSummary {
  id: string
  startUrl: string
  status: string
  createdAt: string
}

function formatCrawlLabel(crawl: CrawlSummary): string {
  try {
    const hostname = new URL(crawl.startUrl).hostname
    return `${hostname} (${crawl.status})`
  } catch {
    return `${crawl.startUrl} (${crawl.status})`
  }
}

interface DashboardStats {
  totalPages: number
  brokenPages: number
  notIndexable: number
  missingTitles: number
  redirects: number
}

export default function OverviewPage() {
  const router = useRouter()
  const [recentCrawls, setRecentCrawls] = useState<CrawlSummary[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalPages: 0,
    brokenPages: 0,
    notIndexable: 0,
    missingTitles: 0,
    redirects: 0,
  })

  const loadCrawls = useCallback(async () => {
    try {
      const response = await fetch('/api/crawls.list', { cache: 'no-store' })
      if (!response.ok) return
      const data = (await response.json()) as CrawlSummary[]
      setRecentCrawls(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to load crawls:', error)
    }
  }, [])

  const loadStats = useCallback(async () => {
    try {
      const response = await fetch('/api/stats', { cache: 'no-store' })
      if (!response.ok) return
      const data = (await response.json()) as DashboardStats
      setStats(data)
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }, [])

  useEffect(() => {
    void loadCrawls()
    void loadStats()
  }, [loadCrawls, loadStats])

  const handleStartCrawl = async (url: string, settings: any, comparisonGroupId?: string, competitorUrls?: string[]) => {
    const response = await fetch('/api/crawls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startUrl: url,
        settings,
        comparisonGroupName: comparisonGroupId,
        competitorUrls,
      }),
    })

    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      const message =
        (payload && typeof payload.error === 'string' && payload.error) ||
        'Failed to start crawl'
      throw new Error(message)
    }

    if (!payload || typeof payload.crawlId !== 'string') {
      throw new Error('Crawl was created but response was invalid')
    }

    await loadCrawls()
    
    // If comparison mode, navigate to comparison page
    if (payload.comparisonGroupId) {
      router.push(`/comparisons/${payload.comparisonGroupId}`)
    } else {
      router.push(`/crawls/${payload.crawlId}`)
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Overview</h1>
          <p className="text-muted-foreground">Start a crawl or open one of your recent crawls</p>
        </div>
      </div>

      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Globe className="mb-4 h-16 w-16 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-semibold">Start your next crawl</h3>
          <p className="mb-6 max-w-md text-center text-muted-foreground">
            Enter a website URL to analyze pages, find technical issues, and prioritize fixes.
          </p>
          <NewCrawlDialog
            onStartCrawl={handleStartCrawl}
            trigger={
              <Button size="lg" className="gap-2">
                Start New Crawl
                <ArrowRight className="h-4 w-4" />
              </Button>
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Crawls</CardTitle>
          <CardDescription>Saved crawl runs are listed here for quick access.</CardDescription>
        </CardHeader>
        <CardContent>
          {recentCrawls.length === 0 ? (
            <div className="text-sm text-muted-foreground">No crawls found yet.</div>
          ) : (
            <ul className="space-y-2">
              {recentCrawls.map((crawl) => (
                <li key={crawl.id}>
                  <Link
                    href={`/crawls/${crawl.id}/overview`}
                    className="flex items-center justify-between rounded-md border p-3 transition-colors hover:bg-accent"
                  >
                    <span className="font-medium">{formatCrawlLabel(crawl)}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(crawl.createdAt).toLocaleString()}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pages Crawled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPages.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <XCircle className="h-4 w-4 text-destructive" />
              Broken Pages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.brokenPages.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Not Indexable
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.notIndexable.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <FileText className="h-4 w-4 text-yellow-500" />
              Missing Titles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.missingTitles.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <RefreshCw className="h-4 w-4 text-blue-500" />
              Redirects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.redirects.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
