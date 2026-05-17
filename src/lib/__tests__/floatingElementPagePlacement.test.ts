import {
  calculateFloatingElementPageDrag,
  getVisiblePageIndexFromRects,
  shouldHydrateFloatingElementsFromPageConfig,
  shouldPersistFloatingElementsToPageConfig,
} from '../floatingElementPagePlacement'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
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

test('chooses the page containing the viewport center instead of the closest page top', () => {
  const pageIndex = getVisiblePageIndexFromRects(
    { top: 0, bottom: 600, height: 600 },
    [
      { left: 0, top: -900, right: 700, bottom: 350, width: 700, height: 1250 },
      { left: 0, top: 370, right: 700, bottom: 1620, width: 700, height: 1250 },
    ],
    0,
  )

  assertEqual(pageIndex, 0, 'insertion should target the page the user is actually looking at')
})

test('moves a floating element to the page where its center is dropped', () => {
  const placement = calculateFloatingElementPageDrag({
    startPointer: { x: 150, y: 900 },
    currentPointer: { x: 150, y: 1120 },
    startPageIndex: 0,
    startElementX: 20,
    startElementY: 86,
    startElementRect: { left: 140, top: 860, right: 260, bottom: 980, width: 120, height: 120 },
    pageRects: [
      { left: 0, top: 0, right: 700, bottom: 1000, width: 700, height: 1000 },
      { left: 0, top: 1040, right: 700, bottom: 2040, width: 700, height: 1000 },
    ],
  })

  assertEqual(placement.pageIndex, 1, 'dragging across the page gap should update pageIndex')
  assert(placement.y >= 0 && placement.y <= 100, 'new y should be valid for the target page')
})

test('keeps a floating element on its page when dropped inside the same page', () => {
  const placement = calculateFloatingElementPageDrag({
    startPointer: { x: 200, y: 200 },
    currentPointer: { x: 260, y: 250 },
    startPageIndex: 0,
    startElementX: 20,
    startElementY: 20,
    startElementRect: { left: 140, top: 200, right: 240, bottom: 300, width: 100, height: 100 },
    pageRects: [
      { left: 0, top: 0, right: 700, bottom: 1000, width: 700, height: 1000 },
      { left: 0, top: 1040, right: 700, bottom: 2040, width: 700, height: 1000 },
    ],
  })

  assertEqual(placement, { pageIndex: 0, x: 28.6, y: 25 }, 'same-page drag should preserve existing behavior')
})

test('hydrates floating elements when page_config arrives after editor mount', () => {
  assert(
    shouldHydrateFloatingElementsFromPageConfig({
      alreadyHydrated: false,
      localElementCount: 0,
      pageConfigElementCount: 1,
    }),
    'late page_config with saved elements should hydrate an empty canvas',
  )

  assert(
    !shouldHydrateFloatingElementsFromPageConfig({
      alreadyHydrated: true,
      localElementCount: 1,
      pageConfigElementCount: 1,
    }),
    'hydration should not run repeatedly over live local edits',
  )

  assert(
    !shouldHydrateFloatingElementsFromPageConfig({
      alreadyHydrated: false,
      localElementCount: 1,
      pageConfigElementCount: 1,
    }),
    'hydration should not overwrite local elements already present',
  )
})

test('does not persist an empty local list over saved floating elements before hydration', () => {
  assert(
    !shouldPersistFloatingElementsToPageConfig({
      initialLoadDone: true,
      alreadyHydrated: false,
      localElementCount: 0,
      pageConfigElementCount: 1,
    }),
    'empty local state should not erase saved elements while hydration is pending',
  )

  assert(
    shouldPersistFloatingElementsToPageConfig({
      initialLoadDone: true,
      alreadyHydrated: true,
      localElementCount: 0,
      pageConfigElementCount: 1,
    }),
    'after hydration, deleting all elements should persist an empty list',
  )

  assert(
    shouldPersistFloatingElementsToPageConfig({
      initialLoadDone: true,
      alreadyHydrated: false,
      localElementCount: 1,
      pageConfigElementCount: 0,
    }),
    'new elements should persist even when there were no saved elements',
  )
})
