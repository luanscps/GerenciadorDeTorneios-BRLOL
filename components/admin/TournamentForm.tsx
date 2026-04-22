"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { createTournament, updateTournament } from "@/lib/actions/tournament";

interface DefaultValues {
  name: string;
  slug: string;
  description: string;
  max_teams: number;
  starts_at: string;
  status: string;
}

interface Props {
  mode: "create" | "edit";
  tournamentId?: string;
  defaultValues?: DefaultValues;
}

export function TournamentForm({ mode, tournamentId, defaultValues }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
        startTransition(() => {
            void (async () => {
const result =
        mode === "create"
          ? await createTournament(fd)
          : await updateTournament(tournamentId!, fd);
      if (result && "error" in result) { alert(result.error); return; }
      router.push("/admin/torneios");
          })();
      });
      }

  const inputClass =
    "w-full bg-[#0A1428] border border-[#1E3A5F] rounded px-3 py-2 text-white text-sm focus:border-[#C8A84B] outline-none";

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
      <div>
        <label className="block text-xs text-gray-400 mb-1">Nome do Torneio</label>
        <input name="name" defaultValue={defaultValues?.name} required className={inputClass} />
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">Slug (URL)</label>
        <input name="slug" defaultValue={defaultValues?.slug} required placeholder="ex: copa-brlol-2025" className={inputClass} />
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">Descricao</label>
        <textarea name="description" defaultValue={defaultValues?.description} rows={3} className={inputClass + " resize-none"} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Max. Times</label>
          <input name="max_teams" type="number" min={2} max={64} defaultValue={defaultValues?.max_teams ?? 16} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Status</label>
          <select name="status" defaultValue={defaultValues?.status ?? "draft"} className={inputClass}>
            <option value="draft">Draft</option>
            <option value="open">Aberto</option>
            <option value="checkin">Check-in</option>
            <option value="ongoing">Em andamento</option>
            <option value="finished">Finalizado</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">Data de Inicio</label>
        <input name="starts_at" type="datetime-local" defaultValue={defaultValues?.starts_at} className={inputClass} />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="w-full py-2 text-sm bg-[#C8A84B] hover:bg-[#b8963f] text-black font-bold rounded disabled:opacity-50 transition-colors"
      >
        {pending ? "Salvando..." : mode === "create" ? "Criar Torneio" : "Salvar Alteracoes"}
      </button>
    </form>
  );
}
