'use client';

import React, { useState } from 'react';
import { Copy, Check, Lock, ExternalLink } from 'lucide-react';

interface Props {
  code: string | null;
  isAuthorized: boolean;
  matchStatus: string;
}

export default function TournamentCodeBox({ code, isAuthorized, matchStatus }: Props) {
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
        <h4 className="text-white font-black uppercase tracking-tighter mb-2 italic">Aguardando Código</h4>
        <p className="text-[#718096] text-xs leading-relaxed">
          O código será gerado assim que o organizador der início à fase do torneio.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#0D1B2E] border-2 border-[#C89B3C]/40 rounded-2xl p-6 shadow-[0_0_30px_rgba(200,155,60,0.15)] relative overflow-hidden group">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#C89B3C]/5 blur-[60px] -mr-16 -mt-16 group-hover:bg-[#C89B3C]/10 transition-colors" />

      <h4 className="text-[#C89B3C] text-[10px] font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-[#C89B3C] animate-ping" />
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
          {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
        </button>
      </div>

      <button 
        className="w-full mt-4 bg-[#C89B3C] hover:bg-[#D4A017] text-[#0A0E17] font-black uppercase tracking-tighter py-3 rounded-xl flex items-center justify-center gap-2 transition-all transform active:scale-95 shadow-lg shadow-[#C89B3C]/10"
        onClick={handleCopy}
      >
        {copied ? 'Copiado para o Clipboard!' : 'Copiar e Abrir LoL'}
      </button>

      <p className="text-[10px] text-[#4A5568] font-bold text-center mt-4 italic uppercase">
        Válido apenas para esta partida · Proibido compartilhar
      </p>
    </div>
  );
}
