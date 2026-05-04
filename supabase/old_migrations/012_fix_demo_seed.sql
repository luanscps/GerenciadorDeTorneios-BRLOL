-- =============================================================
-- 012_fix_demo_seed.sql  (v2 — sem FK em auth.users)
-- =============================================================

DO $$
DECLARE
  v_tournament_id uuid;
  v_team1_id      uuid;
  v_team2_id      uuid;
  v_team3_id      uuid;
  v_team4_id      uuid;
BEGIN

  -- ===========================================================
  -- 0. LIMPAR dados demo anteriores (idempotente)
  -- ===========================================================
  DELETE FROM public.seedings
   WHERE tournament_id IN (
     SELECT id FROM public.tournaments WHERE name = 'Copa BRLOL Amadora 2026'
   );

  DELETE FROM public.inscricoes
   WHERE tournament_id IN (
     SELECT id FROM public.tournaments WHERE name = 'Copa BRLOL Amadora 2026'
   );

  DELETE FROM public.players
   WHERE team_id IN (
     SELECT id FROM public.teams
      WHERE name IN ('Dragões de Fogo','Lobos da Noite','Águias Douradas','Leões Selvagens')
   );

  DELETE FROM public.teams
   WHERE name IN ('Dragões de Fogo','Lobos da Noite','Águias Douradas','Leões Selvagens');

  DELETE FROM public.tournaments WHERE name = 'Copa BRLOL Amadora 2026';

  -- ===========================================================
  -- 1. TORNEIO DEMO
  -- ===========================================================
  INSERT INTO public.tournaments (
    id, name, description, status, bracket_type,
    max_teams, prize_pool, start_date, end_date
  ) VALUES (
    gen_random_uuid(),
    'Copa BRLOL Amadora 2026',
    'Primeiro torneio amador de League of Legends do Brasil em 2026.',
    'OPEN',
    'SINGLE_ELIMINATION',
    4,
    'R$ 5.000,00',
    now() + interval '7 days',
    now() + interval '14 days'
  )
  RETURNING id INTO v_tournament_id;

  -- ===========================================================
  -- 2. TIMES DEMO
  -- ===========================================================
  INSERT INTO public.teams (id, tournament_id, name, tag)
  VALUES (gen_random_uuid(), v_tournament_id, 'Dragões de Fogo', 'DDF')
  RETURNING id INTO v_team1_id;

  INSERT INTO public.teams (id, tournament_id, name, tag)
  VALUES (gen_random_uuid(), v_tournament_id, 'Lobos da Noite', 'LDN')
  RETURNING id INTO v_team2_id;

  INSERT INTO public.teams (id, tournament_id, name, tag)
  VALUES (gen_random_uuid(), v_tournament_id, 'Águias Douradas', 'AGD')
  RETURNING id INTO v_team3_id;

  INSERT INTO public.teams (id, tournament_id, name, tag)
  VALUES (gen_random_uuid(), v_tournament_id, 'Leões Selvagens', 'LSL')
  RETURNING id INTO v_team4_id;

  -- ===========================================================
  -- 3. JOGADORES DEMO
  -- FIX: coluna tagline (sem underscore), conforme migration 008
  -- ===========================================================

  -- Dragões de Fogo
  INSERT INTO public.players (team_id, summoner_name, tagline, role, tier, rank, lp, wins, losses, profile_icon, summoner_level) VALUES
    (v_team1_id, 'DragonSlayer99', 'BR1', 'TOP',     'GOLD',     'II',  75, 142, 130, 4901, 187),
    (v_team1_id, 'FireBreath',     'BR1', 'JUNGLE',  'GOLD',     'I',   89, 156, 138, 4902, 201),
    (v_team1_id, 'InfernoMage',    'BR1', 'MID',     'PLATINUM', 'IV',  45, 178, 152, 4903, 215),
    (v_team1_id, 'ScorchADC',      'BR1', 'ADC',     'GOLD',     'II',  68, 165, 149, 4904, 192),
    (v_team1_id, 'FlameGuard',     'BR1', 'SUPPORT', 'GOLD',     'III', 52, 134, 127, 4905, 175);

  -- Lobos da Noite
  INSERT INTO public.players (team_id, summoner_name, tagline, role, tier, rank, lp, wins, losses, profile_icon, summoner_level) VALUES
    (v_team2_id, 'NightHowler',  'BR1', 'TOP',     'PLATINUM', 'IV',  38, 189, 165, 5001, 228),
    (v_team2_id, 'LunarPack',    'BR1', 'JUNGLE',  'PLATINUM', 'III', 56, 195, 171, 5002, 234),
    (v_team2_id, 'MoonShadow',   'BR1', 'MID',     'PLATINUM', 'II',  72, 203, 178, 5003, 241),
    (v_team2_id, 'EclipseADC',   'BR1', 'ADC',     'PLATINUM', 'IV',  41, 187, 168, 5004, 225),
    (v_team2_id, 'StarGuardian', 'BR1', 'SUPPORT', 'GOLD',     'I',   88, 176, 162, 5005, 212);

  -- Águias Douradas
  INSERT INTO public.players (team_id, summoner_name, tagline, role, tier, rank, lp, wins, losses, profile_icon, summoner_level) VALUES
    (v_team3_id, 'GoldenWings',  'BR1', 'TOP',     'PLATINUM', 'I',   78, 215, 189, 5101, 256),
    (v_team3_id, 'SkyHunter',    'BR1', 'JUNGLE',  'PLATINUM', 'II',  65, 208, 183, 5102, 248),
    (v_team3_id, 'CloudStrike',  'BR1', 'MID',     'DIAMOND',  'IV',  22, 241, 208, 5103, 287),
    (v_team3_id, 'SoarADC',      'BR1', 'ADC',     'PLATINUM', 'I',   81, 219, 192, 5104, 261),
    (v_team3_id, 'FeatherGuard', 'BR1', 'SUPPORT', 'PLATINUM', 'IV',  48, 198, 178, 5105, 239);

  -- Leões Selvagens
  INSERT INTO public.players (team_id, summoner_name, tagline, role, tier, rank, lp, wins, losses, profile_icon, summoner_level) VALUES
    (v_team4_id, 'SavageRoar',   'BR1', 'TOP',     'GOLD',     'I',   94, 167, 151, 5201, 198),
    (v_team4_id, 'JunglePride',  'BR1', 'JUNGLE',  'PLATINUM', 'IV',  32, 185, 168, 5202, 222),
    (v_team4_id, 'KingMane',     'BR1', 'MID',     'PLATINUM', 'IV',  39, 188, 172, 5203, 227),
    (v_team4_id, 'ClawStrike',   'BR1', 'ADC',     'GOLD',     'I',   87, 171, 156, 5204, 203),
    (v_team4_id, 'ManeProtect',  'BR1', 'SUPPORT', 'GOLD',     'II',  76, 159, 148, 5205, 189);

  -- ===========================================================
  -- 4. INSCRIÇÕES
  -- FIX: requested_by = NULL
  -- profiles.id → auth.users(id) FK estrita: não dá inserir
  -- perfil fake sem usuário real no auth. NULL é aceito (SET NULL)
  -- ===========================================================
  INSERT INTO public.inscricoes (tournament_id, team_id, status, requested_by)
  VALUES
    (v_tournament_id, v_team1_id, 'APPROVED', NULL),
    (v_tournament_id, v_team2_id, 'APPROVED', NULL),
    (v_tournament_id, v_team3_id, 'APPROVED', NULL),
    (v_tournament_id, v_team4_id, 'APPROVED', NULL);

  -- ===========================================================
  -- 5. SEEDINGS
  -- ===========================================================
  INSERT INTO public.seedings (tournament_id, team_id, seed)
  VALUES
    (v_tournament_id, v_team1_id, 1),
    (v_tournament_id, v_team2_id, 2),
    (v_tournament_id, v_team3_id, 3),
    (v_tournament_id, v_team4_id, 4);

  RAISE NOTICE 'Seed 012 aplicado. Torneio: % | Times: %, %, %, %',
    v_tournament_id, v_team1_id, v_team2_id, v_team3_id, v_team4_id;

END $$;
