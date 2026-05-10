import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const blocksDir = join(root, 'src', 'components', 'editor', 'blocks')
const editableBlockPath = join(root, 'src', 'components', 'editor', 'EditableBlock.tsx')

const expectedBlockFiles = [
  'TextBlock.tsx',
  'TitleBlock.tsx',
  'SubtitleBlock.tsx',
  'TipBlock.tsx',
  'ExerciseBlock.tsx',
  'NotationBlock.tsx',
  'KeyboardBlock.tsx',
  'ChordGridBlock.tsx',
  'ImageBlock.tsx',
  'CoverBlock.tsx',
  'PageBreakBlock.tsx',
  'SeparatorBlock.tsx',
]

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
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

test('editor block components are split into physical files', () => {
  for (const fileName of expectedBlockFiles) {
    assert(
      existsSync(join(blocksDir, fileName)),
      `Expected src/components/editor/blocks/${fileName} to exist`,
    )
  }
})

test('EditableBlock dispatches to physical block components', () => {
  const source = readFileSync(editableBlockPath, 'utf8')

  for (const fileName of expectedBlockFiles) {
    const componentName = fileName.replace(/\.tsx$/, '')
    assert(
      source.includes(`./blocks/${componentName}`) || source.includes(`./blocks/${componentName}.tsx`),
      `Expected EditableBlock.tsx to import ${componentName}`,
    )
  }

  assert(!source.includes('<RichTextEditor'), 'EditableBlock.tsx should not render RichTextEditor directly')
})
