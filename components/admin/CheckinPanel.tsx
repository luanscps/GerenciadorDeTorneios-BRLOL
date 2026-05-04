"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { desfazerCheckin } from "@/lib/actions/inscricao";

export default function CheckinPanel({ initialData, tournamentId }: any) {
  const [inscricoes, setInscricoes] = useState(initialData);
  const supabase = createClient();

  const checkedInCount = inscricoes.filter((i: any) => i.checked_in).length;

  useEffect(() => {
    const channel = supabase
      .channel("inscricoes-checkin")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "inscricoes", filter: `tournament_id=eq.${tournamentId}` },
        (payload: any) => {
          setInscricoes((prev: any[]) =>
            prev.map((i) => (i.id === payload.new.id ? { ...i, ...payload.new } : i))
          );
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tournamentId, supabase]);

  return (
    <div>
      <div className="mb-6 bg-[#0A1428] p-4 rounded text-xl font-bold">
        {checkedInCount} de {inscricoes.length} times confirmados
      </div>

      <div className="grid gap-4">
        {inscricoes.map((i: any) => (
          <div key={i.id} className="flex items-center justify-between p-4 bg-[#0A1428] rounded border border-[#1E3A5F]">
            <div className="flex items-center gap-4">
              <span className="text-2xl">{i.checked_in ? "✅" : "⏳"}</span>
              <div>
                <p className="font-bold">{i.team.name} [{i.team.tag}]</p>
                <p className="text-xs text-gray-500">{i.checked_in ? new Date(i.checked_in_at).toLocaleTimeString() : "Pendente"}</p>
              </div>
            </div>
            {i.checked_in && (
              <button onClick={() => desfazerCheckin(i.id)} className="text-red-400 text-sm hover:underline">
                Desfazer
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
