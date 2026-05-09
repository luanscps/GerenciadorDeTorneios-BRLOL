import { createMcpHandler } from '@vercel/mcp-adapter';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';

const handler = createMcpHandler((server) => {

  // ─── PROJETO ──────────────────────────────────────────────────────────────
  server.tool(
    'get_project_info',
    'Retorna informações gerais do projeto GerenciadorDeTorneios-BRLOL',
    {},
    async () => ({
      content: [{
        type: 'text',
        text: JSON.stringify({
          projeto: 'GerenciadorDeTorneios-BRLOL',
          stack: 'Next.js 16 + Supabase + Riot Games API',
          rotas: ['/torneios', '/times', '/jogadores', '/ranking', '/dashboard', '/admin', '/organizador'],
          modulos: ['torneios', 'times', 'jogadores', 'partidas', 'ranking', 'checkin', 'riot-api'],
        }, null, 2),
      }],
    })
  );

  // ─── TORNEIOS ─────────────────────────────────────────────────────────────
  server.tool(
    'list_torneios',
    'Lista todos os torneios. Filtro opcional por status: DRAFT | OPEN | IN_PROGRESS | FINISHED | CANCELLED',
    {
      status: z.enum(['DRAFT', 'OPEN', 'IN_PROGRESS', 'FINISHED', 'CANCELLED']).optional(),
      limit: z.number().min(1).max(50).default(20).optional(),
    },
    async ({ status, limit = 20 }) => {
      const supabase = createAdminClient();
      let query = supabase
        .from('tournaments')
        .select('id, name, slug, status, bracket_type, max_teams, start_date, end_date, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (status) query = query.eq('status', status);

      const { data, error } = await query;
      if (error) return { content: [{ type: 'text', text: `Erro: ${error.message}` }] };
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'get_torneio',
    'Retorna detalhes completos de um torneio pelo slug ou id',
    {
      slug: z.string().optional(),
      id: z.string().uuid().optional(),
    },
    async ({ slug, id }) => {
      const supabase = createAdminClient();
      let query = supabase
        .from('tournaments')
        .select(`
          *,
          teams ( id, name, tag, logo_url,
            players ( id, summoner_name, tag_line, role, tier, rank, lp )
          )
        `);

      if (id) query = query.eq('id', id);
      else if (slug) query = query.eq('slug', slug);
      else return { content: [{ type: 'text', text: 'Informe slug ou id do torneio.' }] };

      const { data, error } = await query.single();
      if (error) return { content: [{ type: 'text', text: `Erro: ${error.message}` }] };
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  // ─── TIMES ────────────────────────────────────────────────────────────────
  server.tool(
    'list_times',
    'Lista os times de um torneio específico',
    {
      tournament_id: z.string().uuid(),
    },
    async ({ tournament_id }) => {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('teams')
        .select(`
          id, name, tag, logo_url, created_at,
          players ( id, summoner_name, tag_line, role, tier, rank, lp, wins, losses )
        `)
        .eq('tournament_id', tournament_id)
        .order('name');

      if (error) return { content: [{ type: 'text', text: `Erro: ${error.message}` }] };
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    'get_time',
    'Retorna detalhes de um time pelo id, incluindo jogadores',
    {
      team_id: z.string().uuid(),
    },
    async ({ team_id }) => {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from('teams')
        .select(`
          *,
          players ( * ),
          tournament:tournaments ( id, name, slug, status )
        `)
        .eq('id', team_id)
        .single();

      if (error) return { content: [{ type: 'text', text: `Erro: ${error.message}` }] };
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  // ─── JOGADORES ────────────────────────────────────────────────────────────
  server.tool(
    'list_jogadores',
    'Lista jogadores. Filtro opcional por tournament_id ou team_id',
    {
      tournament_id: z.string().uuid().optional(),
      team_id: z.string().uuid().optional(),
      limit: z.number().min(1).max(100).default(50).optional(),
    },
    async ({ tournament_id, team_id, limit = 50 }) => {
      const supabase = createAdminClient();
      let query = supabase
        .from('players')
        .select(`
          id, summoner_name, tag_line, role, tier, rank, lp, wins, losses, puuid, created_at,
          team:teams ( id, name, tag,
            tournament:tournaments ( id, name, slug )
          )
        `)
        .order('lp', { ascending: false })
        .limit(limit);

      if (team_id) query = query.eq('team_id', team_id);

      const { data, error } = await query;
      if (error) return { content: [{ type: 'text', text: `Erro: ${error.message}` }] };

      // filtro extra por tournament se informado
      const filtered = tournament_id
        ? data?.filter((p: any) => p.team?.tournament?.id === tournament_id)
        : data;

      return { content: [{ type: 'text', text: JSON.stringify(filtered, null, 2) }] };
    }
  );

  server.tool(
    'get_jogador',
    'Retorna detalhes de um jogador pelo id, summoner_name ou puuid',
    {
      id: z.string().uuid().optional(),
      summoner_name: z.string().optional(),
      puuid: z.string().optional(),
    },
    async ({ id, summoner_name, puuid }) => {
      const supabase = createAdminClient();
      let query = supabase
        .from('players')
        .select(`
          *,
          team:teams ( id, name, tag,
            tournament:tournaments ( id, name, slug, status )
          )
        `);

      if (id) query = query.eq('id', id);
      else if (puuid) query = query.eq('puuid', puuid);
      else if (summoner_name) query = query.ilike('summoner_name', `%${summoner_name}%`);
      else return { content: [{ type: 'text', text: 'Informe id, summoner_name ou puuid.' }] };

      const { data, error } = id || puuid ? await query.single() : await query.limit(5);
      if (error) return { content: [{ type: 'text', text: `Erro: ${error.message}` }] };
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  // ─── PARTIDAS ─────────────────────────────────────────────────────────────
  server.tool(
    'list_partidas',
    'Lista partidas de um torneio. Filtro opcional por status: SCHEDULED | IN_PROGRESS | FINISHED',
    {
      tournament_id: z.string().uuid(),
      status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'FINISHED']).optional(),
      round: z.number().int().min(1).optional(),
    },
    async ({ tournament_id, status, round }) => {
      const supabase = createAdminClient();
      let query = supabase
        .from('matches')
        .select(`
          id, round, status, score_a, score_b, scheduled_at, played_at,
          team_a:teams!matches_team_a_id_fkey ( id, name, tag ),
          team_b:teams!matches_team_b_id_fkey ( id, name, tag ),
          winner:teams!matches_winner_id_fkey ( id, name, tag )
        `)
        .eq('tournament_id', tournament_id)
        .order('round')
        .order('scheduled_at');

      if (status) query = query.eq('status', status);
      if (round) query = query.eq('round', round);

      const { data, error } = await query;
      if (error) return { content: [{ type: 'text', text: `Erro: ${error.message}` }] };
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    }
  );

  // ─── RANKING ──────────────────────────────────────────────────────────────
  server.tool(
    'get_ranking',
    'Retorna o ranking de jogadores ordenado por LP descendente, com filtro opcional por torneio',
    {
      tournament_id: z.string().uuid().optional(),
      limit: z.number().min(1).max(100).default(50).optional(),
    },
    async ({ tournament_id, limit = 50 }) => {
      const supabase = createAdminClient();
      let query = supabase
        .from('players')
        .select(`
          id, summoner_name, tag_line, role, tier, rank, lp, wins, losses,
          team:teams ( id, name, tag,
            tournament:tournaments ( id, name, slug )
          )
        `)
        .order('lp', { ascending: false })
        .limit(limit);

      const { data, error } = await query;
      if (error) return { content: [{ type: 'text', text: `Erro: ${error.message}` }] };

      const filtered = tournament_id
        ? data?.filter((p: any) => p.team?.tournament?.id === tournament_id)
        : data;

      const ranking = filtered?.map((p: any, i: number) => ({ posicao: i + 1, ...p }));
      return { content: [{ type: 'text', text: JSON.stringify(ranking, null, 2) }] };
    }
  );

  // ─── STATS ADMIN ──────────────────────────────────────────────────────────
  server.tool(
    'get_admin_stats',
    'Retorna estatísticas gerais do painel admin: total de torneios, times, jogadores e partidas',
    {},
    async () => {
      const supabase = createAdminClient();

      const [tournaments, teams, players, matches] = await Promise.all([
        supabase.from('tournaments').select('id, status'),
        supabase.from('teams').select('id', { count: 'exact', head: true }),
        supabase.from('players').select('id', { count: 'exact', head: true }),
        supabase.from('matches').select('id, status', { count: 'exact' }),
      ]);

      const stats = {
        totalTournaments: tournaments.data?.length ?? 0,
        activeTournaments: tournaments.data?.filter((t: any) => t.status === 'IN_PROGRESS').length ?? 0,
        openTournaments: tournaments.data?.filter((t: any) => t.status === 'OPEN').length ?? 0,
        totalTeams: teams.count ?? 0,
        totalPlayers: players.count ?? 0,
        totalMatches: matches.count ?? 0,
        matchesFinished: matches.data?.filter((m: any) => m.status === 'FINISHED').length ?? 0,
        matchesPending: matches.data?.filter((m: any) => m.status === 'SCHEDULED').length ?? 0,
      };

      return { content: [{ type: 'text', text: JSON.stringify(stats, null, 2) }] };
    }
  );

});

export { handler as GET, handler as POST };
