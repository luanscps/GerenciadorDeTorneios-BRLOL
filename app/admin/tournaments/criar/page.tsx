"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CriarTorneioPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    format: "single_elimination",
    game_mode: "NORMAL_5x5_DRAFT",
    max_teams: "16",
    prize_pool: "",
    start_date: "",
    status: "DRAFT",
  });

  function handle(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm(p => ({
      ...p,
      [name]: value,
      // auto-gera slug a partir do nome
      ...(name === "name" && !form.slug
        ? { slug: value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") }
        : {}),
    }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/admin/torneios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        slug: form.slug,
        description: form.description || null,
        format: form.format,
        game_mode: form.game_mode,
        max_teams: parseInt(form.max_teams),
        prize_pool: form.prize_pool || null,
        start_date: form.start_date || null,
        status: form.status,
      }),
    });

    const json = await res.json();
    if (!res.ok || json.error) {
      setError(json.error ?? "Erro ao criar torneio");
      setLoading(false);
      return;
    }
    router.push("/admin/tournaments");
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">🏆</span>
        <h1 className="text-2xl font-bold text-white">Criar Torneio</h1>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 mb-4 text-sm">
          ❌ {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="card-lol space-y-5">
        <div>
          <label className="text-gray-400 text-sm block mb-1">Nome do torneio *</label>
          <input
            name="name" value={form.name} onChange={handle}
            placeholder="Ex: LOL Cup Maio 2026"
            className="input-lol" required
          />
        </div>

        <div>
          <label className="text-gray-400 text-sm block mb-1">
            Slug (URL) <span className="text-gray-600 text-xs">— apenas letras, números e hífen</span>
          </label>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-sm">/torneios/</span>
            <input
              name="slug" value={form.slug} onChange={handle}
              placeholder="lol-cup-maio-2026"
              className="input-lol flex-1"
              pattern="[a-z0-9-]+"
              required
            />
          </div>
        </div>

        <div>
          <label className="text-gray-400 text-sm block mb-1">Descrição (opcional)</label>
          <textarea
            name="description" value={form.description} onChange={handle}
            rows={3}
            placeholder="Descreva o torneio..."
            className="input-lol resize-none w-full"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-gray-400 text-sm block mb-1">Modo de jogo</label>
            <select name="game_mode" value={form.game_mode} onChange={handle} className="input-lol bg-[#0A1428]">
              <option value="NORMAL_5x5_DRAFT">Normal Draft 5v5</option>
              <option value="RANKED_SOLO_5x5">Ranqueada Solo</option>
              <option value="RANKED_FLEX_SR">Ranqueada Flex</option>
              <option value="ARAM">ARAM</option>
            </select>
          </div>
          <div>
            <label className="text-gray-400 text-sm block mb-1">Formato do bracket</label>
            <select name="format" value={form.format} onChange={handle} className="input-lol bg-[#0A1428]">
              <option value="single_elimination">Eliminação Simples</option>
              <option value="double_elimination">Eliminação Dupla</option>
              <option value="round_robin">Fase de Grupos</option>
              <option value="swiss">Swiss</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-gray-400 text-sm block mb-1">Máx. de times</label>
            <select name="max_teams" value={form.max_teams} onChange={handle} className="input-lol bg-[#0A1428]">
              {[4, 8, 16, 32, 64].map(n => (
                <option key={n} value={n}>{n} times</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-gray-400 text-sm block mb-1">Status inicial</label>
            <select name="status" value={form.status} onChange={handle} className="input-lol bg-[#0A1428]">
              <option value="DRAFT">Rascunho</option>
              <option value="OPEN">Aberto para inscrição</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-gray-400 text-sm block mb-1">Data de início</label>
            <input
              name="start_date" type="datetime-local"
              value={form.start_date} onChange={handle}
              className="input-lol"
            />
          </div>
          <div>
            <label className="text-gray-400 text-sm block mb-1">Premiação (opcional)</label>
            <input
              name="prize_pool" value={form.prize_pool} onChange={handle}
              placeholder="Ex: R$ 500"
              className="input-lol"
            />
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn-gold w-full py-3 text-base">
          {loading ? "Criando torneio..." : "🏆 Criar Torneio"}
        </button>
      </form>
    </div>
  );
}
