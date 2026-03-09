'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Gauge } from 'lucide-react'

export default function PerformancePage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Performance</h1>
        <p className="text-muted-foreground">Page load times, response codes, and size metrics</p>
      </div>

      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Gauge className="w-16 h-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Select a Crawl</h3>
          <p className="text-center text-muted-foreground mb-6 max-w-md">
            Start a crawl to view performance data and load time metrics.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
