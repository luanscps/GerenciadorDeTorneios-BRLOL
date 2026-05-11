"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { vincularRiotAccount } from "@/lib/actions/riot-link";
import Image from "next/image";

interface SummonerResult {
  account:  { puuid: string; gameName: string; tagLine: string };
  summoner: { profileIconId: number; summonerLevel: number };
  entries:  Array<{
    queueType: string; tier: string; rank: string;
    leaguePoints: number; wins: number; losses: number;
  }>;
  masteries: Array<{
    championId: number; championName: string;
    championLevel: number; championPoints: number;
  }>;
}

const TIER_COLORS: Record<string, string> = {
  IRON: "#8B7A6B", BRONZE: "#CD7F32", SILVER: "#A8A9AD", GOLD: "#FFD700",
  PLATINUM: "#00E5CC", EMERALD: "#50C878", DIAMOND: "#99CCFF",
  MASTER: "#9B59B6", GRANDMASTER: "#E74C3C", CHALLENGER: "#00D4FF",
};

export default function RegistrarRiotPage() {
  const [riotId,    setRiotId]    = useState("");
  const [result,    setResult]    = useState<SummonerResult | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");
  const [saved,     setSaved]     = useState(false);
  const [ddVersion, setDdVersion] = useState("16.8.1");

  const router = useRouter();

  useEffect(() => {
    fetch("https://ddragon.leagueoflegends.com/api/versions.json")
      .then(r => r.json())
      .then((versions: string[]) => { if (versions?.[0]) setDdVersion(versions[0]); })
      .catch(() => {});
  }, []);

  const DD = "https://ddragon.leagueoflegends.com/cdn/" + ddVersion;

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = riotId.trim();
    if (!trimmed.includes("#")) {
      setError("Use o formato Nome#TAG (ex: SeuNome#BR1)");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res  = await fetch("/api/riot/summoner?riotId=" + encodeURIComponent(trimmed));
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao buscar jogador");
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!result) return;
    setSaving(true);
    setError("");

    try {
      const res = await vincularRiotAccount({
        puuid:         result.account.puuid,
        gameName:      result.account.gameName,
        tagLine:       result.account.tagLine,
        summonerLevel: result.summoner.summonerLevel,
        profileIconId: result.summoner.profileIconId,
        entries: result.entries.map(e => ({
          queueType: e.queueType,
          tier:      e.tier,
          rank:      e.rank,
          lp:        e.leaguePoints,
          wins:      e.wins,
          losses:    e.losses,
        })),
        masteries: result.masteries.map(m => ({
          championId:     m.championId,
          championName:   m.championName,
          championLevel:  m.championLevel,
          championPoints: m.championPoints,
        })),
      });

      if (res.error) throw new Error(res.error);

      setSaved(true);
      setTimeout(() => router.push("/dashboard"), 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">🔗 Vincular Conta Riot</h1>

      <div className="card-lol">
        <p className="text-gray-400 text-sm mb-4">
          Busque pelo seu <strong className="text-white">Riot ID</strong> no formato{" "}
          <code className="text-[#C8A84B] bg-[#0A1428] px-1 rounded">Nome#TAG</code>
        </p>
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            value={riotId}
            onChange={e => setRiotId(e.target.value)}
            placeholder="SeuNome#BR1"
            className="input-lol flex-1"
            required
          />
          <button type="submit" disabled={loading} className="btn-gold px-6 shrink-0">
            {loading ? "Buscando..." : "Buscar"}
          </button>
        </form>
        {error && (
          <div className="mt-3 bg-red-900/30 border border-red-500/40 rounded p-3">
            <p className="text-red-400 text-sm">{error}</p>
            {error.includes("expirada") && (
              <a href="https://developer.riotgames.com" target="_blank" rel="noopener noreferrer"
                className="text-yellow-400 underline text-xs mt-1 block">
                → Renovar chave em developer.riotgames.com
              </a>
            )}
          </div>
        )}
      </div>

      {result && (
        <div className="card-lol space-y-4">
          <div className="flex items-center gap-4">
            <Image
              src={DD + "/img/profileicon/" + result.summoner.profileIconId + ".png"}
              width={64} height={64} alt="Profile Icon"
              className="rounded-full border-2 border-[#C8A84B]"
            />
            <div>
              <p className="text-xl font-bold text-white">
                {result.account.gameName}
                <span className="text-gray-500">#{result.account.tagLine}</span>
              </p>
              <p className="text-gray-400 text-sm">Nível {result.summoner.summonerLevel}</p>
            </div>
          </div>

          {result.entries.length > 0 && (
            <div className="space-y-2">
              <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Rank Oficial</p>
              {result.entries.map(e => (
                <div key={e.queueType} className="flex items-center justify-between bg-[#0A1428] rounded p-3">
                  <div>
                    <p className="text-white text-sm font-medium">
                      {e.queueType === "RANKED_SOLO_5x5" ? "Solo/Duo" : "Flex"}
                    </p>
                    <p className="text-gray-400 text-xs">
                      {e.wins}V · {e.losses}D ·{" "}
                      {e.wins + e.losses > 0 ? Math.round((e.wins / (e.wins + e.losses)) * 100) : 0}% WR
                    </p>
                  </div>
                  <p className="font-bold" style={{ color: TIER_COLORS[e.tier] ?? "#666" }}>
                    {e.tier === "UNRANKED" ? "Sem Rank" : `${e.tier} ${e.rank} — ${e.leaguePoints} LP`}
                  </p>
                </div>
              ))}
            </div>
          )}

          {result.entries.length === 0 && (
            <p className="text-gray-500 text-sm text-center">Jogador sem rank nesta temporada</p>
          )}

          {result.masteries.length > 0 && (
            <div>
              <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Top Campeões</p>
              <div className="flex gap-2 flex-wrap">
                {result.masteries.slice(0, 5).map(m => (
                  <div key={m.championId} className="text-center" title={m.championName}>
                    <Image
                      src={DD + "/img/champion/" + m.championName + ".png"}
                      width={44} height={44} alt={m.championName}
                      className="rounded border border-[#1E3A5F]"
                    />
                    <p className="text-[10px] text-gray-500 mt-0.5">M{m.championLevel}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {saved ? (
            <p className="text-green-400 font-bold text-center">✅ Conta vinculada! Redirecionando...</p>
          ) : (
            <button onClick={handleSave} disabled={saving} className="btn-gold w-full py-3">
              {saving ? "Salvando..." : "✅ Vincular esta Conta"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
