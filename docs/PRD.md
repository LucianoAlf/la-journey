# 🎵 LA Journey — Product Requirements Document (PRD)

**Versão:** 5.0  
**Data:** 17 de março de 2026  
**Autor:** Luciano Alf · LA Music  
**Classificação:** Confidencial  
**Changelog v2:** Inclusão do Editor de Material (block-based), módulos Gestão de Turmas, Visão do Professor e Integrações, novas tabelas (material_blocks, class_students, whatsapp_templates), arquitetura multi-tenant (RLS), Gemini API para imagens, tipografia atualizada.
**Changelog v3:** AlphaTab integrado como player de tablatura interativo com MIDI. Pipeline Songsterr→GP completo (Edge Function + conversor frontend). Mixer de volumes por track. Upload de arquivos GP com auto-preenchimento de metadados via ScoreLoader. SoundFont GeneralUser GS (30MB). Modal dedicado "Importar GP" (GpImportModal). Nova coluna `gp_file_url` no repertoire. Bucket `gp-files` no Storage.
**Changelog v4:** Editor de Notação Musical completo (NotationEditor + NotationRenderer): 4 claves (Sol/Fá/Dó/Percussão), 5 durações, alterações (#/b/♮), armaduras, pausas, ponto de aumento, noteheads de percussão (x), barras de compasso manuais (modo livre), serialização para Supabase. Editor de Tablatura completo (TablatureEditor + TabSvgEditor): editor SVG multi-linha interativo, 5 instrumentos (violão/guitarra/baixo/ukulele/7 cordas), auto-expand de colunas, AlphaTab preview integrado, fórmulas de compasso (16 opções com subdivisão automática), barras de compasso com números, durações proporcionais (semibreve a semicolcheia), Tab como backspace contínuo, substituição direta de trastes. Biblioteca Musical expandida para 5 tabs (Acordes/Escalas/Notação/Tablatura/Imagens IA). AlphaTab Viewer condicional: stems/barras/fórmula visíveis quando há compasso definido, limpo quando livre. Tabela `notation_library` + `tablature_library` no Supabase. 8961 acordes na chord_library.
**Changelog v5:** Editor de Tablatura expandido: ponto de aumento, ligadura, palhetada (↓/↑), quiáltera (3/5/6/7), toolbar reorganizada com grupos lógicos. Popover de acorde integrado com Supabase (`chord_library`): busca assíncrona com debounce, navegação entre posições, normalização automática de input (g→G). Diagramador de acorde (ChordEditor) integrado: clicar no diagrama abre modal de edição visual, criar nova posição do zero, salvar/atualizar acorde no banco em tempo real. Editor de Notação com cifras e annotations como overlay HTML. Capas de material com geração de imagem IA (Gemini), prompt personalizável, edição inline de título, drag-and-drop de elementos. Blocos de mídia no Editor de Material: imagem (upload), áudio (player HTML5), vídeo (embed YouTube/Vimeo). 8965 acordes na chord_library. 20 services no frontend. 17 componentes musicais. 16 páginas + Login.

---

## 1. Visão do Produto

**LA Journey** é uma plataforma SaaS de geração, personalização e distribuição de material didático musical para escolas de música, alimentada por inteligência artificial e fundamentada na metodologia proprietária **Ancoragem de Fundamentos**.

A plataforma permite que o dono ou coordenador pedagógico de uma escola de música construa jornadas de aprendizado personalizadas, selecione e ordene conteúdos por instrumento e nível, e gere automaticamente apostilas profissionais em PDF — com a identidade visual da própria escola — prontas para impressão ou distribuição digital.

**Tagline:** *Aprender → Ancorar → Evoluir → Celebrar*

---

## 2. Problema

Escolas de música no Brasil enfrentam três problemas simultâneos que a LA Journey resolve:

**Problema pedagógico:** A maioria das escolas de música não possui material didático estruturado. Cada professor ensina "do seu jeito", sem padronização, sem progressão clara, sem material de apoio para o aluno. Isso prejudica retenção, qualidade e percepção de valor.

**Problema tributário:** A reforma tributária brasileira (LC 214/2025) eleva a carga sobre serviços educacionais de cursos livres para ~26,5% (IBS+CBS), enquanto material didático (livros, apostilas, e-books) mantém imunidade constitucional. Escolas que não têm material didático separado pagam imposto cheio sobre 100% da mensalidade. Escolas com material didático legítimo podem desmembrar a cobrança e reduzir drasticamente a carga tributária.

**Problema de produção:** Criar material didático musical de qualidade é demorado e caro. Exige conhecimento pedagógico, domínio de notação musical, design gráfico e diagramação. A maioria das escolas não tem equipe nem recursos para isso. A IA resolve o gargalo de produção, desde que alimentada com base pedagógica curada.

---

## 3. Público-Alvo

### 3.1 Usuário primário — Dono / Diretor de escola de música
- Precisa de material didático profissional para justificar cobrança separada (estratégia tributária)
- Quer padronizar a metodologia da escola
- Busca aumentar retenção e percepção de valor
- Não tem tempo ou equipe para produzir material próprio

### 3.2 Usuário secundário — Coordenador pedagógico / Professor curador (N4)
- Configura a jornada do aluno na plataforma
- Seleciona e ordena conteúdos para geração de material
- Revisa e valida materiais gerados pela IA
- Monitora o progresso dos alunos na jornada

### 3.3 Usuário terciário — Professor de sala de aula
- Utiliza os materiais gerados nas aulas
- Registra o progresso do aluno na jornada (via app ou WhatsApp)
- Recebe sugestões automáticas de conteúdo complementar

### 3.4 Beneficiário final — Aluno / Responsável
- Recebe material didático personalizado com a marca da escola
- Visualiza seu progresso na jornada (gamificação)
- Acessa materiais complementares digitais (PDF, áudio, backing tracks)

---

## 4. Metodologia — Ancoragem de Fundamentos

A Ancoragem de Fundamentos é a metodologia pedagógica proprietária que sustenta toda a plataforma. Seu princípio central: o aluno precisa vivenciar, fixar e celebrar cada fundamento antes de avançar.

### 4.1 Os 6 Pilares da Ancoragem

| # | Pilar | Descrição |
|---|-------|-----------|
| 01 | Fundamentos Teóricos | Conceitos, notação, leitura, propriedades do som |
| 02 | Prática do Instrumento | Postura, técnica, exercícios motores, dedilhado |
| 03 | Repertório | Músicas adequadas ao nível, exploração de estilos |
| 04 | Improvisação e Composição | Criatividade sobre escalas, acordes, padrões rítmicos |
| 05 | Desenvolvimento Auditivo | Percepção rítmica, melódica e harmônica |
| 06 | Avaliações e Apresentações | Feedbacks construtivos, saraus, celebrações de progresso |

### 4.2 Macro Estrutura — 4 Stages

| Stage | Nome | Equivalente | Descrição |
|-------|------|-------------|-----------|
| 01 | **Foundation** | Básico 1 | Base técnica — alicerces da musicalidade |
| 02 | **Grow** | Básico 2 | Desenvolvimento — repertório, confiança, coordenação |
| 03 | **Advance** | Intermediário | Fluidez e expressão — domínio técnico e autonomia |
| 04 | **Master** | Avançado | Identidade — maturidade e autenticidade musical |

### 4.3 Micro Estrutura — Ciclo de 40 Aulas por Stage

Cada Stage contém 40 aulas organizadas em 3 ações pedagógicas:

- **START** (Aula 1) — Ponto de partida: despertar interesse, introduzir conteúdos, criar conexão
- **CORE** (até 3 por Stage) — Momentos de fixação e ancoragem. Técnica e experiência se unem
- **CHECK POINT** (Aula 40) — Fechamento de ciclo: consolidação, reconhecimento, celebração

### 4.4 Dimensões do Conteúdo por Estação

Cada estação dentro de um Stage contém 4 dimensões paralelas:

| Dimensão | Conteúdo |
|----------|----------|
| Teoria e Conceitos | Fundamentos teóricos progressivos |
| Técnica | Exercícios motores, postura, coordenação |
| Ritmo | Pulso, andamento, figuras rítmicas, percepção |
| Repertório | Músicas organizadas por nível de dificuldade |

### 4.5 Personalização por Escola

A metodologia é o framework, mas cada escola personaliza:

- **Seleção de tópicos:** O coordenador escolhe quais assuntos incluir no material (ex: incluir ou não "história da música", "funções harmônicas", etc.)
- **Ordenação:** O coordenador define a sequência dos tópicos (ex: entrar direto em formação de acordes antes de intervalos)
- **Quantidade de aulas por ciclo:** Configurável (20, 30, 40 aulas)
- **Repertório:** Cada escola define suas músicas de referência por nível
- **Identidade visual:** Logo, cores, nome da escola no material

---

## 5. Instrumentos e Disciplinas Suportados

### 5.1 Instrumentos (MVP)
- 🎸 Violão
- 🎸 Guitarra
- 🎹 Teclado
- 🎹 Piano
- 🎤 Canto
- 🥁 Bateria
- 🎸 Baixo
- 🪕 Ukulele

### 5.2 Disciplinas Complementares
- 🎒 Musicalização para Bebês (Baby Class 1/2/3: 6-24 meses)
- 🎒 Musicalização Infantil (Kids 1/2/3: 2-5 anos)
- 🎒 Iniciação ao Instrumento e Canto (Heart 1/2: 5-11 anos)
- 📖 Teoria Musical Complementar (material transversal a todos os instrumentos)

---

## 6. Módulos do Sistema

### 6.1 🏗️ Construtor de Jornada

O módulo central onde o coordenador configura o percurso pedagógico da escola.

**Funcionalidades:**
- Selecionar instrumento/disciplina
- Definir quantidade de Stages e aulas por Stage
- Para cada Stage, selecionar tópicos disponíveis em cada dimensão (Teoria, Técnica, Ritmo, Repertório)
- Reordenar tópicos via drag-and-drop
- Definir pontos de Core (ancoragem) e Checkpoint dentro do Stage
- Pré-visualizar a jornada como mapa visual (estilo roadmap)
- Salvar jornadas como templates reutilizáveis
- Duplicar e adaptar jornadas existentes

### 6.2 📄 Gerador de Material Didático

Motor de geração automática de apostilas em PDF e HTML.

**Funcionalidades:**
- Gerar apostila completa por ciclo/módulo (ex: Fundamentos 1 — 10 aulas)
- Gerar material individual por aula (para envio complementar)
- Personalizar com identidade visual da escola (logo, cores, nome, capa)
- Incluir automaticamente: diagramas de acordes (SVGuitar), notação musical (VexFlow), tablaturas (VexTab), exercícios gerados por IA, seções de teoria com explicações, sugestões de repertório com indicação de dificuldade, QR codes para conteúdo complementar (áudios, vídeos, backing tracks), elementos de gamificação (selos, checkpoints, desbloqueáveis)
- Exportar em PDF (download/impressão) e HTML (visualização digital)
- Integração com gráficas inteligentes (ex: IPres Net) para impressão sob demanda (futuro)

### 6.2.1 ✏️ Editor de Material (Block-based)

Editor visual de blocos pós-geração que permite ao coordenador editar, reorganizar e personalizar o material antes da exportação final.

**Princípio:** A IA gera o material como um array de blocos editáveis. O coordenador revisa e pode modificar qualquer bloco individualmente antes de exportar.

**Layout:** 3 painéis — sidebar esquerda (lista de blocos com drag-and-drop), canvas central (preview editável em tempo real), painel direito (propriedades do bloco selecionado).

**Tipos de bloco:**
- **Título de seção** — Cabeçalho colorido por dimensão (Teoria, Técnica, Ritmo, Repertório)
- **Texto** — Parágrafo editável inline com `contenteditable`
- **Imagem** — Upload manual ou geração via Gemini API (IA). Clicável para trocar.
- **Diagrama de acorde** — SVGuitar renderizado. Clicável para trocar por outro acorde da biblioteca.
- **Notação musical** — VexFlow na pauta. Editável via editor de notação.
- **Tablatura** — VexTab para violão/guitarra/baixo.
- **Exercício** — Box com instruções + código monospace para exercícios práticos.
- **Dica / Destaque** — Box informativo com ícone.
- **Ficha de repertório** — Música com diagramas de acordes + estrutura (intro/verso/refrão).
- **Selo / Conquista** — Badge de gamificação com emoji, título e pontos.
- **QR Code** — Link externo para backing track, vídeo ou material complementar.
- **Separador** — Linha divisória entre seções.

**Funcionalidades do editor:**
- Selecionar bloco (sincroniza lista lateral ↔ canvas)
- Editar texto inline (contenteditable)
- Trocar imagem (upload, gerar com Gemini, ou selecionar da biblioteca)
- Trocar diagrama de acorde (selecionar outro da chord_library)
- Reordenar blocos via drag-and-drop
- Adicionar blocos novos (modal com grid de 12 tipos disponíveis)
- Duplicar bloco
- Remover bloco
- Reverter ao conteúdo original (antes da edição)
- Salvar como rascunho
- Publicar (finalizar edição)
- Versionamento (cada save incrementa versão)
- Exportar PDF, HTML, enviar via WhatsApp

**Fluxo de edição:**
1. Material é gerado pela IA → salvo como array de `material_blocks`
2. Coordenador abre o editor
3. Vê o material montado com todos os blocos renderizados
4. Clica num bloco → seleciona → edita no canvas ou nas propriedades
5. Reordena arrastando na lista lateral
6. Adiciona/remove blocos conforme necessário
7. Salva rascunho (pode retomar depois)
8. Publica → material fica disponível para download/envio
9. Exporta PDF final

### 6.2.2 ✅ Atualização Executiva — Evolução do Editor (7 fases concluídas)

O subprojeto de evolução do Editor de Material foi executado em 7 fases incrementais, com foco em operação pedagógica real, produtividade e segurança de edição.

**Fase 1 — Editor rico + edição inline**
- Toolbar completa de formatação (WYSIWYG)
- Edição inline no canvas com sincronização no painel
- Compatibilidade com conteúdo legado

**Fase 2 — Layout A4 + impressão**
- Simulação de páginas A4 no canvas
- Zoom e preview de impressão otimizados
- Estrutura de cabeçalho/rodapé e paginação

**Fase 3 — Blocos avançados**
- Capa customizável
- Grade de acordes e blocos de teclado
- Suporte a layouts em colunas

**Fase 4 — Mídia**
- Blocos de imagem, áudio e vídeo
- Fluxo de assets integrado ao editor

**Fase 5 — IA no editor**
- Reescrever/simplificar/expandir/formalizar
- Variações de conteúdo
- Tradução e correção ortográfica em lote

**Fase 6 — UX operacional**
- Toolbar de produtividade
- Atalhos globais de edição
- Melhorias de fluxo para operação contínua

**Fase 7 — Polimento final**
- Régua visual no canvas (toggle no header)
- Mini-mapa de páginas (tabs Blocos/Páginas)
- Templates de material (aplicação assistida)
- Histórico de versões (listar, restaurar, excluir)
- Edição de legendas de pauta no painel de propriedades (ex.: "Notas nas linhas..." e "Notas nos espaços...")

**Resultado consolidado:** Editor pronto para operação diária da coordenação pedagógica, com maior previsibilidade visual, maior velocidade de produção e menor risco operacional.

### 6.3 📚 Base de Conteúdo Curado (RAG)

Repositório estruturado de conteúdo pedagógico musical que alimenta o gerador.

**Funcionalidades:**
- Banco de conteúdos organizados por: instrumento, pilar da ancoragem, nível (Foundation/Grow/Advance/Master), tipo (texto explicativo, exercício, diagrama, partitura, repertório)
- Cada unidade de conteúdo tem metadados: pré-requisitos, nível de dificuldade, tempo estimado, tags temáticas
- Interface de curadoria para professores N4 adicionarem, editarem e validarem conteúdo
- Versionamento de conteúdos (histórico de alterações)
- Status de curadoria: rascunho → em revisão → aprovado → publicado

### 6.4 🎼 Motor de Renderização Musical

Subsistema responsável por gerar os elementos visuais musicais.

**Componentes:**
- **Diagramas de acordes:** SVGuitar para violão/guitarra/ukulele, componente SVG customizado para teclado/piano (8965 acordes na chord_library)
- **Notação musical na pauta:** VexFlow para claves, figuras rítmicas, escalas, intervalos, acordes na pauta
- **Tablatura:** AlphaTab para preview profissional + TabSvgEditor para edição interativa
- **Exercícios interativos:** Geração procedural de exercícios (ex: "calcule os intervalos") onde a IA varia os parâmetros para que cada material seja único
- **Bracinhos de instrumento:** SVG parametrizado mostrando posições no braço do violão/guitarra com notas marcadas, dedilhado, casas

Cada elemento renderizado tem um ID único no banco de dados e é armazenado como SVG inline para inclusão direta no PDF.

**Editores musicais integrados:**

**Editor de Notação Musical** (`NotationEditor.tsx` + `NotationRenderer.tsx`):
- 4 claves: Sol (treble), Fá (bass), Dó (alto), Percussão
- 5 durações: semibreve, mínima, semínima, colcheia, semicolcheia
- 5 modos de input: Melódico, Acorde, Ligadura, Cifra, Anotação
- Alterações: sustenido (#), bemol (b), bequadro (♮)
- 15 armaduras (Dó maior a 7 sustenidos/bemóis)
- Pausas com toggle de modo pausa
- Ponto de aumento (1.5× duração)
- Percussão: noteheads x para pratos, nomes das peças em pt-BR
- Barras de compasso manuais (modo livre)
- Ghost tooltip com preview da nota antes de clicar
- **Cifras e annotations como overlay HTML:** cifras em bold roxo (#6366F1) + annotations em itálico cinza (#94A3B8), posicionados acima das notas, popup inline para edição
- Multi-line: `splitBeatsIntoLines()` com 4/8/12/16 notas por linha, scroll vertical
- Serialização completa para Supabase (notation_library) incluindo cifra + annotation por beat
- VexFlow renderiza em tempo real com auto-formatting

**Editor de Tablatura** (`TablatureEditor.tsx` + `TabSvgEditor.tsx`):
- 5 instrumentos: Violão/Guitarra (6 cordas), Baixo (4), Ukulele (4), Guitarra 7 cordas
- Editor SVG multi-linha interativo com hit-test preciso
- 5 durações: semibreve (w), mínima (h), semínima (q), colcheia (8), semicolcheia (16)
- Fórmulas de compasso: 16 opções (2/4, 3/4, 4/4, 5/4, 6/4, 7/4, 2/2, 3/2, 4/2, 3/8, 5/8, 6/8, 7/8, 9/8, 12/8, Livre)
- Barras de compasso automáticas baseadas na soma de durações vs capacidade do compasso
- Números de compasso acima da pauta
- Durações proporcionais: colcheia = metade do espaço de semínima, etc.
- Efeitos: ponto de aumento (1.5× duração), ligadura (tie entre notas), palhetada (↓ downstroke / ↑ upstroke), quiáltera (tuplet 3/5/6/7)
- Auto-expand de colunas (ArrowRight no final cria nova linha)
- Tab como backspace contínuo (volta apagando notas)
- Substituição direta de trastes ao digitar (sem precisar deletar antes)
- Toolbar reorganizada: grupos lógicos (duração+tuplet, efeitos com borda, palhetadas unificadas, acorde)
- **Popover de acorde integrado com Supabase:** busca assíncrona na `chord_library` com debounce (300ms), navegação entre todas as posições do banco (ex: C = 5 posições), normalização automática de input (g→G)
- **Diagramador de acorde (ChordEditor):** clicar no diagrama do popover abre modal com editor visual de braço do instrumento (canvas 2D), editar dedos/pestanas/cordas abertas-mutadas, criar nova posição do zero, salvar/atualizar acorde no banco `chord_library` em tempo real, recarrega posições no popover após salvar
- AlphaTab preview integrado com fórmula de compasso, barras e stems visíveis
- Atalhos de teclado: L (ligadura), . (ponto), D (palhetada ↓), U (palhetada ↑), T (quiáltera), C (acorde)
- Serialização completa para Supabase (tablature_library)

**AlphaTab Viewer** (`AlphaTabViewer.tsx`):
- Viewer leve de tablatura usando AlphaTab — sem player
- Modo livre: clean (sem barras, sem fórmula, sem stems)
- Modo com compasso: fórmula visível, barras de compasso, stems/beams por duração
- Conversão automática de grid → alphaTex com `\ts` como bar metadata
- Suporte a dark/light mode com cores adaptáveis
- Cleanup DOM pós-render para visual limpo

### 6.5 🎵 Módulo de Repertório

Gestão, importação e sugestão de músicas por nível de dificuldade. Modelo **"Adquirir e Reter"**: conteúdo é importado UMA VEZ e salvo no banco local — sem dependência externa em runtime.

**Funcionalidades:**
- Base de repertório organizada por: instrumento, nível de dificuldade (1-5), acordes utilizados, gênero musical, tonalidade, BPM
- Importação via **Songsterr** — busca, metadados (instrumentos, tracks, dificuldade), extração de cifra completa com acordes+letra, tom, BPM, afinação, vídeos YouTube e tags via 3 Edge Functions (`songsterr-search`, `songsterr-import`, `songsterr-enrich`)
- Importação via **Cifra Club** — busca de artista/música, scraping de cifra com acordes e letra via Edge Function (`cifra-club-search`, `cifra-club-import`)
- **Editor de cifra do zero** (CifraEditor) — 3 modos (Editar/Preview/Split), toolbar com inserção de seções (9 tipos), acordes (6 categorias), tabs, Undo/Redo, parser de cifra colada com auto-detecção de acordes
- **Transposição de tonalidade** em tempo real — widget +/- semitons, display de tom original/novo, diagramas de acordes atualizam automaticamente (violão + teclado)
- Mini-diagramas de acordes em tempo real — violão (SVGuitar) e teclado (componente SVG) exibidos conforme os acordes da cifra
- Geração de "fichas de repertório" com: sequência de acordes, diagramas dos acordes utilizados, nível de dificuldade, sugestão de ritmo, link do YouTube / QR code para referência
- Sugestões automáticas de repertório baseadas no nível do aluno na jornada (futuro: RPC `suggest_repertoire`)
- Possibilidade de músicas autorais/de domínio público para materiais comercializáveis

### 6.6 📊 Monitoramento da Jornada do Aluno

Acompanhamento do progresso do aluno em tempo real.

**Funcionalidades:**
- Dashboard do professor com visão de todos os alunos e suas posições na jornada
- Registro de progresso por aula (professor marca como concluída, em andamento ou necessita reforço)
- Alertas automáticos: aluno faltou X aulas, aluno estagnado em um checkpoint, aluno adiantado
- Relatório de progresso para responsáveis (enviável por WhatsApp)
- Visão do coordenador: progresso agregado por turma, professor e instrumento
- Cruzamento inteligente: IA verifica se o professor está seguindo a jornada definida ou desviando

### 6.7 🏆 Gamificação

Sistema de recompensas e reconhecimento para engajamento do aluno.

**Funcionalidades:**
- Selos/badges por conquista (completou Fundamentos 1, tocou primeira música, etc.)
- Barra de progresso visual na jornada (estilo mapa de aventura)
- Desafios musicais com QR code no material (escaneia e acessa backing track/exercício)
- Ranking por turma (opcional, configurável pela escola)
- Celebrações automatizadas em checkpoints (mensagem de parabéns via WhatsApp)
- Sistema de "estrelas" por exercício completado em casa

### 6.8 💬 WhatsApp (UAZAPI)

Comunicação automatizada e inteligente via WhatsApp.

**Funcionalidades:**
- Notificação ao professor quando aluno falta (com sugestão de material complementar já gerado)
- Envio automático de material complementar para aluno ausente
- Lembretes de aula e de estudo em casa
- Relatório de progresso para responsáveis
- Professor registra progresso do aluno via mensagem ao bot ("Aluno João completou Fundamentos 1")
- Agente conversacional para dúvidas rápidas de teoria musical (futuro)

### 6.9 ⚙️ Painel Administrativo da Escola

Configurações gerais e gestão da escola na plataforma.

**Funcionalidades:**
- Cadastro da escola (nome, logo, cores, dados fiscais)
- Gestão de usuários (coordenadores, professores, permissões)
- Gestão de turmas e alunos
- Configuração de instrumentos/disciplinas oferecidos
- Configuração de identidade visual para materiais (templates de capa, rodapé, marca d'água)
- Dashboard de uso da plataforma (materiais gerados, alunos ativos, progresso geral)
- Gestão de assinatura e plano

### 6.10 🏫 Gestão de Turmas

Organização de turmas, horários e vinculação aluno ↔ turma ↔ jornada.

**Funcionalidades:**
- Cadastro de turmas com instrumento, professor, horário, capacidade máxima
- Vinculação de jornada à turma (a turma segue uma jornada específica)
- Matrícula de alunos na turma (many-to-many: aluno pode estar em múltiplas turmas)
- Filtros por instrumento, professor, unidade (Campo Grande, Recreio, Barra)
- Suporte a disciplinas complementares: Baby Class (6-24m), Kids (2-5a), Heart (5-11a)
- Visão de ocupação (alunos matriculados vs capacidade máxima)

### 6.11 🎓 Visão do Professor

Tela operacional do dia-a-dia do professor para registro de presença e progresso.

**Funcionalidades:**
- Seleção da turma do dia com data navegável
- Lista de alunos da turma com status na jornada
- Registro de presença/ausência/atraso por aluno
- Seleção de tópicos abordados na aula (checkboxes dos tópicos da estação)
- Avaliação por estrelas (1-5) por aluno
- Campo de observação por aluno (notas do professor)
- Alerta visual para alunos faltosos (background vermelho, botão enviar material)
- Card "IA Monitor" com análise da jornada: turma no ritmo? Professor aderente? Sugestões de intervenção
- Ao salvar, sistema atualiza automaticamente o progresso de cada aluno

### 6.12 🔌 Integrações

Painel de gerenciamento de APIs e serviços conectados à plataforma.

**Integrações ativas:**
- **Claude API (Anthropic)** — 5 agentes: Compositor (Sonnet), Arquiteto Musical (Sonnet), Curador de Repertório (Haiku), Assistente WhatsApp (Haiku), Designer de Material (Sonnet)
- **UAZAPI** — WhatsApp Business para notificações, materiais, lembretes, progresso
- **SVGuitar + VexFlow + VexTab** — Renderização de diagramas de acordes, notação na pauta, tablatura
- **Gemini API (Google)** — Geração de imagens reais para materiais: instrumentos, anatomia vocal, cenas musicais históricas, ilustrações didáticas
- **Supabase** — PostgreSQL, Auth, Storage (PDFs/SVGs/imagens), Edge Functions, Realtime
- **Songsterr** — Busca, metadados, extração de cifra/acordes/tom/BPM/vídeos YouTube via 3 Edge Functions (`songsterr-search`, `songsterr-import`, `songsterr-enrich`). Extração do Redux state inline da página de chords, sem headless browser.
- **Cifra Club** — Busca de artista/música, scraping de cifra com acordes e letra via Edge Functions (`cifra-club-search`, `cifra-club-import`). Uso interno com curadoria obrigatória, não redistribuição.
- **Groq (Llama/Mistral)** — Agente Monitor Pedagógico: análise de progresso, detecção de desvios, classificação de baixo custo
- **AlphaTab** (@coderline/alphatab) — Player de tablatura Guitar Pro com MIDI, mixer de volumes por track (volume/solo/mute), cursor animado, scroll automático. Suporta .gp/.gpx/.gp7/.musicxml + conversão de JSON Songsterr in-memory. SoundFont GeneralUser GS (30MB, 270 instrumentos). Componente `AlphaTabPlayer.tsx` + modal `GpImportModal.tsx` com auto-preenchimento via `ScoreLoader.loadScoreFromBytes()`.

**Integrações futuras:**
- **Music AI / Suno API / Moises API** — Separação de stems, detecção de acordes/BPM/tom, backing tracks personalizados
- **IPres Net** — Impressão sob demanda (envio direto de PDFs para gráfica)

---

## 7. Arquitetura Técnica

### 7.1 Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React + TypeScript + Vite |
| Estilização | Tailwind CSS + shadcn/ui |
| Ícones | Phosphor Icons (`@phosphor-icons/react`) |
| Backend / BaaS | Supabase (PostgreSQL, Auth, Storage, Edge Functions, Realtime) |
| Geração PDF | Puppeteer / React-PDF (server-side via Edge Functions ou worker) |
| Renderização Musical | SVGuitar (acordes), VexFlow (notação), VexTab (tablatura) |
| IA — Conteúdo | Claude API (Sonnet para geração, Haiku para tarefas leves) |
| IA — Imagens | Gemini API (Google) para geração de imagens reais (instrumentos, anatomia, cenas históricas) |
| IA — Agentes secundários | Modelos open source (Llama/Mistral via Groq) para tarefas de classificação e parsing de menor custo |
| WhatsApp | UAZAPI (infraestrutura já existente) |
| Repertório | Songsterr (API + Redux state scraping) + Cifra Club (scraping) + Upload GP direto — uso interno, modelo "Adquirir e Reter" |
| Tablatura interativa | AlphaTab (@coderline/alphatab) — player MIDI, mixer multi-track, cursor animado, SoundFont GeneralUser GS |
| Áudio MIDI | SoundFont GeneralUser GS (30MB) — 270 instrumentos, qualidade profissional |
| Áudio (futuro) | Music AI / Suno API / Moises API para backing tracks e separação de stems |
| Distribuição | PWA (MVP) → React Native (futuro) |
| Desenvolvimento | Claude (backend/banco via MCP) + Windsurf Cascade (frontend/UI) |
| Prototipagem | HTML (Claude) → Google AI Studio / Windsurf Cascade |

### 7.2 Arquitetura de Agentes de IA

O sistema opera com múltiplos agentes especializados:

| Agente | LLM | Função |
|--------|-----|--------|
| **Compositor** | Claude Sonnet | Gera textos explicativos, exercícios, descrições de conteúdo pedagógico a partir da base curada |
| **Arquiteto Musical** | Claude Sonnet | Traduz conteúdo pedagógico em código VexFlow/VexTab/SVGuitar para renderização de diagramas e partituras |
| **Curador de Repertório** | Claude Haiku | Classifica músicas por dificuldade, extrai acordes, sugere repertório por nível |
| **Monitor Pedagógico** | Modelo open source (Llama/Mistral via Groq) | Analisa dados de progresso, detecta desvios de jornada, gera alertas |
| **Assistente WhatsApp** | Claude Haiku | Processa mensagens de professores, gera respostas, envia materiais |
| **Designer de Material** | Claude Sonnet | Monta a estrutura do PDF/HTML, posiciona elementos, aplica template da escola |

### 7.3 Fluxo de Geração de Material

```
Coordenador configura jornada (seleciona tópicos, ordena, define escola)
    ↓
Sistema consulta base de conteúdo curado (RAG) para cada tópico selecionado
    ↓
Agente Compositor gera/adapta textos explicativos e exercícios
    ↓
Agente Arquiteto Musical converte elementos musicais em código SVGuitar/VexFlow/VexTab
    ↓
Motor de Renderização gera SVGs de todos os elementos musicais
    ↓
Agente Designer monta a estrutura do documento (HTML intermediário)
    ↓
Aplica template da escola (logo, cores, capa, rodapé)
    ↓
Insere elementos de gamificação (selos, QR codes, checkpoints)
    ↓
Gera PDF final via Puppeteer / React-PDF
    ↓
Armazena no Supabase Storage
    ↓
Disponível para download / envio ao aluno
```

### 7.4 Arquitetura Multi-Tenant

A plataforma opera com modelo **single database, RLS por school_id**.

| Aspecto | Decisão |
|---------|---------|
| Modelo de tenancy | Single database, Row Level Security por school_id |
| Isolamento | Todas as policies RLS filtram por school_id do JWT |
| Autenticação | Supabase Auth com JWT customizado (school_id no claim) |
| Conteúdo global | Tabelas com school_id NULL = visível para todas as escolas |
| Conteúdo privado | school_id preenchido = visível apenas para aquela escola |
| Storage | Buckets com path `{school_id}/logos/`, `{school_id}/materials/` |
| Performance | Índices em school_id + `(select auth.uid())` nas policies |

**Tabelas com conteúdo misto (global + privado):**
- `content_blocks` — school_id NULL = conteúdo da plataforma (curado pela LA Music), preenchido = conteúdo customizado da escola
- `repertoire` — school_id NULL = catálogo global, preenchido = repertório privado da escola

**Storage Buckets:**
- `school-logos` — Logos das escolas (público)
- `generated-materials` — PDFs e HTMLs gerados (privado, RLS)
- `content-images` — Imagens de conteúdo e geradas por IA (privado, RLS)
- `audio-tracks` — Stems de áudio e backing tracks (privado, RLS)
- `gp-files` — Arquivos Guitar Pro (.gp/.gpx/.gp7/.musicxml) enviados por professores (privado, RLS)

---

## 8. Schema do Banco de Dados (Supabase / PostgreSQL)

**Total: 23 tabelas | 24 enums | ~60 RLS policies | 4 storage buckets**

**Projeto Supabase:**
- Nome: LA Journey
- ID: `rkfszavfqplhorvfpkcq`
- URL: `https://rkfszavfqplhorvfpkcq.supabase.co`
- Região: `sa-east-1` (São Paulo)
- PostgreSQL: v17.6.1

**Migrations aplicadas:**
1. `001_foundation_enums_and_core_tables` — 6 tabelas + 23 enums + RLS + storage
2. `002_journey_and_methodology` — 4 tabelas + FK classes→journeys
3. `003_content_and_music_library` — 5 tabelas + FK station_topics→content_topics
4. `004_operations_editor_communication` — 7 tabelas (inclui material_blocks e whatsapp_templates)
5. `005_fix_rls_performance_and_missing_indexes` — Otimização de performance RLS
6. `006_create_auth_user_alf` — Usuário Auth do Alf para RLS funcionar desde o dia 1
7. `007_fix_rls_infinite_recursion` — Correção de recursão infinita em policies RLS
8. `008_fix_all_remaining_rls_policies` — Correção de todas as policies RLS restantes
9. `009_enable_pgvector_and_rag_infrastructure` — pgvector + embeddings para RAG
10. `010_add_chord_library_update_delete_policies` — Policies CRUD para chord_library
11. `011_create_teoria_complementar_journey` — Jornada Teoria Musical Complementar
12. `012_add_get_station_blocks_function` — RPC para buscar blocos por estação
13. `013_add_vexflow_render_data_to_blocks` — Dados VexFlow nos blocos de conteúdo
14. `014_add_save_material_and_editor_functions` — RPCs para salvar material e editor
15. `015_add_piano_cavaquinho_to_enum` — Novos instrumentos no enum
16. `016_seed_piano_chords_and_scale_positions` — Acordes de piano e posições de escala
17. `017_create_notation_library` — Biblioteca de notação musical
18. `018_add_new_material_block_types` — Novos tipos de bloco (chord_grid, keyboard, keyboard_grid, page_break, rhythm, cover)
19. `019_add_lyrics_and_cifra_content_to_repertoire` — Colunas lyrics, cifra_content, source_url
20. `020_add_repertoire_extended_columns` — Colunas bpm, capo, time_signature, songsterr_id (unique), sections
21. `021_create_backing_tracks_table` — Tabela backing_tracks + RLS + bucket audio-tracks

### 8.1 Gestão da Escola

**schools** — Escolas cadastradas na plataforma
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid (PK) | Identificador único |
| name | text | Nome da escola |
| slug | text (unique) | Identificador URL-friendly |
| logo_url | text | URL do logo no Storage |
| primary_color | text | Cor primária (hex) |
| secondary_color | text | Cor secundária (hex) |
| owner_id | uuid (FK → users) | Proprietário |
| plan | enum | basic, premium |
| subscription_status | enum | active, trial, suspended, cancelled |
| cnpj | text | CNPJ da escola |
| city | text | Cidade |
| state | text | Estado |
| created_at | timestamptz | Data de criação |

**users** — Usuários do sistema
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid (PK) | Identificador (Supabase Auth) |
| school_id | uuid (FK → schools) | Escola vinculada |
| name | text | Nome completo |
| email | text | E-mail |
| phone | text | WhatsApp |
| role | enum | owner, coordinator, teacher, student |
| avatar_url | text | Foto de perfil |
| is_active | boolean | Ativo/inativo |
| created_at | timestamptz | Data de criação |
| updated_at | timestamptz | Data de atualização |

**students** — Alunos (complemento de users com role=student)
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid (PK) | Identificador |
| user_id | uuid (FK → users) | Referência ao usuário |
| school_id | uuid (FK → schools) | Escola |
| responsible_name | text | Nome do responsável |
| responsible_phone | text | WhatsApp do responsável |
| birth_date | date | Data de nascimento |
| enrollment_date | date | Data de matrícula |
| instruments | text[] | Instrumentos que estuda |
| current_stage | jsonb | Estágio atual por instrumento |

**classes** — Turmas
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid (PK) | Identificador |
| school_id | uuid (FK → schools) | Escola |
| teacher_id | uuid (FK → users) | Professor responsável |
| instrument | text | Instrumento da turma |
| name | text | Nome da turma |
| journey_id | uuid (FK → journeys) | Jornada vinculada |
| schedule | jsonb | Dias e horários |
| max_students | int | Capacidade máxima |

**class_students** — Vínculo aluno ↔ turma (many-to-many)
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid (PK) | Identificador |
| class_id | uuid (FK → classes) | Turma |
| student_id | uuid (FK → students) | Aluno |
| enrolled_at | timestamptz | Data de entrada na turma |
| is_active | boolean | Se está ativo na turma |

### 8.2 Jornada e Metodologia

**journeys** — Jornadas configuradas pela escola
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid (PK) | Identificador |
| school_id | uuid (FK → schools) | Escola |
| instrument | text | Instrumento |
| name | text | Nome da jornada (ex: "Jornada Violão Adulto") |
| target_audience | enum | baby, kids, teen, adult |
| methodology | text | Metodologia (default: "ancoragem_fundamentos") |
| stages_config | jsonb | Configuração dos Stages (quantidade, aulas por stage) |
| is_template | boolean | Se é template reutilizável |
| status | enum | draft, active, archived |
| created_by | uuid (FK → users) | Quem criou |
| created_at | timestamptz | Data de criação |

**journey_stages** — Stages dentro de uma jornada
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid (PK) | Identificador |
| journey_id | uuid (FK → journeys) | Jornada |
| stage_number | int | Número do stage (1-4) |
| name | text | Nome (Foundation, Grow, Advance, Master) |
| total_lessons | int | Total de aulas (default: 40) |
| description | text | Descrição do stage |

**journey_stations** — Estações dentro de um Stage
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid (PK) | Identificador |
| stage_id | uuid (FK → journey_stages) | Stage |
| station_number | int | Número da estação |
| name | text | Nome (ex: "Fundamentos 1") |
| lesson_start | int | Aula de início |
| lesson_end | int | Aula de fim |
| station_type | enum | start, core, checkpoint, regular |
| topics | jsonb | Tópicos selecionados e ordenados (ver 8.3) |

**journey_station_topics** — Tópicos selecionados para cada estação
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid (PK) | Identificador |
| station_id | uuid (FK → journey_stations) | Estação |
| topic_id | uuid (FK → content_topics) | Tópico de conteúdo |
| dimension | enum | theory, technique, rhythm, repertoire |
| sort_order | int | Ordem dentro da dimensão |
| is_included | boolean | Se o tópico está ativo |

### 8.3 Conteúdo Pedagógico (Base Curada / RAG)

**content_topics** — Catálogo de tópicos disponíveis
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid (PK) | Identificador |
| title | text | Nome do tópico (ex: "Escala Maior") |
| slug | text | Identificador URL |
| description | text | Descrição breve |
| instrument | text | Instrumento (ou "universal" para teoria) |
| pillar | enum | Os 6 pilares da ancoragem |
| dimension | enum | theory, technique, rhythm, repertoire, auditory, evaluation |
| difficulty_level | enum | foundation, grow, advance, master |
| prerequisites | uuid[] | Tópicos pré-requisitos |
| tags | text[] | Tags de busca |
| estimated_minutes | int | Tempo estimado |
| created_at | timestamptz | Data de criação |

**content_blocks** — Blocos de conteúdo curado (unidades atômicas)
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid (PK) | Identificador |
| topic_id | uuid (FK → content_topics) | Tópico pai |
| school_id | uuid (FK → schools), nullable | NULL = conteúdo global da plataforma, preenchido = conteúdo privado da escola |
| block_type | enum | text, notation, chord_diagram, tablature, exercise, keyboard_diagram, scale_diagram, rhythm_pattern, tip, example |
| title | text | Título do bloco |
| content | jsonb | Conteúdo estruturado (varia por tipo) |
| render_data | jsonb | Dados de renderização (SVG inline, URL da imagem, código VexFlow) |
| sort_order | int | Ordem no documento |
| is_edited | boolean | Se foi editado manualmente pelo coordenador |
| original_content | jsonb | Conteúdo original antes da edição (para "reverter") |
| created_at | timestamptz | Data de criação |
| updated_at | timestamptz | Última edição |

**chord_library** — Biblioteca de acordes com diagramas
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid (PK) | Identificador |
| name | text | Nome do acorde (ex: "C", "Am7", "F#m") |
| instrument | enum | guitar, ukulele, bass |
| positions | jsonb | Array de posições (pode ter múltiplas shapes) |
| svg_config | jsonb | Configuração SVGuitar para renderização |
| fingers | jsonb | Dedilhado |
| barre | jsonb | Informação de pestana |
| difficulty | int | 1-5 |
| tags | text[] | Tags (open, barre, jazz, etc.) |

**scale_library** — Biblioteca de escalas
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid (PK) | Identificador |
| name | text | Nome (ex: "Dó Maior", "Lá menor natural") |
| notes | text[] | Notas da escala |
| intervals | text[] | Intervalos |
| vexflow_code | text | Código VexFlow para renderização na pauta |
| instrument_positions | jsonb | Posições por instrumento (braço violão, teclado) |

**repertoire** — Banco de repertório
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid (PK) | Identificador |
| school_id | uuid (FK → schools), nullable | NULL = catálogo global, preenchido = repertório privado da escola |
| title | text | Nome da música |
| artist | text | Artista |
| chords | text[] | Acordes utilizados |
| key | text | Tonalidade |
| genre | text | Gênero |
| difficulty | int | 1-5 |
| instruments | text[] | Instrumentos aplicáveis |
| chord_structure | jsonb | Estrutura (intro, verso, refrão, etc. com acordes) |
| cifra_source | text | Fonte (cifra_club, songsterr, manual, dominio_publico) |
| is_public_domain | boolean | Se é domínio público |
| youtube_url | text | Link de referência YouTube |
| curation_status | enum | draft, review, approved |
| backing_track_url | text | URL do backing track (se disponível) |
| lyrics | text | Letra da música |
| cifra_content | text | Cifra completa com acordes alinhados sobre a letra |
| source_url | text | URL original da fonte (Songsterr, Cifra Club, etc.) |
| bpm | int | Batidas por minuto |
| capo | int | Capotraste (0 = sem capo) |
| time_signature | text | Fórmula de compasso (ex: "4/4", "3/4") |
| songsterr_id | int (unique) | ID da música no Songsterr |
| sections | jsonb | Seções da música (intro, verso, refrão, etc.) |
| gp_file_url | text | URL do arquivo Guitar Pro no Storage (bucket gp-files) |
| embedding | vector | Embedding semântico para busca por similaridade (pgvector) |

**backing_tracks** — Stems de áudio separados por instrumento
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid (PK) | Identificador |
| repertoire_id | uuid (FK → repertoire) | Música de referência |
| stem_type | text | Tipo: vocals, drums, bass, guitar, piano, other, full, backing_vocals |
| storage_path | text | Caminho no bucket audio-tracks do Supabase Storage |
| duration_seconds | int | Duração em segundos |
| source | text | Origem: music_ai, manual, youtube |
| metadata | jsonb | Metadados adicionais |
| created_at | timestamptz | Data de criação |

### 8.4 Materiais Gerados

**generated_materials** — Materiais didáticos gerados
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid (PK) | Identificador |
| school_id | uuid (FK → schools) | Escola |
| journey_id | uuid (FK → journeys) | Jornada de origem |
| stage_id | uuid (FK → journey_stages) | Stage |
| station_id | uuid (FK → journey_stations) | Estação (opcional, se gerado por estação) |
| title | text | Título do material |
| type | enum | full_module, single_lesson, repertoire_sheet, exercise_sheet, theory_supplement |
| format | enum | pdf, html |
| file_url | text | URL no Storage |
| html_content | text | Conteúdo HTML intermediário |
| generation_config | jsonb | Configurações usadas na geração |
| page_count | int | Número de páginas |
| status | enum | generating, ready, error |
| version | int | Versão do material (cada edição incrementa) |
| is_draft | boolean | Se ainda está em edição |
| published_at | timestamptz | Quando foi publicado/finalizado |
| edited_by | uuid (FK → users) | Quem editou por último |
| generated_at | timestamptz | Data de geração |
| downloaded_count | int | Vezes baixado |

**material_blocks** — Blocos editáveis do material gerado (Editor block-based)
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid (PK) | Identificador |
| material_id | uuid (FK → generated_materials) | Material pai |
| block_type | enum | title, text, image, chord_diagram, notation, tablature, exercise, tip, qr_code, separator, badge |
| title | text | Título do bloco (opcional) |
| content | jsonb | Conteúdo editável (texto, config do diagrama, prompt de imagem, etc.) |
| render_data | jsonb | Dados de renderização (SVG inline, URL da imagem, código VexFlow) |
| sort_order | int | Ordem no documento |
| is_edited | boolean | Se foi editado manualmente pelo coordenador |
| original_content | jsonb | Conteúdo original antes da edição (para "reverter") |
| created_at | timestamptz | Data de criação |
| updated_at | timestamptz | Última edição |

### 8.5 Monitoramento e Gamificação

**student_progress** — Progresso do aluno na jornada
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid (PK) | Identificador |
| student_id | uuid (FK → students) | Aluno |
| journey_id | uuid (FK → journeys) | Jornada |
| stage_id | uuid (FK → journey_stages) | Stage atual |
| station_id | uuid (FK → journey_stations) | Estação atual |
| current_lesson | int | Aula atual |
| status | enum | on_track, behind, ahead, stalled |
| started_at | timestamptz | Início da jornada |
| updated_at | timestamptz | Última atualização |

**lesson_logs** — Registro de cada aula
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid (PK) | Identificador |
| student_id | uuid (FK → students) | Aluno |
| class_id | uuid (FK → classes) | Turma |
| teacher_id | uuid (FK → users) | Professor |
| journey_station_id | uuid (FK → journey_stations) | Estação |
| lesson_number | int | Número da aula |
| date | date | Data da aula |
| status | enum | present, absent, rescheduled |
| progress_notes | text | Observações do professor |
| topics_covered | uuid[] | Tópicos abordados |
| rating | int | Avaliação (1-5) |

**achievements** — Conquistas / badges
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid (PK) | Identificador |
| name | text | Nome da conquista |
| description | text | Descrição |
| icon | text | Ícone (Phosphor Icon name) |
| type | enum | milestone, challenge, streak, special |
| criteria | jsonb | Critérios para desbloquear |
| points | int | Pontos da conquista |

**student_achievements** — Conquistas desbloqueadas
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid (PK) | Identificador |
| student_id | uuid (FK → students) | Aluno |
| achievement_id | uuid (FK → achievements) | Conquista |
| unlocked_at | timestamptz | Data do desbloqueio |
| notified | boolean | Se já foi notificado |

### 8.6 WhatsApp

**whatsapp_messages** — Log de mensagens
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid (PK) | Identificador |
| school_id | uuid (FK → schools) | Escola |
| phone | text | Número do destinatário |
| direction | enum | inbound, outbound |
| message_type | enum | alert, material, progress_report, reminder, manual |
| content | jsonb | Conteúdo da mensagem |
| related_student_id | uuid (FK → students) | Aluno relacionado |
| status | enum | queued, sent, delivered, read, failed |
| sent_at | timestamptz | Data de envio |

**whatsapp_templates** — Templates de mensagem configuráveis por escola
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid (PK) | Identificador |
| school_id | uuid (FK → schools) | Escola |
| name | text | Nome do template (ex: "Falta consecutiva") |
| trigger_type | enum | manual, absence, checkpoint, scheduled, enrollment |
| message_body | text | Corpo da mensagem com variáveis ({aluno}, {material}, {responsavel}, etc.) |
| is_active | boolean | Se está ativo |
| created_at | timestamptz | Data de criação |
| updated_at | timestamptz | Última atualização |

---

## 9. Fluxos de Usuário Principais

### 9.1 Fluxo: Coordenador Configura Jornada
1. Acessa "Construtor de Jornada"
2. Seleciona instrumento (ex: Violão)
3. Define público-alvo (ex: Adulto)
4. Sistema sugere estrutura padrão (4 Stages × 40 aulas)
5. Para cada Stage, o coordenador entra nas estações
6. Em cada estação, vê as 4 dimensões (Teoria, Técnica, Ritmo, Repertório)
7. Em cada dimensão, vê lista de tópicos disponíveis com checkbox
8. Marca os tópicos desejados, reordena via drag-and-drop
9. Define quais estações são Core e qual é Checkpoint
10. Salva a jornada (pode salvar como template)

### 9.2 Fluxo: Gerar Material Didático
1. Acessa "Gerador de Material"
2. Seleciona a jornada configurada
3. Escolhe o escopo: módulo completo ou aula individual
4. Seleciona o Stage e estação desejada
5. Pré-visualiza o sumário do material (tópicos que serão incluídos)
6. Confirma configurações de identidade visual (logo, cores)
7. Clica em "Gerar Material"
8. Sistema processa (barra de progresso)
9. Material fica disponível para pré-visualização em HTML
10. Coordenador abre o Editor de Material (ver fluxo 9.5)
11. Edita blocos, reordena, troca imagens/acordes conforme necessário
12. Exporta em PDF
13. Material disponível para envio ao aluno ou impressão

### 9.3 Fluxo: Professor Registra Progresso
1. Professor acessa o app (PWA) pelo celular
2. Seleciona turma do dia
3. Vê lista de alunos com status na jornada
4. Marca presença/ausência
5. Para cada aluno presente, marca tópicos abordados
6. Adiciona observação (opcional)
7. Sistema atualiza progresso do aluno automaticamente
8. Se aluno faltou: agente gera material complementar e sugere envio via WhatsApp

### 9.4 Fluxo: Aluno Ausente Recebe Material
1. Professor registra ausência do aluno
2. Sistema detecta: "Aluno faltou 2 aulas seguidas"
3. Agente Monitor gera alerta para o professor
4. Agente Compositor gera material complementar (ficha com exercícios + cifra de repertório)
5. Material é enviado ao professor via WhatsApp com mensagem sugerida
6. Professor revisa e encaminha ao aluno/responsável
7. Mensagem: "Oi [aluno]! Preparei um material pra você não ficar pra trás. Dá uma estudada e chega afiado na próxima! 🎸"

### 9.5 Fluxo: Editar Material no Editor de Blocos
1. Coordenador gera material (via fluxo 9.2) ou seleciona material existente
2. Clica em "Editar" → abre o Editor de Material (layout 3 painéis)
3. Vê lista de blocos na sidebar esquerda, canvas central com preview, propriedades à direita
4. Clica num bloco de texto → edita inline no canvas (contenteditable)
5. Clica numa imagem → abre modal "Trocar Imagem" (upload, gerar com Gemini, ou biblioteca)
6. Clica num diagrama de acorde → abre modal "Trocar Acorde" (seleciona da chord_library)
7. Arrasta blocos na sidebar para reordenar
8. Adiciona/remove blocos conforme necessário
9. Salva rascunho (versão incrementada)
10. Publica → material fica disponível para download/envio
11. Exporta PDF final

---

## 10. Modelo de Negócio

### 10.1 Planos

| Plano | Preço | Inclui |
|-------|-------|--------|
| **Básico** | R$ 97/mês | Construtor de jornada (até 3 instrumentos), gerador de material (até 5 materiais/mês), personalização com marca, monitoramento básico |
| **Premium** | R$ 147/mês | Todos os instrumentos, geração ilimitada, gamificação completa, WhatsApp integrado, repertório com backing tracks, relatórios avançados, curadoria colaborativa |

### 10.2 Receita Projetada

Cenário conservador: 300 escolas × R$ 97 = R$ 29.100/mês  
Cenário otimista: 300 escolas × R$ 147 = R$ 44.100/mês  
Meta 12 meses: 500 escolas (mix de planos) = ~R$ 60.000/mês

### 10.3 Estratégia de Go-to-Market

1. **Fase 1 — Validação interna** (mês 1-2): LA Music + mentorados próximos testam a plataforma
2. **Fase 2 — Beta fechado** (mês 3-4): 20-30 escolas selecionadas da base Emusys
3. **Fase 3 — Lançamento** (mês 5+): Indicação via Emusys + tráfego pago + LA Educa como canal de aquisição

### 10.4 Vantagem Tributária como Argumento de Venda

O material didático gerado pela plataforma tem imunidade tributária (Art. 150, VI, "d" da CF + Súmula Vinculante 57 do STF). A escola emite nota fiscal de material separada da nota de serviço educacional. A economia tributária para a escola pode ser de até 26,5% sobre a parcela do material — o que, em muitos casos, paga sozinha a assinatura da plataforma.

---

## 11. Design System

### 11.1 Identidade Visual

- **Nome:** LA Journey
- **Tema:** Dark mode (primário) + Light mode
- **Metáfora visual:** Jornada, mapa, âncora, montanha
- **Tipografia:** Playfair Display (serif, títulos e destaques) + DM Sans (UI geral, corpo) + DM Mono (código, tablatura, exercícios)
- **Ícones:** Phosphor Icons (`@phosphor-icons/react`) — SOMENTE esta lib, nunca Lucide/Heroicons
- **Emojis:** Uso estratégico e moderado em pontos de destaque

### 11.2 Paleta de Cores

| Uso | Cor | Hex |
|-----|-----|-----|
| Primária | Azul LA Music | #1E3A5F |
| Secundária | Rosa/Magenta (accent) | #FF2D78 |
| Sucesso / Grow | Verde | #22C55E |
| Alerta | Âmbar | #F59E0B |
| Erro | Vermelho | #EF4444 |
| Foundation | Azul/Roxo | #6366F1 |
| Grow | Laranja | #F97316 |
| Advance | Verde | #22C55E |
| Master | Rosa | #EC4899 |
| Background Dark | Azul escuro | #0F172A |
| Background Light | Branco off | #F8FAFC |
| Texto Dark | Branco | #F1F5F9 |
| Texto Light | Cinza escuro | #1E293B |

### 11.3 Componentes Base (shadcn/ui)

- Cards com glassmorphism sutil no dark mode
- Tabelas com row highlights
- Drag-and-drop para reordenação de tópicos (dnd-kit)
- Stepper/wizard para fluxos multi-step
- Toast notifications para ações de geração
- Sheet/drawer para painéis laterais no mobile
- Skeleton loading durante geração de material

### 11.4 Ícones das Páginas (Phosphor Icons)

| Página | Ícone | Classe |
|--------|-------|--------|
| Dashboard | Quadrados | `ph-squares-four` |
| Jornadas | Mapa | `ph-map-trifold` |
| Gerador | Documento | `ph-file-text` |
| Editor Material | Lápis | `ph-note-pencil` |
| Base Curada | Livros | `ph-books` |
| Biblioteca Musical | Notas | `ph-music-notes-simple` |
| Alunos | Pessoas | `ph-users-three` |
| Repertório | Nota | `ph-music-note` |
| Turmas | Professor | `ph-chalkboard-teacher` |
| Visão Professor | Chapéu | `ph-graduation-cap` |
| Gamificação | Troféu | `ph-trophy` |
| WhatsApp | Logo | `ph-whatsapp-logo` |
| Relatórios | Gráfico | `ph-chart-bar` |
| Integrações | Plugs | `ph-plugs-connected` |
| Configurações | Engrenagem | `ph-gear-six` |

---

## 12. Roadmap de Desenvolvimento

### Fase 1 — Fundação (Semanas 1-3) ✅ CONCLUÍDA
- [x] Setup do projeto (Supabase, repo, CI/CD)
- [x] Schema do banco de dados (23 tabelas, 24 enums, RLS multi-tenant, 21 migrations)
- [x] Seed de dados (LA Music School, 6 usuários, 8 alunos, jornada completa)
- [x] Prototipagem da UI (HTML 1.077 linhas, 15 páginas funcionais)
- [x] Conversão para React + TypeScript (Windsurf Cascade)
- [x] Fix de recursão infinita e performance em RLS policies
- [x] pgvector + infraestrutura RAG habilitada
- [ ] Auth e multi-tenancy (Supabase Auth com JWT customizado)
- [ ] Conectar frontend ao Supabase com Auth real (JWT customizado, multi-tenancy)

### Fase 2 — Motor de Conteúdo (Semanas 4-6) ✅ CONCLUÍDA
- [x] Biblioteca de acordes (chord_library) com SVGuitar — 8965 acordes (violão, guitarra, piano, ukulele, baixo, cavaquinho)
- [x] Biblioteca de escalas com VexFlow — renderização real + posições
- [x] Biblioteca de notação musical (notation_library) com editor completo
- [x] Biblioteca de tablatura (tablature_library) com editor SVG + AlphaTab preview
- [x] Componentes de renderização musical (SVGuitar, VexFlow, VexTab, AlphaTab, componente teclado SVG)
- [x] Seed de conteúdo: Violão Foundation (Fundamentos 1 e 2) com content_blocks
- [x] Editor de Material block-based funcional (18+ tipos de bloco, drag-and-drop, contenteditable)
- [x] Novos tipos de bloco: chord_grid, keyboard, keyboard_grid, page_break, rhythm, cover, audio, video, columns
- [x] Bloco capa (cover): geração de imagem IA (Gemini), prompt personalizável, edição inline de título, drag-and-drop de elementos, templates visuais
- [x] Blocos de mídia: imagem (upload 5MB), áudio (player HTML5), vídeo (embed YouTube/Vimeo)
- [x] Editor de Notação Musical (NotationEditor): 4 claves, 5 durações, 5 modos input, alterações, armaduras, pausas, ponto de aumento, percussão, barras manuais, cifras e annotations como overlay HTML, multi-line, serialização Supabase
- [x] Editor de Tablatura (TablatureEditor + TabSvgEditor): 5 instrumentos, SVG multi-linha, 5 durações, 16 fórmulas de compasso, barras automáticas, efeitos (ponto, ligadura, palhetada ↓/↑, quiáltera), toolbar reorganizada, atalhos de teclado, AlphaTab preview
- [x] Popover de acorde integrado com Supabase: busca assíncrona na chord_library com debounce, navegação entre posições, normalização automática de input (g→G)
- [x] Diagramador de acorde (ChordEditor) no editor de tablatura: editar/criar acorde visual, salvar no banco em tempo real
- [x] AlphaTab Viewer condicional: modo livre (clean) vs modo com compasso (fórmula + barras + stems)
- [x] Biblioteca Musical expandida: 5 tabs (Acordes/Escalas/Notação/Tablatura/Imagens IA)
- [x] 17 componentes musicais, 20 services no frontend, 16 páginas + Login
- [ ] Base de conteúdo curado: interface de cadastro para professores N4
- [ ] Conectar frontend ao Supabase com Auth real (JWT customizado, multi-tenancy)

### Fase 3 — Construtor de Jornada (Semanas 7-8)
- [ ] Interface de configuração de jornada (CRUD funcional)
- [ ] Seleção e ordenação de tópicos (drag-and-drop com dnd-kit)
- [ ] Configuração de Stages, estações, Core e Checkpoints
- [ ] Templates pré-configurados (Violão Adulto, Kids, etc.)

### Fase 4 — Gerador + Editor de Material (Semanas 9-12)
- [ ] Pipeline de geração (agentes IA + renderização + blocos)
- [ ] Personalização com identidade visual da escola
- [ ] Geração de apostila completa por módulo → array de material_blocks
- [ ] Trocar imagem (Gemini), trocar acorde (chord_library), reordenar blocos
- [ ] Versionamento de material (rascunho → publicado)
- [ ] Exportação PDF via Puppeteer / React-PDF

> **Atualização (Editor de Material):** O subprojeto de evolução do editor foi concluído em 7 fases incrementais (seção 6.2.2), incluindo rich text, layout A4, blocos avançados, mídia, IA, UX operacional, templates e histórico de versões.

### Fase 5 — Repertório e Conteúdo Musical (Semanas 13-15) ✅ CONCLUÍDA
- [x] Importação Songsterr: busca, metadados, cifra/acordes/tom/BPM/vídeos (3 Edge Functions)
- [x] Importação Cifra Club: busca artista/música, scraping de cifra com acordes e letra (2 Edge Functions)
- [x] Editor de cifra do zero (CifraEditor): 3 modos, toolbar completa, parser de cifra colada
- [x] Transposição de tonalidade em tempo real (+/- semitons, diagramas auto-atualizam)
- [x] Mini-diagramas de acordes: violão (SVGuitar) + teclado (SVG) em tempo real
- [x] RepertoireSheet: visualização completa com cifra, acordes, YouTube, metadados
- [x] Tabela backing_tracks + bucket audio-tracks criados
- [x] AlphaTab: player de tablatura interativo com MIDI, cursor animado, scroll automático
- [x] SoundFont GeneralUser GS (30MB, 270 instrumentos) integrado
- [x] Pipeline Songsterr→GP: Edge Function baixa JSON do CDN, conversor frontend gera Score in-memory
- [x] Mixer de volumes por track: volume individual, solo, mute (até 11 tracks testado)
- [x] Upload de arquivos GP: bucket gp-files no Storage, service + UI no RepertoireSheet
- [x] Modal "Importar GP" dedicado: drag & drop → parse AlphaTab → auto-preencher metadados → salvar
- [ ] Parser ChordPro completo e integração no editor
- [ ] Modal unificado de importação (Cifra Club + Songsterr + GP num só lugar)
- [ ] Enriquecer biblioteca de acordes (bases open source)

### Fase 6 — Monitoramento + Gamificação (Semanas 16-18)
- [ ] Dashboard do professor (Visão Professor — chamada diária)
- [ ] Registro de presença e progresso por aula (lesson_logs)
- [ ] Sistema de achievements/badges com desbloqueio automático
- [ ] Barra de progresso visual do aluno na jornada
- [ ] Alertas automáticos (faltas, estagnação, aluno adiantado)

### Fase 7 — WhatsApp + Automações (Semanas 19-21)
- [ ] Integração UAZAPI (WhatsApp Business)
- [ ] Templates de mensagem configuráveis por escola (whatsapp_templates)
- [ ] Notificações automáticas (faltas, materiais, progresso)
- [ ] Backing tracks (integração Music AI / Suno / Moises)

### Fase 8 — Polish + Lançamento Beta (Semanas 22-24)
- [ ] Curadoria de conteúdo para todos os instrumentos do MVP
- [ ] Testes internos com professores LA Music (N4)
- [ ] Ajustes de UX baseados em feedback
- [ ] Onboarding guiado para novas escolas
- [ ] Lançamento beta fechado (20-30 escolas Emusys)

---

## 13. Métricas de Sucesso

| Métrica | Meta (6 meses) |
|---------|----------------|
| Escolas ativas | 50+ |
| Materiais gerados por mês | 500+ |
| Retenção mensal de escolas | >90% |
| NPS dos coordenadores | >70 |
| Tempo médio de geração de apostila | <3 min |
| Alunos com jornada ativa | 2.000+ |

---

## 14. Riscos e Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| IA gera conteúdo musical incorreto | Alto | Base curada + curadoria obrigatória por N4 + exercícios baseados em templates validados |
| Dependência de fontes externas (Songsterr/Cifra Club) | Médio | Modelo "Adquirir e Reter" (importa 1x, salva no banco), múltiplas fontes redundantes, base própria como fallback |
| Direitos autorais de repertório | Alto | Cifras sem letra, músicas de domínio público para material vendável, links externos para referência |
| Custo de IA elevado com escala | Médio | Modelos open source para tarefas simples, caching agressivo, geração por lote |
| Resistência dos professores | Médio | LA Educa como canal de treinamento, onboarding guiado, professores N4 como champions |

---

## 15. Equipe

| Pessoa | Papel no Projeto |
|--------|-----------------|
| **Luciano Alf** | Idealizador, arquiteto de produto, desenvolvedor principal, conteúdo pedagógico (8-10h/dia) |
| **Hugo** | Coordenador de tecnologia — mantém projetos existentes (MusicFinance, SonoraMente, etc.) |
| **Professores N4 (Renan, Kinho, Peterson, Jeyson, Juliana)** | Curadoria de conteúdo, validação pedagógica, testes |
| **Claude (Anthropic)** | Arquitetura, PRD, backend (Supabase/banco/RLS/seeds/Edge Functions), prototipagem HTML |
| **Windsurf Cascade** | Frontend React+TypeScript, componentes UI, services/hooks, integração Supabase, routing |
| **Google AI Studio (Gemini)** | Conversão HTML→React, geração de imagens didáticas |

---

## 16. Ambientes de Desenvolvimento

| Ambiente | Ferramenta | Função |
|----------|-----------|--------|
| Backend | Claude (claude.ai) + MCP Supabase | Schema, migrations, RLS, seeds, Edge Functions |
| Frontend | Windsurf Cascade + MCP Supabase | React+TS, componentes, services, hooks, routing |
| Protótipo UI | Claude (claude.ai) | HTML single-file (1.077 linhas, 15 páginas) |
| Conversão | Google AI Studio | HTML → React components |
| Banco de dados | Supabase Dashboard | Visualização, SQL editor, logs |
| Repositório | Git (a definir) | Versionamento do código |

---

*LA Journey — Transformando o aprendizado musical em jornada.*  
*Aprender → Ancorar → Evoluir → Celebrar*