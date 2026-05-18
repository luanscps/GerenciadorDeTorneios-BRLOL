'use client';

import { useCallback, useState, useTransition } from 'react';
import { fazerCheckinOrganizador, desfazerCheckin } from '@/lib/actions/inscricao';

// ─── Tipos ────────────────────────────────────────────────────────────────────
type RiotAccountRow = {
  id: string;
  game_name: string;
  tag_line: string;
  puuid: string | null;
};

type TeamMemberRow = {
  id: string;
  team_role: string | null;
  riot_account: RiotAccountRow | null;
};

type TeamRow = {
  id: string;
  name: string;
  tag: string;
  logo_url: string | null;
  owner_id: string;
  team_members: TeamMemberRow[];
};

type CheckedInByRow = {
  full_name: string | null;
  email: string | null;
} | null;

type InscricaoRow = {
  id: string;
  status: string;
  checked_in: boolean;
  checked_in_at: string | null;
  teams: TeamRow | null;
  profiles: CheckedInByRow;
};

type SpectatorStatus = 'idle' | 'checking' | 'in_game' | 'free' | 'error';

interface Props {
  inscricoes: InscricaoRow[];
  tournamentId: string;
  tournamentStatus: string;
}

// ─── Componente ───────────────────────────────────────────────────────────────
export function CheckinClient({ inscricoes, tournamentId, tournamentStatus }: Props) {
  // Estado de verificação spectator por inscricaoId
  const [spectatorMap, setSpectatorMap] = useState<Record<string, SpectatorStatus>>({});
  // Estado de erro por ação
  const [errorMap, setErrorMap] = useState<Record<string, string>>({});
  // Estado de sucesso por ação
  const [successMap, setSuccessMap] = useState<Record<string, boolean>>({});
  const [, startTransition] = useTransition();

  // ── Verificação lazy Spectator-v5 ─────────────────────────────────────────
  // Chamada apenas quando o organizador tenta fazer check-in manual.
  // Verifica TODOS os membros do time com PUUID registrado.
  // Se qualquer um estiver em partida: bloqueia e exibe badge.
  const checkSpectator = useCallback(
    async (insc: InscricaoRow): Promise<boolean> => {
      const team = insc.teams;
      if (!team) return true; // sem time, libera (erro será capturado na action)

      const puuids = team.team_members
        .map((m) => m.riot_account?.puuid)
        .filter((p): p is string => !!p);

      if (puuids.length === 0) return true; // sem puuids vinculados, libera

      setSpectatorMap((prev) => ({ ...prev, [insc.id]: 'checking' }));

      try {
        // Verifica todos os membros em paralelo
        const results = await Promise.all(
          puuids.map((puuid) =>
            fetch(`/api/riot/live-game?puuid=${encodeURIComponent(puuid)}&region=br1`)
              .then((r) => r.json())
              .catch(() => ({ inGame: false }))
          )
        );

        const anyInGame = results.some((r) => r?.inGame === true);

        setSpectatorMap((prev) => ({
          ...prev,
          [insc.id]: anyInGame ? 'in_game' : 'free',
        }));

        return !anyInGame; // retorna true se LIVRE para check-in
      } catch {
        setSpectatorMap((prev) => ({ ...prev, [insc.id]: 'error' }));
        return true; // em caso de erro na API, não bloqueia (best-effort)
      }
    },
    []
  );

  // ── Fazer check-in manual (organizador) ──────────────────────────────────
  const handleFazerCheckin = useCallback(
    async (insc: InscricaoRow) => {
      setErrorMap((prev) => ({ ...prev, [insc.id]: '' }));

      // 1. Verifica spectator-v5 antes de confirmar
      const podeCheckin = await checkSpectator(insc);

      if (!podeCheckin) {
        setErrorMap((prev) => ({
          ...prev,
          [insc.id]: '⚠️ Um ou mais membros estão em partida ativa. Aguarde o término.',
        }));
        return;
      }

      // 2. Executa action server
      startTransition(() => {
        void fazerCheckinOrganizador(insc.id).then((result) => {
          if (result?.error) {
            setErrorMap((prev) => ({ ...prev, [insc.id]: result.error! }));
          } else {
            setSuccessMap((prev) => ({ ...prev, [insc.id]: true }));
          }
        });
      });
    },
    [checkSpectator]
  );

  // ── Desfazer check-in ─────────────────────────────────────────────────────
  const handleDesfazer = useCallback((inscricaoId: string) => {
    setErrorMap((prev) => ({ ...prev, [inscricaoId]: '' }));
    startTransition(() => {
      void desfazerCheckin(inscricaoId).then((result) => {
        if (result?.error) {
          setErrorMap((prev) => ({ ...prev, [inscricaoId]: result.error! }));
        }
      });
    });
  }, []);

  const isReadOnly = tournamentStatus === 'FINISHED' || tournamentStatus === 'CANCELED';

  return (
    <div className="bg-[#0D1B2E] border border-[#1E3A5F] rounded-lg p-4 overflow-x-auto">
      {isReadOnly && (
        <div className="mb-4 text-xs bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 rounded px-3 py-2">
          ⚠️ Torneio {tournamentStatus === 'FINISHED' ? 'encerrado' : 'cancelado'} — check-ins são somente leitura.
        </div>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-400 text-xs uppercase border-b border-[#1E3A5F]">
            <th className="text-left py-2 pr-4">Time</th>
            <th className="text-left py-2 pr-4">Membros / Riot</th>
            <th className="text-left py-2 pr-4">Status Insc.</th>
            <th className="text-left py-2 pr-4">Check-in</th>
            <th className="text-left py-2 pr-4">Quando</th>
            <th className="text-left py-2">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1E3A5F]">
          {inscricoes.map((insc) => {
            const team = insc.teams;
            const spectator = spectatorMap[insc.id] ?? 'idle';
            const err = errorMap[insc.id];
            const ok = successMap[insc.id];

            // Coleta nomes Riot dos membros para exibição
            const riotNames =
              team?.team_members
                .filter((m) => m.riot_account)
                .map(
                  (m) =>
                    `${m.riot_account!.game_name}#${m.riot_account!.tag_line}`
                ) ?? [];

            return (
              <tr key={insc.id} className="hover:bg-[#0D1E35] transition-colors">
                {/* Time */}
                <td className="py-3 pr-4">
                  <p className="text-white font-medium">
                    <span className="text-[#C8A84B]">[{team?.tag}]</span>{' '}
                    {team?.name}
                  </p>
                </td>

                {/* Membros Riot */}
                <td className="py-3 pr-4">
                  <div className="flex flex-col gap-0.5">
                    {riotNames.length > 0 ? (
                      riotNames.map((n) => (
                        <span key={n} className="text-xs text-gray-400 font-mono">
                          {n}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-600 italic">sem conta Riot</span>
                    )}
                    {/* Badge spectator */}
                    {spectator === 'checking' && (
                      <span className="text-xs text-blue-400 animate-pulse">🔍 Verificando...</span>
                    )}
                    {spectator === 'in_game' && (
                      <span className="text-xs text-red-400 font-semibold">🎮 Em partida ativa</span>
                    )}
                    {spectator === 'free' && (
                      <span className="text-xs text-green-400">✓ Livre</span>
                    )}
                  </div>
                </td>

                {/* Status Inscrição */}
                <td className="py-3 pr-4">
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-medium ${
                      insc.status === 'APPROVED'
                        ? 'bg-green-400/10 text-green-400 border border-green-400/30'
                        : insc.status === 'PENDING'
                        ? 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/30'
                        : 'bg-red-400/10 text-red-400 border border-red-400/30'
                    }`}
                  >
                    {insc.status}
                  </span>
                </td>

                {/* Check-in status */}
                <td className="py-3 pr-4">
                  {ok || insc.checked_in ? (
                    <span className="text-green-400 font-semibold">✅ Confirmado</span>
                  ) : (
                    <span className="text-gray-500">— Pendente</span>
                  )}
                </td>

                {/* Quando */}
                <td className="py-3 pr-4 text-gray-400 text-xs">
                  {insc.checked_in_at
                    ? new Date(insc.checked_in_at).toLocaleString('pt-BR')
                    : '—'}
                </td>

                {/* Ações */}
                <td className="py-3">
                  <div className="flex flex-col gap-1">
                    {/* Fazer check-in manual */}
                    {!insc.checked_in && !ok && insc.status === 'APPROVED' && !isReadOnly && (
                      <button
                        onClick={() => handleFazerCheckin(insc)}
                        disabled={spectator === 'checking' || spectator === 'in_game'}
                        className="text-xs bg-green-900/30 hover:bg-green-900/50 text-green-400 border border-green-500/30 px-2 py-1 rounded disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        {spectator === 'checking' ? '🔍 Verificando...' : '✅ Check-in'}
                      </button>
                    )}

                    {/* Desfazer check-in */}
                    {(insc.checked_in || ok) && !isReadOnly && (
                      <button
                        onClick={() => handleDesfazer(insc.id)}
                        className="text-xs bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-500/30 px-2 py-1 rounded transition-colors"
                      >
                        ↩ Desfazer
                      </button>
                    )}

                    {/* Erro */}
                    {err && (
                      <p className="text-xs text-red-400 max-w-[200px] leading-tight">{err}</p>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {inscricoes.length === 0 && (
        <p className="text-gray-500 text-sm text-center py-8">
          Nenhuma inscrição neste torneio.
        </p>
      )}
    </div>
  );
}
