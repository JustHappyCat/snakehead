import { Queue } from 'bullmq'
import Redis from 'ioredis'

const redisHost =
  process.env.REDIS_HOST ||
  (process.env.NODE_ENV === 'development' ? '127.0.0.1' : 'redis')

const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10)

// Create Redis client for caching
let redisClient: Redis | null = null
let crawlQueue: Queue | null = null

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis({
      host: redisHost,
      port: redisPort,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 50, 2000),
    })
  }
  return redisClient
}

export function getCrawlQueue(): Queue {
  if (!crawlQueue) {
    crawlQueue = new Queue('crawls', {
      connection: {
        host: redisHost,
        port: redisPort,
      },
    })
  }

  return crawlQueue
}
