'use client';
import React from 'react';
import { rankEmblemUrl } from '@/lib/riot';

interface Props {
  summonerName: string;
  tagLine: string;
  profileIconId: number;
  summonerLevel: number;
  DD_VERSION: string;
}

export default function ProfileHeader({ summonerName, tagLine, profileIconId, summonerLevel, DD_VERSION }: Props) {
  return (
    <div className="flex items-end gap-6">
      {/* Avatar com moldura de nível */}
      <div className="relative flex-shrink-0 group">
        <div className="w-32 h-32 rounded-3xl border-4 border-[#C89B3C] overflow-hidden shadow-2xl shadow-black relative z-10 bg-[#0A0E17]">
          <img
            src={`https://ddragon.leagueoflegends.com/cdn/${DD_VERSION}/img/profileicon/${profileIconId}.png`}
            alt={summonerName}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        </div>
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-[#C89B3C] text-[#0A0E17] text-xs font-black px-4 py-1 rounded-full shadow-xl z-20 border-2 border-[#0A0E17] tracking-tighter">
          LVL {summonerLevel}
        </div>
      </div>

      {/* Nome + tag */}
      <div className="pb-4">
        <div className="flex items-baseline gap-3">
          <h1 className="text-white font-black text-5xl leading-none tracking-tighter drop-shadow-lg">
            {summonerName}
          </h1>
          <span className="text-[#718096] font-bold text-2xl tracking-tight opacity-80">#{tagLine}</span>
        </div>
        <div className="flex items-center gap-2 mt-2">
           <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
           <p className="text-[#A0AEC0] text-sm font-bold uppercase tracking-widest">BR1 · Perfil Verificado</p>
        </div>
      </div>
    </div>
  );
}
