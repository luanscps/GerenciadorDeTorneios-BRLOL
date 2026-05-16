'use client'

import { useState } from 'react'

type Props = {
  targetProfileId: string
  captainTeamId: string
  captainTeamName: string
}

export default function InviteButton({ targetProfileId, captainTeamId, captainTeamName }: Props) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState<'idle' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function sendInvite(isReserve: boolean) {
    setLoading(true)
    setDone('idle')
    setErrorMsg('')
    const res = await fetch('/api/teams/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        team_id: captainTeamId,
        invited_profile_id: targetProfileId,
        is_reserve: isReserve,
        message: '',
      }),
    })
    const json = await res.json()
    setLoading(false)
    if (!res.ok) { setDone('error'); setErrorMsg(json.error); return }
    setDone('sent')
  }

  if (done === 'sent') {
    return (
      <div className="inline-flex items-center gap-2 bg-green-900/40 border border-green-700 text-green-300 px-4 py-2 rounded-lg text-sm">
        ✓ Convite enviado para {captainTeamName}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {done === 'error' && (
        <p className="text-red-400 text-sm">{errorMsg}</p>
      )}
      <div className="flex gap-2">
        <button
          onClick={() => sendInvite(false)}
          disabled={loading}
          className="bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
        >
          {loading ? 'Enviando...' : `Convidar como Titular — ${captainTeamName}`}
        </button>
        <button
          onClick={() => sendInvite(true)}
          disabled={loading}
          className="bg-yellow-700 hover:bg-yellow-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
        >
          {loading ? 'Enviando...' : 'Convidar como Reserva'}
        </button>
      </div>
    </div>
  )
}
