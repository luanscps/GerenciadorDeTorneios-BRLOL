import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/teams/invite — capitão envia convite
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await req.json()
  const { team_id, invited_profile_id, is_reserve = false, message = '' } = body

  if (!team_id || !invited_profile_id) {
    return NextResponse.json({ error: 'team_id e invited_profile_id são obrigatórios' }, { status: 400 })
  }

  // Verifica se o user é capitão do time
  const { data: membership } = await supabase
    .from('team_members')
    .select('team_role')
    .eq('team_id', team_id)
    .eq('profile_id', user.id)
    .single()

  if (!membership || membership.team_role !== 'captain') {
    return NextResponse.json({ error: 'Apenas o capitão pode enviar convites' }, { status: 403 })
  }

  // Verifica limite de membros
  const { count } = await supabase
    .from('team_members')
    .select('*', { count: 'exact', head: true })
    .eq('team_id', team_id)

  if ((count ?? 0) >= 11) {
    return NextResponse.json({ error: 'Time já atingiu o limite de 11 jogadores' }, { status: 400 })
  }

  // Verifica limite específico titular/reserva
  if (!is_reserve) {
    const { count: titulares } = await supabase
      .from('team_members')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', team_id)
      .eq('is_reserve', false)
    if ((titulares ?? 0) >= 5) {
      return NextResponse.json({ error: 'Já existem 5 titulares. Convide como reserva.' }, { status: 400 })
    }
  } else {
    const { count: reservas } = await supabase
      .from('team_members')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', team_id)
      .eq('is_reserve', true)
    if ((reservas ?? 0) >= 6) {
      return NextResponse.json({ error: 'Já existem 6 reservas.' }, { status: 400 })
    }
  }

  // Verifica se já existe convite pendente
  const { data: existing } = await supabase
    .from('team_invites')
    .select('id')
    .eq('team_id', team_id)
    .eq('invited_profile_id', invited_profile_id)
    .eq('status', 'pending')
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Já existe um convite pendente para este jogador' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('team_invites')
    .insert({
      team_id,
      invited_profile_id,
      invited_by: user.id,
      is_reserve,
      message,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ invite: data }, { status: 201 })
}

// GET /api/teams/invite — lista convites pendentes do usuário logado
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data, error } = await supabase
    .from('team_invites')
    .select(`
      id,
      is_reserve,
      message,
      status,
      created_at,
      expires_at,
      teams:team_id ( id, name, slug, tag, logo_url ),
      inviter:invited_by ( id, username, riot_id_game_name, riot_id_tag_line, avatar_url )
    `)
    .eq('invited_profile_id', user.id)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ invites: data })
}
