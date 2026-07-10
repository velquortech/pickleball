import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Optimistic gates (S3). This is NOT the auth boundary — every admin controller
// re-checks with requireAdmin() and every player controller with requirePlayer().
// Proxy just keeps the session fresh and redirects obvious strangers away.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Player area: any signed-in account may enter. Strangers are sent to sign in
  // and bounced back to where they were headed.
  if (pathname.startsWith('/play')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/login'
      url.search = `?next=${encodeURIComponent(pathname + request.nextUrl.search)}`
      return NextResponse.redirect(url)
    }
    return response
  }

  // Auth pages: a signed-in player has no business on them.
  if (pathname.startsWith('/auth')) {
    if (user) {
      const url = request.nextUrl.clone()
      url.pathname = '/play'
      url.search = ''
      return NextResponse.redirect(url)
    }
    return response
  }

  // Admin area: staff only, by app_metadata role.
  const isAdmin = user?.app_metadata?.role === 'admin'
  const isLoginPage = pathname === '/admin/login'

  if (!isAdmin && !isLoginPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin/login'
    url.search = ''
    return NextResponse.redirect(url)
  }

  if (isAdmin && isLoginPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: ['/admin/:path*', '/admin', '/play/:path*', '/play', '/auth/:path*'],
}
