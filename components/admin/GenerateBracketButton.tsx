'use client';

import { useState, useTransition } from 'react';

interface Props {
  tournamentId: string;
  approvedTeams: number;
  currentStatus: string;
}

export function GenerateBracketButton({
  tournamentId,
  approvedTeams,
  currentStatus,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canGenerate = approvedTeams >= 2 && currentStatus !== 'ongoing' && currentStatus !== 'finished';

  async function handleGenerate() {
    if (!canGenerate) return;
    setMessage(null);
    setError(null);

    startTransition(async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/bracket-generator`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({ tournament_id: tournamentId }),
          }
        );

        const data = await res.json();

        if (!res.ok) {
          setError(data?.error ?? 'Erro ao gerar bracket.');
        } else {
          setMessage(
            `Bracket gerado com sucesso! ${data?.matches_created ?? ''} partidas criadas.`
          );
          // Reload after 2 seconds
          setTimeout(() => window.location.reload(), 2000);
        }
      } catch (e) {
        setError('Erro de conexao ao gerar bracket.');
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <button
          onClick={handleGenerate}
          disabled={!canGenerate || pending}
          title={
            !canGenerate
              ? approvedTeams < 2
                ? `Necessario minimo 2 times aprovados (atual: ${approvedTeams})`
                : 'Torneio ja iniciado ou finalizado'
              : 'Gerar bracket do torneio'
          }
          className="flex items-center gap-2 px-4 py-2 bg-[#C8A84B] hover:bg-[#d4b55a] text-black font-semibold text-sm rounded border border-[#C8A84B] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2v-2a2 2 0 012-2h2a2 2 0 012 2m0 0V9a2 2 0 012-2h2a2 2 0 012 2v2m0 0a2 2 0 002 2h2a2 2 0 002-2V9a2 2 0 00-2-2h-2a2 2 0 00-2 2"
            />
          </svg>
          {pending ? 'Gerando...' : 'Gerar Bracket'}
        </button>

        {approvedTeams < 2 && (
          <span className="text-xs text-red-400">
            Minimo 2 times aprovados necessario ({approvedTeams} aprovado{approvedTeams !== 1 ? 's' : ''})
          </span>
        )}
      </div>

      {message && (
        <p className="text-green-400 text-sm bg-green-400/10 border border-green-400/30 rounded px-3 py-2">
          {message}
        </p>
      )}
      {error && (
        <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/30 rounded px-3 py-2">
          {error}
        </p>
      )}
    </div>
  );
}
