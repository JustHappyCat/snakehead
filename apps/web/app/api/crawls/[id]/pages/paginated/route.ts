import { NextResponse } from 'next/server'
import {
  parsePaginationParams,
  parseFilterParams,
  getPaginatedPages,
} from '@/lib/pagination'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const { searchParams } = new URL(request.url)
    
    const pagination = parsePaginationParams(searchParams)
    const filter = parseFilterParams(searchParams)
    
    const result = await getPaginatedPages(id, pagination, filter)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to fetch pages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pages' },
      { status: 500 }
    )
  }
}
