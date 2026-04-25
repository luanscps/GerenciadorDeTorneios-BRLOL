// app/organizador/layout.tsx
// Guarda: apenas role='organizer' ou role='admin'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import Link from 'next/link'

export const metadata = { title: 'Painel Organizador — BRLOL' }

export default async function OrganizadorLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list: { name: string; value: string; options?: any }[]) => {
          try { list.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) }
          catch { /* ignorado no render */ }
        },
      },
    }
  )

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login?redirectTo=/organizador')

  const supabaseAdmin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role, full_name, email')
    .eq('id', user.id)
    .single()

  if (!profile || !['organizer', 'admin'].includes(profile.role)) {
    redirect('/dashboard?error=acesso_negado')
  }

  return (
    <div className="min-h-screen bg-[#060E1A]">
      <nav className="bg-[#0D1B2E] border-b border-[#1E3A5F] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="text-[#C8A84B] font-bold text-sm tracking-wider uppercase">Organizador</span>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/organizador" className="text-gray-400 hover:text-white transition-colors">Meus Torneios</Link>
            <Link href="/organizador/torneios/novo" className="text-gray-400 hover:text-white transition-colors">+ Criar Torneio</Link>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">{profile.full_name ?? profile.email}</span>
          <span className="text-xs bg-blue-900/40 text-blue-300 px-2 py-1 rounded font-medium">Organizador</span>
          <Link href="/dashboard" className="text-xs text-gray-400 hover:text-white transition-colors">← Dashboard</Link>
          {profile.role === 'admin' && (
            <Link href="/admin" className="text-xs text-purple-400 hover:text-purple-200 transition-colors">Admin →</Link>
          )}
        </div>
      </nav>
      <main className="p-6">{children}</main>
    </div>
  )
}
