import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { BracketView } from "@/components/tournament/BracketView";
import { StandingsTable } from "@/components/tournament/StandingsTable";
import { TeamsList } from "@/components/tournament/TeamsList";
import { getQueueLabel } from "@/lib/utils";
export default async function TournamentPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
  const supabase = await createClient();
    const { data: tournament } = await supabase.from("tournaments").select("*").eq("slug", slug).single();
  if (!tournament) notFound();
    const [{ data: teams }, { data: matches }, { data: standings }, { data: { user: userData } }] = await Promise.all([
    supabase.from("teams").select("*, captain:profiles!captain_id(username,display_name), team_members(count)").eq("tournament_id", tournament.id).order("seed"),
    supabase.from("matches").select("*, team_a:teams!team_a_id(name,tag,logo_url), team_b:teams!team_b_id(name,tag,logo_url), winner:teams!winner_id(name,tag)").eq("tournament_id", tournament.id).order("round").order("match_number"),
    supabase.from("v_tournament_standings").select("*").eq("tournament_id", tournament.id).order("position"),
          supabase.auth.getUser(),
  ]);
  const statusColor: Record<string,string> = {
    open:"text-green-400", checkin:"text-blue-400", ongoing:"text-yellow-400",
    finished:"text-gray-400", draft:"text-gray-500", cancelled:"text-red-400",
  };
  const statusLabel: Record<string,string> = {
    open:"Inscricoes Abertas", checkin:"Check-in", ongoing:"Em Andamento",
    finished:"Encerrado", draft:"Rascunho", cancelled:"Cancelado",
  };
  return (
    <div className="space-y-8">
      <div className="card-lol">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="text-gray-400 text-sm mb-1">{getQueueLabel(tournament.queue_type)} · {tournament.bracket_type?.replace("_"," ")}</p>
            <h1 className="text-3xl font-bold text-white">{tournament.name}</h1>
            {tournament.description && <p className="text-gray-400 mt-2 max-w-2xl">{tournament.description}</p>}
          </div>
          <div className="text-right space-y-1">
            <p className={"font-bold " + (statusColor[tournament.status] ?? "text-white")}>● {statusLabel[tournament.status]}</p>
            {tournament.prize_pool && <p className="text-[#C8A84B] font-bold">🏆 {tournament.prize_pool}</p>}
            {tournament.starts_at && <p className="text-gray-400 text-sm">{new Date(tournament.starts_at).toLocaleString("pt-BR")}</p>}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-[#1E3A5F]">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{teams?.length ?? 0}</p>
            <p className="text-gray-400 text-xs">Times inscritos</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{tournament.max_teams}</p>
            <p className="text-gray-400 text-xs">Vagas totais</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{matches?.filter(m => m.status === "finished").length ?? 0}</p>
            <p className="text-gray-400 text-xs">Partidas jogadas</p>
          </div>
        </div>
              {tournament.status === "open" && userData && (
          <div className="mt-4 pt-4 border-t border-[#1E3A5F]">
            <Link href={"/dashboard/time/criar?tournament=" + tournament.id} className="btn-gold">+ Inscrever Meu Time</Link>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {matches && matches.length > 0 && (
            <div className="card-lol">
              <h2 className="text-lg font-bold text-white mb-4">⚔️ Bracket</h2>
              <BracketView initialMatches={(matches ?? []) as any} tournamentId={tournament.id} />
            </div>
          )}
          {standings && standings.length > 0 && (
            <div className="card-lol">
              <h2 className="text-lg font-bold text-white mb-4">📊 Classificacao</h2>
              <StandingsTable standings={standings} />
            </div>
          )}
        </div>
        <div>
          {teams && teams.length > 0 && (
            <div className="card-lol">
              <h2 className="text-lg font-bold text-white mb-4">🛡️ Times ({teams.length}/{tournament.max_teams})</h2>
              <TeamsList teams={teams} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
