import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
const NAV = [
  { href:"/admin",          label:"📊 Dashboard" },
  { href:"/admin/torneios", label:"🏆 Torneios" },
  { href:"/admin/partidas", label:"⚔️ Partidas" },
  { href:"/admin/jogadores", label:"👥 Jogadores" },
  { href:"/admin/usuarios", label:"👤 Usuários" },
  { href:"/admin/audit",    label:"📋 Log de Auditoria" },
];
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) redirect("/");
  return (
    <div className="flex min-h-screen gap-0">
      <aside className="w-56 shrink-0 bg-[#0A1428] border-r border-[#1E3A5F] p-4 space-y-1">
        <p className="text-[#C8A84B] font-bold text-xs uppercase tracking-widest mb-6 px-2">⚙ Painel Admin</p>
        {NAV.map(({ href, label }) => (
          <Link key={href} href={href}
            className="flex items-center gap-2 px-3 py-2 rounded text-gray-300 hover:bg-[#112240] hover:text-white transition-colors text-sm">
            {label}
          </Link>
        ))}
      </aside>
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  );
}
