import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { UserPermissionsForm } from '@/components/admin/UserPermissionsForm';

async function getUsuario(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, is_admin, is_banned, created_at')
    .eq('id', id)
    .single();
  if (error || !data) return null;
  return data;
}

export default async function AdminUsuarioDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getUsuario(slug);
  if (!user) return notFound();

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/admin/usuarios" className="text-gray-400 hover:text-white text-sm">
          &larr; Usuarios
        </Link>
        <span className="text-gray-600">/</span>
        <span className="text-white text-sm">{user.email}</span>
      </div>

      <h1 className="text-2xl font-bold text-white mb-1">
        {user.full_name || user.email}
      </h1>
      <p className="text-gray-500 text-xs mb-6">ID: {user.id}</p>

      <div className="bg-[#0A1628] border border-[#1E3A5F] rounded-xl p-5 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-gray-500 text-xs mb-1">Email</p>
            <p className="text-white text-sm">{user.email}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs mb-1">Nome</p>
            <p className="text-white text-sm">{user.full_name || '—'}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs mb-1">Admin</p>
            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
              user.is_admin ? 'bg-purple-900/40 text-purple-300' : 'bg-gray-800 text-gray-400'
            }`}>
              {user.is_admin ? 'Sim' : 'Nao'}
            </span>
          </div>
          <div>
            <p className="text-gray-500 text-xs mb-1">Banido</p>
            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
              user.is_banned ? 'bg-red-900/40 text-red-300' : 'bg-gray-800 text-gray-400'
            }`}>
              {user.is_banned ? 'Sim' : 'Nao'}
            </span>
          </div>
          <div>
            <p className="text-gray-500 text-xs mb-1">Cadastro</p>
            <p className="text-gray-300 text-sm">
              {new Date(user.created_at).toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>
      </div>

      <UserPermissionsForm
        userId={user.id}
        isAdmin={user.is_admin}
        isBanned={user.is_banned}
        displayName={user.full_name || user.email}
      />
    </div>
  );
}