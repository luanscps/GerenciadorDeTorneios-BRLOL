"use client";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Hard navigation: garante que os cookies de sessao sejam lidos
    // pelo middleware antes de renderizar a dashboard
    window.location.href = "/dashboard";
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="card-lol w-full max-w-md">
        <div className="text-center mb-8">
          <p className="text-4xl mb-2">⚔️</p>
          <h1 className="text-2xl font-bold text-white">Entrar</h1>
        </div>

        {error && (
          <div className="bg-red-900/40 border border-red-500 text-red-300 p-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-gray-400 text-sm">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-lol mt-1"
              required
            />
          </div>
          <div>
            <label className="text-gray-400 text-sm">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-lol mt-1"
              required
            />
          </div>
          <button type="submit" disabled={loading} className="btn-gold w-full py-3">
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="text-center text-gray-400 mt-6 text-sm">
          Nao tem conta?{" "}
          <Link href="/register" className="text-[#C8A84B] hover:underline">
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  );
}
