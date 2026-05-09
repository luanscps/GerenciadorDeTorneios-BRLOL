import { createBrowserClient } from "@supabase/ssr";

// Singleton para evitar multiplas instancias no cliente
let client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (client) return client;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "As variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY são necessárias para inicializar o cliente Supabase."
    );
  }

  client = createBrowserClient(supabaseUrl, supabaseAnonKey);
  return client;
}
