import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Explicit edge runtime declaration for Vercel compatibility
export const runtime = 'edge'

// Get environment variables directly for Edge Runtime compatibility
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function middleware(request: NextRequest) {
  // Early exit if Supabase is not configured
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('Middleware: Supabase environment variables not configured')
    return NextResponse.next()
  }

  let response = NextResponse.next({ request })

  try {
    const supabase = createServerClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            response = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    // Refresh session
    const { data: { user } } = await supabase.auth.getUser()

    const url = new URL(request.url)
    const pathname = url.pathname

    // Redirect authenticated users away from auth pages
    if (user && (pathname === '/' || pathname.startsWith('/auth'))) {
      return NextResponse.redirect(new URL('/x', request.url))
    }

    return response
  } catch {
    return response
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * - public folder files
     * - api routes (handled separately)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
