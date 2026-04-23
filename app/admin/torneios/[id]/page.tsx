import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { TournamentForm } from "@/components/admin/TournamentForm";
import { GenerateBracketButton } from "@/components/admin/GenerateBracketButton";

export default async function AdminTorneioPorId({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: t } = await supabase
    .from("tournaments")
    .select("*")
    .eq("id", id)
    .single();
  if (!t) notFound();

  const { count: totalTeams } = await supabase
    .from("tournament_teams")
    .select("*", { count: "exact", head: true })
    .eq("tournament_id", id);

  const { count: pendingTeams } = await supabase
    .from("tournament_teams")
    .select("*", { count: "exact", head: true })
    .eq("tournament_id", id)
    .eq("status", "pending");

  const { count: approvedTeams } = await supabase
    .from("tournament_teams")
    .select("*", { count: "exact", head: true })
    .eq("tournament_id", id)
    .eq("status", "approved");

  const STATUS_LABEL: Record<string, string> = {
    draft: "Rascunho",
    open: "Aberto",
    checkin: "Check-in",
    ongoing: "Em andamento",
    finished: "Finalizado",
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t.name}</h1>
          <span className="text-xs text-gray-400">
            Status: {STATUS_LABEL[t.status] ?? t.status}
          </span>
        </div>
        <div className="flex gap-3">
          <Link
            href={"/admin/torneios/" + id + "/inscricoes"}
            className="bg-[#1E3A5F] hover:bg-[#C8A84B]/20 text-white hover:text-[#C8A84B] text-sm px-3 py-1.5 rounded border border-[#1E3A5F] hover:border-[#C8A84B]/30 transition-colors"
          >
            Inscricoes {pendingTeams ? "(" + pendingTeams + " pendentes)" : ""}
          </Link>
          <Link
            href={"/admin/torneios/" + id + "/partidas"}
            className="bg-[#1E3A5F] hover:bg-[#C8A84B]/20 text-white hover:text-[#C8A84B] text-sm px-3 py-1.5 rounded border border-[#1E3A5F] hover:border-[#C8A84B]/30 transition-colors"
          >
            Partidas
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#0D1B2E] border border-[#1E3A5F] rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-white">{totalTeams ?? 0}</p>
          <p className="text-xs text-gray-400 mt-1">Times inscritos</p>
        </div>
        <div className="bg-[#0D1B2E] border border-[#1E3A5F] rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-yellow-400">{pendingTeams ?? 0}</p>
          <p className="text-xs text-gray-400 mt-1">Aguardando aprovacao</p>
        </div>
        <div className="bg-[#0D1B2E] border border-[#1E3A5F] rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{approvedTeams ?? 0}</p>
          <p className="text-xs text-gray-400 mt-1">Times aprovados</p>
        </div>
        <div className="bg-[#0D1B2E] border border-[#1E3A5F] rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-white">{t.max_teams}</p>
          <p className="text-xs text-gray-400 mt-1">Vagas totais</p>
        </div>
      </div>

      {/* Bracket Generation */}
      <div className="bg-[#0D1B2E] border border-[#1E3A5F] rounded-lg p-4">
        <h2 className="text-sm font-bold text-[#C8A84B] mb-3">Gerenciar Bracket</h2>
        <GenerateBracketButton
          tournamentId={id}
          approvedTeams={approvedTeams ?? 0}
          currentStatus={t.status}
        />
      </div>

      {/* Edit Form */}
      <div className="bg-[#0D1B2E] border border-[#1E3A5F] rounded-lg p-4">
        <h2 className="text-sm font-bold text-gray-400 mb-4">Editar Torneio</h2>
        <TournamentForm tournament={t} />
      </div>
    </div>
  );
}
