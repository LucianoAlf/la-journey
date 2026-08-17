# Estudo — sala independente (corte B)

Data: 2026-08-17  
Status: implementada na branch `feat/estudo-playalong`. Plano: `docs/superpowers/plans/2026-08-17-estudo-sala-independente.md`.  
Corte: a sala `/estudo` deixa de ser um espelho do caderno. Vira catálogo próprio (só faixa nascida no Estudo), com rename rápido, CRUD, cifra clicável, gravura por modo, folha com marca da escola e impressão.

Depende do C1 (player + `page_config.playalong`) e do C2 (Do MP3). Branch: `feat/estudo-playalong`. **Não** misturar `feat/audio-didatico`.

C1 dizia “não imprime daqui” e C2 dizia “cifra errada conserta no Editor”. Este corte **substitui** os dois, só na sala.

## Problema

O professor sobe um MP3 e quer estudar **aqui**. Hoje a lista mistura Intervalos, caderno e teoria. O título nasce do arquivo e não dá para trocar na hora. Cifra errada do Music.AI manda abrir o Editor. Slash em F ganha bequadro. “rendered by alphaTab” aparece no meio da pauta. Não há folha com logo da escola, nome de quem curadorou, marca Alf, nem imprimir pro aluno.

## Norte (radar, não este corte)

Escrita completa tipo MuseScore na sala: acrescentar compasso, ligadura, acento, ritmo fino, partitura de verdade. Biblioteca de MP3 à parte. Visão do aluno sem login. Subir logo da escola pela própria sala.

## Decisões travadas

| Tema | Escolha |
|---|---|
| Catálogo | **Só** faixa com `page_config.estudo`. Intervalos, caderno e teoria **fora** da lista |
| Vazio | “Nenhuma música ainda” + **Do MP3** |
| Origem | Do MP3 (e o que nascer depois na sala). Não clona material de jornada |
| Correção de cifra | Clique no símbolo (Soundslice) + chips (iReal): **7, maj7, m7, m, sus, △**. Sem abrir `/editor` |
| Play durante a edição | Continua. Espaço = próximo acorde. Enter ou clique fora grava `Beat.cifra` |
| Gravura | Quatro modos **por música**, persistidos: `slash-beat` (padrão), `slash-rhythm`, `chords`, `score` |
| Arquitetura | `page_config.estudo` no `generated_materials` que já existe. Sem tabela `estudo_tracks`. Sem fileira do Editor |
| Rename | Inline na lista **e** no título da sala. Otimista. Enter / blur grava `title`. Sem recarregar a página |
| CRUD | Criar (Do MP3), abrir, renomear, apagar (confirma). Update da pauta = cifra + gravura |
| Apagar | Some da lista e **apaga o material** (não vai pro caderno). Só se tiver `page_config.estudo` |
| AlphaTab no meio da pauta | Esconde o “rendered by alphaTab” (já some no Editor). Rodapé da sala e da impressão: `Pauta: alphaTab` com link |
| Cabeçalho | Logo da escola (`schools.logo_url`) + título editável + nome do professor que curadorou |
| Marca d'água | Logo da escola, opacidade baixa, atrás da pauta, sem interceptar clique |
| Rodapé | Marca **Alf** (wordmark do produto) + linha alphaTab |
| Impressão | Botão **Imprimir** → diálogo do navegador (`window.print`, mesmo motor do editor). Botão **Baixar PDF** → Edge `generate-pdf` (Browserless imprime `/print/:id`). PrintView detecta `page_config.estudo` e desenha a folha da sala (logo, gravura atual, Alf), não html2canvas da pauta viva |
| Branch | `feat/estudo-playalong`. Não misturar Suno/Lyria |

## O que o professor faz

### Lista `/estudo`

1. Sem faixa: empty state + Do MP3. Sem tabela de jornada/estação.
2. Do MP3 (C2) cria material **novo** já com `page_config.estudo.origin = from-mp3` e `displayMode = slash-beat`. Título = nome do arquivo. `curatorName` = `users.name` de quem subiu.
3. Lista mostra só esses: título (clicável para editar), data. Clique na linha abre `/estudo/:id`. Clique no título **não** navega — edita o nome.
4. Lixeira: confirma (“Apagar esta faixa?”). Apaga material + blocos + objeto de áudio no storage. Volta a lista.

### Sala `/estudo/:id`

Cabeçalho da folha (tela e print):

```
[logo escola]     título (editável)     professor
                 marca d'água (logo escola)
                         pauta
                 Alf     Pauta: alphaTab
```

Controles da sala (não imprimem): voltar, Do MP3 não entra aqui, **Colar faixa** continua (C1), gravura (4 modos), Play/Pausar, **Imprimir**, **Baixar PDF**.

Cifra: play pode estar rolando. Clique no acorde → campo + chips, **acima do beat clicado** (não no meio da folha). Clique fora fecha (grava só se o texto mudou). Espaço = próximo acorde. Enter grava `Beat.cifra`. Overlay HTML por cima da pauta — não é o K do Editor. A sala **não** diz mais “corrija no Editor”.

Gravura: um controle, valor em `estudo.displayMode`. Troca redesenha o AlphaTex; beats, MP3 e sync **não** duplicam.

URL de material **sem** `page_config.estudo` (ex. Intervalos colado no C1): mensagem “Esta faixa não é da sala de Estudo” + voltar à lista. Não abre o player do caderno aqui.

## Gravura (tex da sala, mesmo modelo)

O bloco guarda os beats do C2 (`slash: true`, cifra, `B/4`). Só o gerador da sala muda o desenho.

| Modo | Pauta |
|---|---|
| `slash-beat` (padrão) | Risquinho **sem haste**, linha do meio, **sem** `\ks` — some o bequadro do B/4 em F. Cifra em cima. 4 por linha |
| `slash-rhythm` | Mesmos slashes **com** haste / duração |
| `chords` | Sem figura: clave + barras + cifra. Pausas/cabeças invisíveis (glyph transparente). Sem haste |
| `score` | Tex atual (`sessionToAlphaTex`), com armadura e alturas como estão no bloco |

`slash-beat` é o que mata o bequadro. Não muda o pitch gravado; omite a armadura neste modo.

## Dados

Sem coluna nova. `page_config` fica:

```json
{
  "playalong": {
    "audioUrl": "https://…",
    "countInMs": 0,
    "syncPoints": []
  },
  "estudo": {
    "origin": "from-mp3",
    "displayMode": "slash-beat",
    "curatorName": "Luciano"
  }
}
```

`displayMode`: só `slash-beat` | `slash-rhythm` | `chords` | `score`. Ausente ou inválido → `slash-beat`.  
`origin`: neste corte só `from-mp3`.  
`curatorName`: string gravada na criação. Tela e print leem isso, não “quem está logado agora”. Se faltar no JSON velho, cai em `users.name` e grava na próxima persistência da sala.

Cifra continua em `notation_data.beats[].cifra` (o mesmo campo do lead sheet A). Patch via RPC `update_material_block` que já existe. Não clonar beats por modo.

### Lista — não usar `list_materials`

A RPC `list_materials` devolve o caderno inteiro e **não** traz `page_config`. A lista do Estudo consulta `generated_materials` da escola onde `page_config->estudo` não é null. Ordena por `updated_at` desc.

### Do MP3

`createStudyMaterialFromMp3` passa a gravar `estudo` **no mesmo** `updateMaterial` do `playalong` (hoje só grava playalong). Merge: não apagar chaves de `page_config` que já existam.

### Backfill

Material com `page_config.playalong`, **sem** `estudo`, `journey_id` e `station_id` nulos (padrão do C2 / insert de sonda) entra no catálogo: na primeira listagem ou num patch único, escreve `estudo: { origin: "from-mp3", displayMode: "slash-beat" }`. Intervalos e caderno têm jornada — ficam de fora. A faixa “Faixa reconhecida (F)” entra.

### Apagar

1. Recusar se não houver `page_config.estudo`.
2. Apagar objeto de storage do `playalong.audioUrl` (inbox / playalong). Falha no storage não impede o delete do material — log + segue.
3. `DELETE generated_materials` (blocos em cascade; se o FK não cascade, apagar `material_blocks` antes).
4. Não usar RPC de caderno que desamarra jornada — esta faixa não tem jornada.

## Rename

Campo inline (lista e `<h1>` da sala). Estado local imediato. Persistência: `updateMaterial(id, { title })` no Enter ou blur, se o texto mudou. Trim. Vazio não grava (volta o título anterior). Teto 120 caracteres. Sem debounce por tecla. Sem `refetch` da lista inteira: atualiza o item no estado. Toast só em erro.

## Folha e impressão

- Logo no topo: `schools.logo_url`. Sem URL: só o `schools.name` em texto. Não abre upload de logo neste corte.
- Marca d'água: a **mesma** logo da escola, centrada atrás da pauta, ~10% de opacidade, `pointer-events: none`. Sem logo: sem marca d'água.
- Alf no rodapé: wordmark de texto **Alf** no tipo serif/accent do app. Sem asset novo.
- `Pauta: alphaTab` à direita do Alf, link `https://alphatab.net/`, `rel="noopener"`. Não some: a pauta é o produto; o autor do AlphaTab pede crédito visível. Só sai do SVG.
- Hide do crédito no SVG: o mesmo cleanup já usado em `AlphaTabViewer` (`rendered by alphaTab` / último filho de `.at-surface`). Aplicar em `StudyPlayalongSurface`.
- **Imprimir**: `window.print()` da folha da sala (A4 deitada). Diálogo do navegador.
- **Papel**: a sala imprime e exporta **deitada** (297×210 mm). `page_config.orientation = landscape`.
- **Baixar PDF**: Edge `generate-pdf` — o mesmo motor da apostila do editor. Browserless imprime `/print/:id`. PrintView detecta `page_config.estudo` e desenha a folha da sala (logo, gravura atual, Alf) em **A4 deitada**. O botão baixa o arquivo `.pdf` (blob da URL do storage). Não abre o diálogo de imprimir. Sem html2canvas, sem jsPDF, sem `core.engine = html5`.

## Cifra na sala

Chips, nesta ordem: `7` · `maj7` · `m7` · `m` · `sus` · `△`.

| Chip | Grava |
|---|---|
| 7 | qualidade `7` |
| maj7 | `maj7` |
| m7 | `m7` |
| m | `m` |
| sus | `sus4` |
| △ | `maj7` (símbolo do chip é △; no beat fica `maj7`, o mesmo do Music.AI) |

Reusa `applyCifraQuality` / `normalizeCifraSymbol` de `notationCifra.ts`. Campo livre até 24 caracteres. Overlay some no Esc sem gravar se o valor não mudou; se mudou, Esc também descarta e volta o valor anterior.

Espaço com o campo aberto: grava o atual (se mudou) e foca o próximo acorde. Sem acorde seguinte: fica no último.

## Fora

Escrita MuseScore (compasso, ligadura, acento, 2/4, 7x); embed do Editor; tabela `estudo_tracks`; html2canvas/jsPDF da pauta viva; upload de logo na sala; duplicar faixa; aluno deslogado; Soundslice; Suno/Lyria; stretch/tom; esconder o crédito do AlphaTab **sem** linha no rodapé.

## Testes

`npx tsx`, `node:assert/strict`, sem rede.

1. Parser `estudo`: JSON válido; `displayMode` inválido → `slash-beat`; ausente → default.
2. Tex `slash-beat` em tom F: tem `{slashed}` e `{ch "…"}`, **não** tem `\ks`.
3. Tex `score` no mesmo bloco: tem `\ks` se a armadura não for C.
4. Chip `sus` em `Bb` → `Bbsus4`. Chip `△` em `F` → `Fmaj7`.
5. Filtro de catálogo: item com `estudo` entra; item só com `playalong` + `journey_id` não entra.
6. Título vazio no rename: rejeita (helper puro).

Smoke Chrome (`localhost:5202`):

1. `/estudo` sem as faixas de caderno. Empty ou só Do MP3 / backfill.
2. Subir MP3 curto → lista com título do arquivo → clicar o nome, trocar, blur, recarregar: título novo.
3. Abrir sala, clicar cifra, chip maj7, Play ainda anda, Enter grava, F5 mantém.
4. Modo slash-beat: sem bequadro no risquinho. Trocar score e voltar: MP3 e cifra iguais.
5. Imprimir (preview): logo (se a escola tiver), professor, Alf, linha alphaTab; sem “rendered by alphaTab” no meio; sem botões de play.
6. Apagar com confirma: some da lista; `/estudo/:id` antigo não abre a pauta.

## Peças

| Peça | Papel |
|---|---|
| `page_config.estudo` + parser | origin, displayMode, curatorName |
| `listEstudoMaterials` | query `generated_materials`, não `list_materials` |
| `studyFromMp3Service` | grava `estudo` junto com `playalong` |
| `Estudo.tsx` lista | empty, Do MP3, rename, delete |
| `Estudo.tsx` sala | chrome da folha, gravura, print, cifra overlay |
| `studyNotationTex` | tex por `displayMode` |
| `StudyPlayalongSurface` | esconde crédito SVG |
| `notationCifra` | chips (já existe; sala só consome) |
| `update_material_block` | patch da cifra |
| `deleteEstudoMaterial` | storage + row |

## Primeira prova

Faixa reconhecida (F) ou um Do MP3 novo. Lista só ela (e outras do Estudo). Rename na lista e na sala, instantâneo. Cifra no clique. Slash sem bequadro. Imprimir com logo da escola (se houver), nome do professor, Alf e alphaTab no rodapé. Intervalos Melódicos **não** aparece na lista.
