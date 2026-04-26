import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    });
  }

  try {
    const { tournament_id } = await req.json();
    if (!tournament_id) {
      return new Response(JSON.stringify({ error: 'tournament_id obrigatório' }), { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Verifica se já existe bracket
    const { count: existingMatches } = await supabase
      .from('matches')
      .select('*', { count: 'exact', head: true })
      .eq('tournament_id', tournament_id);

    if (existingMatches && existingMatches > 0) {
      return new Response(
        JSON.stringify({ error: 'Bracket já foi gerado para este torneio.' }),
        { status: 409 }
      );
    }

    // Busca times com check-in feito (inscricoes APPROVED + checked_in)
    const { data: inscricoes, error: errInsc } = await supabase
      .from('inscricoes')
      .select('team_id, teams(id, name, tag)')
      .eq('tournament_id', tournament_id)
      .eq('status', 'APPROVED')
      .eq('checked_in', true);

    if (errInsc) {
      return new Response(JSON.stringify({ error: errInsc.message }), { status: 500 });
    }

    // Fallback: se nenhum fez check-in, usa todos APPROVED
    let times = inscricoes ?? [];
    if (times.length < 2) {
      const { data: fallback } = await supabase
        .from('inscricoes')
        .select('team_id, teams(id, name, tag)')
        .eq('tournament_id', tournament_id)
        .eq('status', 'APPROVED');
      times = fallback ?? [];
    }

    if (times.length < 2) {
      return new Response(
        JSON.stringify({ error: 'Mínimo 2 times aprovados necessários.' }),
        { status: 422 }
      );
    }

    // Shuffle (Fisher-Yates)
    for (let i = times.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [times[i], times[j]] = [times[j], times[i]];
    }

    // Seed: 1 vs N, 2 vs N-1 ...
    const nextPow2 = Math.pow(2, Math.ceil(Math.log2(times.length)));
    const partidas: any[] = [];

    for (let i = 0; i < nextPow2 / 2; i++) {
      const teamA = times[i];
      const teamB = times[nextPow2 - 1 - i];
      if (!teamA || !teamB) continue; // BYE — pula
      partidas.push({
        tournament_id,
        team_a_id: teamA.team_id,
        team_b_id: teamB.team_id,
        round: 1,
        match_number: i + 1,
        best_of: 1,
        status: 'pending',
      });
    }

    const { data: inserted, error: errIns } = await supabase
      .from('matches')
      .insert(partidas)
      .select();

    if (errIns) {
      return new Response(JSON.stringify({ error: errIns.message }), { status: 500 });
    }

    // Atualiza status do torneio para 'ongoing'
    await supabase
      .from('tournaments')
      .update({ status: 'ongoing' })
      .eq('id', tournament_id);

    // Notifica capitões dos times
    const notifs = times.map((t: any) => ({
      tournament_id,
      team_id: t.team_id,
      title: '🏆 Bracket gerado!',
      message: 'O chaveamento do torneio foi gerado. Confira seus confrontos.',
      type: 'torneio',
      read: false,
    }));
    // Tenta inserir notificações (ignora erro se tabela não tiver team_id)
    await supabase.from('notifications').insert(
      notifs.map((n: any) => ({
        title: n.title,
        message: n.message,
        type: n.type,
        read: false,
      }))
    ).select().maybeSingle(); // fire-and-forget

    return new Response(
      JSON.stringify({ success: true, matches_created: inserted?.length ?? 0 }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
});
