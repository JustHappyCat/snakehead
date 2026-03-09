import { PrismaClient, Severity, Impact, Difficulty, CrawlStatus } from '@prisma/client'
import { COMMON_SEO_ISSUES } from '@seo-spider/shared'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding demo data...')

  // Create or find default tenant
  let tenant = await prisma.tenant.findFirst({
    where: { email: 'demo@example.com' }
  })
  
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        name: 'Demo Tenant',
        slug: 'demo',
        email: 'demo@example.com',
      },
    })
    console.log('✅ Created demo tenant:', tenant.id)
  }

  const crawl = await prisma.crawl.create({
    data: {
      startUrl: 'https://example.com',
      tenantId: tenant.id,
      status: CrawlStatus.COMPLETED,
      startedAt: new Date(Date.now() - 86400000),
      finishedAt: new Date(),
      settingsJson: JSON.stringify({
        maxPages: 500,
        maxDepth: 5,
        concurrency: 5,
      }),
    },
  })

  console.log('✅ Created demo crawl:', crawl.id)

  const pages = await Promise.all([
    prisma.page.create({
      data: {
        crawlId: crawl.id,
        url: 'https://example.com/',
        finalUrl: 'https://example.com/',
        statusCode: 200,
        contentType: 'text/html',
        title: 'Example Homepage',
        metaDescription: 'Welcome to our example website',
        canonical: 'https://example.com/',
        wordCount: 250,
        loadTimeMs: 150,
        depth: 0,
        isInternal: true,
      },
    }),
    prisma.page.create({
      data: {
        crawlId: crawl.id,
        url: 'https://example.com/about',
        finalUrl: 'https://example.com/about',
        statusCode: 200,
        contentType: 'text/html',
        title: 'About Us',
        metaDescription: 'Learn more about our company',
        canonical: 'https://example.com/about',
        wordCount: 500,
        loadTimeMs: 120,
        depth: 1,
        isInternal: true,
      },
    }),
    prisma.page.create({
      data: {
        crawlId: crawl.id,
        url: 'https://example.com/broken-page',
        finalUrl: 'https://example.com/broken-page',
        statusCode: 404,
        contentType: 'text/html',
        depth: 2,
        isInternal: true,
      },
    }),
    prisma.page.create({
      data: {
        crawlId: crawl.id,
        url: 'https://example.com/redirect-page',
        finalUrl: 'https://example.com/new-page',
        statusCode: 301,
        contentType: 'text/html',
        depth: 1,
        isInternal: true,
      },
    }),
    prisma.page.create({
      data: {
        crawlId: crawl.id,
        url: 'https://example.com/no-title',
        finalUrl: 'https://example.com/no-title',
        statusCode: 200,
        contentType: 'text/html',
        depth: 2,
        isInternal: true,
      },
    }),
  ])

  console.log('✅ Created demo pages:', pages.length)

  await Promise.all([
    prisma.link.create({
      data: {
        crawlId: crawl.id,
        fromUrl: 'https://example.com/',
        toUrl: 'https://example.com/about',
        isInternal: true,
        anchorText: 'Learn more',
        isNofollow: false,
      },
    }),
    prisma.link.create({
      data: {
        crawlId: crawl.id,
        fromUrl: 'https://example.com/',
        toUrl: 'https://example.com/broken-page',
        isInternal: true,
        anchorText: 'Bad link',
        isNofollow: false,
      },
    }),
  ])

  console.log('✅ Created demo links')

  for (const issueDef of COMMON_SEO_ISSUES) {
    await prisma.issue.create({
      data: {
        crawlId: crawl.id,
        issueType: issueDef.type,
        url: 'https://example.com/broken-page',
        severity: issueDef.severity,
        impact: issueDef.impact,
        difficulty: issueDef.difficulty,
        title: issueDef.title,
        explanation: issueDef.explanation,
        fixStepsJson: JSON.stringify(issueDef.fixSteps),
      },
    })
  }

  console.log('✅ Created demo issues')

  console.log('🎉 Demo data seeded successfully!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Error seeding demo data:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
