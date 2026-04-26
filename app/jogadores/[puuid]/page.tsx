import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/**
 * Rota legada: /jogadores/[puuid]
 * Redireciona automaticamente para a rota nova /jogadores/[gameName]/[tagLine]
 * buscando o summoner_name e tag_line pelo puuid na tabela players do Supabase.
 */
export default async function PlayerByPuuidPage({
  params,
}: {
  params: Promise<{ puuid: string }>;
}) {
  const { puuid } = await params;
  const supabase = await createClient();

  const { data: player } = await supabase
    .from('players')
    .select('summoner_name, tag_line')
    .eq('puuid', puuid)
    .maybeSingle();

  if (!player?.summoner_name || !player?.tag_line) {
    return notFound();
  }

  redirect(
    `/jogadores/${encodeURIComponent(player.summoner_name)}/${encodeURIComponent(player.tag_line)}`
  );
}
