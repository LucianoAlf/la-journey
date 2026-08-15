import { adaptExerciseLibraryItem, type PreparedMaterialBlock } from './contentBrowserAdapters'
import { EXERCISE_CATEGORIES, getExerciseOptionLabel } from './exerciseLibraryOptions'
import {
  buildCoverRenderData,
  notebookLevelLabel,
  type CoverTemplate,
} from './notebookMaterialAssembler'

export interface ExerciseNotebookItemInput {
  title?: string | null
  category?: string | null
  difficulty_level?: string | null
  estimated_minutes?: number | null
  blocks?: Array<{
    block_type?: unknown
    title?: string | null
    content?: unknown
    render_data?: unknown
  }> | null
}

export interface BuildExerciseNotebookBlocksInput {
  title: string
  exercises: Array<ExerciseNotebookItemInput | null | undefined>
  coverTemplate?: CoverTemplate
  coverImageUrl?: string | null
  instrument?: string | null
  level?: string | null
  schoolName?: string | null
  professorName?: string | null
  logoUrl?: string | null
}

export interface BuildExerciseNotebookBlocksResult {
  blocks: PreparedMaterialBlock[]
  skippedMissingExercises: number
  includedExercises: number
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function isPresentExercise(
  exercise: ExerciseNotebookItemInput | null | undefined,
): exercise is ExerciseNotebookItemInput {
  if (!exercise) return false
  return Boolean(
    exercise.title?.trim()
    || (exercise.blocks?.length ?? 0) > 0,
  )
}

export function buildExerciseHeaderBlock(exercise: ExerciseNotebookItemInput): PreparedMaterialBlock {
  const title = exercise.title?.trim() || 'Exercício'
  const category = getExerciseOptionLabel(EXERCISE_CATEGORIES, exercise.category)
  const level = notebookLevelLabel(exercise.difficulty_level)
  const minutes = typeof exercise.estimated_minutes === 'number' && exercise.estimated_minutes > 0
    ? `${exercise.estimated_minutes} min`
    : ''
  const meta = [category, level, minutes].filter(Boolean).join(' · ')

  return {
    blockType: 'text',
    title,
    content: {
      html: `<p>${escapeHtml(meta || title)}</p>`,
      text: meta || title,
    },
    renderData: {
      pagination: {
        behavior: 'breakable',
        keepWithNext: true,
        allowSplit: false,
      },
    },
  }
}

export function buildExerciseNotebookBlocks(
  input: BuildExerciseNotebookBlocksInput,
): BuildExerciseNotebookBlocksResult {
  const exercises = input.exercises.filter(isPresentExercise)
  const skippedMissingExercises = input.exercises.length - exercises.length

  if (exercises.length === 0) {
    return { blocks: [], skippedMissingExercises, includedExercises: 0 }
  }

  const blocks: PreparedMaterialBlock[] = [{
    blockType: 'cover',
    title: input.title,
    content: { text: input.title },
    renderData: buildCoverRenderData({
      title: input.title,
      coverTemplate: input.coverTemplate,
      coverImageUrl: input.coverImageUrl,
      instrument: input.instrument,
      level: input.level,
      schoolName: input.schoolName,
      professorName: input.professorName,
      logoUrl: input.logoUrl,
    }),
  }]

  for (const exercise of exercises) {
    blocks.push({
      blockType: 'page_break',
      title: null,
      content: null,
      renderData: null,
    })
    blocks.push(buildExerciseHeaderBlock(exercise))
    blocks.push(...adaptExerciseLibraryItem(exercise))
  }

  return {
    blocks,
    skippedMissingExercises,
    includedExercises: exercises.length,
  }
}
