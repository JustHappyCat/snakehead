import { chromium, Browser, Page, BrowserContext } from 'playwright'

export interface RenderResult {
  html: string
  title?: string
  screenshot?: Buffer
  metadata?: Record<string, string>
  errors: string[]
  loadTimeMs: number
}

export class JsRenderer {
  private browser: Browser | null = null
  private context: BrowserContext | null = null

  async initialize(): Promise<void> {
    if (this.browser) return

    this.browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-gpu',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    })

    this.context = await this.browser.newContext({
      userAgent: 'Mozilla/5.0 (compatible; snakehead-js/1.0)',
      viewport: { width: 1920, height: 1080 },
      ignoreHTTPSErrors: true,
    })
  }

  async render(url: string, options: {
    timeout?: number
    waitForSelector?: string
    waitForTimeout?: number
  } = {}): Promise<RenderResult> {
    const {
      timeout = 10000,
      waitForSelector,
      waitForTimeout = 2000,
    } = options

    const errors: string[] = []

    if (!this.context) {
      await this.initialize()
    }

    if (!this.context) {
      throw new Error('Failed to initialize browser')
    }

    const page = await this.context.newPage()

    page.on('pageerror', (error) => {
      errors.push(error.message)
    })

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(`Console: ${msg.text()}`)
      }
    })

    try {
      const navigationStartedAt = Date.now()

      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout,
      })

      try {
        await page.waitForLoadState('load', { timeout: Math.min(timeout, 5000) })
      } catch {
        // Some pages never reach the full load event; fall back to available timing data.
      }

      const navigationFallbackMs = Date.now() - navigationStartedAt
      const loadTimeMs = await page.evaluate((fallbackMs) => {
        type NavigationTimingLike = {
          loadEventEnd?: number
          domContentLoadedEventEnd?: number
          responseEnd?: number
          duration?: number
        }

        const perf = performance as typeof performance & {
          getEntriesByType: (type: string) => NavigationTimingLike[]
        }
        const navigationEntry = perf.getEntriesByType('navigation')[0]
        const candidates = [
          navigationEntry?.loadEventEnd,
          navigationEntry?.domContentLoadedEventEnd,
          navigationEntry?.responseEnd,
          navigationEntry?.duration,
        ]

        const measuredValue = candidates.find(
          (value) => typeof value === 'number' && Number.isFinite(value) && value > 0
        )

        if (measuredValue) {
          return Math.round(measuredValue)
        }

        return Math.max(0, Math.round(fallbackMs))
      }, navigationFallbackMs)

      if (waitForSelector) {
        try {
          await page.waitForSelector(waitForSelector, { timeout: waitForTimeout })
        } catch {
          console.warn(`Wait for selector failed: ${waitForSelector}`)
        }
      }

      await page.waitForTimeout(waitForTimeout)

      const html = await page.content()
      const title = await page.title()

      const metadata: Record<string, string> = {}
      try {
        const metaDescription = await page.locator('meta[name="description"]').getAttribute('content')
        if (metaDescription) metadata.description = metaDescription
      } catch {}

      return {
        html,
        title,
        metadata,
        errors,
        loadTimeMs,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      errors.push(errorMessage)
      
      throw new Error(`Render failed: ${errorMessage}`)
    } finally {
      await page.close()
    }
  }

  async close(): Promise<void> {
    if (this.context) {
      await this.context.close()
      this.context = null
    }

    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }
}

let renderer: JsRenderer | null = null

export async function getRenderer(): Promise<JsRenderer> {
  if (!renderer) {
    renderer = new JsRenderer()
    await renderer.initialize()
  }
  return renderer
}

export async function cleanupRenderer(): Promise<void> {
  if (renderer) {
    await renderer.close()
    renderer = null
  }
}
