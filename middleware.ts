import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  // Padrao oficial Supabase SSR para middleware
  // IMPORTANTE: nao modificar a logica de supabaseResponse sem seguir as instrucoes abaixo
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          // Passo 1: propagar cookies no request
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Passo 2: recriar o response com o request atualizado
          supabaseResponse = NextResponse.next({
            request,
          });
          // Passo 3: propagar cookies no response
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANTE: usar getUser() e nao getSession() para validar no servidor
  // NAO remover este await - necessario para que o token seja atualizado
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const protectedPaths = ['/dashboard', '/admin'];

  // Redireciona usuario nao autenticado para login
  if (protectedPaths.some((p) => pathname.startsWith(p)) && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/login';
    return NextResponse.redirect(redirectUrl);
  }

  // Redireciona usuario ja logado que tenta acessar /login ou /register
  if ((pathname === '/login' || pathname === '/register') && user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/dashboard';
    return NextResponse.redirect(redirectUrl);
  }

  // IMPORTANTE: retornar supabaseResponse para que os cookies sejam propagados
  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/riot.*).*)',
  ],
};
