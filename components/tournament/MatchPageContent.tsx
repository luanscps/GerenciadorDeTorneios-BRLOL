'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import TournamentCodeBox from './TournamentCodeBox';

type UserRole = 'admin' | 'organizer' | 'captain' | 'member' | 'public';

// ── Tipos Riot Spectator API v5 ──────────────────────────────────────────────
interface RiotParticipant {
  puuid: string;
  summonerName: string;
  championId: number;
  teamId: number; // 100 = blue, 200 = red
  spell1Id: number;
  spell2Id: number;
  perks?: { perkIds: number[] };
}

interface RiotBannedChampion {
  championId: number;
  teamId: number;
  pickTurn: number;
}

interface LiveGameData {
  gameId: number;
  gameStatus: string; // 'IN_GAME' | 'CREATING_GAME'
  participants: RiotParticipant[];
  bannedChampions: RiotBannedChampion[];
  gameLength: number;
}

// ── Utilitários Data Dragon ──────────────────────────────────────────────────
const DD_VERSION = '14.10.1';
const champIconUrl = (id: number) =>
  id > 0
    ? `https://ddragon.leagueoflegends.com/cdn/${DD_VERSION}/img/champion/${championIdToKey[id] ?? id}.png`
    : null;

const summonerSpellUrl = (id: number) =>
  `https://ddragon.leagueoflegends.com/cdn/${DD_VERSION}/img/spell/${spellIdToKey[id] ?? 'SummonerFlash'}.png`;

// Mapeamento champion id → chave (abreviado — Data Dragon retorna a lista completa via /cdn/version/data/pt_BR/champion.json)
// Aqui usamos o endpoint de chave por id disponível no DDragon
const championIdToKey: Record<number, string> = {}; // preenchido em runtime via fetchChampionMap
const spellIdToKey: Record<number, string> = {
  1: 'SummonerBoost', 3: 'SummonerExhaust', 4: 'SummonerFlash', 6: 'SummonerHaste',
  7: 'SummonerHeal', 11: 'SummonerSmite', 12: 'SummonerTeleport', 13: 'SummonerMana',
  14: 'SummonerDot', 21: 'SummonerBarrier', 32: 'SummonerSnowball',
};

async function fetchChampionMap() {
  if (Object.keys(championIdToKey).length > 0) return;
  try {
    const res = await fetch(
      `https://ddragon.leagueoflegends.com/cdn/${DD_VERSION}/data/pt_BR/champion.json`
    );
    const json = await res.json();
    for (const key of Object.keys(json.data)) {
      championIdToKey[Number(json.data[key].key)] = key;
    }
  } catch (_) {}
}

// ── Lane icons ───────────────────────────────────────────────────────────────
const LANE_LABELS: Record<string, string> = {
  top: 'Top', jungle: 'Jungle', mid: 'Mid', bot: 'Bot', support: 'Suporte',
  TOP: 'Top', JUNGLE: 'Jungle', MID: 'Mid', BOTTOM: 'Bot', UTILITY: 'Suporte',
};

const TIER_COLORS: Record<string, string> = {
  IRON: '#6B7280', BRONZE: '#92400E', SILVER: '#9CA3AF',
  GOLD: '#C8A84B', PLATINUM: '#10B981', EMERALD: '#059669',
  DIAMOND: '#60A5FA', MASTER: '#A78BFA', GRANDMASTER: '#F87171', CHALLENGER: '#FCD34D',
  UNRANKED: '#4A5568',
};

// ── Componente principal ─────────────────────────────────────────────────────
interface Props {
  match: any;
  teamAPlayers: { profile_id: any; team_role: any; lane: any; status: any }[];
  teamBPlayers: { profile_id: any; team_role: any; lane: any; status: any }[];
  playersData?: { id: any; summoner_name: any; tag_line: any; tier: any; rank: any; lp: any; profile_icon: any; role: any; riot_account_id: any }[];
  userInMatch: boolean;
  userRole?: UserRole;
}

export default function MatchPageContent({
  match,
  teamAPlayers,
  teamBPlayers,
  playersData = [],
  userInMatch,
  userRole = 'public',
}: Props) {
  const initialCode = match.tournament_code ??
    (match.notes?.includes('BR1_') ? match.notes.match(/BR1_[A-Z0-9-]+/)?.[0] : null);

  const [liveCode, setLiveCode] = useState<string | null>(initialCode);
  const [codeJustArrived, setCodeJustArrived] = useState(false);
  const [liveGame, setLiveGame] = useState<LiveGameData | null>(null);
  const [loadingLive, setLoadingLive] = useState(false);
  const [champMapReady, setChampMapReady] = useState(false);
  const [pollingActive, setPollingActive] = useState(false);

  const slug = match.tournament?.slug ?? '';

  // Carrega mapa de campeões
  useEffect(() => {
    fetchChampionMap().then(() => setChampMapReady(true));
  }, []);

  // Realtime: detecta quando o tournament_code é salvo
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`match-code-${match.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${match.id}` },
        (payload) => {
          const updated = payload.new as any;
          const newCode = updated.tournament_code ?? null;
          if (newCode && newCode !== liveCode) {
            setLiveCode(newCode);
            setCodeJustArrived(true);
            setTimeout(() => setCodeJustArrived(false), 6000);
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [match.id, liveCode]);

  // Polling Riot Spectator API via /api/riot/live-game  (passa puuids do time A)
  const fetchLiveGame = useCallback(async () => {
    if (!champMapReady) return;
    // Pega o primeiro puuid disponível de qualquer time para detectar a partida ao vivo
    const firstPlayer = playersData[0];
    if (!firstPlayer?.riot_account_id) return;

    try {
      setLoadingLive(true);
      const res = await fetch(`/api/riot/live-game?puuid=${encodeURIComponent(firstPlayer.riot_account_id)}`);
      if (res.ok) {
        const data: LiveGameData = await res.json();
        setLiveGame(data);
        setPollingActive(true);
      } else {
        setLiveGame(null);
      }
    } catch (_) {
      setLiveGame(null);
    } finally {
      setLoadingLive(false);
    }
  }, [champMapReady, playersData]);

  // Inicia polling quando match está ONGOING
  useEffect(() => {
    if (match.status !== 'ONGOING' && match.status !== 'ongoing') return;
    fetchLiveGame();
    const interval = setInterval(fetchLiveGame, 5000);
    return () => clearInterval(interval);
  }, [match.status, fetchLiveGame]);

  // Helpers
  const getPlayerData = (profileId: string) =>
    playersData.find(p => p.riot_account_id === profileId || p.id === profileId);

  const getLiveParticipant = (profileId: string): RiotParticipant | undefined => {
    if (!liveGame) return undefined;
    const pd = getPlayerData(profileId);
    return liveGame.participants.find(p => p.puuid === (pd?.riot_account_id ?? profileId));
  };

  const blueBans = liveGame?.bannedChampions.filter(b => b.teamId === 100) ?? [];
  const redBans  = liveGame?.bannedChampions.filter(b => b.teamId === 200) ?? [];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-[#0A0E17] text-white py-10 px-4">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Breadcrumb */}
        <nav className="text-xs text-gray-500 flex items-center gap-2">
          <a href={`/torneios/${slug}`} className="hover:text-[#C8A84B] transition-colors">
            {match.tournament?.name ?? 'Torneio'}
          </a>
          <span>/</span>
          <a href={`/torneios/${slug}/partidas`} className="hover:text-[#C8A84B] transition-colors">Partidas</a>
          <span>/</span>
          <span className="text-gray-400">Rodada {match.round}</span>
        </nav>

        {/* Role badge */}
        {userRole !== 'public' && (
          <div className="flex gap-2">
            <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border ${
              userRole === 'admin'     ? 'border-red-500/40 text-red-400 bg-red-900/20' :
              userRole === 'organizer' ? 'border-[#C8A84B]/40 text-[#C8A84B] bg-[#C8A84B]/10' :
              userRole === 'captain'   ? 'border-blue-500/40 text-blue-400 bg-blue-900/20' :
                                         'border-gray-600/40 text-gray-400 bg-gray-800/20'
            }`}>
              {userRole === 'admin' ? '🔴 Admin' : userRole === 'organizer' ? '🏆 Organizador' :
               userRole === 'captain' ? '⚔️ Capitão' : '🎮 Jogador'}
            </span>
          </div>
        )}

        {/* ── Scoreboard Header ── */}
        <div className="relative">
          {/* Status badge */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
            {match.status === 'ONGOING' || match.status === 'ongoing' ? (
              <span className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/30 text-green-400 text-[10px] font-black uppercase px-3 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping" />
                Em Andamento
              </span>
            ) : match.status === 'FINISHED' || match.status === 'finished' ? (
              <span className="bg-gray-700/50 border border-gray-600/30 text-gray-400 text-[10px] font-black uppercase px-3 py-1 rounded-full">
                Finalizada
              </span>
            ) : (
              <span className="bg-[#C8A84B]/10 border border-[#C8A84B]/30 text-[#C8A84B] text-[10px] font-black uppercase px-3 py-1 rounded-full">
                Aguardando
              </span>
            )}
          </div>

          <div className="bg-[#0D1421] border border-[#1E2D45] rounded-2xl px-6 py-8 pt-10">
            <div className="flex items-center justify-between gap-4">
              {/* Time A */}
              <div className="flex-1 text-right">
                <h2 className="text-2xl md:text-4xl font-black italic uppercase tracking-tighter leading-none">
                  {match.team_a?.name}
                </h2>
                <p className="text-[#718096] font-bold text-base mt-1">[{match.team_a?.tag}]</p>
              </div>

              {/* Placar */}
              <div className="flex flex-col items-center shrink-0">
                <div className="bg-[#111827] px-6 py-3 rounded-2xl border-2 border-[#C89B3C]/30 shadow-[0_0_24px_rgba(200,155,60,0.1)]">
                  <span className="text-4xl md:text-5xl font-black tabular-nums tracking-tight">
                    {match.score_a ?? 0} — {match.score_b ?? 0}
                  </span>
                </div>
                <p className="text-[10px] text-[#4A5568] font-black uppercase mt-2 tracking-widest">
                  {match.format || 'BO1'}
                </p>
                {liveGame && (
                  <p className="text-[10px] text-green-500 font-bold mt-1">
                    {Math.floor(liveGame.gameLength / 60)}:{String(liveGame.gameLength % 60).padStart(2, '0')}
                  </p>
                )}
              </div>

              {/* Time B */}
              <div className="flex-1 text-left">
                <h2 className="text-2xl md:text-4xl font-black italic uppercase tracking-tighter leading-none">
                  {match.team_b?.name}
                </h2>
                <p className="text-[#718096] font-bold text-base mt-1">[{match.team_b?.tag}]</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Picks/Bans ao vivo (só aparece se liveGame existir) ── */}
        {liveGame && champMapReady && (
          <div className="bg-[#0D1421] border border-[#1E2D45] rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest text-[#718096]">
                Bans da Partida
              </h3>
              <span className="text-[10px] text-green-400 font-bold animate-pulse">● AO VIVO</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              {/* Bans Blue */}
              <div className="flex gap-2">
                {blueBans.map((b, i) => {
                  const img = champIconUrl(b.championId);
                  return img ? (
                    <div key={i} className="relative">
                      <img src={img} alt="ban" width={36} height={36}
                        className="rounded-md grayscale opacity-70 border border-blue-500/30" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-red-500 text-lg font-black">×</span>
                      </div>
                    </div>
                  ) : <div key={i} className="w-9 h-9 rounded-md bg-[#1A2535] border border-blue-500/20" />;
                })}
                {Array.from({ length: Math.max(0, 5 - blueBans.length) }).map((_, i) => (
                  <div key={i} className="w-9 h-9 rounded-md bg-[#1A2535] border border-blue-500/10 border-dashed opacity-30" />
                ))}
              </div>
              <span className="text-[#4A5568] text-xs font-black uppercase">vs</span>
              {/* Bans Red */}
              <div className="flex gap-2">
                {redBans.map((b, i) => {
                  const img = champIconUrl(b.championId);
                  return img ? (
                    <div key={i} className="relative">
                      <img src={img} alt="ban" width={36} height={36}
                        className="rounded-md grayscale opacity-70 border border-red-500/30" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-red-500 text-lg font-black">×</span>
                      </div>
                    </div>
                  ) : <div key={i} className="w-9 h-9 rounded-md bg-[#1A2535] border border-red-500/20" />;
                })}
                {Array.from({ length: Math.max(0, 5 - redBans.length) }).map((_, i) => (
                  <div key={i} className="w-9 h-9 rounded-md bg-[#1A2535] border border-red-500/10 border-dashed opacity-30" />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Grid principal ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">

          {/* Times lado a lado */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <span className="w-1 h-5 bg-[#C89B3C] rounded-full" />
              <h3 className="text-sm font-black uppercase tracking-widest text-[#718096]">Jogadores</h3>
              {loadingLive && (
                <span className="text-[10px] text-[#4A5568] animate-pulse">buscando ao vivo…</span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <TeamPanel
                teamName={match.team_a?.name}
                side="blue"
                members={teamAPlayers}
                playersData={playersData}
                liveParticipants={liveGame?.participants.filter(p => p.teamId === 100) ?? []}
                champMapReady={champMapReady}
              />
              <TeamPanel
                teamName={match.team_b?.name}
                side="red"
                members={teamBPlayers}
                playersData={playersData}
                liveParticipants={liveGame?.participants.filter(p => p.teamId === 200) ?? []}
                champMapReady={champMapReady}
              />
            </div>
          </div>

          {/* Sidebar: code + instruções */}
          <div className="space-y-4">
            <TournamentCodeBox
              code={liveCode}
              isAuthorized={userInMatch}
              matchStatus={match.status}
              justArrived={codeJustArrived}
            />

            {/* Match info card */}
            <div className="bg-[#0D1421] border border-[#1E2D45] rounded-2xl p-5 space-y-3">
              <h4 className="text-[#718096] text-[10px] font-black uppercase tracking-widest">Detalhes</h4>
              <InfoRow label="Rodada" value={`#${match.round}`} />
              <InfoRow label="Formato" value={match.format ?? 'BO1'} />
              <InfoRow label="Status" value={match.status ?? '—'} />
              {match.scheduled_at && (
                <InfoRow label="Agendado" value={new Date(match.scheduled_at).toLocaleString('pt-BR')} />
              )}
            </div>

            <div className="bg-[#0D1421] border border-[#1E2D45] rounded-2xl p-5">
              <h4 className="text-[#718096] text-[10px] font-black uppercase tracking-widest mb-3">Como entrar</h4>
              <ol className="space-y-2 text-sm text-[#A0AEC0] list-none">
                {[
                  'Abra o cliente do League of Legends.',
                  'Clique em "Jogar" → ícone de troféu (Código de Torneio).',
                  'Cole o código acima e clique em Entrar.',
                ].map((step, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-[#C89B3C] font-bold shrink-0">{i + 1}.</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}

// ── Sub-componente: painel de um time ────────────────────────────────────────
function TeamPanel({
  teamName, side, members, playersData, liveParticipants, champMapReady,
}: {
  teamName: string;
  side: 'blue' | 'red';
  members: any[];
  playersData: any[];
  liveParticipants: RiotParticipant[];
  champMapReady: boolean;
}) {
  const isBlue = side === 'blue';
  const accentBorder = isBlue ? 'border-blue-500/30' : 'border-red-500/30';
  const accentHeader = isBlue ? 'bg-blue-500/10' : 'bg-red-500/10';
  const accentText   = isBlue ? 'text-blue-400' : 'text-red-400';

  return (
    <div className={`rounded-2xl border overflow-hidden bg-[#0D1421]/80 ${accentBorder}`}>
      {/* Header */}
      <div className={`px-4 py-3 flex items-center justify-between ${accentHeader}`}>
        <span className="font-black italic uppercase tracking-tighter text-sm">{teamName}</span>
        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${isBlue ? 'bg-blue-500/20 text-blue-400' : 'bg-red-500/20 text-red-400'}`}>
          {isBlue ? '🔵 Azul' : '🔴 Vermelho'}
        </span>
      </div>

      {/* Jogadores */}
      <div className="p-2 space-y-1">
        {members.map((member) => {
          const pd = playersData.find(p =>
            p.riot_account_id === member.profile_id || p.id === member.profile_id
          );
          const live = liveParticipants.find(p => p.puuid === pd?.riot_account_id);
          const champImg = champMapReady && live ? champIconUrl(live.championId) : null;
          const tier = pd?.tier ?? 'UNRANKED';
          const tierColor = TIER_COLORS[tier] ?? TIER_COLORS.UNRANKED;
          const isInLobby = !!live;

          return (
            <div key={member.profile_id}
              className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition-colors group">

              {/* Ícone do campeão ou avatar padrão */}
              <div className="relative shrink-0">
                {champImg ? (
                  <img src={champImg} alt="champ" width={40} height={40}
                    className="rounded-lg border border-white/10 object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-[#1A2535] border border-white/5 flex items-center justify-center">
                    {pd?.profile_icon ? (
                      <img
                        src={`https://ddragon.leagueoflegends.com/cdn/${DD_VERSION}/img/profileicon/${pd.profile_icon}.png`}
                        alt="icon" width={40} height={40} className="rounded-lg object-cover" />
                    ) : (
                      <span className="text-[#4A5568] text-lg">◈</span>
                    )}
                  </div>
                )}
                {/* Status dot */}
                <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0D1421] ${
                  isInLobby ? 'bg-green-500' : 'bg-[#2D3748]'
                }`} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-white text-xs font-bold truncate leading-none">
                    {pd?.summoner_name ?? '—'}
                    {pd?.tag_line && <span className="text-[#4A5568]">#{pd.tag_line}</span>}
                  </p>
                  {member.team_role === 'captain' && (
                    <span className="text-[8px] font-black uppercase text-[#C8A84B] border border-[#C8A84B]/30 px-1 rounded shrink-0">C</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {pd?.tier && pd.tier !== 'UNRANKED' && (
                    <span className="text-[10px] font-black uppercase" style={{ color: tierColor }}>
                      {pd.tier.slice(0, 1)}{pd.rank} {pd.lp}lp
                    </span>
                  )}
                  {(member.lane || pd?.role) && (
                    <span className="text-[10px] text-[#4A5568] uppercase">
                      {LANE_LABELS[member.lane ?? pd?.role] ?? member.lane ?? pd?.role}
                    </span>
                  )}
                </div>
              </div>

              {/* Spells (se ao vivo) */}
              {live && (
                <div className="flex flex-col gap-0.5 shrink-0">
                  <img src={summonerSpellUrl(live.spell1Id)} alt="spell1" width={18} height={18}
                    className="rounded border border-white/10" />
                  <img src={summonerSpellUrl(live.spell2Id)} alt="spell2" width={18} height={18}
                    className="rounded border border-white/10" />
                </div>
              )}

              {/* Lobby badge */}
              <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg shrink-0 ${
                isInLobby
                  ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                  : 'bg-[#1A2535] text-[#4A5568]'
              }`}>
                {isInLobby ? (liveParticipants.length > 0 ? 'PICK' : 'LOBBY') : '—'}
              </span>
            </div>
          );
        })}

        {/* Slots vazios */}
        {Array.from({ length: Math.max(0, 5 - members.length) }).map((_, i) => (
          <div key={`empty-${i}`} className="flex items-center gap-3 px-3 py-2 rounded-xl opacity-20">
            <div className="w-10 h-10 rounded-lg bg-[#1A2535] animate-pulse" />
            <div className="flex-1 space-y-1.5">
              <div className="h-2.5 bg-[#1A2535] rounded w-2/3 animate-pulse" />
              <div className="h-2 bg-[#1A2535] rounded w-1/3 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Linha de info simples ────────────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-[#4A5568] font-bold uppercase tracking-wider">{label}</span>
      <span className="text-[#A0AEC0] font-medium">{value}</span>
    </div>
  );
}
