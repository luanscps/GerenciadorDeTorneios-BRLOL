// app/organizador/torneios/[id]/fases/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import FasesClient from './fases-client'

export default async function FasesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: torneio } = await supabase
    .from('tournaments')
    .select('id, name, slug, status, max_teams, organizer_id, created_by')
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

  const { data: fases } = await supabase
    .from('tournament_stages')
    .select('*')
    .eq('tournament_id', id)
    .order('stage_order', { ascending: true })

  const { count: timesAprovados } = await supabase
    .from('inscricoes')
    .select('id', { count: 'exact', head: true })
    .eq('tournament_id', id)
    .eq('status', 'APPROVED')

  return (
    <FasesClient
      torneio={torneio as any}
      fases={(fases ?? []) as any}
      timesAprovados={timesAprovados ?? 0}
    />
  )
}
