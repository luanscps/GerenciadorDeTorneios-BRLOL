import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { InscricaoRow } from "@/components/admin/InscricaoRow";

export default async function AdminInscricoes({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: torneio } = await supabase
    .from("tournaments")
    .select("id,name")
    .eq("id", id)
    .single();
  if (!torneio) notFound();

  const { data: inscricoes } = await supabase
    .from("tournament_teams")
    .select(
      "status, teams(id, name, tag, team_members(profiles(display_name, username), role))"
    )
    .eq("tournament_id", id)
    .order("created_at", { ascending: true });

  const pendentes = (inscricoes ?? []).filter((i: any) => i.status === "pending");
  const outras = (inscricoes ?? []).filter((i: any) => i.status !== "pending");

  function renderRow(i: any) {
    const cap = i.teams?.team_members?.find((m: any) => m.role === "captain");
    return (
      <InscricaoRow
        key={i.teams?.id}
        teamId={i.teams?.id}
        tournamentId={id}
        teamName={i.teams?.name}
        teamTag={i.teams?.tag}
        status={i.status}
        memberCount={i.teams?.team_members?.length ?? 0}
        capitaoNome={
          cap?.profiles?.display_name ?? cap?.profiles?.username ?? "Sem capitao"
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">
        Inscricoes - {torneio.name}
      </h1>
      {pendentes.length > 0 && (
        <div className="bg-[#0D1B2E] border border-[#1E3A5F] rounded-lg p-4 space-y-2">
          <h2 className="text-[#C8A84B] text-sm font-bold mb-3">
            Aguardando Aprovacao ({pendentes.length})
          </h2>
          {pendentes.map(renderRow)}
        </div>
      )}
      {outras.length > 0 && (
        <div className="bg-[#0D1B2E] border border-[#1E3A5F] rounded-lg p-4 space-y-2">
          <h2 className="text-gray-400 text-sm font-bold mb-3">
            Processadas ({outras.length})
          </h2>
          {outras.map(renderRow)}
        </div>
      )}
    </div>
  );
}
