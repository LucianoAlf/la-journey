# Auditoria de RLS e Auth Multi-Tenant

**Projeto:** LA Journey  
**Data:** 2026-03-22  
**Base de comparação:** [PRD.md](/mnt/d/2026/la-journey/la-journey/docs/PRD.md) + auditoria direta no Supabase via MCP

## 1. Resumo Executivo

O projeto **tem isolamento multi-tenant parcial implementado**, mas **não do jeito que o PRD descreve**.

O PRD afirma:

- isolamento por `school_id` no JWT
- policies RLS filtrando por claim do JWT
- storage com path `{school_id}/...`

O banco real hoje faz algo diferente:

- quase todo o isolamento usa `auth.uid()` + lookup em `public.users`
- a função `public.get_my_school_id()` é o pivô de tenancy
- não encontrei policy usando `auth.jwt()` nem claim customizado `school_id`
- há RPCs `SECURITY DEFINER` expostas para `anon` e `authenticated`
- há uma policy claramente insegura: `public.repertoire.repertoire_delete`
- o modelo de storage não está refletido nas policies como o PRD promete

Conclusão pragmática:

- o isolamento por escola existe em boa parte das tabelas
- a implementação atual depende fortemente de `public.users`
- o fluxo de auth ainda não está maduro o suficiente para dizer que multi-tenancy está “fechado”
- há riscos reais de bypass via RPCs `SECURITY DEFINER` se chamadas do cliente não forem controladas

## 2. O Que o PRD Diz

Trecho relevante do PRD:

- “Single database, RLS por `school_id`”
- “Todas as policies RLS filtram por `school_id` do JWT”
- “Autenticação: Supabase Auth com JWT customizado (`school_id` no claim)”
- “Storage: buckets com path `{school_id}/logos/`, `{school_id}/materials/`”

## 3. O Que o Banco Faz de Fato

### 3.1 Estratégia real de tenancy

O banco usa majoritariamente este padrão:

- `auth.uid()` identifica o usuário autenticado
- `public.users` guarda `school_id`
- RLS consulta `public.users` para descobrir a escola do usuário
- várias policies usam `get_my_school_id()`

Função central:

- `public.get_my_school_id()`  
  Implementação: `SELECT school_id FROM public.users WHERE id = auth.uid()`

Isso significa que o isolamento **não depende do JWT customizado com `school_id`**, mas sim da integridade entre:

- `auth.users.id`
- `public.users.id`
- `public.users.school_id`

### 3.2 Evidência objetiva

Estado atual dos usuários:

- `auth.users`: `1`
- `public.users`: `6`
- `public.users` sem `school_id`: `0`

Achado importante:

- só **1** usuário em `auth.users`
- existem **6** usuários em `public.users`
- **5** usuários de domínio não existem em `auth.users`

Impacto:

- na prática, boa parte dos perfis do sistema ainda não pode exercer RLS real via login Supabase
- o isolamento multi-tenant ainda não foi provado com um conjunto real de usuários autenticados

## 4. Cobertura de RLS por Tabela

### 4.1 Tabelas com isolamento claro por `school_id`

Estas estão aderentes ao modelo esperado:

- `schools`
- `users`
- `students`
- `classes`
- `journeys`
- `generated_materials`
- `whatsapp_messages`
- `whatsapp_templates`

Padrão comum:

- `school_id = get_my_school_id()`
- ou `school_id in (select users.school_id from users where users.id = auth.uid())`

### 4.2 Tabelas sem `school_id`, mas isoladas por relacionamento

Isolamento indireto, ainda aceitável:

- `class_students` via `classes`
- `journey_stages` via `journeys`
- `journey_stations` via `journey_stages -> journeys`
- `journey_station_topics` via `journey_stations -> journey_stages -> journeys`
- `material_blocks` via `generated_materials`
- `student_progress` via `students`
- `student_achievements` via `students`
- `lesson_logs` via `students`
- `backing_tracks` via `repertoire`

Esse modelo é coerente, mas mais frágil de manter do que filtrar direto por `school_id`.

### 4.3 Tabelas globais ou quase globais

Estas não são multi-tenant no sentido estrito:

- `achievements` com `SELECT true`
- `chord_library` com `SELECT true`
- `scale_library` com `SELECT true`
- `notation_library` com `SELECT true` para `authenticated`

Isso pode ser intencional, porque são bibliotecas globais. O ponto é que isso precisa estar documentado como escolha de produto, não tratado como tenancy padrão.

### 4.4 Tabelas mistas global + privada

O padrão existe e está coerente:

- `content_blocks`: `school_id IS NULL OR school_id = get_my_school_id()`
- `repertoire`: `school_id IS NULL OR school_id = get_my_school_id()`
- `content_topics`: também suporta `school_id IS NULL`, mas com policies excessivamente permissivas, detalhadas abaixo

## 5. Principais Achados

### Crítico 1: `repertoire_delete` ignora tenancy

Tabela:

- `public.repertoire`

Policy:

- `repertoire_delete`
- `USING (true)`

Impacto:

- qualquer role atingida por essa policy pode deletar qualquer registro visível ao comando, sem restrição de escola
- isso quebra completamente o modelo multi-tenant para `DELETE`

Status:

- esse é o achado mais grave da auditoria

### Crítico 2: RPCs `SECURITY DEFINER` expostas a `anon` e `authenticated`

Funções sensíveis encontradas com `SECURITY DEFINER`:

- `add_material_block`
- `delete_material_block`
- `get_material_with_blocks`
- `get_stage_stations`
- `get_station_blocks`
- `list_materials`
- `match_content_blocks`
- `match_content_topics`
- `reorder_material_blocks`
- `save_generated_material`
- `suggest_repertoire`
- `suggest_repertoire_partial`
- `update_embeddings_batch`
- `update_material_block`

Além disso, todas essas funções estão com `EXECUTE` concedido para:

- `anon`
- `authenticated`

Risco:

- `SECURITY DEFINER` roda com privilégios do dono da função
- se a função não reaplica tenant check internamente, ela pode bypassar RLS

Casos mais sensíveis:

- `get_material_with_blocks(p_material_id uuid)`  
  Faz `WHERE gm.id = p_material_id` e **não verifica `school_id` do chamador**

- `save_generated_material(p_school_id uuid, ...)`  
  Recebe `p_school_id` como parâmetro e **não valida se o caller pertence àquela escola**

- `list_materials(p_school_id uuid)`  
  Pelo padrão do projeto, também merece revisão imediata, porque aceita `school_id` por parâmetro

Leitura prática:

- mesmo em ambiente de desenvolvimento, isso distorce teste de autorização
- o frontend pode parecer “funcionar” mesmo quando a camada de auth está errada

### Alto 3: o PRD diz “JWT com school_id”, mas o banco não usa isso

Não encontrei policies usando:

- `auth.jwt()`
- claim customizado `school_id`

A implementação real usa:

- `auth.uid()`
- consulta à tabela `public.users`

Impacto:

- o PRD não descreve o mecanismo real
- qualquer implementação futura baseada no PRD, sem olhar o schema, tende a errar

### Alto 4: `public.users` é dependência estrutural do auth, mas está incompleto

Hoje:

- `auth.users = 1`
- `public.users = 6`

Impacto:

- quase todos os usuários de domínio existem só como perfil de aplicação
- não como usuários autenticáveis reais do Supabase Auth

Consequência:

- RLS depende de um cadastro que ainda não está refletido no auth real
- a plataforma não está pronta para dizer “auth multi-tenant está validado”

### Médio 5: `content_topics` tem policies contraditórias

Achados:

- `content_topics_select_all` usa `USING (true)`
- coexistem policies específicas por `school_id` e policies curator/global
- o advisor já sinalizou múltiplas permissive policies

Impacto:

- a tabela perde previsibilidade
- o comportamento real tende a ser mais aberto do que o modelo de tenancy sugere

### Médio 6: `get_material_with_blocks` está desatualizada em relação ao schema

A função ainda referencia:

- `mb.is_edited`
- `mb.original_content`

Mas o schema atual de `material_blocks` não tem mais essas colunas.

Impacto:

- a função provavelmente é resíduo de schema anterior
- além do risco de autorização, ela pode não refletir corretamente o estado atual do editor

### Médio 7: policies de storage não implementam path-based tenancy

O PRD fala em paths como:

- `{school_id}/logos/`
- `{school_id}/materials/`

Mas as policies em `storage.objects` que encontrei fazem só:

- check por `bucket_id`
- check por `auth.role() = 'authenticated'`

Não há enforcement por prefixo de path contendo `school_id`.

Impacto:

- o modelo real de storage não corresponde ao PRD
- se uploads client-side crescerem, esse ponto precisa de regra explícita

## 6. Storage: Situação Atual

Buckets atuais:

- `audio-tracks` (`private`)
- `content-images` (`public`)
- `generated-materials` (`private`)
- `gp-files` (`public`)
- `school-logos` (`public`)

Policies encontradas explicitamente em `storage.objects`:

- `gp-files`: leitura pública, insert/delete autenticado
- `content-images`: leitura pública, insert/update/delete autenticado

Não vi enforcement de:

- prefixo por `school_id`
- separação por tenant no path

## 7. Tabelas e Políticas: Leitura de Maturidade

### O que já está bom

- uso consistente de `get_my_school_id()` em boa parte das tabelas operacionais
- isolamento indireto bem encadeado nas entidades relacionais
- conteúdo misto global/privado existe e funciona conceitualmente

### O que ainda não está maduro

- auth real para todos os perfis do sistema
- coerência entre PRD e implementação
- hardening de RPCs expostas
- storage tenancy
- consistência entre RLS e funções auxiliares

## 8. Conclusão Prática Para Desenvolvimento

Se a pergunta for “já dá para desenvolver em cima disso?”, a resposta é:

- **sim**, porque o modelo principal está lá

Se a pergunta for “já dá para confiar que auth multi-tenant está fechado?”, a resposta é:

- **não**

O estado mais honesto hoje é:

- multi-tenancy de leitura e CRUD básico está parcialmente modelado
- auth real ainda está incompleto
- há bypass potencial via RPCs `SECURITY DEFINER`
- a tabela `repertoire` tem uma falha objetiva de `DELETE`

## 9. Prioridades Recomendadas

### Se for mexer pouco agora

- corrigir `repertoire_delete`
- revisar e restringir `EXECUTE` de RPCs `SECURITY DEFINER`
- auditar `get_material_with_blocks`, `save_generated_material` e `list_materials`

### Antes de colocar auth real no frontend

- criar usuários faltantes em `auth.users`
- validar o fluxo de sincronização `auth.users -> public.users`
- decidir se tenancy vai continuar baseado em `auth.uid()` + lookup ou migrar para claim no JWT

### Antes de produção

- alinhar PRD com a implementação real
- corrigir storage policies para refletir o modelo desejado
- revisar todas as funções `SECURITY DEFINER`

## 10. Veredito

O projeto **não está inseguro por completo**, mas o módulo de Auth/RLS **não está pronto para ser tratado como finalizado**. Há base suficiente para seguir desenvolvendo, desde que o time trate este tema como uma frente própria e não assuma que “RLS já está resolvido” só porque as policies existem.
