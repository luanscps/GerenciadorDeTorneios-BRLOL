"use client";
import { useTransition } from "react";
import { toggleAdmin, toggleBan } from "@/lib/actions/usuario";

interface Props {
  userId: string;
  isAdmin: boolean;
  isBanned: boolean;
  displayName: string;
}

export function UserPermissionsForm({ userId, isAdmin, isBanned, displayName }: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-between bg-[#0A1428] rounded p-3 gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{displayName}</p>
        <div className="flex gap-2 mt-0.5">
          {isAdmin && (
            <span className="text-[10px] text-[#C8A84B] font-bold bg-[#C8A84B]/10 px-1.5 py-0.5 rounded">
              ADMIN
            </span>
          )}
          {isBanned && (
            <span className="text-[10px] text-red-400 font-bold bg-red-400/10 px-1.5 py-0.5 rounded">
              BANIDO
            </span>
          )}
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={() => startTransition(() => toggleAdmin(userId, !isAdmin))}
          disabled={pending}
          className={
            "text-xs px-3 py-1 rounded disabled:opacity-50 " +
            (isAdmin
              ? "bg-[#C8A84B]/20 text-[#C8A84B] hover:bg-red-600/20 hover:text-red-400"
              : "bg-[#1E3A5F] text-gray-300 hover:bg-[#C8A84B]/20 hover:text-[#C8A84B]")
          }
        >
          {isAdmin ? "Remover Admin" : "Tornar Admin"}
        </button>
        <button
          onClick={() => startTransition(() => toggleBan(userId, !isBanned))}
          disabled={pending}
          className={
            "text-xs px-3 py-1 rounded disabled:opacity-50 " +
            (isBanned
              ? "bg-green-600/20 text-green-400 hover:bg-green-600/40"
              : "bg-red-600/20 text-red-400 hover:bg-red-600/40")
          }
        >
          {isBanned ? "Desbanir" : "Banir"}
        </button>
      </div>
    </div>
  );
}
