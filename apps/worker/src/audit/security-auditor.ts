import axios from 'axios'
import net from 'node:net'
import { Difficulty, Impact, Severity } from '@prisma/client'
import { normalizeUrl } from '@seo-spider/shared'
import { IssueData } from '../extract/page-extractor'

type PortDefinition = {
  port: number
  label: string
  risk: 'low' | 'medium' | 'high'
}

const PORTS_TO_SCAN: PortDefinition[] = [
  { port: 21, label: 'FTP', risk: 'high' },
  { port: 22, label: 'SSH', risk: 'high' },
  { port: 25, label: 'SMTP', risk: 'medium' },
  { port: 80, label: 'HTTP', risk: 'low' },
  { port: 443, label: 'HTTPS', risk: 'low' },
  { port: 8080, label: 'HTTP Alternate', risk: 'medium' },
  { port: 8443, label: 'HTTPS Alternate', risk: 'medium' },
  { port: 2083, label: 'cPanel SSL', risk: 'high' },
  { port: 2087, label: 'WHM SSL', risk: 'high' },
  { port: 3000, label: 'Dev Server', risk: 'medium' },
  { port: 5000, label: 'App Server', risk: 'medium' },
]

export class SecurityAuditor {
  constructor(private crawlId: string) {}

  async audit(url: string): Promise<IssueData[]> {
    const response = await axios.get(url, {
      timeout: 10000,
      maxRedirects: 5,
      validateStatus: () => true,
      responseType: 'text',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; snakehead-security/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    })

    const finalUrl = response.request?.res?.responseUrl || response.config.url || url
    const normalizedUrl = normalizeUrl(finalUrl)
    const headers = this.normalizeHeaders(response.headers as Record<string, unknown>)
    const issues: IssueData[] = []

    issues.push(...this.auditTransport(normalizedUrl))
    issues.push(...this.auditSecurityHeaders(normalizedUrl, headers))
    issues.push(...this.auditCookies(normalizedUrl, response.headers['set-cookie']))
    issues.push(...this.auditCors(normalizedUrl, headers))
    issues.push(...this.auditFingerprinting(normalizedUrl, headers))
    issues.push(...await this.auditPorts(new URL(finalUrl).hostname, normalizedUrl))

    return issues
  }

  private auditTransport(url: string): IssueData[] {
    if (url.startsWith('https://')) {
      return []
    }

    return [
      {
        crawlId: this.crawlId,
        issueType: 'HTTPS_DISABLED',
        url,
        severity: Severity.HIGH,
        impact: Impact.HIGH,
        difficulty: Difficulty.MEDIUM,
        title: 'HTTPS Not Enforced',
        explanation: 'The audited URL resolved over HTTP instead of HTTPS, which leaves traffic vulnerable to interception or tampering.',
        fixSteps: [
          'Serve the site over HTTPS with a valid TLS certificate',
          'Redirect all HTTP requests to HTTPS',
          'Update canonical URLs, sitemaps, and internal links to use HTTPS',
        ],
      },
    ]
  }

  private auditSecurityHeaders(url: string, headers: Record<string, string>): IssueData[] {
    const issues: IssueData[] = []
    const missingHeaders: string[] = []
    const contentSecurityPolicy = headers['content-security-policy']

    if (url.startsWith('https://') && !headers['strict-transport-security']) {
      missingHeaders.push('Strict-Transport-Security')
    }

    if (!contentSecurityPolicy) {
      missingHeaders.push('Content-Security-Policy')
    }

    const hasFrameProtection = Boolean(headers['x-frame-options']) || contentSecurityPolicy?.includes('frame-ancestors')
    if (!hasFrameProtection) {
      missingHeaders.push('X-Frame-Options or frame-ancestors')
    }

    if (headers['x-content-type-options']?.toLowerCase() !== 'nosniff') {
      missingHeaders.push('X-Content-Type-Options')
    }

    if (!headers['referrer-policy']) {
      missingHeaders.push('Referrer-Policy')
    }

    if (!headers['permissions-policy']) {
      missingHeaders.push('Permissions-Policy')
    }

    if (missingHeaders.length > 0) {
      issues.push({
        crawlId: this.crawlId,
        issueType: 'MISSING_SECURITY_HEADERS',
        url,
        severity: missingHeaders.length >= 3 ? Severity.HIGH : Severity.MEDIUM,
        impact: Impact.HIGH,
        difficulty: Difficulty.MEDIUM,
        title: 'Missing Security Headers',
        explanation: `The response is missing recommended security headers: ${missingHeaders.join(', ')}.`,
        fixSteps: [
          'Add security headers at the CDN, reverse proxy, or application layer',
          'Use HSTS, CSP, X-Content-Type-Options, Referrer-Policy, and Permissions-Policy as a baseline',
          'Verify the headers on the live site after deployment',
        ],
      })
    }

    if (
      contentSecurityPolicy &&
      (contentSecurityPolicy.includes("'unsafe-inline'") || contentSecurityPolicy.includes("'unsafe-eval'"))
    ) {
      issues.push({
        crawlId: this.crawlId,
        issueType: 'WEAK_CONTENT_SECURITY_POLICY',
        url,
        severity: Severity.MEDIUM,
        impact: Impact.MEDIUM,
        difficulty: Difficulty.HARD,
        title: 'Weak Content Security Policy',
        explanation: 'The Content-Security-Policy allows unsafe-inline or unsafe-eval, which weakens XSS protections.',
        fixSteps: [
          'Remove unsafe-inline and unsafe-eval from the Content-Security-Policy where possible',
          'Use nonces or hashes for inline scripts and styles',
          'Roll out CSP changes in report-only mode first if needed',
        ],
      })
    }

    return issues
  }

  private auditCookies(url: string, setCookieHeader: string | string[] | undefined): IssueData[] {
    const cookieHeaders = Array.isArray(setCookieHeader)
      ? setCookieHeader
      : typeof setCookieHeader === 'string'
        ? [setCookieHeader]
        : []

    if (cookieHeaders.length === 0) {
      return []
    }

    const missingSecure: string[] = []
    const missingHttpOnly: string[] = []
    const missingSameSite: string[] = []

    for (const cookie of cookieHeaders) {
      const [name] = cookie.split('=')
      const lower = cookie.toLowerCase()
      if (url.startsWith('https://') && !lower.includes('secure')) {
        missingSecure.push(name)
      }
      if (!lower.includes('httponly')) {
        missingHttpOnly.push(name)
      }
      if (!lower.includes('samesite=')) {
        missingSameSite.push(name)
      }
    }

    if (missingSecure.length === 0 && missingHttpOnly.length === 0 && missingSameSite.length === 0) {
      return []
    }

    const findings: string[] = []
    if (missingSecure.length > 0) findings.push(`${missingSecure.length} missing Secure`)
    if (missingHttpOnly.length > 0) findings.push(`${missingHttpOnly.length} missing HttpOnly`)
    if (missingSameSite.length > 0) findings.push(`${missingSameSite.length} missing SameSite`)

    return [
      {
        crawlId: this.crawlId,
        issueType: 'INSECURE_COOKIE_FLAGS',
        url,
        severity: Severity.MEDIUM,
        impact: Impact.MEDIUM,
        difficulty: Difficulty.MEDIUM,
        title: 'Cookie Security Flags Missing',
        explanation: `Response cookies are missing recommended protections: ${findings.join(', ')}.`,
        fixSteps: [
          'Mark authentication and session cookies as Secure and HttpOnly',
          'Set an explicit SameSite policy on cookies',
          'Review whether every cookie on the site is still necessary',
        ],
      },
    ]
  }

  private auditCors(url: string, headers: Record<string, string>): IssueData[] {
    const allowedOrigin = headers['access-control-allow-origin']
    const allowCredentials = headers['access-control-allow-credentials']?.toLowerCase() === 'true'

    if (!allowedOrigin) {
      return []
    }

    if (allowedOrigin === '*' || (allowedOrigin === 'null' && allowCredentials)) {
      return [
        {
          crawlId: this.crawlId,
          issueType: 'PERMISSIVE_CORS',
          url,
          severity: allowCredentials ? Severity.HIGH : Severity.MEDIUM,
          impact: Impact.MEDIUM,
          difficulty: Difficulty.MEDIUM,
          title: 'Overly Permissive CORS Policy',
          explanation: `The response advertises Access-Control-Allow-Origin: ${allowedOrigin}, which may expose resources more broadly than intended.`,
          fixSteps: [
            'Restrict Access-Control-Allow-Origin to trusted origins only',
            'Avoid broad CORS on sensitive endpoints',
            'Review CORS together with credentialed requests and caching behavior',
          ],
        },
      ]
    }

    return []
  }

  private auditFingerprinting(url: string, headers: Record<string, string>): IssueData[] {
    const exposedHeaders = [headers['server'], headers['x-powered-by']].filter(Boolean)
    if (exposedHeaders.length === 0) {
      return []
    }

    return [
      {
        crawlId: this.crawlId,
        issueType: 'TECH_STACK_EXPOSED',
        url,
        severity: Severity.LOW,
        impact: Impact.LOW,
        difficulty: Difficulty.EASY,
        title: 'Technology Fingerprint Exposed',
        explanation: 'Server fingerprinting headers such as Server or X-Powered-By are exposed in responses.',
        fixSteps: [
          'Remove or minimize Server and X-Powered-By headers where possible',
          'Hide framework and platform version details from public responses',
          'Review reverse proxy defaults that may reintroduce these headers',
        ],
      },
    ]
  }

  private async auditPorts(hostname: string, url: string): Promise<IssueData[]> {
    const results = await Promise.all(
      PORTS_TO_SCAN.map(async (portDef) => ({
        ...portDef,
        open: await this.scanPort(hostname, portDef.port),
      }))
    )

    const unexpectedOpenPorts = results.filter((result) => result.open && ![80, 443].includes(result.port))

    if (unexpectedOpenPorts.length === 0) {
      return []
    }

    const highestRisk = unexpectedOpenPorts.some((port) => port.risk === 'high')
      ? Severity.HIGH
      : Severity.MEDIUM

    return [
      {
        crawlId: this.crawlId,
        issueType: 'OPEN_PORTS_EXPOSED',
        url,
        severity: highestRisk,
        impact: Impact.MEDIUM,
        difficulty: Difficulty.MEDIUM,
        title: `Unexpected Open Ports (${unexpectedOpenPorts.map((port) => port.port).join(', ')})`,
        explanation: `Common port checks found externally reachable services on ${unexpectedOpenPorts
          .map((port) => `${port.port} (${port.label})`)
          .join(', ')}.`,
        fixSteps: [
          'Close or firewall services that do not need public internet access',
          'Restrict admin interfaces and SSH to trusted IP ranges or VPN access',
          'Review host, container, and cloud security-group rules',
        ],
      },
    ]
  }

  private scanPort(hostname: string, port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket()
      let settled = false

      const finish = (result: boolean) => {
        if (settled) return
        settled = true
        socket.destroy()
        resolve(result)
      }

      socket.setTimeout(800)
      socket.once('connect', () => finish(true))
      socket.once('timeout', () => finish(false))
      socket.once('error', () => finish(false))
      socket.connect(port, hostname)
    })
  }

  private normalizeHeaders(headers: Record<string, unknown>): Record<string, string> {
    const normalized: Record<string, string> = {}

    for (const [key, value] of Object.entries(headers)) {
      normalized[key.toLowerCase()] = Array.isArray(value) ? value.join('; ') : String(value)
    }

    return normalized
  }
}
