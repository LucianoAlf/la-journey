export interface EditorBlockPatch<TBlock extends { id: string }> {
  blockId: string
  before: TBlock | null
  after: TBlock | null
}

function cloneValue<T>(value: T): T {
  if (value == null) return value
  if (typeof structuredClone === 'function') return structuredClone(value)
  return JSON.parse(JSON.stringify(value)) as T
}

export function createBlockPatch<TBlock extends { id: string }>(
  blockId: string,
  before: TBlock | null,
  after: TBlock | null,
): EditorBlockPatch<TBlock> {
  return {
    blockId,
    before: before ? cloneValue(before) : null,
    after: after ? cloneValue(after) : null,
  }
}

export function applyBlockPatch<TBlock extends { id: string; sort_order?: number }>(
  blocks: TBlock[],
  patch: EditorBlockPatch<TBlock>,
  direction: 'forward' | 'backward',
): TBlock[] {
  const target = direction === 'forward' ? patch.after : patch.before
  const existingIndex = blocks.findIndex(block => block.id === patch.blockId)

  if (!target) {
    if (existingIndex < 0) return blocks
    return blocks.filter(block => block.id !== patch.blockId)
  }

  if (existingIndex >= 0) {
    const next = [...blocks]
    next[existingIndex] = cloneValue(target)
    return next
  }

  const next = [...blocks, cloneValue(target)]
  if (typeof target.sort_order === 'number') {
    next.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  }
  return next
}
