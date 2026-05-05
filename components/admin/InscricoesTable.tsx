"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { aprovarInscricao, rejeitarInscricao } from "@/lib/actions/inscricao";

export default function InscricoesTable({ inscricoes, tournamentId }: any) {
  const [filter, setFilter] = useState("TODOS");
  const [expanded, setExpanded] = useState<string | null>(null);
  
  // Estados para modal de rejeição
  const [rejection, setRejection] = useState<{ teamId: string; notes: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const filtered = filter === "TODOS" 
    ? inscricoes 
    : inscricoes.filter((i: any) => i.status === filter);

  const handleApprove = async (teamId: string) => {
    startTransition(async () => {
      await aprovarInscricao(teamId, tournamentId);
      router.refresh();
    });
  };

  const handleReject = async () => {
    if (!rejection || !rejection.notes.trim()) return;
    
    startTransition(async () => {
      await rejeitarInscricao(rejection.teamId, tournamentId, rejection.notes);
      setRejection(null);
      router.refresh();
    });
  };

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {["TODOS", "PENDING", "APPROVED", "REJECTED"].map((s) => (
          <button 
            key={s} 
            onClick={() => setFilter(s)} 
            className={`px-4 py-1 rounded ${filter === s ? "bg-[#C8A84B] text-white" : "bg-[#1E3A5F] text-gray-300"}`}
          >
            {s}
          </button>
        ))}
      </div>

      <table className="min-w-full bg-[#0A1428] rounded border border-[#1E3A5F]">
        <thead>
          <tr className="border-b border-[#1E3A5F]">
            <th className="p-4 text-left">Time</th>
            <th className="p-4 text-left">Status</th>
            <th className="p-4 text-left">Ações</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((i: any) => (
            <tr key={i.id} className="border-b border-[#1E3A5F]">
              <td className="p-4 cursor-pointer" onClick={() => setExpanded(expanded === i.id ? null : i.id)}>
                {i.team.name} ({i.team.tag}) {expanded === i.id ? '▼' : '▶'}
                {expanded === i.id && (
                  <div className="mt-2 text-xs text-gray-400">
                    {i.team.players.map((p: any) => <div key={p.id}>{p.summoner_name} ({p.role}) - {p.tier} {p.lp} LP</div>)}
                  </div>
                )}
              </td>
              <td className="p-4">
                <span className={`px-2 py-1 rounded text-xs ${i.status === "PENDING" ? "bg-yellow-900 text-yellow-300" : i.status === "APPROVED" ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"}`}>
                  {i.status}
                </span>
              </td>
              <td className="p-4 flex gap-2">
                {i.status === "PENDING" && (
                  <button 
                    disabled={isPending}
                    onClick={() => handleApprove(i.team.id)} 
                    className="bg-green-700 px-3 py-1 rounded text-sm text-white disabled:opacity-50"
                  >
                    Aprovar
                  </button>
                )}
                {i.status !== "REJECTED" && (
                  <button 
                    onClick={() => setRejection({ teamId: i.team.id, notes: "" })} 
                    className="bg-red-700 px-3 py-1 rounded text-sm text-white"
                  >
                    Rejeitar
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {rejection && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[#0A1428] p-6 rounded w-full max-w-sm border border-[#1E3A5F]">
            <h3 className="mb-4 text-white font-bold">Motivo da Rejeição:</h3>
            <textarea 
              className="w-full p-2 mb-4 bg-[#1E3A5F] rounded text-white min-h-[100px]" 
              placeholder="Digite o motivo..."
              value={rejection.notes}
              onChange={(e) => setRejection({...rejection, notes: e.target.value})} 
            />
            <div className="flex gap-2">
              <button 
                disabled={isPending || !rejection.notes.trim()}
                onClick={handleReject} 
                className="bg-red-700 px-4 py-2 rounded text-white disabled:opacity-50"
              >
                Confirmar rejeição
              </button>
              <button onClick={() => setRejection(null)} className="px-4 py-2 text-gray-300 hover:text-white">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
