import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ inviteId: string }> }

// PATCH /api/teams/invite/[inviteId] — aceitar ou rejeitar convite
export async function PATCH(req: NextRequest, { params }: Params) {
  const { inviteId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { action } = await req.json() // action: 'accept' | 'reject'
  if (!['accept', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'action deve ser accept ou reject' }, { status: 400 })
  }

  // Busca o convite garantindo que pertence ao user
  const { data: invite, error: fetchErr } = await supabase
    .from('team_invites')
    .select('*')
    .eq('id', inviteId)
    .eq('invited_profile_id', user.id)
    .eq('status', 'pending')
    .single()

  if (fetchErr || !invite) {
    return NextResponse.json({ error: 'Convite não encontrado ou já processado' }, { status: 404 })
  }

  if (action === 'reject') {
    await supabase.from('team_invites').update({ status: 'rejected' }).eq('id', inviteId)
    return NextResponse.json({ ok: true, status: 'rejected' })
  }

  // Aceitar: verifica limite de membros antes
  const { count } = await supabase
    .from('team_members')
    .select('*', { count: 'exact', head: true })
    .eq('team_id', invite.team_id)

  if ((count ?? 0) >= 11) {
    await supabase.from('team_invites').update({ status: 'cancelled' }).eq('id', inviteId)
    return NextResponse.json({ error: 'Time já atingiu o limite de 11 jogadores' }, { status: 400 })
  }

  // Insere membro e atualiza convite atomicamente
  const { error: insertErr } = await supabase
    .from('team_members')
    .insert({
      team_id: invite.team_id,
      profile_id: user.id,
      team_role: 'member',
      is_reserve: invite.is_reserve,
    })

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

  await supabase.from('team_invites').update({ status: 'accepted' }).eq('id', inviteId)

  return NextResponse.json({ ok: true, status: 'accepted' })
}

// DELETE /api/teams/invite/[inviteId] — capitão cancela convite
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { inviteId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: invite } = await supabase
    .from('team_invites')
    .select('id, invited_by')
    .eq('id', inviteId)
    .single()

  if (!invite || invite.invited_by !== user.id) {
    return NextResponse.json({ error: 'Apenas quem enviou pode cancelar o convite' }, { status: 403 })
  }

  await supabase.from('team_invites').update({ status: 'cancelled' }).eq('id', inviteId)

  return NextResponse.json({ ok: true })
}
