import { TexRenderQueue } from '../texRenderQueue.ts'

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

test('first request sends immediately', () => {
  const sent: string[] = []
  const queue = new TexRenderQueue(tex => sent.push(tex))
  queue.request('a')
  assert(sent.length === 1 && sent[0] === 'a', 'sends first tex')
  assert(queue.isBusy, 'busy while rendering')
})

test('requests during render coalesce to the last one', () => {
  const sent: string[] = []
  const queue = new TexRenderQueue(tex => sent.push(tex))
  queue.request('a')
  queue.request('b')
  queue.request('c')
  queue.request('d')
  assert(sent.length === 1, 'intermediate texts are not sent')
  queue.finished()
  assert(sent.length === 2 && sent[1] === 'd', 'only the final state renders')
  assert(queue.isBusy, 'busy again for the pending render')
  queue.finished()
  assert(!queue.isBusy, 'idle after the pending render finishes')
})

test('finished with no pending goes idle', () => {
  const sent: string[] = []
  const queue = new TexRenderQueue(tex => sent.push(tex))
  queue.request('a')
  queue.finished()
  assert(!queue.isBusy, 'idle')
  queue.request('b')
  assert(sent.length === 2 && sent[1] === 'b', 'next request sends directly')
})

test('failed clears busy and pending', () => {
  const sent: string[] = []
  const queue = new TexRenderQueue(tex => sent.push(tex))
  queue.request('a')
  queue.request('b')
  queue.failed()
  assert(!queue.isBusy, 'idle after failure')
  queue.request('c')
  assert(sent[sent.length - 1] === 'c', 'pending was discarded, new request sends')
})
