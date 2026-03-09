import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { Job, Worker } from 'bullmq'
import { cleanupRenderer } from './crawl/js-renderer'
import { getCrawlQueueMode } from './queue-mode'
import {
  CrawlJobData,
  ProgressData,
  disconnectRunCrawlPrisma,
  getNextPendingCrawlId,
  runCrawl,
} from './run-crawl'

const prisma = new PrismaClient()
const queueMode = getCrawlQueueMode()

let bullWorker: Worker<CrawlJobData> | null = null
let databasePollTimer: NodeJS.Timeout | null = null
let isPollingDatabase = false

async function pollDatabaseQueue() {
  if (isPollingDatabase) {
    return
  }

  isPollingDatabase = true

  try {
    const crawlId = await getNextPendingCrawlId()

    if (!crawlId) {
      return
    }

    await runCrawl(crawlId)
  } catch (error) {
    console.error('Database queue poll failed:', error)
  } finally {
    isPollingDatabase = false
  }
}

function startRedisWorker() {
  bullWorker = new Worker<CrawlJobData>(
    'crawls',
    async (job: Job<CrawlJobData>) => {
      console.log(`Received queued crawl job: ${job.id}`)
      await runCrawl(job.data.crawlId, async (progress: ProgressData) => {
        await job.updateProgress(progress)
      })
    },
    {
      connection: {
        host: process.env.REDIS_HOST || 'redis',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
      concurrency: 1,
    }
  )

  bullWorker.on('completed', (job) => {
    console.log(`Job ${job.id} completed`)
  })

  bullWorker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed:`, err.message)
  })

  bullWorker.on('progress', (job, progress) => {
    console.log(`Job ${job?.id} progress:`, progress)
  })
}

function startDatabaseWorker() {
  console.log('Starting worker in database queue mode')
  void pollDatabaseQueue()
  databasePollTimer = setInterval(() => {
    void pollDatabaseQueue()
  }, 2000)
}

async function shutdown() {
  if (databasePollTimer) {
    clearInterval(databasePollTimer)
    databasePollTimer = null
  }

  if (bullWorker) {
    await bullWorker.close()
    bullWorker = null
  }

  await prisma.$disconnect()
  await disconnectRunCrawlPrisma()
  await cleanupRenderer()
  process.exit(0)
}

if (queueMode === 'redis') {
  startRedisWorker()
} else {
  startDatabaseWorker()
}

process.on('SIGTERM', () => {
  void shutdown()
})

process.on('SIGINT', () => {
  void shutdown()
})
