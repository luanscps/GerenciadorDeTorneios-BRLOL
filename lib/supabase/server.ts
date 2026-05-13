import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';

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
            if (!e?.message?.includes('Cookies can only be modified')) {
              throw e;
            }
          }
        },
      },
    }
  );
}

/**
 * Alias para createAdminClient — bypassa RLS via service_role.
 * Usar APENAS em Route Handlers, Server Actions e libs server-side.
 * NUNCA chamar de código client-side.
 */
export function createServiceRoleClient() {
  return createAdminClient();
}
