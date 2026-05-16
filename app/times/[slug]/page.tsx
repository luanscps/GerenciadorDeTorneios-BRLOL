import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import TeamPageClient from './TeamPageClient'

type Props = { params: Promise<{ slug: string }> }

export default async function TeamPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  // AMBIGUIDADE PostgREST: team_members tem 4 FKs (team_id, profile_id, invited_by, riot_account_id)
  // Sem hint explícito em CADA nível, o PostgREST retorna 500.
  // A query que funciona na página /times usa:
  //   team_members!team_members_team_id_fkey + riot_account:riot_accounts!team_members_riot_account_id_fkey
  const { data: team, error } = await supabase
    .from('teams')
    .select(`
      id, name, tag, description, logo_url,
      team_members!team_members_team_id_fkey (
        id,
        profile_id,
        team_role,
        is_reserve,
        lane,
        riot_account:riot_accounts!team_members_riot_account_id_fkey (
          id, game_name, tag_line
        )
      )
    `)
    .eq('slug', slug)
    .single()

  if (error || !team) notFound()

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
