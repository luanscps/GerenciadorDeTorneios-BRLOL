import React from 'react';
import { notFound } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import MatchPageContent from '@/components/tournament/MatchPageContent';

export default async function MatchPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { id } = await params;
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  );

  // 1. Busca detalhes da partida
  const { data: match, error } = await supabase
    .from('matches')
    .select(`
      *,
      team_a:team_a_id(id, name, tag, logo_url, owner_id),
      team_b:team_b_id(id, name, tag, logo_url, owner_id),
      tournament:tournament_id(id, name, slug)
    `)
    .eq('id', id)
    .single();

  if (error || !match) return notFound();

  // 2. Busca membros aceitos dos dois times via team_members
  const { data: teamAMembers } = await supabase
    .from('team_members')
    .select('profile_id, team_role, lane, status')
    .eq('team_id', match.team_a_id)
    .eq('status', 'accepted');

  const { data: teamBMembers } = await supabase
    .from('team_members')
    .select('profile_id, team_role, lane, status')
    .eq('team_id', match.team_b_id)
    .eq('status', 'accepted');

  // 3. Busca dados dos jogadores pelo riot_account_id dos membros
  const allProfileIds = [
    ...(teamAMembers ?? []).map(m => m.profile_id),
    ...(teamBMembers ?? []).map(m => m.profile_id),
  ].filter(Boolean);

  const { data: playersData } = allProfileIds.length > 0
    ? await supabase
        .from('players')
        .select('id, summoner_name, tag_line, tier, rank, lp, profile_icon, role, riot_account_id')
        .in('riot_account_id', [
          ...(teamAMembers ?? []).map(m => m.profile_id),
          ...(teamBMembers ?? []).map(m => m.profile_id),
        ])
    : { data: [] };

  // 4. Verifica permissão do usuário logado
  const { data: { user } } = await supabase.auth.getUser();

  type UserRole = 'admin' | 'organizer' | 'captain' | 'member' | 'public';
  let userRole: UserRole = 'public';

  if (user) {
    // Checa se é admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profile?.is_admin) {
      userRole = 'admin';
    } else if (
      match.tournament?.organizer_id === user.id ||
      (match.team_a as any)?.owner_id === user.id ||
      (match.team_b as any)?.owner_id === user.id
    ) {
      userRole = 'organizer';
    } else {
      // Checa se é membro de um dos times via team_members
      const allMembers = [...(teamAMembers ?? []), ...(teamBMembers ?? [])];
      const myMembership = allMembers.find(m => m.profile_id === user.id);

      if (myMembership) {
        userRole = myMembership.team_role === 'captain' ? 'captain' : 'member';
      }
    }
  }

  // userInMatch = qualquer papel que não seja público
  const userInMatch = userRole !== 'public';

  return (
    <MatchPageContent
      match={match}
      teamAPlayers={teamAMembers ?? []}
      teamBPlayers={teamBMembers ?? []}
      playersData={playersData ?? []}
      userInMatch={userInMatch}
      userRole={userRole}
    />
  );
}
