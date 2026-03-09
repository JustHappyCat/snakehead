export type CrawlQueueMode = 'redis' | 'database'

export function getCrawlQueueMode(): CrawlQueueMode {
  const configuredMode = process.env.QUEUE_MODE?.toLowerCase()

  if (configuredMode === 'redis' || configuredMode === 'database') {
    return configuredMode
  }

  return process.env.NODE_ENV === 'development' ? 'database' : 'redis'
}
