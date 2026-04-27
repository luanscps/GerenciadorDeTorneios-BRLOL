# Banco de Dados — Stub de Documentação

> Este arquivo foi simplificado para evitar divergência com a documentação principal.  
> O **modelo de dados completo** do GerenciadorDeTorneios-BRLOL (tabelas, colunas, enums, FKs, RLS, views e funções) está descrito em detalhes em:
>
> - `docs/BRLOL-DOCS-UNIFICADO.md`
>   - Seção **"Modelo de dados — schema público Supabase"**
>   - Seção **"Views e estatísticas"** (leaderboards, KDA, standings)
>   - Seção **"Notificações e auditoria"**
>
> Quando precisar entender **como os dados são persistidos**, **quem pode ler/escrever** (RLS) ou **como uma feature usa o banco**:
>
> 1. Comece por `BRLOL-DOCS-UNIFICADO.md`.
> 2. Se for algo específico de API, veja também `docs/api/supabase.md`.

---

## Como usar este stub

- Este arquivo existe apenas para:
  - aparecer em buscas por "banco" / "database" no repositório;
  - lembrar que o **único ponto de verdade** do schema é o documento unificado;
  - evitar que alguém atualize aqui e esqueça de atualizar o resto.

Se você achar que falta alguma informação de banco na documentação, **não adicione aqui**: abra um PR ajustando diretamente `BRLOL-DOCS-UNIFICADO.md`.
