import assert from 'node:assert/strict'
import {
  printRecipeFromTags,
  recipeFromNotebookInstrument,
  withPrintRecipeTag,
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
