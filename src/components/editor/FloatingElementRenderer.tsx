import React from 'react'
import type {
  FloatingElement,
  FloatingText,
  FloatingImage,
  FloatingShape,
  FloatingIcon,
} from '@/lib/floatingElements'
import {
  floatingBaseCSS,
  floatingTextCSS,
  floatingImageCSS,
  floatingIconCSS,
  floatingTextHtmlToPlainText,
  floatingTextPlainTextToHtml,
  isFloatingTextContentEmpty,
  shapeFillCSS,
  shapeStrokeCSS,
} from '@/lib/floatingElements'
import { Icon } from '@iconify/react'
import { registerIconifyElementIcons } from '@/lib/iconifyElementCatalog'
import { FloatingSelectionControls } from '@/components/editor/FloatingSelectionControls'
import type { FloatingResizeHandle } from '@/lib/floatingElementTransform'
import { resolveCuratedElementSvgCode } from '@/lib/elementPicker'
import { getFloatingTextCanvasClickAction } from '@/lib/editorCanvasInteraction'

registerIconifyElementIcons()

// ── Sub-renderers ──

function FloatingTextContent({
  element,
  isEditing,
  onUpdate,
  onStopEditing,
}: {
  element: FloatingText
  isEditing: boolean
  onUpdate: (u: Partial<FloatingText>) => void
  onStopEditing?: () => void
}) {
  const style = floatingTextCSS(element)
  const editableRef = React.useRef<HTMLDivElement>(null)
  const didPrepareEditableRef = React.useRef(false)
  const committedContentRef = React.useRef(element.content)

  React.useEffect(() => {
    committedContentRef.current = element.content
    if (!isEditing) {
      didPrepareEditableRef.current = false
      return
    }
    const node = editableRef.current
    if (!node || didPrepareEditableRef.current) return
    didPrepareEditableRef.current = true
    const plainText = floatingTextHtmlToPlainText(element.content)
    node.innerText = plainText
    window.requestAnimationFrame(() => {
      node.focus()
      const selection = window.getSelection()
      if (!selection) return
      const range = document.createRange()
      range.selectNodeContents(node)
      if (plainText.trim() !== 'Novo texto') {
        range.collapse(false)
      }
      selection.removeAllRanges()
      selection.addRange(range)
    })
  }, [element.content, isEditing])

  const commitEditableText = React.useCallback(() => {
    const node = editableRef.current
    if (!node) return
    const nextContent = floatingTextPlainTextToHtml(node.innerText)
    if (nextContent !== committedContentRef.current) {
      committedContentRef.current = nextContent
      onUpdate({ content: nextContent })
    }
  }, [onUpdate])

  if (isEditing) {
    return (
      <div
        style={style}
        onClick={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
      >
        <div
          ref={editableRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-label={element.name}
          spellCheck={false}
          onInput={() => undefined}
          onBlur={() => {
            commitEditableText()
            onStopEditing?.()
          }}
          onKeyDown={(event) => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
              commitEditableText()
              return
            }
            if (event.key === 'Escape') {
              event.preventDefault()
              commitEditableText()
              onStopEditing?.()
            }
          }}
          className="min-h-full w-full cursor-text select-text whitespace-pre-wrap break-words outline-none"
          style={{
            font: 'inherit',
            color: 'inherit',
            textAlign: 'inherit',
            lineHeight: 'inherit',
            letterSpacing: 'inherit',
            textTransform: 'inherit',
          }}
        />
      </div>
    )
  }

  return (
    <div
      style={style}
      className="pointer-events-none select-none [&_*]:m-0 [&_br]:block"
      dangerouslySetInnerHTML={{ __html: isFloatingTextContentEmpty(element.content) ? '' : element.content }}
    />
  )
}

function FloatingImageContent({ element }: { element: FloatingImage }) {
  const style = floatingImageCSS(element)
  const svgCode = resolveCuratedElementSvgCode({
    label: element.name,
    description: element.name,
    elementType: null,
    svgCode: element.svgCode,
    source: element.source,
  })

  if (svgCode) {
    return (
      <div
        className="pointer-events-none flex h-full w-full select-none items-center justify-center [&>svg]:h-full [&>svg]:max-h-full [&>svg]:max-w-full [&>svg]:w-full"
        style={{
          ...style,
          color: element.color || '#111827',
        }}
        dangerouslySetInnerHTML={{ __html: svgCode }}
      />
    )
  }

  return (
    <img
      src={element.imageUrl}
      alt={element.name}
      className="pointer-events-none select-none"
      draggable={false}
      style={style}
    />
  )
}

function FloatingShapeContent({ element }: { element: FloatingShape }) {
  const fill = shapeFillCSS(element)
  const border = shapeStrokeCSS(element)
  const svgFill = element.fill.type === 'solid' ? element.fill.color : fill
  const strokeDasharray = element.stroke.style === 'dashed'
    ? '8 6'
    : element.stroke.style === 'dotted'
      ? '2 5'
      : undefined

  if (element.shape === 'circle') {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          background: fill,
          border,
        }}
      />
    )
  }

  if (element.shape === 'line' || element.shape === 'arrow') {
    const sw = element.stroke.width || 2
    return (
      <div
        style={{
          width: '100%',
          height: '0',
          borderTop: `${sw}px ${element.stroke.style} ${element.stroke.color}`,
          position: 'relative',
        }}
      >
        {element.shape === 'arrow' && (
          <div
            style={{
              position: 'absolute',
              right: '-2px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: 0,
              height: 0,
              borderLeft: `${sw * 4}px solid ${element.stroke.color}`,
              borderTop: `${sw * 3}px solid transparent`,
              borderBottom: `${sw * 3}px solid transparent`,
            }}
          />
        )}
      </div>
    )
  }

  if (element.shape === 'star') {
    return (
      <svg viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true">
        <polygon
          points="50,6 61,36 94,36 67,56 78,90 50,70 22,90 33,56 6,36 39,36"
          fill={svgFill}
          stroke={element.stroke.width > 0 ? element.stroke.color : 'none'}
          strokeWidth={element.stroke.width}
          strokeDasharray={strokeDasharray}
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  if (element.shape === 'callout') {
    return (
      <svg viewBox="0 0 100 70" width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true">
        <path
          d="M8 4H92C95 4 98 7 98 10V48C98 51 95 54 92 54H58L44 68V54H8C5 54 2 51 2 48V10C2 7 5 4 8 4Z"
          fill={svgFill}
          stroke={element.stroke.width > 0 ? element.stroke.color : 'none'}
          strokeWidth={element.stroke.width}
          strokeDasharray={strokeDasharray}
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  // rectangle (default)
  return (
    <div
      style={{
        width: '100%',
        height: element.height ? '100%' : '60px',
        background: fill,
        border,
        borderRadius: `${element.borderRadius}px`,
      }}
    />
  )
}

function FloatingIconContent({ element }: { element: FloatingIcon }) {
  return (
    <Icon
      icon={element.icon}
      style={floatingIconCSS(element)}
      strokeWidth={element.strokeWidth}
      aria-hidden="true"
    />
  )
}

// ── Renderer principal ──

interface FloatingElementRendererProps {
  element: FloatingElement
  isSelected: boolean
  isEditing: boolean
  onSelect: () => void
  onDoubleClick: () => void
  onDragStart: (e: React.MouseEvent<HTMLDivElement>) => void
  onResizeStart?: (e: React.MouseEvent<HTMLButtonElement>, handle: FloatingResizeHandle) => void
  onRotateStart?: (e: React.MouseEvent<HTMLButtonElement>) => void
  onDuplicate?: () => void
  onDelete?: () => void
  onToggleLock?: () => void
  onBringForward?: () => void
  onSendBackward?: () => void
  onOpenLayers?: () => void
  onResetRotation?: () => void
  onUpdate: (updates: Partial<FloatingElement>) => void
  onStopEditing?: () => void
  onEditText?: () => void
  interactive?: boolean
  isTransforming?: boolean
  isRotating?: boolean
  rotationPreview?: number | null
}

export function FloatingElementRenderer({
  element,
  isSelected,
  isEditing,
  onSelect,
  onDoubleClick,
  onDragStart,
  onResizeStart,
  onRotateStart,
  onDuplicate,
  onDelete,
  onToggleLock,
  onBringForward,
  onSendBackward,
  onOpenLayers,
  onResetRotation,
  onUpdate,
  onStopEditing,
  onEditText,
  interactive = true,
  isTransforming = false,
  isRotating = false,
  rotationPreview = null,
}: FloatingElementRendererProps) {
  const baseStyle: React.CSSProperties = {
    ...floatingBaseCSS(element, { rotate: false }),
    outline: 'none',
    // Quando está em edição de texto, não interceptar o mouse
    pointerEvents: element.locked && !isEditing ? 'none' : 'auto',
  }

  return (
    <div
      data-floating-element-id={element.id}
      data-floating-element-type={element.type}
      data-floating-shape={element.type === 'shape' ? (element as FloatingShape).shape : undefined}
      data-floating-transforming={isTransforming || undefined}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={element.name}
      style={baseStyle}
      onClick={(e) => {
        if (!interactive) return
        e.stopPropagation()
        if (element.type === 'floating_text') {
          const action = getFloatingTextCanvasClickAction({
            clickCount: e.detail,
            isEditing,
            isLocked: element.locked,
            isSelected,
          })
          if (action === 'edit') {
            onDoubleClick()
            return
          }
        }
        onSelect()
      }}
      onDoubleClick={(e) => {
        if (!interactive) return
        e.stopPropagation()
        onDoubleClick()
      }}
      onMouseDown={(e) => {
        if (!interactive) return
        e.stopPropagation()
        onSelect()
        if (!element.locked && !isEditing) onDragStart(e)
      }}
    >
      <div
        className="absolute inset-0"
        style={{ transform: `rotate(${element.rotation}deg)` }}
      >
        {element.type === 'floating_text' && (
          <FloatingTextContent
            element={element as FloatingText}
            isEditing={isEditing}
            onUpdate={onUpdate as (u: Partial<FloatingText>) => void}
            onStopEditing={onStopEditing}
          />
        )}
        {element.type === 'floating_image' && (
          <FloatingImageContent element={element as FloatingImage} />
        )}
        {element.type === 'shape' && (
          <FloatingShapeContent element={element as FloatingShape} />
        )}
        {element.type === 'iconify_icon' && (
          <FloatingIconContent element={element as FloatingIcon} />
        )}
      </div>
      {interactive && isSelected && isEditing && element.type === 'floating_text' && (
        <div className="pointer-events-none absolute inset-0 z-[2]">
          <div
            className="absolute inset-0 rounded-[2px] border-2 border-[#7c3aed]"
            style={{ transform: `rotate(${element.rotation}deg)` }}
          />
        </div>
      )}
      {interactive && isSelected && !isEditing && (
        <FloatingSelectionControls
          element={element}
          isRotating={isRotating}
          rotationPreview={rotationPreview}
          onResizeStart={onResizeStart ?? (() => undefined)}
          onRotateStart={onRotateStart ?? (() => undefined)}
          onDuplicate={onDuplicate ?? (() => undefined)}
          onDelete={onDelete ?? (() => undefined)}
          onToggleLock={onToggleLock ?? (() => undefined)}
          onBringForward={onBringForward ?? (() => undefined)}
          onSendBackward={onSendBackward ?? (() => undefined)}
          onOpenLayers={onOpenLayers ?? (() => undefined)}
          onResetRotation={onResetRotation ?? (() => undefined)}
          onEditText={onEditText}
          onUpdateText={onUpdate as (u: Partial<FloatingText>) => void}
        />
      )}
    </div>
  )
}
