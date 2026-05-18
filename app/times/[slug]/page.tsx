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
      id,
      name,
      tag,
      description,
      logo_url,
      slug,
      team_members!team_members_team_id_fkey (
        id,
        profile_id,
        team_role,
        is_reserve,
        lane,
        status,
        riot_account:riot_accounts!team_members_riot_account_id_fkey (
          id,
          game_name,
          tag_line,
          profile_icon_id,
          summoner_level
        )
      )
    `)
    .eq('slug', slug)
    .maybeSingle()

  if (error) {
    console.error('[TeamPage] Supabase error:', error.message)
    notFound()
  }

  if (!team) notFound()

  const members = (team.team_members as any[]) ?? []

  const riotAccountIds = members
    .map((m) => m.riot_account?.id)
    .filter(Boolean)

  let latestSnapshotsByAccount: Record<string, any[]> = {}

  if (riotAccountIds.length > 0) {
    const { data: snapshots, error: snapshotsError } = await supabase
      .from('rank_snapshots')
      .select(`
        id,
        riot_account_id,
        queue_type,
        tier,
        rank,
        lp,
        wins,
        losses,
        hot_streak,
        snapshotted_at
      `)
      .in('riot_account_id', riotAccountIds)
      .in('queue_type', ['RANKED_SOLO_5x5', 'RANKED_FLEX_SR'])
      .order('snapshotted_at', { ascending: false })

    if (snapshotsError) {
      console.error('[TeamPage] rank_snapshots error:', snapshotsError.message)
    } else {
      for (const snapshot of snapshots ?? []) {
        if (!latestSnapshotsByAccount[snapshot.riot_account_id]) {
          latestSnapshotsByAccount[snapshot.riot_account_id] = []
        }

        const alreadyHasQueue = latestSnapshotsByAccount[snapshot.riot_account_id].some(
          (s) => s.queue_type === snapshot.queue_type
        )

        if (!alreadyHasQueue) {
          latestSnapshotsByAccount[snapshot.riot_account_id].push(snapshot)
        }
      }
    }
  }

  const teamWithSnapshots = {
    ...team,
    team_members: members.map((member) => {
      const riotAccount = member.riot_account

      if (!riotAccount?.id) return member

      return {
        ...member,
        riot_account: {
          ...riotAccount,
          rank_snapshots: latestSnapshotsByAccount[riotAccount.id] ?? [],
        },
      }
    }),
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const currentUserId = user?.id ?? null
  const captain = members.find((m) => m.team_role === 'captain')
  const captainProfileId = captain?.profile_id ?? null
  const isCaptain = !!currentUserId && currentUserId === captainProfileId

  return (
    <TeamPageClient
      team={teamWithSnapshots as any}
      isCaptain={isCaptain}
      captainProfileId={captainProfileId}
    />
  )
}
