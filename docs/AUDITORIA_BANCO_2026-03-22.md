# Auditoria do Banco de Dados

**Projeto:** LA Journey  
**Data:** 2026-03-22  
**Fonte:** [PRD.md](/mnt/d/2026/la-journey/la-journey/docs/PRD.md) + auditoria direta via Supabase MCP no projeto `rkfszavfqplhorvfpkcq`

## 1. Resumo Executivo

O banco está funcional, coerente com a maior parte do domínio descrito no PRD e já possui base suficiente para desenvolvimento real do produto. A arquitetura central do projeto existe: multi-tenant por `school_id`, catálogo curado, jornadas, repertório, materiais gerados, gamificação, WhatsApp, RAG e integrações musicais.

O ponto principal não é falta de estrutura, e sim desalinhamento entre o PRD e o schema real. O PRD da seção de banco está defasado: o banco evoluiu além do documento, ganhou tabelas e campos novos, mudou contagens globais e introduziu riscos de segurança/performance que agora precisam ser tratados como débito técnico explícito.

## 2. O Que o PRD Espera

Segundo o PRD, a plataforma deveria operar com:

- `23` tabelas
- `24` enums
- `~60` RLS policies
- `4` buckets de storage
- modelo single database com RLS por `school_id`
- conteúdo global com `school_id IS NULL`
- conteúdo privado com `school_id` preenchido

O PRD também registra evolução funcional importante:

- `notation_library` e `tablature_library` no changelog v4
- `gp_file_url` no `repertoire` no changelog v3
- `material_versions`, `page_config`, `image_library`, novos block types e curadoria ampliada nas versões mais recentes

## 3. Estado Real do Banco

### 3.1 Contagens consolidadas

- Tabelas `public`: `26`
- Enums `public`: `23`
- Policies RLS `public`: `83`
- Buckets: `5`
- Migrations registradas: `47`

### 3.2 Tabelas `public` existentes

- `achievements`
- `backing_tracks`
- `chord_library`
- `class_students`
- `classes`
- `content_blocks`
- `content_topics`
- `generated_materials`
- `image_library`
- `journey_stages`
- `journey_station_topics`
- `journey_stations`
- `journeys`
- `lesson_logs`
- `material_blocks`
- `material_versions`
- `notation_library`
- `repertoire`
- `scale_library`
- `schools`
- `student_achievements`
- `student_progress`
- `students`
- `users`
- `whatsapp_messages`
- `whatsapp_templates`

### 3.3 Buckets existentes

- `audio-tracks` (`private`)
- `content-images` (`public`)
- `generated-materials` (`private`)
- `gp-files` (`public`)
- `school-logos` (`public`)

### 3.4 RPCs / funções SQL públicas

- `add_material_block`
- `auto_classify_chord`
- `classify_slash_chord`
- `delete_material_block`
- `get_material_with_blocks`
- `get_my_school_id`
- `get_stage_stations`
- `get_station_blocks`
- `list_materials`
- `match_content_blocks`
- `match_content_topics`
- `normalize_chord_name`
- `reorder_material_blocks`
- `save_generated_material`
- `suggest_repertoire`
- `suggest_repertoire_partial`
- `update_embeddings_batch`
- `update_material_block`
- `update_updated_at`

## 4. Cobertura do Domínio

O schema real cobre os blocos centrais do produto:

- Gestão da escola: `schools`, `users`, `students`, `classes`, `class_students`
- Jornada/metodologia: `journeys`, `journey_stages`, `journey_stations`, `journey_station_topics`
- Base curada / RAG: `content_topics`, `content_blocks`, `chord_library`, `scale_library`, `notation_library`
- Repertório: `repertoire`, `backing_tracks`
- Materiais gerados: `generated_materials`, `material_blocks`, `material_versions`
- Monitoramento: `student_progress`, `lesson_logs`, `achievements`, `student_achievements`
- Comunicação: `whatsapp_messages`, `whatsapp_templates`
- Biblioteca de assets: `image_library`

Isso deixa o projeto pronto para desenvolvimento de features reais sem necessidade de reestruturar o núcleo do banco.

## 5. Dados Existentes Hoje

A base já contém conteúdo suficiente para desenvolvimento e testes de fluxos principais:

- `schools`: `1`
- `users`: `6`
- `students`: `8`
- `classes`: `7`
- `journeys`: `2`
- `journey_stages`: `8`
- `journey_stations`: `13`
- `journey_station_topics`: `34`
- `content_topics`: `41`
- `content_blocks`: `71`
- `repertoire`: `2935`
- `chord_library`: `10603`
- `notation_library`: `27`
- `image_library`: `18`
- `generated_materials`: `3`
- `material_blocks`: `38`

Tabelas ainda praticamente sem uso operacional:

- `class_students`: `0`
- `lesson_logs`: `0`
- `student_achievements`: `0`
- `whatsapp_messages`: `0`
- `backing_tracks`: `0`
- `material_versions`: `0`

Leitura prática: o produto já tem catálogo, jornada e repertório; os módulos mais “transacionais” ainda não foram exercitados em produção.

## 6. Divergências PRD x Banco

### 6.1 O PRD está desatualizado

O PRD afirma `23 tabelas`, `24 enums`, `~60 policies`, `4 buckets`. O banco real hoje tem:

- `26` tabelas
- `23` enums
- `83` policies
- `5` buckets

### 6.2 Tabelas existentes no banco mas ausentes na seção 8 do PRD

- `image_library`
- `material_versions`
- `notation_library`

Observação:
- `notation_library` aparece no changelog v4, mas não foi incorporada corretamente ao inventário formal do schema.

### 6.3 Tabela mencionada no PRD/changelog e ausente no banco

- `tablature_library`

Verificação direta em `information_schema.tables`: não existe tabela com esse nome em nenhum schema.

### 6.4 Campos que evoluíram além do PRD

Diferenças relevantes no schema real:

- `repertoire` ganhou `country`
- `generated_materials` ganhou `page_config`
- `content_topics` ganhou `embedding`, `source_document`, `curation_status`, `curated_by`, `school_id`
- `content_blocks` no banco real não tem `is_edited` nem `original_content`; em vez disso ganhou `curation_status`, `curated_by`, `version`, `embedding`, `ai_metadata`
- `material_blocks` expandiu `block_type` para incluir `cover`, `chord_grid`, `keyboard`, `keyboard_grid`, `page_break`, `rhythm`
- `chord_library` evoluiu bastante além do PRD com `root_note`, `quality`, `family`, `sort_order`, `has_barre`, `canonical_name`, `slash_type`, `caged_shape`, `voicing_position`

Conclusão:
- o banco real é mais rico do que o PRD documenta
- para desenvolvimento novo, o schema real deve ser a fonte primária
- o PRD precisa de revisão para não induzir implementação errada

## 7. Multi-Tenancy e RLS

O desenho principal do PRD está presente:

- RLS está habilitado em todas as tabelas públicas auditadas
- o padrão `school_id` aparece nas entidades multi-tenant centrais
- o modelo híbrido “global vs privado” existe em tabelas como `content_topics`, `content_blocks` e `repertoire`

Sinais positivos:

- todas as tabelas inventariadas em `public` estão com `rls_enabled = true`
- há `83` policies ativas
- a estrutura de conteúdo global com `school_id` nullable está implementada

Débito técnico relevante:

- a policy `repertoire_delete` foi sinalizada pelo advisor como permissiva demais, com `USING (true)` para `DELETE`

Isso é o ponto de segurança mais crítico do banco hoje.

## 8. Segurança e Governança

### 8.1 Alertas de segurança do advisor

Encontrados:

- `repertoire_delete` com RLS permissiva demais
- funções com `search_path` mutável:
  - `suggest_repertoire`
  - `suggest_repertoire_partial`
  - `normalize_chord_name`
  - `update_embeddings_batch`
  - `get_material_with_blocks`
  - `classify_slash_chord`
  - `auto_classify_chord`
- proteção contra senhas vazadas no Supabase Auth está desabilitada

### 8.2 Buckets públicos

Buckets públicos atuais:

- `content-images`
- `gp-files`
- `school-logos`

Isso pode ser correto para consumo frontend, mas precisa ser decisão explícita de produto e segurança. No estado atual, o PRD não documenta essa exposição com precisão.

## 9. Performance e Escalabilidade

### 9.1 Alertas relevantes do advisor

Foram encontrados:

- FKs sem índice cobrindo:
  - `content_topics.curated_by`
  - `image_library.created_by`
  - `material_versions.created_by`
- várias policies com `auth.<function>()` avaliadas por linha, em vez de `(select auth.<function>())`
- múltiplas permissive policies em `content_topics`
- muitos índices ainda sem uso estatístico

### 9.2 Interpretação

Hoje isso não bloqueia desenvolvimento. O volume ainda é pequeno em quase todas as tabelas operacionais. Mas, para escalar:

- `content_topics`
- `image_library`
- `material_versions`
- `notation_library`
- `chord_library`

precisam de ajuste fino de policies e índices antes de tráfego maior.

## 10. Maturidade por Área

### Pronto para desenvolvimento real

- jornada e metodologia
- catálogo de conteúdo
- repertório
- geração e edição de material
- biblioteca de acordes
- notação musical
- assets de imagem

### Estrutura pronta, mas uso ainda incipiente

- matrícula de alunos em turmas
- registro operacional de aulas
- desbloqueio de conquistas
- histórico de versões
- mensageria WhatsApp
- backing tracks

## 11. O Que Eu Considero Fonte de Verdade a Partir de Agora

Para desenvolvimento:

- fonte de verdade funcional: banco real + migrations + Edge Functions
- fonte de verdade conceitual: PRD
- quando houver conflito entre PRD e schema atual, o schema atual deve prevalecer até o PRD ser atualizado

## 12. Ações Recomendadas

Prioridade alta:

- corrigir a policy `repertoire_delete`
- fixar `search_path` nas funções sinalizadas
- habilitar leaked password protection no Auth

Prioridade média:

- revisar e simplificar policies de `content_topics`
- trocar chamadas RLS para `(select auth.uid())` / `(select auth.jwt())` quando aplicável
- adicionar índices cobrindo FKs faltantes

Prioridade documental:

- atualizar a seção 8 do [PRD.md](/mnt/d/2026/la-journey/la-journey/docs/PRD.md)
- decidir se `tablature_library` foi abandonada, substituída por outro modelo ou simplesmente não migrada
- documentar buckets públicos vs privados

## 13. Conclusão

O projeto não está “no começo do banco”. Ele já tem um backbone sólido e relativamente maduro para produto real. O maior risco hoje é de documentação defasada e alguns pontos pontuais de segurança/performance, não de modelagem insuficiente.

Para continuidade de desenvolvimento, o contexto está claro:

- o núcleo do domínio já está modelado
- há dados reais para trabalhar
- RLS está presente
- existem RPCs úteis para editor e recomendação
- existem alguns débitos técnicos objetivos que merecem correção antes de expansão mais agressiva

Com base nesta auditoria, o projeto está pronto para desenvolvimento incremental sem refazer o schema.
