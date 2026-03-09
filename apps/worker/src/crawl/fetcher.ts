import { getRenderer } from './js-renderer'
import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios'
import { CrawlSettings } from '@seo-spider/shared'

export interface FetchResult {
  url: string
  finalUrl: string
  statusCode: number
  contentType: string
  headers: Record<string, string>
  body: string
  loadTimeMs: number
  error?: string
  redirectChain: string[]
  fromJSRendering?: boolean
}

export class HttpFetcher {
  private client: AxiosInstance
  private lastRequestTime: Map<string, number> = new Map()
  private settings: CrawlSettings
  private useJsRendering: boolean = false

  constructor(settings: CrawlSettings, useJsRendering = false) {
    this.settings = settings
    this.useJsRendering = useJsRendering
    this.client = axios.create({
      timeout: settings.timeout,
      maxRedirects: 5,
      validateStatus: () => true, 
    })
  }

  async fetch(url: string): Promise<FetchResult> {
    const redirectChain: string[] = []
    let finalUrl = url
    let statusCode: number = 0
    let contentType: string = ''
    let headers: Record<string, string> = {}
    let body = ''
    let error: string | undefined
    let fromJSRendering = false
    let measuredLoadTimeMs: number | undefined

    await this.rateLimit(url)
    const startTime = Date.now()

    try {
      if (this.useJsRendering) {
        const renderer = await getRenderer()
        const result = await renderer.render(url, {
          timeout: this.settings.timeout,
          waitForTimeout: 2000,
        })
        
        finalUrl = url
        statusCode = 200
        contentType = 'text/html'
        headers = result.metadata || {}
        body = result.html
        fromJSRendering = true
        measuredLoadTimeMs = result.loadTimeMs
      } else {
        const response: AxiosResponse = await this.client.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; snakehead/1.0)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          responseType: 'text',
        })

        finalUrl = response.request?.res?.responseUrl || response.config.url || url
        statusCode = response.status
        contentType = response.headers['content-type'] || ''
        headers = this.normalizeHeaders(response.headers)
        body = response.data

        if (response.request?.res?.responseUrl && response.request.res.responseUrl !== url) {
          redirectChain.push(url)
          redirectChain.push(response.request.res.responseUrl)
        }
      }
    } catch (err) {
      const axiosError = err as AxiosError
      statusCode = axiosError.response?.status || 0
      contentType = axiosError.response?.headers['content-type'] || ''
      headers = axiosError.response?.headers ? this.normalizeHeaders(axiosError.response.headers) : {}
      
      if (axiosError.code === 'ECONNABORTED') {
        error = 'Request timeout'
      } else if (axiosError.code === 'ENOTFOUND') {
        error = 'DNS resolution failed'
      } else if (axiosError.code === 'ECONNREFUSED') {
        error = 'Connection refused'
      } else {
        error = axiosError.message || 'Unknown error'
      }
    }

    const loadTimeMs = measuredLoadTimeMs ?? (Date.now() - startTime)

    return {
      url,
      finalUrl,
      statusCode,
      contentType,
      headers,
      body,
      loadTimeMs,
      error,
      redirectChain,
      fromJSRendering,
    }
  }

  private async rateLimit(url: string): Promise<void> {
    const domain = new URL(url).hostname
    const now = Date.now()
    const lastRequest = this.lastRequestTime.get(domain) || 0
    const elapsed = now - lastRequest
    
    const delayPerRequest = 1000 / Math.min(this.settings.concurrency, 2)
    
    if (elapsed < delayPerRequest) {
      await this.sleep(delayPerRequest - elapsed)
    }
    
    this.lastRequestTime.set(domain, Date.now())
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private normalizeHeaders(headers: any): Record<string, string> {
    const normalized: Record<string, string> = {}
    for (const [key, value] of Object.entries(headers)) {
      normalized[key.toLowerCase()] = String(value)
    }
    return normalized
  }

  isHtmlContent(contentType: string): boolean {
    return contentType.includes('text/html') || contentType.includes('application/xhtml+xml')
  }
}
