'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { FileText, Map as MapIcon } from 'lucide-react'

interface CrawlEvent {
  id: string
  ts: string
  message: string
}

export default function SitemapsPage() {
  const params = useParams()
  const crawlId = params.id as string
  
  const [sitemaps, setSitemaps] = useState<Array<{ url: string; discoveredAt: string }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void fetchSitemaps()
  }, [crawlId])

  const fetchSitemaps = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/crawls/${crawlId}/events?search=${encodeURIComponent('Processing sitemap:')}&limit=1000`)
      if (!response.ok) {
        throw new Error('Failed to fetch sitemap events')
      }

      const data = await response.json()
      const events: CrawlEvent[] = data.events || []
      const deduped = new Map<string, string>()

      for (const event of events) {
        const match = event.message.match(/Processing sitemap:\s*(.+)$/i)
        if (!match) continue

        const url = match[1].trim()
        if (!deduped.has(url)) {
          deduped.set(url, event.ts)
        }
      }

      setSitemaps(
        Array.from(deduped.entries()).map(([url, discoveredAt]) => ({
          url,
          discoveredAt,
        }))
      )
    } catch (error) {
      console.error('Failed to fetch sitemap data:', error)
      setSitemaps([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Sitemaps</h1>
        <p className="text-muted-foreground">XML sitemaps discovery and analysis</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <MapIcon className="w-4 h-4 text-orange-500" />
              Sitemaps Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sitemaps.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Discovery Source
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">robots.txt</div>
            <div className="text-xs text-muted-foreground mt-1">
              URLs are shown when the crawler discovers sitemap directives.
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Discovered Sitemaps</CardTitle>
          <CardDescription>
            XML sitemaps discovered from robots.txt during the crawl
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : sitemaps.length > 0 ? (
            <div className="space-y-2">
              {sitemaps.map((sitemap, index) => (
                <div
                  key={sitemap.url}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <FileText className={`w-5 h-5 ${index % 2 === 0 ? 'text-blue-500' : 'text-green-500'}`} />
                    <div>
                      <h4 className="font-medium">Sitemap {index + 1}</h4>
                      <p className="text-xs text-muted-foreground">{sitemap.url}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm font-medium">Discovered</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(sitemap.discoveredAt).toLocaleString()}
                      </p>
                    </div>
                    <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">
                      Found
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No sitemap directives were discovered for this crawl.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sitemap Best Practices</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-current rounded-full mt-1.5" />
              <span>Include all important pages in your sitemaps</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-current rounded-full mt-1.5" />
              <span>Split large sitemaps into multiple files (max 50,000 URLs per file)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-current rounded-full mt-1.5" />
              <span>Update sitemaps when you add or remove pages</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-current rounded-full mt-1.5" />
              <span>Submit sitemap to Google Search Console and Bing Webmaster Tools</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 bg-current rounded-full mt-1.5" />
              <span>Use priority and change-frequency tags wisely</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
