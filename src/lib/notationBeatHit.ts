export function resolveModelBeatIndex(alphaTabBeatIdx: number, indexMap: number[]): number {
  if (alphaTabBeatIdx < 0 || alphaTabBeatIdx >= indexMap.length) return -1
  return indexMap[alphaTabBeatIdx]
}

export function resolveInsertAfterIndex(modelBeatIdx: number, _clickedExistingBeat: boolean): number {
  return modelBeatIdx
}
