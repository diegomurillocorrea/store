import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabase/env'

import { PATHNAME_HEADER } from '@/lib/request-pathname'

const RESERVED_FIRST_SEGMENTS = new Set(['login', 'register', 'sucursales', 'auth', 'api'])

function isTenantPath(pathname: string): boolean {
  const parts = pathname.split('/').filter(Boolean)
  const first = parts[0]
  if (!first) return false
  if (RESERVED_FIRST_SEGMENTS.has(first)) return false
  return true
}

function createRequestHeaders(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set(PATHNAME_HEADER, request.nextUrl.pathname)
  return requestHeaders
}

export async function proxy(request: NextRequest) {
  const requestHeaders = createRequestHeaders(request)

  let supabaseResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value)
        })
        supabaseResponse = NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        })
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options)
        })
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const parts = pathname.split('/').filter(Boolean)
  const first = parts[0] ?? ''

  if (first === 'login' || first === 'register') {
    if (user) {
      return NextResponse.redirect(new URL('/sucursales', request.url))
    }
    return supabaseResponse
  }

  if (first === 'orgs') {
    const sucursalesPath = pathname.replace(/^\/orgs/, '/sucursales')
    return NextResponse.redirect(new URL(sucursalesPath, request.url))
  }

  if (first === 'sucursales') {
    if (!user) {
      const login = new URL('/login', request.url)
      login.searchParams.set('next', pathname)
      return NextResponse.redirect(login)
    }
    return supabaseResponse
  }

  if (isTenantPath(pathname)) {
    if (!user) {
      const login = new URL('/login', request.url)
      login.searchParams.set('next', pathname)
      return NextResponse.redirect(login)
    }
    return supabaseResponse
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
