import { Input } from '@/components/ui/input'
import { RichTextEditor } from '@/components/editor/RichTextEditor'
import { canEnterInlineEdit } from '@/lib/editorCanvasInteraction'
import { BlockFrame } from './BlockFrame'
import { getBlockHtml, getPlaceholder, type EditableBlockComponentProps } from './types'

export function TextBlockBase(props: EditableBlockComponentProps) {
  const {
    block,
    mode,
    focusPoint,
    renderPreview,
    onExitInlineEdit,
    onTitleChange,
    onContentChange,
    onAIAction,
  } = props
  const isEditing = mode === 'editing' && canEnterInlineEdit(block.block_type)

  return (
    <BlockFrame {...props} isEditing={isEditing}>
      {isEditing ? (
        <div onClick={event => event.stopPropagation()}>
          {block.title && (
            <Input
              value={block.title ?? ''}
              onChange={event => onTitleChange(block.id, event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Escape') onExitInlineEdit()
              }}
              className="font-bold text-[14px] text-text mb-2 border-none bg-transparent px-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
              placeholder="Titulo do bloco"
            />
          )}
          <RichTextEditor
            key={`inline-${block.id}`}
            content={getBlockHtml(block)}
            onChange={html => onContentChange(block.id, html)}
            placeholder={getPlaceholder(block.block_type)}
            inline
            focusOnMountAt={focusPoint}
            onAIAction={onAIAction}
          />
          <div className="text-[10px] text-text3 mt-2 text-right opacity-60">
            Clique fora para sair da edicao - Esc para sair
          </div>
        </div>
      ) : (
        renderPreview()
      )}
    </BlockFrame>
  )
}
