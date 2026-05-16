"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type Stage = {
  id: string; name: string; bracket_type: string; best_of: number;
  stage_order: number; slots: number | null; status: string; created_at: string;
};

const BRACKET_TYPES = [
  { value: "single_elimination", label: "Eliminação Simples" },
  { value: "double_elimination", label: "Eliminação Dupla" },
  { value: "round_robin",        label: "Fase de Grupos (Round Robin)" },
  { value: "swiss",              label: "Swiss" },
  { value: "gauntlet",           label: "Gauntlet" },
];
const BEST_OF_OPTIONS = [1, 2, 3, 5, 7];
const STATUS_COLOR: Record<string, string> = {
  pending:  "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  active:   "text-green-400  bg-green-400/10  border-green-400/20",
  finished: "text-gray-400   bg-gray-400/10   border-gray-400/20",
};
const STATUS_LABEL: Record<string, string> = {
  pending: "Aguardando", active: "Em andamento", finished: "Finalizada",
};
const BRACKET_LABEL: Record<string, string> = {
  single_elimination: "Elim. Simples", double_elimination: "Elim. Dupla",
  round_robin: "Round Robin", swiss: "Swiss", gauntlet: "Gauntlet",
};
const emptyForm = { name: "", bracket_type: "single_elimination", best_of: 3, stage_order: 1, slots: "" };

export default function OrganizerFasesPage() {
  const params = useParams();
  const id = params.id as string;
  const [stages, setStages]     = useState<Stage[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ ...emptyForm });
  const [editId, setEditId]     = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchStages = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/tournaments/${id}/stages`);
    const json = await res.json();
    if (res.ok) setStages(json.stages ?? []);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchStages(); }, [fetchStages]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
  }

  function openCreate() {
    const nextOrder = stages.length > 0 ? Math.max(...stages.map(s => s.stage_order)) + 1 : 1;
    setForm({ ...emptyForm, stage_order: nextOrder });
    setEditId(null); setShowForm(true); setError(""); setSuccess("");
  }

  function openEdit(stage: Stage) {
    setForm({ name: stage.name, bracket_type: stage.bracket_type, best_of: stage.best_of,
      stage_order: stage.stage_order, slots: stage.slots?.toString() ?? "" });
    setEditId(stage.id); setShowForm(true); setError(""); setSuccess("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError(""); setSuccess("");
    const payload = { name: form.name, bracket_type: form.bracket_type,
      best_of: Number(form.best_of), stage_order: Number(form.stage_order),
      slots: form.slots ? Number(form.slots) : null };
    const res = editId
      ? await fetch(`/api/admin/tournaments/${id}/stages`, { method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editId, ...payload }) })
      : await fetch(`/api/admin/tournaments/${id}/stages`, { method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload) });
    const json = await res.json();
    if (!res.ok || json.error) { setError(json.error ?? "Erro ao salvar fase"); }
    else { setSuccess(editId ? "Fase atualizada!" : "Fase criada!"); setShowForm(false); setEditId(null); fetchStages(); }
    setSaving(false);
  }

  async function handleDelete(stageId: string) {
    if (!confirm("Deletar esta fase? As partidas vinculadas também serão removidas.")) return;
    setDeleting(stageId);
    const res = await fetch(`/api/admin/tournaments/${id}/stages?stageId=${stageId}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok || json.error) { setError(json.error ?? "Erro ao deletar fase"); }
    else { setSuccess("Fase removida."); fetchStages(); }
    setDeleting(null);
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link href={`/organizer/torneios/${id}`} className="text-gray-400 hover:text-white text-sm">
            ← Voltar ao torneio
          </Link>
          <h1 className="text-2xl font-bold text-white mt-1">Fases do Torneio</h1>
          <p className="text-gray-400 text-sm mt-0.5">Configure as etapas da competição — grupos, mata-mata, gauntlet, etc.</p>
        </div>
        {!showForm && (
          <button onClick={openCreate} className="btn-gold px-4 py-2 text-sm">+ Nova Fase</button>
        )}
      </div>

      {error   && <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 text-sm">❌ {error}</div>}
      {success && <div className="bg-green-500/10 border border-green-500/30 text-green-400 rounded-lg p-3 text-sm">✅ {success}</div>}

      {showForm && (
        <div className="card-lol">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">{editId ? "Editar Fase" : "Nova Fase"}</h2>
            <button onClick={() => { setShowForm(false); setEditId(null); }} className="text-gray-400 hover:text-white text-sm">✕ Cancelar</button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-gray-400 text-sm block mb-1">Nome da fase *</label>
                <input name="name" value={form.name} onChange={handleChange} placeholder="Ex: Fase de Grupos, Semifinal" className="input-lol w-full" required />
              </div>
              <div>
                <label className="text-gray-400 text-sm block mb-1">Formato do bracket</label>
                <select name="bracket_type" value={form.bracket_type} onChange={handleChange} className="input-lol w-full bg-[#0A1428]">
                  {BRACKET_TYPES.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-gray-400 text-sm block mb-1">Melhor de (BO)</label>
                <select name="best_of" value={form.best_of} onChange={handleChange} className="input-lol w-full bg-[#0A1428]">
                  {BEST_OF_OPTIONS.map(n => <option key={n} value={n}>BO{n}</option>)}
                </select>
              </div>
              <div>
                <label className="text-gray-400 text-sm block mb-1">Ordem</label>
                <input name="stage_order" type="number" min={1} value={form.stage_order} onChange={handleChange} className="input-lol w-full" />
              </div>
              <div>
                <label className="text-gray-400 text-sm block mb-1">Vagas <span className="text-gray-600 text-xs">(opcional)</span></label>
                <input name="slots" type="number" min={2} value={form.slots} onChange={handleChange} placeholder="8" className="input-lol w-full" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={saving} className="btn-gold px-6 py-2 text-sm">
                {saving ? "Salvando..." : editId ? "Salvar alterações" : "Criar fase"}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditId(null); }}
                className="px-6 py-2 text-sm text-gray-400 hover:text-white border border-[#1E3A5F] rounded transition-colors">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[1,2].map(i => (
          <div key={i} className="bg-[#0D1B2E] border border-[#1E3A5F] rounded-lg p-4 animate-pulse">
            <div className="h-4 bg-[#1E3A5F] rounded w-1/3 mb-2" /><div className="h-3 bg-[#1E3A5F] rounded w-1/2" />
          </div>
        ))}</div>
      ) : stages.length === 0 ? (
        <div className="card-lol text-center py-12">
          <p className="text-4xl mb-3">🏗️</p>
          <p className="text-white font-semibold mb-1">Nenhuma fase configurada</p>
          <p className="text-gray-400 text-sm mb-4">Crie as etapas do seu torneio — grupos, playoff, grande final.</p>
          <button onClick={openCreate} className="btn-gold px-4 py-2 text-sm">+ Criar primeira fase</button>
        </div>
      ) : (
        <div className="space-y-3">
          {stages.sort((a, b) => a.stage_order - b.stage_order).map((stage) => (
            <div key={stage.id} className="bg-[#0D1B2E] border border-[#1E3A5F] rounded-lg p-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-[#C8A84B]/20 border border-[#C8A84B]/40 flex items-center justify-center text-[#C8A84B] font-bold text-sm">
                  {stage.stage_order}
                </div>
                <div>
                  <p className="text-white font-semibold">{stage.name}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-gray-400 text-xs">{BRACKET_LABEL[stage.bracket_type] ?? stage.bracket_type}</span>
                    <span className="text-gray-600 text-xs">·</span>
                    <span className="text-gray-400 text-xs">BO{stage.best_of}</span>
                    {stage.slots && (<><span className="text-gray-600 text-xs">·</span><span className="text-gray-400 text-xs">{stage.slots} vagas</span></>)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded border ${STATUS_COLOR[stage.status] ?? "text-gray-400 bg-gray-400/10 border-gray-400/20"}`}>
                  {STATUS_LABEL[stage.status] ?? stage.status}
                </span>
                <button onClick={() => openEdit(stage)} className="text-xs text-[#C8A84B] hover:underline px-2 py-1">Editar</button>
                <button onClick={() => handleDelete(stage.id)} disabled={deleting === stage.id}
                  className="text-xs text-red-400 hover:text-red-300 hover:underline px-2 py-1 disabled:opacity-50">
                  {deleting === stage.id ? "Removendo..." : "Deletar"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
