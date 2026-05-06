import { redirect } from 'next/navigation';

// Rota legada — redireciona para a estrutura atual
export default function TorneiosLegadoPage() {
  redirect('/admin/tournaments');
}
