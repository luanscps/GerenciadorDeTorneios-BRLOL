'use server';
import { requireTournamentOrganizerOrAdmin } from '@/lib/supabase/permissions';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

/**
 * NOTA: Esta action depende da tabela `tournament_announcements`.
 * Execute o SQL abaixo no Supabase antes de usar:
 *
 * CREATE TABLE IF NOT EXISTS public.tournament_announcements (
 *   id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *   tournament_id  uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
 *   sent_by        uuid REFERENCES public.profiles(id),
 *   title          text NOT NULL CHECK (char_length(title) BETWEEN 5 AND 150),
 *   body           text NOT NULL CHECK (char_length(body) BETWEEN 10 AND 2000),
 *   channel        text[] NOT NULL DEFAULT ARRAY['email']::text[],
 *   target         text NOT NULL DEFAULT 'all'
 *                  CHECK (target IN ('all', 'active', 'eliminated')),
 *   sent_at        timestamptz NOT NULL DEFAULT now(),
 *   created_at     timestamptz NOT NULL DEFAULT now()
 * );
 * ALTER TABLE public.tournament_announcements ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "org_or_admin_all" ON public.tournament_announcements
 *   USING (EXISTS (
 *     SELECT 1 FROM public.tournaments t
 *     WHERE t.id = tournament_id
 *       AND (t.organizer_id = auth.uid() OR t.created_by = auth.uid()
 *            OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid()))
 *   ));
 *
 * Política Riot: comunicados devem ser claros, factuais e não enganosos.
 * Ref: https://developer.riotgames.com/policies/general (sec. Fair Dealing)
 */

const ComunicadoSchema = z.object({
  title:  z.string().min(5, 'Título deve ter pelo menos 5 caracteres').max(150),
  body:   z.string().min(10, 'Mensagem deve ter pelo menos 10 caracteres').max(2000),
  target: z.enum(['all', 'active', 'eliminated'], {
    errorMap: () => ({ message: 'Destino inválido: use all, active ou eliminated' }),
  }),
  channel_email:   z.string().optional(),
  channel_discord: z.string().optional(),
});

// ─── ORGANIZADOR/ADMIN: Criar comunicado ──────────────────────────────────
export async function criarComunicado(tournamentId: string, formData: FormData) {
  try {
    const { supabase, profile } = await requireTournamentOrganizerOrAdmin(tournamentId);

    const parsed = ComunicadoSchema.safeParse({
      title:           formData.get('title'),
      body:            formData.get('body'),
      target:          formData.get('target') ?? 'all',
      channel_email:   formData.get('channel_email'),
      channel_discord: formData.get('channel_discord'),
    });
    if (!parsed.success) return { error: parsed.error.errors[0].message };

    const channels: string[] = [];
    if (parsed.data.channel_email === 'on')   channels.push('email');
    if (parsed.data.channel_discord === 'on') channels.push('discord');
    if (channels.length === 0)                channels.push('email'); // mínimo um canal

    const { error: insertErr } = await supabase
      .from('tournament_announcements')
      .insert({
        tournament_id: tournamentId,
        sent_by:       profile.id,
        title:         parsed.data.title,
        body:          parsed.data.body,
        target:        parsed.data.target,
        channel:       channels,
      });

    if (insertErr) {
      // Tabela ainda não criada: orienta o organizador
      if (insertErr.code === '42P01') {
        return { error: 'Tabela de comunicados não encontrada. Execute a migration no Supabase.' };
      }
      return { error: insertErr.message };
    }

    revalidatePath(`/organizador/torneios/${tournamentId}/comunicados`);
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

// ─── ORGANIZADOR/ADMIN: Listar comunicados do torneio ──────────────────────
export async function listarComunicados(tournamentId: string) {
  try {
    const { supabase } = await requireTournamentOrganizerOrAdmin(tournamentId);

    const { data, error } = await supabase
      .from('tournament_announcements')
      .select(`
        id, title, body, target, channel, sent_at, created_at,
        sent_by_profile:profiles!sent_by ( id, username, display_name )
      `)
      .eq('tournament_id', tournamentId)
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === '42P01') return { data: [], error: null }; // tabela ainda não existe
      return { error: error.message, data: null };
    }
    return { data, error: null };
  } catch (e: any) {
    return { error: e.message, data: null };
  }
}
