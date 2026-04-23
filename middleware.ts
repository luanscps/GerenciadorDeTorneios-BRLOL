// middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANTE: getUser() autentica o token com o servidor Supabase.
  // Nunca use getSession() no middleware — tokens podem ser forjados no client.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Rotas protegidas por autenticação simples
  const isProtectedRoute =
    pathname.startsWith('/dashboard') || pathname.startsWith('/admin')

  if (isProtectedRoute && !user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Para /admin: a checagem de is_admin é feita no app/admin/layout.tsx
  // (Server Component com acesso ao banco via createServerClient Node runtime).
  // O middleware aqui só garante que o usuário está autenticado antes
  // de chegar ao layout, evitando o custo de uma query SQL desnecessária
  // em cada request de asset estático dentro do admin.

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Aplica middleware em todas as rotas exceto:
     * - _next/static (arquivos estáticos)
     * - _next/image (otimização de imagem)
     * - favicon.ico
     * - arquivos com extensão (png, jpg, svg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}