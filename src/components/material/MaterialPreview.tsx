import { Lightbulb, Target, Trophy } from '@phosphor-icons/react'
import { ChordDiagram } from '@/components/music/ChordDiagram'
import { StaffNotation } from '@/components/music/StaffNotation'
import { RhythmNotation } from '@/components/music/RhythmNotation'
import { Tablature } from '@/components/music/Tablature'
import { NotationRenderer } from '@/components/music/NotationRenderer'

export interface MaterialBlock {
  block_type: 'title' | 'text' | 'chord_diagram' | 'chord_grid' | 'notation' | 'rhythm' | 'exercise' | 'tip' | 'tablature' | 'image' | 'qr_code' | 'badge'
  title?: string
  content?: { text?: string; [key: string]: any }
  render_data?: any
}

interface MaterialPreviewProps {
  blocks: MaterialBlock[]
}

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
        className="rich-content text-[13px] leading-relaxed text-text2 [&_strong]:text-text [&_strong]:font-semibold [&_em]:text-text2 [&_p]:mb-2 [&_h1]:font-serif [&_h1]:text-[22px] [&_h1]:font-bold [&_h1]:text-text [&_h1]:mb-3 [&_h2]:font-serif [&_h2]:text-[18px] [&_h2]:font-bold [&_h2]:text-text [&_h2]:mb-2 [&_h3]:font-serif [&_h3]:text-[15px] [&_h3]:font-bold [&_h3]:text-text [&_h3]:mb-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-2 [&_blockquote]:border-l-[3px] [&_blockquote]:border-accent/40 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-text3 [&_a]:text-accent [&_a]:underline [&_mark]:bg-yellow-200/80 [&_mark]:rounded-sm [&_mark]:px-0.5 [&_hr]:border-border [&_hr]:my-4"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    )
  }
  if (text) return <>{renderMarkdownText(text)}</>
  return null
}

function BlockTitle({ block }: { block: MaterialBlock }) {
  const dimension = block.content?.dimension?.toLowerCase() ?? ''
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

function BlockText({ block }: { block: MaterialBlock }) {
  return (
    <div className="mb-4">
      {renderTitle(block)}
      {renderContent(block.content)}
      {block.render_data?.notation && (
        <NotationRenderer notation={block.render_data.notation} />
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

function BlockChordGrid({ block }: { block: MaterialBlock }) {
  const chords = block.render_data?.chords ?? []
  return (
    <div className="mb-4">
      {block.title && <h3 className="font-bold text-[14px] text-text mb-3">{block.title}</h3>}
      <div className="flex flex-wrap gap-4 justify-center">
        {chords.map((chord: any, i: number) => (
          <ChordDiagram
            key={i}
            name={chord.chord_name ?? chord.name ?? '?'}
            positions={{
              fingers: chord.fingers ?? [],
              barres: chord.barres ?? [],
              muted: chord.muted ?? [],
            }}
            position={chord.position ?? 1}
            size="full"
          />
        ))}
      </div>
    </div>
  )
}

function BlockNotation({ block }: { block: MaterialBlock }) {
  const rd = block.render_data ?? {}
  const notes = rd.notes ?? []

  if (notes.length === 0) return null

  return (
    <div className="mb-4">
      {block.title && <h3 className="font-bold text-[14px] text-text mb-2">{block.title}</h3>}
      <StaffNotation
        notes={notes}
        clef={rd.clef ?? 'treble'}
        timeSignature={rd.time_signature}
        keySignature={rd.key_signature}
        width={rd.width ?? 500}
      />
    </div>
  )
}

function BlockRhythm({ block }: { block: MaterialBlock }) {
  return (
    <div className="mb-4">
      {block.title && <h3 className="font-bold text-[14px] text-text mb-2">{block.title}</h3>}
      <RhythmNotation />
    </div>
  )
}

function BlockExercise({ block }: { block: MaterialBlock }) {
  const rd = block.render_data ?? {}
  const hasOldNotation = rd.notes && rd.notes.length > 0
  const hasNewNotation = !!rd.notation
  const hasTab = rd.tab
  const hasContent = block.content?.html || block.content?.text

  return (
    <div className="mb-4 p-4 bg-advance/10 border border-advance/20 rounded-[var(--radius-sm)]">
      <div className="flex items-start gap-2 mb-2">
        <Target size={18} className="text-advance shrink-0 mt-0.5" weight="bold" />
        {renderTitle(block, 'font-bold text-[14px] text-advance [&_p]:mb-0') ?? (
          <h3 className="font-bold text-[14px] text-advance">Exercício</h3>
        )}
      </div>
      {hasContent && <div className="text-[13px] text-text2 mb-3">{renderContent(block.content)}</div>}
      {hasNewNotation && <NotationRenderer notation={rd.notation} />}
      {hasOldNotation && !hasNewNotation && (
        <StaffNotation
          notes={rd.notes}
          clef={rd.clef ?? 'treble'}
          timeSignature={rd.time_signature}
          width={rd.width ?? 450}
        />
      )}
      {hasTab && <Tablature tab={rd.tab} />}
    </div>
  )
}

function BlockTip({ block }: { block: MaterialBlock }) {
  return (
    <div className="mb-4 p-4 bg-dourado-soft border border-dourado/20 rounded-[var(--radius-sm)]">
      <div className="flex items-start gap-2">
        <Lightbulb size={18} className="text-dourado shrink-0 mt-0.5" weight="fill" />
        <div>
          {renderTitle(block, 'font-bold text-[13px] text-dourado mb-1 [&_p]:mb-0')}
          <div className="text-[12px] text-text2">{renderContent(block.content)}</div>
        </div>
      </div>
      {block.render_data?.notation && (
        <NotationRenderer notation={block.render_data.notation} />
      )}
    </div>
  )
}

function BlockTablature({ block }: { block: MaterialBlock }) {
  const tab = block.render_data?.tab ?? block.content?.text ?? ''
  return (
    <div className="mb-4">
      {block.title && <h3 className="font-bold text-[14px] text-text mb-2">{block.title}</h3>}
      <Tablature tab={tab} title="" />
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

function BlockImage({ block }: { block: MaterialBlock }) {
  const url = block.render_data?.url ?? block.content?.url
  const alt = block.title ?? 'Imagem'

  if (url) {
    return (
      <div className="mb-4 text-center">
        <img src={url} alt={alt} className="rounded-lg max-h-64 mx-auto" />
        {block.title && <div className="text-[11px] text-text3 mt-1">{block.title}</div>}
      </div>
    )
  }

  return (
    <div className="mb-4 p-8 bg-bg2 border border-border rounded-[var(--radius-sm)] text-center text-text3">
      🖼️ Placeholder — imagem será gerada com Imagen 4
      {block.title && <div className="text-[11px] mt-1">{block.title}</div>}
    </div>
  )
}

const BLOCK_RENDERERS: Record<string, React.FC<{ block: MaterialBlock }>> = {
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
}

export function MaterialPreview({ blocks }: MaterialPreviewProps) {
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
        const Renderer = BLOCK_RENDERERS[block.block_type]
        if (!Renderer) {
          return (
            <div key={i} className="p-3 bg-vermelho-soft border border-vermelho/20 rounded-[var(--radius-sm)] text-[12px] text-vermelho">
              Bloco desconhecido: {block.block_type} — {block.title}
            </div>
          )
        }
        return <Renderer key={i} block={block} />
      })}
    </div>
  )
}
