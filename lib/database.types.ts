export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      active_team: {
        Row: {
          profile_id: string
          team_id: string | null
          updated_at: string
        }
        Insert: {
          profile_id: string
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          profile_id?: string
          team_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "active_team_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "active_team_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles_with_riot"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "active_team_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "active_team_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_stage_standings"
            referencedColumns: ["team_id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string
          id: string
          ip_address: unknown
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      champion_masteries: {
        Row: {
          champion_id: number
          champion_name: string | null
          created_at: string
          id: string
          last_play_time: string | null
          mastery_level: number
          mastery_points: number
          riot_account_id: string
          updated_at: string
        }
        Insert: {
          champion_id: number
          champion_name?: string | null
          created_at?: string
          id?: string
          last_play_time?: string | null
          mastery_level?: number
          mastery_points?: number
          riot_account_id: string
          updated_at?: string
        }
        Update: {
          champion_id?: number
          champion_name?: string | null
          created_at?: string
          id?: string
          last_play_time?: string | null
          mastery_level?: number
          mastery_points?: number
          riot_account_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "champion_masteries_riot_account_id_fkey"
            columns: ["riot_account_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_riot"
            referencedColumns: ["riot_account_id"]
          },
          {
            foreignKeyName: "champion_masteries_riot_account_id_fkey"
            columns: ["riot_account_id"]
            isOneToOne: false
            referencedRelation: "riot_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          created_at: string | null
          evidence_url: string | null
          id: string
          match_id: string
          reason: string
          reported_by: string | null
          resolution_notes: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["dispute_status"] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          evidence_url?: string | null
          id?: string
          match_id: string
          reason: string
          reported_by?: string | null
          resolution_notes?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["dispute_status"] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          evidence_url?: string | null
          id?: string
          match_id?: string
          reason?: string
          reported_by?: string | null
          resolution_notes?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["dispute_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "disputes_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_riot"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_riot"
            referencedColumns: ["id"]
          },
        ]
      }
      inscricoes: {
        Row: {
          checked_in: boolean
          checked_in_at: string | null
          checked_in_by: string | null
          created_at: string
          id: string
          notes: string | null
          requested_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["inscricao_status"]
          team_id: string
          tournament_id: string
        }
        Insert: {
          checked_in?: boolean
          checked_in_at?: string | null
          checked_in_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          requested_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["inscricao_status"]
          team_id: string
          tournament_id: string
        }
        Update: {
          checked_in?: boolean
          checked_in_at?: string | null
          checked_in_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          requested_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["inscricao_status"]
          team_id?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inscricoes_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inscricoes_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_riot"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inscricoes_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inscricoes_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_riot"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inscricoes_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inscricoes_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_stage_standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "inscricoes_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      match_games: {
        Row: {
          created_at: string
          duration_sec: number | null
          game_number: number
          id: string
          match_id: string
          picks_bans: Json | null
          played_at: string | null
          riot_game_id: string | null
          winner_id: string | null
        }
        Insert: {
          created_at?: string
          duration_sec?: number | null
          game_number: number
          id?: string
          match_id: string
          picks_bans?: Json | null
          played_at?: string | null
          riot_game_id?: string | null
          winner_id?: string | null
        }
        Update: {
          created_at?: string
          duration_sec?: number | null
          game_number?: number
          id?: string
          match_id?: string
          picks_bans?: Json | null
          played_at?: string | null
          riot_game_id?: string | null
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_games_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_games_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_games_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "v_stage_standings"
            referencedColumns: ["team_id"]
          },
        ]
      }
      matches: {
        Row: {
          best_of: number
          codes_expire_at: string | null
          codes_generated_at: string | null
          created_at: string
          finished_at: string | null
          format: string
          id: string
          live_game_data: Json | null
          match_number: number
          match_order: number
          notes: string | null
          played_at: string | null
          riot_match_id: string | null
          riot_provider_id: number | null
          riot_tournament_id: number | null
          round: number
          scheduled_at: string | null
          score_a: number | null
          score_b: number | null
          stage_id: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["match_status"]
          team_a_id: string | null
          team_b_id: string | null
          tournament_code: string | null
          tournament_codes: Json | null
          tournament_id: string
          updated_at: string
          winner_id: string | null
        }
        Insert: {
          best_of?: number
          codes_expire_at?: string | null
          codes_generated_at?: string | null
          created_at?: string
          finished_at?: string | null
          format?: string
          id?: string
          live_game_data?: Json | null
          match_number?: number
          match_order?: number
          notes?: string | null
          played_at?: string | null
          riot_match_id?: string | null
          riot_provider_id?: number | null
          riot_tournament_id?: number | null
          round?: number
          scheduled_at?: string | null
          score_a?: number | null
          score_b?: number | null
          stage_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["match_status"]
          team_a_id?: string | null
          team_b_id?: string | null
          tournament_code?: string | null
          tournament_codes?: Json | null
          tournament_id: string
          updated_at?: string
          winner_id?: string | null
        }
        Update: {
          best_of?: number
          codes_expire_at?: string | null
          codes_generated_at?: string | null
          created_at?: string
          finished_at?: string | null
          format?: string
          id?: string
          live_game_data?: Json | null
          match_number?: number
          match_order?: number
          notes?: string | null
          played_at?: string | null
          riot_match_id?: string | null
          riot_provider_id?: number | null
          riot_tournament_id?: number | null
          round?: number
          scheduled_at?: string | null
          score_a?: number | null
          score_b?: number | null
          stage_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["match_status"]
          team_a_id?: string | null
          team_b_id?: string | null
          tournament_code?: string | null
          tournament_codes?: Json | null
          tournament_id?: string
          updated_at?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "tournament_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "v_stage_standings"
            referencedColumns: ["stage_id"]
          },
          {
            foreignKeyName: "matches_team_a_id_fkey"
            columns: ["team_a_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_team_a_id_fkey"
            columns: ["team_a_id"]
            isOneToOne: false
            referencedRelation: "v_stage_standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "matches_team_b_id_fkey"
            columns: ["team_b_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_team_b_id_fkey"
            columns: ["team_b_id"]
            isOneToOne: false
            referencedRelation: "v_stage_standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "v_stage_standings"
            referencedColumns: ["team_id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          expires_at: string | null
          id: string
          link: string | null
          message: string | null
          metadata: Json | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          link?: string | null
          message?: string | null
          metadata?: Json | null
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          link?: string | null
          message?: string | null
          metadata?: Json | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_riot"
            referencedColumns: ["id"]
          },
        ]
      }
      player_stats: {
        Row: {
          assists: number
          champion: string | null
          created_at: string
          cs: number
          damage_dealt: number
          deaths: number
          game_duration: number | null
          game_id: string
          gold_earned: number
          id: string
          is_mvp: boolean
          kills: number
          player_id: string | null
          riot_account_id: string | null
          role: Database["public"]["Enums"]["player_role"] | null
          team_id: string | null
          vision_score: number
          wards_placed: number
          win: boolean
        }
        Insert: {
          assists?: number
          champion?: string | null
          created_at?: string
          cs?: number
          damage_dealt?: number
          deaths?: number
          game_duration?: number | null
          game_id: string
          gold_earned?: number
          id?: string
          is_mvp?: boolean
          kills?: number
          player_id?: string | null
          riot_account_id?: string | null
          role?: Database["public"]["Enums"]["player_role"] | null
          team_id?: string | null
          vision_score?: number
          wards_placed?: number
          win?: boolean
        }
        Update: {
          assists?: number
          champion?: string | null
          created_at?: string
          cs?: number
          damage_dealt?: number
          deaths?: number
          game_duration?: number | null
          game_id?: string
          gold_earned?: number
          id?: string
          is_mvp?: boolean
          kills?: number
          player_id?: string | null
          riot_account_id?: string | null
          role?: Database["public"]["Enums"]["player_role"] | null
          team_id?: string | null
          vision_score?: number
          wards_placed?: number
          win?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "player_stats_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "match_games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_stats_riot_account_id_fkey"
            columns: ["riot_account_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_riot"
            referencedColumns: ["riot_account_id"]
          },
          {
            foreignKeyName: "player_stats_riot_account_id_fkey"
            columns: ["riot_account_id"]
            isOneToOne: false
            referencedRelation: "riot_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_stats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_stats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_stage_standings"
            referencedColumns: ["team_id"]
          },
        ]
      }
      players: {
        Row: {
          created_at: string
          id: string
          last_synced: string | null
          losses: number
          lp: number
          profile_icon: number | null
          puuid: string | null
          rank: string
          riot_account_id: string | null
          role: Database["public"]["Enums"]["player_role"] | null
          summoner_level: number | null
          summoner_name: string
          tag_line: string
          tier: string
          updated_at: string
          wins: number
        }
        Insert: {
          created_at?: string
          id?: string
          last_synced?: string | null
          losses?: number
          lp?: number
          profile_icon?: number | null
          puuid?: string | null
          rank?: string
          riot_account_id?: string | null
          role?: Database["public"]["Enums"]["player_role"] | null
          summoner_level?: number | null
          summoner_name: string
          tag_line?: string
          tier?: string
          updated_at?: string
          wins?: number
        }
        Update: {
          created_at?: string
          id?: string
          last_synced?: string | null
          losses?: number
          lp?: number
          profile_icon?: number | null
          puuid?: string | null
          rank?: string
          riot_account_id?: string | null
          role?: Database["public"]["Enums"]["player_role"] | null
          summoner_level?: number | null
          summoner_name?: string
          tag_line?: string
          tier?: string
          updated_at?: string
          wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "players_riot_account_id_fkey"
            columns: ["riot_account_id"]
            isOneToOne: true
            referencedRelation: "profiles_with_riot"
            referencedColumns: ["riot_account_id"]
          },
          {
            foreignKeyName: "players_riot_account_id_fkey"
            columns: ["riot_account_id"]
            isOneToOne: true
            referencedRelation: "riot_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      prize_distribution: {
        Row: {
          created_at: string | null
          description: string
          id: string
          placement: number
          tournament_id: string
          value: string
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          placement: number
          tournament_id: string
          value: string
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          placement?: number
          tournament_id?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "prize_distribution_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_admin: boolean
          is_banned: boolean
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          is_admin?: boolean
          is_banned?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_admin?: boolean
          is_banned?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      rank_snapshots: {
        Row: {
          hot_streak: boolean
          id: string
          losses: number
          lp: number
          queue_type: string
          rank: string
          riot_account_id: string
          snapshotted_at: string
          tier: string
          wins: number
        }
        Insert: {
          hot_streak?: boolean
          id?: string
          losses?: number
          lp?: number
          queue_type: string
          rank: string
          riot_account_id: string
          snapshotted_at?: string
          tier: string
          wins?: number
        }
        Update: {
          hot_streak?: boolean
          id?: string
          losses?: number
          lp?: number
          queue_type?: string
          rank?: string
          riot_account_id?: string
          snapshotted_at?: string
          tier?: string
          wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "rank_snapshots_riot_account_id_fkey"
            columns: ["riot_account_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_riot"
            referencedColumns: ["riot_account_id"]
          },
          {
            foreignKeyName: "rank_snapshots_riot_account_id_fkey"
            columns: ["riot_account_id"]
            isOneToOne: false
            referencedRelation: "riot_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      riot_accounts: {
        Row: {
          created_at: string
          game_name: string
          id: string
          is_primary: boolean
          profile_icon_id: number | null
          profile_id: string
          puuid: string
          summoner_level: number | null
          tag_line: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          game_name: string
          id?: string
          is_primary?: boolean
          profile_icon_id?: number | null
          profile_id: string
          puuid: string
          summoner_level?: number | null
          tag_line: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          game_name?: string
          id?: string
          is_primary?: boolean
          profile_icon_id?: number | null
          profile_id?: string
          puuid?: string
          summoner_level?: number | null
          tag_line?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "riot_accounts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "riot_accounts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_riot"
            referencedColumns: ["id"]
          },
        ]
      }
      riot_tournament_registrations: {
        Row: {
          callback_url: string
          created_at: string
          created_by: string | null
          id: string
          region: string
          riot_provider_id: number
          riot_tournament_id: number
          tournament_id: string
        }
        Insert: {
          callback_url: string
          created_at?: string
          created_by?: string | null
          id?: string
          region?: string
          riot_provider_id: number
          riot_tournament_id: number
          tournament_id: string
        }
        Update: {
          callback_url?: string
          created_at?: string
          created_by?: string | null
          id?: string
          region?: string
          riot_provider_id?: number
          riot_tournament_id?: number
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "riot_tournament_registrations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "riot_tournament_registrations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_riot"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "riot_tournament_registrations_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: true
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      seedings: {
        Row: {
          created_at: string | null
          id: string
          method: string
          seed: number
          team_id: string
          tournament_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          method?: string
          seed: number
          team_id: string
          tournament_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          method?: string
          seed?: number
          team_id?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seedings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seedings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_stage_standings"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "seedings_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      site_terms_acceptance: {
        Row: {
          accepted_at: string
          id: string
          ip_address: string | null
          profile_id: string
          terms_version: string
        }
        Insert: {
          accepted_at?: string
          id?: string
          ip_address?: string | null
          profile_id: string
          terms_version?: string
        }
        Update: {
          accepted_at?: string
          id?: string
          ip_address?: string | null
          profile_id?: string
          terms_version?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_terms_acceptance_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_terms_acceptance_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_riot"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invites: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["player_role"] | null
          status: Database["public"]["Enums"]["invite_status"] | null
          summoner_name: string
          tag_line: string
          team_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["player_role"] | null
          status?: Database["public"]["Enums"]["invite_status"] | null
          summoner_name: string
          tag_line?: string
          team_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["player_role"] | null
          status?: Database["public"]["Enums"]["invite_status"] | null
          summoner_name?: string
          tag_line?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_riot"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_invites_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_invites_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_stage_standings"
            referencedColumns: ["team_id"]
          },
        ]
      }
      team_members: {
        Row: {
          id: string
          invited_at: string
          invited_by: string | null
          lane: Database["public"]["Enums"]["player_role"] | null
          profile_id: string
          responded_at: string | null
          riot_account_id: string | null
          status: Database["public"]["Enums"]["team_member_status"]
          team_id: string
          team_role: Database["public"]["Enums"]["team_member_role"]
        }
        Insert: {
          id?: string
          invited_at?: string
          invited_by?: string | null
          lane?: Database["public"]["Enums"]["player_role"] | null
          profile_id: string
          responded_at?: string | null
          riot_account_id?: string | null
          status?: Database["public"]["Enums"]["team_member_status"]
          team_id: string
          team_role?: Database["public"]["Enums"]["team_member_role"]
        }
        Update: {
          id?: string
          invited_at?: string
          invited_by?: string | null
          lane?: Database["public"]["Enums"]["player_role"] | null
          profile_id?: string
          responded_at?: string | null
          riot_account_id?: string | null
          status?: Database["public"]["Enums"]["team_member_status"]
          team_id?: string
          team_role?: Database["public"]["Enums"]["team_member_role"]
        }
        Relationships: [
          {
            foreignKeyName: "team_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_riot"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_riot"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_riot_account_id_fkey"
            columns: ["riot_account_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_riot"
            referencedColumns: ["riot_account_id"]
          },
          {
            foreignKeyName: "team_members_riot_account_id_fkey"
            columns: ["riot_account_id"]
            isOneToOne: false
            referencedRelation: "riot_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "v_stage_standings"
            referencedColumns: ["team_id"]
          },
        ]
      }
      teams: {
        Row: {
          banner_url: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_eliminated: boolean
          logo_url: string | null
          name: string
          owner_id: string | null
          region: string | null
          slug: string | null
          tag: string
          tournament_id: string | null
        }
        Insert: {
          banner_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_eliminated?: boolean
          logo_url?: string | null
          name: string
          owner_id?: string | null
          region?: string | null
          slug?: string | null
          tag: string
          tournament_id?: string | null
        }
        Update: {
          banner_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_eliminated?: boolean
          logo_url?: string | null
          name?: string
          owner_id?: string | null
          region?: string | null
          slug?: string | null
          tag?: string
          tournament_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_riot"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_match_results: {
        Row: {
          game_data: Json
          game_id: number | null
          id: string
          processed: boolean | null
          received_at: string | null
          tournament_code: string
        }
        Insert: {
          game_data: Json
          game_id?: number | null
          id?: string
          processed?: boolean | null
          received_at?: string | null
          tournament_code: string
        }
        Update: {
          game_data?: Json
          game_id?: number | null
          id?: string
          processed?: boolean | null
          received_at?: string | null
          tournament_code?: string
        }
        Relationships: []
      }
      tournament_rules: {
        Row: {
          content: string
          created_at: string | null
          id: string
          rule_order: number | null
          section: string
          tournament_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          rule_order?: number | null
          section: string
          tournament_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          rule_order?: number | null
          section?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_rules_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_stages: {
        Row: {
          best_of: number
          bracket_type: Database["public"]["Enums"]["bracket_type"] | null
          created_at: string
          id: string
          name: string
          stage_order: number
          tournament_id: string
          updated_at: string
        }
        Insert: {
          best_of?: number
          bracket_type?: Database["public"]["Enums"]["bracket_type"] | null
          created_at?: string
          id?: string
          name: string
          stage_order?: number
          tournament_id: string
          updated_at?: string
        }
        Update: {
          best_of?: number
          bracket_type?: Database["public"]["Enums"]["bracket_type"] | null
          created_at?: string
          id?: string
          name?: string
          stage_order?: number
          tournament_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_stages_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          banner_url: string | null
          bracket_type: Database["public"]["Enums"]["bracket_type"]
          created_at: string
          created_by: string | null
          description: string | null
          discord_webhook_url: string | null
          end_date: string | null
          ends_at: string | null
          featured: boolean | null
          id: string
          max_members: number
          max_teams: number
          min_members: number
          min_tier: string | null
          name: string
          organizer_id: string | null
          prize_pool: string | null
          registration_deadline: string | null
          rules: string | null
          slug: string
          start_date: string | null
          starts_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          banner_url?: string | null
          bracket_type?: Database["public"]["Enums"]["bracket_type"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          discord_webhook_url?: string | null
          end_date?: string | null
          ends_at?: string | null
          featured?: boolean | null
          id?: string
          max_members?: number
          max_teams?: number
          min_members?: number
          min_tier?: string | null
          name: string
          organizer_id?: string | null
          prize_pool?: string | null
          registration_deadline?: string | null
          rules?: string | null
          slug: string
          start_date?: string | null
          starts_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          banner_url?: string | null
          bracket_type?: Database["public"]["Enums"]["bracket_type"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          discord_webhook_url?: string | null
          end_date?: string | null
          ends_at?: string | null
          featured?: boolean | null
          id?: string
          max_members?: number
          max_teams?: number
          min_members?: number
          min_tier?: string | null
          name?: string
          organizer_id?: string | null
          prize_pool?: string | null
          registration_deadline?: string | null
          rules?: string | null
          slug?: string
          start_date?: string | null
          starts_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournaments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournaments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_with_riot"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournaments_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournaments_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_riot"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      profiles_with_riot: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string | null
          is_admin: boolean | null
          is_banned: boolean | null
          profile_icon_id: number | null
          riot_account_id: string | null
          riot_game_name: string | null
          riot_puuid: string | null
          riot_tag_line: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          summoner_level: number | null
          updated_at: string | null
        }
        Relationships: []
      }
      v_player_leaderboard: {
        Row: {
          kda_ratio: number | null
          lp: number | null
          mvp_count: number | null
          player_id: string | null
          profile_icon: number | null
          rank: string | null
          summoner_name: string | null
          tag_line: string | null
          tier: string | null
          total_assists: number | null
          total_deaths: number | null
          total_games: number | null
          total_kills: number | null
          tournaments_played: number | null
        }
        Relationships: []
      }
      v_player_tournament_kda: {
        Row: {
          avg_assists: number | null
          avg_deaths: number | null
          avg_kills: number | null
          games_played: number | null
          kda_ratio: number | null
          mvp_count: number | null
          player_id: string | null
          riot_account_id: string | null
          summoner_name: string | null
          tournament_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_stats_riot_account_id_fkey"
            columns: ["riot_account_id"]
            isOneToOne: false
            referencedRelation: "profiles_with_riot"
            referencedColumns: ["riot_account_id"]
          },
          {
            foreignKeyName: "player_stats_riot_account_id_fkey"
            columns: ["riot_account_id"]
            isOneToOne: false
            referencedRelation: "riot_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      v_stage_standings: {
        Row: {
          losses: number | null
          points: number | null
          stage_id: string | null
          stage_name: string | null
          tag: string | null
          team_id: string | null
          team_name: string | null
          tournament_id: string | null
          wins: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_stages_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_team_invite: {
        Args: {
          p_invite_id: string
          p_profile_id: string
          p_riot_acc_id?: string
        }
        Returns: Json
      }
      call_edge_function: {
        Args: { function_name: string; payload: Json }
        Returns: undefined
      }
      has_call_edge_function: { Args: never; Returns: boolean }
      is_admin: { Args: { uid: string }; Returns: boolean }
      is_current_user_admin: { Args: never; Returns: boolean }
      is_organizer_or_admin: { Args: { uid: string }; Returns: boolean }
      is_tournament_organizer: {
        Args: { tid: string; uid: string }
        Returns: boolean
      }
      log_admin_action: {
        Args: {
          p_action: string
          p_new_data?: Json
          p_old_data?: Json
          p_record_id?: string
          p_table_name: string
        }
        Returns: undefined
      }
    }
    Enums: {
      bracket_type:
        | "SINGLE_ELIMINATION"
        | "DOUBLE_ELIMINATION"
        | "ROUND_ROBIN"
        | "SWISS"
      dispute_status: "OPEN" | "UNDER_REVIEW" | "RESOLVED" | "DISMISSED"
      inscricao_status: "PENDING" | "APPROVED" | "REJECTED"
      invite_status: "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED"
      match_status: "SCHEDULED" | "IN_PROGRESS" | "FINISHED"
      player_role: "TOP" | "JUNGLE" | "MID" | "ADC" | "SUPPORT"
      team_member_role: "captain" | "member" | "substitute"
      team_member_status: "pending" | "accepted" | "rejected" | "left"
      tournament_status:
        | "DRAFT"
        | "OPEN"
        | "IN_PROGRESS"
        | "FINISHED"
        | "CANCELLED"
      user_role: "player" | "organizer" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      bracket_type: [
        "SINGLE_ELIMINATION",
        "DOUBLE_ELIMINATION",
        "ROUND_ROBIN",
        "SWISS",
      ],
      dispute_status: ["OPEN", "UNDER_REVIEW", "RESOLVED", "DISMISSED"],
      inscricao_status: ["PENDING", "APPROVED", "REJECTED"],
      invite_status: ["PENDING", "ACCEPTED", "DECLINED", "EXPIRED"],
      match_status: ["SCHEDULED", "IN_PROGRESS", "FINISHED"],
      player_role: ["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"],
      team_member_role: ["captain", "member", "substitute"],
      team_member_status: ["pending", "accepted", "rejected", "left"],
      tournament_status: [
        "DRAFT",
        "OPEN",
        "IN_PROGRESS",
        "FINISHED",
        "CANCELLED",
      ],
      user_role: ["player", "organizer", "admin"],
    },
  },
} as const
