'use client';
import React from 'react';

interface Props {
  summonerName: string;
  tagLine: string;
  profileIconId: number;
  summonerLevel: number;
  DD_VERSION: string;
}

const RANK_ICONS: Record<string, string> = {
  IRON: '⬛',
  BRONZE: '🟫',
  SILVER: '🔘',
  GOLD: '🟡',
  PLATINUM: '🩵',
  EMERALD: '💚',
  DIAMOND: '💠',
  MASTER: '🔮',
  GRANDMASTER: '🔴',
  CHALLENGER: '🏆',
};

export default function ProfileHeader({ summonerName, tagLine, profileIconId, summonerLevel, DD_VERSION }: Props) {
  return (
    <div className="flex items-end gap-5">
      {/* Avatar com nível */}
      <div className="relative flex-shrink-0">
        <div className="w-20 h-20 rounded-full border-[3px] border-[#C89B3C] overflow-hidden shadow-lg shadow-black/60">
          <img
            src={`https://ddragon.leagueoflegends.com/cdn/${DD_VERSION}/img/profileicon/${profileIconId}.png`}
            alt={summonerName}
            width={80}
            height={80}
            className="w-full h-full object-cover"
          />
        </div>
        <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#C89B3C] text-[#0A0E17] text-[10px] font-black px-2 py-0.5 rounded-full shadow">
          {summonerLevel}
        </span>
      </div>

      {/* Nome + tag */}
      <div className="pb-2">
        <div className="flex items-baseline gap-2">
          <h1 className="text-white font-extrabold text-2xl leading-none tracking-tight">
            {summonerName}
          </h1>
          <span className="text-[#718096] font-semibold text-base">#{tagLine}</span>
        </div>
        <p className="text-[#4A5568] text-xs mt-1 uppercase tracking-widest">Perfil do Jogador · BR1</p>
      </div>
    </div>
  );
}
