export const EXERCISE_CONTENT_TYPES = [
  { value: 'exercise', label: 'Exercício' },
  { value: 'example', label: 'Exemplo' },
] as const

export const EXERCISE_CATEGORIES = [
  { value: 'technique', label: 'Técnica' },
  { value: 'harmony', label: 'Harmonia' },
  { value: 'reading', label: 'Leitura' },
  { value: 'rhythm', label: 'Ritmo' },
  { value: 'scales', label: 'Escalas' },
  { value: 'intervals', label: 'Intervalos' },
  { value: 'piece', label: 'Peça' },
  { value: 'progression', label: 'Progressão' },
  { value: 'other', label: 'Outro' },
] as const

export const EXERCISE_INSTRUMENTS = [
  { value: 'universal', label: 'Universal' },
  { value: 'Violão', label: 'Violão' },
  { value: 'Guitarra', label: 'Guitarra' },
  { value: 'Piano', label: 'Piano' },
  { value: 'Canto', label: 'Canto' },
  { value: 'Bateria', label: 'Bateria' },
  { value: 'Baixo', label: 'Baixo' },
] as const

export const EXERCISE_LEVELS = [
  { value: 'foundation', label: 'Foundation' },
  { value: 'grow', label: 'Grow' },
  { value: 'advance', label: 'Advance' },
  { value: 'master', label: 'Master' },
] as const

export const REUSABLE_BLOCK_TYPES = [
  'text',
  'tip',
  'exercise',
  'notation',
  'chord_diagram',
  'chord_grid',
  'tablature',
  'keyboard',
  'keyboard_grid',
  'image',
  'rhythm',
] as const

export type ExerciseContentTypeValue = typeof EXERCISE_CONTENT_TYPES[number]['value']
export type ExerciseCategoryValue = typeof EXERCISE_CATEGORIES[number]['value']
export type ExerciseInstrumentValue = typeof EXERCISE_INSTRUMENTS[number]['value']
export type ExerciseLevelValue = typeof EXERCISE_LEVELS[number]['value']
export type ReusableBlockTypeValue = typeof REUSABLE_BLOCK_TYPES[number]

const BLOCK_TYPE_LABELS: Record<string, string> = {
  text: 'Texto',
  tip: 'Dica',
  exercise: 'Exercício',
  notation: 'Notação',
  chord_diagram: 'Acorde',
  chord_grid: 'Grade de Acordes',
  tablature: 'Tablatura',
  keyboard: 'Teclado',
  keyboard_grid: 'Grade de Teclados',
  image: 'Imagem',
  rhythm: 'Ritmo',
  audio: 'Áudio',
  video: 'Vídeo',
  title: 'Título',
}

export function getExerciseOptionLabel(
  options: readonly { value: string; label: string }[],
  value: string | null | undefined,
) {
  return options.find((option) => option.value === value)?.label ?? value ?? ''
}

export function getReusableBlockTypeLabel(blockType: string) {
  return BLOCK_TYPE_LABELS[blockType] ?? blockType
}

export function isReusableBlockType(blockType: string): blockType is ReusableBlockTypeValue {
  return REUSABLE_BLOCK_TYPES.includes(blockType as ReusableBlockTypeValue)
}
