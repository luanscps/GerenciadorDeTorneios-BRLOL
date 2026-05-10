# SQL do projeto BRLOL

> Este diretório contém materiais SQL auxiliares e a documentação do schema do banco de dados.

## Conteúdo

- [`SCHEMA-CORE-ATUAL.md`](SCHEMA-CORE-ATUAL.md): Visão detalhada do schema atual do banco de dados (tabelas, enums, FKs, índices, views e funções RPC), gerado a partir dos dados reais do Supabase.
- `demo_seed.sql`: Script de seed de dados de demonstração, usado em ambientes locais/labs.

Para uma visão funcional e de negócio do modelo de dados, consulte [`../BRLOL-DOCS-UNIFICADO.md`](../BRLOL-DOCS-UNIFICADO.md).

Qualquer alteração estrutural no banco deve ser feita através de migrations em `supabase/migrations/`.
