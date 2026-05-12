// app/torneios/[slug]/partidas/[id]/page.tsx
import React from 'react';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import MatchPageContent from '@/components/tournament/MatchPageContent';

export default async function MatchPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const supabase = await createClient();

  // 1. Partida completa
  const { data: match, error } = await supabase
    .from('matches')
    .select(`
      id, round, match_number, match_order, status,
      score_a, score_b, best_of, format,
      scheduled_at, finished_at, tournament_code, notes, stage_id,
      team_a:team_a_id(id, name, tag, logo_url, owner_id),
      team_b:team_b_id(id, name, tag, logo_url, owner_id),
      winner:winner_id(id, name, tag),
      tournament:tournament_id(id, name, slug, organizer_id)
    `)
    .eq('id', id)
    .single();

  if (error || !match) return notFound();

  // 2. Stage da partida
  const { data: stage } = match.stage_id
    ? await supabase
        .from('tournament_stages')
        .select('id, name, bracket_type, best_of, stage_order')
        .eq('id', match.stage_id)
        .single()
    : { data: null };

  // 3. Membros dos dois times
  const { data: teamAMembers } = await supabase
    .from('team_members')
    .select('profile_id, team_role, lane, status')
    .eq('team_id', (match.team_a as any).id)
    .eq('status', 'accepted');

  const { data: teamBMembers } = await supabase
    .from('team_members')
    .select('profile_id, team_role, lane, status')
    .eq('team_id', (match.team_b as any).id)
    .eq('status', 'accepted');

  // 4. Players (inclui puuid para Spectator API)
  const allProfileIds = [
    ...(teamAMembers ?? []).map(m => m.profile_id),
    ...(teamBMembers ?? []).map(m => m.profile_id),
  ].filter(Boolean);

  const { data: playersData } = allProfileIds.length > 0
    ? await supabase
        .from('players')
        .select('id, summoner_name, tag_line, tier, rank, lp, profile_icon, role, riot_account_id, puuid')
        .in('riot_account_id', allProfileIds)
    : { data: [] };

  // 5. Permissao do usuario logado
  const { data: { user } } = await supabase.auth.getUser();

  type UserRole = 'admin' | 'organizer' | 'captain' | 'member' | 'public';
  let userRole: UserRole = 'public';

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profile?.is_admin) {
      userRole = 'admin';
    } else if (
      (match.tournament as any)?.organizer_id === user.id ||
      (match.team_a as any)?.owner_id === user.id ||
      (match.team_b as any)?.owner_id === user.id
    ) {
      userRole = 'organizer';
    } else {
      const allMembers = [...(teamAMembers ?? []), ...(teamBMembers ?? [])];
      const my = allMembers.find(m => m.profile_id === user.id);
      if (my) userRole = my.team_role === 'captain' ? 'captain' : 'member';
    }
  }

  return (
    <MatchPageContent
      match={match}
      stage={stage ?? null}
      teamAPlayers={teamAMembers ?? []}
      teamBPlayers={teamBMembers ?? []}
      playersData={playersData ?? []}
      userInMatch={userRole !== 'public'}
      userRole={userRole}
    />
  );
}
