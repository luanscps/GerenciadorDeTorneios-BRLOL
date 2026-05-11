'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Notification = {
  id: string;
  title: string;
  body: string;
  type: 'match' | 'inscricao' | 'torneio' | 'system' | 'inscricao_nova' | 'inscricao_status';
  read: boolean;
  created_at: string;
  metadata?: {
    match_id?: string;
    tournament_id?: string;
    team_id?: string;
    status?: string;
  };
};

const TYPE_ICONS: Record<string, string> = {
  match: '🎮',
  inscricao: '📝',
  inscricao_nova: '📝',
  inscricao_status: '📋',
  torneio: '🏆',
  system: '🔔',
};

export function NotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [justArrived, setJustArrived] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  const router = useRouter();

  const unread = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('notifications')
        .select('id, title, body, type, read, created_at, metadata')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);
      setNotifications((data as Notification[]) ?? []);
    }
    load();
  }, [userId]);

  useEffect(() => {
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications((prev) => [newNotif, ...prev].slice(0, 20));
          setJustArrived(newNotif.id);
          setTimeout(() => setJustArrived(null), 4000);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  async function markAllRead() {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from('notifications').update({ read: true }).in('id', unreadIds);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  async function markRead(notif: Notification) {
    await supabase.from('notifications').update({ read: true }).eq('id', notif.id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
    );
    setOpen(false);
    if (notif.type === 'match' && notif.metadata?.match_id && notif.metadata?.tournament_id) {
      const { data } = await supabase
        .from('tournaments')
        .select('slug')
        .eq('id', notif.metadata.tournament_id)
        .single();
      if (data?.slug) {
        router.push(`/torneios/${data.slug}/partidas/${notif.metadata.match_id}`);
      }
    } else if (
      (notif.type === 'inscricao' || notif.type === 'inscricao_nova' || notif.type === 'inscricao_status') &&
      notif.metadata?.tournament_id
    ) {
      const { data } = await supabase
        .from('tournaments')
        .select('slug')
        .eq('id', notif.metadata.tournament_id)
        .single();
      if (data?.slug) {
        router.push(`/torneios/${data.slug}`);
      }
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-full hover:bg-[#1E3A5F] transition-colors"
        aria-label="Notificacoes"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-[#0D1B2E] border border-[#1E3A5F] rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#1E3A5F]">
            <h3 className="text-sm font-semibold text-white">Notificações</h3>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs text-[#C8A84B] hover:underline">
                Marcar todas como lidas
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                Nenhuma notificação
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => markRead(n)}
                  className={`px-4 py-3 border-b border-[#1E3A5F] cursor-pointer hover:bg-[#1E3A5F]/30 transition-all ${
                    justArrived === n.id
                      ? 'bg-[#C8A84B]/15 animate-pulse'
                      : !n.read
                      ? 'bg-[#C8A84B]/5'
                      : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-base mt-0.5">{TYPE_ICONS[n.type] ?? '🔔'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-white truncate">{n.title}</p>
                        {justArrived === n.id && (
                          <span className="text-[9px] font-black bg-[#C8A84B] text-black px-1.5 py-0.5 rounded-full uppercase tracking-wide flex-shrink-0">
                            NOVO
                          </span>
                        )}
                        {!n.read && justArrived !== n.id && (
                          <span className="w-2 h-2 bg-[#C8A84B] rounded-full flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{n.body}</p>
                      <p className="text-[10px] text-gray-600 mt-1">
                        {new Date(n.created_at).toLocaleString('pt-BR', {
                          day: '2-digit', month: '2-digit',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
