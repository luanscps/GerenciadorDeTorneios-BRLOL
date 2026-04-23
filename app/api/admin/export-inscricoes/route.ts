import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const supabase = await createClient();

  // Verificar que e admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const tournamentId = req.nextUrl.searchParams.get('tournament_id');

  let query = supabase
    .from('inscricoes')
    .select(`
      id, status, created_at, checked_in_at,
      tournaments(name, bracket_type, starts_at),
      teams(name, tag)
    `)
    .order('created_at', { ascending: true });

  if (tournamentId) {
    query = query.eq('tournament_id', tournamentId);
  }

  const { data: inscricoes, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Gerar CSV
  const headers = [
    'ID',
    'Time',
    'Tag',
    'Torneio',
    'Formato',
    'Status',
    'Inscrito em',
    'Check-in em',
  ];

  const rows = (inscricoes ?? []).map((i: any) => [
    i.id,
    i.teams?.name ?? '',
    i.teams?.tag ?? '',
    i.tournaments?.name ?? '',
    i.tournaments?.bracket_type ?? '',
    i.status,
    i.created_at ? new Date(i.created_at).toLocaleString('pt-BR') : '',
    i.checked_in_at ? new Date(i.checked_in_at).toLocaleString('pt-BR') : '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ),
  ].join('\n');

  const filename = tournamentId
    ? `inscricoes_torneio_${tournamentId}.csv`
    : `inscricoes_todas_${new Date().toISOString().split('T')[0]}.csv`;

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
