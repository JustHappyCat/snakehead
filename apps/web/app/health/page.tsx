'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function HealthPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Site Health</h1>
        <p className="text-muted-foreground">Monitor broken links, redirects, and server errors</p>
      </div>

      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">Start a crawl to see site health data</p>
        </CardContent>
      </Card>
    </div>
  )
}
