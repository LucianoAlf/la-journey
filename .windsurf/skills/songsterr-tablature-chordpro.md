---
description: Guia completo para integração de tablaturas, ChordPro, transposição e renderização musical no LA Journey. Use quando trabalhar com Songsterr, AlphaTab, Guitar Pro, ChordPro, transposição de tonalidade, bases de acordes, ou renderização de tablaturas/partituras avançadas.
---

# Songsterr, Tablatura & ChordPro — Skill LA Journey

## 1. Arquitetura do Songsterr (Descoberto via Engenharia Reversa)

### API Pública Confirmada
| Endpoint | Método | Retorno |
|----------|--------|---------|
| `/api/songs?pattern={query}` | GET | Array de músicas (id, title, artist, tracks, hasChords) |
| `/api/song/{songId}` | GET | Detalhes com tracks, instruments, difficulty |
| `/api/meta/{songId}` | GET | Metadados completos: revisionId, tracks[].hash, videos[], tags, audio hashes |
| `/api/chords/{songId}` | GET | `{ chordpro: "hashId", chordsRevisionId, hasPlayer }` |
| `/api/video-points/{songId}/{revisionId}/list` | GET | Timestamps de cada compasso para sync com YouTube |

### Formato de Dados Interno do Songsterr
- O Songsterr é baseado no **formato Guitar Pro** (GP3-GP7)
- Internamente converte para JSON proprietário com: tracks → measures → beats → notes
- Cada track tem: `instrumentId`, `tuning[]` (MIDI notes), `hash`, `difficulty`, `views`
- O conteúdo ChordPro está em CDN protegido (`d12drcwhcokzqv.cloudfront.net`) — requer signed URLs
- A view "Acordes" do site carrega via SPA React (Redux store `state.chordpro`)

### O que a Importação Atual Traz (FASE A)
- ✅ Metadados: título, artista, songsterr_id, instruments[], difficulty
- ❌ NÃO traz: cifra com acordes+letra, tablatura, conteúdo ChordPro
- A música importada fica "vazia" no preview (como visto na imagem 2)

### Como Corrigir — Estratégia para Extrair Conteúdo
1. **Scraping da SPA**: A página `/a/wsa/{slug}-chords-s{songId}` serve HTML com Redux state inline (52KB+)
   - O state contém `chords.current.chordpro` (hash) mas NÃO o conteúdo real
   - O conteúdo é carregado via XHR posterior pelo client-side JS
2. **Alternativa via Headless Browser**: Usar Puppeteer/Playwright na Edge Function para renderizar a SPA e capturar o XHR
3. **Alternativa pragmática**: Extrair acordes dos dados da tablatura (notas MIDI → nome do acorde) via análise harmônica

## 2. AlphaTab — Motor de Renderização de Tablaturas

### O que é
Motor open-source JS/TS para renderizar partituras e tablaturas. Lê nativamente GP3-GP7, MusicXML, CapXML e alphaTex.

### Pacotes NPM
```bash
npm install @coderline/alphatab @coderline/alphatab-vite
```

### Integração com Vite (nosso bundler)
```typescript
// vite.config.ts
import { defineConfig } from "vite";
import { alphaTab } from "@coderline/alphatab-vite";

export default defineConfig({
  plugins: [alphaTab()]
});
```

O plugin Vite automaticamente:
- Copia a fonte Bravura (notação) para `/font/`
- Copia o SoundFont (SONiVOX) para `/soundfont/`
- Configura Web Workers e Audio Worklets

### Uso Básico
```typescript
import { AlphaTabApi, Settings } from '@coderline/alphatab';

// Criar instância
const api = new AlphaTabApi(containerElement, {
  core: {
    fontDirectory: '/font/',
    file: '/path/to/song.gp'  // ou ArrayBuffer
  },
  player: {
    enablePlayer: true,
    soundFont: '/soundfont/sonivox.sf2'
  }
});

// Carregar de ArrayBuffer
api.load(arrayBuffer);

// Controles
api.play();
api.pause();
api.stop();
api.playbackSpeed = 0.75; // 75% velocidade

// Eventos
api.scoreLoaded.on((score) => {
  console.log('Título:', score.title);
  console.log('Artista:', score.artist);
  console.log('Tracks:', score.tracks.length);
});
```

### Features do AlphaTab
- Renderiza tablatura + notação padrão simultaneamente
- Player MIDI embutido com cursor visual acompanhando
- Suporte a bend, slide, hammer-on, harmônicos, etc.
- Controle de velocidade de reprodução
- Seleção de tracks individuais (guitarra, baixo, bateria, etc.)
- Responsivo (redimensiona automaticamente)
- **NÃO tem componente React pronto** — precisa integração manual via refs

### Licença
- MPL-2.0 (Mozilla Public License) — compatível com uso comercial

## 3. ChordSheetJS — Parser/Formatter/Transpositor de Cifras

### Pacote
```bash
npm install chordsheetjs
```

### A Solução para Cifras no LA Journey
ChordSheetJS é a biblioteca definitiva para:
- Parse de múltiplos formatos (ChordPro, ChordsOverWords, UltimateGuitar)
- Transposição de tonalidade (semitons up/down)
- Formatação para HTML, texto, PDF
- Serialização/deserialização

### Parse de Formatos

#### Formato "Acordes sobre palavras" (Cifra Club, Songsterr view Acordes)
```typescript
import ChordSheetJS from 'chordsheetjs';

const chordSheet = `
       Am         C/G        F          C
Let it be, let it be, let it be, let it be
  C        G       F    C/E  Dm  C
Whisper words of wisdom, let it be`;

const parser = new ChordSheetJS.ChordsOverWordsParser();
const song = parser.parse(chordSheet);
```

#### Formato ChordPro
```typescript
const chordPro = `
{title: Let it be}
{artist: Beatles}
{start_of_chorus: Chorus}
Let it [Am]be, let it [C/G]be, let it [F]be, let it [C]be
[C]Whisper words of [G]wisdom, let it [F]be [C/E] [Dm] [C]
{end_of_chorus}`;

const parser = new ChordSheetJS.ChordProParser();
const song = parser.parse(chordPro);
```

#### Formato Ultimate Guitar
```typescript
const parser = new ChordSheetJS.UltimateGuitarParser();
const song = parser.parse(chordSheet); // com [Chorus], [Verse], etc.
```

### Transposição de Tonalidade
```typescript
import { Chord } from 'chordsheetjs';

// Transpor acorde individual
const chord = Chord.parse('Am');
chord.transpose(3).toString();  // → "Cm"
chord.transpose(-2).toString(); // → "Gm"
chord.transposeUp().toString(); // → "A#m" (+1 semitom)
chord.transposeDown().toString(); // → "G#m" (-1 semitom)

// Transpor cifra inteira (via song object)
// Após parse, cada item da song tem .chords que podem ser transpostos
```

### Formatação para HTML
```typescript
// Tabela (melhor para cifra com acordes acima)
const formatter = new ChordSheetJS.HtmlTableFormatter();
const html = formatter.format(song);

// Divs
const formatter = new ChordSheetJS.HtmlDivFormatter();
const html = formatter.format(song);

// Texto puro
const formatter = new ChordSheetJS.TextFormatter();
const text = formatter.format(song);

// De volta para ChordPro
const formatter = new ChordSheetJS.ChordProFormatter();
const chordpro = formatter.format(song);
```

### Serialização
```typescript
// Para JSON (armazenar no banco)
const serialized = new ChordSheetJS.ChordSheetSerializer().serialize(song);
const json = JSON.stringify(serialized);

// Restaurar
const deserialized = new ChordSheetJS.ChordSheetSerializer().deserialize(JSON.parse(json));
```

## 4. chord-transposer — Transposição em Texto

### Pacote alternativo/complementar
```bash
npm install chord-transposer
```

### Uso
```typescript
import { transpose } from 'chord-transposer';

// Transpor texto inteiro com acordes
const result = transpose('C G Am F').up(3).toString();
// → "Eb Bb Cm Ab"

// Transpor para uma tonalidade específica
const result = transpose('C G Am F').toKey('D').toString();
// → "D A Bm G"

// Com cifra completa (acordes + letra misturados)
const cifra = `
Am         C/G        F          C
Let it be, let it be, let it be, let it be`;

const transposta = transpose(cifra).up(2).toString();
// Todos os acordes sobem 2 semitons, letra permanece
```

## 5. Bases de Acordes Open Source

### guitar-chords-db-json (szaza)
- **~100.000 posições** de acordes mapeadas em JSON
- Formato: `{ key: "C", suffix: "major", positions: [{ frets: [0,1,0,2,3,0], fingers: [...], barres: [...] }] }`
- GitHub: `szaza/guitar-chords-db-json`

### chords-db (tombatossals)
- Acordes de violão e ukulele
- Marcação exata: casas, pestanas, dedos
- GitHub: `tombatossals/chords-db`

### chordonomicon (spyroskantarelis)
- **666.000 progressões** de acordes de músicas reais
- Metadados de gênero, scripts Python para transformar
- Uso futuro para análise harmônica e sugestões

## 6. Formato ChordPro — Referência Rápida

### Estrutura
```
{title: Nome da Música}
{subtitle: Artista}
{key: Am}
{tempo: 120}
{time: 4/4}
{capo: 2}

{start_of_verse: Verso 1}
[Am]Estátuas e [C]cofres e [G]paredes [F]pintadas
[Am]Ninguém [C]sabe o que [G]aconteceu [F]
{end_of_verse}

{start_of_chorus: Refrão}
[C]Vamos [G]embora [Am]
{end_of_chorus}
```

### Diretivas Principais
- `{title: ...}` / `{t: ...}` — título
- `{subtitle: ...}` / `{st: ...}` — subtítulo/artista
- `{key: ...}` — tonalidade
- `{capo: ...}` — capotraste
- `{tempo: ...}` — BPM
- `{start_of_verse}` / `{end_of_verse}` — seção verso
- `{start_of_chorus}` / `{end_of_chorus}` — seção refrão
- `{start_of_bridge}` / `{end_of_bridge}` — ponte
- `{start_of_tab}` / `{end_of_tab}` — tablatura literal
- `{comment: ...}` / `{c: ...}` — comentário/instrução
- `[Am]texto` — acorde Am posicionado sobre "texto"

## 7. Plano de Implementação (Fases)

### FASE E1 — Transposição de Tonalidade (PRIORITÁRIA)
1. Instalar `chordsheetjs` no projeto
2. Criar `src/lib/transpose.ts` com funções:
   - `transposeChordSheet(content: string, semitones: number): string`
   - `transposeCifraContent(cifraContent: string, semitones: number): string`
   - `detectKey(chords: string[]): string`
3. Adicionar controle de transposição no `RepertoireSheet.tsx` e `CifraEditor.tsx`
   - Widget de semitons (+/-) igual ao do Songsterr/Cifra Club (imagem 5)
   - Atualiza cifra_content, chords[] e diagramas em tempo real
4. Atualizar diagramas de acordes automaticamente após transposição

### FASE E2 — Enriquecer Importação Songsterr
1. Atualizar Edge Function `songsterr-import` para:
   - Fazer scraping da SPA de acordes (`/a/wsa/{slug}-chords-s{songId}`)
   - Extrair conteúdo ChordPro do Redux state ou XHR interceptado
   - Ou: usar os dados de meta/tracks para inferir acordes
2. Salvar `cifra_content` + `chords[]` no repertoire ao importar
3. Auto-gerar diagramas via nossa chord_library existente

### FASE E3 — AlphaTab (Renderizador de Tablaturas)
1. Instalar `@coderline/alphatab` + `@coderline/alphatab-vite`
2. Configurar plugin Vite
3. Criar componente `src/components/music/AlphaTabPlayer.tsx`
4. Integrar com RepertoireSheet para músicas com dados Guitar Pro
5. Possibilidade: baixar .gp do Songsterr via API de source (se disponível)

### FASE E4 — Parser ChordPro & Batch Import
1. Criar `src/lib/chordpro.ts` com parser usando ChordSheetJS
2. Edge Function para importar acervos ChordPro em lote
3. Converter para nosso formato (cifra_content + chords[] + metadata)

### FASE E5 — Enriquecer Biblioteca de Acordes
1. Avaliar guitar-chords-db para complementar nossa chord_library
2. Script de migração para inserir posições faltantes
3. Mapeamento automático de acordes transpostos

## 8. Decisões Técnicas

### ChordSheetJS vs chord-transposer
- **ChordSheetJS** é a escolha principal: parse + transpose + format tudo em um
- **chord-transposer** como fallback para transposição simples de texto
- Ambas são TypeScript, ambas no npm, ambas ativas

### AlphaTab — Quando Usar
- Quando temos o arquivo .gp (Guitar Pro) binário
- Para renderização profissional de tablatura com notação rítmica
- Para o player interativo com áudio MIDI
- **NÃO usar** para cifras simples (acordes+letra) — nosso CifraEditor já resolve

### Formato de Armazenamento Interno
- `cifra_content` (texto): formato "acordes sobre palavras" ou ChordPro
- `cifra_source`: 'manual' | 'cifra_club' | 'songsterr' | 'chordpro'
- `chords[]`: array de nomes de acordes únicos
- `key`: tonalidade original
- `capo`: capotraste
- `gp_file_url`: URL do arquivo Guitar Pro (se disponível, para AlphaTab)
