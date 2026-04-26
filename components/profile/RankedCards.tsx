import React from 'react';

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
  BRONZE:      'from-[#1a1008] to-[#2a1a0a]',
  SILVER:      'from-[#10141a] to-[#1a2230]',
  GOLD:        'from-[#1a1500] to-[#2a2100]',
  PLATINUM:    'from-[#001a1a] to-[#002a2a]',
  EMERALD:     'from-[#001a0a] to-[#002a10]',
  DIAMOND:     'from-[#000f1a] to-[#001828]',
  MASTER:      'from-[#100020] to-[#180030]',
  GRANDMASTER: 'from-[#1a0000] to-[#2a0000]',
  CHALLENGER:  'from-[#1a1200] to-[#2a1e00]',
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
      <div className="flex-1 bg-[#0D1421] border border-[#1E2D45] rounded-xl p-4 flex flex-col gap-1">
        <p className="text-[#4A5568] text-xs uppercase tracking-widest">{label}</p>
        <p className="text-[#4A5568] text-sm mt-1">Sem classificação</p>
      </div>
    );
  }

  const total = data.wins + data.losses;
  const wr = total > 0 ? Math.round((data.wins / total) * 100) : 0;
  const grad = TIER_GRADIENT[data.tier] ?? 'from-[#0D1421] to-[#1a2235]';
  const accent = TIER_ACCENT[data.tier] ?? 'border-[#1E2D45]';
  const textColor = TIER_TEXT[data.tier] ?? 'text-white';
  const wrColor = wr >= 55 ? 'text-[#F6AD55]' : wr >= 50 ? 'text-[#68D391]' : 'text-[#FC8181]';

  return (
    <div className={`flex-1 bg-gradient-to-br ${grad} border ${accent} rounded-xl p-4`}>
      <p className="text-[#718096] text-xs uppercase tracking-widest mb-2">{label}</p>
      <div className="flex items-center gap-3">
        {/* Emblema texto tier */}
        <div className="w-12 h-12 rounded-full bg-black/30 flex items-center justify-center border border-current/20">
          <span className="text-xl">
            {data.tier === 'CHALLENGER' ? '🏆' :
             data.tier === 'GRANDMASTER' ? '🔴' :
             data.tier === 'MASTER' ? '🔮' :
             data.tier === 'DIAMOND' ? '💠' :
             data.tier === 'EMERALD' ? '💚' :
             data.tier === 'PLATINUM' ? '🩵' :
             data.tier === 'GOLD' ? '🥇' :
             data.tier === 'SILVER' ? '🥈' :
             data.tier === 'BRONZE' ? '🥉' : '⬛'}
          </span>
        </div>
        <div>
          <p className={`font-extrabold text-base leading-none ${textColor}`}>
            {data.tier} {data.rank}
          </p>
          <p className="text-[#A0AEC0] text-sm mt-0.5">{data.lp} LP</p>
        </div>
      </div>
      {/* Winrate bar */}
      <div className="mt-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-[#718096]">{data.wins}V {data.losses}D</span>
          <span className={`font-bold ${wrColor}`}>{wr}% WR</span>
        </div>
        <div className="h-1.5 bg-[#1E2D45] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              wr >= 55 ? 'bg-[#F6AD55]' : wr >= 50 ? 'bg-[#68D391]' : 'bg-[#FC8181]'
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
    <div className="flex flex-col sm:flex-row gap-3">
      <RankedCard data={rankedSolo} label="Solo / Duo" />
      <RankedCard data={rankedFlex} label="Flex 5v5" />
    </div>
  );
}
