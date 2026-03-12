---
trigger: always_on
---
# LA Journey — Workspace Rules

## Projeto
LA Journey: plataforma SaaS de material didático musical para escolas de música.
Stack: React + TypeScript + Vite + Tailwind CSS + shadcn/ui + Supabase + Phosphor Icons

## Tríade
- Alf decide (produto, negócio, pedagógico)
- Claude estrutura (backend, banco, migrations, RLS, seeds, Edge Functions)
- Cascade constrói (frontend, componentes, routing, services, hooks, UI)

## Regras
1. NUNCA altere o banco de dados (migrations, RLS, seeds) — responsabilidade do Claude
2. SEMPRE use tipagem forte (Database types do Supabase)
3. SEMPRE siga o design system (consulte a skill la-journey-design-system)
4. NUNCA hardcode credenciais — use .env.local
5. Ícones: SOMENTE @phosphor-icons/react — NUNCA Lucide, Heroicons ou outros
6. Fontes: Playfair Display (títulos), DM Sans (UI), DM Mono (código/tablatura)

## Padrões de Código
- Path alias: @/ → src/
- Services: src/services/nomeService.ts
- Hooks: src/hooks/useNome.ts → retornam { data, loading, error, refetch }
- Componentes UI: src/components/ui/ (shadcn/ui)
- Páginas: src/pages/
- Contextos: src/contexts/
- Types: src/lib/database.types.ts

## Referências
- PRD: docs/PRD.md
- Supabase: https://rkfszavfqplhorvfpkcq.supabase.co
- Auth dev: alf@lamusic.com.br / lajourney2026
