'use client';
import React, { useEffect, useState } from 'react';

const TIER_COLORS: Record<string, string> = {
  CHALLENGER:  '#F4D03F',
  GRANDMASTER: '#E74C3C',
  MASTER:      '#9B59B6',
  DIAMOND:     '#5DADE2',
  EMERALD:     '#2ECC71',
  PLATINUM:    '#17A589',
  GOLD:        '#D4AC0D',
  SILVER:      '#AAB7B8',
  BRONZE:      '#CA6F1E',
  IRON:        '#839192',
  UNRANKED:    '#566573',
};

interface Jogador {
  id: string;
  summonerName: string;
  tagLine: string;
  role: string | null;
  tier: string | null;
  rank: string | null;
  lp: number;
  wins: number;
  losses: number;
  createdAt: string;
  teamName: string | null;
  teamTag: string | null;
}

export default function AdminJogadoresPage() {
  const [jogadores, setJogadores] = useState<Jogador[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');

  useEffect(() => {
    fetch('/api/admin/jogadores')
      .then((r) => r.json())
      .then((data: Jogador[]) => {
        setJogadores(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = jogadores.filter((j) =>
    j.summonerName.toLowerCase().includes(search.toLowerCase()) ||
    (j.teamName ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Gerenciamento de Jogadores</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {loading ? 'Carregando...' : `${jogadores.length} jogador${jogadores.length !== 1 ? 'es' : ''} cadastrado${jogadores.length !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Buscar por nome ou time..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-[#1E2A3A] border border-[#1E3A5F] text-white px-4 py-2 rounded-lg w-full md:w-80 text-sm"
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-14 rounded-lg bg-[#1E2A3A] animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🎮</p>
          <p className="text-gray-500 text-sm">
            {search ? `Nenhum jogador encontrado para "${search}"` : 'Nenhum jogador cadastrado ainda.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-gray-400 border-b border-[#1E3A5F]">
                <th className="pb-3 pr-4">Jogador</th>
                <th className="pb-3 pr-4">Time</th>
                <th className="pb-3 pr-4">Papel</th>
                <th className="pb-3 pr-4">Rank</th>
                <th className="pb-3 pr-4">W/L</th>
                <th className="pb-3">Cadastro</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((j) => {
                const total = (j.wins ?? 0) + (j.losses ?? 0);
                const wr    = total > 0 ? Math.round(((j.wins ?? 0) / total) * 100) : null;
                const tierColor = TIER_COLORS[(j.tier ?? 'UNRANKED').toUpperCase()] ?? '#566573';

                return (
                  <tr key={j.id} className="border-b border-[#1E3A5F]/40 hover:bg-[#1E2A3A]/40 transition-colors">
                    {/* Jogador */}
                    <td className="py-3 pr-4">
                      <p className="text-white font-medium leading-tight">{j.summonerName}</p>
                      <p className="text-gray-500 text-xs mt-0.5">#{j.tagLine}</p>
                    </td>

                    {/* Time — resolvido via team_members */}
                    <td className="py-3 pr-4">
                      {j.teamName ? (
                        <span className="text-gray-300 font-medium">
                          {j.teamName}
                          {j.teamTag && (
                            <span className="text-gray-500 text-xs ml-1">[{j.teamTag}]</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-gray-600 text-xs italic">Sem time</span>
                      )}
                    </td>

                    {/* Papel */}
                    <td className="py-3 pr-4 text-gray-300 capitalize">
                      {j.role ?? <span className="text-gray-600">—</span>}
                    </td>

                    {/* Rank */}
                    <td className="py-3 pr-4">
                      <span className="font-semibold" style={{ color: tierColor }}>
                        {j.tier ?? 'UNRANKED'} {j.rank ?? ''}
                      </span>
                      <span className="text-gray-500 text-xs ml-1">{j.lp ?? 0} LP</span>
                    </td>

                    {/* W/L */}
                    <td className="py-3 pr-4">
                      <span className="text-white tabular-nums">{j.wins ?? 0}W/{j.losses ?? 0}L</span>
                      {wr !== null && (
                        <span className={`ml-1.5 text-xs font-semibold ${
                          wr >= 60 ? 'text-green-400' : wr >= 50 ? 'text-blue-400' : 'text-red-400'
                        }`}>{wr}%</span>
                      )}
                    </td>

                    {/* Cadastro */}
                    <td className="py-3 text-gray-500 text-xs">
                      {new Date(j.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filtered.length > 0 && (
            <p className="text-gray-600 text-xs text-right mt-3">
              {filtered.length} jogador{filtered.length !== 1 ? 'es' : ''} exibido{filtered.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
