'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import MatchLobbyCard from './MatchLobbyCard';
import TournamentCodeBox from './TournamentCodeBox';

interface Props {
  match: any;
  teamAPlayers: any[];
  teamBPlayers: any[];
  userInMatch: boolean;
}

export default function MatchPageContent({ match, teamAPlayers, teamBPlayers, userInMatch }: Props) {
  const initialCode = match.tournament_code ?? (match.notes?.includes('BR1_')
    ? match.notes.match(/BR1_[A-Z0-9-]+/)?.[0]
    : null);

  const [liveCode, setLiveCode] = useState<string | null>(initialCode);
  const [codeJustArrived, setCodeJustArrived] = useState(false);
  const [lobbyEvents, setLobbyEvents] = useState<any>(null);
  const [loadingEvents, setLoadingEvents] = useState(false);

  // Realtime: escuta UPDATE na match — quando admin salvar o código, atualiza sem reload
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`match-code-${match.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'matches',
          filter: `id=eq.${match.id}`,
        },
        (payload) => {
          const updated = payload.new as any;
          const newCode = updated.tournament_code ?? null;
          if (newCode && newCode !== liveCode) {
            setLiveCode(newCode);
            setCodeJustArrived(true);
            setTimeout(() => setCodeJustArrived(false), 6000);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [match.id, liveCode]);

  // Polling dos eventos de lobby (30s)
  useEffect(() => {
    if (!liveCode) return;

    const fetchEvents = async () => {
      try {
        setLoadingEvents(true);
        const res = await fetch(`/api/riot/tournament/events?code=${liveCode}`);
        if (res.ok) {
          const data = await res.json();
          setLobbyEvents(data);
        }
      } catch (err) {
        console.error('Erro ao buscar eventos de lobby:', err);
      } finally {
        setLoadingEvents(false);
      }
    };

    fetchEvents();
    const interval = setInterval(fetchEvents, 30000);
    return () => clearInterval(interval);
  }, [liveCode]);

  return (
    <main className="min-h-screen bg-[#0A0E17] text-white py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-[#C89B3C] text-xs font-black uppercase tracking-[0.3em] mb-3">
            {match.tournament.name} · Rodada {match.round}
          </p>
          <div className="flex items-center justify-center gap-8 md:gap-16">
            <div className="text-right">
              <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter">{match.team_a.name}</h2>
              <p className="text-[#718096] font-bold text-xl">[{match.team_a.tag}]</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="bg-[#1E2D45] px-6 py-2 rounded-2xl border-2 border-[#C89B3C]/30 shadow-[0_0_20px_rgba(200,155,60,0.1)]">
                <span className="text-4xl font-black tabular-nums">{match.score_a || 0} - {match.score_b || 0}</span>
              </div>
              <p className="text-[10px] text-[#4A5568] font-black uppercase mt-3 tracking-widest italic">{match.format || 'BO1'}</p>
            </div>
            <div className="text-left">
              <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter">{match.team_b.name}</h2>
              <p className="text-[#718096] font-bold text-xl">[{match.team_b.tag}]</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8">
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-lg font-black uppercase tracking-tighter italic flex items-center gap-2">
                <span className="w-2 h-6 bg-[#C89B3C]" />
                Lobby da Partida
              </h3>
              {lobbyEvents?.matchStarted && (
                <span className="flex items-center gap-2 bg-green-500/10 text-green-500 text-[10px] font-black px-3 py-1 rounded-full border border-green-500/20 animate-pulse">
                  PARTIDA EM ANDAMENTO
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MatchLobbyCard
                teamName={match.team_a.name}
                players={teamAPlayers}
                side="blue"
                playersInLobby={lobbyEvents?.playersInLobby || []}
              />
              <MatchLobbyCard
                teamName={match.team_b.name}
                players={teamBPlayers}
                side="red"
                playersInLobby={lobbyEvents?.playersInLobby || []}
              />
            </div>
          </div>

          <div className="space-y-6">
            <TournamentCodeBox
              code={liveCode}
              isAuthorized={userInMatch}
              matchStatus={match.status}
              justArrived={codeJustArrived}
            />
            <div className="bg-[#0D1421] border border-[#1E2D45] rounded-2xl p-6">
              <h4 className="text-[#718096] text-[10px] font-black uppercase tracking-widest mb-4">Instruções</h4>
              <ul className="space-y-3 text-sm text-[#A0AEC0]">
                <li className="flex gap-2"><span className="text-[#C89B3C] font-bold">1.</span> Abra o cliente do League of Legends.</li>
                <li className="flex gap-2"><span className="text-[#C89B3C] font-bold">2.</span> Clique em "Jogar" e selecione o ícone de troféu (Código de Torneio).</li>
                <li className="flex gap-2"><span className="text-[#C89B3C] font-bold">3.</span> Cole o código acima e clique em entrar.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
