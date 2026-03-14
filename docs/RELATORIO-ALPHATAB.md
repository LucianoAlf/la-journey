# Relatório Executivo — AlphaTab no LA Journey

**Data:** 14/03/2026  
**Responsável técnico:** Cascade (Frontend)  
**Status:** Visualização ✅ | Player MIDI ⚠️ Solução identificada | Acervo de tablaturas 🔍 Em pesquisa

---

## 1. O que é o AlphaTab

O [AlphaTab](https://alphatab.net) é uma biblioteca open-source (MPL-2.0) para **renderizar e reproduzir partituras/tablaturas** no navegador. Ele lê arquivos Guitar Pro (.gp, .gp3–.gp7, .gpx), MusicXML (.mxl, .musicxml) e um formato texto próprio (alphaTex).

**Capacidades completas:**
- ✅ Renderização de partitura + tablatura (SVG)
- ✅ Seleção de tracks/instrumentos
- ✅ Temas claro/escuro
- ✅ Exportação para PDF
- 🔊 **Player MIDI com som real** (synth via SoundFont SONiVOX)
- 🔊 Metrônomo integrado
- 🔊 Controle de velocidade (50%–200%)
- 🔊 Loop de trechos
- 🔊 Cursor de acompanhamento (destaca a nota sendo tocada)

---

## 2. O que já funciona no LA Journey

| Funcionalidade | Status | Detalhes |
|---|---|---|
| Renderização de tablatura | ✅ | Notação musical + TAB perfeitos |
| Temas claro/escuro | ✅ | Cores adaptam automaticamente |
| Seleção de tracks | ✅ | Dropdown para instrumentos |
| Gerar PDF | ✅ | html2canvas + jsPDF, múltiplas páginas |
| Aba Tablatura no Repertório | ✅ | Condicional ao campo `gp_file_url` |
| Campo `gp_file_url` editável | ✅ | Na aba Editar de cada música |

---

## 3. O que NÃO funciona: Player MIDI (reprodução com som)

### O problema
O player MIDI do AlphaTab **requer Web Workers e Audio Worklets** para:
1. Processar o arquivo SoundFont (SONiVOX, ~1.3MB) em background
2. Sintetizar áudio MIDI em tempo real via AudioWorklet

### Por que não funciona HOJE
O Vite (nosso bundler) **reorganiza e divide arquivos JavaScript** durante o build. O AlphaTab precisa localizar seus workers (`alphaTab.worker.mjs` e `alphaTab.worklet.mjs`) para iniciar o synth de áudio. Sem configuração especial, o Vite:
- Não copia os workers corretamente
- Não configura os Audio Worklets
- Quebra a resolução de paths dos workers

Na sessão anterior, usamos `useWorkers: false` para contornar isso e pelo menos ter a **renderização** funcionando. Mas sem workers, o synth MIDI simplesmente não inicializa.

### Tentativas feitas
| Tentativa | Resultado |
|---|---|
| `useWorkers: false` + player habilitado | Renderiza, mas player fica em 00:00/00:00 (synth não inicia) |
| Workers habilitados (sem plugin) | Renderização trava (fontes Bravura não encontradas) |
| Worker copiado manualmente para `public/` | Mesmo problema — worker inicia mas não resolve dependências |
| `loadSoundFont()` manual via fetch | SoundFont carrega mas synth não existe (sem workers) |
| Import de `@coderline/alphatab-vite` | Pacote separado não existe no npm |

### 🟢 SOLUÇÃO IDENTIFICADA (nova descoberta)
O plugin Vite **já existe dentro do pacote instalado** (`@coderline/alphatab@1.8.1`):

```
node_modules/@coderline/alphatab/dist/alphaTab.vite.mjs  ← EXISTE!
```

O import correto é:
```typescript
import { alphaTab } from '@coderline/alphatab/vite'
```

Na sessão anterior, tentamos `@coderline/alphatab-vite` (pacote separado, que não existe). Mas a documentação oficial confirma que desde a **versão 1.3.0**, o plugin está embutido no pacote principal com o path `/vite`.

**Ação necessária:** Adicionar o plugin ao `vite.config.ts`:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { alphaTab } from '@coderline/alphatab/vite'

export default defineConfig({
  plugins: [react(), alphaTab()],
  // ... resto da config
})
```

Depois disso, remover `useWorkers: false` e reabilitar o player MIDI no componente.

**Estimativa:** 1–2 horas para implementar e testar.

---

## 4. Acervo de Tablaturas — De onde vêm os arquivos?

Atualmente, **nenhuma música do repertório tem arquivo GP/MusicXML real**. O único arquivo que temos é `public/samples/canon.gp` (teste).

### Fontes pesquisadas

#### 🟢 Fontes viáveis (gratuitas / open-source)

| Fonte | Tipo | Quantidade | Formatos | Observação |
|---|---|---|---|---|
| **[Archive.org — Guitar Pro Tabs](https://archive.org/details/GuitarProTabs)** | Arquivo público | 60.000+ | .gp3, .gp4, .gp5 | Domínio público / creative commons. Download em massa possível. |
| **[GProTab.net](https://gprotab.net)** | Comunidade | 30.000+ | .gp, .gp5, .gpx | Download gratuito. Tem player online. |
| **[MuseScore.com](https://musescore.com)** | Comunidade | 340.000+ | .mscz, .musicxml, .midi | MusicXML exportável. Maior acervo. API disponível. |
| **[IMSLP (Petrucci Library)](https://imslp.org)** | Domínio público | 200.000+ | PDF, .mxl, .musicxml | Foco em música clássica. Excelente para erudito. |
| **[OpenScore](https://openscore.cc)** | Open-source | 2.000+ | .mxl, .musicxml | Partituras interativas de alta qualidade. |
| **[musetrainer/library (GitHub)](https://github.com/musetrainer/library)** | Open-source | Centenas | .musicxml | Arquivos MusicXML de domínio público. |

#### 🟡 Fontes semi-automatizáveis (scraping)

| Fonte | Método | Observação |
|---|---|---|
| **[Songsterr](https://songsterr.com)** | Scraping / Conversão | Já temos `songsterr_id` em 3 músicas. Existe [songsterr-downloader](https://github.com/Metaphysics0/songsterr-downloader) que converte URL → .gp7 usando o próprio AlphaTab. |
| **[Ultimate Guitar](https://ultimate-guitar.com)** | API paga / Scraping | Maior acervo do mundo (1M+). Paywall pesado. Guitar Pro files requerem assinatura. |

#### 🔴 Fontes complexas

| Fonte | Problema |
|---|---|
| Guitar Pro (Arobas Music) | Software desktop pago. Tabs vendidos individualmente. |
| Hal Leonard / Sheet Music Direct | Licenciamento comercial. Preços por partitura. |

### Estratégia recomendada

1. **Curto prazo (imediato):**
   - Criar Edge Function no Supabase para **download de GP via Songsterr** (já temos songsterr_id em 3 músicas)
   - Usar o [songsterr-downloader](https://github.com/Metaphysics0/songsterr-downloader) como referência
   - Salvar arquivo GP no Supabase Storage → preencher `gp_file_url` automaticamente

2. **Médio prazo (acervo inicial):**
   - Download em massa do [Archive.org — Guitar Pro Tabs](https://archive.org/details/GuitarProTabs) (60K+ arquivos)
   - Criar script de indexação: extrair metadados (título, artista) → match com repertório existente
   - Importar seletivamente as que já estão no repertório

3. **Longo prazo (acervo expandido):**
   - Integrar com API do MuseScore (MusicXML → AlphaTab renderiza nativamente)
   - Permitir upload manual de .gp/.mxl pelo professor na aba Editar
   - Busca unificada: ao importar música → buscar automaticamente GP no acervo

---

## 5. Arquitetura atual do componente

```
src/components/music/AlphaTabPlayer.tsx
├── Props: fileUrl, tex, minHeight, className
├── AlphaTabApi (renderização)
│   ├── fontDirectory: window.location.origin + '/font/'
│   ├── useWorkers: false (TEMPORÁRIO — remover com plugin Vite)
│   ├── layoutMode: Page
│   └── Cores dinâmicas (tema claro/escuro)
├── Eventos
│   ├── scoreLoaded → título, artista, tracks
│   ├── renderFinished → loading = false
│   └── error → mensagem de erro
├── UI
│   ├── Barra superior: título + seletor tracks + botão PDF
│   ├── Viewport scrollável (maxHeight: 70vh)
│   └── Overlays: loading + erro
└── Gerar PDF
    ├── Expande viewport temporariamente
    ├── html2canvas (scale: 2) → captura completa
    └── jsPDF → múltiplas páginas A4
```

### Arquivos no projeto
```
public/font/          → Fonte Bravura (notação musical)
public/soundfont/     → SONiVOX (SoundFont para player MIDI)
public/samples/       → canon.gp (arquivo de teste)
```

### Banco de dados
```sql
-- Tabela repertoire
gp_file_url TEXT      -- URL do arquivo GP (quando preenchido, mostra aba Tablatura)
songsterr_id INTEGER  -- ID no Songsterr (futuro: download automático do GP)
```

---

## 6. Próximos passos (prioridade)

| # | Ação | Impacto | Esforço |
|---|---|---|---|
| 1 | **Habilitar plugin Vite** (`@coderline/alphatab/vite`) | 🔊 Player MIDI funcional | 1–2h |
| 2 | **Download GP via Songsterr** (Edge Function) | 📄 Tablaturas reais para músicas importadas | 4–6h |
| 3 | **Reabilitar controles do player** (play, pause, velocidade, metrônomo) | 🎵 Experiência completa de prática | 2–3h |
| 4 | **Acervo Archive.org** (indexação + match) | 📚 60K+ tablaturas disponíveis | 6–8h |
| 5 | **Upload manual de GP** na aba Editar | 📤 Professor importa seus próprios | 2–3h |

---

## 7. Conclusão

O AlphaTab é a peça central para transformar o LA Journey de um **catálogo de cifras** em uma **plataforma de prática musical completa**. A renderização já funciona perfeitamente. O player MIDI — que é o recurso mais valioso (tocar a música com som, ajustar velocidade, usar metrônomo) — tem solução técnica identificada e requer apenas a configuração correta do plugin Vite.

O acervo de tablaturas é o segundo desafio: existem fontes gratuitas abundantes (Archive.org com 60K+ tabs, Songsterr com download programático, MuseScore com 340K+ partituras). A estratégia é começar pelo Songsterr (já temos IDs salvos) e expandir com Archive.org.

**O recurso é viável e estratégico. A implementação completa (player + acervo) pode ser feita em 1–2 sprints.**
