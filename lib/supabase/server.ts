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

/**
 * Helper centralizado de autenticação para Route Handlers.
 *
 * Substitui as implementações locais de isAdmin() / getAuthUser()
 * que estavam duplicadas em cada route handler.
 *
 * @returns { userId, role }
 *   - userId: null  → usuário não autenticado (retorne 401)
 *   - role: null    → autenticado mas sem perfil/role definido
 *   - role: "admin" → administrador global
 *   - role: "organizer" → organizador de torneio
 *   - role: "player" → jogador comum
 *
 * @example
 * const { userId, role } = await getAuthUser();
 * if (!userId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
 * if (role !== "admin") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
 */
export async function getAuthUser(): Promise<{
  userId: string | null;
  role: string | null;
}> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { userId: null, role: null };

  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  return { userId: user.id, role: data?.role ?? null };
}
