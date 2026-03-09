'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Globe, AlertTriangle, XCircle, FileText, RefreshCw, GitCompare } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { NewCrawlDialog } from '@/components/new-crawl-dialog'

interface Crawl {
  id: string
  startUrl: string
  status: string
  createdAt: string
  startedAt: string | null
  finishedAt: string | null
}

interface Progress {
  crawl: Crawl
  stats: {
    pages: number
    issues: number
    links: number
    errorEvents: number
    maxDepth: number
  }
  recentEvents: Array<{
    id: string
    ts: string
    level: string
    message: string
  }>
}

export default function CrawlDetailPage() {
  const params = useParams()
  const router = useRouter()
  const crawlId = params.id as string
  
  const [crawl, setCrawl] = useState<Crawl | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [loading, setLoading] = useState(true)
  const [polling, setPolling] = useState(false)

  const fetchProgress = async () => {
    try {
      const response = await fetch(`/api/crawls/${crawlId}/summary`, { cache: 'no-store' })
      if (response.ok) {
        const data = await response.json()
        setCrawl(data.crawl)
        setProgress({
          crawl: data.crawl,
          stats: {
            pages: data.stats.pages,
            issues: data.stats.issues,
            links: data.stats.links,
            errorEvents: data.stats.errorEvents,
            maxDepth: data.stats.maxDepth,
          },
          recentEvents: data.recentEvents || [],
        })
      }
    } catch (error) {
      console.error('Failed to fetch progress:', error)
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      await fetchProgress()
      setLoading(false)
    }

    fetchData()

    if (polling) {
      const interval = setInterval(fetchProgress, 2000)
      return () => clearInterval(interval)
    }
  }, [crawlId, polling])

  useEffect(() => {
    if (crawl?.status === 'RUNNING' && !polling) {
      setPolling(true)
    } else if (crawl?.status !== 'RUNNING') {
      setPolling(false)
    }
  }, [crawl?.status, polling])

  const handleStartComparison = async (url: string, settings: any, comparisonGroupName?: string, competitorUrls?: string[]) => {
    const response = await fetch('/api/crawls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startUrl: crawl?.startUrl || url,
        settings,
        comparisonGroupName,
        competitorUrls,
      }),
    })

    const payload = await response.json().catch(() => null)

    if (!response.ok) {
      const message =
        (payload && typeof payload.error === 'string' && payload.error) ||
        'Failed to start comparison'
      throw new Error(message)
    }

    if (payload.comparisonGroupId) {
      router.push(`/comparisons/${payload.comparisonGroupId}`)
    } else {
      router.push(`/crawls/${payload.crawlId}`)
    }
  }

  if (loading) {
    return <div className="p-6">Loading...</div>
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Crawl Results</h1>
            <p className="text-muted-foreground">
              Status: <span className="font-medium">{crawl?.status || progress?.crawl.status}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {crawl?.status === 'RUNNING' && (
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Crawling...</span>
            </div>
          )}
          {crawl?.status === 'COMPLETED' && (
            <>
              <Button size="sm" onClick={() => router.push(`/crawls/${crawlId}/overview`)}>
                View Results
              </Button>
              <NewCrawlDialog
                onStartCrawl={handleStartComparison}
                trigger={
                  <Button size="sm" variant="outline">
                    <GitCompare className="w-4 h-4 mr-2" />
                    Compare with Competitor
                  </Button>
                }
              />
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pages Crawled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{progress?.stats.pages || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <XCircle className="w-4 h-4 text-destructive" />
              Issues Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{progress?.stats.issues || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-500" />
              Links Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{progress?.stats.links || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {crawl?.status || 'Unknown'}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Depth {progress?.stats.maxDepth || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              Errors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{progress?.stats.errorEvents || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Events</CardTitle>
          <CardDescription>Latest crawl logs and messages</CardDescription>
        </CardHeader>
        <CardContent>
          {progress?.recentEvents && progress.recentEvents.length > 0 ? (
            <div className="space-y-2">
              {progress.recentEvents.map((event) => (
                <div key={event.id} className="flex items-start gap-3 py-2 border-b last:border-0">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded ${
                      event.level === 'ERROR'
                        ? 'bg-destructive text-destructive-foreground'
                        : event.level === 'WARN'
                        ? 'bg-yellow-500 text-white'
                        : 'bg-green-500 text-white'
                    }`}
                  >
                    {event.level}
                  </span>
                  <span className="text-sm text-muted-foreground flex-1">
                    {event.message}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(event.ts).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-4">
              No events yet
            </div>
          )}
        </CardContent>
      </Card>

      {crawl?.status === 'RUNNING' && (
        <Card>
          <CardContent className="py-6">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <div className="flex-1">
                <div className="text-sm font-medium">Crawl in progress</div>
                <div className="text-xs text-muted-foreground">
                  Crawling pages and analyzing content...
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
