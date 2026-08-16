# Áudio didático corte 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Professor gera vocalize/base/exercício com Lyria 3 e recebe cifra/BPM via Music.AI, tudo dentro do LA Journey.

**Architecture:** Modal de receita → client encadeia `lyria-generate` (prompt + Interactions API + Storage + `practice_audio`) e `musicai-transcribe` (job chords+beats). Sem terceira Edge. Upload fica aba inerte.

**Tech Stack:** React/Vite, Supabase Edge (Deno), Gemini Interactions (`lyria-3-clip-preview` / `lyria-3-pro-preview`), Music.AI `POST /v1/job`, bucket `audio-tracks`, `npx tsx` tests.

**Spec:** `docs/superpowers/specs/2026-08-15-audio-didatico-lyria-musicai-design.md`

**Branch:** `feat/audio-didatico` from `origin/main`. Sem worktree. Sem misturar stash de image-gen.

---

## Files

| Peça | Path |
|---|---|
| Tipos / status / extract / cifra | `src/lib/practiceAudio.ts` |
| Receita → prompt + modelo | `src/lib/practiceAudioRecipe.ts` |
| Testes | `src/lib/__tests__/practiceAudio.test.ts`, `practiceAudioRecipe.test.ts` |
| Shared Edge | `supabase/functions/_shared/practice-audio.ts` |
| Edge gerar | `supabase/functions/lyria-generate/index.ts` |
| Edge cifrar | `supabase/functions/musicai-transcribe/index.ts` |
| Migration | `supabase/migrations/20260816010000_practice_audio.sql` |
| Service | `src/services/practiceAudioService.ts` |
| Modal | `src/components/music/PracticeAudioModal.tsx` |
| Entradas | `ExerciseTab.tsx`, `RepertoireSheet.tsx`, `Integracoes.tsx` |
| Env exemplo | `.env.example` |

---

### Task 1: Libs puras (TDD)

**Files:**
- Create: `src/lib/practiceAudio.ts`
- Create: `src/lib/practiceAudioRecipe.ts`
- Test: `src/lib/__tests__/practiceAudio.test.ts`
- Test: `src/lib/__tests__/practiceAudioRecipe.test.ts`

- [ ] **Step 1: Testes que falham** — status, extract Lyria, parse Music.AI, vocalize C “ah”, base C–G–D sem vocal, pop sem bateria, 30s=Clip / 120s=Pro, nota livre append.
- [ ] **Step 2: Implementar o mínimo** e passar `npx tsx` nos dois arquivos.

### Task 2: Migration

**Files:**
- Create: `supabase/migrations/20260816010000_practice_audio.sql`

- [ ] **Step 1:** Tabela `practice_audio` + RLS por escola + `is_dev_admin`. Sem criar bucket.

### Task 3: Edges

**Files:**
- Create: `supabase/functions/_shared/practice-audio.ts`
- Create: `supabase/functions/lyria-generate/index.ts`
- Create: `supabase/functions/musicai-transcribe/index.ts`

- [ ] **Step 1:** `lyria-generate` — auth JWT, compile prompt, POST Interactions (`x-goog-api-key`, `{ model, input: prompt }`), extract `steps[].content[]`, upload `audio-tracks`, INSERT `generated`, signed URL. `{ ping: true }` se `GEMINI_API_KEY`.
- [ ] **Step 2:** `musicai-transcribe` — `{ practiceAudioId }` ou `{ audioUrl }`, signed URL → jobs `music-ai/generate-chords` + beats, poll ~2 min, UPDATE. FAILED → `transcribe_failed` sem zerar `audio_path`. `{ ping: true }` se `MUSIC_AI_API_KEY`.

### Task 4: Client

**Files:**
- Create: `src/services/practiceAudioService.ts`
- Create: `src/components/music/PracticeAudioModal.tsx`
- Modify: `src/components/content/ExerciseTab.tsx`
- Modify: `src/components/repertoire/RepertoireSheet.tsx`
- Modify: `src/pages/Integracoes.tsx`
- Modify: `.env.example`

- [ ] **Step 1:** Service invoke + save biblioteca (bloco `audio` + texto `C | G | D`) + opcional `backing_tracks`.
- [ ] **Step 2:** Modal receita / player / pedido vs reconhecido / aba Enviar inerte.
- [ ] **Step 3:** Botão **Gerar áudio** e **Gerar base**. Integrações: Gemini menciona Lyria; card Music.AI (chave só na Edge).

### Task 5: Verificar

- [ ] `npx tsx` nos testes novos + um existente.
- [ ] `npx tsc --noEmit` se o tempo permitir.
- [ ] Atualizar mapa e status da spec.
- [ ] Não commitar `.env`. Não deployar Edges sem pedido.

## Como verifica no ar (depois do deploy)

1. Exercícios → Gerar áudio → vocalize C 30s → player → cifra.
2. Base C G D 2 min → pedido vs reconhecido.
3. Ficha → Gerar base pré-preenche tom/BPM.
4. Salvar na biblioteca. Vincular repertório preenche `backing_track_url`.
5. Aba Enviar visível e morta.
