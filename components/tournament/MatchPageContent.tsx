'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  gameStatus: string;
  participants: RiotParticipant[];
  bannedChampions: RiotBannedChampion[];
  gameLength: number;
}

// ── Utilitários Data Dragon ──────────────────────────────────────────────────
// Versão dinâmica — busca a versão mais recente na inicialização
let DD_VERSION = '15.10.1'; // fallback; sobrescrito por fetchDDVersion()

const championIdToKey: Record<number, string> = {};
const spellIdToKey: Record<number, string> = {
  1: 'SummonerBoost', 3: 'SummonerExhaust', 4: 'SummonerFlash', 6: 'SummonerHaste',
  7: 'SummonerHeal', 11: 'SummonerSmite', 12: 'SummonerTeleport', 13: 'SummonerMana',
  14: 'SummonerDot', 21: 'SummonerBarrier', 32: 'SummonerSnowball',
};

const champIconUrl = (id: number): string | null =>
  id > 0 && championIdToKey[id]
    ? `https://ddragon.leagueoflegends.com/cdn/${DD_VERSION}/img/champion/${championIdToKey[id]}.png`
    : null;

const spellIconUrl = (id: number): string =>
  `https://ddragon.leagueoflegends.com/cdn/${DD_VERSION}/img/spell/${spellIdToKey[id] ?? 'SummonerFlash'}.png`;

const profileIconUrl = (iconId: number | string): string =>
  `https://ddragon.leagueoflegends.com/cdn/${DD_VERSION}/img/profileicon/${iconId}.png`;

async function fetchDDVersion(): Promise<void> {
  try {
    const res = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
    const versions: string[] = await res.json();
    if (versions[0]) DD_VERSION = versions[0];
  } catch (_) {}
}

async function fetchChampionMap(): Promise<void> {
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

// ── Constantes de estilo ─────────────────────────────────────────────────────
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

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Agendada', PENDING: 'Agendada', pending: 'Agendada',
  IN_PROGRESS: 'Em Andamento', ONGOING: 'Em Andamento', ongoing: 'Em Andamento',
  FINISHED: 'Finalizada', finished: 'Finalizada',
  CANCELLED: 'Cancelada', cancelled: 'Cancelada',
};

// ── Componente principal ─────────────────────────────────────────────────────
interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  match: any;
  teamAPlayers: { profile_id: string | number; team_role: string; lane: string | null; status: string | null }[];
  teamBPlayers: { profile_id: string | number; team_role: string; lane: string | null; status: string | null }[];
  playersData?: {
    id: string | number;
    summoner_name: string | null;
    tag_line: string | null;
    tier: string | null;
    rank: string | null;
    lp: number | null;
    profile_icon: number | string | null;
    role: string | null;
    riot_account_id: string | null;
  }[];
  userInMatch: boolean;
  userRole?: UserRole;
  stageName?: string | null;
}

export default function MatchPageContent({
  match,
  teamAPlayers,
  teamBPlayers,
  playersData = [],
  userInMatch,
  userRole = 'public',
  stageName,
}: Props) {
  // Extrai código de torneio inicial de forma defensiva
  const notesStr = typeof match.notes === 'string' ? match.notes : '';
  const initialCode: string | null =
    match.tournament_code ?? (notesStr.match(/BR1_[A-Z0-9-]+/)?.[0] ?? null);

  const [liveCode, setLiveCode]           = useState<string | null>(initialCode);
  const [codeJustArrived, setCodeJA]      = useState(false);
  const [liveGame, setLiveGame]           = useState<LiveGameData | null>(null);
  const [loadingLive, setLoadingLive]     = useState(false);
  const [champMapReady, setChampMapReady] = useState(false);
  const [matchStatus, setMatchStatus]     = useState<string>(match.status ?? 'PENDING');
  const [scores, setScores]               = useState({ a: match.score_a ?? 0, b: match.score_b ?? 0 });
  const [timer, setTimer]                 = useState(0);

  // FIX: tipo explícito `number` para setInterval no browser, com `| null`
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const slug       = match.tournament?.slug ?? '';
  const isLive     = ['IN_PROGRESS', 'ONGOING', 'ongoing'].includes(matchStatus);
  const isFinished = ['FINISHED', 'finished'].includes(matchStatus);
  const bestOf     = match.best_of ?? 1;

  // 1 ── Carrega versão DD + mapa de campeões
  useEffect(() => {
    fetchDDVersion()
      .then(() => fetchChampionMap())
      .then(() => setChampMapReady(true));
  }, []);

  // 2 ── Realtime: tournament_code + status + score
  useEffect(() => {
    const supabase = createClient();
    const ch = supabase
      .channel(`match-live-${match.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${match.id}` },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: { new: any }) => {
          const u = payload.new;
          if (u.tournament_code && u.tournament_code !== liveCode) {
            setLiveCode(u.tournament_code);
            setCodeJA(true);
            setTimeout(() => setCodeJA(false), 6000);
          }
          if (u.status) setMatchStatus(u.status);
          setScores({ a: u.score_a ?? 0, b: u.score_b ?? 0 });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [match.id, liveCode]);

  // 3 ── Polling Spectator API — tenta todos os PUUIDs até achar a partida
  const fetchLiveGame = useCallback(async () => {
    if (!champMapReady) return;
    const puuids = playersData
      .map((p) => p.riot_account_id)
      .filter((id): id is string => Boolean(id));
    if (puuids.length === 0) return;

    setLoadingLive(true);
    let found: LiveGameData | null = null;

    for (const puuid of puuids) {
      try {
        const res = await fetch(`/api/riot/live-game?puuid=${encodeURIComponent(puuid)}`);
        if (res.ok) {
          found = (await res.json()) as LiveGameData;
          break;
        }
      } catch (_) {}
    }

    setLiveGame(found);
    setLoadingLive(false);
  }, [champMapReady, playersData]);

  // 4 ── Inicia polling quando partida está ao vivo
  useEffect(() => {
    if (!isLive) return;
    void fetchLiveGame();
    const interval = setInterval(() => void fetchLiveGame(), 5000);
    return () => clearInterval(interval);
  }, [isLive, fetchLiveGame]);

  // 5 ── Timer ao vivo — reinicia somente quando gameLength muda
  useEffect(() => {
    if (liveGame) {
      setTimer(liveGame.gameLength);
      if (timerRef.current) clearInterval(timerRef.current as ReturnType<typeof setInterval>);
      timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current as ReturnType<typeof setInterval>);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current as ReturnType<typeof setInterval>);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveGame?.gameLength]);

  const blueBans = liveGame?.bannedChampions.filter((b) => b.teamId === 100) ?? [];
  const redBans  = liveGame?.bannedChampions.filter((b) => b.teamId === 200) ?? [];

  const fmtTimer = (s: number): string =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-[#0A0E17] text-white py-10 px-4">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Breadcrumb */}
        <nav className="text-xs text-gray-500 flex items-center gap-2 flex-wrap">
          <a href={`/torneios/${slug}`} className="hover:text-[#C8A84B] transition-colors">
            {match.tournament?.name ?? 'Torneio'}
          </a>
          <span>/</span>
          <a href={`/torneios/${slug}/partidas`} className="hover:text-[#C8A84B] transition-colors">Partidas</a>
          {stageName && (<><span>/</span><span className="text-gray-500">{stageName}</span></>)}
          <span>/</span>
          <span className="text-gray-400">
            Rodada {match.round}
            {match.match_number ? ` · #${match.match_number}` : ''}
          </span>
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
              {userRole === 'admin'     ? '🔴 Admin' :
               userRole === 'organizer' ? '🏆 Organizador' :
               userRole === 'captain'   ? '⚔️ Capitão' : '🎮 Jogador'}
            </span>
          </div>
        )}

        {/* ── Scoreboard Header ──────────────────────────────────────────── */}
        <div className="relative">
          {/* Status pill centralizado no topo */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            {isLive ? (
              <span className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/30 text-green-400 text-[10px] font-black uppercase px-3 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping" />
                {liveGame ? fmtTimer(timer) : 'Em Andamento'}
              </span>
            ) : isFinished ? (
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
              <div className="flex-1 flex flex-col items-end gap-1">
                {match.team_a?.logo_url && (
                  <img src={match.team_a.logo_url} alt={match.team_a.name ?? 'Time A'}
                    width={48} height={48} className="rounded-full object-cover mb-1"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                )}
                <h2 className="text-2xl md:text-4xl font-black italic uppercase tracking-tighter leading-none text-right">
                  {match.team_a?.name}
                </h2>
                <p className="text-[#718096] font-bold text-sm">[{match.team_a?.tag}]</p>
              </div>

              {/* Placar central */}
              <div className="flex flex-col items-center shrink-0 gap-2">
                <div className="bg-[#111827] px-6 py-3 rounded-2xl border-2 border-[#C89B3C]/30 shadow-[0_0_24px_rgba(200,155,60,0.1)]">
                  <span className="text-4xl md:text-5xl font-black tabular-nums tracking-tight">
                    {scores.a} — {scores.b}
                  </span>
                </div>
                <p className="text-[10px] text-[#4A5568] font-black uppercase tracking-widest">
                  {bestOf > 1 ? `MD${bestOf}` : 'BO1'}
                </p>
              </div>

              {/* Time B */}
              <div className="flex-1 flex flex-col items-start gap-1">
                {match.team_b?.logo_url && (
                  <img src={match.team_b.logo_url} alt={match.team_b.name ?? 'Time B'}
                    width={48} height={48} className="rounded-full object-cover mb-1"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                )}
                <h2 className="text-2xl md:text-4xl font-black italic uppercase tracking-tighter leading-none">
                  {match.team_b?.name}
                </h2>
                <p className="text-[#718096] font-bold text-sm">[{match.team_b?.tag}]</p>
              </div>

            </div>
          </div>
        </div>

        {/* ── Picks/Bans ao vivo ─────────────────────────────────────────── */}
        {liveGame && champMapReady && (
          <div className="bg-[#0D1421] border border-[#1E2D45] rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest text-[#718096]">Bans</h3>
              <span className="text-[10px] text-green-400 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping" />
                AO VIVO · {fmtTimer(timer)}
              </span>
            </div>

            {/* Bans linha */}
            <div className="flex items-center justify-between gap-4">
              <BanRow bans={blueBans} side="blue" />
              <span className="text-[#4A5568] text-xs font-black uppercase shrink-0">vs</span>
              <BanRow bans={redBans} side="red" />
            </div>
          </div>
        )}

        {/* ── Grid principal ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">

          {/* Times */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <span className="w-1 h-5 bg-[#C89B3C] rounded-full" />
              <h3 className="text-sm font-black uppercase tracking-widest text-[#718096]">Jogadores</h3>
              {loadingLive && (
                <span className="text-[10px] text-[#4A5568] animate-pulse ml-2">buscando ao vivo…</span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <TeamPanel
                teamName={match.team_a?.name ?? 'Time A'}
                side="blue"
                members={teamAPlayers}
                playersData={playersData}
                liveParticipants={liveGame?.participants.filter((p) => p.teamId === 100) ?? []}
                champMapReady={champMapReady}
              />
              <TeamPanel
                teamName={match.team_b?.name ?? 'Time B'}
                side="red"
                members={teamBPlayers}
                playersData={playersData}
                liveParticipants={liveGame?.participants.filter((p) => p.teamId === 200) ?? []}
                champMapReady={champMapReady}
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <TournamentCodeBox
              code={liveCode}
              isAuthorized={userInMatch}
              matchStatus={matchStatus}
              justArrived={codeJustArrived}
            />

            <div className="bg-[#0D1421] border border-[#1E2D45] rounded-2xl p-5 space-y-3">
              <h4 className="text-[#718096] text-[10px] font-black uppercase tracking-widest">Detalhes</h4>
              <InfoRow label="Rodada"  value={`#${match.round ?? '—'}`} />
              <InfoRow label="Formato" value={bestOf > 1 ? `MD${bestOf}` : 'BO1'} />
              <InfoRow label="Status"  value={STATUS_LABELS[matchStatus] ?? matchStatus} />
              {stageName && <InfoRow label="Fase" value={stageName} />}
              {match.scheduled_at && (
                <InfoRow
                  label="Agendado"
                  value={new Date(match.scheduled_at).toLocaleString('pt-BR', {
                    dateStyle: 'short', timeStyle: 'short',
                  })}
                />
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

// ── BanRow ───────────────────────────────────────────────────────────────────
function BanRow({ bans, side }: { bans: RiotBannedChampion[]; side: 'blue' | 'red' }) {
  const borderColor = side === 'blue' ? 'border-blue-500/30' : 'border-red-500/30';
  const emptyBorder = side === 'blue' ? 'border-blue-500/10' : 'border-red-500/10';
  return (
    <div className="flex gap-1.5 flex-wrap">
      {bans
        .sort((a, b) => a.pickTurn - b.pickTurn)
        .map((b, i) => {
          const img = champIconUrl(b.championId);
          return (
            <div key={i} className="relative w-9 h-9">
              {img ? (
                <img src={img} alt="ban" width={36} height={36}
                  className={`rounded-md grayscale opacity-60 border ${borderColor} object-cover w-full h-full`}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              ) : (
                <div className={`w-9 h-9 rounded-md bg-[#1A2535] border ${borderColor}`} />
              )}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-red-500 text-base font-black leading-none">×</span>
              </div>
            </div>
          );
        })}
      {Array.from({ length: Math.max(0, 5 - bans.length) }).map((_, i) => (
        <div key={i}
          className={`w-9 h-9 rounded-md bg-[#1A2535] border ${emptyBorder} border-dashed opacity-25`} />
      ))}
    </div>
  );
}

// ── TeamPanel ────────────────────────────────────────────────────────────────
interface TeamPanelProps {
  teamName: string;
  side: 'blue' | 'red';
  members: Props['teamAPlayers'];
  playersData: NonNullable<Props['playersData']>;
  liveParticipants: RiotParticipant[];
  champMapReady: boolean;
}

function TeamPanel({
  teamName, side, members, playersData, liveParticipants, champMapReady,
}: TeamPanelProps) {
  const isBlue = side === 'blue';
  return (
    <div className={`rounded-2xl border overflow-hidden bg-[#0D1421]/80 ${
      isBlue ? 'border-blue-500/30' : 'border-red-500/30'
    }`}>
      {/* Header */}
      <div className={`px-4 py-3 flex items-center justify-between ${
        isBlue ? 'bg-blue-500/10' : 'bg-red-500/10'
      }`}>
        <span className="font-black italic uppercase tracking-tighter text-sm truncate">{teamName}</span>
        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded shrink-0 ml-2 ${
          isBlue ? 'bg-blue-500/20 text-blue-400' : 'bg-red-500/20 text-red-400'
        }`}>
          {isBlue ? '🔵 Azul' : '🔴 Vermelho'}
        </span>
      </div>

      {/* Jogadores */}
      <div className="p-2 space-y-1">
        {members.map((member) => {
          const pd = playersData.find(
            (p) => p.riot_account_id === member.profile_id || p.id === member.profile_id
          );
          const live = liveParticipants.find((p) => p.puuid === pd?.riot_account_id);
          const champImg = champMapReady && live ? champIconUrl(live.championId) : null;
          const tier = pd?.tier ?? 'UNRANKED';
          const tierColor = TIER_COLORS[tier] ?? TIER_COLORS['UNRANKED'];
          const isInLobby = !!live;

          return (
            <div key={String(member.profile_id)}
              className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition-colors">

              {/* Avatar/campeão */}
              <div className="relative shrink-0">
                {champImg ? (
                  <img src={champImg} alt="champ" width={40} height={40}
                    className="rounded-lg border border-white/10 object-cover w-10 h-10"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-[#1A2535] border border-white/5 flex items-center justify-center overflow-hidden">
                    {pd?.profile_icon != null ? (
                      <img
                        src={profileIconUrl(pd.profile_icon)}
                        alt="icon" width={40} height={40}
                        className="rounded-lg object-cover w-10 h-10"
                        onError={(e) => {
                          const el = e.target as HTMLImageElement;
                          el.style.display = 'none';
                          // FIX: null-safety no parentElement
                          if (el.parentElement) {
                            el.parentElement.innerHTML = '<span class="text-[#4A5568] text-lg">◈</span>';
                          }
                        }}
                      />
                    ) : (
                      <span className="text-[#4A5568] text-lg">◈</span>
                    )}
                  </div>
                )}
                <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0D1421] ${
                  isInLobby ? 'bg-green-500' : 'bg-[#2D3748]'
                }`} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-white text-xs font-bold truncate leading-none">
                    {pd?.summoner_name ?? '—'}
                    {pd?.tag_line && (
                      <span className="text-[#4A5568]">#{pd.tag_line}</span>
                    )}
                  </p>
                  {member.team_role === 'captain' && (
                    <span className="text-[8px] font-black uppercase text-[#C8A84B] border border-[#C8A84B]/30 px-1 rounded shrink-0">C</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {pd?.tier && pd.tier !== 'UNRANKED' && (
                    <span className="text-[10px] font-black uppercase" style={{ color: tierColor }}>
                      {pd.tier.slice(0, 1)}{pd.rank} {pd.lp}lp
                    </span>
                  )}
                  {(member.lane ?? pd?.role) && (
                    <span className="text-[10px] text-[#4A5568] uppercase">
                      {LANE_LABELS[member.lane ?? pd?.role ?? ''] ?? member.lane ?? pd?.role}
                    </span>
                  )}
                </div>
              </div>

              {/* Summoner spells ao vivo */}
              {live && (
                <div className="flex flex-col gap-0.5 shrink-0">
                  <img src={spellIconUrl(live.spell1Id)} alt="D"
                    width={18} height={18}
                    className="rounded border border-white/10"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  <img src={spellIconUrl(live.spell2Id)} alt="F"
                    width={18} height={18}
                    className="rounded border border-white/10"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                </div>
              )}

              {/* Status badge */}
              <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg shrink-0 ${
                isInLobby
                  ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                  : 'bg-[#1A2535] text-[#4A5568]'
              }`}>
                {isInLobby ? 'PICK' : '—'}
              </span>
            </div>
          );
        })}

        {/* Slots vazios skeleton */}
        {Array.from({ length: Math.max(0, 5 - members.length) }).map((_, i) => (
          <div key={`empty-${i}`} className="flex items-center gap-3 px-3 py-2 rounded-xl opacity-20">
            <div className="w-10 h-10 rounded-lg bg-[#1A2535] animate-pulse shrink-0" />
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

// ── InfoRow ──────────────────────────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-[#4A5568] font-bold uppercase tracking-wider">{label}</span>
      <span className="text-[#A0AEC0] font-medium">{value}</span>
    </div>
  );
}
