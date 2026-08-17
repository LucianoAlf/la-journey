# Estudo — material a partir do MP3 (corte C2)

Data: 2026-08-16  
Status: spec aprovada no chat (16/08, noite). Implementação ainda não.  
Corte: o professor sobe um MP3 na lista do Estudo; o Music.AI lê cifra, BPM e tom; nasce um **material novo** com pauta slash + playalong já colado. A faixa é a fonte. A pauta não preexiste.

Depende do C1 (`feat/estudo-playalong`): sala `/estudo`, `page_config.playalong`, player com `<audio>` próprio (`EnabledExternalMedia`). Reusa a Edge `musicai-transcribe` já no ar. **Não** misturar com `feat/audio-didatico` (Suno/Lyria).

## Problema

O C1 cola um MP3 numa pauta que já existe. Subir uma faixa em “Intervalos Melódicos” deixa G7/Cmaj7 na folha e o áudio de outra música. O professor espera o inverso: o MP3 gera a grade.

AlphaTab não transcreve áudio. Soundslice tampouco (API). O motor pago é o Music.AI (`music-ai/chords-and-beat-mapping`), já ligado na Edge.

## Decisões travadas

| Tema | Escolha |
|---|---|
| Primeiro corte | Cifra + BPM + tom + compassos. **Sem** melodia |
| O que nasce | Sempre um `generated_materials` **novo**. Não escreve em Intervalos, Ovelha nem em material aberto |
| Onde sobe | Lista `/estudo`, botão **Do MP3**. Não é o Editor. Não é a aba Enviar da Biblioteca |
| Gravura | Slash 4/4, 4 por linha, cifra na faixa do acorde (o da Ovelha / lead sheet A) |
| Cifra no meio | No beat em que o `start` do acorde cai (quantizado). Não só no tempo 1 |
| Acorde que atravessa | Repete a cifra no tempo 1 do próximo compasso se ainda for o mesmo e nada novo começou ali |
| Sync | Pontos gerados dos timestamps. Professor **não** marca Espaço neste corte |
| Count-in | Silêncio antes do primeiro acorde/beat → `countInMs`. Não nasce compasso vazio de pickup |
| Compassos | 4/4 neste corte. Teto 200. 2/4 e 7x = radar |
| Áudio | MP3/OGG real no player C1. Sem synth, sem soundfont |
| Persistência | Bloco `notation` (`notation_data.beats`) + `page_config.playalong`. Sem tabela nova. Sem linha `practice_audio` |
| Correção | Cifra errada o professor conserta no **Editor** (K / faixa), não na sala |
| Play no material aberto | **Carregar playalong** continua só colando faixa. Não regenera pauta |
| Branch | `feat/estudo-playalong`. Não misturar Suno/Lyria |

## Fluxo do professor

1. `/estudo` → **Do MP3** → escolhe `audio/mpeg` ou `audio/ogg`.
2. A lista permanece. Card de espera: “Lendo cifra e compassos…”.
3. Sucesso: material novo, título = nome do arquivo sem extensão. Abre `/estudo/:id` com pauta + playalong + cursor.
4. Falha: toast + “Tentar de novo”. Nenhum material. Inbox apagado.

## Cano

```
arquivo
  → Storage público content-images/playalong/inbox/{uuid}.mp3
  → musicai-transcribe { audioUrl }
       workflow music-ai/chords-and-beat-mapping
       até ~2 min
  → { recognizedChords, recognizedBpm, recognizedKey }
  → fromMp3ToStudy()   // puro, sem rede
  → INSERT generated_materials + bloco notation + page_config.playalong
  → /estudo/:id
```

A Edge já aceita `{ audioUrl }` sem `practiceAudioId`. Resposta já existente: `recognizedChords: [{ start, end, chord }]`, `recognizedBpm`, `recognizedKey`. Client usa `preferSimplePopChords` (já no parser).

Se o job falhar, timeout, cifra vazia ou sem `MUSIC_AI_API_KEY`: apaga o objeto do inbox, não faz INSERT. Sem `school_id`: não cria. O mesmo arquivo pode ser enviado de novo.

## Conta do compasso (`fromMp3ToStudy`)

Entrada: acordes (`start`/`end` em **segundos**, como o Music.AI devolve), BPM, tom, duração opcional do áudio.  
Saída: `{ beats, keySignature, timeSignature: '4/4', bpm, barsPerSystem: 4, playalong }`.

- BPM: `recognizedBpm` se finito e > 0; senão **120**.
- `barMs = 4 * 60_000 / bpm`. `beatMs = barMs / 4`.
- Âncora: menor `start` entre acordes; se o JSON trouxer lista de beats com tempo, o menor desses tempos. `countInMs = round(âncora * 1000)`. Se `countInMs < 50`, vira `0`.
- Fim: maior `end` dos acordes (ou duração do áudio se maior). `barCount = min(200, max(1, ceil((endMs - countInMs) / barMs)))`.
- Cada compasso: 4 beats `{ pitches: [{ pitch: 'B/4' }], duration: 'q', slash: true }`. `barAfter: true` no 4º.
- Cifra: para cada acorde, `t = start * 1000 - countInMs`; beat global = `round(t / beatMs)` (clamp 0 … barCount*4-1). Grava `cifra` nesse beat. Dois acordes no mesmo beat: fica o de `start` maior.
- Atravessa: no tempo 1 de cada compasso sem cifra, se um acorde ainda cobre `countInMs + barIndex * barMs`, copia essa cifra.
- `keySignature`: primeiro token de `recognizedKey` antes de `major`/`minor` (trim). `C major` → `C`, `Eb major` → `Eb`. Vazio → `C`.
- Sync: um ponto por compasso, `masterBarIndex = i`, `masterBarOccurence = 0`, `syncTime = countInMs + i * barMs`. Se existir array de beats com timestamps, o tempo 1 de cada compasso é o timestamp do beat `i*4` (ms); senão a grade do BPM.
- `playalong = { audioUrl, countInMs, syncPoints }`.

O player **não** calcula `currentTime / BPM` na hora do play. Consome `syncPoints` como o C1.

## Player

Não muda o contrato da sala. Continua o `<audio>` próprio + `PlayerMode.EnabledExternalMedia` + cursor de compasso. `studyTexFromBlock` já emite `{slashed}` e `{ch}`.

## Testes

`npx tsx`, `node:assert/strict`, sem rede.

1. Fixture de acordes (silêncio 1,2 s + C no downbeat + G no 3º tempo do compasso 1 + Am no compasso 2) → `countInMs ≈ 1200`, cifra C no beat 0, G no beat 2, Am no tempo 1 do compasso 2, 4 slashes por barra, `syncPoints[0].syncTime === countInMs`.
2. Sem BPM no JSON → 120.
3. Cifra vazia → a função de persistir **não** é chamada (teste do orquestrador ou da guarda).
4. Dois acordes quantizados no mesmo beat → fica o mais tarde.

Smoke: um MP3 curto conhecido (ex. levada C–F–G). Sala abre com slash + cifra + som no Play. Intervalos e qualquer material velho intactos.

## Fora

Melodia; detecção de 2/4 e 7x; stems; stretch/tom; modo marcar Espaço; colar MP3 gerando pauta em material aberto; `practice_audio`; Suno/Lyria; Soundslice; aluno na sala.

## Peças

| Peça | Papel |
|---|---|
| `Estudo.tsx` lista | Botão Do MP3 + card de espera |
| `playalongUpload` / inbox | PUT em `content-images/playalong/inbox/{uuid}.mp3` |
| `musicai-transcribe` | Já no ar. Só `{ audioUrl }` |
| `fromMp3ToStudy.ts` | Puro. JSON → beats + playalong |
| `materialService` | INSERT material + bloco notation + `page_config` |
| `StudyPlayalongSurface` | Intocado no contrato |

## Primeira prova

Do MP3 com faixa de ~30 s e cifra óbvia. Material novo na lista. Play ouve o MP3. Cursor no compasso 1 no downbeat. Abrir Intervalos depois do teste: pauta antiga, sem o MP3 novo.
