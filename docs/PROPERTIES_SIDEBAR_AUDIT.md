# Auditoria da PropertiesSidebar

Data: 13/05/2026  
Escopo: documentacao apenas, sem alteracao de codigo.  
Arquivos auditados: `src/pages/Editor.tsx`, `src/components/editor/PropertiesSidebar.tsx`, `src/components/editor/BlockStylePanel.tsx`, `src/components/editor/SeparatorStylePanel.tsx`, `src/components/material/MaterialPreview.tsx`, `src/lib/database.types.ts`.

## Resumo executivo

A `PropertiesSidebar` e renderizada quando o painel direito esta aberto. A largura atual e **300px**, definida em `src/components/editor/PropertiesSidebar.tsx` com `w-[300px]` no wrapper e tambem no container interno.

O painel tem tres estados principais:

1. Elemento flutuante selecionado: propriedades de floating text/image/shape.
2. Nenhum bloco selecionado: configuracao da pagina.
3. Bloco selecionado: propriedades do bloco, que e o foco desta auditoria.

No estado de bloco selecionado, as secoes comuns sao:

- Tipo: 1 display de tipo + badge condicional de editado.
- Titulo: 1 editor rich text, exceto em `cover`.
- Conteudo: 1 editor rich text, apenas para `text`, `tip`, `exercise`, `title`.
- Paginacao: 6 controles principais, para todos exceto `cover` e `page_break`.
- Estilo do Bloco: painel com 4 abas e reset, para todos exceto `cover`, `page_break` e `separator`.
- Acoes: 2 controles fixos, mais 1 condicional.
- Exportar material: 3 controles, para qualquer bloco selecionado.

## Respostas diretas

### A exportacao aparece em todos os blocos?

Sim. Dentro do branch de `selectedBlock`, a secao **Exportar material** aparece sem condicional por `block_type`. Portanto aparece para todos os blocos selecionados, incluindo `cover`, `page_break`, `separator` e tipos sem editor especifico.

Controles da secao:

- Baixar PDF.
- Imprimir / PDF.
- Ver HTML.

Observacao: a exportacao nao aparece quando nenhum bloco esta selecionado nem quando o painel esta mostrando um elemento flutuante.

### O assistente IA esta funcionando em algum bloco?

Sim, pelo codigo ele esta disponivel para:

- `text`
- `tip`
- `exercise`
- `title`

Existem duas entradas de IA para esses blocos:

- No editor de conteudo (`RichTextEditor`) via `onAIAction`.
- Na secao **Assistente IA** da sidebar, com Reescrever, Simplificar, Expandir, Formalizar, instrucao personalizada e Gerar 3 variacoes.

Pontos de atencao:

- A IA da sidebar usa `generateText` e atualiza o estado local do bloco.
- A IA da sidebar nao chama `queueBlockAutosave` diretamente depois de aplicar o resultado. Isso sugere risco de o usuario precisar clicar em **Salvar Alteracoes** para garantir persistencia, dependendo do fluxo de autosave externo.
- A capa tambem tem funcoes de IA, mas em outra secao: geracao de imagem de capa e melhoria de prompt. Isso nao e o mesmo "Assistente IA" textual.

### Qual e a largura atual da sidebar?

**300px.**

Fonte:

- `PropertiesSidebar`: wrapper aberto com `w-[300px]`.
- Container interno tambem com `w-[300px]`.

## Tipos de bloco existentes

Lista consolidada a partir do enum `material_block_type`, do editor e do preview:

- `title`
- `text`
- `image`
- `chord_diagram`
- `notation`
- `tablature`
- `exercise`
- `tip`
- `qr_code`
- `separator`
- `badge`
- `cover`
- `chord_grid`
- `keyboard`
- `keyboard_grid`
- `page_break`
- `rhythm`
- `columns`
- `audio`
- `video`

Observacao importante:

- `columns`, `audio` e `video` aparecem implementados no editor/preview, mas nao aparecem no enum `material_block_type` gerado em `database.types.ts`.
- `qr_code` aparece no enum e no preview, mas nao tem secao dedicada na `PropertiesSidebar`.
- `subtitle` aparece como tipo inline em helpers de canvas, mas nao aparece no enum `material_block_type` nem na configuracao principal da sidebar.

## Secoes comuns por tipo

### Tipo

Todos os blocos selecionados mostram a secao **Tipo**.

Controles/campos:

- 1 display de icone + label.
- 1 badge condicional `editado`, quando `selectedBlock.is_edited` e verdadeiro.

Estado:

- Funciona como identificacao visual.
- Nao permite trocar o tipo do bloco.

### Titulo

Aparece para todos os blocos exceto `cover`.

Controles/campos:

- 1 `RichTextEditor` em modo `title`.

Estado:

- Funciona e chama `queueBlockAutosave`.
- Confuso em blocos como `page_break`, `separator`, `badge` e `qr_code`, porque nem todos precisam semanticamente de titulo editavel.

### Conteudo

Aparece apenas para:

- `text`
- `tip`
- `exercise`
- `title`

Controles/campos:

- 1 `RichTextEditor` compacto.

Estado:

- Funciona e chama `queueBlockAutosave`.
- Tem IA inline via `onAIAction`.

### Paginacao

Aparece para todos exceto:

- `cover`
- `page_break`

Controles/campos:

- 1 switch Manter com proximo.
- 1 botao condicional Soltar do proximo.
- 1 switch Comecar em nova pagina.
- 1 switch Permitir quebra.
- 1 display Politica atual.
- 1 slider Espaco antes.
- 1 slider Espaco depois.

Estado:

- Funciona e chama `queueBlockAutosave`.
- `Permitir quebra` fica habilitado apenas para `text`, `tip`, `exercise`, `columns`.
- Para blocos musicais/media, o switch aparece desabilitado, o que e correto tecnicamente mas pode ser visualmente confuso.

### Estilo do Bloco

Aparece para todos exceto:

- `cover`
- `page_break`
- `separator`

Controles/campos:

- 4 abas: Fundo, Espacamento, Bordas, Margens.
- Fundo: tipo de fundo, cor solida ou gradiente, cores rapidas.
- Espacamento: switch de padding vinculado e sliders.
- Bordas: switch, cor, estilo, espessura, arredondamento.
- Margens: slider acima e abaixo.
- Reset: Restaurar estilo padrao.

Estado:

- Funciona e chama `queueBlockAutosave`.
- Denso para 300px de largura; e util, mas pode ficar escondido/complexo para professor nao tecnico.

### Acoes

Aparece para qualquer bloco selecionado.

Controles/campos:

- Salvar Alteracoes.
- Reverter Original, condicional quando ha `original_content` e `is_edited`.
- Duplicar Bloco.

Estado:

- Salvar funciona via `updateMaterialBlockRpc`.
- Duplicar foi recentemente ajustado para resposta otimista.
- Nao ha botao de excluir nessa secao; excluir fica na toolbar contextual/lista. Isso pode ser confuso, porque a secao se chama Acoes mas nao concentra todas as acoes do bloco.

### Exportar material

Aparece para qualquer bloco selecionado.

Controles/campos:

- Baixar PDF.
- Imprimir / PDF.
- Ver HTML.

Estado:

- Aparece em todos os blocos selecionados.
- Funcionalmente faz sentido como acao global de material, mas semanticamente fica estranho dentro de propriedades de um bloco especifico.

## Auditoria por block_type

### `cover`

Secoes:

- Tipo: 1 display + badge condicional.
- Dados da Capa: aproximadamente 25+ controles base, podendo passar de 40 com elementos/textos selecionados.
- Acoes: 2 fixos + 1 condicional.
- Exportar material: 3 controles.

Detalhe de Dados da Capa:

- Template: 1 select.
- Estilo IA: 8 botoes.
- Referencia Visual: upload, previews, remocao por imagem, limite de 5.
- Imagem de Fundo IA: gerar/regenerar, remover, importar/trocar por biblioteca.
- Prompt da Capa IA: 1 textarea + 1 botao Melhorar Prompt.
- Logomarca: upload/trocar/remover + slider de tamanho quando existe logo.
- Elementos: adicionar camada, lista de overlays, remover/editar, controles condicionais de tamanho, rotacao, opacidade, sombra, espelhar e frente.
- Textos: ativar/adicionar, lista de textos, e controles condicionais extensos de texto selecionado.
- Metadados: instrumento, nivel, professor, escola, data.

Funcionando:

- E a secao mais completa do painel.
- Campos usam `updateSelectedRenderData`, que aciona autosave.
- IA de capa e prompt estao conectadas.

Quebrado/confuso:

- Muito conteudo para 300px de largura.
- Mistura configuracao da capa, IA, biblioteca, tipografia, metadados e camadas numa unica secao longa.
- Nao mostra a secao Titulo comum, porque usa campos proprios.
- Nao mostra Paginacao nem Estilo do Bloco.

### `title`

Secoes:

- Tipo: 1.
- Titulo: 1.
- Conteudo: 1.
- Paginacao: 6 principais + 1 condicional.
- Estilo do Bloco: 4 abas + reset.
- Assistente IA: 7 controles.
- Acoes: 2 fixos + 1 condicional.
- Exportar material: 3.

Funcionando:

- Conteudo, titulo, paginacao e estilo chamam autosave.
- IA textual aparece.
- `keepWithNext` padrao faz sentido para titulos.

Quebrado/confuso:

- Existe Titulo e Conteudo para um bloco `title`, o que pode confundir o papel semantico do bloco.

### `text`

Secoes:

- Tipo: 1.
- Titulo: 1.
- Conteudo: 1.
- Paginacao: 6 principais + 1 condicional.
- Estilo do Bloco: 4 abas + reset.
- Assistente IA: 7 controles.
- Acoes: 2 fixos + 1 condicional.
- Exportar material: 3.

Funcionando:

- Fluxo mais completo e coerente.
- Permitir quebra fica habilitado.
- IA textual aparece.

Quebrado/confuso:

- O Assistente IA da sidebar parece nao disparar autosave diretamente apos reescrever, diferente do editor de conteudo.

### `tip`

Secoes:

- Mesmas de `text`.

Funcionando:

- Conteudo, paginacao, estilo e IA textual aparecem.
- Prompt de IA reconhece que e bloco de dica.

Quebrado/confuso:

- Mesmo risco de persistencia do Assistente IA da sidebar.

### `exercise`

Secoes:

- Mesmas de `text`.

Funcionando:

- Conteudo, paginacao, estilo e IA textual aparecem.
- Prompt de IA reconhece que e bloco de exercicio.

Quebrado/confuso:

- Mesmo risco de persistencia do Assistente IA da sidebar.

### `notation`

Secoes:

- Tipo: 1.
- Titulo: 1.
- Paginacao: 6 principais + 1 condicional.
- Notacao: 1 botao Editar Notacao + status/labels condicionais.
- Estilo do Bloco: 4 abas + reset.
- Acoes: 2 fixos + 1 condicional.
- Exportar material: 3.

Funcionando:

- Botao abre editor visual de notacao.
- Legendas das pautas aparecem se existem staves com labels ou mais de uma pauta.
- Paginacao preserva bloco musical como indivisivel.

Quebrado/confuso:

- `Permitir quebra` aparece desabilitado; correto, mas pode parecer controle quebrado para usuario final.

### `rhythm`

Secoes:

- Tipo: 1.
- Titulo: 1.
- Paginacao: 6 principais + 1 condicional.
- Notacao do bloco: aparece se o bloco tiver `render_data.notation`, `notation_data` ou `notes`.
- Estilo do Bloco: 4 abas + reset.
- Acoes: 2 fixos + 1 condicional.
- Exportar material: 3.

Funcionando:

- Pode usar o editor de pauta quando o bloco carrega dados de notacao.
- Paginacao trata como bloco musical indivisivel.

Quebrado/confuso:

- Nao existe uma secao chamada Ritmo; quando editavel, aparece como "Notacao do bloco".
- Se um bloco `rhythm` nao tiver dados de notacao, fica sem editor especifico na sidebar.

### `tablature`

Secoes:

- Tipo: 1.
- Titulo: 1.
- Paginacao: 6 principais + 1 condicional.
- Tablatura: 1 botao Editar Tablatura.
- Estilo do Bloco: 4 abas + reset.
- Acoes: 2 fixos + 1 condicional.
- Exportar material: 3.

Funcionando:

- Botao abre editor visual de tablatura.
- Paginacao preserva bloco indivisivel.

Quebrado/confuso:

- `Permitir quebra` aparece desabilitado.

### `chord_diagram`

Secoes:

- Tipo: 1.
- Titulo: 1.
- Paginacao: 6 principais + 1 condicional.
- Diagrama: 1 botao Editar Acorde + status condicional do acorde.
- Estilo do Bloco: 4 abas + reset.
- Acoes: 2 fixos + 1 condicional.
- Exportar material: 3.

Funcionando:

- Botao abre editor de acorde.
- Mostra o nome do acorde quando `render_data.chord_name` existe.

Quebrado/confuso:

- Nao ha ajustes rapidos de acorde na sidebar; tudo depende do modal/editor.

### `chord_grid`

Secoes:

- Tipo: 1.
- Titulo: 1.
- Paginacao: 6 principais + 1 condicional.
- Grade de Acordes: 3 controles base + lista dinamica.
- Estilo do Bloco: 4 abas + reset.
- Acoes: 2 fixos + 1 condicional.
- Exportar material: 3.

Detalhe de Grade de Acordes:

- Colunas: 4 botoes.
- Contador de acordes.
- Botao Adicionar Acorde.
- Lista dinamica com remover por acorde.

Funcionando:

- Permite configurar colunas, adicionar e remover itens.

Quebrado/confuso:

- Edicao detalhada dos acordes acontece fora da sidebar.
- Lista pode ficar limitada em `max-h-40`, o que ajuda, mas ainda pode ficar apertado em 300px.

### `keyboard`

Secoes:

- Tipo: 1.
- Titulo: 1.
- Paginacao: 6 principais + 1 condicional.
- Teclado: 1 botao Editar Teclado + status condicional.
- Estilo do Bloco: 4 abas + reset.
- Acoes: 2 fixos + 1 condicional.
- Exportar material: 3.

Funcionando:

- Botao abre editor de teclado.
- Mostra nome do acorde e quantidade de teclas quando existem dados.

Quebrado/confuso:

- Ajustes finos do teclado ficam fora da sidebar.

### `keyboard_grid`

Secoes:

- Tipo: 1.
- Titulo: 1.
- Paginacao: 6 principais + 1 condicional.
- Grade de Teclados: 3 controles base + lista dinamica.
- Estilo do Bloco: 4 abas + reset.
- Acoes: 2 fixos + 1 condicional.
- Exportar material: 3.

Detalhe de Grade de Teclados:

- Colunas: 4 botoes.
- Contador de teclados.
- Botao Adicionar Teclado.
- Lista dinamica com remover por teclado.

Funcionando:

- Permite configurar colunas, adicionar e remover itens.

Quebrado/confuso:

- Edicao detalhada dos teclados acontece fora da sidebar.

### `image`

Secoes:

- Tipo: 1.
- Titulo: 1.
- Paginacao: 6 principais + 1 condicional.
- Imagem: 4 grupos principais.
- Estilo do Bloco: 4 abas + reset.
- Acoes: 2 fixos + 1 condicional.
- Exportar material: 3.

Detalhe de Imagem:

- Preview/trocar/remover ou zona de upload.
- Input hidden de arquivo.
- URL externa.
- Legenda.
- Tamanho com 4 botoes: P, M, G, Total.

Funcionando:

- Suporta upload, drag and drop, URL externa, legenda e tamanho.

Quebrado/confuso:

- O input hidden e correto tecnicamente, mas dificulta contagem mental de controles.
- A secao mistura upload, URL e layout num bloco so.

### `audio`

Secoes:

- Tipo: 1.
- Titulo: 1.
- Paginacao: 6 principais + 1 condicional.
- Audio: 2 inputs.
- Estilo do Bloco: 4 abas + reset.
- Acoes: 2 fixos + 1 condicional.
- Exportar material: 3.

Detalhe de Audio:

- URL do audio.
- Legenda.

Funcionando:

- A UI existe no editor.

Quebrado/confuso:

- `audio` nao aparece no enum `material_block_type` atual de `database.types.ts`, entao pode haver risco de persistencia/criacao dependendo do backend/RPC.

### `video`

Secoes:

- Tipo: 1.
- Titulo: 1.
- Paginacao: 6 principais + 1 condicional.
- Video: 2 inputs.
- Estilo do Bloco: 4 abas + reset.
- Acoes: 2 fixos + 1 condicional.
- Exportar material: 3.

Detalhe de Video:

- URL do video.
- Legenda.

Funcionando:

- A UI existe no editor.
- Texto informa que no PDF sera exibido como QR code.

Quebrado/confuso:

- `video` nao aparece no enum `material_block_type` atual de `database.types.ts`.

### `columns`

Secoes:

- Tipo: 1.
- Titulo: 1.
- Paginacao: 6 principais + 1 condicional.
- Layout de Colunas: 1 controle base + controles dinamicos por coluna.
- Estilo do Bloco: 4 abas + reset.
- Acoes: 2 fixos + 1 condicional.
- Exportar material: 3.

Detalhe de Layout de Colunas:

- Numero de colunas: 2 botoes.
- Para cada coluna: contador de itens.
- Lista de sub-blocos com remover.
- Dropdown para adicionar sub-bloco.
- Tipos de sub-bloco disponiveis: `text`, `tip`, `exercise`, `chord_diagram`, `chord_grid`, `notation`, `keyboard`, `image`.

Funcionando:

- Permitir quebra fica habilitado para `columns`.
- Estrutura de sub-blocos e editavel pela sidebar.

Quebrado/confuso:

- `columns` nao aparece no enum `material_block_type` atual de `database.types.ts`.
- A edicao de sub-blocos dentro da coluna e mais limitada que a edicao de blocos de primeiro nivel.

### `separator`

Secoes:

- Tipo: 1.
- Titulo: 1.
- Paginacao: 6 principais + 1 condicional.
- Separador: 8 grupos de controle.
- Acoes: 2 fixos + 1 condicional.
- Exportar material: 3.

Detalhe de Separador:

- Cor + cores rapidas.
- Estilo da linha.
- Espessura.
- Largura.
- Espaco.
- Alinhamento.
- Decoracao.
- Preview.
- Reset.

Funcionando:

- Tem painel proprio em vez de usar Estilo do Bloco.

Quebrado/confuso:

- Ainda mostra Titulo, embora separador muitas vezes nao precise.
- Tambem mostra Paginacao, o que pode ser util mas pesado para um divisor visual.

### `page_break`

Secoes:

- Tipo: 1.
- Titulo: 1.
- Acoes: 2 fixos + 1 condicional.
- Exportar material: 3.

Funcionando:

- Aparece como bloco selecionavel e identificavel.

Quebrado/confuso:

- Mostra Titulo, mas quebra de pagina provavelmente nao deveria precisar de titulo.
- Nao mostra Paginacao nem Estilo, o que faz sentido.
- Acoes inclui Duplicar Bloco, o que pode ser perigoso/confuso para quebras manuais.

### `badge`

Secoes:

- Tipo: 1.
- Titulo: 1.
- Paginacao: 6 principais + 1 condicional.
- Estilo do Bloco: 4 abas + reset.
- Acoes: 2 fixos + 1 condicional.
- Exportar material: 3.

Funcionando:

- Recebe o fluxo comum de titulo, paginacao, estilo, salvar e duplicar.

Quebrado/confuso:

- Nao existe secao especifica para dados de conquista/badge.

### `qr_code`

Secoes:

- Tipo: 1, usando fallback de configuracao.
- Titulo: 1.
- Paginacao: 6 principais + 1 condicional.
- Estilo do Bloco: 4 abas + reset.
- Acoes: 2 fixos + 1 condicional.
- Exportar material: 3.

Funcionando:

- O tipo existe no enum do banco e no preview.

Quebrado/confuso:

- Nao existe secao dedicada para URL/dados do QR code na sidebar.
- `getBlockConfig` nao tem configuracao propria para `qr_code`, entao cai no fallback visual.
- E o tipo mais claramente incompleto na sidebar.

## Estado sem bloco selecionado

Quando nenhum bloco esta selecionado, a sidebar mostra configuracao de pagina, nao propriedades de bloco.

Secoes:

- Configuracao da Pagina.
- Cabecalho e Rodape: tabs Header/Footer usando `HeaderFooterEditor`.
- Margens da Pagina: `PageMarginsPanel`.
- Background da Pagina: `PageBackgroundPanel`.

Estado:

- Funciona como painel global da pagina.
- Nao mostra exportacao quando nenhum bloco esta selecionado.

## Estado com elemento flutuante selecionado

Quando um floating element esta selecionado e nenhum bloco esta selecionado, a sidebar troca para propriedades do elemento.

Secoes:

- Header/nome/tipo: input de nome, lock/unlock, remover.
- Posicao e Tamanho: X, Y, largura, rotacao, opacidade.
- Controles especificos por tipo:
  - `floating_text`: `FloatingTextProperties`.
  - `floating_image`: `FloatingImageProperties`.
  - `shape`: `FloatingShapeProperties`.
- Camadas rapidas: Frente e Tras.

Estado:

- Funciona como painel separado do fluxo de blocos.
- Exportacao nao aparece neste modo.

## Principais riscos e confusoes encontrados

1. **Acoes globais dentro de propriedades de bloco**  
   Exportar material aparece dentro do bloco selecionado, embora seja uma acao global.

2. **Acoes incompletas na secao Acoes**  
   A secao mostra salvar, reverter e duplicar, mas nao excluir. Excluir existe em outros lugares.

3. **Tipos do frontend fora do enum do banco**  
   `columns`, `audio` e `video` tem UI na sidebar, mas nao aparecem no enum `material_block_type` em `database.types.ts`.

4. **Tipo do banco sem UI especifica**  
   `qr_code` existe no enum e preview, mas nao tem controles dedicados no painel direito.

5. **Assistente IA textual pode nao persistir automaticamente**  
   O fluxo da sidebar atualiza estado local, mas nao chama `queueBlockAutosave` explicitamente. Recomenda-se testar persistencia apos recarregar pagina.

6. **Painel de capa esta sobrecarregado**  
   A capa concentra template, IA, prompt, logomarca, overlays, tipografia e metadados numa unica area de 300px.

7. **Controles tecnicamente corretos podem parecer quebrados**  
   `Permitir quebra` aparece desabilitado em blocos musicais/media. Faz sentido para PDF, mas a UI poderia explicar melhor.

## Recomendacoes para a proxima fase

1. Separar **Exportar material** para um painel global/header, nao para propriedades de bloco.
2. Padronizar a secao **Acoes**: salvar, duplicar, excluir, reverter, com confirmacao elegante para exclusao.
3. Criar secao dedicada para `qr_code`.
4. Confirmar se `columns`, `audio` e `video` devem entrar no enum/backend ou sair da UI.
5. Dividir `cover` em subpaineis: Dados, Imagem IA, Logomarca, Elementos, Tipografia.
6. Ajustar Assistente IA para autosave explicito ou aviso de "Salvar para persistir".
7. Revisar `page_break` e `separator` para remover campos que nao fazem sentido, como titulo em alguns casos.
