import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const VALID_ROLES = ['top', 'jungle', 'mid', 'adc', 'support'] as const;
type Role = typeof VALID_ROLES[number];

export async function GET(_req: NextRequest) {
  try {
    const supabase = await createClient();

    // Fix: players não tem mais team_id — time resolvido via riot_accounts → team_members → teams
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
        riot_account_id,
        riot_accounts (
          id,
          puuid,
          team_members (
            team_id,
            status,
            teams (
              name,
              tag
            )
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const jogadores = (data ?? []).map((p: any) => {
      // Resolve o time ativo: primeiro team_member com status ACCEPTED
      const riotAcc = p.riot_accounts;
      const activeTeam = riotAcc?.team_members?.find(
        (tm: any) => tm.status === 'ACCEPTED'
      );

      return {
        id:          p.id,
        summonerName: p.summoner_name,
        tagLine:     p.tag_line,
        role:        p.role,
        tier:        p.tier,
        rank:        p.rank,
        lp:          p.lp,
        wins:        p.wins,
        losses:      p.losses,
        createdAt:   p.created_at,
        teamName:    activeTeam?.teams?.name ?? null,
        teamTag:     activeTeam?.teams?.tag  ?? null,
      };
    });

    return NextResponse.json(jogadores);
  } catch (err) {
    console.error('[API admin/jogadores GET]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, role } = body as { id: string; role?: string };

    if (!id) {
      return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });
    }

    if (role !== undefined && !VALID_ROLES.includes(role as Role)) {
      return NextResponse.json(
        { error: `Role inválida. Valores aceitos: ${VALID_ROLES.join(', ')}` },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const updates: Record<string, unknown> = {};
    if (role !== undefined) updates.role = role;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: true, message: 'Nenhum campo para atualizar' });
    }

    const { error } = await supabase.from('players').update(updates).eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[API admin/jogadores PATCH]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
