'use client';

import React from 'react';

interface Props {
  teamName: string;
  players: any[];
  side: 'blue' | 'red';
  playersInLobby: string[]; // PUUIDs ou SummonerIds (depende do retorno da Riot API)
}

export default function MatchLobbyCard({ teamName, players, side, playersInLobby }: Props) {
  const isBlue = side === 'blue';

  return (
    <div className={`rounded-2xl border-2 overflow-hidden bg-[#0D1421]/60 backdrop-blur-sm ${
      isBlue ? 'border-blue-500/20' : 'border-red-500/20'
    }`}>
      <div className={`px-4 py-3 flex items-center justify-between ${
        isBlue ? 'bg-blue-500/10' : 'bg-red-500/10'
      }`}>
        <h4 className="font-black italic uppercase tracking-tighter text-sm">{teamName}</h4>
        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
          isBlue ? 'bg-blue-500/20 text-blue-400' : 'bg-red-500/20 text-red-400'
        }`}>
          LADO {isBlue ? 'AZUL' : 'VERMELHO'}
        </span>
      </div>

      <div className="p-2 space-y-1">
        {players.map((player) => {
          // A Riot API no Lobby Events geralmente retorna o summonerId criptografado ou PUUID.
          // Aqui precisaríamos de um mapeamento, mas por enquanto vamos simular.
          const isInLobby = playersInLobby.includes(player.summoner_id || player.puuid);

          return (
            <div key={player.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${isInLobby ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-[#1E2D45]'}`} />
                <div>
                  <p className="text-white text-xs font-bold leading-none">{player.summoner_name}</p>
                  <p className="text-[#4A5568] text-[10px] uppercase font-black tracking-tighter mt-1">{player.role || 'Player'}</p>
                </div>
              </div>
              <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
                isInLobby ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-[#1A2535] text-[#4A5568]'
              }`}>
                {isInLobby ? 'NO LOBBY' : 'OFFLINE'}
              </span>
            </div>
          );
        })}

        {/* Placeholder para completar 5 jogadores se necessário */}
        {Array.from({ length: Math.max(0, 5 - players.length) }).map((_, i) => (
          <div key={`empty-${i}`} className="flex items-center justify-between p-2 rounded-lg opacity-30">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-[#1E2D45]" />
              <div className="w-24 h-3 bg-[#1E2D45] rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
