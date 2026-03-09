export type CrawlStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
export type Impact = 'HIGH' | 'MEDIUM' | 'LOW'
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD'

export interface Crawl {
  id: string
  startUrl: string
  status: CrawlStatus
  startedAt?: Date
  finishedAt?: Date
  settingsJson?: string
  createdAt: Date
  updatedAt: Date
}

export interface Page {
  id: string
  crawlId: string
  url: string
  finalUrl?: string
  statusCode?: number
  contentType?: string
  title?: string
  metaDescription?: string
  canonical?: string
  robotsMeta?: string
  xRobotsTag?: string
  wordCount?: number
  loadTimeMs?: number
  depth: number
  isInternal: boolean
  createdAt: Date
}

export interface Link {
  id: string
  crawlId: string
  fromUrl: string
  toUrl: string
  isInternal: boolean
  rel?: string
  anchorText?: string
  isNofollow: boolean
  createdAt: Date
}

export interface Issue {
  id: string
  crawlId: string
  issueType: string
  url: string
  severity: Severity
  impact: Impact
  difficulty: Difficulty
  title: string
  explanation: string
  fixStepsJson?: string
  createdAt: Date
}

export interface Event {
  id: string
  crawlId: string
  ts: Date
  level: string
  message: string
}

export interface CrawlSettings {
  maxPages: number
  maxDepth: number
  concurrency: number
  timeout: number
  respectRobots: boolean
  securityAudit?: boolean
  allowlist?: string[]
  denylist?: string[]
  excludeExtensions?: string[]
}

export interface CrawlProgress {
  progress: number
  total: number
  current: number
  errors: number
}
