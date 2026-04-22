"use client";
import { useTransition } from "react";
import { aprovarInscricao, rejeitarInscricao } from "@/lib/actions/inscricao";

interface Props {
  teamId: string;
  tournamentId: string;
  teamName: string;
  teamTag: string;
  status: string;
  memberCount: number;
  capitaoNome: string;
}

const STATUS_COLOR: Record<string, string> = {
  pending: "text-yellow-400",
  approved: "text-green-400",
  rejected: "text-red-400",
};

export function InscricaoRow({
  teamId, tournamentId, teamName, teamTag, status, memberCount, capitaoNome,
}: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-between bg-[#0A1428] rounded p-3 gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-white font-medium">
          <span className="text-[#C8A84B]">[{teamTag}]</span> {teamName}
        </p>
        <p className="text-gray-400 text-xs mt-0.5">
          {memberCount} membros - Capitao: {capitaoNome}
        </p>
      </div>
      <span className={"text-xs font-medium capitalize " + (STATUS_COLOR[status] ?? "text-gray-400")}>
        {status}
      </span>
      {status === "pending" && (
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => startTransition(() => aprovarInscricao(teamId, tournamentId))}
            disabled={pending}
            className="bg-green-600 hover:bg-green-500 text-white text-xs px-3 py-1 rounded disabled:opacity-50"
          >
            Aprovar
          </button>
          <button
            onClick={() => startTransition(() => rejeitarInscricao(teamId, tournamentId))}
            disabled={pending}
            className="bg-red-600 hover:bg-red-500 text-white text-xs px-3 py-1 rounded disabled:opacity-50"
          >
            Rejeitar
          </button>
        </div>
      )}
    </div>
  );
}
