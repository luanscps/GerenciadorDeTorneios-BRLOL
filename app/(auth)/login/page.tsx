import Link from "next/link";
import { loginAction } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="card-lol w-full max-w-md">
        <div className="text-center mb-8">
          <p className="text-4xl mb-2">⚔️</p>
          <h1 className="text-2xl font-bold text-white">Entrar</h1>
        </div>

        {error && (
          <div className="bg-red-900/40 border border-red-500 text-red-300 p-3 rounded mb-4 text-sm">
            {decodeURIComponent(error)}
          </div>
        )}

        <form action={loginAction} className="space-y-4">
          <div>
            <label className="text-gray-400 text-sm">E-mail</label>
            <input
              type="email"
              name="email"
              className="input-lol mt-1"
              required
            />
          </div>
          <div>
            <label className="text-gray-400 text-sm">Senha</label>
            <input
              type="password"
              name="password"
              className="input-lol mt-1"
              required
            />
          </div>
          <button type="submit" className="btn-gold w-full py-3">
            Entrar
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
