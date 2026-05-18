import {
  canDeleteSelectedBlock,
  canEnterInlineEdit,
  getFloatingElementNudgeStep,
  getFloatingTextCanvasClickAction,
  getCanvasToolbarActions,
  getCanvasToolbarMode,
  getCanvasToolbarPosition,
  getInlineEditingBlockAfterCanvasBlockClick,
  shouldNudgeFloatingElementFromKey,
} from '../editorCanvasInteraction'

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

test('never deletes a selected block while inline text editing is active', () => {
  assertEqual(
    canDeleteSelectedBlock({
      selectedBlockId: 'block-1',
      inlineEditingBlockId: 'block-1',
      isTextInputTarget: true,
    }),
    false,
    'delete/backspace must not remove block during text editing',
  )
})

test('allows delete/backspace only for selected block outside text editing', () => {
  assertEqual(
    canDeleteSelectedBlock({
      selectedBlockId: 'block-1',
      inlineEditingBlockId: null,
      isTextInputTarget: false,
    }),
    true,
    'selected block outside editing can be deleted',
  )
})

test('only text-like blocks enter inline edit from canvas', () => {
  assertEqual(canEnterInlineEdit('text'), true, 'text should edit inline')
  assertEqual(canEnterInlineEdit('title'), true, 'title should edit inline')
  assertEqual(canEnterInlineEdit('tip'), true, 'tip should edit inline')
  assertEqual(canEnterInlineEdit('exercise'), true, 'exercise should edit inline')
  assertEqual(canEnterInlineEdit('notation'), false, 'notation should open its editor, not text inline')
  assertEqual(canEnterInlineEdit('keyboard'), false, 'keyboard should open its editor, not title inline')
})

test('toolbar exposes direct actions by block type', () => {
  assertEqual(
    getCanvasToolbarActions('keyboard'),
    ['move-up', 'move-down', 'duplicate', 'delete', 'edit-keyboard'],
    'keyboard toolbar should expose its music editor action',
  )
  assertEqual(
    getCanvasToolbarActions('notation'),
    ['move-up', 'move-down', 'duplicate', 'delete', 'edit-notation'],
    'notation toolbar should expose notation editor action',
  )
  assertEqual(
    getCanvasToolbarActions('tablature'),
    ['move-up', 'move-down', 'duplicate', 'delete', 'edit-tablature'],
    'tablature toolbar should expose the tablature editor action, not notation',
  )
  assertEqual(
    getCanvasToolbarActions('text'),
    ['move-up', 'move-down', 'duplicate', 'delete', 'edit-inline', 'ai-rewrite'],
    'text toolbar should expose inline edit and AI',
  )
})

test('clicking another block exits the previous inline editing session', () => {
  assertEqual(
    getInlineEditingBlockAfterCanvasBlockClick({
      inlineEditingBlockId: 'block-a',
      clickedBlockId: 'block-b',
    }),
    null,
    'selecting a different block must release the previous editor so the toolbar can appear',
  )

  assertEqual(
    getInlineEditingBlockAfterCanvasBlockClick({
      inlineEditingBlockId: 'block-a',
      clickedBlockId: 'block-a',
    }),
    'block-a',
    'clicking the same editing block should not unexpectedly exit editing',
  )
})

test('floating text single click edits when it is already selected', () => {
  assertEqual(
    getFloatingTextCanvasClickAction({
      clickCount: 1,
      isEditing: false,
      isLocked: false,
      isSelected: true,
    }),
    'edit',
    'single click on an already selected text should place the caret back into the text',
  )
})

test('floating text click enters text editing when unlocked', () => {
  assertEqual(
    getFloatingTextCanvasClickAction({
      clickCount: 2,
      isEditing: false,
      isLocked: false,
      isSelected: true,
    }),
    'edit',
    'double click should be the canvas gesture that edits text',
  )

  assertEqual(
    getFloatingTextCanvasClickAction({
      clickCount: 2,
      isEditing: false,
      isLocked: true,
      isSelected: true,
    }),
    'select',
    'locked text should not enter editing from double click',
  )
})

test('floating elements keep arrow nudging priority even when Alt is pressed', () => {
  assertEqual(
    shouldNudgeFloatingElementFromKey({ key: 'ArrowDown', altKey: true }),
    true,
    'Alt+Arrow should still be a valid floating element nudge when a floating element is selected',
  )
  assertEqual(
    getFloatingElementNudgeStep({ key: 'ArrowDown', altKey: true }),
    1,
    'Alt+Arrow should move floating elements by a readable small step',
  )
  assertEqual(
    getFloatingElementNudgeStep({ key: 'ArrowDown', altKey: true, shiftKey: true }),
    5,
    'Shift+Alt+Arrow should move floating elements faster without jumping a whole block',
  )
  assertEqual(
    shouldNudgeFloatingElementFromKey({ key: 'ArrowDown', altKey: true, ctrlKey: true }),
    false,
    'Ctrl/Cmd shortcuts must remain reserved for browser/editor commands',
  )
})

test('toolbar remains available while the selected block is editing', () => {
  assertEqual(
    getCanvasToolbarMode({
      selectedBlockId: 'block-a',
      inlineEditingBlockId: 'block-a',
    }),
    'editing',
    'toolbar should switch to editing mode instead of disappearing',
  )

  assertEqual(
    getCanvasToolbarMode({
      selectedBlockId: 'block-a',
      inlineEditingBlockId: null,
    }),
    'selected',
    'selected block should show the normal toolbar',
  )
})

test('toolbar appears below blocks that are too close to the top edge', () => {
  assertEqual(
    getCanvasToolbarPosition({
      blockTop: 20,
      blockBottom: 120,
      blockLeft: 100,
      blockWidth: 240,
      toolbarHeight: 36,
      viewportTop: 0,
      safeGap: 8,
    }),
    { top: 128, left: 220, placement: 'below' },
    'toolbar should not overlap the page top when there is not enough room above',
  )

  assertEqual(
    getCanvasToolbarPosition({
      blockTop: 100,
      blockBottom: 220,
      blockLeft: 100,
      blockWidth: 240,
      toolbarHeight: 36,
      viewportTop: 0,
      safeGap: 8,
    }),
    { top: 56, left: 220, placement: 'above' },
    'toolbar should prefer above the block when there is room',
  )
})
