import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(_req: NextRequest) {
  try {
            const supabase = await createClient();

    const { data, error } = await supabase
      .from('players')
      .select(`
        id,
        summoner_name,
        tag_line,
        role,
        tier,
        rank,
        lp,
        wins,
        losses,
        created_at,
        team_id,
        teams ( name )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const jogadores = (data ?? []).map((p: any) => ({
      id: p.id,
      summonerName: p.summoner_name,
      tagLine: p.tag_line,
      teamId: p.team_id,
      teamName: p.teams?.name ?? null,
      role: p.role,
      tier: p.tier,
      rank: p.rank,
      lp: p.lp,
      wins: p.wins,
      losses: p.losses,
      createdAt: p.created_at,
    }));

    return NextResponse.json(jogadores);
  } catch (err) {
    console.error('[API admin/jogadores]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, teamId, role } = body as { id: string; teamId?: string; role?: string };
    if (!id) return NextResponse.json({ error: 'ID obrigatorio' }, { status: 400 });

    const supabase = createClient();
    const updates: Record<string, unknown> = {};
    if (teamId !== undefined) updates.team_id = teamId;
    if (role !== undefined) updates.role = role;

    const { error } = await supabase.from('players').update(updates).eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[API admin/jogadores PATCH]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
