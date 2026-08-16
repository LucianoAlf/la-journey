/**
 * Executar via: npx tsx src/lib/__tests__/practiceAudioRecipe.test.ts
 */
import assert from 'node:assert/strict'
import {
  compilePracticeAudioPrompt,
  defaultRecipe,
  exerciseCategoryForKind,
  selectLyriaModel,
  type PracticeAudioRecipe,
} from '../practiceAudioRecipe'

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`not ok - ${name}`)
    throw error
  }
}

test('30s selects clip, 1–3 min select pro', () => {
  assert.equal(selectLyriaModel(30), 'lyria-3-clip-preview')
  assert.equal(selectLyriaModel(60), 'lyria-3-pro-preview')
  assert.equal(selectLyriaModel(120), 'lyria-3-pro-preview')
  assert.equal(selectLyriaModel(180), 'lyria-3-pro-preview')
})

test('vocalize in C asks for wordless ah guide vocal', () => {
  const recipe = defaultRecipe('vocalize')
  recipe.key = 'C'
  recipe.scale = 'major'
  recipe.wordlessGuide = true
  const prompt = compilePracticeAudioPrompt(recipe)
  assert.match(prompt, /vocalise|vocalize|vocal warm-up/i)
  assert.match(prompt, /\bah\b/i)
  assert.match(prompt, /in C major/i)
  assert.match(prompt, /tonic is C/i)
  assert.match(prompt, /do not modulate/i)
  assert.match(prompt, /30/)
})

test('backing C–G–D has no guide vocal and lists the chords', () => {
  const recipe: PracticeAudioRecipe = {
    ...defaultRecipe('backing'),
    key: 'C',
    requestedChords: ['C', 'G', 'D'],
    wordlessGuide: false,
    durationSeconds: 120,
    style: 'pop',
    exclude: ['drums', 'lyric vocals'],
  }
  const prompt = compilePracticeAudioPrompt(recipe)
  assert.match(prompt, /backing/i)
  assert.match(prompt, /C/)
  assert.match(prompt, /G/)
  assert.match(prompt, /D/)
  assert.doesNotMatch(prompt, /\bah\b/)
  assert.match(prompt, /no (sung )?lyrics/i)
})

test('pop without drums states the exclusion', () => {
  const recipe: PracticeAudioRecipe = {
    ...defaultRecipe('backing'),
    style: 'pop',
    exclude: ['drums'],
    requestedChords: ['C', 'G', 'D'],
  }
  const prompt = compilePracticeAudioPrompt(recipe)
  assert.match(prompt, /pop/i)
  assert.match(prompt, /no drums/i)
})

test('free note appends and does not replace the recipe', () => {
  const recipe: PracticeAudioRecipe = {
    ...defaultRecipe('exercise'),
    key: 'C',
    scale: 'major',
    note: 'só braço 1',
  }
  const prompt = compilePracticeAudioPrompt(recipe)
  assert.match(prompt, /só braço 1/)
  assert.match(prompt, /C/)
  assert.match(prompt, /exercise|classroom/i)
})

test('kind maps to exercise_library category', () => {
  assert.equal(exerciseCategoryForKind('vocalize'), 'scales')
  assert.equal(exerciseCategoryForKind('backing'), 'progression')
  assert.equal(exerciseCategoryForKind('exercise'), 'technique')
})
