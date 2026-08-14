import assert from 'node:assert/strict'
import {
  printRecipeFromTags,
  recipeFromNotebookInstrument,
  withPrintRecipeTag,
  isSameRecipe,
  formatRecipeSummary,
} from '../notebookPrintRecipe'

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`not ok - ${name}`)
    throw error
  }
}

test('instrument piano defaults to keyboard only', () => {
  assert.deepEqual(recipeFromNotebookInstrument('piano'), {
    guitar: false,
    piano: true,
    ukulele: false,
    tab: false,
  })
})

test('tags override instrument default', () => {
  const recipe = printRecipeFromTags(['cover-template:bold', 'print-recipe:ukulele+tab'], 'piano')
  assert.equal(recipe.ukulele, true)
  assert.equal(recipe.tab, true)
  assert.equal(recipe.piano, false)
})

test('withPrintRecipeTag replaces only the recipe tag', () => {
  assert.deepEqual(
    withPrintRecipeTag(['pop', 'print-recipe:guitar'], { guitar: true, piano: true, ukulele: false, tab: false }),
    ['pop', 'print-recipe:guitar+piano'],
  )
})

test('isSameRecipe checks deep equality of recipe flags', () => {
  assert.equal(
    isSameRecipe(
      { guitar: true, piano: false, ukulele: false, tab: true },
      { guitar: true, piano: false, ukulele: false, tab: true },
    ),
    true,
  )
  assert.equal(
    isSameRecipe(
      { guitar: true, piano: false, ukulele: false, tab: true },
      { guitar: false, piano: true, ukulele: false, tab: true },
    ),
    false,
  )
})

test('formatRecipeSummary formats active elements correctly', () => {
  assert.equal(
    formatRecipeSummary({ guitar: true, piano: true, ukulele: false, tab: true }),
    'Violão, Teclado, Tab',
  )
  assert.equal(
    formatRecipeSummary({ guitar: false, piano: false, ukulele: false, tab: false }),
    'Apenas letra/cifra',
  )
})
