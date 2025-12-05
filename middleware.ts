import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { updateSession } from './src/lib/supabase/middleware'
import { createServerClient } from '@supabase/ssr'
import { env } from './src/lib/env'

export async function middleware(request: NextRequest) {
  const res = await updateSession(request)

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

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
