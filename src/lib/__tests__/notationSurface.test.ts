import { resolveNotationSurface } from '../notationSurface.ts'

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

test('default is alphatab', () => {
  assert(resolveNotationSurface('') === 'alphatab', 'empty search defaults to alphatab')
  assert(resolveNotationSurface('?foo=1') === 'alphatab', 'unrelated query defaults to alphatab')
})

test('query notationSurface=svg wins', () => {
  assert(resolveNotationSurface('?notationSurface=svg') === 'svg', 'bare query')
  assert(resolveNotationSurface('notationSurface=svg') === 'svg', 'without question mark')
})

test('query notationSurface=alphatab is explicit', () => {
  assert(resolveNotationSurface('?notationSurface=alphatab') === 'alphatab', 'explicit alphatab')
})

test('invalid query falls back', () => {
  assert(resolveNotationSurface('?notationSurface=vexflow') === 'alphatab', 'unknown value uses default')
  assert(resolveNotationSurface('?notationSurface=vexflow', 'svg') === 'svg', 'unknown value uses fallback arg')
})
