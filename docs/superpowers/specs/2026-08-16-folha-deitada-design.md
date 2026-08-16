# Folha deitada — orientação da A4 no editor (corte A)

Data: 2026-08-16  
Status: spec aprovada no chat (16/08, fim da tarde). Implementação ainda não.  
Corte: o professor gira **uma folha de material** entre retrato e deitada. Editor, preview e download saem no mesmo papel. Sem play, sem cursor, sem áudio.

Alvo visual: o papel do vídeo da Escola de Música Rafael Bastos (Ovelha Negra) — A4 deitada, ~4 compassos por sistema. A gravura slash já está em produção; este corte só vira o papel.

**Corte C (depois, não misturar):** superfície nova de estudo, tipo o app dos vídeos de rudimento — pauta + play + BPM + nota acendendo. Não é PDF. Não é esta spec.

## Problema

A A4 do LA Journey é retrato fixo: `794×1123` em `src/lib/a4Preview.ts`, `.a4-page` no CSS, e os downloads jsPDF nascem `orientation: 'portrait'`. A captura do editor ainda comenta “área visível fixa: 794×1123”.

`layout: 'horizontal'` do AlphaTab **não** é folha deitada — é `LayoutMode.Horizontal` (sistemas em linha contínua). Não usar isso para orientar o papel.

## Dois ambientes (já travado)

| | A — este corte | C — o próximo |
|---|---|---|
| Onde | Editor de material, PrintView, download | Superfície nova de estudo |
| Papel | A4 retrato ou deitada | Não é papel; é player |
| Áudio | Não | Play, BPM, nota acendendo (como os vídeos de rudimento) |
| Ovelha | Professor escreve e imprime a grade | Professor/aluno toca a grade |

C não entra neste PR. Metrônomo smart, setlist, 40 rudimentos e sync tablet↔PC são do app de bateria — nem no primeiro C.

## Decisões travadas

| Tema | Escolha |
|---|---|
| Quem gira | Controle **por material**. Não “tudo deitado”. Não “exercício deita / repertório não” |
| Onde grava | `page_config.orientation`: `'portrait'` \| `'landscape'`. `page_config` já existe (`generated_materials.page_config`, header/footer/margens). Sem coluna nova |
| Default | Ausente, `null` ou valor inválido → **retrato**. Material antigo não muda |
| Papel | Retrato = 794×1123. Deitada = **1123×794** (os mesmos px, trocados). A4 210×297 mm no jsPDF |
| Uniforme | Todas as páginas do material usam a mesma orientação, **incluindo capa**. Arte de capa 3:4 entra letterbox. Sem misturar retrato e deitada no mesmo PDF |
| Chrome | Controle Retrato / Deitada no editor, junto das outras opções de folha. Giro imediato na tela; persiste no save de `page_config` que já existe |
| Pauta | Largura útil deriva da largura do papel. Deitada cabe mais compassos na linha. **Por linha** (1–8) continua na mão do professor — o giro **não** força 4 |
| AlphaTab | Continua `layout: 'page'`. Não ligar `LayoutMode.Horizontal` por causa deste corte |
| Float | Imagem solta / elemento flutuante fica no pixel antigo. Sem recálculo no giro. Se sair do papel, o professor arrasta |
| Quebra | Folha deitada é mais baixa (794 vs 1123). Cabe menos bloco na vertical; `page_break` anda. É esperado |
| PDF deste corte | Download do editor (`pdfExportService`) + PrintView / apostila Browserless (a CSS da `.a4-page` define o papel) |
| PDF fora | `repertoirePdfEngine` / caderno de música — continua retrato |

## Arquitetura

Uma função de tamanho, lida em todo lugar que hoje chuta 794 e 1123.

```
page_config.orientation
        │
        ▼
 a4Preview.pageSize(orientation)
        │
        ├── CSS .a4-page / .a4-page--landscape
        ├── getA4PreviewScale (viewport)
        ├── largura da pauta (notationPreviewWidth / A4_CANVAS_NOTATION_WIDTH)
        ├── Editor.tsx (classe da página, CSS de print inline)
        └── pdfExportService → jsPDF portrait | landscape
```

`PageConfig` em `Editor.tsx` ganha `orientation?: 'portrait' | 'landscape'`. `migratePageConfig` preserva o campo; se não vier, não inventa deitada.

Qualquer constante de papel hoje cravada em 794 ou 1123 (`sharedPagination`, `floatingElements`, CSS de print no `Editor.tsx`) passa a ler `pageSize(orientation)`. Não deixar um cano no retrato e outro na deitada.

PrintView já lê `page_config`. A classe da página segue a orientação. Browserless captura o HTML — se o papel CSS estiver certo, o PDF de apostila acompanha.

## O que não se constrói

- Player C (áudio, cursor, BPM, “Ouvir exemplo”).
- PDF de repertório / caderno de música.
- Capa ilustrada nova em 16:9. Letterbox da 3:4 basta neste corte.
- Auto “4 por linha” ao girar.
- Migrar coordenadas de float.
- Orientação por página ou por bloco.
- Trocar `layout: 'page'` do AlphaTab por `horizontal`.

## Testes

- Retrato = 794×1123; deitada = 1123×794.
- Escala do preview cabe na viewport sem esticar, nas duas orientações.
- Largura da pauta acompanha o papel.
- `orientation` inválido e campo ausente → retrato.
- `migratePageConfig` não apaga `orientation`.

Prova visual: material com pauta, girar no chrome, conferir a folha na tela, Download, abrir o PDF — página deitada. Com Por linha = 4, o sistema carrega 4 compassos.

## Arquivos-chave

| Peça | Path |
|---|---|
| Tamanho A4 | `src/lib/a4Preview.ts` |
| Largura da pauta | `src/lib/notationPreviewWidth.ts` |
| CSS da folha | `src/index.css` (`.a4-page`) |
| Editor | `src/pages/Editor.tsx` (`PageConfig`, classe da página) |
| Download | `src/services/pdfExportService.ts` |
| Print | `src/pages/PrintView.tsx` |
| Paginação compartilhada | `src/lib/sharedPagination.ts` |
| Float na folha | `src/lib/floatingElements.ts` |
| Teste de tamanho | `src/lib/__tests__/a4Preview.test.ts` |
| Spec slash (gravura, não papel) | `docs/superpowers/specs/2026-08-16-ovelha-negra-slash-notation-design.md` |
