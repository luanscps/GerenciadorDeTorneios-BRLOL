# 🔧 Troubleshooting - GerenciadorDeTorneios-BRLOL

## Problema: Erro `function unaccent(text) does not exist`

### 📋 Descrição do Erro

Ao executar a migration `005_demo_seed.sql`, o seguinte erro ocorre:

```
Failed to run sql query: ERROR: 42883: function unaccent(text) does not exist
HINT: No function matches the given name and argument types. You might need to add explicit type casts.
QUERY: base_slug := lower(regexp_replace(unaccent(NEW.name), '[^a-z0-9]+', '-', 'g'))
CONTEXT: PL/pgSQL function generate_tournament_slug() line 8 at assignment
```

### 🔍 Causa Raiz

O erro acontece porque:

1. Existe uma função trigger `generate_tournament_slug()` criada em uma das migrations anteriores
2. Essa função usa `unaccent()` do PostgreSQL para remover acentos de nomes de torneios ao gerar slugs
3. A extensão `unaccent` não está habilitada no banco de dados Supabase
4. Mesmo habilitando a extensão, ela pode não estar acessível no schema correto para a função

### ✅ Solução Implementada

#### Passo 1: Habilitar extensão unaccent

Execute no **Supabase SQL Editor**:

```sql
create extension if not exists "unaccent";
```

#### Passo 2: Recriar a função sem dependência de unaccent

Como a extensão `unaccent` pode não estar disponível ou acessível, a solução definitiva foi **recriar a função usando `translate()`** nativo do PostgreSQL:

```sql
-- Solucao: recriar funcao generate_tournament_slug SEM unaccent
-- Usar translate() para remover acentos manualmente
CREATE OR REPLACE FUNCTION public.generate_tournament_slug()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter int := 0;
BEGIN
  -- Remover acentos usando translate (sem dependencia de unaccent)
  base_slug := translate(lower(NEW.name),
    'áàâãäéèêëíìîïóòôõöúùûüçñ',
    'aaaaaeeeeiiiiooooouuuucn'
  );
  
  -- Substituir caracteres nao alfanumericos por hifen
  base_slug := regexp_replace(base_slug, '[^a-z0-9]+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  
  final_slug := base_slug;
  
  -- Verificar se slug ja existe e adicionar numero se necessario
  WHILE EXISTS (SELECT 1 FROM public.tournaments WHERE slug = final_slug AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  NEW.slug := final_slug;
  RETURN NEW;
END;
$$;
```

#### Passo 3: Executar a migration 005_demo_seed.sql

Após corrigir a função, execute normalmente a migration no SQL Editor.

### 📊 Resultado Esperado

Após aplicar a solução:

```sql
-- Verificar dados inseridos
SELECT 
  (SELECT count(*) FROM public.tournaments) as total_torneios,
  (SELECT count(*) FROM public.teams) as total_times,
  (SELECT count(*) FROM public.players) as total_jogadores,
  (SELECT count(*) FROM public.inscricoes) as total_inscricoes,
  (SELECT count(*) FROM public.seedings) as total_seedings;
```

**Resultado:**
- ✅ 1 torneio criado
- ✅ 4 times criados  
- ✅ 40 jogadores criados
- ✅ 4 inscrições aprovadas
- ✅ 4 seedings configurados

### 🎯 Dados Demo Criados

**Torneio:**
- Copa BRLOL Amadora 2026

**Times (4):**
1. Dragões de Fogo (DDF)
2. Lobos da Noite (LDN)
3. Águias Douradas (AGD)
4. Leões Selvagens (LSL)

**Jogadores (40):**
- 10 jogadores por time
- Distribuição de tiers: Gold, Platinum, Diamond
- Roles: TOP, JUNGLE, MID, ADC, SUPPORT
- Stats realistas: LP, Wins, Losses, Summoner Level

### 🔄 Alternativa: Usar public.unaccent()

Se a extensão `unaccent` estiver disponível, você pode tentar usar o schema qualificado:

```sql
base_slug := lower(regexp_replace(public.unaccent(NEW.name), '[^a-z0-9]+', '-', 'g'));
```

Porém, a solução com `translate()` é mais portável e não depende de extensões externas.

### 📝 Notas Importantes

- ✅ A função `translate()` é nativa do PostgreSQL e não requer extensões
- ✅ Suporta os caracteres acentuados mais comuns em português
- ✅ Não causa problemas de permissão ou schema
- ⚠️ Se precisar suportar mais caracteres Unicode, adicione-os na string de translate

### 🚀 Próximos Passos

1. ✅ Migration 005 executada com sucesso
2. ⏭️ Criar usuário admin no banco
3. ⏭️ Testar páginas públicas com dados demo
4. ⏭️ Implementar painel admin

---

**Data da resolução:** 22/04/2026  
**Versão do projeto:** v1.0  
**Ambiente:** Supabase (PostgreSQL 15)
