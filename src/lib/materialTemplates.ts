import type { ComponentType } from 'react'

export interface TemplateBlock {
  block_type: string
  title: string
  content?: string // HTML
  render_data?: Record<string, unknown>
}

export interface MaterialTemplate {
  id: string
  name: string
  description: string
  instrument: string
  level: string
  iconName: 'Guitar' | 'PianoKeys' | 'MicrophoneStage' | 'Metronome' | 'BookOpen' | 'Sparkle'
  blocks: TemplateBlock[]
}

export const MATERIAL_TEMPLATES: MaterialTemplate[] = [
  {
    id: 'guitar-foundation',
    name: 'Apostila de Violão — Foundation',
    description: 'Estrutura completa para iniciantes no violão: postura, acordes básicos, dedilhado e primeira música.',
    instrument: 'Violão',
    level: 'Foundation',
    iconName: 'Guitar',
    blocks: [
      { block_type: 'cover', title: 'Capa', render_data: { template: 'modern' } },
      { block_type: 'title', title: 'Introdução' },
      { block_type: 'text', title: 'Bem-vindo', content: '<p>Bem-vindo à sua jornada musical! Neste material você vai aprender os fundamentos do violão.</p>' },
      { block_type: 'tip', title: 'Dica Importante', content: '<p>Antes de começar, certifique-se de que seu violão está afinado. Use um afinador digital ou o aplicativo da escola.</p>' },
      { block_type: 'title', title: 'Postura e Posicionamento' },
      { block_type: 'text', title: 'Como segurar o violão', content: '<p>A postura correta é fundamental para evitar dores e tocar com facilidade.</p>' },
      { block_type: 'image', title: 'Posição correta', render_data: { caption: 'Posição correta do violão' } },
      { block_type: 'title', title: 'Primeiros Acordes' },
      { block_type: 'text', title: 'Acordes abertos', content: '<p>Vamos aprender os primeiros acordes: Dó Maior (C), Sol Maior (G) e Ré Maior (D).</p>' },
      { block_type: 'chord_grid', title: 'Acordes básicos', render_data: { columns: 3 } },
      { block_type: 'title', title: 'Dedilhado Básico' },
      { block_type: 'text', title: 'Padrão PIMA', content: '<p>O dedilhado PIMA utiliza o polegar (P), indicador (I), médio (M) e anelar (A).</p>' },
      { block_type: 'exercise', title: 'Exercício 1', content: '<p>Pratique o dedilhado PIMA no acorde de Dó Maior durante 5 minutos.</p>' },
      { block_type: 'separator', title: '' },
      { block_type: 'title', title: 'Primeira Música' },
      { block_type: 'text', title: 'Parabéns pra Você', content: '<p>Agora vamos aplicar os acordes aprendidos na sua primeira música!</p>' },
    ],
  },
  {
    id: 'piano-foundation',
    name: 'Apostila de Piano — Foundation',
    description: 'Introdução ao piano: teclado, mão direita, mão esquerda, primeiras escalas e melodias simples.',
    instrument: 'Piano',
    level: 'Foundation',
    iconName: 'PianoKeys',
    blocks: [
      { block_type: 'cover', title: 'Capa', render_data: { template: 'elegant' } },
      { block_type: 'title', title: 'O Teclado' },
      { block_type: 'text', title: 'Conhecendo as teclas', content: '<p>O piano tem 88 teclas. Vamos aprender a identificar as notas naturais e os acidentes.</p>' },
      { block_type: 'keyboard', title: 'Teclado — Notas naturais', render_data: {} },
      { block_type: 'tip', title: 'Dica', content: '<p>Use os grupos de 2 e 3 teclas pretas como referência para encontrar as notas.</p>' },
      { block_type: 'title', title: 'Posição das Mãos' },
      { block_type: 'text', title: 'Mão direita — Posição C', content: '<p>Coloque o polegar direito na nota Dó central (C4). Cada dedo cobre uma tecla branca.</p>' },
      { block_type: 'image', title: 'Posição mão direita', render_data: { caption: 'Posição C — mão direita' } },
      { block_type: 'title', title: 'Escala de Dó Maior' },
      { block_type: 'notation', title: 'Escala de Dó Maior', render_data: {} },
      { block_type: 'exercise', title: 'Exercício 1', content: '<p>Toque a escala de Dó Maior com a mão direita, subindo e descendo. Repita 5 vezes.</p>' },
      { block_type: 'separator', title: '' },
      { block_type: 'title', title: 'Primeira Melodia' },
      { block_type: 'text', title: 'Ode à Alegria', content: '<p>Vamos tocar a melodia da Ode à Alegria de Beethoven usando apenas a mão direita.</p>' },
    ],
  },
  {
    id: 'vocal-foundation',
    name: 'Apostila de Canto — Foundation',
    description: 'Fundamentos do canto: respiração, aquecimento vocal, extensão e primeiros exercícios.',
    instrument: 'Canto',
    level: 'Foundation',
    iconName: 'MicrophoneStage',
    blocks: [
      { block_type: 'cover', title: 'Capa', render_data: { template: 'colorful' } },
      { block_type: 'title', title: 'Respiração' },
      { block_type: 'text', title: 'Respiração diafragmática', content: '<p>A base do canto é a respiração correta. Vamos aprender a respirar usando o diafragma.</p>' },
      { block_type: 'image', title: 'Aparelho fonador', render_data: { caption: 'Aparelho fonador humano' } },
      { block_type: 'exercise', title: 'Exercício de respiração', content: '<p>Inspire contando até 4, segure por 4 tempos, expire em 8 tempos. Repita 10 vezes.</p>' },
      { block_type: 'title', title: 'Aquecimento Vocal' },
      { block_type: 'text', title: 'Importância do aquecimento', content: '<p>Nunca cante sem aquecer a voz! O aquecimento previne lesões e melhora a qualidade.</p>' },
      { block_type: 'tip', title: 'Dica', content: '<p>Beba água em temperatura ambiente antes e durante os exercícios vocais.</p>' },
      { block_type: 'notation', title: 'Vocalise 1 — Escala', render_data: {} },
      { block_type: 'exercise', title: 'Exercício vocal', content: '<p>Cante a escala ascendente e descendente usando a sílaba "MA". Suba meio tom a cada repetição.</p>' },
      { block_type: 'title', title: 'Extensão Vocal' },
      { block_type: 'text', title: 'Descubra sua voz', content: '<p>Cada pessoa tem uma extensão vocal diferente. Vamos descobrir a sua!</p>' },
    ],
  },
  {
    id: 'drums-foundation',
    name: 'Apostila de Bateria — Foundation',
    description: 'Introdução à bateria: kit, baquetas, rudimentos básicos, primeiro groove.',
    instrument: 'Bateria',
    level: 'Foundation',
    iconName: 'Metronome',
    blocks: [
      { block_type: 'cover', title: 'Capa', render_data: { template: 'bold' } },
      { block_type: 'title', title: 'O Kit de Bateria' },
      { block_type: 'text', title: 'Conhecendo as peças', content: '<p>Vamos conhecer cada peça do kit: bumbo, caixa, tons, chimbal, pratos de condução e ataque.</p>' },
      { block_type: 'image', title: 'Kit de bateria', render_data: { caption: 'Peças do kit de bateria' } },
      { block_type: 'title', title: 'Postura e Baquetas' },
      { block_type: 'text', title: 'Como segurar', content: '<p>Existem duas pegadas principais: Traditional Grip e Matched Grip. Vamos usar Matched Grip.</p>' },
      { block_type: 'tip', title: 'Dica', content: '<p>Segure a baqueta de forma relaxada. Tensão excessiva causa fadiga e lesões.</p>' },
      { block_type: 'title', title: 'Rudimentos Básicos' },
      { block_type: 'text', title: 'Single Stroke Roll', content: '<p>O rudimento mais fundamental: D E D E D E D E (direita, esquerda, alternando).</p>' },
      { block_type: 'notation', title: 'Single Stroke Roll', render_data: {} },
      { block_type: 'exercise', title: 'Exercício com metrônomo', content: '<p>Toque o Single Stroke Roll a 60 BPM durante 2 minutos sem parar.</p>' },
      { block_type: 'title', title: 'Primeiro Groove' },
      { block_type: 'text', title: 'Groove básico Rock', content: '<p>O groove mais tocado no mundo: bumbo nos tempos 1 e 3, caixa nos tempos 2 e 4, chimbal em colcheias.</p>' },
      { block_type: 'notation', title: 'Groove Rock Básico', render_data: {} },
    ],
  },
  {
    id: 'theory-complementar',
    name: 'Teoria Complementar I',
    description: 'Material de teoria musical: notas, figuras rítmicas, escalas, intervalos e formação de acordes.',
    instrument: 'Teoria',
    level: 'Foundation',
    iconName: 'BookOpen',
    blocks: [
      { block_type: 'cover', title: 'Capa', render_data: { template: 'classic' } },
      { block_type: 'title', title: 'Notas Musicais' },
      { block_type: 'text', title: 'As 7 notas', content: '<p>A música ocidental utiliza 7 notas naturais: Dó, Ré, Mi, Fá, Sol, Lá e Si.</p>' },
      { block_type: 'notation', title: 'Notas na pauta', render_data: {} },
      { block_type: 'title', title: 'Figuras Rítmicas' },
      { block_type: 'text', title: 'Duração das notas', content: '<p>Cada figura musical tem uma duração diferente em relação ao tempo do compasso.</p>' },
      { block_type: 'notation', title: 'Figuras rítmicas', render_data: {} },
      { block_type: 'exercise', title: 'Exercício de leitura', content: '<p>Leia e bata palmas no ritmo das figuras abaixo.</p>' },
      { block_type: 'title', title: 'Escalas' },
      { block_type: 'text', title: 'Escala Maior', content: '<p>A escala maior segue o padrão de tons e semitons: T T ST T T T ST.</p>' },
      { block_type: 'notation', title: 'Escala de Dó Maior', render_data: {} },
      { block_type: 'title', title: 'Intervalos' },
      { block_type: 'text', title: 'O que são intervalos', content: '<p>Intervalo é a distância entre duas notas. Medimos em tons e semitons.</p>' },
      { block_type: 'title', title: 'Formação de Acordes' },
      { block_type: 'text', title: 'Tríades', content: '<p>Acordes são formados empilhando intervalos de terça. Uma tríade tem 3 notas: fundamental, terça e quinta.</p>' },
    ],
  },
  {
    id: 'empty-material',
    name: 'Material em Branco',
    description: 'Começa com apenas a capa. Adicione blocos livremente.',
    instrument: 'Qualquer',
    level: 'Qualquer',
    iconName: 'Sparkle',
    blocks: [
      { block_type: 'cover', title: 'Capa', render_data: { template: 'minimal' } },
    ],
  },
]
