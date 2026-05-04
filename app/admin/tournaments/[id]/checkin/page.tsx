import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CheckinPanel from "@/components/admin/CheckinPanel";

export default async function AdminCheckinPage({ params }: { params: Promise<{ id: string }> }) {
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

  // Buscar todas as inscrições aprovadas deste torneio
  const { data: inscricoes } = await supabase
    .from("inscricoes")
    .select("id, checked_in, checked_in_at, team:teams(id, name, tag, logo_url)")
    .eq("tournament_id", params.id)
    .eq("status", "APPROVED");

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Monitoramento de Check-in</h1>
      <CheckinPanel initialData={inscricoes || []} tournamentId={params.id} />
    </div>
  );
}
