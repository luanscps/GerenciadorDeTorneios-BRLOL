'use client';
import { useState, useCallback } from 'react';
import { enviarConvite } from '@/lib/actions/roster';

const ROLE_LABELS: Record<string, string> = {
  TOP: 'Top',
  JUNGLE: 'Jungle',
  MID: 'Mid',
  ADC: 'ADC',
  SUPPORT: 'Suporte',
};

const TIER_COLORS: Record<string, string> = {
  IRON: 'text-gray-400', BRONZE: 'text-amber-700', SILVER: 'text-gray-300',
  GOLD: 'text-yellow-400', PLATINUM: 'text-teal-400', EMERALD: 'text-emerald-400',
  DIAMOND: 'text-blue-400', MASTER: 'text-purple-400', GRANDMASTER: 'text-red-400',
  CHALLENGER: 'text-yellow-300', UNRANKED: 'text-gray-500',
};

interface PlayerResult {
  id:           string;   // players.id
  profileId:    string;   // profiles.id — usado no convite
  summonerName: string;
  tagLine:      string;
  role:         string | null;
  tier:         string;
  rank:         string;
  lp:           number;
  hasTeam:      boolean;
}

interface InvitePlayerFormProps {
  teamId:        string;
  currentCount:  number;
  onInviteSent?: () => void;
}

export default function InvitePlayerForm({ teamId, currentCount, onInviteSent }: InvitePlayerFormProps) {
  const [query, setQuery]         = useState('');
  const [results, setResults]     = useState<PlayerResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected]   = useState<PlayerResult | null>(null);
  const [role, setRole]           = useState('TOP');
  const [sending, setSending]     = useState(false);
  const [feedback, setFeedback]   = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const handleSearch = useCallback(async () => {
    if (query.trim().length < 2) return;
    setSearching(true);
    setResults([]);
    setSelected(null);
    setFeedback(null);
    try {
      const res  = await fetch(`/api/jogadores/buscar?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
    } catch {
      setFeedback({ type: 'error', msg: 'Erro ao buscar jogadores.' });
    } finally {
      setSearching(false);
    }
  }, [query]);

  async function handleSendInvite() {
    if (!selected) return;
    if (!selected.profileId) {
      setFeedback({ type: 'error', msg: 'Jogador não possui conta vinculada no sistema.' });
      return;
    }
    setSending(true);
    setFeedback(null);
    const result = await enviarConvite({
      teamId,
      profileId: selected.profileId, // sistema novo — usa profile_id
      role,
    });
    setSending(false);
    if (result.error) {
      setFeedback({ type: 'error', msg: result.error });
    } else {
      setFeedback({ type: 'success', msg: `Convite enviado para ${selected.summonerName}#${selected.tagLine}!` });
      setQuery('');
      setResults([]);
      setSelected(null);
      onInviteSent?.();
    }
  }

  const isFull = currentCount >= 5;

  return (
    <div className="bg-[#0A1628] border border-[#1E3A5F] rounded-xl p-4 space-y-4">
      <h3 className="text-white font-semibold text-sm">📨 Convidar Jogador</h3>

      {isFull ? (
        <p className="text-yellow-400 text-sm text-center py-2">
          ⚠️ Time completo (5/5). Remova um jogador para convidar.
        </p>
      ) : (
        <>
          {/* Campo de busca */}
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Nome#TAG  (ex: Faker#KR1)"
              className="flex-1 bg-[#0D1E35] border border-[#1E3A5F] text-white text-sm rounded-lg px-3 py-2 placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
            />
            <button
              onClick={handleSearch}
              disabled={searching || query.trim().length < 2}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              {searching ? '...' : 'Buscar'}
            </button>
          </div>

          {/* Resultados da busca */}
          {results.length > 0 && (
            <div className="space-y-1 max-h-52 overflow-y-auto">
              {results.map(p => {
                const tierColor  = TIER_COLORS[p.tier?.toUpperCase()] ?? 'text-gray-400';
                const isSelected = selected?.profileId === p.profileId;
                return (
                  <button
                    key={p.profileId}
                    onClick={() => { setSelected(isSelected ? null : p); setRole(p.role ?? 'TOP'); }}
                    disabled={p.hasTeam}
                    className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors ${
                      isSelected
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-[#1E3A5F] bg-[#0D1E35] hover:border-blue-500/50'
                    } ${p.hasTeam ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="w-8 h-8 rounded-full bg-[#1E2A3A] border border-[#1E3A5F] flex items-center justify-center text-xs font-bold text-gray-400">
                      {(p.role ?? '?').slice(0, 1)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {p.summonerName}
                        <span className="text-gray-500 font-normal"> #{p.tagLine}</span>
                      </p>
                      <p className={`text-xs ${tierColor}`}>
                        {p.tier} {p.rank} · {p.lp} LP
                        {p.hasTeam && <span className="text-yellow-500 ml-2">(já tem time)</span>}
                      </p>
                    </div>
                    {isSelected && (
                      <span className="text-blue-400 text-xs font-semibold">✓ Selecionado</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {results.length === 0 && !searching && query.length >= 2 && (
            <p className="text-gray-500 text-xs text-center py-2">
              Nenhum jogador encontrado. Tente outro nick.
            </p>
          )}

          {/* Seleção de role + enviar */}
          {selected && (
            <div className="flex items-center gap-3 pt-1">
              <div className="flex-1">
                <p className="text-gray-400 text-xs mb-1">Posição para o convite</p>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  className="w-full bg-[#0D1E35] border border-[#1E3A5F] text-gray-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                >
                  {Object.entries(ROLE_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleSendInvite}
                disabled={sending}
                className="mt-5 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white text-sm font-bold px-5 py-2 rounded-lg transition-colors"
              >
                {sending ? 'Enviando...' : 'Enviar Convite'}
              </button>
            </div>
          )}

          {/* Feedback */}
          {feedback && (
            <p className={`text-xs font-medium px-3 py-2 rounded-lg ${
              feedback.type === 'success'
                ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                : 'bg-red-500/10 text-red-400 border border-red-500/30'
            }`}>
              {feedback.type === 'success' ? '✅' : '❌'} {feedback.msg}
            </p>
          )}
        </>
      )}
    </div>
  );
}
