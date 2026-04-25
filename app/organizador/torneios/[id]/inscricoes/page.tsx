// app/organizador/torneios/[id]/inscricoes/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import InscricoesClient from './inscricoes-client'

export default async function InscricoesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verifica que o usuário é dono do torneio ou admin
  const { data: torneio } = await supabase
    .from('tournaments')
    .select('id, name, slug, status, min_members, max_members, organizer_id, created_by')
    .eq('id', id)
    .single()

  if (!torneio) redirect('/organizador')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isOwner = torneio.organizer_id === user.id || torneio.created_by === user.id
  const isAdmin = profile?.role === 'admin'
  if (!isOwner && !isAdmin) redirect('/dashboard?error=acesso_negado')

  // Inscrições com membros do time
  const { data: inscricoes } = await supabase
    .from('inscricoes')
    .select(`
      id, status, created_at, notes,
      teams:team_id (
        id, name, tag, owner_id,
        team_members ( id, team_role, status, profile_id,
          profiles:profile_id ( full_name, email ),
          riot_accounts:riot_account_id ( game_name, tag_line )
        )
      ),
      profiles:requested_by ( full_name, email )
    `)
    .eq('tournament_id', id)
    .order('created_at', { ascending: false })

  return (
    <InscricoesClient
      torneio={torneio as any}
      inscricoes={(inscricoes ?? []) as any}
      minMembers={torneio.min_members}
    />
  )
}
