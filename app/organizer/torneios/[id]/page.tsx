import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { TournamentForm } from "@/components/admin/TournamentForm";
import { GenerateBracketButton } from "@/components/admin/GenerateBracketButton";

async function checkAccess(tournamentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: t } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', tournamentId)
    .single()
  if (!t) notFound()

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  const isOrganizer = t.organizer_id === user.id
  const isAdmin = profile?.is_admin === true

  if (!isOrganizer && !isAdmin) {
    redirect('/torneios?error=sem_permissao')
  }

  return { supabase, user, t, isAdmin }
}

export default async function OrganizerTournamentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { supabase, t, isAdmin } = await checkAccess(id)

  const { count: totalTeams } = await supabase
    .from("inscricoes")
    .select("*", { count: "exact", head: true })
    .eq("tournament_id", id)

  const { count: pendingTeams } = await supabase
    .from("inscricoes")
    .select("*", { count: "exact", head: true })
    .eq("tournament_id", id)
    .in("status", ["PENDING", "pending"])

  const { count: approvedTeams } = await supabase
    .from("inscricoes")
    .select("*", { count: "exact", head: true })
    .eq("tournament_id", id)
    .in("status", ["APPROVED", "approved"])

  const { count: checkedInTeams } = await supabase
    .from("inscricoes")
    .select("*", { count: "exact", head: true })
    .eq("tournament_id", id)
    .eq("checked_in", true)

  const { count: matchesCount } = await supabase
    .from("matches")
    .select("*", { count: "exact", head: true })
    .eq("tournament_id", id)

  const { count: stagesCount } = await supabase
    .from("tournament_stages")
    .select("*", { count: "exact", head: true })
    .eq("tournament_id", id)

  const STATUS_LABEL: Record<string, string> = {
    draft: "Rascunho", open: "Aberto", registration: "Inscrições abertas",
    checkin: "Check-in", ongoing: "Em andamento", active: "Em andamento",
    finished: "Finalizado", DRAFT: "Rascunho", OPEN: "Aberto",
    CHECKIN: "Check-in", ACTIVE: "Em andamento", IN_PROGRESS: "Em andamento",
    FINISHED: "Finalizado",
  }

  const base = `/organizer/torneios/${id}`

  const navLinks = [
    { href: `${base}/fases`,      label: "Fases",      badge: stagesCount  ? `(${stagesCount})`            : null },
    { href: `${base}/inscricoes`, label: "Inscrições", badge: pendingTeams ? `(${pendingTeams} pendentes)` : null },
    { href: `${base}/checkin`,    label: "Check-ins",  badge: checkedInTeams ? `(${checkedInTeams} ✓)`    : null },
    { href: `${base}/partidas`,   label: "Partidas",   badge: matchesCount ? `(${matchesCount})`            : null },
    { href: t.slug ? `/torneios/${t.slug}` : `/t/${id}`, label: "Ver público ↗", badge: null, external: true },
    ...(isAdmin ? [{ href: `/admin/tournaments/${id}`, label: "🔒 Admin", badge: null, external: false }] : []),
  ]

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="mb-1">
            <Link href="/torneios" className="text-gray-400 hover:text-white text-sm">
              ← Torneios
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-white">{t.name}</h1>
          <span className="text-xs text-gray-400">
            Status: {STATUS_LABEL[t.status] ?? t.status}
          </span>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              target={link.external ? "_blank" : undefined}
              rel={link.external ? "noopener noreferrer" : undefined}
              className="bg-[#1E3A5F] hover:bg-[#C8A84B]/20 text-white hover:text-[#C8A84B] text-sm px-3 py-1.5 rounded border border-[#1E3A5F] hover:border-[#C8A84B]/30 transition-colors"
            >
              {link.label}{link.badge ? ` ${link.badge}` : ""}
            </Link>
          ))}
        </div>
      </div>

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

      <div className="bg-[#0D1B2E] border border-[#1E3A5F] rounded-lg p-4">
        <h2 className="text-sm font-bold text-[#C8A84B] mb-1">Gerar Bracket</h2>
        <p className="text-xs text-gray-400 mb-3">
          {matchesCount && matchesCount > 0
            ? `✅ Bracket já gerado — ${matchesCount} partidas criadas`
            : `Usa times com check-in (ou todos aprovados como fallback)`
          }
        </p>
        <GenerateBracketButton
          tournamentId={id}
          approvedTeams={approvedTeams ?? 0}
          currentStatus={t.status}
        />
      </div>

      <div className="bg-[#0D1B2E] border border-[#1E3A5F] rounded-lg p-4">
        <h2 className="text-sm font-bold text-gray-400 mb-4">Editar Torneio</h2>
        <TournamentForm
          mode="edit"
          tournamentId={id}
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
  )
}
