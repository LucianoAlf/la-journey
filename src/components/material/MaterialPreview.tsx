import React, { useRef, useCallback, useState, useEffect } from 'react'
import {
  AlignBottom,
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignLeft,
  AlignRight,
  AlignTop,
  ArrowDown,
  ArrowLineDown,
  ArrowLineUp,
  ArrowUp,
  Copy,
  DotsThree,
  Lightbulb,
  MusicNotes,
  PencilSimple,
  Stack,
  Target,
  Trash,
  Trophy,
} from '@phosphor-icons/react'
import QRCodeLib from 'qrcode'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { type SeparatorStyle, DEFAULT_SEPARATOR_STYLE, getSeparatorDecoration } from '@/lib/blockStyles'
import { PianoKeyboard } from '@/components/music/PianoKeyboard'
import { ChordDiagram } from '@/components/music/ChordDiagram'
import { Tablature } from '@/components/music/Tablature'
import { AlphaTexInlineRenderer, hasExplicitAlphaTexTimeSignature } from '@/components/music/AlphaTexInlineRenderer'
import { AlphaTabViewer } from '@/components/music/AlphaTabViewer'
import { NotationPreviewCompat } from '@/components/music/NotationPreviewCompat'
import { keyboardEntryToDisplayData } from '@/lib/keyboardBlockAdapter'
import { lookupGuitarChord } from '@/services/chordAutoFillService'
import {
  notFoundGridChord,
  resolveGuitarChordFromLibrary,
  shouldAllowLocalChordFallback,
  type ResolvedGridChord,
} from '@/services/chordLibraryResolver'

export interface MaterialBlock {
  block_type: 'title' | 'text' | 'chord_diagram' | 'chord_grid' | 'notation' | 'rhythm' | 'exercise' | 'tip' | 'tablature' | 'image' | 'audio' | 'video' | 'qr_code' | 'badge' | 'cover' | 'keyboard' | 'keyboard_grid' | 'columns' | 'separator' | 'page_break'
  title?: string
  content?: { text?: string; [key: string]: any }
  render_data?: any
}

export interface CoverOverlayElement {
  id: string
  image_url: string
  label: string
  x: number
  y: number
  width: number
  rotation: number
  opacity: number
  shadow: boolean
  zIndex: number
  flipX: boolean
}

export interface CoverTextShadow {
  enabled: boolean
  color: string
  blur: number
  offsetX: number
  offsetY: number
}

export interface CoverTextOutline {
  enabled: boolean
  color: string
  width: number
}

export interface CoverTextBackground {
  enabled: boolean
  color: string
  padding: number
  borderRadius: number
}

export interface CoverTextElement {
  id: string
  content: string
  x: number
  y: number
  fontFamily: string
  fontSize: number
  fontWeight: number
  fontStyle?: 'normal' | 'italic'
  color: string
  align: 'left' | 'center' | 'right'
  uppercase: boolean
  letterSpacing: number
  lineHeight: number
  shadow: CoverTextShadow
  outline: CoverTextOutline
  background: CoverTextBackground
  maxWidth: number
  zIndex: number
}

export const COVER_FONTS = [
  { value: 'Montserrat', label: 'Montserrat', category: 'Sans-serif' },
  { value: 'Poppins', label: 'Poppins', category: 'Sans-serif' },
  { value: 'DM Sans', label: 'DM Sans', category: 'Sans-serif' },
  { value: 'Raleway', label: 'Raleway', category: 'Sans-serif' },
  { value: 'Oswald', label: 'Oswald', category: 'Sans-serif' },
  { value: 'Bebas Neue', label: 'Bebas Neue', category: 'Display' },
  { value: 'Righteous', label: 'Righteous', category: 'Display' },
  { value: 'Playfair Display', label: 'Playfair Display', category: 'Serif' },
  { value: 'Lora', label: 'Lora', category: 'Serif' },
  { value: 'Pacifico', label: 'Pacifico', category: 'Script' },
] as const

export const DEFAULT_TEXT_SHADOW: CoverTextShadow = { enabled: false, color: '#000000', blur: 4, offsetX: 1, offsetY: 1 }
export const DEFAULT_TEXT_OUTLINE: CoverTextOutline = { enabled: false, color: '#000000', width: 2 }
export const DEFAULT_TEXT_BG: CoverTextBackground = { enabled: false, color: '#00000080', padding: 8, borderRadius: 4 }

interface MaterialPreviewProps {
  blocks: MaterialBlock[]
  onLegacyNotationStavePointerDown?: (staveIndex: number) => void
  onMusicStableRender?: (block: MaterialBlock, html: string) => void
  onChordGridItemClick?: (block: MaterialBlock, chord: any, index: number) => void
  onKeyboardGridItemClick?: (block: MaterialBlock, keyboard: any, index: number) => void
  coverEditable?: boolean
  onCoverPositionChange?: (field: string, pos: { x: number; y: number }) => void
  coverTitleEditing?: boolean
  onCoverTitleChange?: (value: string) => void
  overlayElements?: CoverOverlayElement[]
  selectedOverlayId?: string | null
  onOverlaySelect?: (id: string | null) => void
  onOverlayUpdate?: (id: string, patch: Partial<CoverOverlayElement>) => void
  onOverlayCloneForDrag?: (id: string) => CoverOverlayElement | null
  textElements?: CoverTextElement[]
  selectedTextId?: string | null
  editingTextId?: string | null
  onTextSelect?: (id: string | null) => void
  onTextUpdate?: (id: string, patch: Partial<CoverTextElement>) => void
  onTextEditStart?: (id: string | null) => void
  onTextCopy?: (id: string) => void
  onTextDuplicate?: (id: string) => void
  onTextDelete?: (id: string) => void
  onTextCloneForDrag?: (id: string) => CoverTextElement | null
  onTextLayerChange?: (id: string, action: 'front' | 'forward' | 'backward' | 'back') => void
  onLegacyTextActivate?: () => void
}

type MusicStableRenderHandler = (block: MaterialBlock, html: string) => void

const DIMENSION_COLORS: Record<string, string> = {
  teoria: 'text-foundation border-foundation/30',
  theory: 'text-foundation border-foundation/30',
  técnica: 'text-grow border-grow/30',
  technique: 'text-grow border-grow/30',
  ritmo: 'text-advance border-advance/30',
  rhythm: 'text-advance border-advance/30',
  repertório: 'text-master border-master/30',
  repertoire: 'text-master border-master/30',
}

const DIMENSION_EMOJIS: Record<string, string> = {
  teoria: '📖', theory: '📖',
  técnica: '🎯', technique: '🎯',
  ritmo: '🥁', rhythm: '🥁',
  repertório: '🎵', repertoire: '🎵',
}

const RHYTHM_FIGURES = [
  { duration: 'w', namePt: 'Semibreve', beats: '4 tempos' },
  { duration: 'h', namePt: 'Mínima', beats: '2 tempos' },
  { duration: 'q', namePt: 'Semínima', beats: '1 tempo' },
  { duration: '8', namePt: 'Colcheia', beats: '½ tempo' },
  { duration: '16', namePt: 'Semicolcheia', beats: '¼ tempo' },
]

const RHYTHM_FIGURES_TEX = '\\track\n\\staff{score}\n\\tuning piano\n.\n:1 b3 :2 b3 :4 b3 :8 b3 :16 b3'

function parseJsonLike<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T
    } catch {
      return fallback
    }
  }
  if (typeof value === 'object') return value as T
  return fallback
}

function getBlockContent(block: MaterialBlock) {
  return parseJsonLike<Record<string, any>>(block.content, {})
}

function getBlockRenderData(block: MaterialBlock) {
  return parseJsonLike<Record<string, any>>(block.render_data, {})
}

function renderMarkdownText(text: string) {
  const lines = text.split('\n')
  return lines.map((line, i) => {
    if (!line.trim()) return <br key={i} />

    // Renderizar **negrito** e *itálico* inline
    const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
    return (
      <p key={i} className="mb-2 text-[13px] leading-relaxed text-text2">
        {parts.map((part, j) => {
          if (part.startsWith('**') && part.endsWith('**'))
            return <strong key={j} className="text-text font-semibold">{part.slice(2, -2)}</strong>
          if (part.startsWith('*') && part.endsWith('*'))
            return <em key={j} className="text-text2">{part.slice(1, -1)}</em>
          return <span key={j}>{part}</span>
        })}
      </p>
    )
  })
}

/** Renderiza título: prioriza title_html (editor rico), fallback para texto puro */
function renderTitle(block: MaterialBlock, className = 'font-bold text-[14px] text-text mb-2') {
  const titleHtml = block.content?.title_html
  if (titleHtml) {
    return (
      <div
        className={`rich-title text-text mb-2 [&_p]:mb-0 [&_p]:text-[14px] [&_p]:font-bold [&_strong]:font-extrabold [&_em]:italic [&_u]:underline [&_h1]:text-[22px] [&_h1]:font-bold [&_h1]:mb-0 [&_h2]:text-[18px] [&_h2]:font-bold [&_h2]:mb-0 [&_h3]:text-[15px] [&_h3]:font-bold [&_h3]:mb-0`}
        dangerouslySetInnerHTML={{ __html: titleHtml }}
      />
    )
  }
  if (block.title) return <h3 className={className}>{block.title}</h3>
  return null
}

/** Renderiza conteúdo: prioriza HTML (editor rico), fallback para markdown */
function renderContent(content?: { text?: string; html?: string; [key: string]: any }) {
  const html = content?.html
  const text = content?.text ?? ''
  if (html) {
    return (
      <div
        className="rich-content overflow-x-auto text-[13px] leading-relaxed text-text2 [&_strong]:text-text [&_strong]:font-semibold [&_em]:text-text2 [&_p]:mb-2 [&_h1]:font-serif [&_h1]:text-[22px] [&_h1]:font-bold [&_h1]:text-text [&_h1]:mb-3 [&_h2]:font-serif [&_h2]:text-[18px] [&_h2]:font-bold [&_h2]:text-text [&_h2]:mb-2 [&_h3]:font-serif [&_h3]:text-[15px] [&_h3]:font-bold [&_h3]:text-text [&_h3]:mb-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-2 [&_blockquote]:border-l-[3px] [&_blockquote]:border-accent/40 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-text3 [&_a]:text-accent [&_a]:underline [&_mark]:bg-yellow-200/80 [&_mark]:rounded-sm [&_mark]:px-0.5 [&_hr]:border-border [&_hr]:my-4 [&_table]:mb-3 [&_table]:w-full [&_table]:border-collapse [&_table]:overflow-hidden [&_table]:rounded-[12px] [&_table]:border [&_table]:border-border/70 [&_thead]:bg-bg2/80 [&_th]:border [&_th]:border-border/60 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-[12px] [&_th]:font-semibold [&_th]:text-text [&_td]:border [&_td]:border-border/50 [&_td]:px-3 [&_td]:py-2 [&_td]:align-top [&_tbody_tr:nth-child(even)]:bg-bg2/30"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    )
  }
  if (text) return <>{renderMarkdownText(text)}</>
  return null
}

function BlockTitle({ block }: { block: MaterialBlock }) {
  const content = getBlockContent(block)
  const dimension = content.dimension?.toLowerCase() ?? ''
  const colorClass = DIMENSION_COLORS[dimension] ?? 'text-accent border-accent/30'
  const emoji = DIMENSION_EMOJIS[dimension] ?? '📌'

  return (
    <div className={`border-l-[3px] pl-4 py-1 mt-6 mb-3 ${colorClass}`}>
      <div className="flex items-center gap-1">
        <span>{emoji}</span>
        {renderTitle(block, 'font-serif text-lg font-bold [&_p]:inline') ?? (
          <h2 className="font-serif text-lg font-bold">{block.title}</h2>
        )}
      </div>
    </div>
  )
}

function BlockText({ block, onLegacyNotationStavePointerDown }: { block: MaterialBlock; onLegacyNotationStavePointerDown?: (staveIndex: number) => void }) {
  const content = getBlockContent(block)
  const renderData = getBlockRenderData(block)
  return (
    <div className="mb-4">
      {renderTitle(block)}
      {renderContent(content)}
      {(renderData.notation || renderData.notation_data) && (
        <NotationPreviewCompat
          notation={renderData.notation as any}
          notationData={renderData.notation_data}
          onLegacyStavePointerDown={onLegacyNotationStavePointerDown}
          className="mt-3"
        />
      )}
    </div>
  )
}

function BlockChordDiagram({ block }: { block: MaterialBlock }) {
  const rd = block.render_data ?? {}
  const name = rd.chord_name ?? block.title ?? '?'
  const position = rd.position ?? 1
  const positions = {
    fingers: rd.fingers ?? [],
    barres: rd.barres ?? [],
    muted: rd.muted ?? [],
  }

  return (
    <div className="inline-block text-center mx-2 mb-4">
      <ChordDiagram
        name={name}
        positions={positions}
        position={position}
        size="full"
      />
    </div>
  )
}

function BlockChordGrid({ block, onChordGridItemClick }: { block: MaterialBlock; onChordGridItemClick?: (block: MaterialBlock, chord: any, index: number) => void }) {
  const renderData = getBlockRenderData(block)
  const content = getBlockContent(block)
  const renderChords = renderData.chords
  const contentChords = Array.isArray(content.chords) ? content.chords : []
  const chords = renderChords?.length ? renderChords : contentChords
  const [resolvedChords, setResolvedChords] = useState<any[]>([])

  useEffect(() => {
    let cancelled = false

    async function resolveChords() {
      setResolvedChords([])
      const next: any[] = []

      for (const chord of chords) {
        if (typeof chord !== 'string') {
          next.push(chord)
          continue
        }

        try {
          const resolved = await resolveGuitarChordFromLibrary(chord)
          if (resolved) {
            next.push(resolved)
            continue
          }
        } catch (error) {
          if (import.meta.env.DEV) {
            console.warn('[ChordGrid] Erro ao buscar chord_library real:', chord, error)
          }
        }

        if (import.meta.env.DEV) {
          console.warn('[ChordGrid] Acorde nao encontrado na chord_library real:', chord)
        }

        if (shouldAllowLocalChordFallback(chord)) {
          const found = lookupGuitarChord(chord)
          if (found) {
            next.push({
              chord_name: chord,
              name: chord,
              source: 'fallback',
              fingers: found.positions.fingers ?? [],
              barres: found.positions.barres ?? [],
              muted: found.positions.muted ?? [],
              position: found.baseFret,
            } satisfies ResolvedGridChord)
            continue
          }
        }

        next.push({ ...notFoundGridChord(chord), _fallbackTextOnly: true })
      }

      if (!cancelled) setResolvedChords(next)
    }

    resolveChords()
    return () => {
      cancelled = true
    }
  }, [chords])

  const normalizedChords = resolvedChords.length === chords.length ? resolvedChords : chords.map((chord: any) => (
    typeof chord === 'string'
      ? { chord_name: chord, name: chord, fingers: [], barres: [], muted: [], _fallbackTextOnly: true, source: 'loading' }
      : chord
  ))
  const canRenderAsDiagrams = normalizedChords.length > 0 && normalizedChords.some((chord: any) => Array.isArray(chord?.fingers) && chord.fingers.length > 0)
  const configuredColumns = (renderData.columns as number) ?? 3
  const chordColumns = Math.min(Math.max(normalizedChords.length, 1), Math.max(configuredColumns, 1), 4)

  return (
    <div className="mb-4">
      {block.title && <h3 className="font-bold text-[14px] text-text mb-3">{block.title}</h3>}
      {!canRenderAsDiagrams ? (
        <div className="flex flex-wrap gap-2 justify-center">
          {normalizedChords.map((chord: any, i: number) => (
            <div
              key={`${chord.chord_name ?? chord.name ?? chord}-${i}`}
              className="rounded-full border border-border bg-bg2 px-3 py-1 text-[13px] font-medium text-text"
            >
              {chord.chord_name ?? chord.name ?? chord}
            </div>
          ))}
        </div>
      ) : (
        <div
          className="mx-auto grid gap-4 justify-center"
          style={{
            gridTemplateColumns: `repeat(${chordColumns}, minmax(0, 140px))`,
            width: 'fit-content',
            maxWidth: '100%',
          }}
        >
          {normalizedChords.map((chord: any, i: number) => (
            <button
              key={i}
              type="button"
              className="rounded-[12px] p-1 transition-colors hover:bg-bg2/40"
              onClick={() => onChordGridItemClick?.(block, chord, i)}
            >
              <ChordDiagram
                name={chord.chord_name ?? chord.name ?? '?'}
                positions={{
                  fingers: chord.fingers ?? [],
                  barres: chord.barres ?? [],
                  muted: chord.muted ?? [],
                }}
                position={chord.position ?? 1}
                size="full"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function BlockNotation({ block, onLegacyNotationStavePointerDown, onMusicStableRender }: { block: MaterialBlock; onLegacyNotationStavePointerDown?: (staveIndex: number) => void; onMusicStableRender?: MusicStableRenderHandler }) {
  const rd = getBlockRenderData(block)
  const alphaTex = typeof rd.alphaTex === 'string' ? rd.alphaTex.trim() : ''
  const hasPreview = rd.notation || rd.notation_data || (rd.notes && rd.notes.length > 0) || alphaTex
  const shouldRenderStructuredNotation = Boolean(rd.notation || rd.notation_data || (rd.notes && rd.notes.length > 0))
  if (!hasPreview) return null

  return (
    <div className="mb-4">
      {block.title && <h3 className="font-bold text-[14px] text-text mb-2">{block.title}</h3>}
      {!shouldRenderStructuredNotation && alphaTex ? (
        <AlphaTabViewer
          tex={alphaTex}
          minHeight={130}
          scale={1}
          staveProfile="score"
          purpose="canvas-notation-score"
          layout="page"
          showTimeSignature={hasExplicitAlphaTexTimeSignature(alphaTex)}
          className="notation-container"
          onStableRender={(html) => onMusicStableRender?.(block, html)}
        />
      ) : (
        <NotationPreviewCompat
          notation={rd.notation as any}
          notationData={rd.notation_data}
          notes={rd.notes as any[]}
          onLegacyStavePointerDown={onLegacyNotationStavePointerDown}
          clef={rd.clef ?? 'treble'}
          timeSignature={rd.time_signature}
          keySignature={rd.key_signature}
          width={rd.width ?? 500}
          onStableRender={(html) => onMusicStableRender?.(block, html)}
        />
      )}
    </div>
  )
}

function BlockRhythm({ block, onMusicStableRender }: { block: MaterialBlock; onMusicStableRender?: MusicStableRenderHandler }) {
  return (
    <div className="mb-4">
      {block.title && <h3 className="font-bold text-[14px] text-text mb-2">{block.title}</h3>}
      <AlphaTexInlineRenderer tex={RHYTHM_FIGURES_TEX} minHeight={110} scale={0.72} purpose="canvas-rhythm-score" onStableRender={(html) => onMusicStableRender?.(block, html)} />
      <div className="flex justify-around mt-2 px-4">
        {RHYTHM_FIGURES.map(f => (
          <div key={f.duration} className="text-center">
            <div className="text-[12px] font-bold text-text">{f.namePt}</div>
            <div className="text-[10px] text-text3">{f.beats}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function BlockExercise({ block, onLegacyNotationStavePointerDown, onMusicStableRender }: { block: MaterialBlock; onLegacyNotationStavePointerDown?: (staveIndex: number) => void; onMusicStableRender?: MusicStableRenderHandler }) {
  const rd = getBlockRenderData(block)
  const content = getBlockContent(block)
  const hasPreview = !!(rd.notation || rd.notation_data || (rd.notes && rd.notes.length > 0))
  const hasTab = rd.tab
  const hasContent = content.html || content.text

  return (
    <div className="mb-4 p-4 bg-advance/10 border border-advance/20 rounded-[var(--radius-sm)]">
      <div className="flex items-start gap-2 mb-2">
        <Target size={18} className="text-advance shrink-0 mt-0.5" weight="bold" />
        {renderTitle(block, 'font-bold text-[14px] text-advance [&_p]:mb-0') ?? (
          <h3 className="font-bold text-[14px] text-advance">Exercício</h3>
        )}
      </div>
      {hasContent && <div className="text-[13px] text-text2 mb-3">{renderContent(content)}</div>}
      {hasPreview && (
        <NotationPreviewCompat
          notation={rd.notation as any}
          notationData={rd.notation_data}
          notes={rd.notes as any[]}
          onLegacyStavePointerDown={onLegacyNotationStavePointerDown}
          clef={rd.clef ?? 'treble'}
          timeSignature={rd.time_signature}
          keySignature={rd.key_signature}
          width={rd.width ?? 450}
          className="mb-3"
          onStableRender={(html) => onMusicStableRender?.(block, html)}
        />
      )}
      {hasTab && <Tablature tab={rd.tab} />}
    </div>
  )
}

function BlockTip({ block, onLegacyNotationStavePointerDown, onMusicStableRender }: { block: MaterialBlock; onLegacyNotationStavePointerDown?: (staveIndex: number) => void; onMusicStableRender?: MusicStableRenderHandler }) {
  const content = getBlockContent(block)
  const renderData = getBlockRenderData(block)
  return (
    <div className="mb-4 p-4 bg-dourado-soft border border-dourado/20 rounded-[var(--radius-sm)]">
      <div className="flex items-start gap-2">
        <Lightbulb size={18} className="text-dourado shrink-0 mt-0.5" weight="fill" />
        <div>
          {renderTitle(block, 'font-bold text-[13px] text-dourado mb-1 [&_p]:mb-0')}
          <div className="text-[12px] text-text2">{renderContent(content)}</div>
        </div>
      </div>
      {(renderData.notation || renderData.notation_data) && (
        <NotationPreviewCompat
          notation={renderData.notation as any}
          notationData={renderData.notation_data}
          onLegacyStavePointerDown={onLegacyNotationStavePointerDown}
          className="mt-3"
          onStableRender={(html) => onMusicStableRender?.(block, html)}
        />
      )}
    </div>
  )
}

function BlockTablature({ block }: { block: MaterialBlock }) {
  const renderData = getBlockRenderData(block)
  const content = getBlockContent(block)
  const alphaTex = typeof renderData.alphaTex === 'string' ? renderData.alphaTex.trim() : ''
  const tab = renderData.tab ?? content.text ?? ''
  return (
    <div className="mb-4">
      {block.title && <h3 className="font-bold text-[14px] text-text mb-2">{block.title}</h3>}
      {alphaTex ? (
        <AlphaTexInlineRenderer
          tex={alphaTex}
          minHeight={120}
          scale={0.8}
          staveProfile="tab"
          purpose="canvas-tablature-tab"
        />
      ) : (
        <Tablature tab={tab} title="" />
      )}
    </div>
  )
}

function BlockBadge({ block }: { block: MaterialBlock }) {
  const emoji = block.render_data?.emoji ?? '🏆'
  const points = block.render_data?.points ?? 0
  return (
    <div className="mb-4 p-4 bg-dourado-soft border border-dourado/20 rounded-[var(--radius-sm)] text-center">
      <Trophy size={24} className="text-dourado mx-auto mb-1" weight="fill" />
      <div className="text-2xl mb-1">{emoji}</div>
      <div className="font-bold text-[14px] text-dourado">{block.title ?? 'Conquista'}</div>
      {points > 0 && <div className="text-[11px] text-text3">+{points} XP</div>}
    </div>
  )
}

// ─── Bloco Áudio ────────────────────────────────────────────────────

function BlockAudio({ block }: { block: MaterialBlock }) {
  const url = block.render_data?.url as string | undefined
  const caption = block.render_data?.caption as string | undefined

  if (url) {
    return (
      <div className="mb-4">
        {block.title && <h3 className="font-bold text-[14px] text-text mb-2">{block.title}</h3>}
        <audio controls className="w-full" preload="metadata">
          <source src={url} />
          Seu navegador não suporta o elemento de áudio.
        </audio>
        {caption && <div className="text-[11px] text-text3 mt-1 italic">{caption}</div>}
      </div>
    )
  }

  return (
    <div className="mb-4 p-6 bg-bg2 border border-dashed border-border rounded-[var(--radius-sm)] text-center text-text3 text-[12px]">
      {block.title && <h3 className="font-bold text-[14px] text-text mb-2">{block.title}</h3>}
      Áudio — adicione uma URL pelo painel lateral
    </div>
  )
}

// ─── Bloco Vídeo ────────────────────────────────────────────────────

function extractVideoEmbed(url: string): { type: 'youtube' | 'vimeo' | 'unknown'; embedUrl: string } | null {
  if (!url) return null
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/)
  if (ytMatch) return { type: 'youtube', embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}` }
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
  if (vimeoMatch) return { type: 'vimeo', embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}` }
  return { type: 'unknown', embedUrl: url }
}

function BlockVideo({ block }: { block: MaterialBlock }) {
  const url = block.render_data?.url as string | undefined
  const caption = block.render_data?.caption as string | undefined
  const embed = url ? extractVideoEmbed(url) : null

  if (embed && (embed.type === 'youtube' || embed.type === 'vimeo')) {
    return (
      <div className="mb-4">
        {block.title && <h3 className="font-bold text-[14px] text-text mb-2">{block.title}</h3>}
        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
          <iframe
            src={embed.embedUrl}
            className="absolute inset-0 w-full h-full rounded-lg"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={block.title ?? 'Vídeo'}
          />
        </div>
        {caption && <div className="text-[11px] text-text3 mt-1 italic">{caption}</div>}
      </div>
    )
  }

  if (url) {
    return (
      <div className="mb-4">
        {block.title && <h3 className="font-bold text-[14px] text-text mb-2">{block.title}</h3>}
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-azul underline text-[12px]">
          Abrir vídeo: {url}
        </a>
        {caption && <div className="text-[11px] text-text3 mt-1 italic">{caption}</div>}
      </div>
    )
  }

  return (
    <div className="mb-4 p-6 bg-bg2 border border-dashed border-border rounded-[var(--radius-sm)] text-center text-text3 text-[12px]">
      {block.title && <h3 className="font-bold text-[14px] text-text mb-2">{block.title}</h3>}
      Vídeo — cole uma URL do YouTube ou Vimeo pelo painel lateral
    </div>
  )
}

// ─── Bloco Imagem ───────────────────────────────────────────────────

function BlockQrCode({ block }: { block: MaterialBlock }) {
  const url = (block.render_data?.url ?? block.content?.url ?? '') as string
  const caption = block.render_data?.caption as string | undefined
  const [qrSrc, setQrSrc] = useState('')

  useEffect(() => {
    let cancelled = false
    const text = url.trim()
    if (!text) {
      setQrSrc('')
      return
    }

    void QRCodeLib.toDataURL(text, {
      width: 192,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#111827', light: '#ffffff' },
    }).then(src => {
      if (!cancelled) setQrSrc(src)
    }).catch(() => {
      if (!cancelled) setQrSrc('')
    })

    return () => { cancelled = true }
  }, [url])

  return (
    <div className="mb-4 rounded-lg border border-border bg-bg2 p-4 text-center">
      {block.title && <h3 className="font-bold text-[14px] text-text mb-2">{block.title}</h3>}
      {qrSrc ? (
        <img src={qrSrc} alt={block.title ?? 'QR Code'} className="mx-auto h-36 w-36 rounded bg-white p-1" />
      ) : (
        <div className="mx-auto flex h-36 w-36 items-center justify-center rounded border border-dashed border-border bg-white px-3 text-[11px] text-text3">
          QR Code
        </div>
      )}
      {caption && <div className="text-[11px] text-text3 mt-2 italic">{caption}</div>}
      {url && <div className="mt-1 break-all text-[9px] text-text3/70">{url}</div>}
    </div>
  )
}

function BlockImage({ block }: { block: MaterialBlock }) {
  const url = block.render_data?.url ?? block.content?.url
  const alt = block.render_data?.caption ?? block.title ?? 'Imagem'
  const caption = block.render_data?.caption as string | undefined
  const size = (block.render_data?.size as string) ?? 'medium'

  const sizeClass = size === 'small' ? 'max-h-32 max-w-[200px]'
    : size === 'large' ? 'max-h-[400px] max-w-full'
    : size === 'full' ? 'w-full'
    : 'max-h-64 max-w-[400px]' // medium

  if (url) {
    return (
      <div className="mb-4 text-center">
        <img src={url} alt={alt} className={`rounded-lg mx-auto ${sizeClass}`} />
        {caption && <div className="text-[11px] text-text3 mt-1 italic">{caption}</div>}
      </div>
    )
  }

  return (
    <div className="mb-4 p-8 bg-bg2 border border-dashed border-border rounded-[var(--radius-sm)] text-center text-text3 text-[12px]">
      Imagem — arraste ou selecione pelo painel lateral
      {block.title && <div className="text-[11px] mt-1">{block.title}</div>}
    </div>
  )
}

// ─── Bloco Capa ─────────────────────────────────────────────────────

const COVER_TEMPLATES: Record<string, string> = {
  minimal: 'Minimalista',
  colorful: 'Colorido',
  classic: 'Clássico',
  modern: 'Moderno',
  geometric: 'Geométrico',
  gradient: 'Gradiente',
  musical: 'Musical',
  bold: 'Impactante',
  elegant: 'Elegante',
  vibrant: 'Vibrante',
}

function BlockCover({ block, editable, onPositionChange, titleEditing, onTitleChange, overlayElements, selectedOverlayId, onOverlaySelect, onOverlayUpdate, onOverlayCloneForDrag, textElements, selectedTextId, editingTextId, onTextSelect, onTextUpdate, onTextEditStart, onTextCopy, onTextDuplicate, onTextDelete, onTextCloneForDrag, onTextLayerChange, onLegacyTextActivate }: {
  block: MaterialBlock
  editable?: boolean
  onPositionChange?: (field: string, pos: { x: number; y: number }) => void
  titleEditing?: boolean
  onTitleChange?: (value: string) => void
  overlayElements?: CoverOverlayElement[]
  selectedOverlayId?: string | null
  onOverlaySelect?: (id: string | null) => void
  onOverlayUpdate?: (id: string, patch: Partial<CoverOverlayElement>) => void
  onOverlayCloneForDrag?: (id: string) => CoverOverlayElement | null
  textElements?: CoverTextElement[]
  selectedTextId?: string | null
  editingTextId?: string | null
  onTextSelect?: (id: string | null) => void
  onTextUpdate?: (id: string, patch: Partial<CoverTextElement>) => void
  onTextEditStart?: (id: string | null) => void
  onTextCopy?: (id: string) => void
  onTextDuplicate?: (id: string) => void
  onTextDelete?: (id: string) => void
  onTextCloneForDrag?: (id: string) => CoverTextElement | null
  onTextLayerChange?: (id: string, action: 'front' | 'forward' | 'backward' | 'back') => void
  onLegacyTextActivate?: () => void
}) {
  const rd = block.render_data ?? {}
  const template = (rd.template as string) ?? 'minimal'
  const titulo = (rd.titulo as string) ?? block.title ?? 'Material Didático'
  const subtitulo = (rd.subtitulo as string) ?? ''
  const instrumento = (rd.instrumento as string) ?? ''
  const nivel = (rd.nivel as string) ?? ''
  const professor = (rd.professor as string) ?? ''
  const escola = (rd.escola as string) ?? ''
  const data = (rd.data as string) ?? ''
  const coverImageUrl = (rd.cover_image_url as string) ?? ''
  const logoUrl = (rd.logo_url as string) ?? ''
  const logoSize = (rd.logo_size as number) ?? 80

  // Tipografia legada (fallback se não houver text_elements)
  const titleFontSize = (rd.title_font_size as number) ?? 36
  const titleColor = (rd.title_color as string) ?? ''
  const titleAlign = (rd.title_align as string) ?? 'center'

  // Posições dos grupos (em %)
  const contentPos = (rd.content_pos as { x: number; y: number }) ?? { x: 50, y: 45 }
  const footerPos = (rd.footer_pos as { x: number; y: number }) ?? { x: 50, y: 88 }
  const logoPos = (rd.logo_pos as { x: number; y: number }) ?? { x: 50, y: 8 }

  // text_elements: usa props se disponível, senão lê do render_data, senão fallback legado
  const resolvedTextElements: CoverTextElement[] = textElements
    ?? (rd.text_elements as CoverTextElement[] | undefined)
    ?? []  // vazio = modo legado
  const hasTextElements = resolvedTextElements.length > 0
  const hasLegacyContent = Boolean(
    instrumento.trim() ||
    titulo.trim() ||
    subtitulo.trim() ||
    titleEditing
  )

  const coverRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    field: string
    startMouse: { x: number; y: number }
    startPos: { x: number; y: number }
  } | null>(null)

  // Snap-to-grid: guias ativas (estilo Canva)
  const SNAP_POINTS = [25, 33.3, 50, 66.7, 75]
  const SNAP_THRESHOLD = 2 // % de proximidade para "grudar"
  const [activeGuides, setActiveGuides] = useState<{ x: number | null; y: number | null }>({ x: null, y: null })

  // Safety: sempre limpar guias em mouseup global ou quando sair do modo edição
  useEffect(() => {
    const clear = () => setActiveGuides({ x: null, y: null })
    window.addEventListener('mouseup', clear)
    window.addEventListener('blur', clear)
    return () => {
      window.removeEventListener('mouseup', clear)
      window.removeEventListener('blur', clear)
    }
  }, [])

  useEffect(() => {
    if (!editable) setActiveGuides({ x: null, y: null })
  }, [editable])

  const snapValue = (val: number): { snapped: number; guide: number | null } => {
    for (const sp of SNAP_POINTS) {
      if (Math.abs(val - sp) <= SNAP_THRESHOLD) return { snapped: sp, guide: sp }
    }
    return { snapped: val, guide: null }
  }

  const clampTextBoxWidth = (width: number) => Math.max(10, Math.min(95, Math.round(width * 10) / 10))
  const clampTextBoxCenter = (x: number, width: number) => {
    const half = width / 2
    return Math.max(half, Math.min(100 - half, Math.round(x * 10) / 10))
  }
  const clampCoverTextFontSize = (fontSize: number) => Math.max(12, Math.min(120, Math.round(fontSize)))
  const getTextElementRect = (id: string) => (
    coverRef.current?.querySelector(`[data-cover-text-id="${id}"]`) as HTMLElement | null
  )?.getBoundingClientRect()

  const alignTextToPage = (text: CoverTextElement, axis: 'x' | 'y', position: 'start' | 'center' | 'end') => {
    if (!coverRef.current || !onTextUpdate) return
    const coverRect = coverRef.current.getBoundingClientRect()
    const textRect = getTextElementRect(text.id)
    if (!textRect) return
    const sizePercent = axis === 'x'
      ? (textRect.width / coverRect.width) * 100
      : (textRect.height / coverRect.height) * 100
    const value = position === 'start'
      ? sizePercent / 2
      : position === 'center'
        ? 50
        : 100 - sizePercent / 2
    onTextUpdate(text.id, { [axis]: Math.max(0, Math.min(100, Math.round(value * 10) / 10)) })
  }

  const handleMouseDown = useCallback((e: React.MouseEvent, field: string, pos: { x: number; y: number }) => {
    if (!editable) return
    e.preventDefault()
    e.stopPropagation()
    dragRef.current = { field, startMouse: { x: e.clientX, y: e.clientY }, startPos: { ...pos } }

    const handleMouseMove = (ev: MouseEvent) => {
      if (!dragRef.current || !coverRef.current) return
      const rect = coverRef.current.getBoundingClientRect()
      const dx = ((ev.clientX - dragRef.current.startMouse.x) / rect.width) * 100
      const dy = ((ev.clientY - dragRef.current.startMouse.y) / rect.height) * 100
      const rawX = Math.max(5, Math.min(95, dragRef.current.startPos.x + dx))
      const rawY = Math.max(3, Math.min(97, dragRef.current.startPos.y + dy))
      const sx = snapValue(rawX)
      const sy = snapValue(rawY)
      setActiveGuides({ x: sx.guide, y: sy.guide })
      onPositionChange?.(dragRef.current.field, { x: Math.round(sx.snapped * 10) / 10, y: Math.round(sy.snapped * 10) / 10 })
    }

    const handleMouseUp = () => {
      dragRef.current = null
      setActiveGuides({ x: null, y: null })
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [editable, onPositionChange])

  const hasImage = !!coverImageUrl
  const classes = [
    'block-cover',
    `block-cover--${template}`,
    hasImage && 'block-cover--with-image',
  ].filter(Boolean).join(' ')

  const bgStyle: React.CSSProperties = hasImage
    ? { backgroundImage: `url(${coverImageUrl})`, color: '#fff' }
    : {}

  const hasFooter = professor || escola || data

  return (
    <div
      ref={coverRef}
      className={classes}
      style={bgStyle}
      onMouseDown={e => {
        if (e.target !== e.currentTarget) return
        setActiveGuides({ x: null, y: null })
        onTextSelect?.(null)
        onOverlaySelect?.(null)
        onTextEditStart?.(null)
      }}
      onMouseLeave={() => setActiveGuides({ x: null, y: null })}
    >
      {/* Overlay escuro quando tem imagem de fundo */}
      {hasImage && <div className="cover-overlay" />}

      {/* Guias de snap (estilo Canva) */}
      {editable && activeGuides.x !== null && (
        <div className="cover-snap-guide cover-snap-guide--v pointer-events-none" style={{ left: `${activeGuides.x}%` }} />
      )}
      {editable && activeGuides.y !== null && (
        <div className="cover-snap-guide cover-snap-guide--h pointer-events-none" style={{ top: `${activeGuides.y}%` }} />
      )}

      {/* Decorações específicas do template */}
      {template === 'colorful' && (
        <div className="cover-decoration" style={{ top: -30, right: -30 }}>
          <MusicNotes size={120} weight="thin" />
        </div>
      )}
      {template === 'geometric' && (
        <>
          <div className="cover-deco-1" />
          <div className="cover-deco-2" />
          <div className="cover-deco-3" />
        </>
      )}
      {template === 'musical' && (
        <div className="cover-deco-1">
          <MusicNotes size={300} weight="thin" />
        </div>
      )}
      {template === 'bold' && <div className="cover-deco-1" />}
      {template === 'elegant' && <div className="cover-deco-1" />}
      {template === 'vibrant' && (
        <>
          <div className="cover-deco-1" />
          <div className="cover-deco-2" />
        </>
      )}

      {/* Logomarca — posição absoluta, arrastável */}
      {logoUrl && (
        <div
          className={`cover-logo ${editable ? 'cover-draggable' : ''}`}
          style={{
            position: 'absolute',
            left: `${logoPos.x}%`,
            top: `${logoPos.y}%`,
            transform: 'translate(-50%, -50%)',
            zIndex: 30,
          }}
          onMouseDown={e => handleMouseDown(e, 'logo_pos', logoPos)}
        >
          <img
            src={logoUrl}
            alt="Logomarca"
            style={{ height: `${logoSize}px`, width: 'auto', maxWidth: '280px', objectFit: 'contain', pointerEvents: 'none' }}
            draggable={false}
          />
        </div>
      )}

      {/* ── Text Elements (modo avançado) ── */}
      {hasTextElements && resolvedTextElements.map((text) => (
        <div
          key={text.id}
          data-cover-text-id={text.id}
          className={`cover-text-box absolute select-none ${editable ? 'cursor-move' : ''} ${
            selectedTextId === text.id ? 'cover-text-box--selected' : ''
          }`}
          style={{
            left: `${text.x}%`,
            top: `${text.y}%`,
            transform: 'translate(-50%, -50%)',
            width: `${text.maxWidth ?? 60}%`,
            maxWidth: '95%',
            zIndex: text.zIndex,
            fontFamily: `'${text.fontFamily}', sans-serif`,
            fontSize: `${text.fontSize}px`,
            fontWeight: text.fontWeight,
            fontStyle: text.fontStyle === 'italic' ? 'italic' : 'normal',
            color: text.color,
            textAlign: text.align,
            textTransform: text.uppercase ? 'uppercase' : 'none',
            letterSpacing: `${text.letterSpacing}px`,
            lineHeight: text.lineHeight,
            textShadow: text.shadow.enabled
              ? `${text.shadow.offsetX}px ${text.shadow.offsetY}px ${text.shadow.blur}px ${text.shadow.color}`
              : 'none',
            WebkitTextStroke: text.outline.enabled
              ? `${text.outline.width}px ${text.outline.color}`
              : undefined,
            paintOrder: text.outline.enabled ? 'stroke fill' : undefined,
            backgroundColor: text.background.enabled ? text.background.color : 'transparent',
            padding: text.background.enabled ? `${text.background.padding}px` : '0',
            borderRadius: text.background.enabled ? `${text.background.borderRadius}px` : '0',
          }}
          onMouseDown={e => {
            if (!editable) return
            e.preventDefault()
            e.stopPropagation()
            if (!onTextUpdate) return
            const container = coverRef.current
            if (!container) return
            const rect = container.getBoundingClientRect()
            const startX = e.clientX
            const startY = e.clientY
            let dragTextId = text.id
            let startElX = text.x
            let startElY = text.y
            let clonedForDrag = false

            const ensureCloneForDrag = () => {
              if (clonedForDrag) return
              const clone = onTextCloneForDrag?.(text.id)
              if (!clone) return
              clonedForDrag = true
              dragTextId = clone.id
              startElX = clone.x
              startElY = clone.y
              onTextSelect?.(clone.id)
            }

            if (e.altKey) {
              ensureCloneForDrag()
            } else {
              onTextSelect?.(text.id)
            }

            const move = (ev: MouseEvent) => {
              if (ev.altKey) ensureCloneForDrag()
              const dx = ((ev.clientX - startX) / rect.width) * 100
              const dy = ((ev.clientY - startY) / rect.height) * 100
              const sx = snapValue(startElX + dx)
              const sy = snapValue(startElY + dy)
              setActiveGuides({ x: sx.guide, y: sy.guide })
              onTextUpdate(dragTextId, {
                x: Math.max(0, Math.min(100, Math.round(sx.snapped * 10) / 10)),
                y: Math.max(0, Math.min(100, Math.round(sy.snapped * 10) / 10)),
              })
            }
            const up = () => {
              setActiveGuides({ x: null, y: null })
              document.removeEventListener('mousemove', move)
              document.removeEventListener('mouseup', up)
            }
            document.addEventListener('mousemove', move)
            document.addEventListener('mouseup', up)
          }}
          onClick={e => { e.stopPropagation(); onTextSelect?.(text.id) }}
          onDoubleClick={e => { e.stopPropagation(); onTextEditStart?.(text.id) }}
        >
          {editable && selectedTextId === text.id && editingTextId !== text.id && onTextUpdate && (
            <>
              <div
                className="cover-text-toolbar"
                onMouseDown={e => {
                  e.stopPropagation()
                }}
                onClick={e => e.stopPropagation()}
              >
                <button type="button" title="Editar texto" onClick={() => onTextEditStart?.(text.id)}>
                  <PencilSimple size={20} weight="bold" />
                </button>
                <button type="button" title="Duplicar" onClick={() => onTextDuplicate?.(text.id)}>
                  <Copy size={20} weight="bold" />
                </button>
                <button type="button" title="Excluir" onClick={() => onTextDelete?.(text.id)}>
                  <Trash size={20} weight="bold" />
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      title="Menu de acoes"
                      onMouseDown={event => {
                        event.stopPropagation()
                      }}
                    >
                      <DotsThree size={22} weight="bold" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="center"
                    sideOffset={10}
                    className="w-72 rounded-2xl border-border/70 bg-card p-2 text-text shadow-xl"
                    onMouseDown={event => {
                      event.stopPropagation()
                    }}
                    onClick={event => {
                      event.stopPropagation()
                    }}
                  >
                    <DropdownMenuItem className="h-10 rounded-xl px-3 text-[15px]" onSelect={() => onTextCopy?.(text.id)}>
                      <Copy size={18} weight="bold" />
                      <span>Copiar</span>
                      <DropdownMenuShortcut>Ctrl+C</DropdownMenuShortcut>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="h-10 rounded-xl px-3 text-[15px]" onSelect={() => onTextDuplicate?.(text.id)}>
                      <Copy size={18} weight="bold" />
                      <span>Duplicar</span>
                      <DropdownMenuShortcut>Ctrl+D</DropdownMenuShortcut>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="h-10 rounded-xl px-3 text-[15px]" variant="destructive" onSelect={() => onTextDelete?.(text.id)}>
                      <Trash size={18} weight="bold" />
                      <span>Excluir</span>
                      <DropdownMenuShortcut>Delete</DropdownMenuShortcut>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="h-10 rounded-xl px-3 text-[15px]">
                        <Stack size={18} weight="bold" />
                        <span>Camada</span>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="w-64 rounded-2xl border-border/70 bg-card p-2 text-text shadow-xl">
                        <DropdownMenuItem className="h-10 rounded-xl px-3 text-[15px]" onSelect={() => onTextLayerChange?.(text.id, 'front')}>
                          <ArrowLineUp size={18} weight="bold" />
                          <span>Trazer a frente</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="h-10 rounded-xl px-3 text-[15px]" onSelect={() => onTextLayerChange?.(text.id, 'forward')}>
                          <ArrowUp size={18} weight="bold" />
                          <span>Para frente</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="h-10 rounded-xl px-3 text-[15px]" onSelect={() => onTextLayerChange?.(text.id, 'backward')}>
                          <ArrowDown size={18} weight="bold" />
                          <span>Mover para tras</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="h-10 rounded-xl px-3 text-[15px]" onSelect={() => onTextLayerChange?.(text.id, 'back')}>
                          <ArrowLineDown size={18} weight="bold" />
                          <span>Enviar para tras</span>
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="h-10 rounded-xl px-3 text-[15px]">
                        <AlignCenterHorizontal size={18} weight="bold" />
                        <span>Alinhar a pagina</span>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="w-60 rounded-2xl border-border/70 bg-card p-2 text-text shadow-xl">
                        <DropdownMenuItem className="h-10 rounded-xl px-3 text-[15px]" onSelect={() => alignTextToPage(text, 'x', 'start')}>
                          <AlignLeft size={18} weight="bold" />
                          <span>A esquerda</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="h-10 rounded-xl px-3 text-[15px]" onSelect={() => alignTextToPage(text, 'x', 'center')}>
                          <AlignCenterHorizontal size={18} weight="bold" />
                          <span>Ao centro</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="h-10 rounded-xl px-3 text-[15px]" onSelect={() => alignTextToPage(text, 'x', 'end')}>
                          <AlignRight size={18} weight="bold" />
                          <span>A direita</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="h-10 rounded-xl px-3 text-[15px]" onSelect={() => alignTextToPage(text, 'y', 'start')}>
                          <AlignTop size={18} weight="bold" />
                          <span>Em cima</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="h-10 rounded-xl px-3 text-[15px]" onSelect={() => alignTextToPage(text, 'y', 'center')}>
                          <AlignCenterVertical size={18} weight="bold" />
                          <span>No meio</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="h-10 rounded-xl px-3 text-[15px]" onSelect={() => alignTextToPage(text, 'y', 'end')}>
                          <AlignBottom size={18} weight="bold" />
                          <span>Embaixo</span>
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {(['left', 'right'] as const).map(side => (
                <button
                  key={side}
                  type="button"
                  aria-label={side === 'left' ? 'Redimensionar pela esquerda' : 'Redimensionar pela direita'}
                  className={`cover-text-resize-handle cover-text-resize-handle--${side}`}
                  onMouseDown={e => {
                    e.preventDefault()
                    e.stopPropagation()
                    onTextSelect?.(text.id)
                    const container = coverRef.current
                    const targetEl = e.currentTarget.parentElement as HTMLElement | null
                    if (!container || !targetEl) return

                    const rect = container.getBoundingClientRect()
                    const startX = text.x
                    const startWidth = text.maxWidth ?? 60
                    const startLeft = startX - startWidth / 2
                    const startRight = startX + startWidth / 2
                    let pending: { x: number; maxWidth: number } | null = null
                    let finalPatch = { x: startX, maxWidth: startWidth }
                    let frame: number | null = null

                    const flush = () => {
                      frame = null
                      if (!pending) return
                      finalPatch = pending
                      targetEl.style.left = `${finalPatch.x}%`
                      targetEl.style.width = `${finalPatch.maxWidth}%`
                      pending = null
                    }

                    const move = (ev: MouseEvent) => {
                      const pointerX = ((ev.clientX - rect.left) / rect.width) * 100
                      if (side === 'right') {
                        const nextRight = Math.max(startLeft + 10, Math.min(100, pointerX))
                        const nextWidth = clampTextBoxWidth(nextRight - startLeft)
                        pending = {
                          maxWidth: nextWidth,
                          x: clampTextBoxCenter(startLeft + nextWidth / 2, nextWidth),
                        }
                      } else {
                        const nextLeft = Math.min(startRight - 10, Math.max(0, pointerX))
                        const nextWidth = clampTextBoxWidth(startRight - nextLeft)
                        pending = {
                          maxWidth: nextWidth,
                          x: clampTextBoxCenter(startRight - nextWidth / 2, nextWidth),
                        }
                      }

                      if (frame === null) {
                        frame = window.requestAnimationFrame(flush)
                      }
                    }

                    const up = () => {
                      if (frame !== null) {
                        window.cancelAnimationFrame(frame)
                        flush()
                      }
                      targetEl.style.willChange = ''
                      onTextUpdate(text.id, finalPatch)
                      document.removeEventListener('mousemove', move)
                      document.removeEventListener('mouseup', up)
                    }

                    targetEl.style.willChange = 'left, width'
                    document.addEventListener('mousemove', move)
                    document.addEventListener('mouseup', up)
                  }}
                />
              ))}
              {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const).map(corner => (
                <button
                  key={corner}
                  type="button"
                  aria-label="Escalar texto"
                  className={`cover-text-scale-handle cover-text-scale-handle--${corner}`}
                  onMouseDown={e => {
                    e.preventDefault()
                    e.stopPropagation()
                    onTextSelect?.(text.id)
                    const targetEl = e.currentTarget.parentElement as HTMLElement | null
                    const container = coverRef.current
                    if (!targetEl || !container) return

                    const rect = container.getBoundingClientRect()
                    const box = targetEl.getBoundingClientRect()
                    const isRight = corner.endsWith('right')
                    const isBottom = corner.startsWith('bottom')
                    const anchor = {
                      x: isRight ? box.left : box.right,
                      y: isBottom ? box.top : box.bottom,
                    }
                    const startCenter = {
                      x: box.left + box.width / 2,
                      y: box.top + box.height / 2,
                    }
                    const horizontalSign = isRight ? 1 : -1
                    const verticalSign = isBottom ? 1 : -1
                    const startDistance = Math.max(12, Math.hypot(box.width, box.height))
                    const startCenterDistance = Math.max(12, Math.hypot(e.clientX - startCenter.x, e.clientY - startCenter.y))
                    const startFontSize = text.fontSize
                    const startWidthPx = Math.max(12, box.width)
                    const startHeightPx = Math.max(12, box.height)
                    const startWidthPercent = text.maxWidth ?? 60
                    let pending: { x: number; y: number; fontSize: number; maxWidth: number } | null = null
                    let finalPatch = { x: text.x, y: text.y, fontSize: startFontSize, maxWidth: startWidthPercent }
                    let finalFontSize = startFontSize
                    let frame: number | null = null

                    const flush = () => {
                      frame = null
                      if (!pending) return
                      finalPatch = pending
                      finalFontSize = pending.fontSize
                      targetEl.style.left = `${pending.x}%`
                      targetEl.style.top = `${pending.y}%`
                      targetEl.style.fontSize = `${finalFontSize}px`
                      targetEl.style.width = `${pending.maxWidth}%`
                      pending = null
                    }

                    const move = (ev: MouseEvent) => {
                      const pointer = {
                        x: Math.max(rect.left, Math.min(rect.right, ev.clientX)),
                        y: Math.max(rect.top, Math.min(rect.bottom, ev.clientY)),
                      }
                      const scaleFromCenter = ev.altKey
                      const currentDistance = scaleFromCenter
                        ? Math.max(4, Math.hypot(pointer.x - startCenter.x, pointer.y - startCenter.y))
                        : Math.max(4, Math.hypot(pointer.x - anchor.x, pointer.y - anchor.y))
                      const baseDistance = scaleFromCenter ? startCenterDistance : startDistance
                      const scale = Math.max(0.35, Math.min(3, currentDistance / baseDistance))
                      const scaledWidthPx = startWidthPx * scale
                      const scaledHeightPx = startHeightPx * scale
                      const cornerPoint = scaleFromCenter
                        ? null
                        : {
                          x: anchor.x + scaledWidthPx * horizontalSign,
                          y: anchor.y + scaledHeightPx * verticalSign,
                        }
                      const nextLeft = scaleFromCenter ? startCenter.x - scaledWidthPx / 2 : Math.min(anchor.x, cornerPoint!.x)
                      const nextTop = scaleFromCenter ? startCenter.y - scaledHeightPx / 2 : Math.min(anchor.y, cornerPoint!.y)
                      const nextCenter = scaleFromCenter
                        ? startCenter
                        : {
                          x: nextLeft + scaledWidthPx / 2,
                          y: nextTop + scaledHeightPx / 2,
                        }
                      pending = {
                        x: Math.max(0, Math.min(100, Math.round(((nextCenter.x - rect.left) / rect.width) * 1000) / 10)),
                        y: Math.max(0, Math.min(100, Math.round(((nextCenter.y - rect.top) / rect.height) * 1000) / 10)),
                        fontSize: clampCoverTextFontSize(startFontSize * scale),
                        maxWidth: clampTextBoxWidth((scaledWidthPx / rect.width) * 100),
                      }
                      if (frame === null) {
                        frame = window.requestAnimationFrame(flush)
                      }
                    }

                    const up = () => {
                      if (frame !== null) {
                        window.cancelAnimationFrame(frame)
                        flush()
                      }
                      targetEl.style.willChange = ''
                      onTextUpdate(text.id, finalPatch)
                      document.removeEventListener('mousemove', move)
                      document.removeEventListener('mouseup', up)
                    }

                    targetEl.style.willChange = 'left, top, font-size, width'
                    document.addEventListener('mousemove', move)
                    document.addEventListener('mouseup', up)
                  }}
                />
              ))}
            </>
          )}
          {editingTextId === text.id ? (
            <input
              type="text"
              value={text.content}
              onChange={e => onTextUpdate?.(text.id, { content: e.target.value })}
              onBlur={() => onTextEditStart?.(null)}
              onKeyDown={e => { if (e.key === 'Enter') onTextEditStart?.(null) }}
              autoFocus
              className="bg-transparent border-b-2 border-[#8B5CF6] outline-none text-center w-full"
              style={{ fontSize: 'inherit', fontWeight: 'inherit', color: 'inherit', fontFamily: 'inherit', letterSpacing: 'inherit', textTransform: 'inherit' as any }}
              onClick={e => e.stopPropagation()}
              onMouseDown={e => e.stopPropagation()}
            />
          ) : (
            <span className="pointer-events-none block w-full">{text.content}</span>
          )}
        </div>
      ))}

      {/* ── Conteúdo legado (se não tem text_elements) ── */}
      {!hasTextElements && hasLegacyContent && (
        <div
          className={`cover-content ${editable ? 'cover-draggable cover-legacy-text-selectable' : ''}`}
          style={{
            position: 'absolute',
            left: `${contentPos.x}%`,
            top: `${contentPos.y}%`,
            transform: 'translate(-50%, -50%)',
          }}
          onMouseDown={e => {
            if (editable && onLegacyTextActivate) {
              e.preventDefault()
              e.stopPropagation()
              onLegacyTextActivate()
              return
            }
            handleMouseDown(e, 'content_pos', contentPos)
          }}
          onClick={e => e.stopPropagation()}
        >
          {instrumento && (
            <div className="cover-instrument">{instrumento}{nivel ? ` · ${nivel}` : ''}</div>
          )}
          {titleEditing && onTitleChange ? (
            <input
              className="cover-title"
              value={titulo}
              onChange={e => onTitleChange(e.target.value)}
              autoFocus
              onClick={e => e.stopPropagation()}
              onMouseDown={e => e.stopPropagation()}
              style={{ background: 'rgba(0,0,0,.2)', border: 'none', outline: '2px dashed rgba(255,255,255,.5)', outlineOffset: '4px', textAlign: titleAlign as any, width: '100%', color: titleColor || 'inherit', padding: '8px 12px', borderRadius: '8px', fontSize: `${titleFontSize}px` }}
            />
          ) : titulo.trim() ? (
            <h1 className="cover-title" style={{ fontSize: `${titleFontSize}px`, ...(titleColor ? { color: titleColor } : {}), textAlign: titleAlign as any }}>{titulo}</h1>
          ) : null}
          {subtitulo && <p className="cover-subtitle">{subtitulo}</p>}
        </div>
      )}

      {/* Overlay Elements — acima do background, abaixo do texto */}
      {(overlayElements ?? ((rd.overlay_elements as CoverOverlayElement[]) || []))
        .sort((a, b) => a.zIndex - b.zIndex)
        .map((el) => (
          <div
            key={el.id}
            data-cover-overlay-id={el.id}
            role={editable ? 'button' : undefined}
            tabIndex={editable ? 0 : undefined}
            aria-label={el.label}
            className={`absolute select-none ${
              editable ? 'cursor-move' : ''
            } ${
              selectedOverlayId === el.id ? 'ring-2 ring-[#6366F1] ring-offset-1' : ''
            }`}
            style={{
              left: `${el.x}%`,
              top: `${el.y}%`,
              width: `${el.width}%`,
              minHeight: '14px',
              padding: '6px 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxSizing: 'border-box',
              transform: `translate(-50%, -50%) rotate(${el.rotation}deg)${el.flipX ? ' scaleX(-1)' : ''}`,
              opacity: el.opacity,
              zIndex: el.zIndex + 10,
              filter: el.shadow ? 'drop-shadow(2px 4px 6px rgba(0,0,0,0.4))' : 'none',
              transition: 'box-shadow 0.15s',
            }}
            onMouseDown={e => {
              if (!editable || !onOverlayUpdate) return
              e.preventDefault()
              e.stopPropagation()
              const container = coverRef.current
              if (!container) return
              const rect = container.getBoundingClientRect()
              const targetEl = e.currentTarget
              const startX = e.clientX
              const startY = e.clientY
              let dragOverlayId = el.id
              let startElX = el.x
              let startElY = el.y
              let isCloneDrag = false
              let pendingPosition: { x: number; y: number } | null = null
              let finalPosition = { x: startElX, y: startElY }
              let animationFrame: number | null = null

              const ensureCloneForDrag = () => {
                if (isCloneDrag) return
                const clone = onOverlayCloneForDrag?.(el.id)
                if (!clone) return
                isCloneDrag = true
                dragOverlayId = clone.id
                startElX = clone.x
                startElY = clone.y
                finalPosition = { x: startElX, y: startElY }
                onOverlaySelect?.(clone.id)
              }

              if (e.altKey) {
                ensureCloneForDrag()
              } else {
                onOverlaySelect?.(el.id)
              }

              const flushPosition = () => {
                animationFrame = null
                if (!pendingPosition) return
                finalPosition = pendingPosition
                if (isCloneDrag) {
                  onOverlayUpdate(dragOverlayId, finalPosition)
                } else {
                  targetEl.style.left = `${finalPosition.x}%`
                  targetEl.style.top = `${finalPosition.y}%`
                }
                pendingPosition = null
              }

              const move = (ev: MouseEvent) => {
                if (ev.altKey) ensureCloneForDrag()
                const dx = ((ev.clientX - startX) / rect.width) * 100
                const dy = ((ev.clientY - startY) / rect.height) * 100
                const rawX = startElX + dx
                const rawY = startElY + dy
                const sx = snapValue(rawX)
                const sy = snapValue(rawY)
                setActiveGuides({ x: sx.guide, y: sy.guide })
                pendingPosition = {
                  x: Math.max(0, Math.min(100, Math.round(sx.snapped * 10) / 10)),
                  y: Math.max(0, Math.min(100, Math.round(sy.snapped * 10) / 10)),
                }
                if (animationFrame === null) {
                  animationFrame = window.requestAnimationFrame(flushPosition)
                }
              }
              const up = () => {
                if (animationFrame !== null) {
                  window.cancelAnimationFrame(animationFrame)
                  flushPosition()
                }
                targetEl.style.willChange = ''
                setActiveGuides({ x: null, y: null })
                onOverlayUpdate(dragOverlayId, finalPosition)
                document.removeEventListener('mousemove', move)
                document.removeEventListener('mouseup', up)
              }
              if (!isCloneDrag) targetEl.style.willChange = 'left, top'
              document.addEventListener('mousemove', move)
              document.addEventListener('mouseup', up)
            }}
            onClick={e => { e.stopPropagation(); onOverlaySelect?.(el.id) }}
          >
            <img
              src={el.image_url}
              alt={el.label}
              className="w-full h-auto pointer-events-none select-none block"
              draggable={false}
            />
          </div>
        ))}

      {hasFooter && (
        <div
          className={`cover-footer ${editable ? 'cover-draggable' : ''}`}
          style={{
            position: 'absolute',
            left: `${footerPos.x}%`,
            top: `${footerPos.y}%`,
            transform: 'translate(-50%, -50%)',
          }}
          onMouseDown={e => handleMouseDown(e, 'footer_pos', footerPos)}
        >
          {professor && <div className="cover-professor">{professor}</div>}
          {escola && <div className="cover-escola">{escola}</div>}
          {data && <div className="cover-data">{data}</div>}
        </div>
      )}
    </div>
  )
}

// ─── Bloco Piano/Teclado ────────────────────────────────────────────

function BlockKeyboard({ block }: { block: MaterialBlock }) {
  const rd = getBlockRenderData(block)
  const chordName = (rd.chord_name as string) ?? block.title ?? ''
  const displayData = keyboardEntryToDisplayData(rd, chordName)
  const chords = Array.isArray(rd.chords) ? rd.chords as Array<Record<string, unknown>> : []
  const chordColumns = Math.min(Math.max(chords.length, 1), 2)

  if (chords.length > 0) {
    return (
      <div className="mb-4">
        {block.title && <h3 className="font-bold text-[14px] text-text mb-3">{block.title}</h3>}
        <div
          className="mx-auto grid gap-4"
          style={{
            gridTemplateColumns: `repeat(${chordColumns}, minmax(0, 1fr))`,
            width: '100%',
            maxWidth: 660,
          }}
        >
          {chords.map((chord, index) => {
            const chordDisplay = keyboardEntryToDisplayData(chord, chordName)
            if (!chordDisplay) return null

            return (
              <div key={`${chordDisplay.name || 'chord'}-${index}`} className="text-center rounded-[var(--radius-sm)] border border-border bg-card/40 p-3">
                {chordDisplay.name && <div className="text-[11px] font-semibold text-text mb-2">{chordDisplay.name}</div>}
                <div className="w-full">
                  <PianoKeyboard
                    keys={chordDisplay.keys}
                    keysLh={chordDisplay.keysLh}
                    root={chordDisplay.root}
                    rootOctave={chordDisplay.rootOctave}
                    fingeringRH={chordDisplay.fingeringRH}
                    fingeringLH={chordDisplay.fingeringLH}
                    highlights={chordDisplay.highlights}
                    range={chordDisplay.range}
                    hand={chordDisplay.hand}
                    showLabels={true}
                    scale={1}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (!displayData) {
    return (
      <div className="mb-4 p-6 bg-bg2 border border-border rounded-[var(--radius-sm)] text-center text-text3 text-[12px]">
        Teclado vazio — abra o editor para configurar
      </div>
    )
  }

  return (
    <div className="mb-4">
      {chordName && <h3 className="font-bold text-[14px] text-text mb-2">{chordName}</h3>}
      <div className="flex justify-center">
        <PianoKeyboard
          keys={displayData.keys}
          keysLh={displayData.keysLh}
          root={displayData.root}
          rootOctave={displayData.rootOctave}
          fingeringRH={displayData.fingeringRH}
          fingeringLH={displayData.fingeringLH}
          highlights={displayData.highlights}
          range={displayData.range}
          hand={displayData.hand}
          showLabels={true}
          scale={1}
        />
      </div>
    </div>
  )
}

// ─── Bloco Grade de Teclados ─────────────────────────────────────────

function BlockKeyboardGrid({ block, onKeyboardGridItemClick }: { block: MaterialBlock; onKeyboardGridItemClick?: (block: MaterialBlock, keyboard: any, index: number) => void }) {
  const rd = getBlockRenderData(block)
  const keyboards = (rd.keyboards as any[]) ?? []
  const configuredColumns = (rd.columns as number) ?? 3
  const keyboardColumns = Math.min(Math.max(keyboards.length, 1), Math.max(configuredColumns, 1), 2)

  if (keyboards.length === 0) {
    return (
      <div className="mb-4 p-6 bg-bg2 border border-border rounded-[var(--radius-sm)] text-center text-text3 text-[12px]">
        {block.title && <h3 className="font-bold text-[14px] text-text mb-2">{block.title}</h3>}
        Grade de teclados vazia — adicione teclados pelo painel
      </div>
    )
  }

  return (
    <div className="mb-4">
      {block.title && <h3 className="font-bold text-[14px] text-text mb-3">{block.title}</h3>}
      <div
        className="mx-auto grid gap-4"
        style={{
          gridTemplateColumns: `repeat(${keyboardColumns}, minmax(0, 1fr))`,
          width: '100%',
          maxWidth: 660,
        }}
      >
        {keyboards.map((kb: any, i: number) => (
          (() => {
            const display = keyboardEntryToDisplayData(kb, kb.chord_name ?? kb.name ?? '')
            if (!display) return null
            return (
              <button
                key={i}
                type="button"
                className="rounded-[12px] p-1 text-center transition-colors hover:bg-bg2/40"
                onClick={() => onKeyboardGridItemClick?.(block, kb, i)}
              >
                {display.name && <div className="text-[11px] font-semibold text-text mb-1">{display.name}</div>}
                <PianoKeyboard
                  keys={display.keys}
                  keysLh={display.keysLh}
                  root={display.root}
                  rootOctave={display.rootOctave}
                  fingeringRH={display.fingeringRH}
                  fingeringLH={display.fingeringLH}
                  highlights={display.highlights}
                  range={display.range}
                  hand={display.hand}
                  showLabels={true}
                  scale={0.92}
                />
              </button>
            )
          })()
        ))}
      </div>
    </div>
  )
}

// ─── Bloco Colunas ──────────────────────────────────────────────────

function BlockColumns({ block }: { block: MaterialBlock }) {
  const rd = getBlockRenderData(block)
  const cols = (rd.columns as Array<{ blocks: MaterialBlock[] }>) ?? []
  const numCols = cols.length || 2

  if (cols.length === 0 || cols.every(c => (c.blocks?.length ?? 0) === 0)) {
    return (
      <div className="mb-4 p-6 bg-bg2 border border-dashed border-border rounded-[var(--radius-sm)] text-center text-text3 text-[12px]">
        {block.title && <h3 className="font-bold text-[14px] text-text mb-2">{block.title}</h3>}
        Bloco de colunas vazio — adicione conteúdo pelo painel lateral
      </div>
    )
  }

  return (
    <div className="mb-4">
      {block.title && <h3 className="font-bold text-[14px] text-text mb-3">{block.title}</h3>}
      <div className="block-columns" style={{ gridTemplateColumns: `repeat(${numCols}, 1fr)` }}>
        {cols.map((col, ci) => (
          <div key={ci} className="block-column">
            {(col.blocks ?? []).map((subBlock, si) => {
              const Renderer = BLOCK_RENDERERS_INNER[subBlock.block_type]
              if (!Renderer) return null
              return <Renderer key={si} block={subBlock} />
            })}
            {(!col.blocks || col.blocks.length === 0) && (
              <div className="p-4 border border-dashed border-border/50 rounded text-center text-text3 text-[11px] min-h-[60px] flex items-center justify-center">
                Coluna {ci + 1} vazia
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Bloco Separador Customizável ─────────────────────────────────

function BlockSeparator({ block }: { block: MaterialBlock }) {
  const rd = getBlockRenderData(block)
  const s: SeparatorStyle = {
    ...DEFAULT_SEPARATOR_STYLE,
    ...(rd.separatorStyle as Partial<SeparatorStyle> | undefined),
  }
  const decoration = getSeparatorDecoration(s.decoration)

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: s.align === 'left' ? 'flex-start' : s.align === 'right' ? 'flex-end' : 'center',
        padding: `${s.spacing}px 0`,
      }}
    >
      <div style={{ position: 'relative', width: `${s.widthPercent}%` }}>
        <hr style={{
          border: 'none',
          borderTop: s.style === 'double'
            ? `${s.width}px double ${s.color}`
            : `${s.width}px ${s.style} ${s.color}`,
          margin: 0,
        }} />
        {decoration && (
          <span style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: '#ffffff',
            padding: '0 8px',
            fontSize: '14px',
            color: s.color,
          }}>
            {decoration}
          </span>
        )}
      </div>
    </div>
  )
}

const BLOCK_RENDERERS_INNER: Record<string, React.FC<{ block: MaterialBlock }>> = {
  title: BlockTitle,
  text: BlockText,
  chord_diagram: BlockChordDiagram,
  chord_grid: BlockChordGrid,
  notation: BlockNotation,
  rhythm: BlockRhythm,
  exercise: BlockExercise,
  tip: BlockTip,
  tablature: BlockTablature,
  image: BlockImage,
  audio: BlockAudio,
  video: BlockVideo,
  qr_code: BlockQrCode,
  keyboard: BlockKeyboard,
  keyboard_grid: BlockKeyboardGrid,
  separator: BlockSeparator,
}

const BLOCK_RENDERERS: Record<string, React.FC<{ block: MaterialBlock }>> = {
  cover: BlockCover,
  title: BlockTitle,
  text: BlockText,
  chord_diagram: BlockChordDiagram,
  chord_grid: BlockChordGrid,
  notation: BlockNotation,
  rhythm: BlockRhythm,
  exercise: BlockExercise,
  tip: BlockTip,
  tablature: BlockTablature,
  badge: BlockBadge,
  image: BlockImage,
  audio: BlockAudio,
  video: BlockVideo,
  qr_code: BlockQrCode,
  keyboard: BlockKeyboard,
  keyboard_grid: BlockKeyboardGrid,
  columns: BlockColumns,
  separator: BlockSeparator,
}

export function MaterialPreview({ blocks, onLegacyNotationStavePointerDown, onMusicStableRender, onChordGridItemClick, onKeyboardGridItemClick, coverEditable, onCoverPositionChange, coverTitleEditing, onCoverTitleChange, overlayElements, selectedOverlayId, onOverlaySelect, onOverlayUpdate, onOverlayCloneForDrag, textElements, selectedTextId, editingTextId, onTextSelect, onTextUpdate, onTextEditStart, onTextCopy, onTextDuplicate, onTextDelete, onTextCloneForDrag, onTextLayerChange, onLegacyTextActivate }: MaterialPreviewProps) {
  if (blocks.length === 0) {
    return (
      <div className="text-center py-12 text-text3">
        Nenhum bloco para renderizar.
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {blocks.map((block, i) => {
        if (block.block_type === 'cover') {
          return <BlockCover key={i} block={block} editable={coverEditable} onPositionChange={onCoverPositionChange} titleEditing={coverTitleEditing} onTitleChange={onCoverTitleChange} overlayElements={overlayElements} selectedOverlayId={selectedOverlayId} onOverlaySelect={onOverlaySelect} onOverlayUpdate={onOverlayUpdate} onOverlayCloneForDrag={onOverlayCloneForDrag} textElements={textElements} selectedTextId={selectedTextId} editingTextId={editingTextId} onTextSelect={onTextSelect} onTextUpdate={onTextUpdate} onTextEditStart={onTextEditStart} onTextCopy={onTextCopy} onTextDuplicate={onTextDuplicate} onTextDelete={onTextDelete} onTextCloneForDrag={onTextCloneForDrag} onTextLayerChange={onTextLayerChange} onLegacyTextActivate={onLegacyTextActivate} />
        }
        const Renderer = BLOCK_RENDERERS[block.block_type]
        if (!Renderer) {
          return (
            <div key={i} className="p-3 bg-vermelho-soft border border-vermelho/20 rounded-[var(--radius-sm)] text-[12px] text-vermelho">
              Bloco desconhecido: {block.block_type} — {block.title}
            </div>
          )
        }
        if (block.block_type === 'text') {
          return <BlockText key={i} block={block} onLegacyNotationStavePointerDown={onLegacyNotationStavePointerDown} />
        }
        if (block.block_type === 'notation') {
          return <BlockNotation key={i} block={block} onLegacyNotationStavePointerDown={onLegacyNotationStavePointerDown} onMusicStableRender={onMusicStableRender} />
        }
        if (block.block_type === 'rhythm') {
          return <BlockRhythm key={i} block={block} onMusicStableRender={onMusicStableRender} />
        }
        if (block.block_type === 'exercise') {
          return <BlockExercise key={i} block={block} onLegacyNotationStavePointerDown={onLegacyNotationStavePointerDown} onMusicStableRender={onMusicStableRender} />
        }
        if (block.block_type === 'tip') {
          return <BlockTip key={i} block={block} onLegacyNotationStavePointerDown={onLegacyNotationStavePointerDown} onMusicStableRender={onMusicStableRender} />
        }
        return (
          <Renderer
            key={i}
            block={block}
            {...(block.block_type === 'chord_grid' ? { onChordGridItemClick } : {})}
            {...(block.block_type === 'keyboard_grid' ? { onKeyboardGridItemClick } : {})}
          />
        )
      })}
    </div>
  )
}
