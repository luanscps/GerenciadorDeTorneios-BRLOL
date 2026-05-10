import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch (e: any) {
            // Ignora erro de "cookies can only be modified in Server Action/Route Handler"
            // pois ocorre em Server Components onde a leitura ainda funciona corretamente
            if (!e?.message?.includes('Cookies can only be modified')) {
              throw e;
            }
          }
        },
      },
    }
  );
}
