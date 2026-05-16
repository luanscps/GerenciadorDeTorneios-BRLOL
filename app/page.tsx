import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TournamentCard } from "@/components/tournament/TournamentCard";

export default async function HomePage() {
  const supabase = await createClient();

  // FIX: start_date nao existe como coluna de ordenacao — usar starts_at
  const { data: tournaments } = await supabase
    .from("tournaments")
    .select("*")
    .in("status", ["OPEN", "IN_PROGRESS", "CHECKIN"])
    .order("starts_at", { ascending: true })
    .limit(6);

  const { count: totalPlayers } = await supabase
    .from("riot_accounts")
    .select("*", { count: "exact", head: true });

  const { count: totalTeams } = await supabase
    .from("teams")
    .select("*", { count: "exact", head: true });

  const { count: totalT } = await supabase
    .from("tournaments")
    .select("*", { count: "exact", head: true });

  return (
    <div className="space-y-16">
      <section className="relative rounded-2xl overflow-hidden min-h-[380px] flex items-center">
        <div className="absolute inset-0 bg-gradient-to-r from-[#050D1A] via-[#0A1428]/95 to-transparent z-10" />
        <div className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: "url('https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/loadingscreen/summoners-rift.jpg')" }} />
        <div className="relative z-20 p-8 md:p-16 max-w-2xl">
          <span className="text-[#C8A84B] font-bold tracking-widest text-xs uppercase mb-3 block">
            Summoner's Rift 5v5 Casual
          </span>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 leading-tight">
            Torneios de<br /><span className="text-[#C8A84B]">League of Legends</span>
          </h1>
          <p className="text-gray-300 text-lg mb-8">
            Cadastre seu invocador, monte seu time e dispute torneios com bracket, stats reais e ranking oficial Riot.
          </p>
          <div className="flex gap-4 flex-wrap">
            <Link href="/torneios" className="btn-gold text-base px-8 py-3">Ver Torneios</Link>
            <Link href="/dashboard/jogador/registrar" className="btn-outline-gold text-base px-8 py-3">Cadastrar Invocador</Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Invocadores", value: totalPlayers ?? 0, icon: "👤" },
          { label: "Times",       value: totalTeams   ?? 0, icon: "🛡️" },
          { label: "Torneios",    value: totalT        ?? 0, icon: "🏆" },
          { label: "Mapa",        value: "SR 5v5",          icon: "🗺️" },
        ].map(s => (
          <div key={s.label} className="card-lol text-center py-6">
            <p className="text-3xl mb-2">{s.icon}</p>
            <p className="text-2xl font-bold text-[#C8A84B]">{s.value}</p>
            <p className="text-gray-400 text-sm mt-1">{s.label}</p>
          </div>
        ))}
      </section>

      <section>
        <h2 className="text-2xl font-bold text-white mb-8 text-center">Como funciona</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { step:"01", title:"Cadastre-se",   desc:"Crie sua conta e vincule seu Riot ID.", icon:"👤" },
            { step:"02", title:"Monte seu Time", desc:"Crie time 5v5 e convide seus amigos.",  icon:"🛡️" },
            { step:"03", title:"Inscreva-se",    desc:"Encontre torneio aberto e inscreva.",   icon:"📋" },
            { step:"04", title:"Dispute",         desc:"Jogue, reporte resultados e veja o bracket.", icon:"⚔️" },
          ].map(i => (
            <div key={i.step} className="card-lol text-center">
              <p className="text-4xl mb-3">{i.icon}</p>
              <span className="text-[#C8A84B] text-xs font-bold tracking-widest">PASSO {i.step}</span>
              <h3 className="text-white font-bold text-lg mt-1 mb-2">{i.title}</h3>
              <p className="text-gray-400 text-sm">{i.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Torneios Ativos</h2>
          <Link href="/torneios" className="text-[#C8A84B] hover:underline text-sm">Ver todos →</Link>
        </div>
        {tournaments && tournaments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournaments.map(t => <TournamentCard key={t.id} tournament={t} />)}
          </div>
        ) : (
          <div className="card-lol text-center py-16">
            <p className="text-4xl mb-4">🏆</p>
            <p className="text-white font-semibold text-lg mb-2">Nenhum torneio ativo no momento</p>
            <p className="text-gray-400 text-sm mb-6">Em breve novos torneios serão abertos para inscrição.</p>
            <Link href="/torneios" className="btn-outline-gold">Ver todos os torneios</Link>
          </div>
        )}
      </section>
    </div>
  );
}
