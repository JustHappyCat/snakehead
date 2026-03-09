import { NextResponse } from 'next/server'

// Local installs run without authentication so crawl creation and other APIs
// stay accessible even when no auth cookie/header is present.
export function validateAuth(_request: Request): boolean {
  return true
}

export function requireAuth(_request: Request): NextResponse | null {
  return null
}
