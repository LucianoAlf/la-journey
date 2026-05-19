import assert from 'node:assert/strict'
import { Constants } from '../database.types'
import { EDITOR_ADD_BLOCK_MENU_TYPES } from '../editorBlockTypes'

function run() {
  const materialBlockTypes = new Set<string>(Constants.public.Enums.material_block_type)

  const unsupported = EDITOR_ADD_BLOCK_MENU_TYPES.filter(type => !materialBlockTypes.has(type))

  assert.deepEqual(
    unsupported,
    [],
    `add-block menu exposes non-persistable material block types: ${unsupported.join(', ')}`,
  )
}

run()
