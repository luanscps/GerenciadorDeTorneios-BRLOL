import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import TeamPageClient from './TeamPageClient'

type Props = { params: Promise<{ slug: string }> }

export default async function TeamPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  // FKs em team_members: team_members_team_id_fkey | team_members_profile_id_fkey
  //                       team_members_riot_account_id_fkey | team_members_invited_by_fkey
  // Hint obrigatório em CADA nível com ambiguidade para evitar 500 do PostgREST.
  const { data: team, error } = await supabase
    .from('teams')
    .select(`
      id, name, tag, description, logo_url, slug,
      team_members!team_members_team_id_fkey (
        id,
        profile_id,
        team_role,
        is_reserve,
        lane,
        status,
        riot_account:riot_accounts!team_members_riot_account_id_fkey (
          id, game_name, tag_line, profile_icon_id, summoner_level
        )
      )
    `)
    .eq('slug', slug)
    .maybeSingle()

  // maybeSingle() retorna null sem erro quando não encontra — mais seguro que single()
  if (error) {
    console.error('[TeamPage] Supabase error:', error.message)
    notFound()
  }
  if (!team) notFound()

  const { data: { user } } = await supabase.auth.getUser()
  const currentUserId = user?.id ?? null

  const members = (team.team_members as any[])
  const captain = members.find(m => m.team_role === 'captain')
  const captainProfileId = captain?.profile_id ?? null
  const isCaptain = !!currentUserId && currentUserId === captainProfileId

  return (
    <TeamPageClient
      team={team as any}
      currentUserId={currentUserId}
      captainProfileId={captainProfileId}
      isCaptain={isCaptain}
    />
  )
}
