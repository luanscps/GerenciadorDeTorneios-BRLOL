// @ts-nocheck
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RIOT_API_KEY = Deno.env.get('RIOT_API_KEY')!
const RIOT_BR1 = 'https://br1.api.riotgames.com'
const RIOT_AMERICAS = 'https://americas.api.riotgames.com'

async function riotGet(url: string) {
  const res = await fetch(url, { headers: { 'X-Riot-Token': RIOT_API_KEY } })
  if (!res.ok) return null
  return res.json()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const body = await req.json().catch(() => ({}))
    const player_id = body?.player_id // opcional: sincronizar so 1 jogador

    let query = supabase
      .from('players')
      .select('id, summoner_name, tagline, puuid')

    if (player_id) {
      query = query.eq('id', player_id)
    } else {
      // Batch: pegar jogadores desatualizados ha mais de 6h
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
      query = query
        .or(`last_synced.is.null,last_synced.lt.${sixHoursAgo}`)
        .limit(20)
    }

    const { data: players, error } = await query

    if (error || !players?.length) {
      return new Response(
        JSON.stringify({ synced: 0, message: 'Nenhum jogador para sincronizar' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const results: any[] = []

    for (const player of players) {
      try {
        let puuid = player.puuid

        // 1. Buscar PUUID se nao tiver
        if (!puuid) {
          const tagline = player.tagline || 'BR1'
          const account = await riotGet(
            `${RIOT_AMERICAS}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(player.summoner_name)}/${encodeURIComponent(tagline)}`
          )
          if (!account?.puuid) {
            results.push({ id: player.id, status: 'not_found' })
            continue
          }
          puuid = account.puuid
        }

        // 2. Buscar summoner por PUUID
        const summoner = await riotGet(`${RIOT_BR1}/lol/summoner/v4/summoners/by-puuid/${puuid}`)
        if (!summoner) {
          results.push({ id: player.id, status: 'summoner_not_found' })
          continue
        }

        // 3. Buscar ranked entries
        const ranked: any[] = await riotGet(
          `${RIOT_BR1}/lol/league/v4/entries/by-summoner/${summoner.id}`
        ) ?? []

        const soloQ = ranked.find((e: any) => e.queueType === 'RANKED_SOLO_5x5')

        // 4. Atualizar no banco com todos os campos
        await supabase
          .from('players')
          .update({
            puuid,
            profile_icon:   summoner.profileIconId,
            summoner_level: summoner.summonerLevel,
            tier:    soloQ?.tier  ?? 'UNRANKED',
            rank:    soloQ?.rank  ?? '',
            lp:      soloQ?.leaguePoints ?? 0,
            wins:    soloQ?.wins   ?? 0,
            losses:  soloQ?.losses ?? 0,
            last_synced: new Date().toISOString(),
          })
          .eq('id', player.id)

        results.push({
          id: player.id,
          summoner_name: player.summoner_name,
          tier: soloQ?.tier ?? 'UNRANKED',
          status: 'synced',
        })
      } catch (playerErr: any) {
        results.push({ id: player.id, status: 'error', message: playerErr.message })
      }
    }

    return new Response(
      JSON.stringify({
        synced: results.filter((r) => r.status === 'synced').length,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
