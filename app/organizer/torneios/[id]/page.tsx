/**
 * DEPRECADO — redireciona para /organizador
 * @see app/organizer/layout.tsx
 */
import { redirect } from 'next/navigation'
export default function Page({ params }: { params: { id: string } }) {
  redirect(`/organizador/torneios/${params.id}`)
}
