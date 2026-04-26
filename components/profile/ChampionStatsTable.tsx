import Image from 'next/image';

interface ChampStat {
  name: string;
  games: number;
  wr: number;
  kda: string;
  kills: number;
  deaths: number;
  assists: number;
}

interface Props {
  champions: ChampStat[];
  DD_VERSION: string;
}

export default function ChampionStatsTable({ champions, DD_VERSION }: Props) {
  if (!champions.length) {
    return (
      <div className="bg-[#0D1421] border border-[#1E2D45] rounded-xl p-4 text-[#4A5568] text-sm text-center">
        Sem dados suficientes.
      </div>
    );
  }

  return (
    <div className="bg-[#0D1421] border border-[#1E2D45] rounded-xl overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-[#1E2D45]">
            <th className="text-left text-[#4A5568] font-semibold uppercase tracking-widest py-2 px-3">Campeão</th>
            <th className="text-center text-[#4A5568] font-semibold uppercase tracking-widest py-2 px-2">Jogos</th>
            <th className="text-center text-[#4A5568] font-semibold uppercase tracking-widest py-2 px-2">WR</th>
            <th className="text-center text-[#4A5568] font-semibold uppercase tracking-widest py-2 px-2">KDA</th>
          </tr>
        </thead>
        <tbody>
          {champions.map((c, i) => {
            const wrColor =
              c.wr >= 60 ? 'text-[#F6AD55]' :
              c.wr >= 50 ? 'text-[#68D391]' : 'text-[#FC8181]';
            const kdaNum = parseFloat(c.kda);
            const kdaColor =
              c.kda === 'Perfect' || kdaNum >= 5 ? 'text-[#F0C040]' :
              kdaNum >= 3 ? 'text-[#68D391]' :
              kdaNum >= 2 ? 'text-[#A0AEC0]' : 'text-[#FC8181]';
            return (
              <tr
                key={c.name}
                className={`border-b border-[#1A2535] hover:bg-[#111B2E] transition-colors ${
                  i === champions.length - 1 ? 'border-b-0' : ''
                }`}
              >
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-2">
                    <Image
                      src={`https://ddragon.leagueoflegends.com/cdn/${DD_VERSION}/img/champion/${c.name}.png`}
                      width={28}
                      height={28}
                      alt={c.name}
                      className="rounded border border-[#1E3A5F]"
                    />
                    <span className="text-[#E2E8F0] font-medium truncate max-w-[80px]">{c.name}</span>
                  </div>
                </td>
                <td className="text-center text-[#A0AEC0] py-2.5 px-2">{c.games}</td>
                <td className={`text-center font-bold py-2.5 px-2 ${wrColor}`}>{c.wr}%</td>
                <td className={`text-center font-semibold py-2.5 px-2 ${kdaColor}`}>
                  {c.kda === 'Perfect' ? '∞' : c.kda}
                  <div className="text-[#4A5568] font-normal">
                    {c.kills}/{c.deaths}/{c.assists}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
