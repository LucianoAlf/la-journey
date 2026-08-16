# Player de estudo — playalong na grade (corte C1)

Data: 2026-08-16  
Status: spec aprovada no chat (16/08, fim da tarde). Implementação ainda não.  
Corte: o professor abre uma **sala de estudo** e toca a grade que já escreveu — MP3 real, cursor no compasso, a página anda com o áudio. Não é PDF. Não é o editor.

Alvo visual: vídeo da Escola de Música Rafael Bastos (Ovelha Negra / Rita Lee) — retângulo azul no **compasso** ativo, count-in, troca de tela no fim do sistema. A gravura slash já está em produção; este corte só liga o play.

Nome de trabalho na sidebar: **Estudo**. Nome final depois. Rota: `/estudo`.

## Problema

O editor de material escreve e imprime a folha. Não há lugar para o professor, no tablet ou na TV da sala, dar play e acompanhar a grade com áudio de verdade.

O player do AlphaTab está **desligado** nos nove propósitos de `src/lib/alphaTabSettings.ts` (`enablePlayer: false`, `enableCursor: false`). A pauta da Ovelha já tem slash, `%`, `2/4` no meio e Solo `7x`. Qualquer playhead do tipo `currentTime / (60/BPM*4)` quebra nessa música.

## Dois ambientes (já travado)

| | Editor (A) | Estudo (C1) |
|---|---|---|
| Onde | `/editor/:id`, PrintView, download | `/estudo`, sidebar Operacional |
| Papel | A4 retrato ou deitada | Não é papel; é player |
| AlphaTab player | Continua desligado | Ligado **só** neste propósito |
| Áudio | Não | MP3 playalong + cursor no compasso |
| Quem | Professor escreve | Professor toca (aluno = radar) |

C1 não entra no PR do editor. Áudio didático (`feat/audio-didatico`) não mistura neste PR — o player **consome** um MP3 (URL), não gera Suno aqui.

## Norte do subproduto (radar, não este corte)

O LA Journey tem subprodutos. Estudo é o terceiro (depois de Editor Material e Repertório). O app de bateria dos vídeos (Metrônomo, Setlist, Áudios/loops, Estudos/rudimento, Smart) é o **norte**, não o C1.

No mapa, depois deste corte, o radar do subproduto Estudo fica nesta ordem:

1. Aluno na mesma sala (visão limpa; professor conduz).
2. Filtro de tipo de player (leitura, rudimento, loop…).
3. Loops / trading (áudio real por gênero) — o módulo Áudios do vídeo.
4. Rudimento com nota acendendo + “Ouvir exemplo”.
5. Metrônomo Smart (progressivo, drop, aleatório).
6. GarageBand de aula: professor monta blocos (bateria Vera, piano Vera, loop) e toca na hora. Timbre = samples/MP3, não TinySoundFont.
7. Synth de qualidade (GeneralUser GS / SF3 / SpessaSynth) como fallback quando **não** há faixa.
8. Soundslice embed (fase 3, Licensing) — já estava no radar; não substitui o C1.

## Decisões travadas

| Tema | Escolha |
|---|---|
| Onde mora | Página própria. Item novo em **Operacional**, depois de Visão Professor. Não é aba do editor. Não é modal |
| Rota | `/estudo` e `/estudo/:materialId`. Sem material: lista os que têm bloco de notação. Com id: abre a sala |
| Nome | **Estudo** neste corte. Troca de label não muda a rota |
| Quem | Só o professor autenticado. Sem visão de aluno, sem sessão tablet↔PC |
| Conteúdo | Um `generated_materials` que **já tem** pauta (`notation_data.beats`). Não clona beats. Não nasce tabela de “study set” |
| Áudio | MP3 (ou OGG) **real**. `PlayerMode.EnabledBackingTrack`. A pauta não sintetiza som neste corte |
| Onde grava | `page_config.playalong` no JSON que já existe. Sem coluna nova. Ausente → Play desligado, pauta visível |
| Forma | `{ audioUrl: string, countInMs?: number, syncPoints: PlayalongSyncPoint[] }`. `countInMs` default 0 se o count-in já estiver no MP3. Cada ponto: `masterBarIndex`, `masterBarOccurence`, `millisecondOffset`, `synthBpm` se o AlphaTab exigir |
| Sync | `BackingTrackSyncPoint` do AlphaTab. Tag `\sync` / `api.updateSyncPoints()`. **Não** `Math.floor(t / barDuration)` |
| Cursor | O cursor **nativo** do AlphaTab no **compasso** (retângulo, como no vídeo). Não é bolinha nota a nota. Nota a nota é rudimento, radar |
| Count-in | No próprio MP3. C1 não desenha baqueta |
| Página | O destaque traz o compasso à vista (scroll / troca de sistema). Não é a A4 do editor; não imprime daqui |
| Player no editor | Continua `enablePlayer: false` em todos os propósitos atuais. Novo propósito `study-playalong` é o único com player + cursor |
| Velocidade | C1 = play / pause. Stretch de MP3 e mudança de tom = radar (Music.AI / playbackRate) |
| Primeira prova | Ovelha Negra (45 compassos já no gerador). MP3 de playalong + sync points. Sem isso, o corte não fecha |
| Autoria do sync | Modo “marcar”: MP3 toca, professor acerta o tempo 1 de cada compasso (clique ou espaço). Persistido em `page_config.playalong.syncPoints`. Fixture da Ovelha pode nascer pronta para o smoke |
| Geração Suno | Fora. Faixa pronta (upload no storage ou URL). O cano Suno em `feat/audio-didatico` pode **alimentar** essa URL depois, em outro PR |
| Soundfont | Fora. `sonivox.sf2` não é “bateria Vera”. Troca de biblioteca = radar |

## Arquitetura

```
/estudo/:materialId
        │
        ▼
 generated_materials + blocks (notação)
        │
        ├── notation_data.beats → AlphaTex (o gerador que já existe)
        └── page_config.playalong.audioUrl + syncPoints
                    │
                    ▼
         AlphaTab purpose study-playalong
         playerMode = EnabledBackingTrack
         score.backingTrack + updateSyncPoints()
                    │
                    ├── HTMLAudioElement toca o MP3
                    └── cursor de compasso segue o tick map
                        (2/4, % e 7x inclusos)
```

`buildAlphaTabSettings` ganha o propósito `study-playalong`. Só nele `enablePlayer` e `enableCursor` ligam. Os nove propósitos de editor/canvas/snapshot não mudam.

A página Estudo **não** reusa o canvas A4 (régua, zoom 75%, blocos de texto, capa). É uma superfície: título, Play, pauta, transporte. Lista à esquerda ou um seletor de material no topo.

Upload do MP3: na própria sala (não no editor), para o storage da escola, URL gravada em `page_config.playalong.audioUrl`. Sem MP3, a pauta renderiza e o Play fica inerte.

## O que não se constrói

- Playhead por BPM / grade HTML de compassos (o snippet `secondsPer44Bar`).
- Ligar o player no editor de material.
- Visão do aluno, filtro de tipo, loops, 40 rudimentos, Smart, setlist.
- Mixer / GarageBand / soundfont “Vera”.
- Synth MIDI como fallback.
- Gerar áudio (Suno/Lyria) neste PR.
- Pitch / BPM stretch.
- Soundslice.
- PDF, print, orientação de papel (já é o corte A).
- Mexer no layout do AlphaTab **no editor**. Na sala, a pauta usa `layout: 'page'` e o **Por linha** do bloco de notação (o mesmo `barsPerRow` que o professor já gravou). Sem `LayoutMode.Horizontal`.

## Testes

- `enablePlayer` continua false nos propósitos de editor/canvas/snapshot.
- Propósito `study-playalong` liga player + cursor.
- Sync: um `2/4` no meio de `4/4` não atrasa o cursor (fixture com offset conhecido).
- Repeat `7x`: `masterBarOccurence` distingue a 1ª da 7ª volta; o cursor não estoura o fim da grade.
- `page_config.playalong` ausente ou `audioUrl` vazio → pauta ok, Play inerte, sem throw.
- `migratePageConfig` (ou o parse equivalente) não apaga `playalong`.

Prova visual: `/estudo` na sidebar; abrir a Ovelha; Play; count-in; retângulo no compasso 1; o 2/4 não descola; Solo 7x conta as voltas; a vista acompanha o sistema.

## Arquivos-chave

| Peça | Path |
|---|---|
| Rotas | `src/App.tsx` |
| Sidebar Operacional | `src/components/Sidebar.tsx` |
| Settings AlphaTab | `src/lib/alphaTabSettings.ts` |
| Superfície AlphaTab | `src/components/music/NotationAlphaTabSurface.tsx` |
| Beats → tex | `src/lib/beatsToAlphaTex.ts` |
| Fixture Ovelha | `src/lib/ovelhaNegraBeats.ts` |
| Page config | `src/pages/Editor.tsx` (`PageConfig`) — só o tipo / migrate; chrome de play **não** entra no editor |
| Material | `src/hooks/useMaterials.ts`, `src/services/materialService.ts` |
| Spec slash (gravura) | `docs/superpowers/specs/2026-08-16-ovelha-negra-slash-notation-design.md` |
| Spec folha (papel) | `docs/superpowers/specs/2026-08-16-folha-deitada-design.md` |
