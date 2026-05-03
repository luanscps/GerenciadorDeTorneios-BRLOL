'use client';
import Image from 'next/image';

const POSITION_LABEL: Record<string, string> = {
  TOP: 'Top',
  JUNGLE: 'Jungle',
  MIDDLE: 'Mid',
  BOTTOM: 'ADC',
  UTILITY: 'Suporte',
  '': 'ARAM',
};

interface Props {
  championName: string;
  kills: number;
  deaths: number;
  assists: number;
  win: boolean;
  gameDuration: number;
  gameMode: string;
  teamPosition: string;
  cs?: number;
  vision?: number;
  DD_VERSION: string;
  items?: number[];
}

export default function MatchHistoryRow({
  championName,
  kills,
  deaths,
  assists,
  win,
  gameDuration,
  gameMode,
  teamPosition,
  cs = 0,
  vision = 0,
  DD_VERSION,
  items = [],
}: Props) {
  const minutes = Math.floor(gameDuration / 60);
  const seconds = gameDuration % 60;
  const kda = deaths === 0 ? 'Perfect' : ((kills + assists) / deaths).toFixed(2);
  const kdaNum = deaths === 0 ? 99 : (kills + assists) / deaths;
  const kdaColor =
    kdaNum >= 5 ? 'text-[#F0C040]' :
    kdaNum >= 3 ? 'text-[#68D391]' :
    kdaNum >= 2 ? 'text-[#A0AEC0]' : 'text-[#FC8181]';
  const posLabel = POSITION_LABEL[teamPosition] ?? (gameMode === 'ARAM' ? 'ARAM' : gameMode);

  return (
    <div
      className={`group flex items-center gap-4 rounded-xl px-4 py-3 border-l-[4px] transition-all duration-200 ${
        win
          ? 'bg-[#0D1E35]/80 border-l-[#3B82F6] hover:bg-[#101E35] border-y border-r border-[#1E3A5F]'
          : 'bg-[#1E0D0D]/80 border-l-[#EF4444] hover:bg-[#1E1010] border-y border-r border-[#3D1414]'
      }`}
    >
      {/* Info básica + Campeão */}
      <div className="flex items-center gap-3 min-w-[140px]">
        <div className="relative flex-shrink-0">
          <Image
            src={`https://ddragon.leagueoflegends.com/cdn/${DD_VERSION}/img/champion/${championName}.png`}
            width={48}
            height={48}
            alt={championName}
            className="rounded-xl border-2 border-[#1E3A5F] object-cover"
          />
          <span
            className={`absolute -bottom-1 -right-1 text-[10px] font-black px-1.5 py-0.5 rounded shadow-lg ${
              win ? 'bg-[#3B82F6] text-white' : 'bg-[#EF4444] text-white'
            }`}
          >
            {win ? 'V' : 'D'}
          </span>
        </div>
        <div className="overflow-hidden">
          <p className="text-white text-sm font-bold truncate leading-none">{championName}</p>
          <p className="text-[#718096] text-[11px] mt-1 font-medium">{posLabel}</p>
        </div>
      </div>

      {/* KDA */}
      <div className="w-24 text-center">
        <p className="text-white text-base font-black tracking-tighter">
          <span>{kills}</span>
          <span className="text-[#4A5568] mx-1">/</span>
          <span className="text-[#EF4444]">{deaths}</span>
          <span className="text-[#4A5568] mx-1">/</span>
          <span className="text-[#A0AEC0]">{assists}</span>
        </p>
        <p className={`text-[11px] font-bold mt-0.5 ${kdaColor}`}>
          {kda === 'Perfect' ? '⭐ PERFECT' : `${kda} KDA`}
        </p>
      </div>

      {/* Items */}
      <div className="flex-1 flex gap-1 justify-center">
        {items.map((id, idx) => (
          <div key={idx} className="w-8 h-8 rounded-md bg-black/40 border border-[#1E3A5F] overflow-hidden">
            {id > 0 && (
              <img
                src={`https://ddragon.leagueoflegends.com/cdn/${DD_VERSION}/img/item/${id}.png`}
                alt={`Item ${id}`}
                className="w-full h-full object-cover"
              />
            )}
          </div>
        ))}
      </div>

      {/* CS + Visão */}
      <div className="text-center hidden md:block w-20 flex-shrink-0">
        <p className="text-[#A0AEC0] text-sm font-bold">{cs} CS</p>
        <p className="text-[#718096] text-[11px] font-medium">({(cs / (gameDuration / 60)).toFixed(1)}/m)</p>
      </div>

      {/* Duração */}
      <div className="text-right flex-shrink-0 w-16">
        <p className="text-white text-sm font-bold">
          {minutes}:{seconds.toString().padStart(2, '0')}
        </p>
        <p className="text-[#4A5568] text-[11px] font-black mt-0.5 truncate uppercase tracking-tighter">{gameMode}</p>
      </div>
    </div>
  );
}
