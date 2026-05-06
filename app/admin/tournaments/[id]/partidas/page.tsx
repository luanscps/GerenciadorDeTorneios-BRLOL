import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PartidaResultForm } from "@/components/admin/PartidaResultForm";

export default async function AdminPartidas({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: torneio } = await supabase
    .from("tournaments")
    .select("id, name")
    .eq("id", id)
    .single();
  if (!torneio) notFound();

  const { data: partidas } = await supabase
    .from("matches")
    .select(
      "id, status, winner_team_id, score_a, score_b, " +
      "team_a:teams!matches_team_a_id_fkey(id,name), " +
      "team_b:teams!matches_team_b_id_fkey(id,name)"
    )
    .eq("tournament_id", id)
    .order("created_at", { ascending: true });

  const pendentes   = (partidas ?? []).filter((p: any) => p.status !== "finished");
  const finalizadas = (partidas ?? []).filter((p: any) => p.status === "finished");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/admin/tournaments/${id}`} className="text-gray-400 hover:text-white text-sm">
          ← {torneio.name}
        </Link>
        <h1 className="text-xl font-bold text-white">Partidas — {torneio.name}</h1>
      </div>

      {pendentes.length > 0 && (
        <div className="bg-[#0D1B2E] border border-[#1E3A5F] rounded-lg p-4 space-y-4">
          <h2 className="text-[#C8A84B] text-sm font-bold">
            Aguardando Resultado ({pendentes.length})
          </h2>
          {pendentes.map((p: any) => (
            <PartidaResultForm
              key={p.id}
              matchId={p.id}
              tournamentId={id}
              teamAId={p.team_a.id}
              teamAName={p.team_a.name}
              teamBId={p.team_b.id}
              teamBName={p.team_b.name}
              currentWinnerId={p.winner_team_id ?? undefined}
              currentScoreA={p.score_a ?? 0}
              currentScoreB={p.score_b ?? 0}
            />
          ))}
        </div>
      )}

      {finalizadas.length > 0 && (
        <div className="bg-[#0D1B2E] border border-[#1E3A5F] rounded-lg p-4 space-y-3">
          <h2 className="text-gray-400 text-sm font-bold">
            Finalizadas ({finalizadas.length})
          </h2>
          {finalizadas.map((p: any) => (
            <div
              key={p.id}
              className="flex items-center justify-between bg-[#0A1428] rounded p-3 text-sm"
            >
              <span className="text-white">
                {p.team_a?.name ?? "—"} vs {p.team_b?.name ?? "—"}
              </span>
              <span className="text-gray-400">
                {p.score_a} × {p.score_b}
              </span>
              <span className="text-green-400 text-xs">Finalizada</span>
            </div>
          ))}
        </div>
      )}

      {(partidas ?? []).length === 0 && (
        <p className="text-gray-500 text-sm">
          Nenhuma partida gerada ainda. Gere o bracket primeiro.
        </p>
      )}
    </div>
  );
}
