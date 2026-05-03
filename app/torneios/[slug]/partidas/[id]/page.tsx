import React from 'react';
import { notFound } from 'next/navigation';
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
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

  // 1. Busca detalhes da partida no Supabase
  const { data: match, error } = await supabase
    .from("matches")
    .select(`
      *,
      team_a:team_a_id(id, name, tag, logo_url),
      team_b:team_b_id(id, name, tag, logo_url),
      tournament:tournament_id(id, name, slug)
    `)
    .eq("id", id)
    .single();

  if (error || !match) return notFound();

  // 2. Busca jogadores dos times
  const { data: teamAPlayers } = await supabase
    .from("players")
    .eq("team_id", match.team_a_id);

  const { data: teamBPlayers } = await supabase
    .from("players")
    .eq("team_id", match.team_b_id);

  // 3. Verifica se o usuário logado faz parte de um dos times (para liberar o Tournament Code)
  const { data: { user } } = await supabase.auth.getUser();
  let userInMatch = false;
  if (user) {
    const isPlayerInTeamA = teamAPlayers?.some(p => p.profile_id === user.id);
    const isPlayerInTeamB = teamBPlayers?.some(p => p.profile_id === user.id);
    
    // Simplificando: se for admin ou o owner de um dos times (profiles.id vinculado ao team.owner_id)
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    userInMatch = !!(isPlayerInTeamA || isPlayerInTeamB || profile?.is_admin || match.team_a.owner_id === user.id || match.team_b.owner_id === user.id);
  }

  return (
    <MatchPageContent 
      match={match} 
      teamAPlayers={teamAPlayers || []} 
      teamBPlayers={teamBPlayers || []} 
      userInMatch={userInMatch}
    />
  );
}
