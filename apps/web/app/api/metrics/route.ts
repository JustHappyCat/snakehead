import { NextResponse } from 'next/server'

interface MetricsData {
  uptime: number
  memoryUsed: number
  memoryTotal: number
  cpuUsage: number
  timestamp: string
}

export async function GET() {
  const metrics: MetricsData = {
    uptime: process.uptime(),
    memoryUsed: process.memoryUsage().heapUsed / 1024 / 1024,
    memoryTotal: process.memoryUsage().heapTotal / 1024 / 1024,
    cpuUsage: process.cpuUsage().user / 1000 / 1000,
    timestamp: new Date().toISOString(),
  }

  return NextResponse.json(metrics)
}
