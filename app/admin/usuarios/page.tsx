import { createClient } from "@/lib/supabase/server";
import { UserPermissionsForm } from "@/components/admin/UserPermissionsForm";

export default async function AdminUsuarios() {
  const supabase = await createClient();
  const { data: usuarios } = await supabase
    .from("profiles")
    .select("id, display_name, username, is_admin, is_banned, created_at")
    .order("created_at", { ascending: false });

  const admins = (usuarios ?? []).filter((u) => u.is_admin);
  const normais = (usuarios ?? []).filter((u) => !u.is_admin && !u.is_banned);
  const banidos = (usuarios ?? []).filter((u) => u.is_banned);

  function renderUser(u: any) {
    return (
      <UserPermissionsForm
        key={u.id}
        userId={u.id}
        displayName={u.display_name ?? u.username ?? u.id}
        isAdmin={!!u.is_admin}
        isBanned={!!u.is_banned}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Gerenciar Usuarios</h1>
        <div className="flex gap-4 text-xs text-gray-400">
          <span>
            Total: <strong className="text-white">{(usuarios ?? []).length}</strong>
          </span>
          <span>
            Admins: <strong className="text-[#C8A84B]">{admins.length}</strong>
          </span>
          <span>
            Banidos: <strong className="text-red-400">{banidos.length}</strong>
          </span>
        </div>
      </div>

      {admins.length > 0 && (
        <div className="bg-[#0D1B2E] border border-[#1E3A5F] rounded-lg p-4 space-y-2">
          <h2 className="text-[#C8A84B] text-sm font-bold mb-3">
            Administradores ({admins.length})
          </h2>
          {admins.map(renderUser)}
        </div>
      )}

      <div className="bg-[#0D1B2E] border border-[#1E3A5F] rounded-lg p-4 space-y-2">
        <h2 className="text-gray-300 text-sm font-bold mb-3">
          Usuarios ({normais.length})
        </h2>
        {normais.map(renderUser)}
      </div>

      {banidos.length > 0 && (
        <div className="bg-[#0D1B2E] border border-[#1E3A5F] rounded-lg p-4 space-y-2">
          <h2 className="text-red-400 text-sm font-bold mb-3">
            Banidos ({banidos.length})
          </h2>
          {banidos.map(renderUser)}
        </div>
      )}
    </div>
  );
}
