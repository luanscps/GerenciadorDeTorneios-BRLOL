/**
 * app/organizer/layout.tsx
 *
 * DEPRECADO — rota legada em inglês.
 * Redireciona permanentemente para /organizador (versao PT-BR).
 *
 * Não remover o arquivo ainda para evitar 404 em links externos
 * que possam referenciar /organizer. Remover após confirmar
 * que não há referências ativas.
 */
import { redirect } from 'next/navigation'

export default function OrganizerLegacyLayout() {
  redirect('/organizador')
}
