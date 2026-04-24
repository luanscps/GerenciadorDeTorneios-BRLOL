-- =============================================================
-- 012_fix_demo_seed.sql
-- Corrige os dados de demonstração para bater com o schema
-- pós-migrations 008–011:
--   • players: remove tag_line, usa tagline
--   • inscricoes: adiciona requested_by obrigatório
--   • riotaccounts + ranksnapshots + championmasteries: dados demo
--   • notifications: alinhado ao schema de 010
-- IMPORTANTE: este script é idempotente via DELETE + INSERT
-- =============================================================

DO $$
DECLARE
  v_tournament_id   uuid;
  v_team1_id        uuid;
  v_team2_id        uuid;
  v_team3_id        uuid;
  v_team4_id        uuid;

  -- UUIDs fixos para os jogadores demo (facilitam referência em riotaccounts)
  v_p1  uuid := 'a1000001-0000-0000-0000-000000000001';
  v_p2  uuid := 'a1000001-0000-0000-0000-000000000002';
  v_p3  uuid := 'a1000001-0000-0000-0000-000000000003';
  v_p4  uuid := 'a1000001-0000-0000-0000-000000000004';
  v_p5  uuid := 'a1000001-0000-0000-0000-000000000005';
  v_p6  uuid := 'a1000001-0000-0000-0000-000000000006';
  v_p7  uuid := 'a1000001-0000-0000-0000-000000000007';
  v_p8  uuid := 'a1000001-0000-0000-0000-000000000008';

  -- UUID fixo para o perfil demo (simula auth.users sem criar user real)
  v_demo_profile_id uuid := 'f0000000-0000-0000-0000-000000000001';

BEGIN

  -- ===========================================================
  -- 0. LIMPAR dados demo anteriores (idempotente)
  -- ===========================================================
  DELETE FROM public.champion_masteries
   WHERE riot_account_id IN (
     SELECT id FROM public.riot_accounts
      WHERE profile_id = v_demo_profile_id
   );

  DELETE FROM public.rank_snapshots
   WHERE riot_account_id IN (
     SELECT id FROM public.riot_accounts
      WHERE profile_id = v_demo_profile_id
   );

  DELETE FROM public.riot_accounts  WHERE profile_id = v_demo_profile_id;
  DELETE FROM public.notifications  WHERE user_id     = v_demo_profile_id;
  DELETE FROM public.seedings       WHERE tournament_id IN (
    SELECT id FROM public.tournaments WHERE name = 'Copa BRLOL Amadora 2026'
  );
  DELETE FROM public.inscricoes     WHERE tournament_id IN (
    SELECT id FROM public.tournaments WHERE name = 'Copa BRLOL Amadora 2026'
  );
  DELETE FROM public.players        WHERE team_id IN (
    SELECT id FROM public.teams WHERE name IN (
      'Dragões de Fogo','Lobos da Noite','Águias Douradas','Leões Selvagens'
    )
  );
  DELETE FROM public.teams          WHERE name IN (
    'Dragões de Fogo','Lobos da Noite','Águias Douradas','Leões Selvagens'
  );
  DELETE FROM public.tournaments    WHERE name = 'Copa BRLOL Amadora 2026';

  -- ===========================================================
  -- 1. TORNEIO DEMO
  -- ===========================================================
  INSERT INTO public.tournaments (
    id, name, description, status, bracket_type,
    max_teams, prize_pool, start_date, end_date, min_tier
  ) VALUES (
    gen_random_uuid(),
    'Copa BRLOL Amadora 2026',
    'Primeiro torneio amador de League of Legends do Brasil em 2026.',
    'OPEN',
    'SINGLE_ELIMINATION',
    4,
    'R$ 5.000,00',
    now() + interval '7 days',
    now() + interval '14 days',
    'SILVER'
  )
  RETURNING id INTO v_tournament_id;

  -- ===========================================================
  -- 2. TIMES DEMO
  -- ===========================================================
  INSERT INTO public.teams (id, tournament_id, name, tag)
  VALUES (gen_random_uuid(), v_tournament_id, 'Dragões de Fogo',  'DDF') RETURNING id INTO v_team1_id;

  INSERT INTO public.teams (id, tournament_id, name, tag)
  VALUES (gen_random_uuid(), v_tournament_id, 'Lobos da Noite',   'LDN') RETURNING id INTO v_team2_id;

  INSERT INTO public.teams (id, tournament_id, name, tag)
  VALUES (gen_random_uuid(), v_tournament_id, 'Águias Douradas',  'AGD') RETURNING id INTO v_team3_id;

  INSERT INTO public.teams (id, tournament_id, name, tag)
  VALUES (gen_random_uuid(), v_tournament_id, 'Leões Selvagens',  'LSL') RETURNING id INTO v_team4_id;

  -- ===========================================================
  -- 3. JOGADORES DEMO
  -- FIX: coluna correta é tagline (sem underscore), conforme 008
  -- FIX: profile_icon / summoner_level sem underscore conforme 001
  -- ===========================================================

  -- Dragões de Fogo
  INSERT INTO public.players (team_id, summoner_name, tagline, role, tier, rank, lp, wins, losses, profile_icon, summoner_level) VALUES
    (v_team1_id, 'DragonSlayer99', 'BR1', 'TOP',     'GOLD',     'II', 75, 142, 130, 4901, 187),
    (v_team1_id, 'FireBreath',     'BR1', 'JUNGLE',  'GOLD',     'I',  89, 156, 138, 4902, 201),
    (v_team1_id, 'InfernoMage',    'BR1', 'MID',     'PLATINUM', 'IV', 45, 178, 152, 4903, 215),
    (v_team1_id, 'ScorchADC',      'BR1', 'ADC',     'GOLD',     'II', 68, 165, 149, 4904, 192),
    (v_team1_id, 'FlameGuard',     'BR1', 'SUPPORT', 'GOLD',     'III',52, 134, 127, 4905, 175);

  -- Lobos da Noite
  INSERT INTO public.players (team_id, summoner_name, tagline, role, tier, rank, lp, wins, losses, profile_icon, summoner_level) VALUES
    (v_team2_id, 'NightHowler',   'BR1', 'TOP',     'PLATINUM', 'IV', 38, 189, 165, 5001, 228),
    (v_team2_id, 'LunarPack',     'BR1', 'JUNGLE',  'PLATINUM', 'III',56, 195, 171, 5002, 234),
    (v_team2_id, 'MoonShadow',    'BR1', 'MID',     'PLATINUM', 'II', 72, 203, 178, 5003, 241),
    (v_team2_id, 'EclipseADC',    'BR1', 'ADC',     'PLATINUM', 'IV', 41, 187, 168, 5004, 225),
    (v_team2_id, 'StarGuardian',  'BR1', 'SUPPORT', 'GOLD',     'I',  88, 176, 162, 5005, 212);

  -- Águias Douradas
  INSERT INTO public.players (team_id, summoner_name, tagline, role, tier, rank, lp, wins, losses, profile_icon, summoner_level) VALUES
    (v_team3_id, 'GoldenWings',  'BR1', 'TOP',     'PLATINUM', 'I',  78, 215, 189, 5101, 256),
    (v_team3_id, 'SkyHunter',    'BR1', 'JUNGLE',  'PLATINUM', 'II', 65, 208, 183, 5102, 248),
    (v_team3_id, 'CloudStrike',  'BR1', 'MID',     'DIAMOND',  'IV', 22, 241, 208, 5103, 287),
    (v_team3_id, 'SoarADC',      'BR1', 'ADC',     'PLATINUM', 'I',  81, 219, 192, 5104, 261),
    (v_team3_id, 'FeatherGuard', 'BR1', 'SUPPORT', 'PLATINUM', 'IV', 48, 198, 178, 5105, 239);

  -- Leões Selvagens
  INSERT INTO public.players (team_id, summoner_name, tagline, role, tier, rank, lp, wins, losses, profile_icon, summoner_level) VALUES
    (v_team4_id, 'SavageRoar',      'BR1', 'TOP',     'GOLD',     'I',  94, 167, 151, 5201, 198),
    (v_team4_id, 'JunglePride',     'BR1', 'JUNGLE',  'PLATINUM', 'IV', 32, 185, 168, 5202, 222),
    (v_team4_id, 'KingMane',        'BR1', 'MID',     'PLATINUM', 'IV', 39, 188, 172, 5203, 227),
    (v_team4_id, 'ClawStrike',      'BR1', 'ADC',     'GOLD',     'I',  87, 171, 156, 5204, 203),
    (v_team4_id, 'ManeProtect',     'BR1', 'SUPPORT', 'GOLD',     'II', 76, 159, 148, 5205, 189);

  -- ===========================================================
  -- 4. INSCRIÇÕES
  -- FIX: inclui requested_by (obrigatório após migration 011)
  -- Usa v_demo_profile_id como responsável demo
  -- ===========================================================
  INSERT INTO public.inscricoes (tournament_id, team_id, status, requested_by)
  VALUES
    (v_tournament_id, v_team1_id, 'APPROVED', v_demo_profile_id),
    (v_tournament_id, v_team2_id, 'APPROVED', v_demo_profile_id),
    (v_tournament_id, v_team3_id, 'APPROVED', v_demo_profile_id),
    (v_tournament_id, v_team4_id, 'APPROVED', v_demo_profile_id);

  -- ===========================================================
  -- 5. SEEDINGS
  -- ===========================================================
  INSERT INTO public.seedings (tournament_id, team_id, seed)
  VALUES
    (v_tournament_id, v_team1_id, 1),
    (v_tournament_id, v_team2_id, 2),
    (v_tournament_id, v_team3_id, 3),
    (v_tournament_id, v_team4_id, 4);

  -- ===========================================================
  -- 6. RIOT ACCOUNTS DEMO
  -- Simula 8 contas Riot (2 por time) vinculadas ao perfil demo
  -- FIX: tabela criada em 009, não existia antes
  -- ===========================================================
  INSERT INTO public.riot_accounts (id, profile_id, puuid, gamename, tagline, summoner_id, summoner_level, profile_icon_id, is_primary)
  VALUES
    (v_p1, v_demo_profile_id, 'puuid-dragon-1', 'DragonSlayer99', 'BR1', 'sid-dragon-1', 187, 4901, true),
    (v_p2, v_demo_profile_id, 'puuid-dragon-2', 'FireBreath',     'BR1', 'sid-dragon-2', 201, 4902, false),
    (v_p3, v_demo_profile_id, 'puuid-lobo-1',   'NightHowler',    'BR1', 'sid-lobo-1',   228, 5001, false),
    (v_p4, v_demo_profile_id, 'puuid-lobo-2',   'LunarPack',      'BR1', 'sid-lobo-2',   234, 5002, false),
    (v_p5, v_demo_profile_id, 'puuid-aguia-1',  'GoldenWings',    'BR1', 'sid-aguia-1',  256, 5101, false),
    (v_p6, v_demo_profile_id, 'puuid-aguia-2',  'SkyHunter',      'BR1', 'sid-aguia-2',  248, 5102, false),
    (v_p7, v_demo_profile_id, 'puuid-leao-1',   'SavageRoar',     'BR1', 'sid-leao-1',   198, 5201, false),
    (v_p8, v_demo_profile_id, 'puuid-leao-2',   'JunglePride',    'BR1', 'sid-leao-2',   222, 5202, false);

  -- ===========================================================
  -- 7. RANK SNAPSHOTS DEMO
  -- FIX: tabela criada em 009, não existia antes
  -- ===========================================================
  INSERT INTO public.rank_snapshots (riot_account_id, queue_type, tier, rank, lp, wins, losses, hot_streak)
  VALUES
    (v_p1, 'RANKED_SOLO_5x5', 'GOLD',     'II', 75,  142, 130, false),
    (v_p2, 'RANKED_SOLO_5x5', 'GOLD',     'I',  89,  156, 138, true),
    (v_p3, 'RANKED_SOLO_5x5', 'PLATINUM', 'IV', 38,  189, 165, false),
    (v_p4, 'RANKED_SOLO_5x5', 'PLATINUM', 'III',56,  195, 171, false),
    (v_p5, 'RANKED_SOLO_5x5', 'PLATINUM', 'I',  78,  215, 189, true),
    (v_p6, 'RANKED_SOLO_5x5', 'PLATINUM', 'II', 65,  208, 183, false),
    (v_p7, 'RANKED_SOLO_5x5', 'GOLD',     'I',  94,  167, 151, true),
    (v_p8, 'RANKED_SOLO_5x5', 'PLATINUM', 'IV', 32,  185, 168, false);

  -- ===========================================================
  -- 8. CHAMPION MASTERIES DEMO (top 3 por conta)
  -- FIX: tabela criada em 009, não existia antes
  -- ===========================================================
  INSERT INTO public.champion_masteries (riot_account_id, champion_id, champion_name, mastery_level, mastery_points, last_play_time)
  VALUES
    -- DragonSlayer99
    (v_p1, 157, 'Yasuo',   7, 485000, now() - interval '2 days'),
    (v_p1, 238, 'Zed',     6, 312000, now() - interval '5 days'),
    (v_p1, 91,  'Talon',   5, 198000, now() - interval '10 days'),
    -- FireBreath
    (v_p2, 64,  'Lee Sin', 7, 621000, now() - interval '1 day'),
    (v_p2, 76,  'Nocturne',6, 287000, now() - interval '4 days'),
    (v_p2, 254, 'Vi',      5, 211000, now() - interval '8 days'),
    -- NightHowler
    (v_p3, 98,  'Shen',    7, 543000, now() - interval '3 days'),
    (v_p3, 57,  'Maokai',  6, 298000, now() - interval '6 days'),
    (v_p3, 10,  'Kayle',   5, 176000, now() - interval '12 days'),
    -- GoldenWings
    (v_p5, 39,  'Singed',  7, 712000, now() - interval '1 day'),
    (v_p5, 33,  'Rammus',  6, 356000, now() - interval '5 days'),
    (v_p5, 420, 'Illaoi',  5, 243000, now() - interval '9 days');

  -- ===========================================================
  -- 9. NOTIFICAÇÕES DEMO
  -- FIX: alinhado ao schema de 010 (user_id → profiles.id, tem link)
  -- ===========================================================
  INSERT INTO public.notifications (user_id, type, title, body, link, read)
  VALUES
    (v_demo_profile_id, 'inscricao_aprovada', 'Time aprovado!',
     'O time Dragões de Fogo foi aprovado na Copa BRLOL Amadora 2026.',
     '/dashboard', false),

    (v_demo_profile_id, 'partida_agendada', 'Partida agendada',
     'Sua próxima partida foi agendada. Fique de olho!',
     '/dashboard', false),

    (v_demo_profile_id, 'sistema', 'Bem-vindo ao BRLOL!',
     'Sua conta foi criada com sucesso. Explore os torneios disponíveis.',
     '/dashboard', true);

  RAISE NOTICE 'Seed 012 aplicado com sucesso. Torneio ID: %', v_tournament_id;

END $$;
