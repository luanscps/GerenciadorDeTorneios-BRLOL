"use client";
import { useTransition } from "react";
import { editarResultadoPartida } from "@/lib/actions/partida";

interface Props {
  matchId: string;
  tournamentId: string;
  teamAId: string;
  teamAName: string;
  teamBId: string;
  teamBName: string;
  currentWinnerId?: string;
  currentScoreA?: number;
  currentScoreB?: number;
}

export function PartidaResultForm({
  matchId, tournamentId,
  teamAId, teamAName,
  teamBId, teamBName,
  currentWinnerId, currentScoreA, currentScoreB,
}: Props) {
  const [pending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
        startTransition(() => {
            void (async () => {
              const res = await editarResultadoPartida(matchId, tournamentId, fd);
if (res && "error" in res) alert(res.error);
          })();
      });
      }

  const inputClass =
    "w-full bg-[#0D1B2E] border border-[#1E3A5F] rounded px-2 py-1 text-white text-sm text-center focus:border-[#C8A84B] outline-none";

  return (
    <form onSubmit={handleSubmit} className="bg-[#0A1428] rounded p-4 space-y-3">
      <div className="grid grid-cols-3 items-center gap-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">{teamAName}</label>
          <input name="score_a" type="number" min={0} max={99}
            defaultValue={currentScoreA ?? 0} className={inputClass} />
        </div>
        <p className="text-gray-500 text-center text-lg font-bold">VS</p>
        <div>
          <label className="block text-xs text-gray-400 mb-1">{teamBName}</label>
          <input name="score_b" type="number" min={0} max={99}
            defaultValue={currentScoreB ?? 0} className={inputClass} />
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">Vencedor</label>
        <select name="winner_team_id" defaultValue={currentWinnerId ?? ""} required
          className="w-full bg-[#0D1B2E] border border-[#1E3A5F] rounded px-2 py-1 text-white text-sm focus:border-[#C8A84B] outline-none">
          <option value="">Selecione o vencedor</option>
          <option value={teamAId}>{teamAName}</option>
          <option value={teamBId}>{teamBName}</option>
        </select>
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">Match ID Riot (opcional)</label>
        <input name="match_id_riot" placeholder="BR1_123456789"
          className="w-full bg-[#0D1B2E] border border-[#1E3A5F] rounded px-2 py-1 text-white text-sm focus:border-[#C8A84B] outline-none" />
      </div>
      <button type="submit" disabled={pending}
        className="w-full text-xs px-4 py-1.5 bg-[#C8A84B] hover:bg-[#b8963f] text-black font-bold rounded disabled:opacity-50">
        {pending ? "Salvando..." : "Salvar Resultado"}
      </button>
    </form>
  );
}
