import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import TeamPageClient from './TeamPageClient'

type Props = { params: Promise<{ slug: string }> }

export default async function TeamPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: team, error } = await supabase
    .from('teams')
    .select(`
      id, name, tag, description, logo_url,
      team_members (
        id, profile_id, team_role, is_reserve, lane,
        profiles (
          id, username, riot_id_game_name, riot_id_tag_line, avatar_url
        )
      )
    `)
    .eq('slug', slug)
    .single()

  if (error || !team) notFound()

  const { data: { user } } = await supabase.auth.getUser()
  const currentUserId = user?.id ?? null

  const captain = team.team_members.find(m => m.team_role === 'captain')
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
