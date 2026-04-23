-- ============================================================
-- 006_demo_phases3-4.sql
-- Demo data para Fases 3 e 4: stages, matches, match_games,
-- player_stats e notifications
-- PREREQUISITO: 005_demo_seed.sql executado
-- ============================================================

DO $$
DECLARE
  v_tournament_id uuid;
  v_agd_id uuid := '23175448-c8ba-41b0-ac9e-9d2df72a0319';
  v_ddf_id uuid := 'f5b9d5bc-a4ca-44a1-9f16-575e7d6a2a3d';
  v_lsl_id uuid := '319215ab-0248-4d09-ad17-d12d83397b76';
  v_ldn_id uuid := '697bc87c-460b-43f0-865c-60e7a97f4003';
  v_stage_group uuid;
  v_stage_semi  uuid;
  v_stage_final uuid;
  v_match1 uuid;
  v_match2 uuid;
  v_match3 uuid;
  v_match4 uuid;
  v_match5 uuid;
  v_p_agd1 uuid;
  v_p_ddf1 uuid;
  v_p_lsl1 uuid;
  v_p_ldn1 uuid;
BEGIN
  SELECT id INTO v_tournament_id FROM public.tournaments LIMIT 1;
  IF v_tournament_id IS NULL THEN
    RAISE EXCEPTION 'Nenhum torneio encontrado. Execute 005_demo_seed.sql primeiro.';
  END IF;

  SELECT id INTO v_p_agd1 FROM public.players WHERE team_id = v_agd_id LIMIT 1;
  SELECT id INTO v_p_ddf1 FROM public.players WHERE team_id = v_ddf_id LIMIT 1;
  SELECT id INTO v_p_lsl1 FROM public.players WHERE team_id = v_lsl_id LIMIT 1;
  SELECT id INTO v_p_ldn1 FROM public.players WHERE team_id = v_ldn_id LIMIT 1;

  -- Fases do torneio
  INSERT INTO public.tournament_stages (id, tournament_id, name, stage_order, best_of)
  VALUES
    (uuid_generate_v4(), v_tournament_id, 'Fase de Grupos', 1, 1),
    (uuid_generate_v4(), v_tournament_id, 'Semifinal', 2, 3),
    (uuid_generate_v4(), v_tournament_id, 'Grande Final', 3, 5);

  SELECT id INTO v_stage_group FROM public.tournament_stages
    WHERE tournament_id = v_tournament_id AND name = 'Fase de Grupos';
  SELECT id INTO v_stage_semi FROM public.tournament_stages
    WHERE tournament_id = v_tournament_id AND name = 'Semifinal';
  SELECT id INTO v_stage_final FROM public.tournament_stages
    WHERE tournament_id = v_tournament_id AND name = 'Grande Final';

  -- Partidas Fase de Grupos
  v_match1 := uuid_generate_v4();
  v_match2 := uuid_generate_v4();
  v_match3 := uuid_generate_v4();

  INSERT INTO public.matches (id, tournament_id, stage_id, team_a_id, team_b_id, winner_id, status, format, scheduled_at)
  VALUES
    (v_match1, v_tournament_id, v_stage_group, v_agd_id, v_ddf_id, v_agd_id, 'FINISHED', 'BO1', now() - interval '5 days'),
    (v_match2, v_tournament_id, v_stage_group, v_lsl_id, v_ldn_id, v_lsl_id, 'FINISHED', 'BO1', now() - interval '4 days'),
    (v_match3, v_tournament_id, v_stage_group, v_agd_id, v_lsl_id, v_lsl_id, 'FINISHED', 'BO1', now() - interval '3 days');

  -- Partida Semifinal BO3
  v_match4 := uuid_generate_v4();
  INSERT INTO public.matches (id, tournament_id, stage_id, team_a_id, team_b_id, winner_id, status, format, scheduled_at)
  VALUES (v_match4, v_tournament_id, v_stage_semi, v_ddf_id, v_ldn_id, v_ddf_id, 'FINISHED', 'BO3', now() - interval '2 days');

  -- Partida Final BO5 (pendente)
  v_match5 := uuid_generate_v4();
  INSERT INTO public.matches (id, tournament_id, stage_id, team_a_id, team_b_id, status, format, scheduled_at)
  VALUES (v_match5, v_tournament_id, v_stage_final, v_lsl_id, v_ddf_id, 'PENDING', 'BO5', now() + interval '1 day');

  -- Match Games com Picks & Bans
  INSERT INTO public.match_games (match_id, game_number, winner_id, duration_sec, picks_bans, played_at)
  VALUES
    (v_match1, 1, v_agd_id, 1823,
     '{"picks":[{"team":"AGD","champion":"Jinx"},{"team":"AGD","champion":"Thresh"},{"team":"DDF","champion":"Caitlyn"},{"team":"DDF","champion":"Nautilus"}],"bans":[{"team":"AGD","champion":"Zed"},{"team":"DDF","champion":"Lee Sin"}]}'::jsonb,
     now() - interval '5 days'),
    (v_match2, 1, v_lsl_id, 2145,
     '{"picks":[{"team":"LSL","champion":"Ahri"},{"team":"LSL","champion":"Blitzcrank"},{"team":"LDN","champion":"Lux"},{"team":"LDN","champion":"Leona"}],"bans":[{"team":"LSL","champion":"Yasuo"},{"team":"LDN","champion":"Katarina"}]}'::jsonb,
     now() - interval '4 days'),
    (v_match3, 1, v_lsl_id, 1932,
     '{"picks":[{"team":"AGD","champion":"Ezreal"},{"team":"LSL","champion":"Zed"}],"bans":[{"team":"AGD","champion":"Ahri"},{"team":"LSL","champion":"Jinx"}]}'::jsonb,
     now() - interval '3 days'),
    (v_match4, 1, v_ddf_id, 1756,
     '{"picks":[{"team":"DDF","champion":"Caitlyn"},{"team":"LDN","champion":"Draven"}],"bans":[{"team":"DDF","champion":"Zed"},{"team":"LDN","champion":"Ahri"}]}'::jsonb,
     now() - interval '2 days'),
    (v_match4, 2, v_ldn_id, 2310,
     '{"picks":[{"team":"DDF","champion":"Jinx"},{"team":"LDN","champion":"Caitlyn"}],"bans":[{"team":"DDF","champion":"Lee Sin"},{"team":"LDN","champion":"Thresh"}]}'::jsonb,
     now() - interval '2 days' + interval '40 minutes'),
    (v_match4, 3, v_ddf_id, 2089,
     '{"picks":[{"team":"DDF","champion":"Ezreal"},{"team":"LDN","champion":"Jhin"}],"bans":[{"team":"DDF","champion":"Yasuo"},{"team":"LDN","champion":"Zed"}]}'::jsonb,
     now() - interval '2 days' + interval '80 minutes');

  -- Player Stats
  INSERT INTO public.player_stats (game_id, player_id, team_id, champion, kills, deaths, assists, cs, vision_score, damage_dealt, is_mvp)
  SELECT mg.id, v_p_agd1, v_agd_id, 'Jinx', 8, 2, 5, 210, 45, 28500, true
  FROM public.match_games mg WHERE mg.match_id = v_match1 AND mg.game_number = 1;

  INSERT INTO public.player_stats (game_id, player_id, team_id, champion, kills, deaths, assists, cs, vision_score, damage_dealt, is_mvp)
  SELECT mg.id, v_p_ddf1, v_ddf_id, 'Caitlyn', 3, 6, 1, 185, 32, 18200, false
  FROM public.match_games mg WHERE mg.match_id = v_match1 AND mg.game_number = 1;

  INSERT INTO public.player_stats (game_id, player_id, team_id, champion, kills, deaths, assists, cs, vision_score, damage_dealt, is_mvp)
  SELECT mg.id, v_p_lsl1, v_lsl_id, 'Ahri', 10, 1, 8, 240, 55, 35200, true
  FROM public.match_games mg WHERE mg.match_id = v_match2 AND mg.game_number = 1;

  INSERT INTO public.player_stats (game_id, player_id, team_id, champion, kills, deaths, assists, cs, vision_score, damage_dealt, is_mvp)
  SELECT mg.id, v_p_ldn1, v_ldn_id, 'Lux', 4, 7, 3, 195, 38, 22100, false
  FROM public.match_games mg WHERE mg.match_id = v_match2 AND mg.game_number = 1;

  -- Notificacoes demo
  INSERT INTO public.notifications (user_id, type, title, body, read, metadata)
  SELECT
    p.id, 'match_result',
    'Resultado: Aguias Douradas 1 x 0 Dragoes de Fogo',
    'AGD venceu na Fase de Grupos em 30min. MVP: GoldenWings com Jinx (8/2/5).',
    false,
    jsonb_build_object('match_id', v_match1, 'tournament_id', v_tournament_id)
  FROM public.profiles p LIMIT 5;

  INSERT INTO public.notifications (user_id, type, title, body, read, metadata)
  SELECT
    p.id, 'tournament_update',
    'Grande Final Agendada!',
    'Leoes Selvagens vs Dragoes de Fogo - Grande Final BO5 amanha!',
    false,
    jsonb_build_object('match_id', v_match5, 'tournament_id', v_tournament_id)
  FROM public.profiles p LIMIT 5;

  INSERT INTO public.notifications (user_id, type, title, body, read, metadata)
  SELECT
    p.id, 'checkin_open',
    'Check-in Aberto!',
    'O check-in para o torneio esta aberto. Confirme sua participacao em ate 30 minutos.',
    false,
    jsonb_build_object('tournament_id', v_tournament_id)
  FROM public.profiles p LIMIT 5;

  RAISE NOTICE 'Demo fases 3-4 inserido com sucesso! Tournament: %', v_tournament_id;
END;
$$;
