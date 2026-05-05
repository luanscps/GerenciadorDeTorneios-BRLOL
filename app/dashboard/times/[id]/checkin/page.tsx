import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fazerCheckin } from "@/lib/actions/inscricao";

export default async function CheckinPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  // Validar se o usuário é owner do time
  const { data: team } = await supabase
    .from("teams")
    .select("owner_id, name")
    .eq("id", id)
    .single();

  if (!team || team.owner_id !== user.id) redirect("/dashboard");

  // Buscar inscrição aprovada
  const { data: inscricao } = await supabase
    .from("inscricoes")
    .select("id, status, checked_in, checked_in_at")
    .eq("team_id", id)
    .eq("status", "APPROVED")
    .maybeSingle();

  const handleCheckin = async () => {
    "use server";
    if (inscricao) await fazerCheckin(inscricao.id);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Check-in: {team.name}</h1>
      {!inscricao ? (
        <div className="p-4 bg-yellow-900/20 border border-yellow-700 text-yellow-200">
          Nenhum torneio ativo com inscrição aprovada para este time.
        </div>
      ) : inscricao.checked_in ? (
        <div className="p-4 bg-green-900/20 border border-green-700 text-green-200 flex items-center gap-2">
          ✅ Check-in realizado em {new Date(inscricao.checked_in_at!).toLocaleString()}
        </div>
      ) : (
        <form action={handleCheckin}>
          <button type="submit" className="bg-blue-600 px-6 py-2 rounded hover:bg-blue-700">
            Confirmar Check-in
          </button>
        </form>
      )}
    </div>
  );
}
