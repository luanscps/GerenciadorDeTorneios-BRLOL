import { createClient } from "@/lib/supabase/server";
import { TournamentCard } from "@/components/tournament/TournamentCard";

const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  open: "Inscricoes Abertas",
  checkin: "Check-in",
  ongoing: "Em Andamento",
  finished: "Encerrado",
  cancelled: "Cancelado",
};

export default async function TorneiosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const supabase = await createClient();
  let query = supabase.from("tournaments").select("*").order("starts_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data: tournaments } = await query;
  const statuses = ["open", "checkin", "ongoing", "finished"];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex gap-2 flex-wrap">
          <a href="/torneios" className={"px-3 py-1 rounded text-sm border " + (!status ? "border-[#C8A84B] text-[#C8A84B]" : "border-[#1E3A5F] text-gray-400")}>Todos</a>
          {statuses.map((s) => (
            <a key={s} href={"/torneios?status=" + s} className={"px-3 py-1 rounded text-sm border " + (status === s ? "border-[#C8A84B] text-[#C8A84B]" : "border-[#1E3A5F] text-gray-400")}>
              {STATUS_LABELS[s]}
            </a>
          ))}
        </div>
      </div>

      {tournaments && tournaments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournaments.map((t) => <TournamentCard key={t.id} tournament={t} />)}
        </div>
      ) : (
        <div className="card-lol text-center py-20">
          <p className="text-gray-400 text-lg">Nenhum torneio encontrado.</p>
        </div>
      )}
    </div>
  );
}
