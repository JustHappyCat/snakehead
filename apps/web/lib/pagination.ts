import { prisma } from './prisma'

export interface PaginationParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface FilterParams {
  statusCode?: number | number[]
  depth?: { min?: number; max?: number }
  titleMissing?: boolean
  metaMissing?: boolean
  canonicalMissing?: boolean
  search?: string
}

export interface PaginatedResult<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
}

export function parsePaginationParams(searchParams: URLSearchParams): PaginationParams {
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = parseInt(searchParams.get('limit') || '50', 10)
  const sortBy = searchParams.get('sortBy') || undefined
  const sortOrder = (searchParams.get('sortOrder') || 'asc') as 'asc' | 'desc'
  
  return {
    page: Math.max(1, page),
    limit: Math.min(500, Math.max(1, limit)),
    sortBy,
    sortOrder,
  }
}

export function parseFilterParams(searchParams: URLSearchParams): FilterParams {
  const params: FilterParams = {}
  
  const statusCode = searchParams.get('statusCode')
  if (statusCode) {
    const codes = statusCode.split(',').map(Number)
    params.statusCode = codes.length === 1 ? codes[0] : codes
  }
  
  const depthMin = searchParams.get('depthMin')
  const depthMax = searchParams.get('depthMax')
  if (depthMin || depthMax) {
    params.depth = {
      min: depthMin ? parseInt(depthMin, 10) : undefined,
      max: depthMax ? parseInt(depthMax, 10) : undefined,
    }
  }
  
  if (searchParams.get('titleMissing') === 'true') {
    params.titleMissing = true
  }
  
  if (searchParams.get('metaMissing') === 'true') {
    params.metaMissing = true
  }
  
  if (searchParams.get('canonicalMissing') === 'true') {
    params.canonicalMissing = true
  }
  
  const search = searchParams.get('search')
  if (search) {
    params.search = search
  }
  
  return params
}

export async function getPaginatedPages(
  crawlId: string,
  pagination: PaginationParams,
  filter?: FilterParams
): Promise<PaginatedResult<any>> {
  const page = pagination.page || 1
  const limit = pagination.limit || 50
  const skip = (page - 1) * limit
  
  const where: any = { crawlId }
  
  if (filter?.statusCode) {
    if (Array.isArray(filter.statusCode)) {
      where.statusCode = { in: filter.statusCode }
    } else {
      where.statusCode = filter.statusCode
    }
  }
  
  if (filter?.depth) {
    where.depth = {}
    if (filter.depth.min !== undefined) {
      where.depth.gte = filter.depth.min
    }
    if (filter.depth.max !== undefined) {
      where.depth.lte = filter.depth.max
    }
  }
  
  if (filter?.titleMissing) {
    where.OR = [
      { title: null },
      { title: '' },
    ]
  }
  
  if (filter?.metaMissing) {
    where.OR = [
      { metaDescription: null },
      { metaDescription: '' },
    ]
  }
  
  if (filter?.search) {
    where.OR = [
      { url: { contains: filter.search, mode: 'insensitive' } },
      { title: { contains: filter.search, mode: 'insensitive' } },
      { finalUrl: { contains: filter.search, mode: 'insensitive' } },
    ]
  }
  
  const [data, total] = await Promise.all([
    prisma.page.findMany({
      where,
      skip,
      take: limit,
      orderBy: pagination.sortBy
        ? { [pagination.sortBy]: pagination.sortOrder }
        : { depth: 'asc' },
    }),
    prisma.page.count({ where }),
  ])
  
  const totalPages = Math.ceil(total / limit)
  
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  }
}

export async function getPaginatedIssues(
  crawlId: string,
  pagination: PaginationParams,
  severity?: string,
  issueType?: string
): Promise<PaginatedResult<any>> {
  const page = pagination.page || 1
  const limit = pagination.limit || 50
  const skip = (page - 1) * limit
  
  const where: any = { crawlId }
  
  if (severity) {
    where.severity = severity
  }
  
  if (issueType) {
    where.issueType = issueType
  }
  
  const [data, total] = await Promise.all([
    prisma.issue.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.issue.count({ where }),
  ])
  
  const totalPages = Math.ceil(total / limit)
  
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  }
}
