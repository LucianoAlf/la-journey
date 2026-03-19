import { useRef, useCallback } from 'react'

/**
 * Hook genérico de Undo/Redo com stack de snapshots.
 * Armazena até `maxHistory` snapshots (deep clone via structuredClone).
 *
 * Uso:
 * ```
 * const { pushSnapshot, undo, redo, canUndo, canRedo } = useUndoRedo<EditorBlock[]>()
 * ```
 */
export function useUndoRedo<T>(maxHistory = 30) {
  const undoStack = useRef<T[]>([])
  const redoStack = useRef<T[]>([])

  /** Empurra um snapshot para o undo stack (chame ANTES de mutar o estado) */
  const pushSnapshot = useCallback((snapshot: T) => {
    undoStack.current = [...undoStack.current.slice(-(maxHistory - 1)), structuredClone(snapshot)]
    // Qualquer nova ação limpa o redo stack
    redoStack.current = []
  }, [maxHistory])

  /** Desfaz: retorna o snapshot anterior ou null se não houver */
  const undo = useCallback((currentState: T): T | null => {
    if (undoStack.current.length === 0) return null
    const previous = undoStack.current.pop()!
    redoStack.current.push(structuredClone(currentState))
    return previous
  }, [])

  /** Refaz: retorna o próximo snapshot ou null se não houver */
  const redo = useCallback((currentState: T): T | null => {
    if (redoStack.current.length === 0) return null
    const next = redoStack.current.pop()!
    undoStack.current.push(structuredClone(currentState))
    return next
  }, [])

  const canUndo = useCallback(() => undoStack.current.length > 0, [])
  const canRedo = useCallback(() => redoStack.current.length > 0, [])

  /** Limpa todo o histórico (ex: ao carregar novo material) */
  const clearHistory = useCallback(() => {
    undoStack.current = []
    redoStack.current = []
  }, [])

  return { pushSnapshot, undo, redo, canUndo, canRedo, clearHistory }
}
