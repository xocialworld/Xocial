import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { updateSession } from './src/lib/supabase/middleware'
import { createServerClient } from '@supabase/ssr'

// Get environment variables directly for Edge Runtime compatibility
// Note: Do NOT import from ./src/lib/env as Zod validation can fail in Edge Runtime
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function middleware(request: NextRequest) {
  // Early exit if Supabase is not configured
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('Middleware: Supabase environment variables not configured')
    return NextResponse.next()
  }

  let res: NextResponse
  try {
    res = await updateSession(request)
  } catch {
    res = NextResponse.next()
  }

  let user: any
  try {
    const supabase = createServerClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet: any[]) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          },
        },
      }
    )

    const result = await supabase.auth.getUser()
    user = result.data.user
  } catch {
    return res
  }

  const url = new URL(request.url)
  const pathname = url.pathname

  if (user && (pathname === '/' || pathname.startsWith('/auth'))) {
    return NextResponse.redirect(new URL('/x', request.url))
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
