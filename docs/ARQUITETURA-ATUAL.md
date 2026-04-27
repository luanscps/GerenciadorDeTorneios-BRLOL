# Arquitetura Atual — Stub de Documentação

> Este arquivo foi convertido em um stub para evitar duplicação de conteúdo.  
> A arquitetura completa do GerenciadorDeTorneios-BRLOL está documentada em:
>
> - `docs/BRLOL-DOCS-UNIFICADO.md`
>   - Seção **"Visão geral da arquitetura"** (Next.js, Supabase, Riot API, Edge Functions)
>   - Seção **"Fluxos principais de negócio"** (inscrições, chaveamento, resultados, leaderboards)
>   - Seção **"Riot Games API — Visão unificada"**
>   - Seção **"Edge Functions Supabase"**
>
> Para detalhes de rotas HTTP, cron jobs e rate limiting, consulte também os arquivos em `docs/api/`.

---

## Por que este arquivo é um stub

Antes, parte da arquitetura estava espalhada em múltiplos arquivos (`ARQUITETURA-ATUAL.md`, `arquitetura.md`, docs de API, docs de banco).  
Isso dificultava manter tudo sincronizado.

Agora:

- `BRLOL-DOCS-UNIFICADO.md` é a **fonte única de verdade** para arquitetura e domínio;
- `docs/api/*` contém apenas detalhes específicos da camada de API;
- este arquivo existe só para facilitar navegação/busca e redirecionar quem procurar por "arquitetura".

Se você encontrar qualquer divergência entre o comportamento real do sistema e o que está documentado, ajuste **diretamente** o `BRLOL-DOCS-UNIFICADO.md` e, se necessário, adicione um link ou comentário aqui apontando para a seção correta.
