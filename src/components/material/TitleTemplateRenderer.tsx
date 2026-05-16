import { BookOpen, MusicNotes, Sparkle, Target } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import {
  getTitleTemplateAccent,
  getTitleTemplatePreset,
  getTitleTemplateSecondary,
  type TitleTemplateId,
} from '@/lib/titleTemplates'

interface TitleTemplateBlockLike {
  title?: string | null
  content?: Record<string, any> | null
  render_data?: Record<string, any> | null
}

interface TitleTemplateRendererProps {
  block?: TitleTemplateBlockLike
  templateId?: TitleTemplateId | string | null
  title?: string
  subtitle?: string
  accentColor?: string
  secondaryColor?: string
  compact?: boolean
  className?: string
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function normalizeHtml(value?: string | null) {
  if (!value) return ''
  return /<[^>]+>/.test(value) ? value : `<p>${value}</p>`
}

function getBlockTitleHtml(block?: TitleTemplateBlockLike, titleOverride?: string) {
  if (titleOverride) return normalizeHtml(titleOverride)
  const titleHtml = block?.content?.title_html
  if (typeof titleHtml === 'string' && titleHtml.trim()) return titleHtml
  return normalizeHtml(block?.title ?? 'Modulo')
}

function getBlockSubtitleHtml(block?: TitleTemplateBlockLike, subtitleOverride?: string) {
  if (subtitleOverride) return normalizeHtml(subtitleOverride)
  const html = block?.content?.html
  if (typeof html === 'string' && stripHtml(html)) return html
  const text = block?.content?.text
  if (typeof text === 'string' && text.trim()) return normalizeHtml(text)
  return ''
}

function titleMarkupClass(compact?: boolean) {
  return cn(
    'title-template-title [&_p]:mb-0 [&_h1]:mb-0 [&_h2]:mb-0 [&_h3]:mb-0 [&_strong]:font-extrabold [&_em]:italic',
    compact
      ? '[&_p]:text-[12px] [&_p]:leading-tight [&_h1]:text-[14px] [&_h2]:text-[13px] [&_h3]:text-[12px]'
      : '[&_p]:text-[20px] [&_p]:leading-tight [&_h1]:text-[24px] [&_h2]:text-[21px] [&_h3]:text-[18px]',
  )
}

function subtitleMarkupClass(compact?: boolean) {
  return cn(
    'title-template-subtitle [&_p]:mb-0 [&_strong]:font-semibold',
    compact ? 'text-[8px] leading-tight' : 'text-[12px] leading-relaxed',
  )
}

function TitleHtml({ html, compact }: { html: string; compact?: boolean }) {
  return <div className={titleMarkupClass(compact)} dangerouslySetInnerHTML={{ __html: html }} />
}

function SubtitleHtml({ html, compact, className }: { html: string; compact?: boolean; className?: string }) {
  if (!stripHtml(html)) return null
  return (
    <div
      className={cn(subtitleMarkupClass(compact), className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

export function TitleTemplateRenderer({
  block,
  templateId,
  title,
  subtitle,
  accentColor,
  secondaryColor,
  compact = false,
  className,
}: TitleTemplateRendererProps) {
  const renderData = block?.render_data ?? {}
  const preset = getTitleTemplatePreset(templateId ?? renderData.title_template_id)
  const id = preset?.id ?? 'module_premium'
  const accent = getTitleTemplateAccent(renderData, accentColor ?? undefined)
  const secondary = getTitleTemplateSecondary(renderData, secondaryColor ?? undefined)
  const titleHtml = getBlockTitleHtml(block, title)
  const subtitleHtml = getBlockSubtitleHtml(block, subtitle)
  const staffLineColor = compact ? 'rgba(100, 116, 139, 0.42)' : 'rgba(100, 116, 139, 0.55)'

  if (id === 'editorial_classic') {
    return (
      <section className={cn('my-5', compact && 'my-1', className)}>
        <div className="flex items-center gap-3">
          <div className={cn('h-px flex-1', compact && 'max-w-6')} style={{ backgroundColor: accent }} />
          <span
            className={cn('rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em]', compact && 'px-1.5 py-0.5 text-[6px]')}
            style={{ borderColor: `${secondary}55`, color: secondary }}
          >
            {preset?.tone}
          </span>
          <div className={cn('h-px flex-[2]', compact && 'max-w-8')} style={{ backgroundColor: `${accent}66` }} />
        </div>
        <div className={cn('mt-2 text-center font-serif font-bold text-text', compact && 'mt-1')}>
          <TitleHtml html={titleHtml} compact={compact} />
          <SubtitleHtml html={subtitleHtml} compact={compact} className="mt-1 text-text3" />
        </div>
      </section>
    )
  }

  if (id === 'brand_band') {
    return (
      <section
        className={cn('my-5 overflow-hidden rounded-md px-5 py-4 text-white shadow-sm', compact && 'my-1 rounded px-2 py-2', className)}
        style={{ background: `linear-gradient(135deg, ${accent}, ${secondary})` }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 font-bold">
            <TitleHtml html={titleHtml} compact={compact} />
            <SubtitleHtml html={subtitleHtml} compact={compact} className="mt-1 text-white/82" />
          </div>
          <MusicNotes className={cn('mt-0.5 shrink-0 text-white/80', compact ? 'h-4 w-4' : 'h-7 w-7')} weight="bold" />
        </div>
      </section>
    )
  }

  if (id === 'lesson_card') {
    return (
      <section className={cn('my-5 rounded-md border bg-white px-5 py-4 shadow-[0_8px_22px_rgba(30,58,95,0.08)]', compact && 'my-1 px-2 py-2', className)} style={{ borderColor: `${accent}33` }}>
        <div className="flex items-start gap-3">
          <div className={cn('mt-1 h-9 w-9 shrink-0 rounded-md border flex items-center justify-center', compact && 'h-5 w-5')} style={{ borderColor: `${secondary}44`, backgroundColor: `${secondary}12`, color: secondary }}>
            <BookOpen size={compact ? 12 : 18} weight="bold" />
          </div>
          <div className="min-w-0">
            <div className={cn('font-serif font-bold text-text')}>
              <TitleHtml html={titleHtml} compact={compact} />
            </div>
            <SubtitleHtml html={subtitleHtml} compact={compact} className="mt-1 text-text3" />
          </div>
        </div>
      </section>
    )
  }

  if (id === 'musical_staff') {
    return (
      <section className={cn('my-5 py-3', compact && 'my-1 py-1.5', className)}>
        <div className="relative overflow-hidden rounded-md border bg-white px-5 py-4" style={{ borderColor: `${accent}28` }}>
          <div
            className="pointer-events-none absolute inset-x-0 top-1/2 h-16 -translate-y-1/2"
            aria-hidden="true"
          >
            {[12, 22, 32, 42, 52].map((top) => (
              <span
                key={top}
                className="absolute left-0 right-0 border-t"
                style={{ top, borderColor: staffLineColor }}
              />
            ))}
          </div>
          <div className="relative flex items-center gap-4">
            <MusicNotes className={cn('shrink-0', compact ? 'h-5 w-5' : 'h-9 w-9')} style={{ color: secondary }} weight="duotone" />
            <div className="min-w-0 font-serif font-bold text-text">
              <TitleHtml html={titleHtml} compact={compact} />
              <SubtitleHtml html={subtitleHtml} compact={compact} className="mt-1 font-sans text-text2" />
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (id === 'chapter_divider') {
    return (
      <section className={cn('my-6 rounded-md border-l-[7px] bg-slate-950 px-6 py-5 text-white', compact && 'my-1 border-l-[4px] px-2 py-2', className)} style={{ borderLeftColor: secondary }}>
        <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.22em] text-white/55">
          <Target size={compact ? 10 : 13} weight="bold" />
          {preset?.tone}
        </div>
        <div className="mt-2 font-serif font-bold">
          <TitleHtml html={titleHtml} compact={compact} />
        </div>
        <SubtitleHtml html={subtitleHtml} compact={compact} className="mt-2 max-w-[88%] text-white/72" />
      </section>
    )
  }

  return (
    <section className={cn('my-5 rounded-md border bg-white p-4 shadow-sm', compact && 'my-1 p-2', className)} style={{ borderColor: `${accent}24` }}>
      <div className="flex items-start gap-3">
        <div className={cn('flex shrink-0 items-center justify-center rounded-md text-white', compact ? 'h-6 w-6' : 'h-11 w-11')} style={{ backgroundColor: secondary }}>
          <Sparkle size={compact ? 13 : 22} weight="fill" />
        </div>
        <div className="min-w-0 flex-1">
          <div className={cn('mb-1 flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.2em]', compact && 'mb-0 text-[6px]')} style={{ color: accent }}>
            <span className="h-px w-6" style={{ backgroundColor: accent }} />
            {preset?.tone}
          </div>
          <div className="font-serif font-bold text-text">
            <TitleHtml html={titleHtml} compact={compact} />
          </div>
          <SubtitleHtml html={subtitleHtml} compact={compact} className="mt-1 text-text3" />
        </div>
      </div>
    </section>
  )
}
