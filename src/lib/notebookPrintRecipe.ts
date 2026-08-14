export const PRINT_RECIPE_TAG_PREFIX = 'print-recipe:'

export interface NotebookPrintRecipe {
  guitar: boolean
  piano: boolean
  ukulele: boolean
  tab: boolean
}

export const DEFAULT_PRINT_RECIPE: NotebookPrintRecipe = {
  guitar: true,
  piano: false,
  ukulele: false,
  tab: true,
}

export function recipeFromNotebookInstrument(instrument?: string | null): NotebookPrintRecipe {
  const value = (instrument ?? '').trim().toLowerCase()
  if (value === 'piano' || value === 'teclado') {
    return { guitar: false, piano: true, ukulele: false, tab: false }
  }
  if (value === 'ukulele' || value === 'uke') {
    return { guitar: false, piano: false, ukulele: true, tab: true }
  }
  if (value === 'baixo') {
    return { guitar: true, piano: false, ukulele: false, tab: true }
  }
  if (value === 'universal' || value === 'canto') {
    return { guitar: true, piano: true, ukulele: false, tab: true }
  }
  return { ...DEFAULT_PRINT_RECIPE }
}

export function printRecipeFromTags(
  tags: string[] | null | undefined,
  instrument?: string | null,
): NotebookPrintRecipe {
  const raw = (tags ?? []).find((tag) => tag.startsWith(PRINT_RECIPE_TAG_PREFIX))
    ?.slice(PRINT_RECIPE_TAG_PREFIX.length)
  if (!raw) return recipeFromNotebookInstrument(instrument)
  const parts = new Set(raw.split('+').map((part) => part.trim()).filter(Boolean))
  return {
    guitar: parts.has('guitar'),
    piano: parts.has('piano'),
    ukulele: parts.has('ukulele'),
    tab: parts.has('tab'),
  }
}

export function withPrintRecipeTag(
  tags: string[] | null | undefined,
  recipe: NotebookPrintRecipe,
): string[] {
  const rest = (tags ?? []).filter((tag) => !tag.startsWith(PRINT_RECIPE_TAG_PREFIX))
  const parts = [
    recipe.guitar ? 'guitar' : null,
    recipe.piano ? 'piano' : null,
    recipe.ukulele ? 'ukulele' : null,
    recipe.tab ? 'tab' : null,
  ].filter(Boolean)
  if (parts.length === 0) return rest
  return [...rest, `${PRINT_RECIPE_TAG_PREFIX}${parts.join('+')}`]
}

export function recipeHasDiagrams(recipe: NotebookPrintRecipe) {
  return recipe.guitar || recipe.piano || recipe.ukulele
}

export function isSameRecipe(a: NotebookPrintRecipe, b: NotebookPrintRecipe): boolean {
  return a.guitar === b.guitar && a.piano === b.piano && a.ukulele === b.ukulele && a.tab === b.tab
}

export function formatRecipeSummary(recipe: NotebookPrintRecipe): string {
  const parts: string[] = []
  if (recipe.guitar) parts.push('Violão')
  if (recipe.piano) parts.push('Teclado')
  if (recipe.ukulele) parts.push('Ukulele')
  if (recipe.tab) parts.push('Tab')
  return parts.length > 0 ? parts.join(', ') : 'Apenas letra/cifra'
}

