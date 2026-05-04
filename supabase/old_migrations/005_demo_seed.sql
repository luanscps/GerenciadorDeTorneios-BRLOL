-- Habilitar extensao unaccent necessaria para funcao generate_tournament_slug()
create extension if not exists "unaccent";

-- =============================================================
-- 005_demo_seed.sql
-- Dados de demonstração para GerenciadorDeTorneios-BRLOL
-- 4 times fictícios, 40 jogadores, torneios e partidas
-- =============================================================

-- LIMPAR dados de demonstração existentes (se necessário)
-- DELETE FROM public.player_stats;
-- DELETE FROM public.match_games;
-- DELETE FROM public.matches;
-- DELETE FROM public.inscricoes;
-- DELETE FROM public.seedings;
-- DELETE FROM public.players;
-- DELETE FROM public.teams;
-- DELETE FROM public.tournament_stages;
-- DELETE FROM public.tournaments;

-- =============================================================
-- 1. CRIAR TORNEIO DEMO
-- =============================================================
INSERT INTO public.tournaments (id, name, description, status, bracket_type, max_teams, prize_pool, start_date, end_date, min_tier)
VALUES (
  gen_random_uuid(),
  'Copa BRLOL Amadora 2026',
  'Primeiro torneio amador de League of Legends do Brasil em 2026. Melhor de 5 times competindo pelo título!',
  'OPEN',
  'SINGLE_ELIMINATION',
  4,
  'R$ 5.000,00',
  now() + interval '7 days',
  now() + interval '14 days',
  'SILVER'
) RETURNING id;

-- Capturar ID do torneio criado
DO $$
DECLARE
  v_tournament_id uuid;
  v_team1_id uuid;
  v_team2_id uuid;
  v_team3_id uuid;
  v_team4_id uuid;
BEGIN
  -- Buscar o torneio recém-criado
  SELECT id INTO v_tournament_id FROM public.tournaments WHERE name = 'Copa BRLOL Amadora 2026' LIMIT 1;

  -- =============================================================
  -- 2. CRIAR 4 TIMES FICTÍCIOS
  -- =============================================================
  
  -- TIME 1: Dragões de Fogo
  INSERT INTO public.teams (id, tournament_id, name, tag)
  VALUES (gen_random_uuid(), v_tournament_id, 'Dragões de Fogo', 'DDF')
  RETURNING id INTO v_team1_id;
  
  -- TIME 2: Lobos da Noite
  INSERT INTO public.teams (id, tournament_id, name, tag)
  VALUES (gen_random_uuid(), v_tournament_id, 'Lobos da Noite', 'LDN')
  RETURNING id INTO v_team2_id;
  
  -- TIME 3: Águias Douradas
  INSERT INTO public.teams (id, tournament_id, name, tag)
  VALUES (gen_random_uuid(), v_tournament_id, 'Águias Douradas', 'AGD')
  RETURNING id INTO v_team3_id;
  
  -- TIME 4: Leões Selvagens
  INSERT INTO public.teams (id, tournament_id, name, tag)
  VALUES (gen_random_uuid(), v_tournament_id, 'Leões Selvagens', 'LSL')
  RETURNING id INTO v_team4_id;

  -- =============================================================
  -- 3. CRIAR 40 JOGADORES (10 por time)
  -- =============================================================

  -- DRAGÕES DE FOGO (Time 1) - 10 jogadores
  INSERT INTO public.players (team_id, summoner_name, tag_line, role, tier, rank, lp, wins, losses, profile_icon, summoner_level)
  VALUES
    (v_team1_id, 'DragonSlayer99', 'BR1', 'TOP', 'GOLD', 'II', 75, 142, 130, 4901, 187),
    (v_team1_id, 'FireBreath', 'BR1', 'JUNGLE', 'GOLD', 'I', 89, 156, 138, 4902, 201),
    (v_team1_id, 'InfernoMage', 'BR1', 'MID', 'PLATINUM', 'IV', 45, 178, 152, 4903, 215),
    (v_team1_id, 'ScorchADC', 'BR1', 'ADC', 'GOLD', 'II', 68, 165, 149, 4904, 192),
    (v_team1_id, 'FlameGuard', 'BR1', 'SUPPORT', 'GOLD', 'III', 52, 134, 127, 4905, 175),
    (v_team1_id, 'BlazeRunner', 'BR1', 'TOP', 'GOLD', 'I', 91, 148, 135, 4906, 196),
    (v_team1_id, 'EmberStrike', 'BR1', 'JUNGLE', 'GOLD', 'II', 73, 151, 142, 4907, 183),
    (v_team1_id, 'PhoenixRise', 'BR1', 'MID', 'GOLD', 'I', 85, 159, 145, 4908, 205),
    (v_team1_id, 'CinderShot', 'BR1', 'ADC', 'GOLD', 'III', 61, 143, 136, 4909, 179),
    (v_team1_id, 'AshProtector', 'BR1', 'SUPPORT', 'SILVER', 'I', 95, 128, 121, 4910, 168);

  -- LOBOS DA NOITE (Time 2) - 10 jogadores
  INSERT INTO public.players (team_id, summoner_name, tag_line, role, tier, rank, lp, wins, losses, profile_icon, summoner_level)
  VALUES
    (v_team2_id, 'NightHowler', 'BR1', 'TOP', 'PLATINUM', 'IV', 38, 189, 165, 5001, 228),
    (v_team2_id, 'LunarPack', 'BR1', 'JUNGLE', 'PLATINUM', 'III', 56, 195, 171, 5002, 234),
    (v_team2_id, 'MoonShadow', 'BR1', 'MID', 'PLATINUM', 'II', 72, 203, 178, 5003, 241),
    (v_team2_id, 'EclipseADC', 'BR1', 'ADC', 'PLATINUM', 'IV', 41, 187, 168, 5004, 225),
    (v_team2_id, 'StarGuardian', 'BR1', 'SUPPORT', 'GOLD', 'I', 88, 176, 162, 5005, 212),
    (v_team2_id, 'DarkProwler', 'BR1', 'TOP', 'PLATINUM', 'IV', 35, 184, 170, 5006, 221),
    (v_team2_id, 'ShadowHunt', 'BR1', 'JUNGLE', 'PLATINUM', 'III', 64, 191, 175, 5007, 229),
    (v_team2_id, 'TwilightMage', 'BR1', 'MID', 'PLATINUM', 'III', 59, 198, 182, 5008, 236),
    (v_team2_id, 'NightArrow', 'BR1', 'ADC', 'PLATINUM', 'IV', 44, 182, 169, 5009, 223),
    (v_team2_id, 'DuskShield', 'BR1', 'SUPPORT', 'GOLD', 'I', 92, 173, 159, 5010, 209);

  -- ÁGUIAS DOURADAS (Time 3) - 10 jogadores
  INSERT INTO public.players (team_id, summoner_name, tag_line, role, tier, rank, lp, wins, losses, profile_icon, summoner_level)
  VALUES
    (v_team3_id, 'GoldenWings', 'BR1', 'TOP', 'PLATINUM', 'I', 78, 215, 189, 5101, 256),
    (v_team3_id, 'SkyHunter', 'BR1', 'JUNGLE', 'PLATINUM', 'II', 65, 208, 183, 5102, 248),
    (v_team3_id, 'CloudStrike', 'BR1', 'MID', 'DIAMOND', 'IV', 22, 241, 208, 5103, 287),
    (v_team3_id, 'SoarADC', 'BR1', 'ADC', 'PLATINUM', 'I', 81, 219, 192, 5104, 261),
    (v_team3_id, 'FeatherGuard', 'BR1', 'SUPPORT', 'PLATINUM', 'IV', 48, 198, 178, 5105, 239),
    (v_team3_id, 'TalonSlash', 'BR1', 'TOP', 'PLATINUM', 'II', 69, 212, 188, 5106, 251),
    (v_team3_id, 'AerialAce', 'BR1', 'JUNGLE', 'PLATINUM', 'I', 75, 207, 185, 5107, 244),
    (v_team3_id, 'StormBringer', 'BR1', 'MID', 'PLATINUM', 'I', 83, 221, 195, 5108, 265),
    (v_team3_id, 'WindShot', 'BR1', 'ADC', 'PLATINUM', 'II', 71, 214, 191, 5109, 254),
    (v_team3_id, 'NestKeeper', 'BR1', 'SUPPORT', 'PLATINUM', 'IV', 51, 202, 182, 5110, 242);

  -- LEÕES SELVAGENS (Time 4) - 10 jogadores
  INSERT INTO public.players (team_id, summoner_name, tag_line, role, tier, rank, lp, wins, losses, profile_icon, summoner_level)
  VALUES
    (v_team4_id, 'SavageRoar', 'BR1', 'TOP', 'GOLD', 'I', 94, 167, 151, 5201, 198),
    (v_team4_id, 'JunglePride', 'BR1', 'JUNGLE', 'PLATINUM', 'IV', 32, 185, 168, 5202, 222),
    (v_team4_id, 'KingMane', 'BR1', 'MID', 'PLATINUM', 'IV', 39, 188, 172, 5203, 227),
    (v_team4_id, 'ClawStrike', 'BR1', 'ADC', 'GOLD', 'I', 87, 171, 156, 5204, 203),
    (v_team4_id, 'ManeProtect', 'BR1', 'SUPPORT', 'GOLD', 'II', 76, 159, 148, 5205, 189),
    (v_team4_id, 'WildHeart', 'BR1', 'TOP', 'GOLD', 'I', 90, 164, 153, 5206, 195),
    (v_team4_id, 'PrideHunter', 'BR1', 'JUNGLE', 'GOLD', 'I', 86, 169, 157, 5207, 201),
    (v_team4_id, 'SavannahKing', 'BR1', 'MID', 'PLATINUM', 'IV', 36, 183, 170, 5208, 219),
    (v_team4_id, 'RoarShot', 'BR1', 'ADC', 'GOLD', 'II', 79, 162, 150, 5209, 193),
    (v_team4_id, 'TerritoryGuard', 'BR1', 'SUPPORT', 'GOLD', 'III', 64, 155, 145, 5210, 185);

  -- =============================================================
  -- 4. INSCREVER TIMES NO TORNEIO
  -- =============================================================
  INSERT INTO public.inscricoes (tournament_id, team_id, status)
  VALUES
    (v_tournament_id, v_team1_id, 'APPROVED'),
    (v_tournament_id, v_team2_id, 'APPROVED'),
    (v_tournament_id, v_team3_id, 'APPROVED'),
    (v_tournament_id, v_team4_id, 'APPROVED');

  -- =============================================================
  -- 5. CRIAR SEEDINGS (CHAVEAMENTO)
  -- =============================================================
  INSERT INTO public.seedings (tournament_id, team_id, seed)
  VALUES
    (v_tournament_id, v_team1_id, 1),
    (v_tournament_id, v_team2_id, 2),
    (v_tournament_id, v_team3_id, 3),
    (v_tournament_id, v_team4_id, 4);

END $$;

-- =============================================================
-- FIM DA SEED DE DEMONSTRAÇÃO
-- =============================================================
-- Para visualizar os dados:
-- SELECT * FROM public.tournaments WHERE name = 'Copa BRLOL Amadora 2026';
-- SELECT * FROM public.teams ORDER BY created_at DESC LIMIT 4;
-- SELECT * FROM public.players ORDER BY created_at DESC LIMIT 40;
-- SELECT * FROM public.inscricoes ORDER BY created_at DESC LIMIT 4;
-- SELECT * FROM public.seedings ORDER BY created_at DESC LIMIT 4;
