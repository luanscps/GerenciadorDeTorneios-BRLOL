'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { aceitarConvite, recusarConvite, listarConvitesPendentes } from '@/lib/actions/team_invite';

const ROLE_LABELS: Record<string, string> = {
  TOP: 'Top', JUNGLE: 'Jungle', MID: 'Mid', ADC: 'ADC', SUPPORT: 'Suporte',
};

interface InviteTeam {
  id: string;
  name: string;
  tag: string;
  logo_url: string | null;
}

interface Invite {
  id: string;
  role: string;
  status: string;
  expires_at: string;
  created_at: string;
  team: InviteTeam;
}

type ActionState = { id: string; type: 'accept' | 'reject' } | null;

export default function ConvitesPage() {
  const router   = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [invites, setInvites]     = useState<Invite[]>([]);
  const [loading, setLoading]     = useState(true);
  const [action, setAction]       = useState<ActionState>(null);
  const [feedback, setFeedback]   = useState<Record<string, { type: 'success' | 'error'; msg: string }>>({});
  const [profile, setProfile]     = useState<{ riot_game_name: string; riot_tagline: string } | null>(null);

  const loadConvites = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    // Carrega perfil para exibir para quem os convites foram enviados
    const { data: prof } = await supabase
      .from('profiles')
      .select('riot_game_name, riot_tagline')
      .eq('id', user.id)
      .single();
    setProfile(prof);

    const result = await listarConvitesPendentes();
    setInvites((result.data as Invite[]) ?? []);
    setLoading(false);
  }, [supabase, router]);

  useEffect(() => { loadConvites(); }, [loadConvites]);

  async function handleAccept(inviteId: string) {
    setAction({ id: inviteId, type: 'accept' });
    setFeedback(prev => ({ ...prev, [inviteId]: undefined! }));
    const res = await aceitarConvite(inviteId);
    setAction(null);
    if (res.error) {
      setFeedback(prev => ({ ...prev, [inviteId]: { type: 'error', msg: res.error! } }));
    } else {
      setFeedback(prev => ({ ...prev, [inviteId]: { type: 'success', msg: 'Convite aceito! Você agora faz parte do time.' } }));
      setTimeout(() => loadConvites(), 1500);
    }
  }

  async function handleReject(inviteId: string) {
    setAction({ id: inviteId, type: 'reject' });
    setFeedback(prev => ({ ...prev, [inviteId]: undefined! }));
    const res = await recusarConvite(inviteId);
    setAction(null);
    if (res.error) {
      setFeedback(prev => ({ ...prev, [inviteId]: { type: 'error', msg: res.error! } }));
    } else {
      setFeedback(prev => ({ ...prev, [inviteId]: { type: 'success', msg: 'Convite recusado.' } }));
      setTimeout(() => loadConvites(), 1200);
    }
  }

  function expiresLabel(expiresAt: string): string {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return 'Expirado';
    const hours = Math.floor(diff / 1000 / 60 / 60);
    if (hours < 1) return 'Expira em menos de 1h';
    if (hours < 24) return `Expira em ${hours}h`;
    const days = Math.floor(hours / 24);
    return `Expira em ${days}d`;
  }

  if (loading) return (
    <main className="min-h-screen bg-[#050E1A] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 text-sm animate-pulse">Carregando convites...</p>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#050E1A] py-10 px-4">
      <div className="max-w-xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white font-bold text-xl flex items-center gap-2">
              <span>📥</span> Convites Recebidos
            </h1>
            {profile?.riot_game_name && (
              <p className="text-gray-500 text-xs mt-0.5">
                Para: <span className="text-gray-400">{profile.riot_game_name}#{profile.riot_tagline ?? 'BR1'}</span>
              </p>
            )}
          </div>
          <Link
            href="/dashboard"
            className="text-xs text-gray-400 hover:text-blue-400 border border-[#1E3A5F] px-3 py-1.5 rounded-lg transition-colors"
          >
            ← Dashboard
          </Link>
        </div>

        {/* Lista de convites */}
        {invites.length === 0 ? (
          <div className="bg-[#0A1628] border border-[#1E3A5F] rounded-xl p-12 flex flex-col items-center gap-4 text-center">
            <span className="text-5xl opacity-40">📭</span>
            <p className="text-gray-400 font-medium">Nenhum convite pendente</p>
            <p className="text-gray-600 text-sm max-w-xs">
              Quando um capitão te convidar para um time, o convite aparecerá aqui.
            </p>
            <Link
              href="/dashboard"
              className="mt-2 text-sm text-blue-400 hover:text-blue-300 border border-blue-400/30 hover:border-blue-400/60 px-4 py-2 rounded-lg transition-colors"
            >
              Voltar ao Dashboard
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {invites.map(invite => {
              const isActing   = action?.id === invite.id;
              const fb         = feedback[invite.id];
              const expLabel   = expiresLabel(invite.expires_at);
              const isExpiring = new Date(invite.expires_at).getTime() - Date.now() < 6 * 60 * 60 * 1000;

              return (
                <div
                  key={invite.id}
                  className="bg-[#0A1628] border border-[#1E3A5F] rounded-xl p-4 space-y-4 transition-opacity"
                >
                  {/* Cabeçalho do card */}
                  <div className="flex items-start gap-4">
                    {/* Logo do time */}
                    <div className="w-12 h-12 rounded-xl bg-[#1E2A3A] border border-[#1E3A5F] flex items-center justify-center text-xl flex-shrink-0 overflow-hidden">
                      {invite.team.logo_url ? (
                        <img
                          src={invite.team.logo_url}
                          alt={invite.team.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        '🛡️'
                      )}
                    </div>

                    {/* Info do time */}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold truncate">
                        [{invite.team.tag}] {invite.team.name}
                      </p>
                      <p className="text-gray-400 text-sm">
                        Posição: <span className="text-blue-400 font-medium">{ROLE_LABELS[invite.role] ?? invite.role}</span>
                      </p>
                    </div>

                    {/* Badge de expiração */}
                    <span className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${
                      isExpiring
                        ? 'text-red-400 bg-red-400/10 border-red-400/30'
                        : 'text-gray-500 bg-[#0D1E35] border-[#1E3A5F]'
                    }`}>
                      {expLabel}
                    </span>
                  </div>

                  {/* Feedback inline */}
                  {fb && (
                    <p className={`text-xs font-medium px-3 py-2 rounded-lg border ${
                      fb.type === 'success'
                        ? 'bg-green-500/10 text-green-400 border-green-500/30'
                        : 'bg-red-500/10 text-red-400 border-red-500/30'
                    }`}>
                      {fb.type === 'success' ? '✅' : '❌'} {fb.msg}
                    </p>
                  )}

                  {/* Ações */}
                  {!fb?.type || fb.type === 'error' ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAccept(invite.id)}
                        disabled={isActing}
                        className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white text-sm font-bold py-2.5 rounded-xl transition-colors"
                      >
                        {isActing && action?.type === 'accept' ? (
                          <span className="flex items-center justify-center gap-2">
                            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Aceitando...
                          </span>
                        ) : (
                          '✅ Aceitar'
                        )}
                      </button>
                      <button
                        onClick={() => handleReject(invite.id)}
                        disabled={isActing}
                        className="flex-1 bg-[#0D1E35] hover:bg-red-500/10 disabled:opacity-40 text-red-400 hover:text-red-300 border border-red-400/30 hover:border-red-400/60 text-sm font-bold py-2.5 rounded-xl transition-colors"
                      >
                        {isActing && action?.type === 'reject' ? (
                          <span className="flex items-center justify-center gap-2">
                            <span className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                            Recusando...
                          </span>
                        ) : (
                          '❌ Recusar'
                        )}
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}

        {/* Rodapé informativo */}
        {invites.length > 0 && (
          <p className="text-center text-gray-600 text-xs">
            Convites expiram automaticamente em 48h após o envio.
          </p>
        )}

      </div>
    </main>
  );
}
