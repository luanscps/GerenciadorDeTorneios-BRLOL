// app/api/admin/riot-accounts/[id]/lock/route.ts
// API Route: Admin aplica/altera/remove lock de uma riot_account
// Requer: profiles.role = 'admin'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, createServiceRoleClient } from '@/lib/supabase/server'

type LockAction = 'locked_permanent' | 'locked_until' | 'unlocked'

interface LockPayload {
  action: LockAction
  lock_days?: number   // so para locked_until (default: 30)
  lock_reason?: string
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: riotAccountId } = await params

  // 1. Auth + admin check via profiles.role enum
  const { userId, role } = await getAuthUser()
  if (!userId) return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
  if (role !== 'admin') return NextResponse.json({ error: 'Sem permissao' }, { status: 403 })

  // 2. Parse body
  let body: LockPayload
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body invalido' }, { status: 400 })
  }

  const { action, lock_days = 30, lock_reason } = body

  if (!['locked_permanent', 'locked_until', 'unlocked'].includes(action)) {
    return NextResponse.json({ error: 'action invalido' }, { status: 400 })
  }

  const supabase = createServiceRoleClient()

  // 3. Busca estado atual (para gravar previous_status no log)
  const { data: current, error: fetchErr } = await supabase
    .from('riot_accounts')
    .select('id, profile_id, lock_status, lock_until, game_name, tag_line')
    .eq('id', riotAccountId)
    .single()

  if (fetchErr || !current) {
    return NextResponse.json({ error: 'Conta Riot nao encontrada' }, { status: 404 })
  }

  // 4. Calcula novo lock_until
  const newLockUntil = action === 'locked_until'
    ? new Date(Date.now() + lock_days * 24 * 60 * 60 * 1000).toISOString()
    : null

  // 5. Atualiza riot_accounts
  const { error: updateErr } = await supabase
    .from('riot_accounts')
    .update({
      lock_status: action,
      lock_until:  newLockUntil,
      locked_by:   userId,
      locked_at:   new Date().toISOString(),
      lock_reason: lock_reason ?? null,
    })
    .eq('id', riotAccountId)

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  // 6. Grava log de auditoria
  const { error: logErr } = await supabase
    .from('riot_account_lock_logs')
    .insert({
      riot_account_id: riotAccountId,
      changed_by:      userId,
      action,
      lock_until:      newLockUntil,
      lock_reason:     lock_reason ?? null,
      previous_status: current.lock_status,
      previous_until:  current.lock_until ?? null,
    })

  if (logErr) {
    // Log falhou mas o update foi ok — nao rollback, apenas loga
    console.error('[lock-log] Falha ao gravar log:', logErr.message)
  }

  return NextResponse.json({
    success: true,
    riot_account_id: riotAccountId,
    action,
    lock_until: newLockUntil,
    account: `${current.game_name}#${current.tag_line}`,
  })
}

// GET: Historico de locks de uma riot_account
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: riotAccountId } = await params

  const { userId, role } = await getAuthUser()
  if (!userId) return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
  if (role !== 'admin') return NextResponse.json({ error: 'Sem permissao' }, { status: 403 })

  const supabase = createServiceRoleClient()

  const { data: logs, error } = await supabase
    .from('riot_account_lock_logs')
    .select(`
      id, action, lock_until, lock_reason,
      previous_status, previous_until, created_at,
      profiles:changed_by ( full_name, email )
    `)
    .eq('riot_account_id', riotAccountId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ logs })
}
