import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { BracketView } from "@/components/tournament/BracketView";
import { StandingsTable } from "@/components/tournament/StandingsTable";
import { TeamsList } from "@/components/tournament/TeamsList";
import { getQueueLabel } from "@/lib/utils";

export const revalidate = 60;

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

  // Conta apenas times com inscrição APROVADA para o contador público
  const { count: approvedCount } = await supabase
    .from("inscricoes")
    .select("id", { count: "exact", head: true })
    .eq("tournament_id", tournament.id)
    .eq("status", "APPROVED");

  // Verifica status da inscrição do usuário logado (qualquer status)
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
    .filter((m) => m.status === "finished")
    .sort((a, b) => {
      const dateA = new Date(a.played_at ?? a.scheduled_at ?? 0).getTime();
      const dateB = new Date(b.played_at ?? b.scheduled_at ?? 0).getTime();
      return dateB - dateA;
    })
    .slice(0, 5);

  const statusColor: Record<string, string> = {
    open: "text-green-400",
    checkin: "text-blue-400",
    ongoing: "text-yellow-400",
    finished: "text-gray-400",
    draft: "text-gray-500",
    cancelled: "text-red-400",
  };
  const statusLabel: Record<string, string> = {
    open: "Inscrições Abertas",
    checkin: "Check-in",
    ongoing: "Em Andamento",
    finished: "Encerrado",
    draft: "Rascunho",
    cancelled: "Cancelado",
  };

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
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
                🗓{" "}
                {new Date(tournament.starts_at).toLocaleDateString("pt-BR")}
              </p>
            )}
            {tournament.prize_pool && (
              <p className="text-[#C8A84B] font-semibold text-sm">
                🏆 {tournament.prize_pool}
              </p>
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
            <p className={"font-bold " + (statusColor[tournament.status] ?? "text-white")}>
              ● {statusLabel[tournament.status]}
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

        {/* Stats bar */}
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
              {matches?.filter((m) => m.status === "finished").length ?? 0}
            </p>
            <p className="text-gray-400 text-xs">Partidas jogadas</p>
          </div>
        </div>

        {/* Botão / status de inscrição — usuário logado */}
        {tournament.status === "open" && userData && (
          <div className="mt-4 pt-4 border-t border-[#1E3A5F]">
            {userInscricao?.status === "APPROVED" ? (
              <div className="flex items-center gap-2 text-green-400 text-sm">
                <span>✅</span>
                <span>Seu time está inscrito e aprovado neste torneio.</span>
              </div>
            ) : userInscricao?.status === "PENDING" ? (
              <div className="flex items-center gap-2 text-yellow-400 text-sm">
                <span>⏳</span>
                <span>Inscrição enviada — aguardando aprovação do organizador.</span>
              </div>
            ) : userInscricao?.status === "REJECTED" ? (
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <span>❌</span>
                <span>Sua inscrição foi recusada. Entre em contato com o organizador.</span>
              </div>
            ) : (
              <Link
                href={"/dashboard/times/criar?tournament=" + tournament.id}
                className="btn-gold"
              >
                + Inscrever Meu Time
              </Link>
            )}
          </div>
        )}

        {/* CTA para usuário não logado */}
        {tournament.status === "open" && !userData && (
          <div className="mt-4 pt-4 border-t border-[#1E3A5F]">
            <Link href="/login" className="btn-gold inline-block">
              Entrar para Inscrever Meu Time
            </Link>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {matches && matches.length > 0 && (
            <div className="card-lol">
              <h2 className="text-lg font-bold text-white mb-4">⚔️ Bracket</h2>
              <BracketView
                initialMatches={(matches ?? []) as any}
                tournamentId={tournament.id}
                readonly={true}
              />
            </div>
          )}

          {recentMatches.length > 0 && (
            <div className="card-lol">
              <h2 className="text-lg font-bold text-white mb-4">
                📊 Últimos Resultados
              </h2>
              <div className="space-y-2">
                {recentMatches.map((m: any) => (
                  <div
                    key={m.id}
                    className="bg-[#030D1A] border border-[#1E3A5F] rounded-lg px-4 py-3 flex items-center justify-between"
                  >
                    <span className="text-white font-medium text-sm">
                      {m.team_a?.name ?? "TBD"}
                    </span>
                    <span className="text-[#C8A84B] font-bold text-base mx-4 tabular-nums">
                      {m.score_a} × {m.score_b}
                    </span>
                    <span className="text-white font-medium text-sm text-right">
                      {m.team_b?.name ?? "TBD"}
                    </span>
                  </div>
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
              <h2 className="text-lg font-bold text-white mb-4">
                🛡️ Times ({teams.length}/{tournament.max_teams})
              </h2>
              <TeamsList teams={teamsWithCheckin} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
