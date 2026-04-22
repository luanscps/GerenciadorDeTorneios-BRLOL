// @ts-nocheck
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TIER_COLORS: Record<string, number> = {
  CHALLENGER:   0xffd700,
  GRANDMASTER:  0xff4500,
  MASTER:       0x9b59b6,
  DIAMOND:      0x3498db,
  EMERALD:      0x2ecc71,
  PLATINUM:     0x1abc9c,
  GOLD:         0xf1c40f,
  SILVER:       0x95a5a6,
  BRONZE:       0xcd6133,
  IRON:         0x7f8c8d,
  UNRANKED:     0x99aab5,
}

async function sendDiscordWebhook(webhookUrl: string, payload: object) {
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Discord rejeitou o webhook: ${err}`)
  }
}

function buildEmbed(type: string, data: any): object[] {
  const embeds: any[] = []
  const ts = new Date().toISOString()

  switch (type) {
    case 'inscricao_aprovada':
      embeds.push({
        title: '✅ Time Aprovado!',
        description: `**${data.team_name}** foi aprovado no torneio **${data.tournament_name}**!`,
        color: 0x2ecc71,
        timestamp: ts,
        footer: { text: 'BRLOL Torneios' },
      })
      break

    case 'inscricao_rejeitada':
      embeds.push({
        title: '❌ Inscrição Rejeitada',
        description: `**${data.team_name}** não foi aprovado no torneio **${data.tournament_name}**.`,
        color: 0xe74c3c,
        timestamp: ts,
        footer: { text: 'BRLOL Torneios' },
      })
      break

    case 'partida_iniciada':
      embeds.push({
        title: '⚔️ Partida em Andamento!',
        description: `**${data.team_a}** vs **${data.team_b}**`,
        color: 0xf1c40f,
        fields: [
          { name: 'Torneio', value: data.tournament_name, inline: true },
          { name: 'Formato', value: data.format,          inline: true },
          { name: 'Rodada',  value: `Rodada ${data.round}`, inline: true },
        ],
        timestamp: ts,
        footer: { text: 'BRLOL Torneios' },
      })
      break

    case 'partida_finalizada':
      embeds.push({
        title: '🏆 Partida Encerrada',
        description: `**${data.team_a}** ${data.score_a} — ${data.score_b} **${data.team_b}**`,
        color: 0x7289da,
        fields: [
          { name: 'Vencedor',  value: data.winner,          inline: true },
          { name: 'Torneio',   value: data.tournament_name, inline: true },
          { name: 'Formato',   value: data.format,          inline: true },
          ...(data.mvp ? [{ name: 'MVP', value: data.mvp, inline: true }] : []),
        ],
        timestamp: ts,
        footer: { text: 'BRLOL Torneios' },
      })
      break

    case 'torneio_iniciado':
      embeds.push({
        title: '🎉 Torneio Iniciado!',
        description: `O torneio **${data.tournament_name}** começou!`,
        color: 0x3498db,
        fields: [
          { name: 'Times',    value: `${data.team_count} times`, inline: true },
          { name: 'Formato',  value: data.bracket_type,          inline: true },
        ],
        timestamp: ts,
        footer: { text: 'BRLOL Torneios' },
      })
      break

    default:
      embeds.push({
        title: '📢 Notificação BRLOL',
        description: JSON.stringify(data).slice(0, 200),
        color: 0x99aab5,
        timestamp: ts,
      })
  }

  return embeds
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { type, tournament_id, data } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Buscar webhook URL do torneio
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('discord_webhook_url, name')
      .eq('id', tournament_id)
      .single()

    if (!tournament?.discord_webhook_url) {
      return new Response(
        JSON.stringify({ skipped: true, reason: 'Sem webhook configurado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const embeds = buildEmbed(type, { ...data, tournament_name: tournament.name })

    await sendDiscordWebhook(tournament.discord_webhook_url, { embeds })

    return new Response(
      JSON.stringify({ success: true, type }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
