// @ts-nocheck
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { tournament_id } = await req.json()
    if (!tournament_id) {
      return new Response(JSON.stringify({ error: 'tournament_id obrigatorio' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Buscar torneio
    const { data: tournament, error: tErr } = await supabase
      .from('tournaments')
      .select('id, name, bracket_type, max_teams')
      .eq('id', tournament_id)
      .single()

    if (tErr || !tournament) {
      return new Response(JSON.stringify({ error: 'Torneio nao encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Buscar stage principal
    const { data: stages } = await supabase
      .from('tournament_stages')
      .select('id, bracket_type, best_of')
      .eq('tournament_id', tournament_id)
      .order('stage_order', { ascending: true })

    const stage = stages?.[0]
    if (!stage) {
      return new Response(
        JSON.stringify({ error: 'Nenhuma fase encontrada. Crie uma fase primeiro.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Buscar times aprovados com seedagem
    const { data: inscricoes } = await supabase
      .from('inscricoes')
      .select('team_id, teams(id, name)')
      .eq('tournament_id', tournament_id)
      .eq('status', 'APPROVED')

    if (!inscricoes || inscricoes.length < 2) {
      return new Response(
        JSON.stringify({ error: 'Minimo 2 times aprovados necessarios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Buscar seedagem
    const { data: seedsData } = await supabase
      .from('seedings')
      .select('team_id, seed')
      .eq('tournament_id', tournament_id)
      .order('seed', { ascending: true })

    let orderedTeams: string[]
    if (seedsData && seedsData.length === inscricoes.length) {
      orderedTeams = seedsData.map((s: any) => s.team_id)
    } else {
      // Aleatorizar se nao houver seedagem
      orderedTeams = inscricoes.map((i: any) => i.team_id)
      orderedTeams = orderedTeams.sort(() => Math.random() - 0.5)
    }

    const bracketType = stage.bracket_type || tournament.bracket_type
    const matches: any[] = []

    if (bracketType === 'SINGLE_ELIMINATION') {
      // Preencher ate proxima potencia de 2 com BYEs
      const totalSlots = Math.pow(2, Math.ceil(Math.log2(orderedTeams.length)))
      const padded = [...orderedTeams, ...Array(totalSlots - orderedTeams.length).fill(null)]

      let round = 1
      let roundTeams: (string | null)[] = padded

      while (roundTeams.length > 1) {
        const nextRound: (string | null)[] = []
        for (let i = 0; i < roundTeams.length; i += 2) {
          const teamA = roundTeams[i]
          const teamB = roundTeams[i + 1]
          const matchOrder = Math.floor(i / 2) + 1

          if (teamA && teamB) {
            matches.push({
              tournament_id,
              stage_id: stage.id,
              round,
              match_order: matchOrder,
              team_a_id: teamA,
              team_b_id: teamB,
              status: 'SCHEDULED',
              format: stage.best_of === 3 ? 'BO3' : stage.best_of === 5 ? 'BO5' : 'BO1',
            })
            nextRound.push(null) // placeholder vencedor
          } else if (teamA && !teamB) {
            // BYE - avanca automaticamente
            nextRound.push(teamA)
          } else {
            nextRound.push(null)
          }
        }
        round++
        roundTeams = nextRound
      }
    } else if (bracketType === 'ROUND_ROBIN') {
      // Algoritmo round-robin circular
      const teams = [...orderedTeams]
      if (teams.length % 2 !== 0) teams.push(null as any) // dummy BYE

      const totalRounds = teams.length - 1
      const half = teams.length / 2

      for (let round = 1; round <= totalRounds; round++) {
        let matchOrder = 1
        for (let i = 0; i < half; i++) {
          const teamA = teams[i]
          const teamB = teams[teams.length - 1 - i]
          if (teamA && teamB) {
            matches.push({
              tournament_id,
              stage_id: stage.id,
              round,
              match_order: matchOrder++,
              team_a_id: teamA,
              team_b_id: teamB,
              status: 'SCHEDULED',
              format: stage.best_of === 3 ? 'BO3' : stage.best_of === 5 ? 'BO5' : 'BO1',
            })
          }
        }
        // Rotacionar - mantém teams[0] fixo
        const last = teams.pop()!
        teams.splice(1, 0, last)
      }
    } else if (bracketType === 'SWISS') {
      // Swiss gera apenas rodada 1 aleatoria
      const teams = [...orderedTeams]
      let matchOrder = 1
      for (let i = 0; i < teams.length - 1; i += 2) {
        matches.push({
          tournament_id,
          stage_id: stage.id,
          round: 1,
          match_order: matchOrder++,
          team_a_id: teams[i],
          team_b_id: teams[i + 1],
          status: 'SCHEDULED',
          format: stage.best_of === 3 ? 'BO3' : 'BO1',
        })
      }
    }

    // Deletar partidas existentes desta stage antes de inserir
    await supabase.from('matches').delete().eq('stage_id', stage.id)

    // Inserir todas as partidas geradas
    const { error: insertErr } = await supabase.from('matches').insert(matches)
    if (insertErr) {
      return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Audit log
    await supabase.rpc('log_admin_action', {
      p_action: 'BRACKET_GENERATED',
      p_table_name: 'matches',
      p_record_id: tournament_id,
      p_old_data: null,
      p_new_data: { matches_created: matches.length, bracket_type: bracketType },
    })

    return new Response(
      JSON.stringify({ success: true, matches_created: matches.length, bracket_type: bracketType }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
