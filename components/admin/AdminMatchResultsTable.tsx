"use client";

import { useState } from "react";

type MatchResult = {
  id: string;
  tournament_code: string;
  game_id: number;
  processed: boolean;
  created_at: string;
};

export default function AdminMatchResultsTable({ initialData }: { initialData: MatchResult[] }) {
  const [data, setData] = useState<MatchResult[]>(initialData);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleReprocess = async (match: MatchResult) => {
    setProcessingId(match.id);
    setErrors((prev) => ({ ...prev, [match.id]: "" }));

    try {
      const res = await fetch("/api/admin/process-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tournamentCode: match.tournament_code,
          gameId: match.game_id,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Erro ao processar");
      }

      setData((prev) =>
        prev.map((item) =>
          item.id === match.id ? { ...item, processed: true } : item
        )
      );
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        [match.id]: err instanceof Error ? err.message : "Erro desconhecido",
      }));
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tournament</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Game ID</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ação</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((item) => (
            <tr key={item.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.tournament_code}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.game_id}</td>
              <td className="px-6 py-4 whitespace-nowrap">
                {item.processed ? (
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Processado</span>
                ) : (
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">Pendente</span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                {!item.processed && (
                  <button
                    onClick={() => handleReprocess(item)}
                    disabled={processingId === item.id}
                    className="text-indigo-600 hover:text-indigo-900 disabled:opacity-50"
                  >
                    {processingId === item.id ? "Processando..." : "Reprocessar"}
                  </button>
                )}
                {errors[item.id] && <p className="text-red-500 text-xs mt-1">{errors[item.id]}</p>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
