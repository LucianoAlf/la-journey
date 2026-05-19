export const EDITOR_ADD_BLOCK_MENU_TYPES = [
  'text',
  'tip',
  'exercise',
  'title',
  'image',
  'audio',
  'video',
  'qr_code',
  'cover',
  'columns',
  'notation',
  'chord_diagram',
  'chord_grid',
  'keyboard',
  'keyboard_grid',
  'tablature',
  'separator',
  'page_break',
] as const

export type EditorAddBlockMenuType = typeof EDITOR_ADD_BLOCK_MENU_TYPES[number]
