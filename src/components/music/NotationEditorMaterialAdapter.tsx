import { useCallback } from 'react'
import { NotationEditorV2, type NotationEditorDraft } from './NotationEditorV2'
import type { NotationLibraryRow } from '@/services/notationService'

export interface NotationEditorMaterialSaveData {
  name: string
  category: string
  subcategory?: string | null
  clef: string
  key_signature: string
  time_signature?: string | null
  notation_data: any
  description?: string | null
  difficulty: number
  tags: string[]
}

interface NotationEditorMaterialAdapterProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  notation?: NotationLibraryRow | null
  onSave: (data: NotationEditorMaterialSaveData) => Promise<void> | void
  onDelete?: (id: string) => Promise<void> | void
}

export function NotationEditorMaterialAdapter({
  open,
  onOpenChange,
  notation,
  onSave,
  onDelete,
}: NotationEditorMaterialAdapterProps) {
  const handleSaveDraft = useCallback(async (draft: NotationEditorDraft) => {
    await onSave({
      name: draft.name,
      category: draft.category,
      subcategory: null,
      clef: draft.clef,
      key_signature: draft.key_signature,
      time_signature: draft.time_signature,
      notation_data: draft.notation_data,
      description: draft.description ?? null,
      difficulty: draft.difficulty,
      tags: draft.tags ?? [],
    })
  }, [onSave])

  return (
    <NotationEditorV2
      open={open}
      onOpenChange={onOpenChange}
      notation={notation}
      onSaveDraft={handleSaveDraft}
      onDeleteDraft={onDelete}
    />
  )
}
