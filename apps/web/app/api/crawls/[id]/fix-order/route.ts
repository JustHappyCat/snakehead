import { NextResponse } from 'next/server'
import {
  getFixOrderedIssues,
  getIssuesByImportance,
  getQuickWins,
} from '@/lib/fix-order'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const { searchParams } = new URL(request.url)
    
    const type = searchParams.get('type') || 'all'
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    let result

    if (type === 'quick-wins') {
      result = await getQuickWins(id, limit)
    } else if (type === 'by-importance') {
      result = await getIssuesByImportance(id)
    } else {
      result = await getFixOrderedIssues(id, limit)
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to fetch fix order:', error)
    return NextResponse.json(
      { error: 'Failed to fetch fix order' },
      { status: 500 }
    )
  }
}
