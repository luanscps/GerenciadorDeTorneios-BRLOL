import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { BracketView } from "@/components/tournament/BracketView";
import { StandingsTable } from "@/components/tournament/StandingsTable";
import { TeamsList } from "@/components/tournament/TeamsList";
import { DeleteTournamentButton } from "@/components/tournament/DeleteTournamentButton";
import { getQueueLabel } from "@/lib/utils";

export const revalidate = 60;

async function deleteTournament(tournamentId: string) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { error } = await supabase
    .from('tournaments')
    .delete()
    .eq('id', tournamentId)
    .eq('organizer_id', user.id)
  if (!error) redirect('/torneios')
}

export default async function TournamentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!tournament) notFound();

  const [
    { data: teams },
    { data: matches },
    { data: standings },
    { data: { user: userData } },
    { data: inscricoesCheckin },
  ] = await Promise.all([
    supabase
      .from("teams")
      .select("*, team_members(count)")
      .eq("tournament_id", tournament.id)
      .order("created_at"),
    supabase
      .from("matches")
      .select(
        "*, team_a:teams!team_a_id(name,tag,logo_url), team_b:teams!team_b_id(name,tag,logo_url), winner:teams!winner_id(name,tag)"
      )
      .eq("tournament_id", tournament.id)
      .order("round")
      .order("match_number"),
    supabase
      .from("v_tournament_standings")
      .select("*")
      .eq("tournament_id", tournament.id)
      .order("position"),
    supabase.auth.getUser(),
    supabase
      .from("inscricoes")
      .select("team_id, checked_in_at")
      .eq("tournament_id", tournament.id)
      .eq("status", "APPROVED"),
  ]);

  const isOrganizer = !!userData && userData.id === tournament.organizer_id;

  const checkinMap = new Map(
    (inscricoesCheckin ?? []).map(
      (i: { team_id: string; checked_in_at: string | null }) => [
        i.team_id,
        !!i.checked_in_at,
      ]
    )
  );

  const teamsWithCheckin = (teams ?? []).map((t) => ({
    ...t,
    checked_in: checkinMap.get(t.id) ?? false,
  }));

  const { count: approvedCount } = await supabase
    .from("inscricoes")
    .select("id", { count: "exact", head: true })
    .eq("tournament_id", tournament.id)
    .eq("status", "APPROVED");

  let userInscricao: { status: string } | null = null;
  if (userData) {
    const { data: myTeam } = await supabase
      .from("teams")
      .select("id")
      .eq("tournament_id", tournament.id)
      .eq("owner_id", userData.id)
      .maybeSingle();

    if (myTeam) {
      const { data: insc } = await supabase
        .from("inscricoes")
        .select("status")
        .eq("tournament_id", tournament.id)
        .eq("team_id", myTeam.id)
        .maybeSingle();
      userInscricao = insc ?? null;
    }
  }

  const recentMatches = (matches ?? [])
    .filter((m) => m.status === "FINISHED")
    .sort((a, b) => {
      const dateA = new Date(a.played_at ?? a.scheduled_at ?? 0).getTime();
      const dateB = new Date(b.played_at ?? b.scheduled_at ?? 0).getTime();
      return dateB - dateA;
    })
    .slice(0, 5);

  const matchTotal  = (matches ?? []).length;
  const matchAoVivo = (matches ?? []).filter(m => m.status === 'IN_PROGRESS').length;

  const statusColor: Record<string, string> = {
    OPEN: "text-green-400", CHECKIN: "text-blue-400", ONGOING: "text-yellow-400",
    IN_PROGRESS: "text-yellow-400", FINISHED: "text-gray-400",
    DRAFT: "text-gray-500", CANCELLED: "text-red-400",
  };
  const statusLabel: Record<string, string> = {
    OPEN: "Inscrições Abertas", CHECKIN: "Check-in", ONGOING: "Em Andamento",
    IN_PROGRESS: "Em Andamento", FINISHED: "Encerrado",
    DRAFT: "Rascunho", CANCELLED: "Cancelado",
  };

  const deleteTournamentBound = deleteTournament.bind(null, tournament.id);
  const tournamentStatus = tournament.status?.toUpperCase() ?? '';
  const isOpen = tournamentStatus === 'OPEN';
  const isDraftOrCancelled = tournamentStatus === 'DRAFT' || tournamentStatus === 'CANCELLED';

  return (
    <div className="space-y-8">
      {tournament.banner_url && (
        <div
          className="relative h-56 overflow-hidden rounded-xl"
          style={{
            backgroundImage: `url(${tournament.banner_url})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-[#030D1A] via-[#030D1A]/60 to-transparent" />
          <div className="relative z-10 flex flex-col justify-end h-full px-6 pb-5 gap-1">
            {tournament.starts_at && (
              <p className="text-gray-300 text-sm">
                🗓 {new Date(tournament.starts_at).toLocaleDateString("pt-BR")}
              </p>
            )}
            {tournament.prize_pool && (
              <p className="text-[#C8A84B] font-semibold text-sm">🏆 {tournament.prize_pool}</p>
            )}
          </div>
        </div>
      )}

      <div className="card-lol">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="text-gray-400 text-sm mb-1">
              {getQueueLabel(tournament.queue_type)} · {tournament.bracket_type?.replace("_", " ")}
            </p>
            <h1 className="text-3xl font-bold text-white">{tournament.name}</h1>
            {tournament.description && (
              <p className="text-gray-400 mt-2 max-w-2xl">{tournament.description}</p>
            )}
          </div>
          <div className="text-right space-y-1">
            <p className={"font-bold " + (statusColor[tournamentStatus] ?? "text-white")}>
              ● {statusLabel[tournamentStatus] ?? tournament.status}
            </p>
            {tournament.prize_pool && (
              <p className="text-[#C8A84B] font-bold">🏆 {tournament.prize_pool}</p>
            )}
            {tournament.starts_at && (
              <p className="text-gray-400 text-sm">
                {new Date(tournament.starts_at).toLocaleString("pt-BR")}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-[#1E3A5F]">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{approvedCount ?? 0}</p>
            <p className="text-gray-400 text-xs">Times inscritos</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{tournament.max_teams}</p>
            <p className="text-gray-400 text-xs">Vagas totais</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">
              {(matches ?? []).filter((m) => m.status === "FINISHED").length}
            </p>
            <p className="text-gray-400 text-xs">Partidas jogadas</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-[#1E3A5F]">
          <Link
            href={`/torneios/${slug}/partidas`}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#1E3A5F] text-sm text-gray-300 hover:border-[#C8A84B]/50 hover:text-[#C8A84B] transition-colors"
          >
            ⚔️ Partidas
            {matchTotal > 0 && (
              <span className="text-[10px] font-bold bg-[#1E3A5F] px-1.5 py-0.5 rounded">{matchTotal}</span>
            )}
            {matchAoVivo > 0 && (
              <span className="text-[10px] font-bold bg-yellow-900/40 text-yellow-400 border border-yellow-700/40 px-1.5 py-0.5 rounded animate-pulse">
                {matchAoVivo} ao vivo
              </span>
            )}
          </Link>
          <Link
            href={`/torneios/${slug}/times`}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#1E3A5F] text-sm text-gray-300 hover:border-[#C8A84B]/50 hover:text-[#C8A84B] transition-colors"
          >
            🛡️ Times
            {(teams ?? []).length > 0 && (
              <span className="text-[10px] font-bold bg-[#1E3A5F] px-1.5 py-0.5 rounded">{teams!.length}</span>
            )}
          </Link>
          <Link
            href={`/torneios/${slug}/bracket`}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#1E3A5F] text-sm text-gray-300 hover:border-[#C8A84B]/50 hover:text-[#C8A84B] transition-colors"
          >
            🏆 Chaveamento
          </Link>

          {isOrganizer && (
            <Link
              href={`/admin/tournaments/${tournament.id}/editar`}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-blue-500/40 text-sm text-blue-400 hover:border-blue-400 hover:bg-blue-400/10 transition-colors ml-auto"
            >
              ✏️ Editar Torneio
            </Link>
          )}
        </div>

        {isOrganizer && (
          <div className="mt-4 pt-4 border-t border-[#1E3A5F] flex flex-wrap items-center gap-3">
            <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Organizador</span>
            {/* FIX: links corrigidos de /dashboard/torneios → /admin/tournaments */}
            <Link
              href={`/admin/tournaments/${tournament.id}`}
              className="text-xs px-3 py-1.5 rounded-lg border border-[#1E3A5F] text-gray-300 hover:border-[#C8A84B]/50 hover:text-[#C8A84B] transition-colors"
            >
              ⚙️ Painel de Gestão
            </Link>
            <Link
              href={`/admin/tournaments/${tournament.id}/inscricoes`}
              className="text-xs px-3 py-1.5 rounded-lg border border-[#1E3A5F] text-gray-300 hover:border-[#C8A84B]/50 hover:text-[#C8A84B] transition-colors"
            >
              📋 Inscrições
            </Link>
            {isDraftOrCancelled ? (
              <DeleteTournamentButton action={deleteTournamentBound} />
            ) : (
              <span className="ml-auto text-xs text-gray-600 italic">
                Para deletar, cancele o torneio primeiro.
              </span>
            )}
          </div>
        )}

        {isOpen && (
          <>
            {userData && !isOrganizer && (
              <div className="mt-4 pt-4 border-t border-[#1E3A5F]">
                {userInscricao?.status === "APPROVED" ? (
                  <div className="flex items-center gap-2 text-green-400 text-sm">
                    <span>✅</span><span>Seu time está inscrito e aprovado neste torneio.</span>
                  </div>
                ) : userInscricao?.status === "PENDING" ? (
                  <div className="flex items-center gap-2 text-yellow-400 text-sm">
                    <span>⏳</span><span>Inscrição enviada — aguardando aprovação do organizador.</span>
                  </div>
                ) : userInscricao?.status === "REJECTED" ? (
                  <div className="flex items-center gap-2 text-red-400 text-sm">
                    <span>❌</span><span>Sua inscrição foi recusada. Entre em contato com o organizador.</span>
                  </div>
                ) : (
                  <Link href={"/dashboard/times/criar?tournament=" + tournament.id} className="btn-gold">
                    + Inscrever Meu Time
                  </Link>
                )}
              </div>
            )}
            {!userData && (
              <div className="mt-4 pt-4 border-t border-[#1E3A5F]">
                <Link href="/login" className="btn-gold inline-block">Entrar para Inscrever Meu Time</Link>
              </div>
            )}
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {matches && matches.length > 0 && (
            <div className="card-lol">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">⚔️ Bracket</h2>
                <Link href={`/torneios/${slug}/partidas`} className="text-xs text-[#C8A84B] hover:underline">
                  Ver todas as partidas →
                </Link>
              </div>
              <BracketView
                initialMatches={(matches ?? []) as any}
                tournamentId={tournament.id}
                readonly={true}
              />
            </div>
          )}

          {recentMatches.length > 0 && (
            <div className="card-lol">
              <h2 className="text-lg font-bold text-white mb-4">📊 Últimos Resultados</h2>
              <div className="space-y-2">
                {recentMatches.map((m: any) => (
                  <Link
                    key={m.id}
                    href={`/torneios/${slug}/partidas/${m.id}`}
                    className="bg-[#030D1A] border border-[#1E3A5F] rounded-lg px-4 py-3 flex items-center justify-between hover:border-[#C8A84B]/30 transition-colors"
                  >
                    <span className="text-white font-medium text-sm">{m.team_a?.name ?? 'TBD'}</span>
                    <span className="text-[#C8A84B] font-bold text-base mx-4 tabular-nums">{m.score_a} × {m.score_b}</span>
                    <span className="text-white font-medium text-sm text-right">{m.team_b?.name ?? 'TBD'}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {standings && standings.length > 0 && (
            <div className="card-lol">
              <h2 className="text-lg font-bold text-white mb-4">📊 Classificação</h2>
              <StandingsTable standings={standings} />
            </div>
          )}
        </div>
        <div>
          {teams && teams.length > 0 && (
            <div className="card-lol">
              <h2 className="text-lg font-bold text-white mb-4">🛡️ Times ({teams.length}/{tournament.max_teams})</h2>
              <TeamsList teams={teamsWithCheckin} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
