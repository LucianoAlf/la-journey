import { resolveInsertAfterIndex, resolveModelBeatIndex } from '../notationBeatHit.ts'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`not ok - ${name}`)
    throw error
  }
}

test('maps alphaTab index through indexMap', () => {
  const indexMap = [0, 0, 1, 2]
  assert(resolveModelBeatIndex(0, indexMap) === 0, 'grace shares 0')
  assert(resolveModelBeatIndex(1, indexMap) === 0, 'grace extra')
  assert(resolveModelBeatIndex(2, indexMap) === 1, 'second model beat')
})

test('out of range returns -1', () => {
  assert(resolveModelBeatIndex(-1, [0]) === -1, 'negative')
  assert(resolveModelBeatIndex(4, [0, 1]) === -1, 'past end')
})

test('click on existing beat selects that model index', () => {
  assert(resolveInsertAfterIndex(2, true) === 2, 'on beat → that index for select/replace')
})

test('click on empty staff after a beat inserts after it', () => {
  assert(resolveInsertAfterIndex(2, false) === 2, 'empty after beat 2 → insert after 2')
})

test('click with no beat uses -1 so insert goes to the end', () => {
  assert(resolveInsertAfterIndex(-1, false) === -1, 'no hit')
})
