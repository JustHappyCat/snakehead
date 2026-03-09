'use client'

import { ReactNode, useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus } from 'lucide-react'

export type CrawlMode = 'beginner' | 'advanced'

interface NewCrawlDialogProps {
  onStartCrawl: (url: string, settings: any, comparisonGroupId?: string, competitorUrls?: string[]) => Promise<void>
  initialMode?: CrawlMode
  onModeChange?: (mode: CrawlMode) => void
  trigger?: ReactNode
}

const COMMON_SETTINGS = {
  concurrency: 5,
  timeout: 10000,
  allowlist: [],
  denylist: [],
  excludeExtensions: ['.pdf', '.zip', '.exe', '.jpg', '.png', '.gif'],
}

export function NewCrawlDialog({
  onStartCrawl,
  initialMode = 'beginner',
  onModeChange,
  trigger,
}: NewCrawlDialogProps) {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [maxPages, setMaxPages] = useState('500')
  const [maxDepth, setMaxDepth] = useState('5')
  const [respectRobots, setRespectRobots] = useState(true)
  const [jsRendering, setJsRendering] = useState(false)
  const [securityAudit, setSecurityAudit] = useState(false)
  const [mode, setMode] = useState<CrawlMode>(initialMode)
  const [isLoading, setIsLoading] = useState(false)
  const [comparisonMode, setComparisonMode] = useState(false)
  const [comparisonGroupName, setComparisonGroupName] = useState('')
  const [competitorUrls, setCompetitorUrls] = useState<string[]>(['', '', ''])

  const isAdvanced = mode === 'advanced'

  useEffect(() => {
    setMode(initialMode)
  }, [initialMode])

  const handleModeChange = (nextMode: CrawlMode) => {
    setMode(nextMode)
    onModeChange?.(nextMode)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url) return

    setIsLoading(true)

    try {
      const settings = isAdvanced
        ? {
            maxPages: parseInt(maxPages, 10) || 500,
            maxDepth: parseInt(maxDepth, 10) || 5,
            respectRobots,
            jsRendering,
            securityAudit,
            ...COMMON_SETTINGS,
          }
        : {
            maxPages: 1000,
            maxDepth: 8,
            respectRobots: true,
            jsRendering: false,
            securityAudit: false,
            ...COMMON_SETTINGS,
          }

      const validCompetitorUrls = competitorUrls.filter(u => u.trim() !== '')
      const comparisonGroupId = comparisonMode && comparisonGroupName ? comparisonGroupName : undefined

      await onStartCrawl(url, settings, comparisonGroupId, validCompetitorUrls)
      setOpen(false)
      setUrl('')
      setMaxPages('500')
      setMaxDepth('5')
      setComparisonMode(false)
      setComparisonGroupName('')
      setCompetitorUrls(['', '', ''])
      setSecurityAudit(false)
    } catch (error) {
      console.error('Failed to start crawl:', error)
      alert(error instanceof Error ? error.message : 'Failed to start crawl')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCompetitorUrlChange = (index: number, value: string) => {
    const newUrls = [...competitorUrls]
    newUrls[index] = value
    setCompetitorUrls(newUrls)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            New Crawl
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="flex w-[min(96vw,640px)] max-h-[90vh] flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-5">
          <DialogTitle>Start New Crawl</DialogTitle>
          <DialogDescription>
            Enter a website URL to begin analyzing pages and detecting SEO issues.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-6 py-5">
            <div className="grid gap-2">
              <Label htmlFor="url">Your Website URL</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
            </div>

            <div className="flex items-center space-x-2 border-t pt-4">
              <input
                type="checkbox"
                id="comparisonMode"
                checked={comparisonMode}
                onChange={(e) => setComparisonMode(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="comparisonMode" className="text-sm font-medium">
                Compare with Competitors
              </Label>
            </div>

            {comparisonMode && (
              <div className="grid gap-4 border-t pt-4 bg-muted/50 rounded-lg p-4">
                <div className="grid gap-2">
                  <Label htmlFor="comparisonGroupName">Comparison Group Name</Label>
                  <Input
                    id="comparisonGroupName"
                    type="text"
                    placeholder="e.g., E-commerce Analysis"
                    value={comparisonGroupName}
                    onChange={(e) => setComparisonGroupName(e.target.value)}
                    required={comparisonMode}
                  />
                  <p className="text-xs text-muted-foreground">
                    A name to identify this comparison group
                  </p>
                </div>

                <div className="grid gap-3">
                  <Label className="text-sm font-medium">Competitor URLs (optional)</Label>
                  {competitorUrls.map((competitorUrl, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        type="url"
                        placeholder={`Competitor ${index + 1} URL`}
                        value={competitorUrl}
                        onChange={(e) => handleCompetitorUrlChange(index, e.target.value)}
                      />
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground">
                    Add up to 3 competitor URLs to compare side-by-side with your site
                  </p>
                </div>
              </div>
            )}

            <div className="grid gap-2 border-t pt-4">
              <Label className="text-sm">Scan Mode</Label>
              <div className="grid grid-cols-2 rounded-md border p-1">
                <Button
                  type="button"
                  size="sm"
                  variant={mode === 'beginner' ? 'default' : 'ghost'}
                  className="w-full"
                  onClick={() => handleModeChange('beginner')}
                >
                  Beginner
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={mode === 'advanced' ? 'default' : 'ghost'}
                  className="w-full"
                  onClick={() => handleModeChange('advanced')}
                >
                  Advanced
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {isAdvanced
                  ? 'Advanced mode gives full control over crawl depth and limits.'
                  : 'Beginner mode uses safe defaults for a broad first crawl.'}
              </p>
            </div>

            {isAdvanced && (
              <div className="grid gap-4 border-t pt-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="maxPages">Max Pages</Label>
                    <Input
                      id="maxPages"
                      type="number"
                      min="1"
                      max="10000"
                      placeholder="500"
                      value={maxPages}
                      onChange={(e) => setMaxPages(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Maximum number of pages to crawl (1-10,000)
                    </p>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="maxDepth">Max Depth</Label>
                    <Input
                      id="maxDepth"
                      type="number"
                      min="1"
                      max="20"
                      placeholder="5"
                      value={maxDepth}
                      onChange={(e) => setMaxDepth(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Maximum link depth to crawl (1-20)
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="mb-3 text-sm font-medium">Rendering & crawl behavior</p>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="respectRobots"
                        checked={respectRobots}
                        onChange={(e) => setRespectRobots(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor="respectRobots" className="text-sm">
                        Respect robots.txt
                      </Label>
                    </div>
                    <p className="pl-6 text-xs text-muted-foreground">
                      Follow rules defined in website&apos;s robots.txt file
                    </p>

                    <div className="flex items-center space-x-2 pt-1">
                      <input
                        type="checkbox"
                        id="jsRendering"
                        checked={jsRendering}
                        onChange={(e) => setJsRendering(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor="jsRendering" className="text-sm">
                        Enable JavaScript Rendering
                      </Label>
                    </div>
                    <p className="pl-6 text-xs text-muted-foreground">
                      <span className="font-medium text-orange-600">Slower</span> - Renders pages with JavaScript enabled. Use for SPA sites.
                    </p>

                    <div className="flex items-center space-x-2 pt-1">
                      <input
                        type="checkbox"
                        id="securityAudit"
                        checked={securityAudit}
                        onChange={(e) => setSecurityAudit(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor="securityAudit" className="text-sm">
                        Run Security Audit
                      </Label>
                    </div>
                    <p className="pl-6 text-xs text-muted-foreground">
                      Checks HTTPS, security headers, cookie flags, CORS exposure, server fingerprinting, and common open ports.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!isAdvanced && (
              <div className="space-y-2 border-t pt-2">
                <p className="text-sm text-muted-foreground">Using safe defaults for beginner crawls:</p>
                <ul className="space-y-1 pl-4 text-xs text-muted-foreground">
                  <li>Maximum 1,000 pages</li>
                  <li>Depth up to 8 levels</li>
                  <li>Respects robots.txt</li>
                </ul>
              </div>
            )}
          </div>

          <DialogFooter className="border-t px-6 py-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!url || isLoading || (comparisonMode && !comparisonGroupName)}>
              {isLoading
                ? 'Starting...'
                : comparisonMode
                  ? 'Start Comparison Crawl'
                  : 'Start Crawl'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
