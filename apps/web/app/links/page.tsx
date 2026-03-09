'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function LinksPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Links</h1>
        <p className="text-muted-foreground">View internal and external links, backlink structure</p>
      </div>

      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">Start a crawl to see link data</p>
        </CardContent>
      </Card>
    </div>
  )
}
