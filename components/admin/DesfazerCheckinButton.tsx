'use client';
import { useTransition } from 'react';
import { desfazerCheckin } from '@/lib/actions/inscricao';

export function DesfazerCheckinButton({ inscricaoId }: { inscricaoId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      disabled={pending}
      onClick={() =>
        startTransition(() => {
          void desfazerCheckin(inscricaoId);
        })
      }
      className="text-xs bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-500/30 px-2 py-1 rounded disabled:opacity-50"
    >
      {pending ? 'Desfazendo...' : '↩ Desfazer'}
    </button>
  );
}
