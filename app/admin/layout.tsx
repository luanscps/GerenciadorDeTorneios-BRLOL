// app/admin/layout.tsx
import { redirect } from 'next/navigation'
import { cookies, headers } from 'next/headers'
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
  const headersList = await headers()

  // 1. Verifica autenticacao basica
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // 2. Verifica is_admin via fetch interno para /api/auth/me (usa service role)
  const host = headersList.get('host') ?? 'localhost:3000'
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  const cookieHeader = cookieStore.getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ')

  let isAdmin = false
  try {
    const res = await fetch(`${protocol}://${host}/api/auth/me`, {
      headers: { cookie: cookieHeader },
      cache: 'no-store',
    })
    if (res.ok) {
      const data = await res.json()
      isAdmin = data.isAdmin === true
    }
  } catch (e) {
    console.error('[AdminLayout] Erro ao verificar admin:', e)
    // Fallback: query direta com service role
    try {
      const supabaseAdmin = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { cookies: { getAll: () => [], setAll: () => {} } }
      )
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('is_admin')
        .eq('id', user!.id)
        .single()
      isAdmin = profile?.is_admin === true
    } catch (e2) {
      console.error('[AdminLayout] Fallback tambem falhou:', e2)
    }
  }

  if (!isAdmin) {
    redirect('/?error=acesso_negado')
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
            <Link href="/admin/torneios" className="text-gray-400 hover:text-white transition-colors">Torneios</Link>
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
