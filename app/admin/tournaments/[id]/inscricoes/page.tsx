import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listarInscricoesPorTorneio } from "@/lib/actions/inscricao";
import InscricoesTable from "@/components/admin/InscricoesTable";

export default async function InscricoesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/");

  const { data: inscricoes, error } = await listarInscricoesPorTorneio(params.id);

  if (error) {
    return <div className="p-4 text-red-500">Erro: {error}</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Inscrições</h1>
      <InscricoesTable inscricoes={inscricoes || []} tournamentId={params.id} />
    </div>
  );
}
