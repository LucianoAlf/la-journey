import { resolveNotationInline } from '../notationInline.ts'

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

test('default is on', () => {
  assert(resolveNotationInline('') === 'on', 'empty search defaults to on')
  assert(resolveNotationInline('?foo=1') === 'on', 'unrelated query defaults to on')
})

test('query notationInline=off wins', () => {
  assert(resolveNotationInline('?notationInline=off') === 'off', 'bare query')
  assert(resolveNotationInline('notationInline=off') === 'off', 'without question mark')
})

test('query notationInline=on is explicit', () => {
  assert(resolveNotationInline('?notationInline=on') === 'on', 'explicit on')
})

test('invalid query falls back', () => {
  assert(resolveNotationInline('?notationInline=maybe') === 'on', 'unknown value uses default')
  assert(resolveNotationInline('?notationInline=maybe', 'off') === 'off', 'unknown value uses fallback arg')
})
