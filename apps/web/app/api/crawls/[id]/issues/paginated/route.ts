import { NextResponse } from 'next/server'
import {
  parsePaginationParams,
  getPaginatedIssues,
} from '@/lib/pagination'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const { searchParams } = new URL(request.url)
    
    const pagination = parsePaginationParams(searchParams)
    const severity = searchParams.get('severity') || undefined
    const issueType = searchParams.get('issueType') || undefined
    
    const result = await getPaginatedIssues(id, pagination, severity, issueType)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to fetch issues:', error)
    return NextResponse.json(
      { error: 'Failed to fetch issues' },
      { status: 500 }
    )
  }
}
