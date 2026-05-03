import React from 'react';
import { rankEmblemUrl } from '@/lib/riot';

interface RankedData {
  tier: string;
  rank: string;
  lp: number;
  wins: number;
  losses: number;
}

interface Props {
  rankedSolo?: RankedData;
  rankedFlex?: RankedData;
}

const TIER_GRADIENT: Record<string, string> = {
  IRON:        'from-[#1a1a1a] to-[#2a2a2a]',
  BRONZE:      'from-[#3c2a1e] to-[#1a0f08]',
  SILVER:      'from-[#3c4c5c] to-[#1a222a]',
  GOLD:        'from-[#4c3c1a] to-[#2a1e08]',
  PLATINUM:    'from-[#1a4c4c] to-[#082a2a]',
  EMERALD:     'from-[#1a4c2a] to-[#082a10]',
  DIAMOND:     'from-[#1a3c5c] to-[#081a2a]',
  MASTER:      'from-[#3c1a5c] to-[#1a082a]',
  GRANDMASTER: 'from-[#5c1a1a] to-[#2a0808]',
  CHALLENGER:  'from-[#5c4c1a] to-[#2a1e08]',
};

const TIER_ACCENT: Record<string, string> = {
  IRON:        'border-[#595959]',
  BRONZE:      'border-[#8B4513]',
  SILVER:      'border-[#9AA4B2]',
  GOLD:        'border-[#C89B3C]',
  PLATINUM:    'border-[#4FC3B0]',
  EMERALD:     'border-[#52D08A]',
  DIAMOND:     'border-[#5CC3F0]',
  MASTER:      'border-[#A35EE8]',
  GRANDMASTER: 'border-[#E84040]',
  CHALLENGER:  'border-[#F0C040]',
};

const TIER_TEXT: Record<string, string> = {
  IRON:        'text-[#9AA4B2]',
  BRONZE:      'text-[#CD853F]',
  SILVER:      'text-[#C0CDD8]',
  GOLD:        'text-[#C89B3C]',
  PLATINUM:    'text-[#4FC3B0]',
  EMERALD:     'text-[#52D08A]',
  DIAMOND:     'text-[#5CC3F0]',
  MASTER:      'text-[#A35EE8]',
  GRANDMASTER: 'text-[#E84040]',
  CHALLENGER:  'text-[#F0C040]',
};

function RankedCard({ data, label }: { data?: RankedData; label: string }) {
  if (!data) {
    return (
      <div className="flex-1 bg-[#0D1421] border border-[#1E2D45] rounded-2xl p-5 flex flex-col justify-center items-center gap-2 opacity-50 grayscale">
        <p className="text-[#4A5568] text-xs font-black uppercase tracking-tighter">{label}</p>
        <p className="text-[#4A5568] text-sm font-bold mt-1 italic">Sem classificação</p>
      </div>
    );
  }

  const total = data.wins + data.losses;
  const wr = total > 0 ? Math.round((data.wins / total) * 100) : 0;
  const grad = TIER_GRADIENT[data.tier] ?? 'from-[#0D1421] to-[#1a2235]';
  const accent = TIER_ACCENT[data.tier] ?? 'border-[#1E2D45]';
  const textColor = TIER_TEXT[data.tier] ?? 'text-white';
  const wrColor = wr >= 55 ? 'text-[#F6AD55]' : wr >= 50 ? 'text-[#68D391]' : 'text-[#FC8181]';
  const emblemUrl = rankEmblemUrl(data.tier);

  return (
    <div className={`flex-1 bg-gradient-to-br ${grad} border-2 ${accent} rounded-2xl p-5 shadow-2xl relative overflow-hidden group`}>
      <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
         <p className="text-4xl font-black italic">{data.tier[0]}</p>
      </div>

      <p className="text-[#A0AEC0] text-[10px] font-black uppercase tracking-widest mb-4 opacity-70">{label}</p>
      <div className="flex items-center gap-5 relative z-10">
        {/* Emblema CommunityDragon */}
        <div className="w-20 h-20 flex-shrink-0 drop-shadow-[0_0_15px_rgba(0,0,0,0.5)]">
          <img
            src={emblemUrl}
            alt={data.tier}
            className="w-full h-full object-contain"
          />
        </div>
        <div>
          <p className={`font-black text-2xl leading-none tracking-tighter uppercase ${textColor} drop-shadow`}>
            {data.tier} {data.rank}
          </p>
          <p className="text-white font-bold text-lg mt-1 tracking-tight">{data.lp} <span className="text-xs text-[#718096]">LP</span></p>
        </div>
      </div>

      {/* Winrate stats */}
      <div className="mt-5 relative z-10">
        <div className="flex justify-between text-[11px] font-black uppercase mb-1.5 tracking-tighter">
          <span className="text-[#A0AEC0]">{data.wins}V <span className="mx-1">/</span> {data.losses}D</span>
          <span className={wrColor}>{wr}% Winrate</span>
        </div>
        <div className="h-2 bg-black/40 rounded-full overflow-hidden border border-white/5 shadow-inner">
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(255,255,255,0.2)] ${
              wr >= 55 ? 'bg-gradient-to-r from-orange-400 to-yellow-500' :
              wr >= 50 ? 'bg-gradient-to-r from-green-400 to-emerald-600' :
              'bg-gradient-to-r from-red-500 to-rose-700'
            }`}
            style={{ width: `${wr}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default function RankedCards({ rankedSolo, rankedFlex }: Props) {
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <RankedCard data={rankedSolo} label="Fila Solo / Duo" />
      <RankedCard data={rankedFlex} label="Fila Flex 5v5" />
    </div>
  );
}
