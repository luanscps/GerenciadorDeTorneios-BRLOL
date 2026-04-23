"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useState, useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import { NotificationBell } from "@/components/layout/NotificationBell";

const LINKS = [
  { href: "/torneios", label: "Torneios" },
  { href: "/jogadores", label: "Jogadores" },
  { href: "/ranking", label: "Ranking" },
];

export function Navbar() {
  const [user, setUser]       = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const pathname              = usePathname();
  const router                = useRouter();
  const supabase              = createClient();

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
    <nav className="bg-[#050E1A] border-b border-[#1E3A5F] px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-white">
          <span>⚔️</span>
          <span className="hidden sm:inline">LoL Tournament</span>
        </Link>

        {/* Nav Links */}
        <div className="flex items-center gap-1">
          {LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                pathname === href || pathname.startsWith(href + '/')
                  ? 'text-[#C8A84B] bg-[#C8A84B]/10'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              href="/admin"
              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                pathname.startsWith('/admin')
                  ? 'text-[#C8A84B] bg-[#C8A84B]/10'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              ⚙️ Admin
            </Link>
          )}
        </div>

        {/* Auth + Notifications */}
        <div className="flex items-center gap-2">
          {loading ? (
            <span className="text-gray-500 text-sm">...</span>
          ) : user ? (
            <>
              {/* Notification Bell */}
              <NotificationBell userId={user.id} />
              <Link
                href="/dashboard"
                className="text-sm text-gray-400 hover:text-white px-3 py-1.5 rounded transition-colors"
              >
                Dashboard
              </Link>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-400 hover:text-red-400 px-3 py-1.5 rounded transition-colors"
              >
                Sair
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm text-gray-400 hover:text-white px-3 py-1.5 rounded transition-colors"
              >
                Entrar
              </Link>
              <Link
                href="/register"
                className="text-sm bg-[#C8A84B] hover:bg-[#d4b55a] text-black font-semibold px-3 py-1.5 rounded transition-colors"
              >
                Cadastrar
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
