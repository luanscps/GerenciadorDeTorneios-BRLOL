"use client";
import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface RiotAccount {
  id: string;
  game_name: string;
  tag_line: string;
  summoner_level: number;
  profile_icon_id: number;
}

function CriarTimeForm() {
  const [nome, setNome]         = useState("");
  const [tag, setTag]           = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [checking, setChecking] = useState(true);
  const [account, setAccount]   = useState<RiotAccount | null>(null);

  const router       = useRouter();
  const searchParams = useSearchParams();
  const supabase     = useMemo(() => createClient(), []);
  const tournamentId = searchParams.get("tournament");

  useEffect(() => {
    async function checkAccount() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: acct } = await supabase
        .from("riot_accounts")
        .select("id, game_name, tag_line, summoner_level, profile_icon_id")
        .eq("profile_id", user.id)
        .eq("is_primary", true)
        .single();

      setAccount(acct ?? null);
      setChecking(false);
    }
    checkAccount();
  }, [supabase, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!account) return;
    setLoading(true);
    setError("");

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) { router.push("/login"); return; }

      if (!tournamentId) {
        setError("Nenhum torneio selecionado. Acesse esta página a partir de um torneio.");
        setLoading(false);
        return;
      }

      // Verifica se já tem time neste torneio
      const { data: existingTeam } = await supabase
        .from("teams")
        .select("id, name")
        .eq("tournament_id", tournamentId)
        .eq("owner_id", user.id)
        .maybeSingle();

      if (existingTeam) {
        setError(`Você já criou o time "${existingTeam.name}" neste torneio.`);
        setLoading(false);
        return;
      }

      // Verifica se já é player em algum time
      const { data: existingPlayer } = await supabase
        .from("players")
        .select("id, team_id")
        .eq("summoner_name", account.game_name)
        .eq("tag_line", account.tag_line)
        .not("team_id", "is", null)
        .maybeSingle();

      if (existingPlayer) {
        setError("Você já está em um time neste torneio.");
        setLoading(false);
        return;
      }

      // Cria o time
      const { data: team, error: teamError } = await supabase
        .from("teams")
        .insert({
          tournament_id: tournamentId,
          name:          nome.trim(),
          tag:           tag.trim().toUpperCase(),
          owner_id:      user.id,
        })
        .select()
        .single();

      if (teamError) throw new Error(teamError.message);

      // Adiciona o capitão como player do time
      const { error: playerError } = await supabase
        .from("players")
        .insert({
          team_id:        team.id,
          summoner_name:  account.game_name,
          tag_line:       account.tag_line,
          tier:           "UNRANKED",
          rank:           "",
          lp:             0,
          wins:           0,
          losses:         0,
          role:           "TOP",
          profile_icon:   account.profile_icon_id,
          summoner_level: account.summoner_level,
        });

      if (playerError) {
        console.warn("Erro ao adicionar capitão como player:", playerError.message);
      }

      // Inscreve o time no torneio
      const { error: inscError } = await supabase
        .from("inscricoes")
        .insert({
          tournament_id: tournamentId,
          team_id:       team.id,
          requested_by:  user.id,
          status:        "PENDING",
        });

      if (inscError) throw new Error("Time criado, mas inscrição falhou: " + inscError.message);

      router.push(`/torneios/${tournamentId}?inscrito=true`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao criar time");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="max-w-lg mx-auto card-lol py-16 text-center">
        <p className="text-gray-400">Verificando conta...</p>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="max-w-lg mx-auto card-lol text-center py-12 space-y-4">
        <p className="text-4xl">⚠️</p>
        <h2 className="text-white font-bold text-lg">Conta Riot necessária</h2>
        <p className="text-gray-400 text-sm">
          Para criar um time você precisa primeiro vincular sua conta Riot.
        </p>
        <a href="/dashboard/jogador/registrar" className="btn-gold inline-block px-6 py-2">
          Vincular Conta Riot
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-white">🛡️ Criar Time</h1>

      {tournamentId && (
        <div className="bg-[#C8A84B]/10 border border-[#C8A84B]/30 rounded-lg p-3">
          <p className="text-[#C8A84B] text-sm">
            🏆 Após criar o time, ele será inscrito automaticamente no torneio.
          </p>
        </div>
      )}

      <div className="card-lol flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#0A1428] border border-[#1E3A5F] flex items-center justify-center text-lg">
          👤
        </div>
        <div>
          <p className="text-white font-medium text-sm">
            {account.game_name}
            <span className="text-gray-500">#{account.tag_line}</span>
          </p>
          <p className="text-gray-500 text-xs">
            Nível {account.summoner_level} · Conta vinculada ✅
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card-lol space-y-4">
        <div>
          <label className="block text-gray-400 text-sm mb-1">
            Nome do Time <span className="text-red-400">*</span>
          </label>
          <input
            value={nome}
            onChange={e => setNome(e.target.value)}
            placeholder="Ex: Team Fúria BR"
            className="input-lol w-full"
            maxLength={32}
            required
          />
          <p className="text-gray-600 text-xs mt-1">{nome.length}/32</p>
        </div>

        <div>
          <label className="block text-gray-400 text-sm mb-1">
            TAG do Time <span className="text-red-400">*</span>
          </label>
          <input
            value={tag}
            onChange={e => setTag(e.target.value.toUpperCase())}
            placeholder="Ex: FURA"
            className="input-lol w-full"
            maxLength={5}
            minLength={2}
            required
          />
          <p className="text-gray-600 text-xs mt-1">2–5 letras · exibida como [TAG]</p>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-500/40 rounded p-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="btn-outline-gold flex-1 py-3"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading || !nome.trim() || tag.trim().length < 2}
            className="btn-gold flex-1 py-3"
          >
            {loading ? "Criando..." : "Criar e Inscrever Time"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function CriarTimePage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-lg mx-auto card-lol py-16 text-center">
          <p className="text-gray-400">Carregando...</p>
        </div>
      }
    >
      <CriarTimeForm />
    </Suspense>
  );
}
