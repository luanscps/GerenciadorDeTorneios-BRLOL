"use client";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
export default function RegisterPage() {
  const [form, setForm] = useState({ email:"", password:"", username:"", displayName:"" });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState(false);
  const supabase = createClient();
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }
  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (form.password.length < 6) { setError("Senha min 6 chars"); return; }
    if (!/^[a-z0-9_]+$/.test(form.username)) { setError("Username: minusculas, numeros e _"); return; }
    setLoading(true); setError("");
    const { error } = await supabase.auth.signUp({
      email: form.email, password: form.password,
      options: { data: { username: form.username, display_name: form.displayName } },
    });
    if (error) { setError(error.message); setLoading(false); return; }
    setSuccess(true);
  }
  if (success) return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="card-lol text-center p-10 max-w-md">
        <p className="text-5xl mb-4">✉️</p>
        <h2 className="text-xl font-bold text-white mb-2">Confirme seu e-mail</h2>
        <p className="text-gray-400">Link enviado para <strong className="text-[#C8A84B]">{form.email}</strong></p>
        <Link href="/login" className="btn-gold mt-6 inline-block px-8">Ir para Login</Link>
      </div>
    </div>
  );
  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="card-lol w-full max-w-md">
        <div className="text-center mb-8">
          <p className="text-4xl mb-2">⚔️</p>
          <h1 className="text-2xl font-bold text-white">Criar Conta</h1>
        </div>
        {error && <div className="bg-red-900/40 border border-red-500 text-red-300 p-3 rounded mb-4 text-sm">{error}</div>}
        <form onSubmit={handleRegister} className="space-y-4">
          {[
            { name:"displayName", label:"Nome de exibição", type:"text",     placeholder:"Ex: LuanDev" },
            { name:"username",    label:"Username (único)", type:"text",     placeholder:"Ex: luandev" },
            { name:"email",       label:"E-mail",           type:"email",    placeholder:"" },
            { name:"password",    label:"Senha (mín. 6)",   type:"password", placeholder:"" },
          ].map(f => (
            <div key={f.name}>
              <label className="text-gray-400 text-sm">{f.label}</label>
              <input name={f.name} type={f.type} placeholder={f.placeholder}
                value={form[f.name as keyof typeof form]} onChange={handleChange}
                className="input-lol mt-1" required />
            </div>
          ))}
          <button type="submit" disabled={loading} className="btn-gold w-full py-3">
            {loading ? "Criando..." : "Criar Conta"}
          </button>
        </form>
        <p className="text-center text-gray-400 mt-6 text-sm">
          Já tem conta? <Link href="/login" className="text-[#C8A84B] hover:underline">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
