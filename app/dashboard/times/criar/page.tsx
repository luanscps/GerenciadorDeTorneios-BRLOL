"use client";
import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface RiotAccount {
  id: string;
  game_name: string;
  tag_line: string;
  summoner_level: number;
  profile_icon_id: number;
}

interface PlayerSlot {
  puuid: string;
  gameName: string;
  tagLine: string;
  tier: string;
  rank: string;
  lp: number;
  profileIconId: number | null;
  role: "TOP" | "JUNGLE" | "MID" | "ADC" | "SUPPORT";
}

const ROLES: Array<"TOP" | "JUNGLE" | "MID" | "ADC" | "SUPPORT"> = [
  "TOP", "JUNGLE", "MID", "ADC", "SUPPORT",
];

const ROLE_LABELS: Record<string, string> = {
  TOP: "Top", JUNGLE: "Jungle", MID: "Mid", ADC: "ADC", SUPPORT: "Suporte",
};

const ROLE_ICONS: Record<string, string> = {
  TOP: "🛡️", JUNGLE: "🌿", MID: "⚡", ADC: "🏹", SUPPORT: "💊",
};

const TIER_COLORS: Record<string, string> = {
  IRON: "#8B8B8B", BRONZE: "#CD7F32", SILVER: "#A8A9AD",
  GOLD: "#C8A84B", PLATINUM: "#00B2A9", EMERALD: "#2AC56F",
  DIAMOND: "#576BCE", MASTER: "#9D48E0", GRANDMASTER: "#CD4545",
  CHALLENGER: "#F4C874", UNRANKED: "#4B5563",
};

const DDRAGON = "14.24.1";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function CriarTimeForm() {
  const [nome, setNome]           = useState("");
  const [tag, setTag]             = useState("");
  const [description, setDesc]    = useState("");
  const [logoUrl, setLogoUrl]     = useState("");
  const [players, setPlayers]     = useState<PlayerSlot[]>([]);
  const [searchQuery, setSearch]  = useState("");
  const [searchResult, setResult] = useState<Omit<PlayerSlot, "role"> | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [addRole, setAddRole]     = useState<"TOP" | "JUNGLE" | "MID" | "ADC" | "SUPPORT">("TOP");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [checking, setChecking]   = useState(true);
  const [account, setAccount]     = useState<RiotAccount | null>(null);

  const router       = useRouter();
  const searchParams = useSearchParams();
  const supabase     = useMemo(() => createClient(), []);
  const tournamentId = searchParams.get("tournament") ?? null;

  useEffect(() => {
    async function checkAccount() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: acct } = await supabase
        .from("riot_accounts")
        .select("id, game_name, tag_line, summoner_level, profile_icon_id")
        .eq("profile_id", user.id)
        .eq("is_primary", true)
        .single();

      setAccount(acct ?? null);
      setChecking(false);
    }
    checkAccount();
  }, [supabase, router]);

  // ── Busca por Riot ID ───────────────────────────────────────────────────
  async function handleSearch() {
    const q = searchQuery.trim();
    const hashIdx = q.lastIndexOf("#");
    if (hashIdx <= 0 || hashIdx === q.length - 1) {
      setSearchError("Use o formato: NomeIngame#TAG  (ex: renektonforever#019)");
      return;
    }
    const gameName = q.slice(0, hashIdx);
    const tagLine  = q.slice(hashIdx + 1);

    setSearching(true);
    setSearchError("");
    setResult(null);

    try {
      const res  = await fetch(
        `/api/riot/player?gameName=${encodeURIComponent(gameName)}&tagLine=${encodeURIComponent(tagLine)}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Jogador não encontrado");
      setResult(data);
    } catch (e: any) {
      setSearchError(e.message);
    } finally {
      setSearching(false);
    }
  }

  function addPlayer() {
    if (!searchResult) return;
    if (players.some(p => p.puuid === searchResult.puuid)) {
      setSearchError("Este jogador já foi adicionado.");
      return;
    }
    if (players.filter(p => p.role === addRole).length > 0) {
      setSearchError(`A role ${ROLE_LABELS[addRole]} já está preenchida.`);
      return;
    }
    if (players.length >= 5) {
      setSearchError("O time já tem 5 jogadores.");
      return;
    }
    setPlayers(prev => [...prev, { ...searchResult, role: addRole }]);
    setResult(null);
    setSearch("");
    setSearchError("");
  }

  function removePlayer(puuid: string) {
    setPlayers(prev => prev.filter(p => p.puuid !== puuid));
  }

  // ── Submit ──────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!account) return;
    setLoading(true);
    setError("");

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) { router.push("/login"); return; }

      const slug = generateSlug(nome.trim());

      // Verifica se já existe time com esse slug
      const { data: existing } = await supabase
        .from("teams")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

      const finalSlug = existing ? `${slug}-${Date.now()}` : slug;

      // Cria o time (tournament_id é opcional agora)
      const insertPayload: Record<string, unknown> = {
        name:        nome.trim(),
        tag:         tag.trim().toUpperCase(),
        owner_id:    user.id,
        slug:        finalSlug,
        description: description.trim() || null,
        logo_url:    logoUrl.trim() || null,
        is_active:   true,
      };
      if (tournamentId) insertPayload.tournament_id = tournamentId;

      const { data: team, error: teamError } = await supabase
        .from("teams")
        .insert(insertPayload)
        .select()
        .single();

      if (teamError) throw new Error(teamError.message);

      // Adiciona capitão como player
      const captainInsert = {
        team_id:        team.id,
        summoner_name:  account.game_name,
        tag_line:       account.tag_line,
        tier:           "UNRANKED",
        rank:           "",
        lp:             0,
        wins:           0,
        losses:         0,
        role:           players.length > 0 ? null : "TOP",
        profile_icon:   account.profile_icon_id,
        summoner_level: account.summoner_level,
      };
      await supabase.from("players").insert(captainInsert);

      // Adiciona jogadores buscados
      if (players.length > 0) {
        const playersToInsert = players.map(p => ({
          team_id:      team.id,
          summoner_name: p.gameName,
          tag_line:     p.tagLine,
          puuid:        p.puuid,
          role:         p.role,
          tier:         p.tier ?? "UNRANKED",
          rank:         p.rank ?? "",
          lp:           p.lp ?? 0,
          profile_icon: p.profileIconId,
        }));
        const { error: playersError } = await supabase.from("players").insert(playersToInsert);
        if (playersError) console.warn("Aviso ao inserir jogadores:", playersError.message);
      }

      // Se tem torneio, inscreve o time
      if (tournamentId) {
        await supabase.from("inscricoes").insert({
          tournament_id: tournamentId,
          team_id:       team.id,
          requested_by:  user.id,
          status:        "PENDING",
        });
        router.push(`/torneios/${tournamentId}?inscrito=true`);
      } else {
        router.push(`/times/${finalSlug}`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao criar time");
    } finally {
      setLoading(false);
    }
  }

  // ── Loading / Sem conta ────────────────────────────────────────────────
  if (checking) {
    return (
      <div className="max-w-2xl mx-auto card-lol py-16 text-center">
        <p className="text-gray-400 animate-pulse">Verificando conta...</p>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="max-w-2xl mx-auto card-lol text-center py-12 space-y-4">
        <p className="text-4xl">⚠️</p>
        <h2 className="text-white font-bold text-lg">Conta Riot necessária</h2>
        <p className="text-gray-400 text-sm">
          Para criar um time você precisa primeiro vincular sua conta Riot.
        </p>
        <a href="/dashboard/jogador/registrar" className="btn-gold inline-block px-6 py-2">
          Vincular Conta Riot
        </a>
      </div>
    );
  }

  const takenRoles = new Set(players.map(p => p.role));

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-bold text-white">🛡️ Criar Time</h1>
        <p className="text-gray-500 text-sm mt-1">
          {tournamentId
            ? "O time será inscrito automaticamente no torneio selecionado."
            : "Criando time global — você pode inscrever em torneios depois."}
        </p>
      </div>

      {/* Banner de torneio (opcional) */}
      {tournamentId && (
        <div className="bg-[#C8A84B]/10 border border-[#C8A84B]/30 rounded-lg p-3">
          <p className="text-[#C8A84B] text-sm">🏆 Inscrição no torneio será feita ao criar.</p>
        </div>
      )}

      {/* Conta vinculada */}
      <div className="card-lol flex items-center gap-3">
        {account.profile_icon_id ? (
          <img
            src={`https://ddragon.leagueoflegends.com/cdn/${DDRAGON}/img/profileicon/${account.profile_icon_id}.png`}
            alt="ícone" width={40} height={40}
            className="rounded-full border border-[#1E3A5F]"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-[#0A1428] border border-[#1E3A5F] flex items-center justify-center">👤</div>
        )}
        <div>
          <p className="text-white font-medium text-sm">
            {account.game_name}
            <span className="text-gray-500">#{account.tag_line}</span>
          </p>
          <p className="text-gray-500 text-xs">Nível {account.summoner_level} · Capitão do time ✅</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ── Dados do Time ── */}
        <div className="card-lol space-y-4">
          <h2 className="text-[#C8A84B] font-semibold text-sm uppercase tracking-widest">Dados do Time</h2>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-gray-400 text-sm mb-1">
                Nome do Time <span className="text-red-400">*</span>
              </label>
              <input
                value={nome}
                onChange={e => setNome(e.target.value)}
                placeholder="Ex: Team Fúria BR"
                className="input-lol w-full"
                maxLength={32}
                required
              />
              <p className="text-gray-600 text-xs mt-1">{nome.length}/32</p>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="block text-gray-400 text-sm mb-1">
                TAG <span className="text-red-400">*</span>
              </label>
              <input
                value={tag}
                onChange={e => setTag(e.target.value.toUpperCase())}
                placeholder="Ex: FURA"
                className="input-lol w-full"
                maxLength={5} minLength={2}
                required
              />
              <p className="text-gray-600 text-xs mt-1">2–5 letras · exibida como [TAG]</p>
            </div>
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1">URL do Logotipo</label>
            <input
              value={logoUrl}
              onChange={e => setLogoUrl(e.target.value)}
              placeholder="https://exemplo.com/logo.png"
              className="input-lol w-full"
              type="url"
            />
            {logoUrl && (
              <div className="mt-2 flex items-center gap-3">
                <img
                  src={logoUrl}
                  alt="logo preview"
                  width={48} height={48}
                  className="rounded-lg border border-[#1E3A5F] object-cover w-12 h-12"
                  onError={e => (e.currentTarget.style.display = "none")}
                />
                <span className="text-gray-500 text-xs">Preview do logotipo</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1">Descrição (opcional)</label>
            <textarea
              value={description}
              onChange={e => setDesc(e.target.value)}
              placeholder="Descreva o time, história, objetivos..."
              className="input-lol w-full resize-none"
              rows={2}
              maxLength={280}
            />
            <p className="text-gray-600 text-xs mt-1">{description.length}/280</p>
          </div>
        </div>

        {/* ── Jogadores ── */}
        <div className="card-lol space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[#C8A84B] font-semibold text-sm uppercase tracking-widest">Roster</h2>
            <span className="text-gray-600 text-xs">{players.length}/5 jogadores adicionados</span>
          </div>

          {/* Busca por Riot ID */}
          {players.length < 5 && (
            <div className="space-y-3">
              <label className="block text-gray-400 text-sm">Adicionar jogador por Riot ID</label>
              <div className="flex gap-2">
                <input
                  value={searchQuery}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && (e.preventDefault(), handleSearch())}
                  placeholder="renektonforever#019"
                  className="flex-1 input-lol"
                />
                <button
                  type="button"
                  onClick={handleSearch}
                  disabled={searching || !searchQuery.trim()}
                  className="bg-[#1E3A5F] hover:bg-[#2a4f7a] disabled:opacity-40 text-white text-sm
                             font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  {searching ? (
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : "Buscar"}
                </button>
              </div>

              {searchError && <p className="text-red-400 text-xs">⚠️ {searchError}</p>}

              {/* Resultado da busca */}
              {searchResult && (
                <div className="bg-[#0A1428] border border-[#1E3A5F] rounded-xl p-3 space-y-3">
                  <div className="flex items-center gap-3">
                    {searchResult.profileIconId ? (
                      <img
                        src={`https://ddragon.leagueoflegends.com/cdn/${DDRAGON}/img/profileicon/${searchResult.profileIconId}.png`}
                        alt="ícone" width={40} height={40}
                        className="rounded-full border border-[#1E3A5F]"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#0D1B2E] border border-[#1E3A5F] flex items-center justify-center">👤</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-semibold truncate">
                        {searchResult.gameName}
                        <span className="text-gray-500 font-normal">#{searchResult.tagLine}</span>
                      </p>
                      <p className="text-xs" style={{ color: TIER_COLORS[searchResult.tier] ?? TIER_COLORS.UNRANKED }}>
                        {searchResult.tier === "UNRANKED" ? "Sem rank" : `${searchResult.tier} ${searchResult.rank} · ${searchResult.lp} LP`}
                      </p>
                    </div>
                  </div>

                  {/* Seleção de role */}
                  <div>
                    <p className="text-gray-500 text-xs mb-2">Selecione a role deste jogador:</p>
                    <div className="flex gap-2 flex-wrap">
                      {ROLES.map(r => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setAddRole(r)}
                          disabled={takenRoles.has(r)}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            addRole === r
                              ? "bg-[#C8A84B] text-black"
                              : takenRoles.has(r)
                              ? "bg-[#0D1B2E] text-gray-700 cursor-not-allowed"
                              : "bg-[#0D1B2E] text-gray-400 hover:text-white border border-[#1E3A5F]"
                          }`}
                        >
                          <span>{ROLE_ICONS[r]}</span>
                          <span>{ROLE_LABELS[r]}</span>
                          {takenRoles.has(r) && <span className="ml-1">✓</span>}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={addPlayer}
                    className="w-full bg-[#C8A84B] hover:bg-[#d4b55a] text-black font-bold text-sm py-2 rounded-lg transition-colors"
                  >
                    + Adicionar ao Roster
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Lista do roster atual */}
          {players.length > 0 && (
            <div className="space-y-2">
              <div className="border-t border-[#1E3A5F] pt-3">
                {players.map(p => (
                  <div key={p.puuid} className="flex items-center gap-3 py-2 border-b border-[#1E3A5F]/50 last:border-0">
                    <span className="text-lg w-6 text-center">{ROLE_ICONS[p.role]}</span>
                    {p.profileIconId ? (
                      <img
                        src={`https://ddragon.leagueoflegends.com/cdn/${DDRAGON}/img/profileicon/${p.profileIconId}.png`}
                        alt="ícone" width={32} height={32}
                        className="rounded-full border border-[#1E3A5F] w-8 h-8"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[#0D1B2E] border border-[#1E3A5F] flex items-center justify-center text-sm">👤</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">
                        {p.gameName}<span className="text-gray-600">#{p.tagLine}</span>
                      </p>
                      <p className="text-xs" style={{ color: TIER_COLORS[p.tier] ?? TIER_COLORS.UNRANKED }}>
                        {p.tier === "UNRANKED" ? "Sem rank" : `${p.tier} ${p.rank}`}
                      </p>
                    </div>
                    <span className="text-gray-600 text-xs">{ROLE_LABELS[p.role]}</span>
                    <button
                      type="button"
                      onClick={() => removePlayer(p.puuid)}
                      className="text-gray-700 hover:text-red-400 transition-colors text-lg leading-none"
                      aria-label="Remover jogador"
                    >×</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Slots vazios */}
          {ROLES.filter(r => !takenRoles.has(r)).length > 0 && (
            <div className="space-y-1">
              <p className="text-gray-700 text-xs">Vagas em aberto:</p>
              <div className="flex gap-2 flex-wrap">
                {ROLES.filter(r => !takenRoles.has(r)).map(r => (
                  <span key={r} className="flex items-center gap-1 px-2 py-1 bg-[#0A1428] border border-dashed border-[#1E3A5F] rounded-lg text-gray-700 text-xs">
                    {ROLE_ICONS[r]} {ROLE_LABELS[r]}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Erro global */}
        {error && (
          <div className="bg-red-900/30 border border-red-500/40 rounded-lg p-3">
            <p className="text-red-400 text-sm">⚠️ {error}</p>
          </div>
        )}

        {/* Botões */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="btn-outline-gold flex-1 py-3"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading || !nome.trim() || tag.trim().length < 2}
            className="btn-gold flex-1 py-3"
          >
            {loading ? "Criando..." : tournamentId ? "Criar e Inscrever Time" : "Criar Time"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function CriarTimePage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-2xl mx-auto card-lol py-16 text-center">
          <p className="text-gray-400 animate-pulse">Carregando...</p>
        </div>
      }
    >
      <CriarTimeForm />
    </Suspense>
  );
}
