# Supabase — Banco de Dados e Autenticação

## Tabelas necessárias

### `profiles` (já existente)

Extensão da tabela `auth.users` do Supabase. Contém o campo `role` usado para controle de acesso.

```sql
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  role TEXT DEFAULT 'user',  -- 'user' | 'admin'
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `tournament_match_results` (nova — criação manual necessária)

Criada para receber os resultados de partidas via webhook da Riot.

```sql
CREATE TABLE tournament_match_results (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_code TEXT UNIQUE NOT NULL,
  game_id         BIGINT,
  game_data       JSONB NOT NULL,
  processed       BOOLEAN DEFAULT FALSE,
  received_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para consultas por status
CREATE INDEX idx_match_results_processed
  ON tournament_match_results (processed)
  WHERE processed = FALSE;

-- RLS: somente service_role pode inserir
ALTER TABLE tournament_match_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access"
  ON tournament_match_results
  USING (auth.role() = 'service_role');
```

---

## Clientes Supabase no projeto

| Contexto | Função | Bypassa RLS? |
|---|---|---|
| Browser | `createBrowserClient()` | ❌ Não |
| Server (route handlers) | `createServerClient()` com cookies | ❌ Não |
| Webhook / Admin | `createClient(url, serviceRoleKey)` | ✅ Sim |

> ⚠️ A `SUPABASE_SERVICE_ROLE_KEY` bypassa todas as políticas de RLS. Use somente em contextos servidor-para-servidor. Nunca prefixe com `NEXT_PUBLIC_`.

---

## Variáveis de ambiente Supabase

| Variável | Onde usar | Segura no cliente? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | ✅ Sim |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server | ✅ Sim (sujeita ao RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server apenas | ❌ Nunca no cliente |
