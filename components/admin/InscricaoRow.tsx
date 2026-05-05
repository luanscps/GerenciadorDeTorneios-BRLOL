"use client";
import { useState, useTransition } from "react";
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
  const [showModal, setShowModal] = useState(false);
  const [notes, setNotes] = useState('');

  const handleReject = () => {
    startTransition(() => {
      void rejeitarInscricao(teamId, tournamentId, notes);
      setShowModal(false);
      setNotes('');
    });
  };

  return (
    <>
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
              onClick={() => startTransition(() => { void aprovarInscricao(teamId, tournamentId); })}
              disabled={pending}
              className="bg-green-600 hover:bg-green-500 text-white text-xs px-3 py-1 rounded disabled:opacity-50"
            >
              Aprovar
            </button>
            <button
              onClick={() => setShowModal(true)}
              disabled={pending}
              className="bg-red-600 hover:bg-red-500 text-white text-xs px-3 py-1 rounded disabled:opacity-50"
            >
              Rejeitar
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[#0A1428] p-6 rounded w-full max-w-sm border border-[#1E3A5F]">
            <h3 className="mb-4 text-white font-bold">Motivo da Rejeição:</h3>
            <textarea
              className="w-full p-2 mb-4 bg-[#1E3A5F] rounded text-white min-h-[100px]"
              placeholder="Digite o motivo da rejeição..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                disabled={pending || !notes.trim()}
                onClick={handleReject}
                className="bg-red-600 px-4 py-2 rounded text-white text-sm disabled:opacity-50"
              >
                Confirmar rejeição
              </button>
              <button
                onClick={() => { setShowModal(false); setNotes(''); }}
                className="px-4 py-2 text-gray-300 hover:text-white text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
