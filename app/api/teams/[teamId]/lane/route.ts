import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ teamId: string }> }

const VALID_LANES = ['top', 'jungle', 'mid', 'adc', 'support', 'fill', '']

// PATCH /api/teams/[teamId]/lane — capitão define lane de um membro
export async function PATCH(req: NextRequest, { params }: Params) {
  const { teamId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { profile_id, lane } = await req.json()

  if (!profile_id || lane === undefined) {
    return NextResponse.json({ error: 'profile_id e lane são obrigatórios' }, { status: 400 })
  }

  if (!VALID_LANES.includes(lane)) {
    return NextResponse.json(
      { error: `Lane inválida. Opções: ${VALID_LANES.filter(Boolean).join(', ')}` },
      { status: 400 }
    )
  }

  // Verifica se o user é capitão do time
  const { data: captainCheck } = await supabase
    .from('team_members')
    .select('team_role')
    .eq('team_id', teamId)
    .eq('profile_id', user.id)
    .single()

  if (!captainCheck || captainCheck.team_role !== 'captain') {
    return NextResponse.json({ error: 'Apenas o capitão pode definir lanes' }, { status: 403 })
  }

  const { error } = await supabase
    .from('team_members')
    .update({ lane })
    .eq('team_id', teamId)
    .eq('profile_id', profile_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, lane })
}
