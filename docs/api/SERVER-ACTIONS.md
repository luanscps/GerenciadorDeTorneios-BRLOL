# Server Actions

> **Contexto:** Next.js App Router com Server Actions (`'use server'`). As actions rodam no servidor sem criar endpoints REST — o cliente invoca via `<form action={...}>` ou chamada direta.
> **Fonte de verdade:** arquivos `app/**/actions.ts` e `lib/actions/`.

---

## Padrão de Retorno

Todas as Server Actions do projeto seguem o padrão:

```typescript
type ActionResult<T = void> = 
  | { success: true;  data: T;      error?: never }
  | { success: false; error: string; data?: never  }
```

O cliente verifica `result.success` antes de usar `result.data`.

---

## Padrão de Autorização

Toda action que modifica estado verifica o usuário no servidor:

```typescript
'use server'
import { createServerClient } from '@/lib/supabase/server'

export async function minhaAction(input: SomeInput): Promise<ActionResult> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autenticado' }

  // ... lógica de negócio
}
```

---

## Actions de Perfil

| Action | Arquivo | Descrição |
|---|---|---|
| `updateProfile` | `app/profile/actions.ts` | Atualiza username, avatar_url no `profiles` |
| `linkRiotAccount` | `app/profile/actions.ts` | Vincula `riot_accounts` ao perfil (puuid, game_name, tag_line) |
| `unlinkRiotAccount` | `app/profile/actions.ts` | Remove vínculo com conta Riot |

### `updateProfile`
```typescript
export async function updateProfile(formData: FormData): Promise<ActionResult>
// Valida com Zod: username (3-20 chars, alphanumeric+_)
// UPDATE profiles SET username, updated_at WHERE id = user.id
```

### `linkRiotAccount`
```typescript
export async function linkRiotAccount(gameName: string, tagLine: string): Promise<ActionResult>
// 1. GET account-v1 /by-riot-id/{gameName}/{tagLine} → puuid
// 2. UPSERT riot_accounts { user_id, puuid, game_name, tag_line }
```

---

## Actions de Times

| Action | Arquivo | Descrição |
|---|---|---|
| `createTeam` | `app/teams/actions.ts` | Cria time + insere criador como captain |
| `updateTeam` | `app/teams/actions.ts` | Atualiza nome, tag, logo_url do time |
| `deleteTeam` | `app/teams/actions.ts` | Soft-delete (ou hard se sem partidas) |
| `inviteMember` | `app/teams/actions.ts` | INSERT team_invites |
| `respondToInvite` | `app/teams/actions.ts` | Aceita/recusa convite via RPC `accept_team_invite` |
| `removeMember` | `app/teams/actions.ts` | Remove membro (captain only) |
| `leaveTeam` | `app/teams/actions.ts` | Saída voluntária do time |

### `createTeam`
```typescript
export async function createTeam(input: CreateTeamInput): Promise<ActionResult<{ teamId: string }>>
// Valida: name (3-30 chars), tag (2-5 chars maiúsculos)
// INSERT teams { name, tag, owner_id: user.id }
// INSERT team_members { team_id, user_id, role: 'captain', status: 'accepted' }
```

### `respondToInvite`
```typescript
export async function respondToInvite(
  inviteId: string,
  response: 'accept' | 'decline'
): Promise<ActionResult>
// SELECT team_invites WHERE id = inviteId AND invited_user_id = user.id AND status = 'PENDING'
// Se expirado → UPDATE status = 'EXPIRED', return error
// Aceitar → RPC accept_team_invite(inviteId)
// Recusar → UPDATE team_invites SET status = 'DECLINED'
```

---

## Actions de Torneios

| Action | Arquivo | Descrição |
|---|---|---|
| `createTournament` | `app/organizer/actions.ts` | Cria torneio (status: DRAFT) |
| `updateTournament` | `app/organizer/actions.ts` | Atualiza dados do torneio |
| `publishTournament` | `app/organizer/actions.ts` | DRAFT → OPEN |
| `startTournament` | `app/organizer/actions.ts` | OPEN → IN_PROGRESS (gera chaveamento) |
| `finishTournament` | `app/organizer/actions.ts` | IN_PROGRESS → FINISHED |
| `cancelTournament` | `app/organizer/actions.ts` | Qualquer status → CANCELLED |
| `approveInscricao` | `app/organizer/actions.ts` | PENDING → APPROVED |
| `rejectInscricao` | `app/organizer/actions.ts` | PENDING → REJECTED |

### `publishTournament`
```typescript
export async function publishTournament(tournamentId: string): Promise<ActionResult>
// Guard: organizer_id === user.id OR is_admin
// Valida: status === 'DRAFT'
// Valida: tournament_rules existente
// UPDATE tournaments SET status = 'OPEN'
```

### `startTournament`
```typescript
export async function startTournament(tournamentId: string): Promise<ActionResult>
// Guard: organizer_id === user.id OR is_admin
// Valida: status === 'OPEN'
// Valida: inscricoes APPROVED >= 2
// Invoca Edge Fn: bracket-generator
// UPDATE tournaments SET status = 'IN_PROGRESS'
```

---

## Actions de Disputas

| Action | Arquivo | Descrição |
|---|---|---|
| `openDispute` | `app/torneios/actions.ts` | Abre disputa de resultado |
| `reviewDispute` | `app/admin/actions.ts` | Admin revisa e resolve |

### `openDispute`
```typescript
export async function openDispute(input: OpenDisputeInput): Promise<ActionResult>
// Valida: match.status === 'FINISHED'
// Valida: user é membro de um dos times da partida
// INSERT disputes { match_id, opened_by: user.id, status: 'OPEN', reason }
```

---

## Actions Administrativas

| Action | Arquivo | Guard | Descrição |
|---|---|---|---|
| `banUser` | `app/admin/actions.ts` | `is_admin = true` | Bloqueia perfil |
| `logAdminAction` | `app/admin/actions.ts` | `is_admin = true` | INSERT audit_log via RPC `log_admin_action` |
| `manageTerms` | `app/admin/actions.ts` | `is_admin = true` | Publica/atualiza `site_terms_acceptance` |

### Guard admin
```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('is_admin')
  .eq('id', user.id)
  .single()

if (!profile?.is_admin) return { success: false, error: 'Sem permissão' }
```

---

## Validação com Zod

Todas as actions que recebem input do usuário validam com Zod antes de qualquer operação no banco:

```typescript
import { z } from 'zod'

const CreateTeamSchema = z.object({
  name: z.string().min(3).max(30),
  tag:  z.string().min(2).max(5).toUpperCase(),
})

export async function createTeam(raw: unknown): Promise<ActionResult<{ teamId: string }>> {
  const parsed = CreateTeamSchema.safeParse(raw)
  if (!parsed.success) return { success: false, error: parsed.error.message }
  // ...
}
```

---

## Revalidação de Cache

Após mutations bem-sucedidas, as actions chamam `revalidatePath` para invalidar o cache do Next.js:

```typescript
import { revalidatePath } from 'next/cache'

// Após criar time:
revalidatePath('/teams')
revalidatePath(`/teams/${teamId}`)

// Após atualizar torneio:
revalidatePath(`/torneios/${slug}`)
revalidatePath(`/organizer/torneios/${tournamentId}`)
```

---

## Tratamento de Erros no Cliente

```typescript
// Componente cliente usando useTransition
'use client'
import { useTransition } from 'react'
import { createTeam } from './actions'

export function CreateTeamForm() {
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await createTeam(Object.fromEntries(formData))
      if (!result.success) {
        toast.error(result.error)
      }
    })
  }
  // ...
}
```
