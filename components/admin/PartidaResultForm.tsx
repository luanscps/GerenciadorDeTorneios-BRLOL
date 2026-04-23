'use client';

import { useState, useTransition } from 'react';
import { editarResultadoPartida } from '@/lib/actions/partida';

const CHAMPIONS = [
  'Ahri','Akali','Alistar','Amumu','Anivia','Annie','Ashe','Azir',
  'Blitzcrank','Brand','Braum','Caitlyn','Camille','Darius','Diana',
  'Draven','Ekko','Elise','Ezreal','Fiora','Fizz','Gangplank','Garen',
  'Gragas','Graves','Hecarim','Irelia','Janna','Jarvan IV','Jax',
  'Jayce','Jinx','Kalista','Karma','Karthus','Kassadin','Katarina',
  'Kennen','KhaZix','Kindred','Leblanc','Lee Sin','Leona','Lissandra',
  'Lucian','Lulu','Lux','Malphite','Morgana','Nami','Nautilus',
  'Nidalee','Nilah','Nocturne','Nunu','Olaf','Orianna','Pantheon',
  'Poppy','Pyke','Qiyana','Quinn','Rakan','Rammus','RekSai','Renata',
  'Renekton','Riven','Rumble','Ryze','Sejuani','Senna','Seraphine',
  'Sett','Sivir','Sona','Soraka','Swain','Sylas','Syndra','Taliyah',
  'Talon','Thresh','Tristana','Tryndamere','Twisted Fate','Twitch',
  'Urgot','Vayne','Veigar','Viktor','Vladmir','Warwick','Xayah',
  'Xerath','Yasuo','Yone','Yuumi','Zed','Ziggs','Zilean','Zoe','Zyra',
];

type PickBan = { champion: string; type: 'pick' | 'ban'; team: 'A' | 'B'; order: number };

interface Props {
  matchId: string;
  tournamentId: string;
  teamAId: string;
  teamAName: string;
  teamBId: string;
  teamBName: string;
  currentWinnerId?: string;
  currentScoreA?: number;
  currentScoreB?: number;
}

export function PartidaResultForm({
  matchId, tournamentId,
  teamAId, teamAName,
  teamBId, teamBName,
  currentWinnerId, currentScoreA, currentScoreB,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [picksBans, setPicksBans] = useState<PickBan[]>([]);
  const [showPicksBans, setShowPicksBans] = useState(false);
  const [success, setSuccess] = useState(false);

  const inputClass = 'w-full bg-[#0D1B2E] border border-[#1E3A5F] rounded px-2 py-1 text-white text-sm text-center focus:border-[#C8A84B] outline-none';
  const selectClass = 'w-full bg-[#0D1B2E] border border-[#1E3A5F] rounded px-2 py-1 text-white text-xs focus:border-[#C8A84B] outline-none';

  function addPickBan(type: 'pick' | 'ban', team: 'A' | 'B') {
    const order = picksBans.length + 1;
    setPicksBans(prev => [...prev, { champion: '', type, team, order }]);
  }

  function updatePickBan(index: number, champion: string) {
    setPicksBans(prev => prev.map((pb, i) => i === index ? { ...pb, champion } : pb));
  }

  function removePickBan(index: number) {
    setPicksBans(prev => prev.filter((_, i) => i !== index).map((pb, i) => ({ ...pb, order: i + 1 })));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.append('picks_bans', JSON.stringify(picksBans.filter(pb => pb.champion)));
    startTransition(() => {
      void (async () => {
        const res = await editarResultadoPartida(matchId, tournamentId, fd);
        if (res && 'error' in res) {
          alert(res.error);
        } else {
          setSuccess(true);
        }
      })();
    });
  }

  if (success) {
    return (
      <div className="bg-[#0A1428] rounded p-4 text-center">
        <p className="text-green-400 font-bold text-sm">✅ Resultado salvo com sucesso!</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-[#0A1428] rounded p-4 space-y-4">
      {/* Placar */}
      <div className="grid grid-cols-3 items-center gap-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">{teamAName}</label>
          <input name="score_a" type="number" min={0} max={99}
            defaultValue={currentScoreA ?? 0} className={inputClass} />
        </div>
        <p className="text-gray-500 text-center text-lg font-bold">VS</p>
        <div>
          <label className="block text-xs text-gray-400 mb-1">{teamBName}</label>
          <input name="score_b" type="number" min={0} max={99}
            defaultValue={currentScoreB ?? 0} className={inputClass} />
        </div>
      </div>

      {/* Vencedor */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Vencedor</label>
        <select name="winner_team_id" defaultValue={currentWinnerId ?? ''} required className={selectClass}>
          <option value="">Selecione o vencedor</option>
          <option value={teamAId}>{teamAName}</option>
          <option value={teamBId}>{teamBName}</option>
        </select>
      </div>

      {/* Picks & Bans */}
      <div>
        <button type="button" onClick={() => setShowPicksBans(v => !v)}
          className="text-xs text-[#C8A84B] hover:underline flex items-center gap-1">
          {showPicksBans ? '▲' : '▼'} Picks &amp; Bans ({picksBans.length} registrados)
        </button>

        {showPicksBans && (
          <div className="mt-3 space-y-3">
            {/* Botoes para adicionar */}
            <div className="flex flex-wrap gap-2">
              {(['A', 'B'] as const).map(team => (
                <div key={team} className="flex gap-1">
                  <button type="button"
                    onClick={() => addPickBan('pick', team)}
                    className="text-xs bg-[#1E3A5F] hover:bg-[#2a4f7a] text-green-400 px-2 py-1 rounded">
                    + Pick {team === 'A' ? teamAName : teamBName}
                  </button>
                  <button type="button"
                    onClick={() => addPickBan('ban', team)}
                    className="text-xs bg-[#1E3A5F] hover:bg-[#2a4f7a] text-red-400 px-2 py-1 rounded">
                    + Ban {team === 'A' ? teamAName : teamBName}
                  </button>
                </div>
              ))}
            </div>

            {/* Lista de picks/bans */}
            {picksBans.length > 0 && (
              <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                {picksBans.map((pb, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className={`text-xs font-bold w-8 ${pb.type === 'pick' ? 'text-green-400' : 'text-red-400'}`}>
                      {pb.type === 'pick' ? 'PICK' : 'BAN'}
                    </span>
                    <span className="text-xs text-gray-400 w-16 truncate">
                      {pb.team === 'A' ? teamAName : teamBName}
                    </span>
                    <select value={pb.champion} onChange={e => updatePickBan(i, e.target.value)}
                      className="flex-1 bg-[#0D1B2E] border border-[#1E3A5F] rounded px-1 py-0.5 text-white text-xs focus:border-[#C8A84B] outline-none">
                      <option value="">-- Campeao --</option>
                      {CHAMPIONS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <button type="button" onClick={() => removePickBan(i)}
                      className="text-red-500 hover:text-red-300 text-xs px-1">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Submit */}
      <button type="submit" disabled={pending}
        className="w-full py-2 bg-[#C8A84B] hover:bg-[#E5C668] text-black font-bold text-sm rounded transition-colors disabled:opacity-50">
        {pending ? 'Salvando...' : 'Salvar Resultado'}
      </button>
    </form>
  );
}
