'use client';

import React, { useState } from 'react';
import { Copy, Check, Lock } from 'lucide-react';

interface Props {
  code: string | null;
  isAuthorized: boolean;
  matchStatus: string;
  justArrived?: boolean;
}

export default function TournamentCodeBox({ code, isAuthorized, matchStatus, justArrived = false }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (code) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="bg-[#1A1010] border-2 border-red-500/20 rounded-2xl p-6 text-center">
        <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="text-red-500 w-6 h-6" />
        </div>
        <h4 className="text-white font-black uppercase tracking-tighter mb-2 italic">Acesso Restrito</h4>
        <p className="text-[#718096] text-xs leading-relaxed">
          O Código de Torneio só está disponível para jogadores e organizadores vinculados a esta partida.
        </p>
      </div>
    );
  }

  if (!code) {
    return (
      <div className="bg-[#1A1A10] border-2 border-yellow-500/20 rounded-2xl p-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
          <h4 className="text-white font-black uppercase tracking-tighter italic">Aguardando Código</h4>
        </div>
        <p className="text-[#718096] text-xs leading-relaxed">
          O código será gerado assim que o organizador der início à fase do torneio. Esta página atualiza automaticamente.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`relative rounded-2xl p-6 overflow-hidden group transition-all duration-500 ${
        justArrived
          ? 'bg-[#1B2A10] border-2 border-green-400/60 shadow-[0_0_40px_rgba(74,222,128,0.2)]'
          : 'bg-[#0D1B2E] border-2 border-[#C89B3C]/40 shadow-[0_0_30px_rgba(200,155,60,0.15)]'
      }`}
    >
      <div
        className={`absolute top-0 right-0 w-32 h-32 blur-[60px] -mr-16 -mt-16 transition-colors duration-500 ${
          justArrived ? 'bg-green-400/10' : 'bg-[#C89B3C]/5 group-hover:bg-[#C89B3C]/10'
        }`}
      />

      {justArrived && (
        <div className="flex items-center gap-2 mb-3">
          <span className="flex items-center gap-1.5 bg-green-400/20 border border-green-400/40 text-green-400 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
            Código disponível agora!
          </span>
        </div>
      )}

      <h4
        className={`text-[10px] font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2 ${
          justArrived ? 'text-green-400' : 'text-[#C89B3C]'
        }`}
      >
        <span className={`w-1.5 h-1.5 rounded-full animate-ping ${
          justArrived ? 'bg-green-400' : 'bg-[#C89B3C]'
        }`} />
        Código de Torneio Único
      </h4>

      <div className="bg-black/40 rounded-xl p-4 border border-white/5 font-mono text-center relative group/code">
        <span className="text-xl md:text-2xl font-bold tracking-[0.2em] text-white/90 group-hover/code:text-white transition-colors">
          {code}
        </span>
        <button
          onClick={handleCopy}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-white/10 rounded-lg transition-colors text-[#C89B3C]"
          title="Copiar código"
        >
          {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
        </button>
      </div>

      <button
        className={`w-full mt-4 font-black uppercase tracking-tighter py-3 rounded-xl flex items-center justify-center gap-2 transition-all transform active:scale-95 shadow-lg ${
          justArrived
            ? 'bg-green-400 hover:bg-green-300 text-black shadow-green-400/20'
            : 'bg-[#C89B3C] hover:bg-[#D4A017] text-[#0A0E17] shadow-[#C89B3C]/10'
        }`}
        onClick={handleCopy}
      >
        {copied ? '✓ Copiado para o Clipboard!' : 'Copiar Código'}
      </button>

      <p className="text-[10px] text-[#4A5568] font-bold text-center mt-4 italic uppercase">
        Válido apenas para esta partida · Proibido compartilhar
      </p>
    </div>
  );
}
