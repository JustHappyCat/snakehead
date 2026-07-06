import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authResponse = requireAuth(request)
    if (authResponse) return authResponse

    const records = await prisma.pagePerformance.findMany({
      where: { crawlId: params.id },
      orderBy: [{ url: 'asc' }, { source: 'asc' }],
    })

    return NextResponse.json(records)
  } catch (error) {
    console.error('Failed to fetch vitals:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vitals' },
      { status: 500 }
    )
  }
}
