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
      className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 border-l-[3px] transition-colors ${
        win
          ? 'bg-[#0D1E35] border-l-[#3B82F6] hover:bg-[#101E35]'
          : 'bg-[#1E0D0D] border-l-[#EF4444] hover:bg-[#1E1010]'
      }`}
    >
      {/* Ícone campeão */}
      <div className="relative flex-shrink-0">
        <Image
          src={`https://ddragon.leagueoflegends.com/cdn/${DD_VERSION}/img/champion/${championName}.png`}
          width={44}
          height={44}
          alt={championName}
          className="rounded-full border-2 border-[#1E3A5F] object-cover"
        />
        {/* Badge W/D */}
        <span
          className={`absolute -bottom-1 -right-1 text-[9px] font-extrabold px-1 rounded ${
            win ? 'bg-[#3B82F6] text-white' : 'bg-[#EF4444] text-white'
          }`}
        >
          {win ? 'V' : 'D'}
        </span>
      </div>

      {/* Campeão + Lane */}
      <div className="w-[90px] flex-shrink-0">
        <p className="text-white text-xs font-semibold truncate leading-none">{championName}</p>
        <p className="text-[#718096] text-[10px] mt-0.5">{posLabel}</p>
      </div>

      {/* KDA */}
      <div className="flex-1 text-center">
        <p className="text-white text-sm font-bold tracking-wide">
          <span className="text-[#68D391]">{kills}</span>
          <span className="text-[#718096] mx-0.5">/</span>
          <span className="text-[#FC8181]">{deaths}</span>
          <span className="text-[#718096] mx-0.5">/</span>
          <span className="text-[#A0AEC0]">{assists}</span>
        </p>
        <p className={`text-[10px] font-semibold mt-0.5 ${kdaColor}`}>
          {kda === 'Perfect' ? '⭐ Perfect' : `${kda} KDA`}
        </p>
      </div>

      {/* CS + Visão */}
      <div className="text-center hidden sm:block w-16 flex-shrink-0">
        <p className="text-[#A0AEC0] text-xs font-medium">{cs} CS</p>
        <p className="text-[#718096] text-[10px]">{vision} vis</p>
      </div>

      {/* Duração */}
      <div className="text-right flex-shrink-0 w-12">
        <p className="text-[#A0AEC0] text-xs">
          {minutes}:{seconds.toString().padStart(2, '0')}
        </p>
        <p className="text-[#4A5568] text-[10px] mt-0.5 truncate">{gameMode}</p>
      </div>
    </div>
  );
}
