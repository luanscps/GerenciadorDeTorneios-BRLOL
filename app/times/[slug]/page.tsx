import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import TeamPageClient from './TeamPageClient'

type Props = { params: Promise<{ slug: string }> }

export default async function TeamPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  // PostgREST hint de FK: usa !<nome_da_constraint> para resolver ambiguidade
  // team_members tem duas FKs para profiles (profile_id e invited_by) — sem hint retorna 500
  // riot_account_id → riot_accounts usa !team_members_riot_account_id_fkey
  const { data: team, error } = await supabase
    .from('teams')
    .select(`
      id, name, tag, description, logo_url,
      team_members (
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

  const captain = (team.team_members as any[]).find(m => m.team_role === 'captain')
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
