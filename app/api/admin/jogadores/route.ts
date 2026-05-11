import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(_req: NextRequest) {
  try {
    const supabase = await createClient();

    // Fix 1: removido team_id e teams(name) — coluna team_id foi dropada na migration
    // O time do jogador agora é gerenciado via tabela team_members
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
        created_at
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const jogadores = (data ?? []).map((p: any) => ({
      id: p.id,
      summonerName: p.summoner_name,
      tagLine: p.tag_line,
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
    // Fix 1: removido teamId — team_id não existe mais na tabela players
    // Associação de time agora é feita via team_members
    const { id, role } = body as { id: string; role?: string };
    if (!id) return NextResponse.json({ error: 'ID obrigatorio' }, { status: 400 });

    const supabase = await createClient();
    const updates: Record<string, unknown> = {};
    if (role !== undefined) updates.role = role;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: true });
    }

    const { error } = await supabase.from('players').update(updates).eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[API admin/jogadores PATCH]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
