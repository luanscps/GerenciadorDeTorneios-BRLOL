"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useState, useEffect } from "react";
import type { User } from "@supabase/supabase-js";

const LINKS = [
  { href: "/torneios", label: "Torneios" },
  { href: "/ranking",  label: "Ranking"  },
];

export function Navbar() {
  const [user, setUser]         = useState<User | null>(null);
  const [isAdmin, setIsAdmin]   = useState(false);
  const [loading, setLoading]   = useState(true);
  const pathname                = usePathname();
  const router                  = useRouter();
  const supabase                = createClient();

  useEffect(() => {
    // Carrega sessao inicial
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
      if (user) {
        supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", user.id)
          .single()
          .then(({ data }) => setIsAdmin(!!data?.is_admin));
      }
    });

    // Escuta mudancas de autenticacao em tempo real
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", currentUser.id)
          .single()
          .then(({ data }) => setIsAdmin(!!data?.is_admin));
      } else {
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
    router.push("/");
    router.refresh();
  }

  return (
    <nav className="bg-[#0A1428] border-b border-[#1E3A5F] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-white">
          <span className="text-xl">⚔️</span>
          <span className="text-[#C8A84B]">LoL</span>
          <span className="hidden sm:block">Tournament</span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          {LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={
                "text-sm transition-colors " +
                (pathname.startsWith(href)
                  ? "text-[#C8A84B] font-medium"
                  : "text-gray-400 hover:text-white")
              }
            >
              {label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              href="/admin"
              className={
                "text-sm transition-colors " +
                (pathname.startsWith("/admin")
                  ? "text-[#C8A84B] font-medium"
                  : "text-gray-400 hover:text-white")
              }
            >
              ⚙️ Admin
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3">
          {loading ? (
            <span className="text-gray-500 text-xs">...</span>
          ) : user ? (
            <>
              <Link href="/dashboard" className="btn-outline-gold text-xs px-3 py-1.5">
                Dashboard
              </Link>
              <button
                onClick={handleLogout}
                className="text-gray-400 hover:text-red-400 text-xs transition-colors"
              >
                Sair
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-gray-400 hover:text-white text-xs transition-colors">
                Entrar
              </Link>
              <Link href="/register" className="btn-gold text-xs px-3 py-1.5">
                Cadastrar
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
