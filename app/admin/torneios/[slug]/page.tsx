import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { TournamentForm } from "@/components/admin/TournamentForm";
import { GenerateBracketButton } from "@/components/admin/GenerateBracketButton";

export default async function AdminTorneioPorSlug({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: t } = await supabase
    .from("tournaments")
    .select("*")
    .eq("slug", slug)
    .single();
  if (!t) notFound();

  const tournamentId = t.id;

  // Usa inscricoes (tabela correta) para contagens
  const { count: totalTeams } = await supabase
    .from("inscricoes")
    .select("*", { count: "exact", head: true })
    .eq("tournament_id", tournamentId);

  const { count: pendingTeams } = await supabase
    .from("inscricoes")
    .select("*", { count: "exact", head: true })
    .eq("tournament_id", tournamentId)
    .eq("status", "PENDING");

  const { count: approvedTeams } = await supabase
    .from("inscricoes")
    .select("*", { count: "exact", head: true })
    .eq("tournament_id", tournamentId)
    .eq("status", "APPROVED");

  const { count: checkedInTeams } = await supabase
    .from("inscricoes")
    .select("*", { count: "exact", head: true })
    .eq("tournament_id", tournamentId)
    .eq("checked_in", true);

  const { count: matchesCount } = await supabase
    .from("matches")
    .select("*", { count: "exact", head: true })
    .eq("tournament_id", tournamentId);

  const STATUS_LABEL: Record<string, string> = {
    draft:    "Rascunho",
    open:     "Aberto",
    checkin:  "Check-in",
    ongoing:  "Em andamento",
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
        <div className="flex gap-3 flex-wrap justify-end">
          <Link
            href={`/admin/torneios/${slug}/inscricoes`}
            className="bg-[#1E3A5F] hover:bg-[#C8A84B]/20 text-white hover:text-[#C8A84B] text-sm px-3 py-1.5 rounded border border-[#1E3A5F] hover:border-[#C8A84B]/30 transition-colors"
          >
            Inscrições {pendingTeams ? `(${pendingTeams} pendentes)` : ""}
          </Link>
          <Link
            href={`/admin/torneios/${slug}/checkins`}
            className="bg-[#1E3A5F] hover:bg-[#C8A84B]/20 text-white hover:text-[#C8A84B] text-sm px-3 py-1.5 rounded border border-[#1E3A5F] hover:border-[#C8A84B]/30 transition-colors"
          >
            Check-ins {checkedInTeams ? `(${checkedInTeams} ✓)` : ""}
          </Link>
          <Link
            href={`/admin/torneios/${slug}/partidas`}
            className="bg-[#1E3A5F] hover:bg-[#C8A84B]/20 text-white hover:text-[#C8A84B] text-sm px-3 py-1.5 rounded border border-[#1E3A5F] hover:border-[#C8A84B]/30 transition-colors"
          >
            Partidas {matchesCount ? `(${matchesCount})` : ""}
          </Link>
          <Link
            href={`/torneios/${slug}/bracket`}
            target="_blank"
            className="bg-[#1E3A5F] hover:bg-[#C8A84B]/20 text-white hover:text-[#C8A84B] text-sm px-3 py-1.5 rounded border border-[#1E3A5F] hover:border-[#C8A84B]/30 transition-colors"
          >
            🏆 Bracket ↗
          </Link>
          <Link
            href={`/torneios/${slug}`}
            target="_blank"
            className="bg-[#1E3A5F] hover:bg-[#C8A84B]/20 text-white hover:text-[#C8A84B] text-sm px-3 py-1.5 rounded border border-[#1E3A5F] hover:border-[#C8A84B]/30 transition-colors"
          >
            Ver público ↗
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-[#0D1B2E] border border-[#1E3A5F] rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-white">{totalTeams ?? 0}</p>
          <p className="text-xs text-gray-400 mt-1">Total inscritos</p>
        </div>
        <div className="bg-[#0D1B2E] border border-[#1E3A5F] rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-yellow-400">{pendingTeams ?? 0}</p>
          <p className="text-xs text-gray-400 mt-1">Pendentes</p>
        </div>
        <div className="bg-[#0D1B2E] border border-[#1E3A5F] rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{approvedTeams ?? 0}</p>
          <p className="text-xs text-gray-400 mt-1">Aprovados</p>
        </div>
        <div className="bg-[#0D1B2E] border border-[#1E3A5F] rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-blue-400">{checkedInTeams ?? 0}</p>
          <p className="text-xs text-gray-400 mt-1">Check-in feito</p>
        </div>
        <div className="bg-[#0D1B2E] border border-[#1E3A5F] rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-[#C8A84B]">{t.max_teams}</p>
          <p className="text-xs text-gray-400 mt-1">Vagas totais</p>
        </div>
      </div>

      {/* Bracket Generation */}
      <div className="bg-[#0D1B2E] border border-[#1E3A5F] rounded-lg p-4">
        <h2 className="text-sm font-bold text-[#C8A84B] mb-1">Gerar Bracket</h2>
        <p className="text-xs text-gray-400 mb-3">
          {matchesCount && matchesCount > 0
            ? `✅ Bracket já gerado — ${matchesCount} partidas criadas`
            : `Usa times com check-in (ou todos aprovados como fallback)`
          }
        </p>
        <GenerateBracketButton
          tournamentId={tournamentId}
          approvedTeams={approvedTeams ?? 0}
          currentStatus={t.status}
        />
      </div>

      {/* Edit Form */}
      <div className="bg-[#0D1B2E] border border-[#1E3A5F] rounded-lg p-4">
        <h2 className="text-sm font-bold text-gray-400 mb-4">Editar Torneio</h2>
        <TournamentForm
          mode="edit"
          tournamentId={tournamentId}
          defaultValues={{
            name:        t.name        ?? "",
            slug:        t.slug        ?? "",
            description: t.description ?? "",
            max_teams:   t.max_teams   ?? 16,
            starts_at:   t.starts_at
              ? new Date(t.starts_at).toISOString().slice(0, 16)
              : "",
            status:      t.status      ?? "draft",
          }}
        />
      </div>
    </div>
  );
}
