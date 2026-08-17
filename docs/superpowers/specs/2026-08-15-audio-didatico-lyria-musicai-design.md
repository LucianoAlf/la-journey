# Áudio didático — Suno V5.5 + Music.AI (Lyria fallback)

Data: 2026-08-15  
Atualizado: 2026-08-16  
Status: corte 1 no ar; motor de generate passou a Suno Music V5.5 instrumental  
Corte: gerar áudio (Suno) + cifrar (Music.AI). Lyria fica de fallback. Upload/stems depois.

## Problema

O professor precisa de vocalize, base para tocar junto e exercício com áudio **dentro do LA Journey**. Hoje a biblioteca é cifra/notação. Não há gerador de áudio, não há reconhecedor de cifra em cima de áudio, e `backing_tracks` / `repertoire.backing_track_url` existem sem UI.

Lyria 3.5 (Flow Music / assinatura Gemini) não tem model ID de API. No app usamos Lyria 3 via Gemini API. Music.AI (API B2B do Moises) lê áudio que já existe: cifra, BPM, e no corte 2 stems.

## Decisões travadas

| Tema | Escolha |
|---|---|
| Motores | Suno Music V5.5 gera (instrumental, tom no `style`). Music.AI cifra + BPM. Lyria 3 só se Suno não estiver configurado |
| API Suno | `POST /api/v1/generate` em api.sunoapi.org. `customMode` + `instrumental` + `model=V5_5`. Chave `SUNO_API_KEY` só na Edge. Probe 16/08: C e Fá 4/4 no tom. Sounds/dropdown não trava |
| API Lyria | Fallback. `lyria-3-clip-preview` / `lyria-3-pro-preview`. Não trava tom (Fá saiu Lá menor no probe) |
| API Music.AI | Job assíncrono `POST /v1/job`. Corte 1: `music-ai/chords-and-beat-mapping` (o slug `generate-chords` da doc/SDK **não existe** nesta conta). Chave só na Edge |
| Cifra na ficha | Opção B: mostra **pedido** e **reconhecido**. Reconhecido é editável. Não é MIDI travado |
| Escopo A/B/D | Vocalize, base, exercício. Música completa “de catálogo” (C) fora |
| Edges | `suno-generate` (principal), `lyria-generate` (fallback), `musicai-transcribe`. Client encadeia generate → cifra → retry se o tom não bater (máx. 2) |
| Orquestração | Client encadeia. Sem terceira Edge |
| UX do take | Player assim que o Lyria volta. Cifra entra depois. Falha de cifra não apaga áudio |
| Persistência | Tabela `practice_audio` (um take = uma linha). Regenerar cria linha nova |
| Destino ao salvar | `exercise_library` (bloco `audio` + cifra). Opcional: `backing_tracks` + `repertoire.backing_track_url` |
| Onde abre | Biblioteca → Exercícios → **Gerar áudio**. Ficha da música → **Gerar base** (mesmo modal, `kind=backing`) |
| Rota nova | Não |
| Caderno | Não mexe neste corte |
| Fila de produto | Item 4 do radar. Não fura caderno de exercício |
| Credenciais | Gemini local já existe. Music.AI **não**. Ver seção Credenciais |

## Credenciais

Não bloqueia escrever o plano nem o código das Edges. Bloqueia o **primeiro generate ao vivo**.

| Segredo | Onde | Estado em 15/08 |
|---|---|---|
| `VITE_GOOGLE_AI_KEY` / `GEMINI_API_KEY` | `.env` local (mesma chave) | Presente. Serve texto/imagem hoje no browser |
| `GEMINI_API_KEY` | Secret da Edge (Supabase) | **Já existe** (secret `GEMINI_API_KEY`, 13/08). `MUSIC_AI_API_KEY` na Edge desde 16/08 |
| Billing Gemini / Lyria | [Google AI Studio](https://aistudio.google.com/) | Generate ao vivo **ok** em 15/08. Clip 200 / 17s / 742 KB MP3. Pro 200 / 30s / 2.1 MB MP3. Áudio vem em `steps[].content[]` (`type=audio`), não em `output_audio` |
| `MUSIC_AI_API_KEY` | Só Edge + `.env` local (nunca `VITE_`) | No `.env` e na Edge desde 16/08 |
| `SUNO_API_KEY` | Só Edge + `.env` local (nunca `VITE_`) | Conta sunoapi.org da escola. Generate Music V5.5. Nunca no browser |
| Bucket | Storage | Já existe `audio-tracks` (privado, Fase A2). Usar este, não criar `practice-audio` |

Plano velho (`docs/FASE5-PLANO-MASTER.md` Fase C): “API key Music AI: Alf precisa contratar”. Continua verdadeiro. Sem essa chave, `musicai-transcribe` só passa no mock.

Como obter Music.AI: criar app no dashboard → API key → `supabase secrets set MUSIC_AI_API_KEY=...` e a mesma linha no `.env` local. PAYG basta para o corte 1.

## Fora deste corte (radar / pendente)

Registrado no mapa em 15/08. Não misturar no corte 1:

- Upload de MP3
- Stems
- Mute de faixa
- Click / cowbell
- Content ID (Audible Magic)
- YouTube como arquivo (não. Embed que já temos continua)
- Spotify como arquivo (não. Busca/link que já temos continua)
- Histórico longo de takes / fila
- Lyria 3.5 (quando a Google publicar model ID, troca o ID; a Edge não muda de forma)

## O que não se constrói

- Professor saindo para Flow Music / AI Studio
- Prompt solto no lugar da receita
- Download de YouTube/Spotify
- Terceira Edge orquestradora
- Página nova no menu
- Motor MIDI / AlphaTab para “travar” C–G–D no áudio
- Usar `moises-db` (dataset NC) no produto
- Expor `VITE_MUSIC_AI_API_KEY` ou chave Lyria no client

## Peças reutilizadas

| Peça | Uso |
|---|---|
| `VITE_GOOGLE_AI_KEY` / `GEMINI_API_KEY` | Já existe. Lyria usa a mesma família, **só na Edge** (não copiar o padrão Vite da imagem) |
| `exercise_library` + `ExerciseTab` | Destino do save; botão do modal |
| Bloco `audio` em `MaterialPreview` (`render_data.url`) | Player no material |
| `ImageGeneratorModal` | Padrão de modal de geração (não unificar tipos) |
| `RepertoireSheet` | Entrada **Gerar base** |
| `backing_tracks` + `repertoire.backing_track_url` | Vínculo opcional à música |
| `Integracoes.tsx` | Aviso se Gemini paid / Music.AI não configurados |
| `google-ai-auth.ts` / `ai-config.ts` | Não chamar Lyria pelo helper atual (`generateContent`). Interactions API é outro endpoint |

## Schema

`practice_audio`:

- `id` uuid pk
- `school_id` uuid
- `created_by` uuid
- `source` text: `lyria` \| `upload` (upload só no corte 2; corte 1 grava `lyria`)
- `kind` text: `vocalize` \| `backing` \| `exercise`
- `title` text
- `recipe` jsonb — ficha enviada (tom, BPM, duração, estilo, instrumentos, exclusões, acordes pedidos, escala, voz guia, nota livre)
- `lyria_model` text nullable — `lyria-3-clip-preview` \| `lyria-3-pro-preview`
- `audio_path` text — path no bucket `audio-tracks`
- `duration_seconds` int nullable
- `status` text: `generated` \| `transcribing` \| `transcribed` \| `transcribe_failed`
- `recognized_chords` jsonb nullable — `[{ start, end, chord }]`
- `recognized_bpm` numeric nullable
- `recognized_key` text nullable
- `musicai_job_id` text nullable
- `exercise_id` uuid nullable → `exercise_library`
- `repertoire_id` uuid nullable → `repertoire`
- `created_at`, `updated_at`

RLS por escola, no espírito de `exercise_library`.

Bucket **`audio-tracks`** (já existe, privado): signed URL para o player. Pay-as-you-go da Music.AI some em 48h — o arquivo canônico é o nosso. Não criar bucket `practice-audio`.

Ao **Salvar na biblioteca**:

1. Cria item em `exercise_library` com `content_type=exercise`, categoria por `kind` (`vocalize`→`scales`, `backing`→`progression`, `exercise`→`technique`). Blocos: `audio` (`render_data.url`) + `text` com a cifra reconhecida em linha (`C | G | D`), editável. Sem bloco novo.
2. Preenche `practice_audio.exercise_id`.
3. Se `repertoire_id` preenchido: insert em `backing_tracks` (`stem_type=mix`, `source=lyria`, `storage_path`) e set `repertoire.backing_track_url`.

Regenerar não apaga o take anterior.

## Arquitetura

```
Modal (receita)
    │
    ├─ invoke lyria-generate
    │     recipe → practiceAudioRecipe.ts → prompt
    │     Gemini Interactions (Lyria 3)
    │     Storage + INSERT practice_audio status=generated
    │     return { id, audioUrl, recipe }
    │
    ├─ player aparece
    │
    └─ invoke musicai-transcribe { practiceAudioId }
          UPDATE status=transcribing
          Music.AI job chords + beats
          poll GET /job/:id
          copia JSON; UPDATE chords/bpm/key status=transcribed
          (FAILED → transcribe_failed)
```

**`src/lib/practiceAudioRecipe.ts`** — puro. Receita → prompt Lyria. Sem rede.

**`lyria-generate`** — só gera e persiste áudio. Não fala com Music.AI.

**`musicai-transcribe`** — recebe `practiceAudioId` **ou** `audioUrl` (corte 2). Não fala com Lyria. Timeout ~2 min. Copia resultado para o nosso banco; não depende do CDN deles depois.

Client: um botão Gerar, duas invokes em sequência. Sem `VITE_` das duas APIs.

## Receita (UI)

Comum: título, tom, BPM (ou “modelo decide”), duração (30s / 1 / 2 / 3 min), estilo, instrumentos na base, o que tira da mix (voz com letra, bateria, violão…).

- **Vocalize:** escala/modo; voz guia sem letra default sim (“ah”); piano + banda default ligado.
- **Base:** acordes pedidos (chips); voz guia default não.
- **Exercício:** escala ou acordes; nota livre curta (“só braço 1”).

Modal: aba **Gerar** (corte 1) e **Enviar** (visível, desligada, “em breve”).

Resultado: player, bloco Pedido, bloco Reconhecido (timeline + BPM/tom). Editar reconhecido grava na linha, não regenera.

## Erros

| Caso | Comportamento |
|---|---|
| Filtro Lyria / artista / letra protegida | Mensagem clara. Não cria linha |
| Timeout / 5xx Lyria | Mensagem. Não cria linha |
| Lyria ok, Music.AI FAILED ou timeout | Linha `transcribe_failed`. Player ok. **Reconhecer de novo** |
| Sem billing Gemini / sem chave Music.AI | Integrações avisa. Gerar não dispara |
| Regenerar | Novo take. Take velho permanece |

## Testes

- `practiceAudioRecipe.test.ts`: vocalize em C com voz “ah”; base C–G–D sem vocal; pop sem bateria; duração 30s escolhe Clip, 2 min escolhe Pro; nota livre entra no prompt e não substitui a receita.
- `practiceAudioStatus.test.ts` (puro): transições `generated` → `transcribing` → `transcribed` / `transcribe_failed`; cifra falha não zera `audio_path`.
- Edges: contrato de input/output com fixtures (sem chamar Google/Music.AI de verdade no CI). Mock do fetch.
- Sem E2E pago neste corte.

## Como verifica (quando implementar)

1. Integrações: Gemini paid + Music.AI configurados.
2. Biblioteca → Exercícios → Gerar áudio → vocalize em C, 30s → player em alguns segundos → cifra depois.
3. Mesmo modal, base C G D, 2 min → pedido mostra C–G–D; reconhecido pode divergir; editar cifra e salvar.
4. Ficha de uma música → Gerar base → `kind=backing`, tom/BPM pré-preenchidos se a faixa tiver.
5. Salvar na biblioteca → exercício com bloco de áudio. Vincular repertório → `backing_track_url` preenchido.
6. Desligar Music.AI → áudio nasce, cifra falha, Reconhecer de novo.
7. Aba Enviar visível e inerte.

## Arquivos-chave (quando implementar)

| Peça | Path |
|---|---|
| Receita → prompt | `src/lib/practiceAudioRecipe.ts` |
| Tipos / status | `src/lib/practiceAudio.ts` |
| Modal | `src/components/music/PracticeAudioModal.tsx` |
| Serviço client | `src/services/practiceAudioService.ts` |
| Edge gerar | `supabase/functions/lyria-generate/index.ts` |
| Edge cifrar | `supabase/functions/musicai-transcribe/index.ts` |
| Migration | `supabase/migrations/YYYYMMDDHHMMSS_practice_audio.sql` |
| Integrações | `src/pages/Integracoes.tsx` |
| Entrada exercícios | `src/components/content/ExerciseTab.tsx` |
| Entrada ficha | `src/components/repertoire/RepertoireSheet.tsx` |
