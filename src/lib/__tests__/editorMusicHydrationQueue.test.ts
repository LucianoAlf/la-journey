import { buildMusicHydrationPlan, shouldMountMusicRenderer } from '../editorMusicHydrationQueue'

type TestBlock = {
  id: string
  block_type: string
  render_data?: Record<string, unknown>
}

function block(id: string, block_type = 'notation'): TestBlock {
  return { id, block_type }
}

function assertEqual(actual: unknown, expected: unknown, message: string) {
  const actualJson = JSON.stringify(actual)
  const expectedJson = JSON.stringify(expected)
  if (actualJson !== expectedJson) {
    throw new Error(`${message}\nExpected: ${expectedJson}\nActual:   ${actualJson}`)
  }
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

test('limits hydration to two notation blocks per active page', () => {
  const pages = [
    [block('n1'), block('n2'), block('n3'), block('n4')],
  ]

  const plan = buildMusicHydrationPlan({
    pages,
    activePageIndexes: new Set([0]),
    selectedBlockId: 'n3',
    maxPerPage: 2,
  })

  assertEqual(plan.allowedBlockIds, ['n3', 'n2'], 'selected block and nearest neighbor should hydrate first')
})

test('does not hydrate notation on inactive pages unless the selected block is there', () => {
  const pages = [
    [block('n1')],
    [block('n2')],
  ]

  const plan = buildMusicHydrationPlan({
    pages,
    activePageIndexes: new Set([0]),
    selectedBlockId: 'n2',
    maxPerPage: 2,
  })

  assertEqual(plan.allowedBlockIds, ['n1', 'n2'], 'selected inactive page should be included explicitly')
})

test('includes text-like blocks that embed notation in render_data', () => {
  const pages = [
    [
      { id: 'text-1', block_type: 'text', render_data: { notation: { staves: [] } } },
      block('plain-text', 'text'),
      block('n1'),
    ],
  ]

  const plan = buildMusicHydrationPlan({
    pages,
    activePageIndexes: new Set([0]),
    selectedBlockId: 'text-1',
    maxPerPage: 2,
  })

  assertEqual(plan.allowedBlockIds, ['text-1', 'n1'], 'embedded notation should participate in the queue')
})

test('mounts the real renderer when a music block has no cached snapshot yet', () => {
  const shouldMount = shouldMountMusicRenderer({
    hasValidSnapshot: false,
    canHydrateMusicRenderer: false,
  })

  assertEqual(shouldMount, true, 'first render cannot be blocked because there is no snapshot to show')
})

test('keeps renderer gated when a cached snapshot can cover the block visually', () => {
  const shouldMount = shouldMountMusicRenderer({
    hasValidSnapshot: true,
    canHydrateMusicRenderer: false,
  })

  assertEqual(shouldMount, false, 'cached snapshots should allow hydration throttling without blank blocks')
})
