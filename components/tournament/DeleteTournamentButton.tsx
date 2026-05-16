'use client'

import { useRef } from 'react'

interface Props {
  action: (formData: FormData) => void | Promise<void>
}

export function DeleteTournamentButton({ action }: Props) {
  const formRef = useRef<HTMLFormElement>(null)

  function handleSubmit(e: React.FormEvent) {
    if (!confirm('Deletar este torneio permanentemente? Esta ação não pode ser desfeita.')) {
      e.preventDefault()
    }
  }

  return (
    <form ref={formRef} action={action} onSubmit={handleSubmit} className="ml-auto">
      <button
        type="submit"
        className="text-xs px-3 py-1.5 rounded-lg border border-red-500/40 text-red-400 hover:border-red-400 hover:bg-red-400/10 transition-colors"
      >
        🗑️ Deletar Torneio
      </button>
    </form>
  )
}
