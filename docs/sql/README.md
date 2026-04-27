# SQL do projeto BRLOL

> Este diretório contém materiais SQL auxiliares.
> A descrição funcional do modelo de dados está em [`../BRLOL-DOCS-UNIFICADO.md`](../BRLOL-DOCS-UNIFICADO.md).

## Conteúdo

- `SCHEMA-CORE-ATUAL.md`: visão detalhada do schema atual do banco de dados (tabelas, enums, FKs, índices). Já foi consolidado no documento unificado, mas é útil como referência histórica.
- `demo_seed.sql`: script de seed de dados de demonstração, usado em ambientes locais/labs.

Para qualquer alteração estrutural no banco, crie migrations em `supabase/migrations/` e mantenha o documento unificado como referência principal.
