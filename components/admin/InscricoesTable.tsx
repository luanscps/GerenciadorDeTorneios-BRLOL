"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { aprovarInscricao, rejeitarInscricao } from "@/lib/actions/inscricao";

export default function InscricoesTable({ inscricoes, tournamentId }: any) {
  const [filter, setFilter] = useState("TODOS");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [rejection, setRejection] = useState<{ teamId: string; notes: string } | null>(null);
  const router = useRouter();

  const filtered = filter === "TODOS" ? inscricoes : inscricoes.filter((i: any) => i.status === filter);

  const handleApprove = async (teamId: string) => {
    await aprovarInscricao(teamId, tournamentId);
    router.refresh();
  };

  const handleReject = async () => {
    if (!rejection) return;
    await rejeitarInscricao(rejection.teamId, tournamentId, rejection.notes);
    setRejection(null);
    router.refresh();
  };

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {["TODOS", "PENDING", "APPROVED", "REJECTED"].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`px-4 py-1 rounded ${filter === s ? "bg-[#C8A84B] text-white" : "bg-[#1E3A5F] text-gray-300"}`}>
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
            <>
              <tr key={i.id} className="border-b border-[#1E3A5F] cursor-pointer" onClick={() => setExpanded(expanded === i.id ? null : i.id)}>
                <td className="p-4">{i.team.name} ({i.team.tag})</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs ${i.status === "PENDING" ? "bg-yellow-900 text-yellow-300" : i.status === "APPROVED" ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"}`}>
                    {i.status}
                  </span>
                </td>
                <td className="p-4 flex gap-2">
                  {i.status === "PENDING" && <button onClick={(e) => { e.stopPropagation(); handleApprove(i.team.id); }} className="bg-green-700 px-3 py-1 rounded text-sm text-white">Aprovar</button>}
                  {i.status !== "REJECTED" && <button onClick={(e) => { e.stopPropagation(); setRejection({ teamId: i.team.id, notes: "" }); }} className="bg-red-700 px-3 py-1 rounded text-sm text-white">Rejeitar</button>}
                </td>
              </tr>
              {expanded === i.id && (
                <tr>
                  <td colSpan={3} className="p-4 bg-[#111e33]">
                    <h4 className="text-sm font-bold mb-2">Jogadores:</h4>
                    {i.team.players.map((p: any) => <div key={p.id}>{p.summoner_name} ({p.role}) - {p.tier} {p.lp} LP</div>)}
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>

      {rejection && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-[#0A1428] p-6 rounded w-full max-w-sm">
            <h3 className="mb-4">Motivo da Rejeição:</h3>
            <textarea className="w-full p-2 mb-4 bg-[#1E3A5F] rounded text-white" onChange={(e) => setRejection({...rejection, notes: e.target.value})} />
            <div className="flex gap-2">
              <button onClick={handleReject} className="bg-red-700 px-4 py-2 rounded">Rejeitar</button>
              <button onClick={() => setRejection(null)} className="px-4 py-2">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
