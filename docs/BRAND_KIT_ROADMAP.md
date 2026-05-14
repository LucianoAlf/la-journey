# Brand Kit Roadmap

## Objetivo

Transformar escolhas visuais recorrentes em um sistema reutilizavel por escola, professor e material. A ideia e reduzir retrabalho: escolher uma vez fontes, logomarcas, cores, capas e preferencias, depois reaplicar em novos materiais.

## Radar De Produto

### Capas Salvas

- Salvar uma capa aprovada como modelo reutilizavel.
- Criar variacoes da mesma capa para outros cursos ou modulos.
- Permitir trocar apenas cor, texto, instrumento ou imagem mantendo a mesma composicao.
- Reutilizar prompts e referencias visuais que deram certo.

### Identidade Da Escola

- Logomarca principal e variacoes.
- Paleta de cores da escola.
- Fontes padrao para capa, subtitulos e texto corrido.
- Preferencias de cabecalho, rodape e assinatura visual.

### Sugestoes Guiadas

- Indicar fontes boas para texto corrido.
- Indicar fontes fortes para capa.
- Indicar combinacoes de titulo + corpo.
- Explicar quando usar fontes infantis, editoriais, tecnicas ou manuscritas.

### Upload De Fontes

- Permitir upload de fontes personalizadas em fase posterior.
- Validar licenca e origem da fonte.
- Injetar `@font-face` no editor e na rota `/print` para manter paridade com o PDF.

## Ordem Recomendada

1. Polir biblioteca de Google Fonts com recomendacoes e recentes.
2. Criar presets de fonte e cores por escola.
3. Adicionar logomarcas e variacoes.
4. Salvar capas como modelos reutilizaveis.
5. Permitir variacoes inteligentes de uma capa salva.
6. Depois do beta, avaliar upload de fontes personalizadas.
