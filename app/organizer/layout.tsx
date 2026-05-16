// app/organizer/layout.tsx
// Guard dual: organizer_id === user.id  OU  is_admin === true
// O torneio ID é extraído da URL dinamicamente pelo Next.js
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import Link from 'next/link'

export const metadata = {
  title: 'Painel do Organizador — ArenaGG',
}

export default async function OrganizerLayout({
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
          try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) }
          catch { /* ignorado no RSC */ }
        },
      },
    }
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) redirect('/login?redirectTo=/organizer')

  // Só verifica autenticação aqui. A validação organizer_id vs is_admin
  // ocorre nas próprias pages (que já têm acesso ao tournament.id)
  return (
    <div className="min-h-screen bg-[#060E1A]">
      <nav className="bg-[#0D1B2E] border-b border-[#1E3A5F] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-[#C8A84B] font-bold text-sm tracking-wider uppercase">
            Painel do Organizador
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">{user.email}</span>
          <Link href="/torneios" className="text-xs text-gray-400 hover:text-white transition-colors">← Torneios</Link>
          <Link href="/dashboard" className="text-xs text-gray-400 hover:text-white transition-colors">← Dashboard</Link>
        </div>
      </nav>
      <main className="p-6">{children}</main>
    </div>
  )
}
