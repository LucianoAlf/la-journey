# Auditoria de selects nativos

Data: 2026-05-14

Objetivo: identificar menus/selects que ainda usam controles nativos do navegador/Windows e priorizar a migração para componentes do design system LA Journey.

## Resultado da busca

Comando executado:

```bash
rg -n "<select\\b" src --glob "*.tsx" --glob "*.ts"
```

Foram encontrados 3 usos de `<select>` nativo.

## Inventário

| Arquivo | Linha | Contexto de uso | Impacto visual | Observação |
| --- | ---: | --- | --- | --- |
| `src/pages/Editor.tsx` | 7327 | Seletor de fonte dos textos avançados da capa, na sidebar direita da aba Textos | Alto | Aparece no fluxo atual de edição visual da capa e destoava do design system. Prioridade 1. |
| `src/components/editor/RichTextEditor.tsx` | 246 | Seletor de fonte das toolbars rich text usadas em blocos comuns | Médio | Aparece em vários blocos de conteúdo. Prioridade 2 para não ampliar o risco nesta passada. |
| `src/pages/Professor.tsx` | 31 | Seletor de turma do dia na visão do professor | Baixo | Fora do editor de material. Não entra na Fase 1 do editor/capa. |

## Campos relacionados sem `<select>` nativo

Alguns campos visualmente relacionados já não usavam `<select>` nativo, mas ainda se beneficiam de um wrapper global para manter consistência:

| Arquivo | Contexto | Estado antes da migração | Prioridade |
| --- | --- | --- | --- |
| `src/pages/Editor.tsx` | Direção visual da capa, sucessora prática do antigo template da capa | Já usava `Select` shadcn diretamente | Prioridade 1 |
| `src/pages/Editor.tsx` | Instrumento da capa em Metadados | Usava `Input` livre | Prioridade 1, convertido para presets com `LASelect` |
| `src/pages/Editor.tsx` | Nível da capa em Metadados | Usava `Input` livre | Prioridade 1, convertido para presets com `LASelect` |

## Prioridade de migração

### Prioridade 1, nesta passada

- Fonte dos textos da capa.
- Direção visual/template da capa.
- Instrumento da capa.
- Nível da capa.

### Prioridade 2, próxima passada

- Select de fonte em `RichTextEditor`.
- Selects do editor de notação e tablatura, se existirem como componentes próprios ou dropdowns não padronizados.
- Demais menus do editor de material que não usem o design system.

## Riscos e cuidados

- Não alterar autosave nem estrutura de `render_data`.
- Não tocar em renderizadores musicais.
- Não alterar o pipeline de PDF.
- Para fontes futuras, garantir que o editor e a rota `/print/:id` carreguem as mesmas famílias antes de gerar PDF via Browserless.
