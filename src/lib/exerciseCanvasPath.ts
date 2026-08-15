export function exerciseCanvasPath(materialId: string): string {
  const id = materialId.trim()
  if (!id) throw new Error('Material id is required to open the canvas')
  return `/editor/${id}`
}
