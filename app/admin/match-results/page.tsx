import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminMatchResultsTable from "@/components/admin/AdminMatchResultsTable";

export default async function AdminMatchResultsPage() {
  const supabase = await createClient();

  // Verificar sessão e admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/");

  // Buscar dados
  const { data: results, error } = await supabase
    .from("tournament_match_results")
    .select("id, tournament_code, game_id, processed, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error || !results) {
    return <div className="p-4 text-red-500">Erro ao carregar resultados: {error?.message}</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Resultados de Partidas (Ingestão)</h1>
      <AdminMatchResultsTable initialData={results} />
    </div>
  );
}
