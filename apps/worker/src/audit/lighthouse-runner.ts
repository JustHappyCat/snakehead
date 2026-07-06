import { spawn } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import { PagePerformanceResult, PerformanceMetrics } from './performance-types'

/**
 * Runs Lighthouse locally against the Playwright Chromium that the worker
 * already ships. Unlike the PSI API this works for staging sites, localhost,
 * and other URLs Google's servers cannot reach — at the cost of significant
 * local CPU (~15-45s per page), so callers should sample pages sparingly.
 *
 * Lighthouse is ESM-only, so it is executed as a CLI subprocess rather than
 * imported into this CommonJS worker. This also isolates renderer crashes.
 */

const RUN_TIMEOUT_MS = 120000

let cachedCliPath: string | null = null
let cachedChromePath: string | null = null

function resolveLighthouseCli(): string {
  if (cachedCliPath) return cachedCliPath

  const packageJsonPath = require.resolve('lighthouse/package.json')
  cachedCliPath = path.join(path.dirname(packageJsonPath), 'cli', 'index.js')
  return cachedCliPath
}

function resolveChromePath(): string {
  if (cachedChromePath) return cachedChromePath

  const candidates: string[] = []

  if (process.env.CHROME_PATH) {
    candidates.push(process.env.CHROME_PATH)
  }

  // System browsers first: Playwright's "Chrome for Testing" build can fail
  // to start on hosts without the VC++ runtime, while an installed
  // Chrome/Edge/Chromium always runs.
  if (process.platform === 'win32') {
    const programFiles = process.env.ProgramFiles || 'C:\\Program Files'
    const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)'
    const localAppData = process.env.LOCALAPPDATA || ''
    candidates.push(
      path.join(programFiles, 'Google/Chrome/Application/chrome.exe'),
      path.join(programFilesX86, 'Google/Chrome/Application/chrome.exe'),
      path.join(localAppData, 'Google/Chrome/Application/chrome.exe'),
      path.join(programFiles, 'Microsoft/Edge/Application/msedge.exe'),
      path.join(programFilesX86, 'Microsoft/Edge/Application/msedge.exe')
    )
  } else if (process.platform === 'darwin') {
    candidates.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
    )
  } else {
    candidates.push(
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser'
    )
  }

  // Fall back to the Chromium that Playwright installed for JS-rendered crawls
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { chromium } = require('playwright')
    candidates.push(chromium.executablePath())
  } catch {
    // playwright unavailable; rely on system browsers
  }

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      cachedChromePath = candidate
      return candidate
    }
  }

  throw new Error(
    'No Chrome/Chromium/Edge executable found. Set CHROME_PATH or install a Chromium-based browser.'
  )
}

export async function runLocalLighthouse(url: string): Promise<PagePerformanceResult> {
  let cliPath: string
  let chromePath: string

  try {
    cliPath = resolveLighthouseCli()
    chromePath = resolveChromePath()
  } catch (error) {
    return {
      url,
      error: `Lighthouse unavailable: ${error instanceof Error ? error.message : String(error)}`,
    }
  }

  const args = [
    cliPath,
    url,
    '--output=json',
    '--output-path=stdout',
    '--only-categories=performance',
    '--quiet',
    '--max-wait-for-load=45000',
    '--chrome-flags=--headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage',
  ]

  return new Promise<PagePerformanceResult>((resolve) => {
    const child = spawn(process.execPath, args, {
      env: { ...process.env, CHROME_PATH: chromePath },
      windowsHide: true,
    })

    let stdout = ''
    let stderr = ''
    let settled = false

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        child.kill()
        resolve({ url, error: `Lighthouse timed out after ${RUN_TIMEOUT_MS}ms` })
      }
    }, RUN_TIMEOUT_MS)

    child.stdout.on('data', (chunk) => {
      stdout += chunk
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk
    })

    child.on('error', (error) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve({ url, error: `Failed to launch Lighthouse: ${error.message}` })
    })

    child.on('close', (code) => {
      if (settled) return
      settled = true
      clearTimeout(timer)

      if (code !== 0) {
        const detail = stderr.trim().split('\n').slice(-2).join(' ').slice(0, 300)
        resolve({ url, error: `Lighthouse exited with code ${code}${detail ? `: ${detail}` : ''}` })
        return
      }

      try {
        // --quiet still allows the odd log line before the JSON document
        const jsonStart = stdout.indexOf('{')
        const report = JSON.parse(stdout.slice(jsonStart))
        resolve({ url, lab: parseReport(report) })
      } catch {
        resolve({ url, error: 'Failed to parse Lighthouse JSON output' })
      }
    })
  })
}

function parseReport(report: any): PerformanceMetrics {
  const audits = report?.audits || {}
  const numeric = (id: string): number | undefined => {
    const value = audits[id]?.numericValue
    return typeof value === 'number' ? value : undefined
  }
  const round = (value: number | undefined) =>
    value === undefined ? undefined : Math.round(value)

  const score = report?.categories?.performance?.score

  return {
    source: 'LIGHTHOUSE_LOCAL',
    performanceScore: typeof score === 'number' ? Math.round(score * 100) : undefined,
    lcpMs: round(numeric('largest-contentful-paint')),
    cls: numeric('cumulative-layout-shift'),
    tbtMs: round(numeric('total-blocking-time')),
    fcpMs: round(numeric('first-contentful-paint')),
    speedIndexMs: round(numeric('speed-index')),
    ttfbMs: round(numeric('server-response-time')),
  }
}
