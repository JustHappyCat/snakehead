# snakehead
<img width="332" height="98" alt="image" src="https://github.com/user-attachments/assets/5cd6cc78-5ebd-4134-b0ea-ddd2afc4ff39" />

SEO crawling and audit platform built as a monorepo with a Next.js web app, a background crawl worker, PostgreSQL for persistence, and Redis/BullMQ for queued execution.

This project crawls websites, extracts on-page SEO signals, logs technical issues, measures crawl performance, audits security headers, supports competitor comparisons, exports crawl data, and includes optional AI and SERP analysis features.

<img width="1920" height="4096" alt="image" src="https://github.com/user-attachments/assets/3f7d98d2-bfea-4184-8329-63968d7f3b36" />


<img width="1920" height="2191" alt="image" src="https://github.com/user-attachments/assets/765a3c18-0885-48d5-9658-d878384688c9" />




## What It Does

- Starts crawls from a seed URL and traverses internal links with configurable depth and page limits.
- Seeds the crawl frontier from XML sitemaps: sitemaps declared in `robots.txt` (or the conventional `/sitemap.xml`) are fetched and parsed, including recursive sitemap-index handling and gzip-compressed sitemaps.
- Extracts metadata and content signals such as titles, meta descriptions, canonicals, headings, internal links, images, structured data, Open Graph, Twitter cards, viewport tags, and hreflang usage.
- Detects SEO issues including broken pages, redirect chains, missing metadata, duplicate metadata, low word count, canonical mismatches, not-indexable pages, dead-end pages, broken internal links, broken external links, near-duplicate content, and slow pages.
- Validates external links after the crawl and reports unreachable targets as `BROKEN_EXTERNAL_LINK` issues.
- Detects near-duplicate content with SimHash fingerprints, so pages with substantially similar body text are grouped even when titles and metadata differ.
- Measures crawl performance and surfaces slowest pages, average measured timing, and link/content context.
- Runs an optional performance audit with Core Web Vitals (LCP, CLS, INP, performance score) via the Google PageSpeed Insights API or a local Lighthouse run, shown in a Core Web Vitals table on the crawl performance page.
- Runs an optional security audit for transport security, security headers, cookie flags, permissive CORS, server fingerprinting, and common exposed ports.
- Supports competitor crawl groups and generates comparison reports with CSV/PDF export.
- Supports optional AI recommendations for issues using OpenAI-backed prompts plus database caching.
- Supports optional SERP tracking and recommendation generation using SERP providers or mock mode.

## Product Areas

- `Overview`: Crawl summary, status-code distribution, metadata coverage, search appearance coverage, fix order, and recent crawl events.
- `Site Health`: Technical issues, security findings, fix prioritization, and health-focused tables.
- `Indexing`: Indexability and crawlability signals.
- `Content`: On-page metadata, headings, images, and content quality indicators.
- `Links`: Internal/external link structure and link-related issues.
- `Performance`: Measured crawl timing, slow pages, page-weight context, a Core Web Vitals table (when the performance audit is enabled), and exports.
- `SERP`: SERP data, feature detection, history, and recommendations.
- `Comparisons`: Side-by-side crawl comparisons across sites in a comparison group.
- `Exports`: CSV exports for pages, links, and issues plus PDF comparison export.
- `Settings / Auth`: Signup, login, account settings, and email verification flows.

## Tech Stack

- Frontend: Next.js 14 App Router, React 18, Tailwind CSS, Radix UI, Recharts
- Backend API: Next.js route handlers
- Worker: Node.js + TypeScript worker process
- Database: PostgreSQL + Prisma
- Queue: Redis + BullMQ, with database polling fallback in development
- Crawling: Axios + Cheerio
- JS rendering: Playwright
- AI: OpenAI API
- Email: Resend
- Billing: Stripe
- Reverse proxy / local production stack: Caddy via Docker Compose

## Monorepo Structure

```text
snakehead/
+- apps/
¦  +- web/        # Next.js app, API routes, Prisma schema, UI
¦  +- worker/     # Crawl engine, queue consumer, security audit, JS rendering
+- packages/
¦  +- shared/     # Shared types, URL helpers, crawl settings
+- docker/        # Docker Compose, Caddy, backup script
+- docs/          # Supporting documentation
+- README.md
```

## How It Works

### Crawl lifecycle

1. A crawl is created through `POST /api/crawls`.
2. The web app stores the crawl in PostgreSQL with `PENDING` status.
3. The crawl is queued through BullMQ in Redis mode, or picked up by database polling in development mode.
4. The worker claims the crawl and marks it `RUNNING`.
5. The worker builds a URL frontier, optionally fetches and respects `robots.txt`, seeds the frontier from XML sitemaps, and starts processing pages.
6. Each page is fetched either through plain HTTP or Playwright-based JS rendering.
7. HTML is parsed and normalized into structured page metadata and content signals.
8. Issues, links, crawl events, and page records are persisted to PostgreSQL.
9. The web app reads the stored crawl data through API routes and renders dashboards for overview, health, content, indexing, links, performance, exports, and SERP.
10. When the crawl completes, the worker marks the crawl `COMPLETED`. On failure, it marks it `FAILED`.

### Crawl implementation flow

1. `URLFrontier` manages deduplicated URL traversal and depth control.
2. `HttpFetcher` handles HTTP requests, redirects, timeouts, and optional JS rendering handoff.
3. `JsRenderer` uses Playwright to render JS-heavy pages and return HTML plus navigation timing.
4. `HtmlParser` extracts SEO-relevant metadata and content blocks.
5. `PageExtractor` converts fetch + parse output into normalized page records and issue records.
6. `CrawlStorage` persists pages, links, issues, and events with Prisma.
7. `runCrawl` orchestrates frontier traversal, progress logging, orphan detection, duplicate-content checks, and link analysis.

### Queue modes

- `redis`: Intended for production. Web app enqueues jobs and worker consumes them with BullMQ.
- `database`: Intended for development. Worker polls the database every 2 seconds for `PENDING` crawls.

If `QUEUE_MODE` is not set, the app defaults to `database` in development and `redis` otherwise.

## Main Implemented Features

### URL discovery

- Internal link traversal with depth and page limits
- XML sitemap seeding from `robots.txt`-declared sitemaps or `/sitemap.xml`
- Recursive `<sitemapindex>` processing with per-crawl sitemap and URL caps
- Gzip-compressed (`.xml.gz`) sitemap support

### Crawl extraction

- Title, meta description, meta keywords
- Canonical and robots directives
- HTTP status and redirects
- H1/H2 counts
- Internal and external link counts
- Image counts and missing alt counts
- Structured data presence
- Open Graph and Twitter card presence
- Viewport and hreflang presence
- Word count
- Crawl depth
- Measured load time

### SEO issue detection

- Broken pages
- Redirects and redirect chains
- Missing / short / long titles
- Missing / short / long meta descriptions
- Missing canonical
- Canonical mismatch
- Missing H1 / multiple H1
- Low word count
- Missing image alt text
- Missing Open Graph
- Missing Twitter card
- Missing viewport
- Not indexable pages
- Slow pages
- Soft 404 detection
- Near-duplicate content via SimHash fingerprints (replaces the old exact title+meta matching)
- Duplicate titles
- Duplicate meta descriptions
- Orphan pages
- Broken internal links
- Broken external links (post-crawl validation with HEAD requests, GET fallback)
- Internal links pointing to redirects
- Dead-end pages
- Poor Core Web Vitals: `POOR_LCP`, `POOR_CLS`, `POOR_INP`, `LOW_PERFORMANCE_SCORE` (when the performance audit is enabled)

### Security audit

- HTTPS enforcement
- HSTS, CSP, X-Frame-Options/frame-ancestors, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- Weak CSP detection
- Cookie flag checks for `Secure`, `HttpOnly`, and `SameSite`
- Permissive CORS checks
- Technology fingerprint exposure via headers
- Common open port scan

### Performance audit (Core Web Vitals)

- Opt-in per crawl via the `performanceAudit` setting, with `performanceMode` (`psi` or `lighthouse`) and `performanceMaxUrls` (default 25) controlling scope
- PageSpeed Insights API client for field/lab Core Web Vitals (LCP, CLS, INP, performance score); a `PSI_API_KEY` raises quota limits, and a mock provider is available for development
- Local Lighthouse runner as an alternative for staging/localhost sites Google's servers cannot reach; runs Lighthouse as a subprocess against a system Chrome/Edge/Chromium or the Playwright Chromium
- Results stored as `PagePerformance` rows and surfaced in a Core Web Vitals table on the crawl performance page
- Emits `POOR_LCP` (> 2.5s), `POOR_CLS` (> 0.1), `POOR_INP` (> 200ms), and `LOW_PERFORMANCE_SCORE` (< 50) issues

### Reporting and export

- Crawl overview summary
- Issue prioritization / fix order
- Crawl events
- Paginated pages, links, issues, and events APIs
- CSV exports for pages, links, and issues
- Comparison CSV export
- Comparison PDF export

### AI recommendations

- Optional OpenAI-backed issue recommendations
- Context-aware prompts built from crawl/page data
- Database-backed cache and cache invalidation APIs
- Daily cost guardrails and request-rate tracking

### SERP features

- SERP query generation from crawled pages
- Provider-backed or mock SERP fetching
- SERP feature parsing and storage
- SERP history tracking
- SERP recommendations and usage APIs

## Setup

### Prerequisites

- Node.js 18+ recommended
- npm
- PostgreSQL 15+
- Redis 7+ or compatible service

### Option 1: Docker Compose

Start the full stack:

```bash
docker compose -f docker/docker-compose.yml up --build
```

In another shell, initialize the database:

```bash
cd apps/web
npx prisma db push
npm run db:seed
```

App URLs:

- Web app: `http://localhost:3000`
- Postgres: `localhost:5432`
- Redis: `localhost:6379`

### Option 2: Local development without Docker

1. Install dependencies:

```bash
npm install
```

2. Create a PostgreSQL database named `seo_spider`.

3. Start PostgreSQL and Redis locally.

4. Add environment variables for the web app and worker.

5. Generate Prisma client and apply schema:

```bash
cd apps/web
npx prisma generate
npx prisma db push
npm run db:seed
cd ../..
```

6. Start the web app and worker:

```bash
npm run dev:local
```

### Updating an existing install

After pulling recent changes, re-apply the Prisma schema — the new `PagePerformance` model (performance audit) requires it:

```bash
cd apps/web
npx prisma db push
```

## Environment Variables

### Required for basic local development

```bash
# apps/web/.env.local
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/seo_spider
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
NODE_ENV=development
QUEUE_MODE=database
AUTH_TOKEN=change-me
APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

```bash
# apps/worker/.env
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/seo_spider
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
NODE_ENV=development
QUEUE_MODE=database
```

### Optional integrations

```bash
# OpenAI
OPENAI_API_KEY=
OPENAI_MODEL=gpt-3.5-turbo
AI_RECOMMENDATIONS_ENABLED=false
AI_RECOMMENDATIONS_MAX_DAILY_COST=10
AI_RECOMMENDATIONS_MAX_COST_PER_USER=1
AI_RECOMMENDATIONS_RATE_LIMIT_RPM=60
AI_RECOMMENDATIONS_RATE_LIMIT_TPM=150000
AI_RECOMMENDATIONS_CACHE_TTL=86400
AI_RECOMMENDATIONS_CACHE_PREFIX=ai-rec:

# SERP providers
SERPAPI_API_KEY=
DATAFORSEO_API_KEY=
SERP_API_PROVIDER=mock
SERP_RATE_LIMIT=60
SERP_DAILY_COST_LIMIT=10

# Email / Resend
RESEND_API_KEY=
EMAIL_FROM=noreply@example.com
EMAIL_FROM_NAME=snakehead

# Performance audit / Core Web Vitals (worker)
# PSI_API_KEY: free key from https://developers.google.com/speed/docs/insights/v5/get-started
# PERFORMANCE_API_PROVIDER: psi | mock (defaults to psi when a key is set, mock otherwise)
PSI_API_KEY=
PERFORMANCE_API_PROVIDER=mock
# CHROME_PATH: optional override for the browser used by the local Lighthouse runner
CHROME_PATH=
```

## Useful Commands

### Root

```bash
npm run dev          # Docker-based stack
npm run dev:local    # Run web + worker locally
npm run build        # Build all workspaces
npm run lint         # Lint/typecheck all workspaces
```

### Web app

```bash
cd apps/web
npm run dev
npm run build
npm run start
npm run lint
npm run db:push
npm run db:seed
```

### Worker

```bash
cd apps/worker
npm run dev
npm run build
npm run start
npm run lint
npm run test
```

## Key Routes and APIs

### UI routes

- `/` dashboard and crawl launcher
- `/crawls/[id]/overview`
- `/crawls/[id]/health`
- `/crawls/[id]/indexing`
- `/crawls/[id]/content`
- `/crawls/[id]/links`
- `/crawls/[id]/performance`
- `/crawls/[id]/serp`
- `/crawls/[id]/exports`
- `/comparisons/[id]`
- `/settings`, `/login`, `/signup`, `/verify-email`

### Core APIs

- `POST /api/crawls`
- `GET /api/crawls/[id]/progress`
- `GET /api/crawls/[id]/summary`
- `GET /api/crawls/[id]/pages`
- `GET /api/crawls/[id]/issues`
- `GET /api/crawls/[id]/links`
- `GET /api/crawls/[id]/events`
- `GET /api/crawls/[id]/export`
- `POST /api/ai/recommendations`
- `GET /api/serp`
- `POST /api/serp`
- `GET /api/comparisons/[id]/results`
- `POST /api/comparisons/[id]/generate`

## Database Model Overview

Primary tables/models:

- `Tenant`
- `Subscription`
- `BillingHistory`
- `UsageRecord`
- `TeamMember`
- `Crawl`
- `Page`
- `Link`
- `Issue`
- `Event`
- `ComparisonGroup`
- `ComparisonResult`
- `PageSerpData`
- `SerpHistory`
- `AIRecommendationCache`
- `PagePerformance`

At a high level:

- A `Tenant` owns many `Crawl` records.
- A `Crawl` owns many `Page`, `Link`, `Issue`, and `Event` records.
- Comparison features group multiple crawls under `ComparisonGroup`.
- SERP tracking attaches page-level search data to `PageSerpData`.
- Performance audit results attach Core Web Vitals metrics to `PagePerformance` per crawl.

## Implementation Notes

### Crawl defaults

- Max pages: `500`
- Max depth: `5`
- Concurrency: `5`
- Timeout: `10000ms`
- Respect robots.txt: `true`
- Default excluded extensions: `.pdf`, `.zip`, `.exe`, `.jpg`, `.png`, `.gif`

### Sitemap seeding

- Before traversal starts, sitemaps listed in `robots.txt` are fetched; if none are declared, `/sitemap.xml` is tried.
- `<sitemapindex>` files are followed recursively, and gzip-compressed sitemaps are decompressed transparently.
- Discovered URLs are added to the frontier at depth 1 (after the usual safety checks), capped at 5000 URLs across at most 50 sitemap files per crawl.
- Sitemap fetch/parse failures are logged as crawl events and never fail the crawl.

### External link validation

- External link targets are collected during the crawl (up to 1000 unique targets) and validated after traversal finishes.
- Validation uses HEAD requests with a GET fallback when HEAD is rejected, at a concurrency of 5.
- Unreachable or error-status targets produce `BROKEN_EXTERNAL_LINK` issues attributed to each source page linking to them.

### Near-duplicate content detection

- Page body text is fingerprinted with 64-bit SimHash over 3-word shingles (pages under 50 words are skipped).
- Pages within a Hamming distance of 6 bits (~90% similarity) are grouped as duplicates; banding (8 bands of 8 bits) keeps grouping close to linear instead of O(n²).
- Groups are reported as `DUPLICATE_CONTENT` issues. This replaces the previous exact title+meta-description matching, so reworded but substantially identical pages are now caught.

### Performance audit workflow

1. The user enables the audit per crawl (`performanceAudit`), picks a mode (`performanceMode`: `psi` or `lighthouse`), and optionally adjusts the sample size (`performanceMaxUrls`, default 25).
2. After the crawl completes, a sample of crawled pages is audited.
3. `psi` mode calls the PageSpeed Insights API (mock provider used in development when no `PSI_API_KEY` is set); `lighthouse` mode runs Lighthouse locally as a subprocess, which also works for staging/localhost URLs but costs roughly 15–45s of local CPU per page.
4. Metrics (LCP, CLS, INP, performance score) are stored as `PagePerformance` rows and rendered in the Core Web Vitals table on the performance page.
5. Threshold violations emit `POOR_LCP`, `POOR_CLS`, `POOR_INP`, and `LOW_PERFORMANCE_SCORE` issues.

### Performance timing behavior

- `loadTimeMs` is stored per page.
- For standard HTTP fetches it is derived from fetch duration.
- For JS-rendered crawls it is derived from browser navigation timing rather than total renderer overhead.

### Comparison workflow

1. User starts a crawl with comparison mode enabled.
2. The app creates a `ComparisonGroup`.
3. Main and competitor crawls are created under that group.
4. When crawls complete, comparison results can be generated and exported.

### AI recommendation workflow

1. UI requests issue recommendations.
2. API loads issues and page context.
3. Cache is checked first.
4. Uncached items are sent to OpenAI.
5. Recommendations are stored back on issues and cached for reuse.

### SERP workflow

1. Crawl pages are selected for SERP analysis.
2. Queries are generated from titles/H1/custom logic.
3. Provider data is fetched or mocked.
4. Parsed SERP features and positions are stored.
5. Recommendations and history endpoints consume that data.

## Current Caveats

- Authentication is currently bypassed in `apps/web/lib/auth.ts`, which is acceptable for local development but should be replaced before a real public deployment.
- The web and worker apps each carry a Prisma schema; the two files are now kept identical (earlier drift between them broke fresh installs). If you change one, mirror the change in the other.
- After pulling recent changes, run `npx prisma db push` (from `apps/web`) — the new `PagePerformance` model requires a schema update on existing databases.
- The worker script named `test` is a utility script, not a comprehensive automated test suite.
- Some platform features such as email and AI require external credentials before they become functional. The performance audit falls back to mock data without a `PSI_API_KEY` (in `psi` mode), and `lighthouse` mode needs a Chrome/Edge/Chromium binary on the worker host.
- Local Lighthouse runs are CPU-heavy (~15–45s per page), so keep `performanceMaxUrls` modest in that mode.
- Queue mode defaults differ between development and production; be explicit with `QUEUE_MODE` when deploying.


## License

Apache License 2.0

