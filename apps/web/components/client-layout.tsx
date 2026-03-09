'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Home,
  Activity,
  Search,
  FileText,
  Link2,
  Gauge,
  Map,
  Download,
  Settings,
  BookOpen,
  ChevronRight,
  RefreshCw,
} from 'lucide-react'
import { CrawlMode, NewCrawlDialog } from '@/components/new-crawl-dialog'

interface NavigationItem {
  key: string
  name: string
  icon: any
  rootHref: string
  crawlSegment?: string
}

const navigation: NavigationItem[] = [
  { key: 'overview', name: 'Overview', icon: Home, rootHref: '/', crawlSegment: 'overview' },
  { key: 'health', name: 'Site Health', icon: Activity, rootHref: '/health', crawlSegment: 'health' },
  { key: 'indexing', name: 'Indexing', icon: Search, rootHref: '/indexing', crawlSegment: 'indexing' },
  { key: 'content', name: 'Content', icon: FileText, rootHref: '/content', crawlSegment: 'content' },
  { key: 'links', name: 'Links', icon: Link2, rootHref: '/links', crawlSegment: 'links' },
  { key: 'performance', name: 'Performance', icon: Gauge, rootHref: '/performance', crawlSegment: 'performance' },
  { key: 'sitemaps', name: 'Sitemaps', icon: Map, rootHref: '/sitemaps', crawlSegment: 'sitemaps' },
  { key: 'exports', name: 'Exports', icon: Download, rootHref: '/exports', crawlSegment: 'exports' },
  { key: 'settings', name: 'Settings', icon: Settings, rootHref: '/settings' },
  { key: 'glossary', name: 'Glossary', icon: BookOpen, rootHref: '/glossary' },
]

interface CrawlSummary {
  id: string
  startUrl: string
  status: string
  createdAt: string
}

const STORAGE_KEY = 'selected_crawl_id'

function formatCrawlLabel(crawl: CrawlSummary): string {
  try {
    const hostname = new URL(crawl.startUrl).hostname
    return `${hostname} (${crawl.status})`
  } catch {
    return `${crawl.startUrl} (${crawl.status})`
  }
}

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [crawlMode, setCrawlMode] = useState<CrawlMode>('beginner')
  const [crawls, setCrawls] = useState<CrawlSummary[]>([])
  const [selectedCrawlId, setSelectedCrawlId] = useState('')

  const currentCrawlIdFromPath = useMemo(() => {
    const match = pathname.match(/^\/crawls\/([^/]+)/)
    return match ? match[1] : ''
  }, [pathname])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const saved = window.localStorage.getItem(STORAGE_KEY) || ''
    if (saved) {
      setSelectedCrawlId(saved)
    }
  }, [])

  useEffect(() => {
    if (!currentCrawlIdFromPath) return

    setSelectedCrawlId(currentCrawlIdFromPath)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, currentCrawlIdFromPath)
    }
  }, [currentCrawlIdFromPath])

  const loadCrawls = useCallback(async () => {
    try {
      const response = await fetch('/api/crawls.list', { cache: 'no-store' })
      if (!response.ok) return

      const data = (await response.json()) as CrawlSummary[]
      const next = Array.isArray(data) ? data : []
      setCrawls(next)

      if (next.length === 0) {
        return
      }

      const selected = selectedCrawlId || currentCrawlIdFromPath
      const selectedExists = selected && next.some((crawl) => crawl.id === selected)

      if (!selectedExists) {
        const fallback = next[0].id
        setSelectedCrawlId(fallback)
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(STORAGE_KEY, fallback)
        }
      }
    } catch (error) {
      console.error('Failed to load crawls:', error)
    }
  }, [selectedCrawlId, currentCrawlIdFromPath])

  useEffect(() => {
    void loadCrawls()
  }, [loadCrawls])

  const activeCrawlId = currentCrawlIdFromPath || selectedCrawlId

  const getNavHref = (item: NavigationItem): string => {
    if (item.crawlSegment && activeCrawlId) {
      return `/crawls/${activeCrawlId}/${item.crawlSegment}`
    }
    return item.rootHref
  }

  const isItemActive = (item: NavigationItem): boolean => {
    const href = getNavHref(item)

    if (pathname === href) {
      return true
    }

    if (item.key === 'overview' && activeCrawlId) {
      return pathname === `/crawls/${activeCrawlId}` || pathname === `/crawls/${activeCrawlId}/overview`
    }

    return false
  }

  const handleStartCrawl = async (url: string, settings: any) => {
    const response = await fetch('/api/crawls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startUrl: url, settings }),
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

    setSelectedCrawlId(payload.crawlId)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, payload.crawlId)
    }

    await loadCrawls()
    router.push(`/crawls/${payload.crawlId}`)
  }

  const handleCrawlSelect = (crawlId: string) => {
    if (!crawlId) return

    setSelectedCrawlId(crawlId)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, crawlId)
    }

    router.push(`/crawls/${crawlId}/overview`)
  }

  return (
    <div className="flex h-screen bg-background">
      <aside className="flex w-64 flex-col border-r bg-card">
        <div className="border-b p-4">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/branding/snakehead-logo.png"
              alt="snakehead"
              width={32}
              height={32}
              className="h-8 w-8 rounded-sm object-contain"
            />
            <span className="text-xl font-bold">snakehead</span>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto p-2">
          <ul className="space-y-1">
            {navigation.map((item) => {
              const isActive = isItemActive(item)
              const Icon = item.icon
              const href = getNavHref(item)

              return (
                <li key={item.key}>
                  <Link
                    href={href}
                    className={`
                      flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium
                      transition-colors
                      ${
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                      }
                    `}
                  >
                    <Icon className="h-4 w-4" />
                    {item.name}
                    {isActive && <ChevronRight className="ml-auto h-4 w-4" />}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="border-t p-4">
          <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              System online
            </div>
            <div className="flex items-center gap-4">
              <Link href="/terms" className="hover:text-foreground transition-colors">
                Terms
              </Link>
              <span>•</span>
              <Link href="/privacy" className="hover:text-foreground transition-colors">
                Privacy
              </Link>
              <span>•</span>
              <Link href="/user-guide" className="hover:text-foreground transition-colors">
                Help
              </Link>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b bg-card px-6">
          <div className="flex items-center gap-4">
            <select
              className="min-w-[260px] rounded-md border bg-background px-3 py-1.5 text-sm"
              value={activeCrawlId}
              onChange={(e) => handleCrawlSelect(e.target.value)}
            >
              <option value="">{crawls.length > 0 ? 'Select crawl' : 'No crawl selected'}</option>
              {crawls.map((crawl) => (
                <option key={crawl.id} value={crawl.id}>
                  {formatCrawlLabel(crawl)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <div className="grid grid-cols-2 rounded-md border p-1">
              <Button
                size="sm"
                type="button"
                variant={crawlMode === 'beginner' ? 'default' : 'ghost'}
                onClick={() => setCrawlMode('beginner')}
              >
                Beginner
              </Button>
              <Button
                size="sm"
                type="button"
                variant={crawlMode === 'advanced' ? 'default' : 'ghost'}
                onClick={() => setCrawlMode('advanced')}
              >
                Advanced
              </Button>
            </div>

            <NewCrawlDialog
              onStartCrawl={handleStartCrawl}
              initialMode={crawlMode}
              onModeChange={setCrawlMode}
            />

            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={() => {
                void loadCrawls()
                router.refresh()
              }}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-auto">{children}</div>
      </main>
    </div>
  )
}
