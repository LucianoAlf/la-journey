import React from 'react'
import type {
  FloatingElement,
  FloatingText,
  FloatingImage,
  FloatingShape,
} from '@/lib/floatingElements'
import {
  floatingBaseCSS,
  floatingTextCSS,
  floatingImageCSS,
  shapeFillCSS,
  shapeStrokeCSS,
} from '@/lib/floatingElements'
import { RichTextEditor } from '@/components/editor/RichTextEditor'

// ── Sub-renderers ──

function FloatingTextContent({
  element,
  isEditing,
  onUpdate,
}: {
  element: FloatingText
  isEditing: boolean
  onUpdate: (u: Partial<FloatingText>) => void
}) {
  const style = floatingTextCSS(element)

  if (isEditing) {
    return (
      <div style={style} onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
        <RichTextEditor
          content={element.content}
          onChange={(html) => onUpdate({ content: html })}
          inline
        />
      </div>
    )
  }

  return (
    <div
      style={style}
      className="pointer-events-none select-none"
      dangerouslySetInnerHTML={{ __html: element.content }}
    />
  )
}

function FloatingImageContent({ element }: { element: FloatingImage }) {
  const style = floatingImageCSS(element)
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

  if (element.shape === 'circle') {
    return (
      <div
        style={{
          width: '100%',
          paddingBottom: '100%',
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

// ── Renderer principal ──

interface FloatingElementRendererProps {
  element: FloatingElement
  isSelected: boolean
  isEditing: boolean
  onSelect: () => void
  onDoubleClick: () => void
  onDragStart: (e: React.MouseEvent<HTMLDivElement>) => void
  onUpdate: (updates: Partial<FloatingElement>) => void
}

export function FloatingElementRenderer({
  element,
  isSelected,
  isEditing,
  onSelect,
  onDoubleClick,
  onDragStart,
  onUpdate,
}: FloatingElementRendererProps) {
  const baseStyle: React.CSSProperties = {
    ...floatingBaseCSS(element),
    outline: isSelected ? '2px solid var(--accent, #FF2D78)' : 'none',
    outlineOffset: '2px',
    // Quando está em edição de texto, não interceptar o mouse
    pointerEvents: element.locked && !isEditing ? 'none' : 'auto',
  }

  return (
    <div
      data-floating-element-id={element.id}
      data-floating-element-type={element.type}
      data-floating-shape={element.type === 'shape' ? (element as FloatingShape).shape : undefined}
      role="button"
      tabIndex={0}
      aria-label={element.name}
      style={baseStyle}
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
      }}
      onDoubleClick={(e) => {
        e.stopPropagation()
        onDoubleClick()
      }}
      onMouseDown={(e) => {
        e.stopPropagation()
        onSelect()
        if (!element.locked && !isEditing) onDragStart(e)
      }}
    >
      {element.type === 'floating_text' && (
        <FloatingTextContent
          element={element as FloatingText}
          isEditing={isEditing}
          onUpdate={onUpdate as (u: Partial<FloatingText>) => void}
        />
      )}
      {element.type === 'floating_image' && (
        <FloatingImageContent element={element as FloatingImage} />
      )}
      {element.type === 'shape' && (
        <FloatingShapeContent element={element as FloatingShape} />
      )}
    </div>
  )
}
