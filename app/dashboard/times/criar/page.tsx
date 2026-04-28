"use client";
import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface RiotAccount {
  id: string;
  puuid: string;
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
  wins: number;
  losses: number;
  profileIconId: number | null;
  summonerLevel: number | null;
  lane: "TOP" | "JUNGLE" | "MID" | "ADC" | "SUPPORT";
  existingRiotAccountId: string | null;
  existingProfileId: string | null;
}

const ROLES: Array<"TOP" | "JUNGLE" | "MID" | "ADC" | "SUPPORT"> = [
  "TOP", "JUNGLE", "MID", "ADC", "SUPPORT",
];

const ROLE_LABELS: Record<string, string> = {
  TOP: "Top", JUNGLE: "Jungle", MID: "Mid", ADC: "ADC", SUPPORT: "Suporte",
};

const ROLE_ICON_URL: Record<string, string> = {
  TOP:     "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-champ-select/global/default/svg/position-top.svg",
  JUNGLE:  "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-champ-select/global/default/svg/position-jungle.svg",
  MID:     "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-champ-select/global/default/svg/position-middle.svg",
  ADC:     "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-champ-select/global/default/svg/position-bottom.svg",
  SUPPORT: "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-champ-select/global/default/svg/position-utility.svg",
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
  const [nome, setNome] = useState("");
  const [tag, setTag] = useState("");
  const [description, setDesc] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [players, setPlayers] = useState<PlayerSlot[]>([]);
  const [searchQuery, setSearch] = useState("");
  const [searchResult, setResult] = useState<Omit<PlayerSlot, "lane"> | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [addLane, setAddLane] = useState<"TOP" | "JUNGLE" | "MID" | "ADC" | "SUPPORT">("TOP");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);
  const [account, setAccount] = useState<RiotAccount | null>(null);
  const [captainLane, setCaptainLane] = useState<"TOP" | "JUNGLE" | "MID" | "ADC" | "SUPPORT">("TOP");

  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const tournamentId = searchParams.get("tournament") ?? null;

  useEffect(() => {
    async function checkAccount() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: acct } = await supabase
        .from("riot_accounts")
        .select("id, puuid, game_name, tag_line, summoner_level, profile_icon_id")
        .eq("profile_id", user.id)
        .eq("is_primary", true)
        .single();

      setAccount(acct ?? null);
      setChecking(false);
    }
    checkAccount();
  }, [supabase, router]);

  async function handleSearch() {
    const q = searchQuery.trim();
    const hashIdx = q.lastIndexOf("#");
    if (hashIdx <= 0 || hashIdx === q.length - 1) {
      setSearchError("Use o formato: NomeIngame#TAG  (ex: renektonforever#019)");
      return;
    }

    const gameName = q.slice(0, hashIdx);
    const tagLine = q.slice(hashIdx + 1);

    setSearching(true);
    setSearchError("");
    setResult(null);

    try {
      const res = await fetch(
        `/api/riot/player?gameName=${encodeURIComponent(gameName)}&tagLine=${encodeURIComponent(tagLine)}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Jogador não encontrado");

      const { data: existingAcct } = await supabase
        .from("riot_accounts")
        .select("id, profile_id")
        .eq("puuid", data.puuid)
        .maybeSingle();

      setResult({
        puuid: data.puuid,
        gameName: data.gameName,
        tagLine: data.tagLine,
        tier: data.tier ?? "UNRANKED",
        rank: data.rank ?? "",
        lp: data.lp ?? 0,
        wins: data.wins ?? 0,
        losses: data.losses ?? 0,
        profileIconId: data.profileIconId ?? null,
        summonerLevel: data.summonerLevel ?? null,
        existingRiotAccountId: existingAcct?.id ?? null,
        existingProfileId: existingAcct?.profile_id ?? null,
      });
    } catch (e: any) {
      setSearchError(e.message);
    } finally {
      setSearching(false);
    }
  }

  function addPlayer() {
    if (!searchResult) return;
    if (players.some((p) => p.puuid === searchResult.puuid)) {
      setSearchError("Este jogador já foi adicionado.");
      return;
    }

    const takenLanes = new Set([...players.map((p) => p.lane), captainLane]);
    if (takenLanes.has(addLane)) {
      setSearchError(`A lane ${ROLE_LABELS[addLane]} já está preenchida.`);
      return;
    }

    if (players.length >= 4) {
      setSearchError("O time já tem os 4 jogadores adicionais (você é o capitão, 5/5).");
      return;
    }

    setPlayers((prev) => [...prev, { ...searchResult, lane: addLane }]);
    setResult(null);
    setSearch("");
    setSearchError("");
  }

  function removePlayer(puuid: string) {
    setPlayers((prev) => prev.filter((p) => p.puuid !== puuid));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!account) return;
    setLoading(true);
    setError("");

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        router.push("/login");
        return;
      }

      const normalizedTag = tag.trim().toUpperCase();
      const slugBase = generateSlug(nome.trim());

      const { data: existingByTag } = await supabase
        .from("teams")
        .select("id, name, slug")
        .eq("tag", normalizedTag)
        .maybeSingle();

      if (existingByTag) {
        throw new Error(`Já existe um time com a tag [${normalizedTag}] (${existingByTag.name}). Escolha outra tag.`);
      }

      const { data: existingBySlug } = await supabase
        .from("teams")
        .select("id")
        .eq("slug", slugBase)
        .maybeSingle();

      const finalSlug = existingBySlug ? `${slugBase}-${Date.now()}` : slugBase;

      const insertPayload: Record<string, unknown> = {
        name: nome.trim(),
        tag: normalizedTag,
        owner_id: user.id,
        slug: finalSlug,
        description: description.trim() || null,
        logo_url: logoUrl.trim() || null,
        is_active: true,
      };
      if (tournamentId) insertPayload.tournament_id = tournamentId;

      const { data: team, error: teamError } = await supabase
        .from("teams")
        .insert(insertPayload)
        .select()
        .single();

      if (teamError) throw new Error(teamError.message);

      const memberRows = [
        {
          team_id: team.id,
          profile_id: user.id,
          riot_account_id: account.id,
          team_role: "captain",
          status: "accepted",
          lane: captainLane,
          invited_by: user.id,
        },
        ...players
          .filter((p) => p.existingProfileId && p.existingRiotAccountId)
          .map((p) => ({
            team_id: team.id,
            profile_id: p.existingProfileId as string,
            riot_account_id: p.existingRiotAccountId as string,
            team_role: "member",
            status: "accepted",
            lane: p.lane,
            invited_by: user.id,
          })),
      ];

      const { error: membersError } = await supabase
        .from("team_members")
        .insert(memberRows);

      if (membersError) throw new Error("Erro ao inserir membros do time: " + membersError.message);

      if (tournamentId) {
        await supabase.from("inscricoes").insert({
          tournament_id: tournamentId,
          team_id: team.id,
          requested_by: user.id,
          status: "PENDING",
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

  const takenLanes = new Set([...players.map((p) => p.lane), captainLane]);

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

      {tournamentId && (
        <div className="bg-[#C8A84B]/10 border border-[#C8A84B]/30 rounded-lg p-3">
          <p className="text-[#C8A84B] text-sm">🏆 Inscrição no torneio será feita ao criar.</p>
        </div>
      )}

      <div className="card-lol space-y-3">
        <p className="text-[#C8A84B] font-semibold text-xs uppercase tracking-widest">Capitão (você)</p>
        <div className="flex items-center gap-3">
          {account.profile_icon_id ? (
            <img
              src={`https://ddragon.leagueoflegends.com/cdn/${DDRAGON}/img/profileicon/${account.profile_icon_id}.png`}
              alt="ícone" width={40} height={40}
              className="rounded-full border border-[#1E3A5F]"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#0A1428] border border-[#1E3A5F] flex items-center justify-center">👤</div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium text-sm">
              {account.game_name}
              <span className="text-gray-500">#{account.tag_line}</span>
            </p>
            <p className="text-gray-500 text-xs">Nível {account.summoner_level} · Capitão ✅</p>
          </div>
        </div>
        <div>
          <p className="text-gray-500 text-xs mb-2">Sua lane no time:</p>
          <div className="flex gap-2 flex-wrap">
            {ROLES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setCaptainLane(r)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  captainLane === r
                    ? "bg-[#C8A84B] text-black"
                    : "bg-[#0D1B2E] text-gray-400 hover:text-white border border-[#1E3A5F]"
                }`}
              >
                <img
                  src={ROLE_ICON_URL[r]} alt={r} width={14} height={14}
                  className="w-3.5 h-3.5"
                  style={{ filter: captainLane === r ? "none" : "invert(1) sepia(1) saturate(1.2)" }}
                />
                {ROLE_LABELS[r]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="card-lol space-y-4">
          <h2 className="text-[#C8A84B] font-semibold text-sm uppercase tracking-widest">Dados do Time</h2>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-gray-400 text-sm mb-1">
                Nome do Time <span className="text-red-400">*</span>
              </label>
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
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
                onChange={(e) => setTag(e.target.value.toUpperCase())}
                placeholder="Ex: FURA"
                className="input-lol w-full"
                maxLength={5}
                minLength={2}
                required
              />
              <p className="text-gray-600 text-xs mt-1">2–5 letras · exibida como [TAG]</p>
            </div>
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1">URL do Logotipo</label>
            <input
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://exemplo.com/logo.png"
              className="input-lol w-full"
              type="url"
            />
            {logoUrl && (
              <div className="mt-2 flex items-center gap-3">
                <img
                  src={logoUrl}
                  alt="logo preview"
                  width={48}
                  height={48}
                  className="rounded-lg border border-[#1E3A5F] object-cover w-12 h-12"
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
                <span className="text-gray-500 text-xs">Preview do logotipo</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1">Descrição (opcional)</label>
            <textarea
              value={description}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Descreva o time, história, objetivos..."
              className="input-lol w-full resize-none"
              rows={2}
              maxLength={280}
            />
            <p className="text-gray-600 text-xs mt-1">{description.length}/280</p>
          </div>
        </div>

        <div className="card-lol space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[#C8A84B] font-semibold text-sm uppercase tracking-widest">Roster</h2>
            <span className="text-gray-600 text-xs">
              {players.length + 1}/5 · capitão + {players.length} jogador{players.length !== 1 ? "es" : ""}
            </span>
          </div>

          {players.length < 4 && (
            <div className="space-y-3">
              <label className="block text-gray-400 text-sm">
                Adicionar jogador por Riot ID
                <span className="ml-1 text-gray-600 font-normal">(somente jogadores cadastrados no sistema entram no roster agora)</span>
              </label>
              <div className="flex gap-2">
                <input
                  value={searchQuery}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleSearch())}
                  placeholder="renektonforever#019"
                  className="flex-1 input-lol"
                />
                <button
                  type="button"
                  onClick={handleSearch}
                  disabled={searching || !searchQuery.trim()}
                  className="bg-[#1E3A5F] hover:bg-[#2a4f7a] disabled:opacity-40 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  {searching ? (
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : "Buscar"}
                </button>
              </div>

              {searchError && <p className="text-red-400 text-xs">⚠️ {searchError}</p>}

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
                      <div className="flex items-center gap-2">
                        <p className="text-white text-sm font-semibold truncate">
                          {searchResult.gameName}
                          <span className="text-gray-500 font-normal">#{searchResult.tagLine}</span>
                        </p>
                        {searchResult.existingRiotAccountId && searchResult.existingProfileId ? (
                          <span className="text-[10px] bg-emerald-900/40 text-emerald-400 border border-emerald-700/40 px-1.5 py-0.5 rounded font-bold">
                            ✓ No sistema
                          </span>
                        ) : (
                          <span className="text-[10px] bg-red-900/30 text-red-400 border border-red-700/30 px-1.5 py-0.5 rounded font-bold">
                            Não pode adicionar agora
                          </span>
                        )}
                      </div>
                      <p className="text-xs" style={{ color: TIER_COLORS[searchResult.tier] ?? TIER_COLORS.UNRANKED }}>
                        {searchResult.tier === "UNRANKED" ? "Sem rank" : `${searchResult.tier} ${searchResult.rank} · ${searchResult.lp} LP`}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-gray-500 text-xs mb-2">Lane deste jogador:</p>
                    <div className="flex gap-2 flex-wrap">
                      {ROLES.map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setAddLane(r)}
                          disabled={takenLanes.has(r)}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            addLane === r
                              ? "bg-[#C8A84B] text-black"
                              : takenLanes.has(r)
                                ? "bg-[#0D1B2E] text-gray-700 cursor-not-allowed"
                                : "bg-[#0D1B2E] text-gray-400 hover:text-white border border-[#1E3A5F]"
                          }`}
                        >
                          <img
                            src={ROLE_ICON_URL[r]} alt={r} width={14} height={14}
                            className="w-3.5 h-3.5"
                            style={{ filter: addLane === r ? "none" : "invert(1) sepia(1) saturate(1.2)" }}
                          />
                          {ROLE_LABELS[r]}
                          {takenLanes.has(r) && <span className="ml-1">✓</span>}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={addPlayer}
                    disabled={!searchResult.existingRiotAccountId || !searchResult.existingProfileId}
                    className="w-full bg-[#C8A84B] hover:bg-[#d4b55a] disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-sm py-2 rounded-lg transition-colors"
                  >
                    + Adicionar ao Roster
                  </button>
                </div>
              )}
            </div>
          )}

          {players.length > 0 && (
            <div className="border-t border-[#1E3A5F] pt-3 space-y-2">
              {players.map((p) => (
                <div key={p.puuid} className="flex items-center gap-3 py-2 border-b border-[#1E3A5F]/50 last:border-0">
                  <img
                    src={ROLE_ICON_URL[p.lane]} alt={p.lane} width={16} height={16}
                    className="w-4 h-4 opacity-60 flex-shrink-0"
                    style={{ filter: "invert(1) sepia(1) saturate(1.5) hue-rotate(5deg)" }}
                  />
                  {p.profileIconId ? (
                    <img
                      src={`https://ddragon.leagueoflegends.com/cdn/${DDRAGON}/img/profileicon/${p.profileIconId}.png`}
                      alt="ícone" width={28} height={28}
                      className="rounded-full border border-[#1E3A5F] w-7 h-7 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-[#0D1B2E] border border-[#1E3A5F] flex items-center justify-center flex-shrink-0">👤</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">
                      {p.gameName}<span className="text-gray-600">#{p.tagLine}</span>
                    </p>
                    <p className="text-[10px]" style={{ color: TIER_COLORS[p.tier] ?? TIER_COLORS.UNRANKED }}>
                      {ROLE_LABELS[p.lane]} · {p.tier === "UNRANKED" ? "Sem rank" : `${p.tier} ${p.rank}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removePlayer(p.puuid)}
                    className="text-gray-600 hover:text-red-400 text-xs transition-colors p-1"
                    aria-label="Remover jogador"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-700/40 rounded-lg p-3">
            <p className="text-red-400 text-sm">⚠️ {error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !nome.trim() || tag.trim().length < 2}
          className="w-full bg-[#C8A84B] hover:bg-[#d4b55a] disabled:opacity-40 disabled:cursor-not-allowed text-black font-black text-base py-3 rounded-xl transition-colors"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <span className="inline-block w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              Criando time...
            </span>
          ) : (
            "🛡️ Criar Time"
          )}
        </button>
      </form>
    </div>
  );
}

export default function CriarTimePage() {
  return (
    <Suspense fallback={
      <div className="max-w-2xl mx-auto py-16 text-center">
        <p className="text-gray-400 animate-pulse">Carregando...</p>
      </div>
    }>
      <CriarTimeForm />
    </Suspense>
  );
}
