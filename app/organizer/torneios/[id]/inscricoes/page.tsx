import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { InscricaoRow } from "@/components/admin/InscricaoRow";
import { ExportCsvButton } from "@/components/admin/ExportCsvButton";

export default async function OrganizerInscricoes({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: torneio } = await supabase
    .from("tournaments")
    .select("id, name, slug, organizer_id")
    .eq("id", id)
    .single()
  if (!torneio) notFound()

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single()

  if (torneio.organizer_id !== user.id && !profile?.is_admin) {
    redirect('/torneios?error=sem_permissao')
  }

  const { data: inscricoes } = await supabase
    .from("tournament_teams")
    .select(
      "status, teams(id, name, tag, team_members(profiles(display_name, username), role))"
    )
    .eq("tournament_id", id)
    .order("created_at", { ascending: true })

  const pendentes = (inscricoes ?? []).filter((i: any) => i.status === "pending")
  const aprovadas = (inscricoes ?? []).filter((i: any) => i.status === "approved")
  const outras    = (inscricoes ?? []).filter((i: any) => i.status !== "pending" && i.status !== "approved")

  function renderRow(i: any) {
    const cap = i.teams?.team_members?.find((m: any) => m.role === "captain")
    return (
      <InscricaoRow
        key={i.teams?.id}
        teamId={i.teams?.id}
        tournamentId={id}
        teamName={i.teams?.name}
        teamTag={i.teams?.tag}
        status={i.status}
        memberCount={i.teams?.team_members?.length ?? 0}
        capitaoNome={cap?.profiles?.display_name ?? cap?.profiles?.username ?? "Sem capitão"}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href={`/organizer/torneios/${id}`} className="text-gray-400 hover:text-white text-sm">
              ← {torneio.name}
            </Link>
          </div>
          <h1 className="text-xl font-bold text-white">Inscrições — {torneio.name}</h1>
        </div>
        <ExportCsvButton tournamentId={id} label="Exportar CSV" />
      </div>

      <div className="flex gap-4 text-sm text-gray-400">
        <span>Total: {(inscricoes ?? []).length}</span>
        <span className="text-yellow-400">Pendentes: {pendentes.length}</span>
        <span className="text-green-400">Aprovadas: {aprovadas.length}</span>
      </div>

      {pendentes.length > 0 && (
        <div className="bg-[#0D1B2E] border border-[#1E3A5F] rounded-lg p-4 space-y-2">
          <h2 className="text-[#C8A84B] text-sm font-bold mb-3">Aguardando Aprovação ({pendentes.length})</h2>
          {pendentes.map(renderRow)}
        </div>
      )}

      {aprovadas.length > 0 && (
        <div className="bg-[#0D1B2E] border border-[#1E3A5F] rounded-lg p-4 space-y-2">
          <h2 className="text-green-400 text-sm font-bold mb-3">Aprovadas ({aprovadas.length})</h2>
          {aprovadas.map(renderRow)}
        </div>
      )}

      {outras.length > 0 && (
        <div className="bg-[#0D1B2E] border border-[#1E3A5F] rounded-lg p-4 space-y-2">
          <h2 className="text-gray-400 text-sm font-bold mb-3">Outras ({outras.length})</h2>
          {outras.map(renderRow)}
        </div>
      )}

      {(inscricoes ?? []).length === 0 && (
        <p className="text-gray-500 text-sm">Nenhuma inscrição encontrada.</p>
      )}
    </div>
  )
}
