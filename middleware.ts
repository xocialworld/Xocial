import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Get environment variables directly for Edge Runtime compatibility
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function middleware(request: NextRequest) {
  // Early exit if Supabase is not configured
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    // Check if we are in a production build context where this might be critical
    if (process.env.NODE_ENV === 'production') {
      console.warn('Middleware: Supabase environment variables not configured')
    }
    return NextResponse.next()
  }

  // 1. Initialize the response
  let res = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // 2. Refresh session if needed (Supabase SSR)
  try {
    const supabase = createServerClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
            res = NextResponse.next({
              request: {
                headers: request.headers,
              },
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              res.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    // This usually refreshes the session if expired
    const { data: { user }, error } = await supabase.auth.getUser()

    // 3. Protected Route Redirection (Optional Logic from original middleware)
    const url = new URL(request.url)
    const pathname = url.pathname

    // If user is logged in and trying to access root or auth pages, redirect to dashboard
    if (user && (pathname === '/' || pathname.startsWith('/auth'))) {
      if (pathname !== '/x') { // Avoid redirect loop if already on /x (though /x checks are usually different)
         return NextResponse.redirect(new URL('/x', request.url))
      }
    }
    
    // Note: If you have protected routes that REQUIRE login, add checks here:
    // if (!user && pathname.startsWith('/protected')) {
    //   return NextResponse.redirect(new URL('/auth/login', request.url))
    // }

  } catch (e) {
    // If Supabase client fails, just proceed. 
    // This prevents the entire app from going down if Auth is flaky.
    console.warn('Middleware: Supabase client error', e)
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
