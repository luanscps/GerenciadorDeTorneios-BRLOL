// app/admin/layout.tsx
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import Link from 'next/link'

export const metadata = {
  title: 'Admin — BRLOL',
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet: { name: string; value: string; options?: any }[]) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch { /* ignorado */ }
        },
      },
    }
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login?redirectTo=/admin')
  }

  const supabaseAdmin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: { getAll: () => [], setAll: () => {} },
    }
  )

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('is_admin')
    .eq('id', user!.id)
    .single()

  if (profileError) {
    console.error('[AdminLayout] Erro ao buscar profile:', profileError.message)
  }

  const isAdmin = profile?.is_admin === true

  if (!isAdmin) {
    redirect('/dashboard?error=acesso_negado')
  }

  return (
    <div className="min-h-screen bg-[#060E1A]">
      <nav className="bg-[#0D1B2E] border-b border-[#1E3A5F] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="text-[#C8A84B] font-bold text-sm tracking-wider uppercase">
            Admin Panel
          </span>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/admin" className="text-gray-400 hover:text-white transition-colors">Dashboard</Link>
            <Link href="/admin/tournaments" className="text-gray-400 hover:text-white transition-colors">Torneios</Link>
            <Link href="/admin/usuarios" className="text-gray-400 hover:text-white transition-colors">Usuários</Link>
            <Link href="/admin/jogadores" className="text-gray-400 hover:text-white transition-colors">Jogadores</Link>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">{user!.email}</span>
          <span className="text-xs bg-purple-900/40 text-purple-300 px-2 py-0.5 rounded font-medium">Admin</span>
          <Link href="/dashboard" className="text-xs text-gray-400 hover:text-white transition-colors">← Sair do Admin</Link>
        </div>
      </nav>
      <main className="p-6">{children}</main>
    </div>
  )
}
