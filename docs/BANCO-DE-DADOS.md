# Banco de Dados — BRLOL (Supabase)

> Esta documentação foi consolidada. Este arquivo agora funciona como índice para o documento unificado.

A descrição técnica **completa** do schema atual do Supabase está em **`docs/BRLOL-DOCS-UNIFICADO.md`**, na seção:

- "Modelo de dados — schema público Supabase"

Lá você encontra:

- enums de domínio (`tournament_status`, `bracket_type`, `match_status`, `inscricao_status`, `player_role`);
- tabelas core (`profiles`, `tournaments`, `teams`, `players`, `inscricoes`, `tournament_stages`, `matches`, `match_games`, `player_stats`, `notifications`, `audit_log`);
- camada Riot (`riot_accounts`, `rank_snapshots`, `champion_masteries`);
- tabelas auxiliares (`prize_distribution`, `seedings`, `team_invites`, `disputes`, `tournament_rules`);
- principais views (`v_stage_standings`, `v_player_tournament_kda`, `v_player_leaderboard`);
- visão geral de RLS e funções SQL (`is_admin`, `handle_new_user`, `set_updated_at`, `log_admin_action`, `audit_matches_changes`).

Use este arquivo como ponto de entrada rápido; para detalhes, sempre consulte o documento unificado.
