import { memo, useState, useRef, useCallback, useEffect, useLayoutEffect, useMemo, type ReactNode, type WheelEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, FloppyDisk, TextAa, Article,
  Guitar, MusicNotes, Lightbulb, PencilCircle, ListNumbers,
  TextHOne, LineSegment, Image as ImageIcon, Plus, Trash,
  SpinnerGap, PencilSimple, ArrowCounterClockwise,
  Printer, Code, Eye, EyeSlash, PencilLine, PianoKeys,
  MagnifyingGlassPlus, MagnifyingGlassMinus, Gear, Hash,
  TextAlignLeft, TextAlignCenter, TextAlignRight,
  BookOpen, Rows, GridFour, Sparkle, SpeakerHigh, VideoCamera, DownloadSimple,
  PlusCircle, SlidersHorizontal, Drop, ArrowsClockwise, ArrowFatUp, TextT, ArrowFatDown,
  BookmarkSimple, Copy, ArrowUUpRight, ArrowUDownRight,
  CaretLeft, CaretRight, ArrowsInSimple, ArrowsOutSimple,
  MagicWand, Translate, Brain, Lightning,
  Ruler, Layout, ClockCounterClockwise, MapTrifold, QrCode,
  Shapes,
} from "@phosphor-icons/react";
import QRCodeLib from "qrcode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor, type AIActionType } from "@/components/editor/RichTextEditor";
import { ensureHtml, htmlToMarkdown } from "@/lib/markdownToHtml";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useMaterials, useMaterialWithBlocks } from "@/hooks/useMaterials";
import { useSchool } from "@/hooks/useSchool";
import { useAuth } from "@/contexts/AuthContext";
import {
  updateMaterialBlockRpc, addMaterialBlock,
  deleteMaterialBlock, updateMaterial,
} from "@/services/materialService";
import type { MaterialWithBlocks, MaterialListItem } from "@/services/materialService";
import { MaterialPreview, type MaterialBlock, type CoverOverlayElement, type CoverTextElement, DEFAULT_TEXT_SHADOW, DEFAULT_TEXT_OUTLINE, DEFAULT_TEXT_BG } from "@/components/material/MaterialPreview";
import { TitleTemplateRenderer } from "@/components/material/TitleTemplateRenderer";
import { NotationEditorMaterialAdapter, type NotationEditorMaterialSaveData } from "@/components/music/NotationEditorMaterialAdapter";
import { SaveAsReusableDialog, type SaveAsReusablePayload } from "@/components/content/SaveAsReusableDialog";
import { ExerciseLibraryBrowser } from "@/components/content/ExerciseLibraryBrowser";
import { ChordEditor, createEmptyState, positionsToState, stateToPositions, type ChordEditorState } from "@/components/music/ChordEditor";
import type { ChordPositions } from "@/components/music/ChordDiagram";
import { KeyboardEditor, type PianoChordData } from "@/components/music/KeyboardEditor";
import { TablatureEditor, INSTRUMENTS as TAB_INSTRUMENTS, gridToAlphaTex, type TablatureData, type TabInstrument } from "@/components/music/TablatureEditor";
import { raiseTabSlursInSvg, shouldHideAlphaTabSvgGroup } from "@/components/music/AlphaTexInlineRenderer";
import { generateText } from "@/services/aiService";
import { generateCoverImageRaw, enhancePromptWithAI, fetchImageLibrary, type ImageLibraryItem, type ImageStyle } from "@/services/imageGenerationService";
import { supabase } from "@/lib/supabase";
import { editorChordToKeyboardRenderData, keyboardBlockToEditorChord } from "@/lib/keyboardBlockAdapter";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LASelect } from "@/components/ui/LASelect";
import { LAFontPicker } from "@/components/ui/LAFontPicker";
import { BlockStylePanel } from "@/components/editor/BlockStylePanel";
import { SeparatorStylePanel } from "@/components/editor/SeparatorStylePanel";
import { PageBackgroundPanel } from "@/components/editor/PageBackgroundPanel";
import { PageMarginsPanel } from "@/components/editor/PageMarginsPanel";
import { type BlockStyle, type SeparatorStyle, type PageBackground, type PageMargins, type PageGuide, DEFAULT_BLOCK_STYLE, DEFAULT_SEPARATOR_STYLE, DEFAULT_PAGE_BACKGROUND, DEFAULT_PAGE_MARGINS, mergeBlockStyle, mergeSeparatorStyle, blockStyleToCSS } from "@/lib/blockStyles";
import { FloatingElementRenderer } from "@/components/editor/FloatingElementRenderer";
import { FloatingTextProperties } from "@/components/editor/FloatingTextProperties";
import { FloatingImageProperties } from "@/components/editor/FloatingImageProperties";
import { FloatingShapeProperties } from "@/components/editor/FloatingShapeProperties";
import { FloatingIconProperties } from "@/components/editor/FloatingIconProperties";
import { ElementsPicker } from "@/components/editor/ElementsPicker";
import { LayersPanel } from "@/components/editor/LayersPanel";
import { ContextualToolbar } from "@/components/editor/ContextualToolbar";
import { AIVariationsDialog } from "@/components/editor/AIVariationsDialog";
import { CanvasRuler } from "@/components/editor/CanvasRuler";
import { BlockListSidebar } from "@/components/editor/BlockListSidebar";
import { EditorCanvas } from "@/components/editor/EditorCanvas";
import { EditableBlock, type EditableBlockData } from "@/components/editor/EditableBlock";
import { PropertiesSidebar } from "@/components/editor/PropertiesSidebar";
import { PageMinimap } from "@/components/editor/PageMinimap";
import { PaginationDebugPanel, type PaginationDebugPage } from "@/components/editor/debug/PaginationDebugPanel";
import { isUsableMusicSnapshotHtml } from "@/lib/musicSnapshotValidation";
import { collectUsedGoogleFontFamilies, getGoogleFontLinkTags } from "@/lib/fontLoader";
import { MaterialTemplatesDialog } from "@/components/editor/MaterialTemplatesDialog";
import { VersionHistoryDialog } from "@/components/editor/VersionHistoryDialog";
import { type MaterialTemplate } from "@/lib/materialTemplates";
import { saveVersion } from "@/services/materialVersionService";
import {
  createSchoolCoverTemplate,
  deleteSchoolCoverTemplate,
  listSchoolCoverTemplates,
  type SchoolCoverTemplate,
} from "@/services/coverTemplateService";
import { createExercise, getExerciseById, type ExerciseLibraryItem } from "@/services/exerciseLibraryService";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HeaderFooterBar } from "@/components/editor/HeaderFooterBar";
import { HeaderFooterEditor } from "@/components/editor/HeaderFooterEditor";
import {
  type HeaderFooterConfig, type PlaceholderContext,
  DEFAULT_HEADER, DEFAULT_FOOTER,
  isLegacyFormat, migrateLegacyHeader, migrateLegacyFooter,
} from "@/lib/headerFooter";
import { copyHeaderFooterAppearance } from "@/lib/headerFooterAppearance";
import { createBrandKitHeaderFooterConfig } from "@/lib/headerFooterBrandKit";
import { DEFAULT_TITLE_TEMPLATE_ID, TITLE_TEMPLATE_PRESETS, type TitleTemplateId } from "@/lib/titleTemplates";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
type FloatingElement, type FloatingText, type FloatingImage, type FloatingShape, type FloatingIcon, type FloatingShapeKind,
  DEFAULT_FLOATING_TEXT, DEFAULT_FLOATING_IMAGE,
  createFloatingIcon, createFloatingShape, getFloatingShapeLabel,
  snapValue as floatingSnapValue,
} from "@/lib/floatingElements";
import {
  calculateFloatingElementResize,
  calculateFloatingElementRotationFromDrag,
  formatFloatingRotationForDisplay,
  type FloatingResizeHandle,
} from "@/lib/floatingElementTransform";
import {
  calculateFloatingElementPageDrag,
  getVisiblePageIndexFromRects,
  shouldHydrateFloatingElementsFromPageConfig,
  shouldPersistFloatingElementsToPageConfig,
} from "@/lib/floatingElementPagePlacement";
import { createFloatingImageFromElementAsset, type ElementLibraryAsset } from "@/lib/elementPicker";
import { isReusableBlockType } from "@/lib/exerciseLibraryOptions";
import { applyBlockPatch, createBlockPatch, type EditorBlockPatch } from "@/lib/editorBlockHistory";
import {
  anchorCanvasBlockToPageOffset,
  applyCanvasLayoutPageOffsets,
  canvasBlockLayoutToCSS,
  canvasPageLayerToCSS,
  getCanvasBlockLayout,
  getCanvasNudgeStep,
  getCanvasPageBoundaryDelta,
  hasCanvasBlockLayoutOffset,
  isCanvasNudgeKey,
  nudgeCanvasBlockLayout,
  resetCanvasBlockLayout,
  settleCanvasBlockOnPageAnchor,
  shouldApplyCanvasNudgeKey,
  shouldSettleCanvasBlockOnPageAnchor,
  type CanvasNudgeDirection,
} from "@/lib/canvasBlockLayout";
import { blockUsesAlphaTab, buildMusicHydrationPlan, shouldMountMusicRenderer } from "@/lib/editorMusicHydrationQueue";
import {
  canDeleteSelectedBlock,
  canEnterInlineEdit,
  getCanvasToolbarMode,
  getCanvasToolbarPosition,
  getFloatingElementNudgeStep,
  getInlineEditingBlockAfterCanvasBlockClick,
  isTextInputTarget,
  shouldNudgeFloatingElementFromKey,
} from "@/lib/editorCanvasInteraction";
import {
  A4_CONTENT_HEIGHT,
  canSplitBlockForPagination,
  describePaginationPolicy,
  getBlockPaginationPolicy,
  getEstimatedBlockHeightForPagination,
  getPaginationFragmentData,
  getPaginationSourceBlockId,
  paginateBlocks,
  shouldKeepBlocksTogether,
  type BlockPaginationPolicy,
} from "@/lib/sharedPagination";

type MusicSnapshotCacheEntry = { hash: string; html: string; height: number }

type BrandLogoVariantKey = 'primary' | 'symbol' | 'horizontal' | 'light' | 'dark'
type BrandLogoVariants = Partial<Record<BrandLogoVariantKey, string>>

const BRAND_LOGO_VARIANT_LABELS: Record<BrandLogoVariantKey, string> = {
  primary: 'Completa',
  symbol: 'Solo',
  horizontal: 'Horizontal',
  light: 'Light',
  dark: 'Dark',
}

const BRAND_LOGO_VARIANT_ORDER: BrandLogoVariantKey[] = ['primary', 'symbol', 'horizontal', 'light', 'dark']

type EditorHistoryEntry = {
  patches: EditorBlockPatch<EditorBlock>[]
  beforeOrder: string[]
  afterOrder: string[]
}

type CanvasNudgeSession = {
  blockId: string
  beforeBlocks: EditorBlock[]
  latestBlocks: EditorBlock[]
  latestRenderData: Record<string, unknown> | null
  commitTimer: number | null
  cleanupTimer: number | null
  lastAppliedAtMs: number | null
}

// --- Tipos internos ---

interface PageConfig {
  header: HeaderFooterConfig
  footer: HeaderFooterConfig
  background?: PageBackground
  floating_elements?: FloatingElement[]
  margins?: PageMargins
  guides?: PageGuide[]
}

const DEFAULT_PAGE_CONFIG: PageConfig = {
  header: DEFAULT_HEADER,
  footer: DEFAULT_FOOTER,
  margins: DEFAULT_PAGE_MARGINS,
  guides: [],
}

interface EditorBlock {
  id: string
  block_type: string
  title: string | null
  content: Record<string, unknown> | null
  render_data: Record<string, unknown> | null
  sort_order: number
  is_edited: boolean
  original_content: Record<string, unknown> | null
}

// --- Helpers ---

/** Migra pageConfig legado (se necessário) para o novo formato de 3 zonas */
function migratePageConfig(raw: Record<string, unknown>): PageConfig {
  const pc = raw as unknown as PageConfig
  const header = raw.header as Record<string, unknown> | undefined
  const footer = raw.footer as Record<string, unknown> | undefined

  return {
    ...pc,
    header: header && isLegacyFormat(header)
      ? migrateLegacyHeader(header as { enabled: boolean; leftText: string; centerText: string; rightText: string; showOnFirstPage: boolean })
      : (pc.header ?? DEFAULT_HEADER),
    footer: footer && isLegacyFormat(footer)
      ? migrateLegacyFooter(footer as { enabled: boolean; leftText: string; centerText: string; rightText: string; showPageNumber: boolean; pageNumberPosition: 'left' | 'center' | 'right' })
      : (pc.footer ?? DEFAULT_FOOTER),
  }
}

const BLOCK_TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; bg: string; color: string }> = {
  text:           { label: 'Texto',     icon: Article,      bg: 'var(--azul-soft)',       color: 'var(--azul-claro)' },
  tip:            { label: 'Dica',      icon: Lightbulb,    bg: 'var(--dourado-soft)',     color: 'var(--dourado)' },
  exercise:       { label: 'Exercício', icon: PencilCircle, bg: 'var(--advance-soft)',     color: 'var(--advance)' },
  notation:       { label: 'Notação',   icon: MusicNotes,   bg: 'var(--master-soft)',      color: 'var(--master)' },
  rhythm:         { label: 'Ritmo',     icon: MusicNotes,   bg: 'var(--advance-soft)',     color: 'var(--advance)' },
  chord_diagram:  { label: 'Acorde',    icon: Guitar,       bg: 'var(--grow-soft)',        color: 'var(--grow)' },
  tablature:      { label: 'Tablatura', icon: ListNumbers,  bg: 'var(--foundation-soft)',  color: 'var(--foundation)' },
  title:          { label: 'Título',    icon: TextHOne,     bg: 'var(--foundation-soft)',  color: 'var(--foundation)' },
  separator:      { label: 'Separador', icon: LineSegment,  bg: 'var(--border)',           color: 'var(--text3)' },
  page_break:     { label: 'Quebra de Página', icon: LineSegment, bg: 'var(--border)',      color: 'var(--text3)' },
  image:          { label: 'Imagem',    icon: ImageIcon,    bg: 'var(--accent-soft)',      color: 'var(--accent)' },
  badge:          { label: 'Conquista', icon: PencilCircle, bg: 'var(--verde-soft)',       color: 'var(--verde)' },
  cover:          { label: 'Capa',      icon: BookOpen,     bg: 'var(--accent-soft)',      color: 'var(--accent)' },
  chord_grid:     { label: 'Grade Acordes', icon: GridFour, bg: 'var(--grow-soft)',        color: 'var(--grow)' },
  keyboard:       { label: 'Teclado',   icon: PianoKeys,    bg: 'var(--master-soft)',      color: 'var(--master)' },
  keyboard_grid:  { label: 'Grade Teclados', icon: GridFour, bg: 'var(--master-soft)',   color: 'var(--master)' },
  columns:         { label: 'Colunas',  icon: Rows,     bg: 'var(--azul-soft)',       color: 'var(--azul)' },
  qr_code:         { label: 'QR Code',  icon: QrCode,   bg: 'var(--azul-soft)',       color: 'var(--azul-claro)' },
  audio:           { label: 'Áudio',   icon: SpeakerHigh, bg: 'var(--grow-soft)',    color: 'var(--grow)' },
  video:           { label: 'Vídeo',   icon: VideoCamera,  bg: 'var(--accent-soft)',  color: 'var(--accent)' },
}

function getBlockConfig(type: string) {
  return BLOCK_TYPE_CONFIG[type] ?? { label: type, icon: Article, bg: 'var(--azul-soft)', color: 'var(--azul-claro)' }
}

function parseBlocks(rows: MaterialWithBlocks[]): { material: MaterialWithBlocks; blocks: EditorBlock[] } {
  const first = rows[0]
  const blocks: EditorBlock[] = rows
    .filter(r => r.block_id != null)
    .map(r => ({
      id: r.block_id!,
      block_type: r.block_type ?? 'text',
      title: r.block_title,
      content: r.block_content,
      render_data: r.block_render_data,
      sort_order: r.block_sort_order ?? 0,
      is_edited: r.block_is_edited ?? false,
      original_content: r.block_original_content,
    }))
    .sort((a, b) => a.sort_order - b.sort_order)
  return { material: first, blocks }
}

function editorBlockToPreview(b: EditorBlock): MaterialBlock {
  return {
    block_type: b.block_type as MaterialBlock['block_type'],
    title: b.title ?? undefined,
    content: b.content as MaterialBlock['content'],
    render_data: b.render_data,
  }
}

function cloneJsonValue<T>(value: T): T {
  if (value == null) return value
  if (typeof structuredClone === 'function') {
    return structuredClone(value)
  }
  return JSON.parse(JSON.stringify(value)) as T
}

const DEFAULT_TAB_COLUMNS = 24

type CoverVisualDirectionValue =
  | 'classic_school'
  | 'modern_premium'
  | 'playful_kids'
  | 'minimal_clean'
  | 'artistic_editorial'
  | 'realistic_photo'

const COVER_VISUAL_DIRECTIONS: Array<{
  value: CoverVisualDirectionValue
  label: string
  description: string
  style: ImageStyle
  prompt: string
}> = [
  {
    value: 'modern_premium',
    label: 'Moderna / Premium',
    description: 'Apostila atual, sofisticada e comercial.',
    style: 'illustration',
    prompt: 'Modern premium editorial cover background. Refined composition, rich but controlled colors, professional lighting, polished contemporary music school identity.',
  },
  {
    value: 'classic_school',
    label: 'Clássica / Conservatório',
    description: 'Mais tradicional, elegante e séria.',
    style: 'realistic',
    prompt: 'Traditional conservatory-style workbook cover background. Elegant, timeless, refined, warm neutral tones, premium acoustic instrument textures, serious music education atmosphere.',
  },
  {
    value: 'playful_kids',
    label: 'Infantil / Lúdica',
    description: 'Mais leve para crianças e iniciantes.',
    style: 'cartoon',
    prompt: 'Playful children-friendly music workbook cover background. Warm, cheerful, approachable, rounded shapes, vibrant but tasteful colors, suitable for young beginner students.',
  },
  {
    value: 'minimal_clean',
    label: 'Minimalista',
    description: 'Poucos elementos e bastante respiro.',
    style: 'flat',
    prompt: 'Minimal clean music workbook cover background. Simple composition, generous negative space, restrained palette, subtle musical atmosphere, premium educational design.',
  },
  {
    value: 'artistic_editorial',
    label: 'Artística',
    description: 'Mais autoral, expressiva e visual.',
    style: 'watercolor',
    prompt: 'Artistic editorial music workbook cover background. Expressive painterly atmosphere, elegant textures, dynamic composition, sophisticated colors, crafted for a creative music school.',
  },
  {
    value: 'realistic_photo',
    label: 'Realista / Fotográfica',
    description: 'Instrumento com aparência de foto.',
    style: 'realistic',
    prompt: 'Photorealistic music workbook cover background. Real instrument close-up or studio scene, natural light, high-end photography, realistic textures, professional educational publication.',
  },
]

const COVER_INSTRUMENT_OPTIONS = [
  { value: '', label: 'Selecionar instrumento' },
  { value: 'Violão', label: 'Violão' },
  { value: 'Guitarra', label: 'Guitarra' },
  { value: 'Baixo', label: 'Baixo' },
  { value: 'Piano', label: 'Piano' },
  { value: 'Teclado', label: 'Teclado' },
  { value: 'Canto', label: 'Canto' },
  { value: 'Bateria', label: 'Bateria' },
  { value: 'Ukulele', label: 'Ukulele' },
  { value: 'Teoria Musical', label: 'Teoria Musical' },
  { value: 'Musicalização Infantil', label: 'Musicalização Infantil' },
]

const COVER_LEVEL_OPTIONS = [
  { value: '', label: 'Selecionar nível' },
  { value: 'Iniciante', label: 'Iniciante' },
  { value: 'Básico', label: 'Básico' },
  { value: 'Intermediário', label: 'Intermediário' },
  { value: 'Avançado', label: 'Avançado' },
  { value: 'Infantil', label: 'Infantil' },
  { value: 'Adulto', label: 'Adulto' },
  { value: 'Livre', label: 'Livre' },
]

function ensureSelectOption(options: { value: string; label: string }[], currentValue: string | null | undefined) {
  const value = currentValue ?? ''
  if (!value || options.some(option => option.value === value)) return options
  return [...options, { value, label: value }]
}

function resolveCoverVisualDirection(renderData: Record<string, unknown> | null | undefined) {
  const rd = renderData ?? {}
  const stored = rd.cover_visual_direction as CoverVisualDirectionValue | undefined
  const match = COVER_VISUAL_DIRECTIONS.find(direction => direction.value === stored)
  if (match) return match

  const legacyStyle = rd.cover_style as ImageStyle | undefined
  if (legacyStyle === 'cartoon') return COVER_VISUAL_DIRECTIONS.find(direction => direction.value === 'playful_kids')!
  if (legacyStyle === 'realistic' || legacyStyle === '3d') return COVER_VISUAL_DIRECTIONS.find(direction => direction.value === 'realistic_photo')!
  if (legacyStyle === 'watercolor' || legacyStyle === 'sketch') return COVER_VISUAL_DIRECTIONS.find(direction => direction.value === 'artistic_editorial')!

  const legacyTemplate = rd.template as string | undefined
  if (legacyTemplate === 'classic' || legacyTemplate === 'elegant') return COVER_VISUAL_DIRECTIONS.find(direction => direction.value === 'classic_school')!
  if (legacyTemplate === 'minimal') return COVER_VISUAL_DIRECTIONS.find(direction => direction.value === 'minimal_clean')!
  if (legacyTemplate === 'colorful' || legacyTemplate === 'vibrant') return COVER_VISUAL_DIRECTIONS.find(direction => direction.value === 'playful_kids')!

  return COVER_VISUAL_DIRECTIONS[0]
}

function createEmptyTablatureData(label = 'Tablatura', instrument: TabInstrument = 'guitar'): TablatureData {
  const stringCount = TAB_INSTRUMENTS[instrument]?.stringCount ?? TAB_INSTRUMENTS.guitar.stringCount
  return {
    instrument,
    grid: Array.from({ length: stringCount }, () => Array(DEFAULT_TAB_COLUMNS).fill(null)),
    columns: DEFAULT_TAB_COLUMNS,
    durations: Array(DEFAULT_TAB_COLUMNS).fill('q'),
    label,
    timeSignature: 'free',
  }
}

function getDefaultBlockPayload(blockType: string, materialTitle: string): {
  title: string | null
  content: Record<string, unknown>
  renderData: Record<string, unknown> | null
} {
  if (blockType === 'cover') {
    return {
      title: materialTitle || 'Capa',
      content: { text: '' },
      renderData: { cover_visual_direction: 'modern_premium', titulo: materialTitle || '', subtitulo: '', instrumento: '', nivel: '', professor: '', escola: '', data: '' },
    }
  }
  if (blockType === 'chord_grid') return { title: 'Grade de Acordes', content: { text: '' }, renderData: { chords: [], columns: 3 } }
  if (blockType === 'keyboard') return { title: 'Teclado', content: { text: '' }, renderData: { keys: [], hand: 'rh' } }
  if (blockType === 'keyboard_grid') return { title: 'Grade de Teclados', content: { text: '' }, renderData: { keyboards: [], columns: 3 } }
  if (blockType === 'columns') return { title: null, content: { text: '' }, renderData: { columns: [{ blocks: [] }, { blocks: [] }] } }
  if (blockType === 'qr_code') return { title: 'QR Code', content: { text: '' }, renderData: { url: '', caption: '' } }
  if (blockType === 'tablature') {
    const notationData = createEmptyTablatureData()
    return {
      title: 'Tablatura',
      content: { text: '' },
      renderData: {
        notation_data: notationData,
        lines: [],
        tab: '',
        alphaTex: '',
        instrument: notationData.instrument,
      },
    }
  }
  return { title: null, content: { text: '' }, renderData: null }
}

function insertBlocksAfterOrder(existing: EditorBlock[], newBlocks: EditorBlock[], anchorOrder: number): EditorBlock[] {
  if (newBlocks.length === 0) return existing
  const sorted = [...existing].sort((a, b) => a.sort_order - b.sort_order)
  const before = sorted.filter(block => block.sort_order <= anchorOrder)
  const after = sorted.filter(block => block.sort_order > anchorOrder)
  const inserted = newBlocks.map((block, index) => ({
    ...block,
    sort_order: anchorOrder + index + 1,
  }))
  const shiftedAfter = after.map((block, index) => ({
    ...block,
    sort_order: anchorOrder + inserted.length + index + 1,
  }))
  return [...before, ...inserted, ...shiftedAfter]
}

function stableSerialize(value: unknown): string {
  try {
    return JSON.stringify(value ?? null)
  } catch {
    return String(value ?? '')
  }
}

function simpleHash(value: string): string {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0
  }
  return Math.abs(hash).toString(36)
}

const ACTIVE_PAGE_RADIUS = 2
const EDITOR_INTERACTION_PREHEAT_PAUSE_MS = 30000
const ALPHATAB_RENDERER_SNAPSHOT_VERSION = 'alphatab-snapshot-font-class-v6'
const TABLATURE_RENDERER_SNAPSHOT_VERSION = 'tablature-free-time-clean-slur-above-v6'
type BlockHeightSource = 'estimated' | 'calibrated' | 'measured'

const MUSIC_RENDERER_BLOCK_TYPES = new Set(['notation', 'rhythm', 'tablature', 'chord_grid', 'keyboard', 'keyboard_grid', 'chord_diagram'])

function getBlockHeightCacheKey(block: EditorBlock): string {
  return `${block.id}-${simpleHash(stableSerialize({
    block_type: block.block_type,
    title: block.title,
    content: block.content,
    render_data: block.render_data,
    renderer_snapshot_version: blockUsesAlphaTab(block)
      ? ALPHATAB_RENDERER_SNAPSHOT_VERSION
      : block.block_type === 'tablature'
        ? TABLATURE_RENDERER_SNAPSHOT_VERSION
        : undefined,
  }))}`
}

function getMeasuredBlockOuterHeight(element: HTMLElement) {
  const style = window.getComputedStyle(element)
  const marginTop = Number.parseFloat(style.marginTop) || 0
  const marginBottom = Number.parseFloat(style.marginBottom) || 0
  return element.offsetHeight + marginTop + marginBottom
}

function isFreeTimeTablatureBlock(block: EditorBlock) {
  const renderData = (block.render_data ?? {}) as Record<string, any>
  const notationData = renderData.notation_data as Record<string, any> | undefined
  const alphaTex = typeof renderData.alphaTex === 'string' ? renderData.alphaTex : ''
  return block.block_type === 'tablature' && (
    notationData?.timeSignature === 'free' ||
    (alphaTex.includes('\\ft') && !/\\(?:ts|time)\s+\d+\s*(?:[\/xX]\s*)?\d+/.test(alphaTex))
  )
}

function cleanTablatureSnapshotArtifacts(html: string, block: EditorBlock): string {
  if (block.block_type !== 'tablature' || typeof DOMParser === 'undefined') return html

  const shouldHideFreeTime = isFreeTimeTablatureBlock(block)
  const document = new DOMParser().parseFromString(html, 'text/html')
  const hideSvgElement = (element: SVGElement) => {
    const currentStyle = element.getAttribute('style') ?? ''
    if (!/display\s*:\s*none/i.test(currentStyle)) {
      element.setAttribute('style', `${currentStyle}${currentStyle && !currentStyle.trim().endsWith(';') ? ';' : ''} display: none;`.trim())
    }
  }

  document.querySelectorAll('svg text').forEach(text => {
    const content = text.textContent?.trim() ?? ''
    const isTimeSignatureGlyph = /^[\uE080-\uE089]+$/.test(content)
    const isFreeTimeGlyph = content === '\uE241'
    if (shouldHideFreeTime && (content.toLowerCase().includes('free time') || isTimeSignatureGlyph || isFreeTimeGlyph)) {
      hideSvgElement(text as unknown as SVGElement)
    }
  })

  document.querySelectorAll('svg').forEach(svg => {
    raiseTabSlursInSvg(svg as unknown as SVGSVGElement)
  })

  document.querySelectorAll('body *').forEach(element => {
    if (element.textContent?.trim() === 'rendered by alphaTab') {
      ;(element as HTMLElement).style.display = 'none'
    }
  })

  if (shouldHideFreeTime) {
    document.querySelectorAll('svg g[transform]').forEach(group => {
      if (shouldHideAlphaTabSvgGroup(group.textContent, false)) {
        hideSvgElement(group as unknown as SVGElement)
      }
    })
  }

  return document.body.innerHTML
}

function sanitizeMusicSnapshotHtml(html: string, block: EditorBlock): string {
  return cleanTablatureSnapshotArtifacts(html, block)
    .replace(/\scontenteditable="[^"]*"/g, '')
    .replace(/\stabindex="[^"]*"/g, '')
}

function scheduleEditorIdleCallback(callback: () => void, timeout = 1200): () => void {
  if (typeof window === 'undefined') return () => {}
  const win = window as unknown as {
    requestIdleCallback?: (cb: () => void, options?: { timeout?: number }) => number
    cancelIdleCallback?: (handle: number) => void
  }

  if (typeof win.requestIdleCallback === 'function') {
    const handle = win.requestIdleCallback(callback, { timeout })
    return () => win.cancelIdleCallback?.(handle)
  }

  const handle = window.setTimeout(callback, 200)
  return () => window.clearTimeout(handle)
}

function PropertiesCollapsibleSection({
  title,
  subtitle,
  open,
  onOpenChange,
  children,
}: {
  title: string
  subtitle?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange} className="prop-section rounded-lg border border-border/70 bg-surface">
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors hover:bg-bg2/70"
        >
          <span>
            <span className="prop-label mb-0 block">{title}</span>
            {subtitle ? <span className="mt-0.5 block text-[9px] leading-snug text-text3">{subtitle}</span> : null}
          </span>
          <CaretRight
            size={13}
            className={`shrink-0 text-text3 transition-transform ${open ? 'rotate-90' : ''}`}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-3 border-t border-border/70 p-3">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

function QrCodePreview({ value, className = '' }: { value: string; className?: string }) {
  const [qrSrc, setQrSrc] = useState('')

  useEffect(() => {
    let cancelled = false
    const text = value.trim()
    if (!text) {
      setQrSrc('')
      return
    }

    void QRCodeLib.toDataURL(text, {
      width: 168,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#111827', light: '#ffffff' },
    }).then(src => {
      if (!cancelled) setQrSrc(src)
    }).catch(() => {
      if (!cancelled) setQrSrc('')
    })

    return () => { cancelled = true }
  }, [value])

  if (!value.trim()) {
    return (
      <div className={`flex h-32 items-center justify-center rounded-lg border border-dashed border-border bg-bg2 text-center text-[10px] leading-snug text-text3 ${className}`}>
        Cole uma URL para gerar o preview.
      </div>
    )
  }

  if (!qrSrc) {
    return (
      <div className={`flex h-32 items-center justify-center rounded-lg border border-border bg-bg2 text-text3 ${className}`}>
        <SpinnerGap size={16} className="animate-spin" />
      </div>
    )
  }

  return (
    <div className={`rounded-lg border border-border bg-white p-3 shadow-sm ${className}`}>
      <img src={qrSrc} alt="Preview do QR Code" className="mx-auto h-32 w-32" />
    </div>
  )
}

function isElementComfortablyVisibleInContainer(element: HTMLElement, container: HTMLElement): boolean {
  const elementRect = element.getBoundingClientRect()
  const containerRect = container.getBoundingClientRect()
  const verticalPadding = 80

  return elementRect.top >= containerRect.top + verticalPadding &&
    elementRect.bottom <= containerRect.bottom - verticalPadding
}

function getEditorPerformanceDomMetrics() {
  if (typeof document === 'undefined') {
    return {
      pages: 0,
      activePages: 0,
      placeholderPages: 0,
      canvasBlocks: 0,
      measurementBlocks: 0,
      totalBlocksInDom: 0,
      alphaTabSurfaces: 0,
      svgCount: 0,
    }
  }

  const canvasBlocks = document.querySelectorAll('.canvas-block').length
  const measurementBlocks = document.querySelectorAll('[data-editor-measurement-block]').length
  const activePages = document.querySelectorAll('[data-editor-page-active="true"]').length
  const placeholderPages = document.querySelectorAll('[data-editor-page-active="false"]').length
  return {
    pages: document.querySelectorAll('.a4-page').length,
    activePages,
    placeholderPages,
    canvasBlocks,
    measurementBlocks,
    totalBlocksInDom: canvasBlocks + measurementBlocks,
    alphaTabSurfaces: document.querySelectorAll('.at-surface').length,
    svgCount: document.querySelectorAll('svg').length,
  }
}

function editorBlockToExerciseBlock(block: EditorBlock) {
  return {
    block_type: block.block_type,
    title: block.title ?? '',
    content: block.content ? cloneJsonValue(block.content) : null,
    render_data: block.render_data ? cloneJsonValue(block.render_data) : {},
    sort_order: 1,
  }
}

// --- Item da sidebar de blocos ---

const BlockListItem = memo(function BlockListItem({
  block, isSelected, onSelectBlock, onDeleteBlock, onDuplicateBlock,
}: {
  block: EditorBlock
  isSelected: boolean
  onSelectBlock: (id: string) => void
  onDeleteBlock: (id: string) => void
  onDuplicateBlock: (id: string) => void
}) {
  const cfg = getBlockConfig(block.block_type)
  const Icon = cfg.icon
  const handleSelect = useCallback(() => onSelectBlock(block.id), [block.id, onSelectBlock])
  const handleDuplicate = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onDuplicateBlock(block.id)
  }, [block.id, onDuplicateBlock])
  const handleDelete = useCallback(() => onDeleteBlock(block.id), [block.id, onDeleteBlock])

  return (
    <div
      className={`block-item ${isSelected ? 'selected' : ''}`}
      onClick={handleSelect}
    >
      <div className="flex items-center gap-2">
        <div className="block-type-icon" style={{ background: cfg.bg, color: cfg.color }}>
          <Icon size={16} />
        </div>
        <div className="min-w-0">
          <div className="font-bold text-xs truncate">{cfg.label}</div>
          <div className="text-[11px] text-text3 truncate">{block.title ?? '(sem título)'}</div>
        </div>
      </div>
      <div className="block-actions">
        {block.is_edited && (
          <span className="text-[9px] text-dourado font-bold mr-1">editado</span>
        )}
        <button onClick={handleDuplicate} title="Duplicar bloco" className="hover:text-accent transition-colors">
          <Copy size={12} />
        </button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button onClick={e => e.stopPropagation()} title="Remover">
              <Trash size={12} />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover bloco?</AlertDialogTitle>
              <AlertDialogDescription>
                O bloco "{block.title ?? cfg.label}" será removido permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-vermelho hover:bg-vermelho/80">
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
})

function useEditorAutosave({
  blocksRef,
  initialLoadDone,
}: {
  blocksRef: React.MutableRefObject<EditorBlock[]>
  initialLoadDone: React.MutableRefObject<boolean>
}) {
  const [, setHasUnsavedChanges] = useState(false)
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedBlockRef = useRef<string | null>(null)
  const savedBlockHashRef = useRef<Record<string, string>>({})
  const [dirtySignal, setDirtySignal] = useState<{ blockId: string; token: number } | null>(null)

  const resetAutosaveBaseline = useCallback((blocks: EditorBlock[]) => {
    const next: Record<string, string> = {}
    for (const block of blocks) {
      if (!block.id.startsWith('temp_')) {
        next[block.id] = getBlockHeightCacheKey(block)
      }
    }
    savedBlockHashRef.current = next
    setAutoSaveStatus('saved')
    setHasUnsavedChanges(false)
  }, [])

  const queueBlockAutosave = useCallback((blockId: string) => {
    if (!initialLoadDone.current || blockId.startsWith('temp_')) return
    setDirtySignal({ blockId, token: performance.now() })
  }, [initialLoadDone])

  useEffect(() => {
    if (!initialLoadDone.current || !dirtySignal) return
    const { blockId } = dirtySignal
    const block = blocksRef.current.find(b => b.id === blockId)
    if (!block || block.id.startsWith('temp_')) return
    const blockHash = getBlockHeightCacheKey(block)
    if (savedBlockHashRef.current[block.id] === blockHash) return

    setAutoSaveStatus('unsaved')
    setHasUnsavedChanges(true)

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    autoSaveTimerRef.current = setTimeout(async () => {
      const current = blocksRef.current.find(b => b.id === blockId)
      if (!current || current.id.startsWith('temp_')) return
      const currentHash = getBlockHeightCacheKey(current)
      if (savedBlockHashRef.current[current.id] === currentHash) return
      setAutoSaveStatus('saving')
      const saveStartedAt = import.meta.env.DEV ? performance.now() : 0
      try {
        await updateMaterialBlockRpc({
          blockId: current.id,
          title: current.title,
          content: current.content,
          renderData: current.render_data,
        })
        if (import.meta.env.DEV) {
          console.info('[EditorPerf] autosave ' + JSON.stringify({
            blockId: current.id,
            blockType: current.block_type,
            title: current.title,
            durationMs: Math.round((performance.now() - saveStartedAt) * 10) / 10,
            ...getEditorPerformanceDomMetrics(),
          }))
        }
        lastSavedBlockRef.current = current.id
        savedBlockHashRef.current[current.id] = currentHash
        setAutoSaveStatus('saved')
        setHasUnsavedChanges(false)
      } catch (e: any) {
        setAutoSaveStatus('unsaved')
        toast.error('Erro no autosave: ' + (e?.message ?? ''))
      }
    }, 800)

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    }
  }, [blocksRef, dirtySignal, initialLoadDone])

  return {
    autoSaveStatus,
    queueBlockAutosave,
    resetAutosaveBaseline,
  }
}

function useEditorPagination({
  blocks,
  blocksRef,
  canvasScrollRef,
  musicRendererSnapshotCacheRef,
  selectedBlockId,
}: {
  blocks: EditorBlock[]
  blocksRef: React.MutableRefObject<EditorBlock[]>
  canvasScrollRef: React.RefObject<HTMLDivElement | null>
  musicRendererSnapshotCacheRef: React.MutableRefObject<Map<string, MusicSnapshotCacheEntry>>
  selectedBlockId: string | null
}) {
  const [blockHeights, setBlockHeights] = useState<Record<string, number>>({})
  const blockHeightCacheRef = useRef<Map<string, number>>(new Map())
  const blockHeightSourceByKeyRef = useRef<Map<string, BlockHeightSource>>(new Map())
  const blockHeightKeyByIdRef = useRef<Record<string, string>>({})
  const [currentVisiblePage, setCurrentVisiblePage] = useState(0)
  const [forceAllPagesActive, setForceAllPagesActive] = useState(false)

  useEffect(() => {
    const keysById: Record<string, string> = {}
    const estimatedHeights: Record<string, number> = {}

    for (const block of blocks) {
      if (block.block_type === 'page_break') continue
      const key = getBlockHeightCacheKey(block)
      keysById[block.id] = key
      estimatedHeights[block.id] = blockHeightCacheRef.current.get(key) ?? getEstimatedBlockHeightForPagination(block)
    }
    blockHeightKeyByIdRef.current = keysById

    setBlockHeights(prev => {
      const same = Object.keys(estimatedHeights).length === Object.keys(prev).length &&
        Object.entries(estimatedHeights).every(([id, height]) => Math.abs((prev[id] ?? 0) - height) < 2)
      return same ? prev : estimatedHeights
    })
  }, [blocks])

  const paginationResult = useMemo(() => paginateBlocks(
    blocks,
    block => blockHeights[block.id] ?? getEstimatedBlockHeightForPagination(block),
  ), [blocks, blockHeights])
  const pages = paginationResult.pages
  const paginationBreakReasons = paginationResult.breakReasons
  const canvasPages = useMemo(() => applyCanvasLayoutPageOffsets(pages), [pages])

  const pageIndexByBlockId = useMemo(() => {
    const indexById: Record<string, number> = {}
    canvasPages.forEach((pageBlocks, pageIdx) => {
      pageBlocks.forEach(block => {
        indexById[block.id] = pageIdx
        const sourceBlockId = getPaginationSourceBlockId(block)
        if (sourceBlockId !== block.id && indexById[sourceBlockId] == null) {
          indexById[sourceBlockId] = pageIdx
        }
      })
    })
    return indexById
  }, [canvasPages])

  const pageBlockById = useMemo(() => {
    const byId = new Map<string, EditorBlock>()
    canvasPages.forEach(pageBlocks => {
      pageBlocks.forEach(block => byId.set(block.id, block))
    })
    return byId
  }, [canvasPages])

  const selectedPageIndex = selectedBlockId ? pageIndexByBlockId[selectedBlockId] : undefined
  const activePageIndexes = useMemo(() => {
    if (forceAllPagesActive) {
      return new Set(canvasPages.map((_, idx) => idx))
    }

    const active = new Set<number>()
    const addWindow = (center: number | undefined) => {
      if (typeof center !== 'number' || Number.isNaN(center)) return
      for (let idx = center - ACTIVE_PAGE_RADIUS; idx <= center + ACTIVE_PAGE_RADIUS; idx += 1) {
        if (idx >= 0 && idx < canvasPages.length) active.add(idx)
      }
    }

    addWindow(currentVisiblePage)
    if (typeof selectedPageIndex === 'number' && selectedPageIndex >= 0 && selectedPageIndex < canvasPages.length) {
      active.add(selectedPageIndex)
    }

    if (active.size === 0 && canvasPages.length > 0) addWindow(0)
    return active
  }, [canvasPages, currentVisiblePage, forceAllPagesActive, selectedPageIndex])

  useEffect(() => {
    const canvas = canvasScrollRef.current
    if (!canvas || blocks.length === 0) return

    const timer = window.setTimeout(() => {
      const measured: Record<string, number> = {}
      const children = canvas.querySelectorAll<HTMLElement>('.canvas-block[data-block-id]')

      children.forEach(el => {
        const id = el.getAttribute('data-block-id')
        if (!id) return
        const block = pageBlockById.get(id) ?? blocksRef.current.find(item => item.id === id)
        const key = blockHeightKeyByIdRef.current[id] ?? (block ? getBlockHeightCacheKey(block) : undefined)
        if (!key) return
        const height = getMeasuredBlockOuterHeight(el)
        if (height <= 0) return
        blockHeightCacheRef.current.set(key, height)
        measured[id] = height

        if (block && MUSIC_RENDERER_BLOCK_TYPES.has(block.block_type) && !blockUsesAlphaTab(block)) {
          const html = sanitizeMusicSnapshotHtml(el.innerHTML, block)
          if (isUsableMusicSnapshotHtml(html, block)) {
            musicRendererSnapshotCacheRef.current.set(id, {
              hash: key,
              html,
              height,
            })
          }
        }
      })

      setBlockHeights(prev => {
        if (Object.keys(measured).length === 0) return prev
        let changed = false
        const next = { ...prev }
        for (const [id, height] of Object.entries(measured)) {
          if (Math.abs((prev[id] ?? 0) - height) >= 2) {
            next[id] = height
            changed = true
          }
        }
        return changed ? next : prev
      })
    }, 150)

    return () => window.clearTimeout(timer)
  }, [blocks, blocksRef, canvasScrollRef, musicRendererSnapshotCacheRef, pageBlockById, pages.length])

  return {
    activePageIndexes,
    currentVisiblePage,
    forceAllPagesActive,
    pageIndexByBlockId,
    pages,
    setCurrentVisiblePage,
    setForceAllPagesActive,
  }
}

interface CanvasMaterialPreviewProps {
  block: EditorBlock
  brandKit?: {
    primaryColor?: string | null
    secondaryColor?: string | null
  }
  coverTitleEditing: boolean
  musicRendererSnapshotCacheRef?: React.MutableRefObject<Map<string, MusicSnapshotCacheEntry>>
  canHydrateMusicRenderer?: boolean
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
  onLegacyCoverTextActivate?: () => void
  onLegacyNotationStavePointerDown: (blockId: string, staveIndex: number) => void
  onChordGridItemClick: (blockId: string, chord: any, index: number) => void
  onKeyboardGridItemClick: (blockId: string, keyboard: any, index: number) => void
  onCoverPositionChange: (blockId: string, field: string, pos: { x: number; y: number }) => void
  onCoverRenderDataChange: (blockId: string, patch: Record<string, any>) => void
  onCoverLogoDuplicate: (blockId: string) => void
  onCoverTitleChange: (value: string) => void
}

const CanvasMaterialPreview = memo(function CanvasMaterialPreview({
  block,
  brandKit,
  coverTitleEditing,
  musicRendererSnapshotCacheRef,
  canHydrateMusicRenderer = true,
  overlayElements,
  selectedOverlayId,
  onOverlaySelect,
  onOverlayUpdate,
  onOverlayCloneForDrag,
  textElements,
  selectedTextId,
  editingTextId,
  onTextSelect,
  onTextUpdate,
  onTextEditStart,
  onTextCopy,
  onTextDuplicate,
  onTextDelete,
  onTextCloneForDrag,
  onTextLayerChange,
  onLegacyCoverTextActivate,
  onLegacyNotationStavePointerDown,
  onChordGridItemClick,
  onKeyboardGridItemClick,
  onCoverPositionChange,
  onCoverRenderDataChange,
  onCoverLogoDuplicate,
  onCoverTitleChange,
}: CanvasMaterialPreviewProps) {
  const realRendererRef = useRef<HTMLDivElement | null>(null)
  const previewBlock = useMemo(() => editorBlockToPreview(block), [block])
  const previewBlocks = useMemo(() => [previewBlock], [previewBlock])
  const snapshotKey = useMemo(() => getBlockHeightCacheKey(block), [block])
  const isAlphaTabRendererBlock = blockUsesAlphaTab(block)
  const isMusicRendererBlock = MUSIC_RENDERER_BLOCK_TYPES.has(block.block_type) || isAlphaTabRendererBlock
  const canUseMusicSnapshot = isMusicRendererBlock && !isAlphaTabRendererBlock
  const cachedSnapshot = canUseMusicSnapshot ? musicRendererSnapshotCacheRef?.current.get(block.id) : undefined
  const validSnapshot = cachedSnapshot?.hash === snapshotKey ? cachedSnapshot : null
  const [mountRealRenderer, setMountRealRenderer] = useState(() => !validSnapshot)
  const [showSnapshot, setShowSnapshot] = useState(() => canUseMusicSnapshot && Boolean(validSnapshot))

  const captureMusicSnapshot = useCallback((htmlOverride?: string) => {
    if (!canUseMusicSnapshot || !musicRendererSnapshotCacheRef) return
    const el = realRendererRef.current
    const rawHtml = htmlOverride ?? el?.innerHTML
    if (!rawHtml || rawHtml.trim().length === 0) return
    const html = sanitizeMusicSnapshotHtml(rawHtml, block)
    if (!isUsableMusicSnapshotHtml(html, block)) return
    musicRendererSnapshotCacheRef.current.set(block.id, {
      hash: snapshotKey,
      html,
      height: el?.offsetHeight || validSnapshot?.height || getEstimatedBlockHeightForPagination(block),
    })
    setShowSnapshot(false)
    if (import.meta.env.DEV) {
      console.info('[EditorPerf] musicSnapshot ' + JSON.stringify({
        action: 'capture',
        blockId: block.id,
        blockType: block.block_type,
        htmlLength: html.length,
      }))
    }
  }, [block, block.id, canUseMusicSnapshot, musicRendererSnapshotCacheRef, snapshotKey, validSnapshot?.height])

  useEffect(() => {
    if (!isMusicRendererBlock) {
      setMountRealRenderer(true)
      setShowSnapshot(false)
      return
    }

    const snapshot = musicRendererSnapshotCacheRef?.current.get(block.id)
    const hasSnapshot = snapshot?.hash === snapshotKey
    if (import.meta.env.DEV && hasSnapshot) {
      console.info('[EditorPerf] musicSnapshot ' + JSON.stringify({
        action: 'use',
        blockId: block.id,
        blockType: block.block_type,
        htmlLength: snapshot.html.length,
      }))
    }
    setShowSnapshot(Boolean(hasSnapshot))
    setMountRealRenderer(shouldMountMusicRenderer({
      hasValidSnapshot: Boolean(hasSnapshot),
      canHydrateMusicRenderer,
    }))

    if (!hasSnapshot || !canHydrateMusicRenderer) return

    const hydrationTimer = window.setTimeout(() => setMountRealRenderer(true), isAlphaTabRendererBlock ? 80 : 700)
    return () => window.clearTimeout(hydrationTimer)
  }, [block.id, canHydrateMusicRenderer, isAlphaTabRendererBlock, isMusicRendererBlock, musicRendererSnapshotCacheRef, snapshotKey])

  useEffect(() => {
    if (!mountRealRenderer || !isMusicRendererBlock || isAlphaTabRendererBlock) return
    let frameOne = 0
    let frameTwo = 0
    frameOne = window.requestAnimationFrame(() => {
      frameTwo = window.requestAnimationFrame(() => captureMusicSnapshot())
    })

    return () => {
      window.cancelAnimationFrame(frameOne)
      window.cancelAnimationFrame(frameTwo)
    }
  }, [captureMusicSnapshot, isAlphaTabRendererBlock, isMusicRendererBlock, mountRealRenderer])

  const handleMusicStableRender = useCallback(
    (_previewBlock: MaterialBlock, html: string) => captureMusicSnapshot(html),
    [captureMusicSnapshot],
  )

  useLayoutEffect(() => () => captureMusicSnapshot(), [captureMusicSnapshot])

  const handleLegacyNotationStavePointerDown = useCallback(
    (staveIndex: number) => onLegacyNotationStavePointerDown(block.id, staveIndex),
    [block.id, onLegacyNotationStavePointerDown],
  )
  const handleChordGridItemClick = useCallback(
    (_previewBlock: MaterialBlock, chord: any, index: number) => onChordGridItemClick(block.id, chord, index),
    [block.id, onChordGridItemClick],
  )
  const handleKeyboardGridItemClick = useCallback(
    (_previewBlock: MaterialBlock, keyboard: any, index: number) => onKeyboardGridItemClick(block.id, keyboard, index),
    [block.id, onKeyboardGridItemClick],
  )
  const handleCoverPositionChange = useCallback(
    (field: string, pos: { x: number; y: number }) => onCoverPositionChange(block.id, field, pos),
    [block.id, onCoverPositionChange],
  )
  const handleCoverRenderDataChange = useCallback(
    (patch: Record<string, any>) => onCoverRenderDataChange(block.id, patch),
    [block.id, onCoverRenderDataChange],
  )
  const handleCoverLogoDuplicate = useCallback(
    () => onCoverLogoDuplicate(block.id),
    [block.id, onCoverLogoDuplicate],
  )

  const preview = (
    <MaterialPreview
      blocks={previewBlocks}
      brandKit={brandKit}
      onLegacyNotationStavePointerDown={handleLegacyNotationStavePointerDown}
      onMusicStableRender={handleMusicStableRender}
      onChordGridItemClick={handleChordGridItemClick}
      onKeyboardGridItemClick={handleKeyboardGridItemClick}
      coverEditable={block.block_type === 'cover'}
      onCoverPositionChange={block.block_type === 'cover' ? handleCoverPositionChange : undefined}
      onCoverRenderDataChange={block.block_type === 'cover' ? handleCoverRenderDataChange : undefined}
      onCoverLogoDuplicate={block.block_type === 'cover' ? handleCoverLogoDuplicate : undefined}
      coverTitleEditing={block.block_type === 'cover' && coverTitleEditing}
      onCoverTitleChange={block.block_type === 'cover' ? onCoverTitleChange : undefined}
      overlayElements={block.block_type === 'cover' ? overlayElements : undefined}
      selectedOverlayId={block.block_type === 'cover' ? selectedOverlayId : undefined}
      onOverlaySelect={block.block_type === 'cover' ? onOverlaySelect : undefined}
      onOverlayUpdate={block.block_type === 'cover' ? onOverlayUpdate : undefined}
      onOverlayCloneForDrag={block.block_type === 'cover' ? onOverlayCloneForDrag : undefined}
      textElements={block.block_type === 'cover' ? textElements : undefined}
      selectedTextId={block.block_type === 'cover' ? selectedTextId : undefined}
      editingTextId={block.block_type === 'cover' ? editingTextId : undefined}
      onTextSelect={block.block_type === 'cover' ? onTextSelect : undefined}
      onTextUpdate={block.block_type === 'cover' ? onTextUpdate : undefined}
      onTextEditStart={block.block_type === 'cover' ? onTextEditStart : undefined}
      onTextCopy={block.block_type === 'cover' ? onTextCopy : undefined}
      onTextDuplicate={block.block_type === 'cover' ? onTextDuplicate : undefined}
      onTextDelete={block.block_type === 'cover' ? onTextDelete : undefined}
      onTextCloneForDrag={block.block_type === 'cover' ? onTextCloneForDrag : undefined}
      onTextLayerChange={block.block_type === 'cover' ? onTextLayerChange : undefined}
      onLegacyTextActivate={block.block_type === 'cover' ? onLegacyCoverTextActivate : undefined}
    />
  )

  if (!isMusicRendererBlock || isAlphaTabRendererBlock) {
    return preview
  }

  return (
    <div className="relative" data-editor-music-preview={block.id}>
      {showSnapshot && validSnapshot && (
        <div
          data-editor-music-snapshot={block.id}
          className="canvas-block-snapshot pointer-events-none"
          style={{ minHeight: `${validSnapshot.height}px` }}
          dangerouslySetInnerHTML={{ __html: validSnapshot.html }}
        />
      )}
      {!showSnapshot && !mountRealRenderer && (
        <div
          data-editor-music-placeholder={block.id}
          className="canvas-block-snapshot pointer-events-none"
          style={{ minHeight: `${validSnapshot?.height ?? getEstimatedBlockHeightForPagination(block)}px` }}
        />
      )}
      {mountRealRenderer && (
        <div
          ref={realRendererRef}
          style={showSnapshot ? { position: 'absolute', inset: 0, visibility: 'hidden', pointerEvents: 'none' } : undefined}
          aria-hidden={showSnapshot ? true : undefined}
        >
          {preview}
        </div>
      )}
    </div>
  )
}, (prev, next) => {
  if (prev.block !== next.block) return false

  const isCover = prev.block.block_type === 'cover'
  if (!isCover) {
    return (
      prev.onLegacyNotationStavePointerDown === next.onLegacyNotationStavePointerDown &&
      prev.onChordGridItemClick === next.onChordGridItemClick &&
      prev.onKeyboardGridItemClick === next.onKeyboardGridItemClick &&
      prev.onCoverPositionChange === next.onCoverPositionChange &&
      prev.onCoverTitleChange === next.onCoverTitleChange &&
      prev.musicRendererSnapshotCacheRef === next.musicRendererSnapshotCacheRef &&
      prev.canHydrateMusicRenderer === next.canHydrateMusicRenderer
    )
  }

  return (
    prev.coverTitleEditing === next.coverTitleEditing &&
    prev.overlayElements === next.overlayElements &&
    prev.selectedOverlayId === next.selectedOverlayId &&
    prev.onOverlaySelect === next.onOverlaySelect &&
    prev.onOverlayUpdate === next.onOverlayUpdate &&
    prev.onOverlayCloneForDrag === next.onOverlayCloneForDrag &&
    prev.textElements === next.textElements &&
    prev.selectedTextId === next.selectedTextId &&
    prev.editingTextId === next.editingTextId &&
    prev.onTextSelect === next.onTextSelect &&
    prev.onTextUpdate === next.onTextUpdate &&
    prev.onTextEditStart === next.onTextEditStart &&
    prev.onTextCopy === next.onTextCopy &&
    prev.onTextDuplicate === next.onTextDuplicate &&
    prev.onTextDelete === next.onTextDelete &&
    prev.onTextCloneForDrag === next.onTextCloneForDrag &&
    prev.onTextLayerChange === next.onTextLayerChange &&
    prev.onLegacyCoverTextActivate === next.onLegacyCoverTextActivate &&
    prev.onLegacyNotationStavePointerDown === next.onLegacyNotationStavePointerDown &&
    prev.onChordGridItemClick === next.onChordGridItemClick &&
    prev.onKeyboardGridItemClick === next.onKeyboardGridItemClick &&
    prev.onCoverPositionChange === next.onCoverPositionChange &&
    prev.onCoverTitleChange === next.onCoverTitleChange &&
    prev.musicRendererSnapshotCacheRef === next.musicRendererSnapshotCacheRef &&
    prev.canHydrateMusicRenderer === next.canHydrateMusicRenderer
  )
})

function MusicSnapshotPreheater({
  blocks,
  enabled,
  musicRendererSnapshotCacheRef,
}: {
  blocks: EditorBlock[]
  enabled: boolean
  musicRendererSnapshotCacheRef: React.MutableRefObject<Map<string, MusicSnapshotCacheEntry>>
}) {
  const [currentBlock, setCurrentBlock] = useState<EditorBlock | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const queueRef = useRef<EditorBlock[]>([])
  const runningRef = useRef(false)
  const cancelIdleRef = useRef<(() => void) | null>(null)
  const lastInteractionRef = useRef(typeof performance === 'undefined' ? 0 : performance.now())

  const scheduleNext = useCallback(() => {
    cancelIdleRef.current?.()
    cancelIdleRef.current = scheduleEditorIdleCallback(() => {
      if (!enabled || runningRef.current) return
      if (performance.now() - lastInteractionRef.current < EDITOR_INTERACTION_PREHEAT_PAUSE_MS) {
        scheduleNext()
        return
      }

      while (queueRef.current.length > 0) {
        const next = queueRef.current.shift()!
        const key = getBlockHeightCacheKey(next)
        const cached = musicRendererSnapshotCacheRef.current.get(next.id)
        if (cached?.hash === key && cached.html.trim().length > 0) continue

        runningRef.current = true
        setCurrentBlock(next)
        return
      }

      setCurrentBlock(null)
    }, 300)
  }, [enabled, musicRendererSnapshotCacheRef])

  useEffect(() => {
    const markInteraction = () => {
      lastInteractionRef.current = performance.now()
      cancelIdleRef.current?.()
      if (runningRef.current) {
        runningRef.current = false
        setCurrentBlock(null)
      }
      window.setTimeout(scheduleNext, EDITOR_INTERACTION_PREHEAT_PAUSE_MS)
    }
    window.addEventListener('pointerdown', markInteraction, true)
    window.addEventListener('keydown', markInteraction, true)
    window.addEventListener('wheel', markInteraction, true)
    return () => {
      window.removeEventListener('pointerdown', markInteraction, true)
      window.removeEventListener('keydown', markInteraction, true)
      window.removeEventListener('wheel', markInteraction, true)
    }
  }, [])

  useEffect(() => {
    if (!enabled || blocks.length === 0) {
      queueRef.current = []
      runningRef.current = false
      setCurrentBlock(null)
      cancelIdleRef.current?.()
      return
    }

    queueRef.current = blocks.filter(block => {
      if (blockUsesAlphaTab(block)) return false
      if (!MUSIC_RENDERER_BLOCK_TYPES.has(block.block_type)) return false
      const key = getBlockHeightCacheKey(block)
      const cached = musicRendererSnapshotCacheRef.current.get(block.id)
      return cached?.hash !== key || cached.html.trim().length === 0
    })

    scheduleNext()

    return () => {
      cancelIdleRef.current?.()
    }
  }, [blocks, enabled, musicRendererSnapshotCacheRef, scheduleNext])

  const finishPreheat = useCallback(() => {
    runningRef.current = false
    setCurrentBlock(null)
    scheduleEditorIdleCallback(scheduleNext, 1500)
  }, [scheduleNext])

  const storePreheatedSnapshot = useCallback((block: EditorBlock, rawHtml: string) => {
    if (blockUsesAlphaTab(block)) {
      finishPreheat()
      return
    }

    const el = containerRef.current
    const snapshotHtml = sanitizeMusicSnapshotHtml(rawHtml, block)
    if (!isUsableMusicSnapshotHtml(snapshotHtml, block)) {
      queueRef.current.push(block)
      finishPreheat()
      return
    }

    musicRendererSnapshotCacheRef.current.set(block.id, {
      hash: getBlockHeightCacheKey(block),
      html: snapshotHtml,
      height: el?.offsetHeight || getEstimatedBlockHeightForPagination(block),
    })

    if (import.meta.env.DEV) {
      console.info('[EditorPerf] musicSnapshot ' + JSON.stringify({
        action: 'preheat',
        blockId: block.id,
        blockType: block.block_type,
        htmlLength: snapshotHtml.length,
      }))
    }

    finishPreheat()
  }, [finishPreheat, musicRendererSnapshotCacheRef])

  const handlePreheaterStableRender = useCallback((_previewBlock: MaterialBlock, html: string) => {
    if (!currentBlock) return
    storePreheatedSnapshot(currentBlock, html)
  }, [currentBlock, storePreheatedSnapshot])

  useEffect(() => {
    if (!currentBlock || blockUsesAlphaTab(currentBlock)) return
    let frameOne = 0
    let frameTwo = 0
    frameOne = window.requestAnimationFrame(() => {
      frameTwo = window.requestAnimationFrame(() => {
        const html = containerRef.current?.innerHTML
        if (!html) {
          queueRef.current.push(currentBlock)
          finishPreheat()
          return
        }
        storePreheatedSnapshot(currentBlock, html)
      })
    })

    return () => {
      window.cancelAnimationFrame(frameOne)
      window.cancelAnimationFrame(frameTwo)
    }
  }, [currentBlock, finishPreheat, storePreheatedSnapshot])

  const previewBlocks = useMemo(
    () => currentBlock ? [editorBlockToPreview(currentBlock)] : [],
    [currentBlock],
  )

  if (!currentBlock) return null

  return (
    <div
      ref={containerRef}
      data-editor-snapshot-preheater={currentBlock.id}
      aria-hidden="true"
      style={{
        position: 'fixed',
        left: '0px',
        top: '0px',
        zIndex: -1,
        width: '746px',
        minHeight: '120px',
        opacity: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      <MaterialPreview blocks={previewBlocks} onMusicStableRender={handlePreheaterStableRender} />
    </div>
  )
}

function useEditorBlocks() {
  const [blocks, setBlocks] = useState<EditorBlock[]>([])
  const blocksRef = useRef<EditorBlock[]>([])
  blocksRef.current = blocks
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const undoStack = useRef<EditorHistoryEntry[]>([])
  const redoStack = useRef<EditorHistoryEntry[]>([])
  const pendingBeforeBlocksRef = useRef<EditorBlock[] | null>(null)
  const [, setHistoryVersion] = useState(0)

  const createHistoryEntry = useCallback((before: EditorBlock[], after: EditorBlock[]): EditorHistoryEntry | null => {
    const beforeMap = new Map(before.map(block => [block.id, block]))
    const afterMap = new Map(after.map(block => [block.id, block]))
    const patches: EditorBlockPatch<EditorBlock>[] = []

    for (const block of before) {
      const nextBlock = afterMap.get(block.id)
      if (!nextBlock) {
        patches.push(createBlockPatch(block.id, block, null))
        continue
      }
      if (block !== nextBlock && stableSerialize(block) !== stableSerialize(nextBlock)) {
        patches.push(createBlockPatch(block.id, block, nextBlock))
      }
    }

    for (const block of after) {
      if (!beforeMap.has(block.id)) {
        patches.push(createBlockPatch(block.id, null, block))
      }
    }

    const beforeOrder = before.map(block => block.id)
    const afterOrder = after.map(block => block.id)
    const orderChanged = beforeOrder.length !== afterOrder.length ||
      beforeOrder.some((id, index) => afterOrder[index] !== id)

    if (patches.length === 0 && !orderChanged) return null
    return { patches, beforeOrder, afterOrder }
  }, [])

  const pushHistoryEntry = useCallback((entry: ReturnType<typeof createHistoryEntry>) => {
    if (!entry) return
    undoStack.current = [...undoStack.current.slice(-29), entry]
    redoStack.current = []
    setHistoryVersion(v => v + 1)
  }, [])

  const applyOrder = useCallback((items: EditorBlock[], order: string[]) => {
    const byId = new Map(items.map(block => [block.id, block]))
    const ordered = order
      .map(id => byId.get(id))
      .filter((block): block is EditorBlock => Boolean(block))
    const orderedIds = new Set(ordered.map(block => block.id))
    const remaining = items.filter(block => !orderedIds.has(block.id))
    return [...ordered, ...remaining]
  }, [])

  const applyHistoryEntry = useCallback((
    current: EditorBlock[],
    entry: EditorHistoryEntry,
    direction: 'forward' | 'backward',
  ) => {
    const patches = direction === 'forward' ? entry.patches : [...entry.patches].reverse()
    const patched = patches.reduce(
      (nextBlocks, patch) => applyBlockPatch(nextBlocks, patch, direction),
      current,
    )
    return applyOrder(patched, direction === 'forward' ? entry.afterOrder : entry.beforeOrder)
  }, [applyOrder, createHistoryEntry])

  const setBlocksWithHistory = useCallback((
    updater: EditorBlock[] | ((prev: EditorBlock[]) => EditorBlock[]),
  ) => {
    setBlocks(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      pushHistoryEntry(createHistoryEntry(prev, next))
      return next
    })
  }, [createHistoryEntry, pushHistoryEntry])

  const commitBlocksHistory = useCallback((before: EditorBlock[], after: EditorBlock[]) => {
    pushHistoryEntry(createHistoryEntry(before, after))
  }, [createHistoryEntry, pushHistoryEntry])

  const setBlockWithHistory = useCallback((
    blockId: string,
    updater: (block: EditorBlock) => EditorBlock,
  ) => {
    setBlocks(prev => {
      const before = prev.find(block => block.id === blockId)
      if (!before) return prev
      const after = updater(before)
      if (before === after || stableSerialize(before) === stableSerialize(after)) return prev
      pushHistoryEntry({
        patches: [createBlockPatch(blockId, before, after)],
        beforeOrder: prev.map(block => block.id),
        afterOrder: prev.map(block => block.id),
      })
      return prev.map(block => block.id === blockId ? after : block)
    })
  }, [pushHistoryEntry])

  const pushSnapshot = useCallback((snapshot: EditorBlock[]) => {
    pendingBeforeBlocksRef.current = snapshot
  }, [])

  useEffect(() => {
    const before = pendingBeforeBlocksRef.current
    if (!before || before === blocks) return
    pendingBeforeBlocksRef.current = null
    pushHistoryEntry(createHistoryEntry(before, blocks))
  }, [blocks, createHistoryEntry, pushHistoryEntry])

  const handleUndo = useCallback(() => {
    const entry = undoStack.current.pop()
    if (entry) {
      redoStack.current.push(entry)
      setBlocks(prev => applyHistoryEntry(prev, entry, 'backward'))
      setHistoryVersion(v => v + 1)
      toast.info('Desfazer', { duration: 1500 })
    }
  }, [applyHistoryEntry])

  const handleRedo = useCallback(() => {
    const entry = redoStack.current.pop()
    if (entry) {
      undoStack.current.push(entry)
      setBlocks(prev => applyHistoryEntry(prev, entry, 'forward'))
      setHistoryVersion(v => v + 1)
      toast.info('Refazer', { duration: 1500 })
    }
  }, [applyHistoryEntry])

  const canUndo = useCallback(() => undoStack.current.length > 0, [])
  const canRedo = useCallback(() => redoStack.current.length > 0, [])

  const clearHistory = useCallback(() => {
    undoStack.current = []
    redoStack.current = []
    pendingBeforeBlocksRef.current = null
    setHistoryVersion(v => v + 1)
  }, [])

  const selectedBlock = useMemo(
    () => blocks.find(b => b.id === selectedBlockId) ?? null,
    [blocks, selectedBlockId],
  )
  const selectedPaginationPolicy = useMemo(
    () => selectedBlock ? getBlockPaginationPolicy(selectedBlock) : null,
    [selectedBlock],
  )

  return {
    blocks,
    blocksRef,
    clearHistory,
    canRedo,
    canUndo,
    commitBlocksHistory,
    handleRedo,
    handleUndo,
    pushSnapshot,
    selectedBlock,
    selectedBlockId,
    selectedPaginationPolicy,
    setBlockWithHistory,
    setBlocks,
    setBlocksWithHistory,
    setSelectedBlockId,
  }
}

// =============================================
// PARTE 4: Listagem de Materiais
// =============================================

function MaterialList() {
  const navigate = useNavigate()
  const { data: school } = useSchool()
  const { data: materials, loading, error } = useMaterials(school?.id)

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-[26px] leading-[1.2] text-text">
            Editor de <em className="not-italic text-accent">Material</em>
          </h1>
          <p className="text-text2 text-[13.5px] mt-1.5">
            Gerencie e edite materiais didáticos gerados
          </p>
        </div>
        <Button onClick={() => navigate('/gerador')}>
          <Plus size={16} /> Novo Material
        </Button>
      </div>

      <div className="card">
        {loading && (
          <div className="flex items-center justify-center py-12 gap-2 text-text2">
            <SpinnerGap size={20} className="animate-spin" /> Carregando materiais...
          </div>
        )}

        {error && (
          <div className="p-4 bg-vermelho-soft rounded-[var(--radius-sm)] text-sm text-vermelho">
            Erro ao carregar materiais: {error}
          </div>
        )}

        {!loading && !error && (!materials || materials.length === 0) && (
          <div className="text-center py-12 text-text3 text-sm">
            <Article size={32} className="mx-auto mb-3 text-text3/50" />
            Nenhum material gerado ainda.
            <div className="mt-2">
              <Button variant="ghost" size="sm" onClick={() => navigate('/gerador')}>
                Ir para o Gerador
              </Button>
            </div>
          </div>
        )}

        {materials && materials.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-[9px] uppercase tracking-[2px] text-text3 font-semibold py-3 px-4">Título</th>
                  <th className="text-[9px] uppercase tracking-[2px] text-text3 font-semibold py-3 px-4">Jornada</th>
                  <th className="text-[9px] uppercase tracking-[2px] text-text3 font-semibold py-3 px-4">Estação</th>
                  <th className="text-[9px] uppercase tracking-[2px] text-text3 font-semibold py-3 px-4">Blocos</th>
                  <th className="text-[9px] uppercase tracking-[2px] text-text3 font-semibold py-3 px-4">Status</th>
                  <th className="text-[9px] uppercase tracking-[2px] text-text3 font-semibold py-3 px-4">Data</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((m: MaterialListItem) => (
                  <tr
                    key={m.id}
                    className="border-b border-border hover:bg-azul-soft/30 cursor-pointer transition-colors"
                    onClick={() => navigate(`/editor/${m.id}`)}
                  >
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[13px] text-text">{m.title}</div>
                    </td>
                    <td className="py-3 px-4 text-[12px] text-text2">{m.journey_name ?? '—'}</td>
                    <td className="py-3 px-4 text-[12px] text-text2">{m.station_name ?? '—'}</td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="text-[10px]">{m.block_count}</Badge>
                    </td>
                    <td className="py-3 px-4">
                      {m.is_draft
                        ? <Badge variant="gold" className="text-[9px]">Rascunho</Badge>
                        : <Badge variant="advance" className="text-[9px]">Publicado</Badge>
                      }
                    </td>
                    <td className="py-3 px-4 text-[11px] text-text3">
                      {m.created_at ? new Date(m.created_at).toLocaleDateString('pt-BR') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// =============================================
// PARTE 2: Editor de Material
// =============================================

function MaterialEditor({ materialId }: { materialId: string }) {
  const navigate = useNavigate()
  const { data: school } = useSchool()
  const { user } = useAuth()
  const { data: rawData, loading, error, refetch } = useMaterialWithBlocks(materialId)

  const {
    blocks,
    blocksRef,
    clearHistory,
    canRedo,
    canUndo,
    commitBlocksHistory,
    handleRedo,
    handleUndo,
    pushSnapshot,
    selectedBlock,
    selectedBlockId,
    selectedPaginationPolicy,
    setBlockWithHistory,
    setBlocks,
    setBlocksWithHistory,
    setSelectedBlockId,
  } = useEditorBlocks()
  const selectedBlockStyle = useMemo(
    () => selectedBlock ? mergeBlockStyle(selectedBlock.render_data?.style as Partial<BlockStyle> | undefined, {}) : DEFAULT_BLOCK_STYLE,
    [selectedBlock],
  )
  const [materialTitle, setMaterialTitle] = useState('')
  const [materialMeta, setMaterialMeta] = useState<MaterialWithBlocks | null>(null)
  const [saving, setSaving] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const canvasRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({})
  const musicRendererSnapshotCacheRef = useRef<Map<string, MusicSnapshotCacheEntry>>(new Map())
  const selectedBlockIdRef = useRef<string | null>(null)
  selectedBlockIdRef.current = selectedBlockId
  const canvasNudgeSessionRef = useRef<CanvasNudgeSession | null>(null)

  // Edição inline no canvas
  const [inlineEditingBlockId, setInlineEditingBlockId] = useState<string | null>(null)
  const [inlineEditFocusPoint, setInlineEditFocusPoint] = useState<{ x: number; y: number } | null>(null)
  const [coverTitleEditing, setCoverTitleEditing] = useState(false)

  // Zoom do canvas A4
  const [zoom, setZoom] = useState(0.75)
  const canvasScrollRef = useRef<HTMLDivElement>(null)

  // Configuração de cabeçalho/rodapé da página
  const [pageConfig, setPageConfig] = useState<PageConfig>(DEFAULT_PAGE_CONFIG)

  // Sidebar retrátil
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(() => {
    try { const s = localStorage.getItem('editor-sidebar-state'); return s ? JSON.parse(s).left !== false : true } catch { return true }
  })
  const [rightSidebarOpen, setRightSidebarOpen] = useState(() => {
    try { const s = localStorage.getItem('editor-sidebar-state'); return s ? JSON.parse(s).right !== false : true } catch { return true }
  })

  // Toolbar contextual position
  const [toolbarPosition, setToolbarPosition] = useState<{ top: number; left: number; placement?: 'above' | 'below' } | null>(null)

  // Undo/Redo global
  /** setBlocks com snapshot automático para undo (exceto durante undo/redo) */
  // Estados dos editores visuais integrados
  const [notationEditorOpen, setNotationEditorOpen] = useState(false)
  const [notationEditorBlockId, setNotationEditorBlockId] = useState<string | null>(null)
  const [notationEditorStaveIndex, setNotationEditorStaveIndex] = useState<number | null>(null)
  const notationPreviewStaveRef = useRef<{ blockId: string; staveIndex: number } | null>(null)
  const [saveReusableOpen, setSaveReusableOpen] = useState(false)
  const [saveReusableLoading, setSaveReusableLoading] = useState(false)
  const [exerciseBrowserOpen, setExerciseBrowserOpen] = useState(false)
  const [insertingExerciseId, setInsertingExerciseId] = useState<string | null>(null)
  const [chordEditorOpen, setChordEditorOpen] = useState(false)
  const [chordEditorBlockId, setChordEditorBlockId] = useState<string | null>(null)
  const [chordEditorState, setChordEditorState] = useState<ChordEditorState>(createEmptyState())
  const [chordEditorName, setChordEditorName] = useState('')
  const [chordEditorStartFret, setChordEditorStartFret] = useState(1)
  const [tablatureEditorOpen, setTablatureEditorOpen] = useState(false)
  const [tablatureEditorBlockId, setTablatureEditorBlockId] = useState<string | null>(null)

  const initialLoadDone = useRef(false)
  const selectBlockPerfRef = useRef<{ blockId: string; startedAt: number } | null>(null)
  const { autoSaveStatus, queueBlockAutosave, resetAutosaveBaseline } = useEditorAutosave({
    blocksRef,
    initialLoadDone,
  })

  // Parsear dados vindos da RPC
  useEffect(() => {
    if (rawData && rawData.length > 0) {
      const { material, blocks: parsed } = parseBlocks(rawData)
      setMaterialMeta(material)
      setMaterialTitle(material.material_title)
      setBlocks(parsed)
      resetAutosaveBaseline(parsed)
      // Limpar histórico apenas no primeiro carregamento
      if (!initialLoadDone.current) {
        clearHistory()
      }
      if (!selectedBlockId && parsed.length > 0) {
        setSelectedBlockId(parsed[0].id)
      }
      // Carregar page_config do banco (se existir) — migra formato legado automaticamente
      if (!initialLoadDone.current && material.page_config) {
        const pc = migratePageConfig(material.page_config as Record<string, unknown>)
        setPageConfig(pc)
      }
      initialLoadDone.current = true
    }
  }, [rawData, resetAutosaveBaseline])

  const selectedBlockCanBeReusable = useMemo(
    () => Boolean(selectedBlock && isReusableBlockType(selectedBlock.block_type)),
    [selectedBlock],
  )
  const [propertiesBlockId, setPropertiesBlockId] = useState<string | null>(selectedBlockId)
  const propertiesSelectedBlock = useMemo(
    () => blocks.find(b => b.id === propertiesBlockId) ?? null,
    [blocks, propertiesBlockId],
  )

  useEffect(() => {
    if (!selectedBlockId) {
      setPropertiesBlockId(null)
      return
    }

    const timer = window.setTimeout(() => setPropertiesBlockId(selectedBlockId), 520)
    return () => window.clearTimeout(timer)
  }, [selectedBlockId])

  useEffect(() => {
    if (!import.meta.env.DEV || !selectedBlockId) return
    const pending = selectBlockPerfRef.current
    if (!pending || pending.blockId !== selectedBlockId) return

    window.requestAnimationFrame(() => {
      const selected = blocksRef.current.find(b => b.id === selectedBlockId)
      console.info('[EditorPerf] selectBlock ' + JSON.stringify({
        blockId: selectedBlockId,
        blockType: selected?.block_type,
        title: selected?.title,
        durationMs: Math.round((performance.now() - pending.startedAt) * 10) / 10,
        ...getEditorPerformanceDomMetrics(),
      }))
      if (selectBlockPerfRef.current?.blockId === selectedBlockId) {
        selectBlockPerfRef.current = null
      }
    })
  }, [selectedBlockId])

  /** Auto-paginação A4: estima alturas, mede o canvas real e distribui entre páginas */
  const [blockHeights, setBlockHeights] = useState<Record<string, number>>({})
  const blockHeightCacheRef = useRef<Map<string, number>>(new Map())
  const blockHeightSourceByKeyRef = useRef<Map<string, BlockHeightSource>>(new Map())
  const blockHeightKeyByIdRef = useRef<Record<string, string>>({})

  // Preparar estimativas de altura por bloco sem renderizar copias ocultas.
  useEffect(() => {
    const keysById: Record<string, string> = {}
    const estimatedHeights: Record<string, number> = {}

    for (const block of blocks) {
      if (block.block_type === 'page_break') continue
      const key = getBlockHeightCacheKey(block)
      keysById[block.id] = key
      estimatedHeights[block.id] = blockHeightCacheRef.current.get(key) ?? getEstimatedBlockHeightForPagination(block)
    }
    blockHeightKeyByIdRef.current = keysById

    setBlockHeights(prev => {
      const same = Object.keys(estimatedHeights).length === Object.keys(prev).length &&
        Object.entries(estimatedHeights).every(([id, height]) => Math.abs((prev[id] ?? 0) - height) < 2)
      return same ? prev : estimatedHeights
    })
  }, [blocks])

  /** Distribui blocos em páginas A4 respeitando estimativas e alturas reais medidas */
  const paginationResult = useMemo(() => paginateBlocks(
    blocks,
    block => blockHeights[block.id] ?? getEstimatedBlockHeightForPagination(block),
  ), [blocks, blockHeights])
  const pages = paginationResult.pages
  const paginationBreakReasons = paginationResult.breakReasons
  const canvasPages = useMemo(() => applyCanvasLayoutPageOffsets(pages), [pages])

  /* const pages = useMemo(() => {
    const result: EditorBlock[][] = [[]]
    let currentHeight = 0

    for (const block of blocks) {
      if (block.block_type === 'page_break') {
        result.push([])
        currentHeight = 0
        continue
      }

      // Bloco capa ocupa página inteira
      if (block.block_type === 'cover') {
        if (result[result.length - 1].length > 0) result.push([])
        result[result.length - 1].push(block)
        result.push([]) // próximos blocos na página seguinte
        currentHeight = 0
        continue
      }

      const h = blockHeights[block.id] ?? getEstimatedBlockHeightForPagination(block)
      if (currentHeight + h > A4_CONTENT_HEIGHT && result[result.length - 1].length > 0) {
        result.push([])
        currentHeight = 0
      }

      result[result.length - 1].push(block)
      currentHeight += h
    }

    return result
  }, [blocks, blockHeights]) */

  const pageIndexByBlockId = useMemo(() => {
    const indexById: Record<string, number> = {}
    canvasPages.forEach((pageBlocks, pageIdx) => {
      pageBlocks.forEach(block => {
        indexById[block.id] = pageIdx
        const sourceBlockId = getPaginationSourceBlockId(block)
        if (sourceBlockId !== block.id && indexById[sourceBlockId] == null) {
          indexById[sourceBlockId] = pageIdx
        }
      })
    })
    return indexById
  }, [canvasPages])

  const pageBlockById = useMemo(() => {
    const byId = new Map<string, EditorBlock>()
    canvasPages.forEach(pageBlocks => {
      pageBlocks.forEach(block => byId.set(block.id, block))
    })
    return byId
  }, [canvasPages])

  const [showPaginationDebug, setShowPaginationDebug] = useState(false)
  const paginationDebugPages = useMemo<PaginationDebugPage[]>(() => {
    const blockIndexById = new Map(blocks.map((block, index) => [block.id, index]))
    const getHeightCacheEntry = (block: EditorBlock) => {
      const key = blockHeightKeyByIdRef.current[block.id] ?? getBlockHeightCacheKey(block)
      const height = blockHeightCacheRef.current.get(key) ?? null
      const source = height == null
        ? 'estimated'
        : blockHeightSourceByKeyRef.current.get(key) ?? 'measured'
      return { height, source: source as BlockHeightSource }
    }
    const getShortTitle = (block: EditorBlock) => {
      const rawTitle = block.title || String(block.content?.title || block.content?.heading || block.block_type)
      return rawTitle.length > 54 ? `${rawTitle.slice(0, 51)}...` : rawTitle
    }
    const getBlockDetail = (block: EditorBlock) => {
      const fragment = getPaginationFragmentData(block)
      const sourceBlock = fragment
        ? blocks.find(item => item.id === fragment.source_block_id)
        : null
      const estimatedHeight = getEstimatedBlockHeightForPagination(block)
      const cacheEntry = getHeightCacheEntry(block)
      return {
        id: block.id,
        type: block.block_type,
        title: fragment
          ? `${getShortTitle(sourceBlock ?? block)} (${fragment.index + 1}/${fragment.total})`
          : getShortTitle(block),
        policy: describePaginationPolicy(getBlockPaginationPolicy(block)),
        estimatedHeight,
        measuredHeight: cacheEntry.source === 'measured' ? cacheEntry.height : null,
        heightSource: cacheEntry.source,
        usedHeight: blockHeights[block.id] ?? estimatedHeight,
      }
    }

    return pages.map((pageBlocks, pageIndex) => {
      const debugBlocks = pageBlocks.map(getBlockDetail)
      const usedHeight = debugBlocks.reduce((sum, block) => sum + block.usedHeight, 0)
      const freeHeight = Math.max(0, A4_CONTENT_HEIGHT - usedHeight)
      const nextFirstBlock = pages[pageIndex + 1]?.[0]
      const hasEstimatedBlock = pageBlocks.some(block => getHeightCacheEntry(block).source === 'estimated')
      const nextFirstBlockEstimated = nextFirstBlock ? getHeightCacheEntry(nextFirstBlock).source === 'estimated' : false

      const engineBreak = paginationBreakReasons.get(pageIndex)
      let breakReason: PaginationDebugPage['breakReason'] = engineBreak?.reason ?? 'fim'
      let breakDetail = engineBreak?.detail ?? '\u00daltima p\u00e1gina do material.'
      let opportunity: string | null = null
      let nextBlockTitle: string | null = null
      let nextBlockType: string | null = null
      let nextBlockHeight: number | null = null
      let nextBlockCanFit = false

      if (nextFirstBlock) {
        const nextTitle = getShortTitle(nextFirstBlock)
        const nextSourceBlockId = getPaginationSourceBlockId(nextFirstBlock)
        const nextIndex = blockIndexById.get(nextSourceBlockId)
        const previousBlock = typeof nextIndex === 'number' ? blocks[nextIndex - 1] : undefined
        const nextSiblingBlock = typeof nextIndex === 'number' ? blocks[nextIndex + 1] : undefined
        const nextHeight = blockHeights[nextFirstBlock.id] ?? getEstimatedBlockHeightForPagination(nextFirstBlock)
        const nextSiblingHeight = nextSiblingBlock
          ? blockHeights[nextSiblingBlock.id] ?? getEstimatedBlockHeightForPagination(nextSiblingBlock)
          : 0
        const nextKeepsWithFollowing = shouldKeepBlocksTogether(nextFirstBlock, nextSiblingBlock)
        const nextKeepGroupHeight = nextHeight + (nextKeepsWithFollowing ? nextSiblingHeight : 0)
        nextBlockTitle = nextTitle
        nextBlockType = nextFirstBlock.block_type
        nextBlockHeight = nextHeight
        nextBlockCanFit = nextHeight <= freeHeight

        if (!engineBreak) {
          if (pageBlocks.some(block => block.block_type === 'cover')) {
            breakReason = 'cover'
            breakDetail = `A capa ocupa uma p\u00e1gina inteira; pr\u00f3ximo bloco: ${nextTitle}.`
          } else if (previousBlock?.block_type === 'page_break') {
            breakReason = 'manual'
            breakDetail = `Quebra manual antes de ${nextTitle}.`
          } else if (hasEstimatedBlock || nextFirstBlockEstimated) {
            breakReason = 'estimativa'
            breakDetail = `A quebra antes de ${nextTitle} ainda depende de altura estimada/cache.`
          } else {
            breakReason = 'overflow'
            breakDetail = `${nextTitle} n\u00e3o coube: livre ${Math.round(freeHeight)}px, bloco precisa ${Math.round(nextHeight)}px.`
          }
        }

        if (freeHeight > A4_CONTENT_HEIGHT * 0.3) {
          const nextPolicy = getBlockPaginationPolicy(nextFirstBlock)
          const canSplitNext = canSplitBlockForPagination(nextFirstBlock, nextPolicy)
          if (breakReason === 'manual') {
            opportunity = 'Espa\u00e7o livre causado por quebra manual/pedag\u00f3gica. Ajuste apenas se o professor quiser juntar se\u00e7\u00f5es.'
          } else if (nextBlockCanFit && nextKeepsWithFollowing && nextKeepGroupHeight > freeHeight) {
            opportunity = `O pr\u00f3ximo bloco caberia sozinho, mas est\u00e1 preso ao bloco seguinte por keep-with-next. O grupo precisa ${Math.round(nextKeepGroupHeight)}px.`
          } else if (nextBlockCanFit) {
            opportunity = 'O pr\u00f3ximo bloco caberia no espa\u00e7o livre. Verifique se alguma pol\u00edtica, medi\u00e7\u00e3o ou keep-with-next impediu a subida.'
          } else if (canSplitNext) {
            opportunity = 'O pr\u00f3ximo bloco \u00e9 textual e pode ser candidato a fragmenta\u00e7\u00e3o para aproveitar melhor esta p\u00e1gina.'
          } else if (['notation', 'rhythm', 'tablature'].includes(nextFirstBlock.block_type)) {
            opportunity = 'O pr\u00f3ximo bloco \u00e9 musical e deve permanecer inteiro para preservar a nota\u00e7\u00e3o.'
          } else {
            opportunity = 'O pr\u00f3ximo bloco n\u00e3o cabe no espa\u00e7o livre atual; o buraco \u00e9 estrutural ou depende de uma decis\u00e3o de layout.'
          }
        }

        if (breakReason === 'cover' || freeHeight <= 80) {
          nextBlockTitle = null
          nextBlockType = null
          nextBlockHeight = null
          nextBlockCanFit = false
        }
      }

      return {
        pageNumber: pageIndex + 1,
        totalHeight: A4_CONTENT_HEIGHT,
        usedHeight,
        freeHeight,
        freePercent: (freeHeight / A4_CONTENT_HEIGHT) * 100,
        breakReason,
        breakDetail,
        opportunity,
        nextBlockTitle,
        nextBlockType,
        nextBlockHeight,
        nextBlockCanFit,
        blocks: debugBlocks,
      }
    })
  }, [blocks, blockHeights, pages, paginationBreakReasons])

  const [currentVisiblePage, setCurrentVisiblePage] = useState(0)
  const [forceAllPagesActive, setForceAllPagesActive] = useState(false)
  const selectedPageIndex = selectedBlockId ? pageIndexByBlockId[selectedBlockId] : undefined
  const activePageIndexes = useMemo(() => {
    if (forceAllPagesActive) {
      return new Set(canvasPages.map((_, idx) => idx))
    }

    const active = new Set<number>()
    const addWindow = (center: number | undefined) => {
      if (typeof center !== 'number' || Number.isNaN(center)) return
      for (let idx = center - ACTIVE_PAGE_RADIUS; idx <= center + ACTIVE_PAGE_RADIUS; idx += 1) {
        if (idx >= 0 && idx < canvasPages.length) active.add(idx)
      }
    }

    addWindow(currentVisiblePage)
    if (typeof selectedPageIndex === 'number' && selectedPageIndex >= 0 && selectedPageIndex < canvasPages.length) {
      active.add(selectedPageIndex)
    }

    if (active.size === 0 && canvasPages.length > 0) addWindow(0)
    return active
  }, [canvasPages, currentVisiblePage, forceAllPagesActive, selectedPageIndex])

  const [hydratingAlphaTabBlockIds, setHydratingAlphaTabBlockIds] = useState<Set<string>>(() => new Set())
  useEffect(() => {
    setHydratingAlphaTabBlockIds(new Set())

    let cancelled = false
    let cancelIdle: (() => void) | null = null
    const timeoutHandle = window.setTimeout(() => {
      cancelIdle = scheduleEditorIdleCallback(() => {
        if (cancelled) return
        const plan = buildMusicHydrationPlan({
          pages: canvasPages,
          activePageIndexes,
          selectedBlockId,
          maxPerPage: Number.MAX_SAFE_INTEGER,
        })
        const next = new Set(plan.allowedBlockIds)
        setHydratingAlphaTabBlockIds(next)

        if (import.meta.env.DEV) {
          console.info('[EditorPerf] alphaTabHydration ' + JSON.stringify({
            action: 'release',
            selectedBlockId,
            allowedBlockIds: plan.allowedBlockIds,
            alphaTabSurfaces: document.querySelectorAll('.at-surface').length,
          }))
        }
      }, 300)
    }, 80)

    return () => {
      cancelled = true
      window.clearTimeout(timeoutHandle)
      cancelIdle?.()
    }
  }, [activePageIndexes, canvasPages, selectedBlockId])

  useEffect(() => {
    if (blocks.length === 0 || pages.length === 0) return

    const statsByType = new Map<string, { measuredTotal: number; estimatedTotal: number; count: number }>()
    for (const block of blocks) {
      if (block.block_type === 'page_break' || block.block_type === 'cover') continue
      const key = blockHeightKeyByIdRef.current[block.id] ?? getBlockHeightCacheKey(block)
      if (blockHeightSourceByKeyRef.current.get(key) !== 'measured') continue
      const measuredHeight = blockHeightCacheRef.current.get(key)
      if (!measuredHeight) continue
      const current = statsByType.get(block.block_type) ?? { measuredTotal: 0, estimatedTotal: 0, count: 0 }
      current.measuredTotal += measuredHeight
      current.estimatedTotal += getEstimatedBlockHeightForPagination(block)
      current.count += 1
      statsByType.set(block.block_type, current)
    }

    const ratioByType = new Map<string, number>()
    for (const [type, stats] of statsByType.entries()) {
      if (stats.count === 0 || stats.estimatedTotal <= 0) continue
      ratioByType.set(type, Math.max(0.72, Math.min(1.1, stats.measuredTotal / stats.estimatedTotal)))
    }

    if (ratioByType.size === 0) return

    const activePages = Array.from(activePageIndexes)
    const distanceFromActiveWindow = (block: EditorBlock) => {
      const pageIndex = pageIndexByBlockId[block.id]
      if (typeof pageIndex !== 'number') return Number.MAX_SAFE_INTEGER
      if (activePages.length === 0) return pageIndex
      return Math.min(...activePages.map(activePageIndex => Math.abs(activePageIndex - pageIndex)))
    }

    const pending = blocks
      .filter(block => {
        if (block.block_type === 'page_break' || block.block_type === 'cover') return false
        if (!ratioByType.has(block.block_type)) return false
        const key = blockHeightKeyByIdRef.current[block.id] ?? getBlockHeightCacheKey(block)
        const source = blockHeightSourceByKeyRef.current.get(key)
        return source !== 'measured' && source !== 'calibrated'
      })
      .sort((a, b) => distanceFromActiveWindow(a) - distanceFromActiveWindow(b))

    if (pending.length === 0) return

    let cancelled = false
    let cancelIdle: (() => void) | null = null
    const processNext = () => {
      if (cancelled) return
      const block = pending.shift()
      if (!block) return

      const ratio = ratioByType.get(block.block_type)
      if (ratio) {
        const key = blockHeightKeyByIdRef.current[block.id] ?? getBlockHeightCacheKey(block)
        const calibratedHeight = Math.max(24, Math.round(getEstimatedBlockHeightForPagination(block) * ratio))
        blockHeightCacheRef.current.set(key, calibratedHeight)
        blockHeightSourceByKeyRef.current.set(key, 'calibrated')
        setBlockHeights(prev => {
          if (Math.abs((prev[block.id] ?? 0) - calibratedHeight) < 2) return prev
          return { ...prev, [block.id]: calibratedHeight }
        })
      }

      if (pending.length > 0) {
        cancelIdle = scheduleEditorIdleCallback(processNext, 1500)
      }
    }

    cancelIdle = scheduleEditorIdleCallback(processNext, 1500)
    return () => {
      cancelled = true
      cancelIdle?.()
    }
  }, [activePageIndexes, blockHeights, blocks, pageIndexByBlockId, pages.length])

  useEffect(() => {
    const canvas = canvasScrollRef.current
    if (!canvas || blocks.length === 0) return

    const timer = window.setTimeout(() => {
      const measured: Record<string, number> = {}
      const children = canvas.querySelectorAll<HTMLElement>('.canvas-block[data-block-id]')

      children.forEach(el => {
        const id = el.getAttribute('data-block-id')
        if (!id) return
        const block = pageBlockById.get(id) ?? blocksRef.current.find(item => item.id === id)
        const key = blockHeightKeyByIdRef.current[id] ?? (block ? getBlockHeightCacheKey(block) : undefined)
        if (!key) return
        const height = getMeasuredBlockOuterHeight(el)
        if (height <= 0) return
        blockHeightCacheRef.current.set(key, height)
        blockHeightSourceByKeyRef.current.set(key, 'measured')
        measured[id] = height

        if (block && MUSIC_RENDERER_BLOCK_TYPES.has(block.block_type) && !blockUsesAlphaTab(block)) {
          const html = sanitizeMusicSnapshotHtml(el.innerHTML, block)
          if (isUsableMusicSnapshotHtml(html, block)) {
            musicRendererSnapshotCacheRef.current.set(id, {
              hash: key,
              html,
              height,
            })
          }
        }
      })

      setBlockHeights(prev => {
        if (Object.keys(measured).length === 0) return prev
        let changed = false
        const next = { ...prev }
        for (const [id, height] of Object.entries(measured)) {
          if (Math.abs((prev[id] ?? 0) - height) >= 2) {
            next[id] = height
            changed = true
          }
        }
        return changed ? next : prev
      })
    }, 150)

    return () => window.clearTimeout(timer)
  }, [activePageIndexes, blocks, pages.length])

  // --- Persistir pageConfig quando muda ---
  useEffect(() => {
    if (!initialLoadDone.current || !materialId) return
    const timer = setTimeout(async () => {
      try {
        await updateMaterial(materialId, { page_config: pageConfig } as any)
      } catch {
        // silencioso — pageConfig é secundário
      }
    }, 1500)
    return () => clearTimeout(timer)
  }, [pageConfig, materialId])

  // Selecionar bloco + scroll no canvas
  const selectBlock = useCallback((id: string) => {
    if (import.meta.env.DEV) {
      selectBlockPerfRef.current = { blockId: id, startedAt: performance.now() }
    }
    setSelectedFloatingId(null)
    setEditingFloatingId(null)
    const pageIdx = pageIndexByBlockId[id]
    const canvas = canvasScrollRef.current
    const currentEl = canvasRefs.current[id]
    const isAlreadyVisible = Boolean(canvas && currentEl && isElementComfortablyVisibleInContainer(currentEl, canvas))

    if (typeof pageIdx === 'number') {
      if (!activePageIndexes.has(pageIdx)) {
        setCurrentVisiblePage(pageIdx)
      }
      setSelectedBlockId(id)
      if (isAlreadyVisible) return
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          const el = canvasRefs.current[id]
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' })
            return
          }
          pageRefs.current[pageIdx]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        })
      })
      return
    }

    setSelectedBlockId(id)
    const el = canvasRefs.current[id]
    if (el && !isAlreadyVisible) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [activePageIndexes, pageIndexByBlockId])

  const handleCanvasClick = useCallback(() => {
    setSelectedBlockId(null)
    setSelectedFloatingId(null)
    setEditingFloatingId(null)
    setSelectedTextId(null)
    setEditingTextId(null)
    setSelectedOverlayId(null)
    if (inlineEditingBlockId) setInlineEditingBlockId(null)
    setInlineEditFocusPoint(null)
  }, [inlineEditingBlockId, setSelectedBlockId])

  const handleCanvasPageMouseDownCapture = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null
    if (target?.closest('[data-floating-element-id]')) return
    setSelectedFloatingId(null)
    setEditingFloatingId(null)
  }, [])

  const handleCanvasWheel = useCallback((e: WheelEvent<HTMLDivElement>) => {
    if (!e.ctrlKey) return
    e.preventDefault()
    setZoom(z => Math.max(0.5, Math.min(1.5, +(z + (e.deltaY > 0 ? -0.05 : 0.05)).toFixed(2))))
  }, [])

  // Adicionar bloco
  const handleAddBlock = useCallback(async (blockType: string) => {
    const currentBlocks = blocksRef.current
    const selectedBlockCurrent = selectedBlockId
      ? currentBlocks.find((block) => block.id === selectedBlockId) ?? null
      : null
    const lastOrder = currentBlocks.length > 0 ? Math.max(...currentBlocks.map(b => b.sort_order)) : 0
    const anchorOrder = selectedBlockCurrent?.sort_order ?? lastOrder
    const { title: defaultTitle, content: defaultContent, renderData: defaultRenderData } = getDefaultBlockPayload(blockType, materialTitle)
    try {
      const insertedId = await addMaterialBlock({
        materialId,
        blockType,
        title: defaultTitle,
        content: defaultContent,
        renderData: defaultRenderData,
        afterOrder: anchorOrder,
      })
      const newBlock: EditorBlock = {
        id: insertedId,
        block_type: blockType,
        title: defaultTitle,
        content: defaultContent,
        render_data: defaultRenderData,
        sort_order: anchorOrder + 1,
        is_edited: false,
        original_content: null,
      }
      setBlocksWithHistory(prev => insertBlocksAfterOrder(prev, [newBlock], anchorOrder))
      setSelectedBlockId(insertedId)
      toast.success('Bloco adicionado')
    } catch (e: any) {
      // Fallback local: banco pode rejeitar block_types novos (CHECK constraint)
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      const newBlock: EditorBlock = {
        id: tempId,
        block_type: blockType,
        title: defaultTitle,
        content: defaultContent,
        render_data: defaultRenderData,
        sort_order: anchorOrder + 1,
        is_edited: false,
        original_content: null,
      }
      setBlocksWithHistory(prev => insertBlocksAfterOrder(prev, [newBlock], anchorOrder))
      setSelectedBlockId(tempId)
      toast.info('Bloco adicionado localmente (salvar no banco pendente)')
    }
  }, [blocksRef, materialId, materialTitle, selectedBlockId, setBlocksWithHistory, setSelectedBlockId])

  const handleOpenSaveReusable = useCallback(() => {
    if (!selectedBlock) {
      toast.error('Selecione um bloco primeiro')
      return
    }
    if (!isReusableBlockType(selectedBlock.block_type)) {
      toast.error('Esse tipo de bloco ainda nao pode ser salvo como reutilizavel')
      return
    }
    setSaveReusableOpen(true)
  }, [selectedBlock])

  const handleSaveReusable = useCallback(async (payload: SaveAsReusablePayload) => {
    if (!selectedBlock) {
      toast.error('Selecione um bloco primeiro')
      return
    }
    if (!isReusableBlockType(selectedBlock.block_type)) {
      toast.error('Esse tipo de bloco nao pode ser salvo como reutilizavel')
      return
    }
    if (!school?.id) {
      toast.error('Escola nao identificada para salvar na biblioteca')
      return
    }

    setSaveReusableLoading(true)
    try {
      await createExercise({
        school_id: school.id,
        title: payload.title,
        description: payload.description,
        content_type: payload.content_type,
        category: payload.category,
        instrument: payload.instrument,
        difficulty_level: payload.difficulty_level,
        tags: payload.tags,
        blocks: [editorBlockToExerciseBlock(selectedBlock)],
        block_count: 1,
        preview_data: {},
        thumbnail_url: null,
        estimated_minutes: 5,
        source: 'manual',
        source_reference: null,
        curation_status: 'draft',
        is_template: false,
        curated_by: null,
      })
      toast.success('Bloco salvo na biblioteca!')
      setSaveReusableOpen(false)
    } catch (e: any) {
      toast.error('Erro ao salvar bloco reutilizavel: ' + (e?.message ?? ''))
    } finally {
      setSaveReusableLoading(false)
    }
  }, [school?.id, selectedBlock])

  const handleInsertExerciseFromLibrary = useCallback(async (exercise: ExerciseLibraryItem) => {
    setInsertingExerciseId(exercise.id)
    try {
      const fullExercise = await getExerciseById(exercise.id) ?? exercise
      const exerciseBlocks = Array.isArray(fullExercise.blocks) ? fullExercise.blocks : []

      if (exerciseBlocks.length === 0) {
        toast.error('Esse item da biblioteca nao possui blocos para inserir')
        return
      }

      pushSnapshot(blocksRef.current)

      const selectedBlockCurrent = selectedBlockId
        ? blocksRef.current.find((block) => block.id === selectedBlockId) ?? null
        : null
      const lastOrder = blocksRef.current.length > 0
        ? Math.max(...blocksRef.current.map((block) => block.sort_order))
        : 0
      const anchorOrder = selectedBlockCurrent?.sort_order ?? lastOrder

      const insertedBlocks: EditorBlock[] = []
      for (const libraryBlock of [...exerciseBlocks].reverse()) {
        const blockType = String(libraryBlock?.block_type ?? 'text')
        const title = typeof libraryBlock?.title === 'string' && libraryBlock.title.trim()
          ? libraryBlock.title
          : null
        const content = libraryBlock?.content ? cloneJsonValue(libraryBlock.content) : null
        const renderData = libraryBlock?.render_data ? cloneJsonValue(libraryBlock.render_data) : null
        const insertedId = await addMaterialBlock({
          materialId,
          blockType,
          title,
          content,
          renderData,
          afterOrder: anchorOrder,
        })
        insertedBlocks.unshift({
          id: insertedId,
          block_type: blockType,
          title,
          content,
          render_data: renderData,
          sort_order: anchorOrder + 1,
          is_edited: false,
          original_content: null,
        })
      }

      if (insertedBlocks.length > 0) {
        setBlocksWithHistory(prev => insertBlocksAfterOrder(prev, insertedBlocks, anchorOrder))
        setSelectedBlockId(insertedBlocks[0].id)
      }
      setExerciseBrowserOpen(false)
      toast.success(`${exerciseBlocks.length} bloco(s) inserido(s)!`)
    } catch (e: any) {
      toast.error('Erro ao inserir da biblioteca: ' + (e?.message ?? ''))
    } finally {
      setInsertingExerciseId(null)
    }
  }, [materialId, selectedBlockId, pushSnapshot, setBlocksWithHistory, setSelectedBlockId])

  // Deletar bloco
  const handleDeleteBlock = useCallback(async (blockId: string) => {
    const beforeBlocks = blocksRef.current
    const blockExists = beforeBlocks.some(block => block.id === blockId)
    if (!blockExists) return

    const afterBlocks = beforeBlocks.filter(block => block.id !== blockId)
    setBlocks(afterBlocks)
    if (selectedBlockIdRef.current === blockId) setSelectedBlockId(null)

    if (blockId.startsWith('temp_')) {
      commitBlocksHistory(beforeBlocks, afterBlocks)
      toast.success('Bloco removido')
      return
    }

    try {
      await deleteMaterialBlock(blockId)
      commitBlocksHistory(beforeBlocks, afterBlocks)
      toast.success('Bloco removido')
    } catch (e: any) {
      setBlocks(beforeBlocks)
      if (selectedBlockIdRef.current === null) setSelectedBlockId(blockId)
      toast.error('Erro ao remover bloco: ' + (e?.message ?? ''))
    }
  }, [blocksRef, commitBlocksHistory, setBlocks, setSelectedBlockId])

  // Duplicar bloco
  const handleDuplicateBlock = useCallback(async (blockId: string) => {
    const beforeBlocks = blocksRef.current
    const block = beforeBlocks.find(b => b.id === blockId)
    if (!block) return
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const optimisticBlock: EditorBlock = {
      id: tempId,
      block_type: block.block_type,
      title: block.title ? `${block.title} (cópia)` : null,
      content: block.content ? { ...block.content } : null,
      render_data: block.render_data ? { ...block.render_data } : null,
      sort_order: block.sort_order + 1,
      is_edited: false,
      original_content: null,
    }
    const optimisticBlocks = insertBlocksAfterOrder(beforeBlocks, [optimisticBlock], block.sort_order)
    setBlocks(optimisticBlocks)
    setSelectedBlockId(tempId)

    try {
      const insertedId = await addMaterialBlock({
        materialId,
        blockType: block.block_type,
        title: block.title ? `${block.title} (cópia)` : null,
        content: block.content ? { ...block.content } : null,
        renderData: block.render_data ? { ...block.render_data } : null,
        afterOrder: block.sort_order,
      })
      const newBlock: EditorBlock = {
        id: insertedId,
        block_type: block.block_type,
        title: block.title ? `${block.title} (cópia)` : null,
        content: block.content ? { ...block.content } : null,
        render_data: block.render_data ? { ...block.render_data } : null,
        sort_order: block.sort_order + 1,
        is_edited: false,
        original_content: null,
      }
      const finalBlocks = optimisticBlocks.map(next => next.id === tempId ? newBlock : next)
      setBlocks(finalBlocks)
      setSelectedBlockId(insertedId)
      commitBlocksHistory(beforeBlocks, finalBlocks)
      toast.success('Bloco duplicado')
    } catch (e: any) {
      commitBlocksHistory(beforeBlocks, optimisticBlocks)
      toast.info('Bloco duplicado localmente')
    }
  }, [blocksRef, commitBlocksHistory, materialId, setBlocks, setSelectedBlockId])

  const flushCanvasNudgeSession = useCallback((session = canvasNudgeSessionRef.current) => {
    if (!session) return
    if (session.commitTimer) window.clearTimeout(session.commitTimer)
    if (session.cleanupTimer) window.clearTimeout(session.cleanupTimer)
    canvasNudgeSessionRef.current = null

    setBlocks(session.latestBlocks)
    commitBlocksHistory(session.beforeBlocks, session.latestBlocks)

    const element = canvasRefs.current[session.blockId]
    if (element) {
      session.cleanupTimer = window.setTimeout(() => {
        element.style.transition = ''
        element.style.willChange = ''
      }, 120)
    }

    void updateMaterialBlockRpc({
      blockId: session.blockId,
      renderData: session.latestRenderData,
    }).catch((error: any) => {
      toast.error('Erro ao mover bloco: ' + (error?.message ?? 'Erro desconhecido'))
      refetch()
    })
  }, [commitBlocksHistory, refetch, setBlocks])

  useEffect(() => () => {
    const session = canvasNudgeSessionRef.current
    if (session?.commitTimer) window.clearTimeout(session.commitTimer)
    if (session?.cleanupTimer) window.clearTimeout(session.cleanupTimer)
  }, [])

  const applyCanvasNudgePreview = useCallback((blockId: string, renderData: Record<string, unknown> | null) => {
    const element = canvasRefs.current[blockId]
    if (!element) return

    const layoutStyle = canvasBlockLayoutToCSS(renderData)
    element.style.transition = 'none'
    element.style.willChange = 'transform'
    element.style.position = typeof layoutStyle.position === 'string' ? layoutStyle.position : ''
    element.style.transform = typeof layoutStyle.transform === 'string' ? layoutStyle.transform : ''
    element.style.zIndex = layoutStyle.zIndex != null ? String(layoutStyle.zIndex) : ''
  }, [])

  // Deslocar bloco em passos pequenos no canvas. Repeats do teclado sao agrupados em um unico historico/save.
  const handleMoveBlock = useCallback((blockId: string, direction: CanvasNudgeDirection, repeated = false, step = 8) => {
    const nowMs = performance.now()
    const currentSession = canvasNudgeSessionRef.current
    if (
      currentSession?.blockId === blockId &&
      !shouldApplyCanvasNudgeKey({ repeat: repeated, nowMs, lastAppliedAtMs: currentSession.lastAppliedAtMs })
    ) {
      return
    }

    const currentBlocks = blocksRef.current
    const block = currentBlocks.find(item => item.id === blockId)
    if (!block || ['cover', 'page_break'].includes(block.block_type)) return

    const previousLayout = getCanvasBlockLayout(block.render_data)
    let result = nudgeCanvasBlockLayout(currentBlocks, blockId, direction, step)
    if (!result.changed) return
    let nextLayout = getCanvasBlockLayout(result.renderData)
    const element = canvasRefs.current[blockId]
    const pageElement = element?.closest('.a4-page') as HTMLElement | null
    if (element && pageElement && (direction === 'up' || direction === 'down')) {
      const blockRect = element.getBoundingClientRect()
      const pageRect = pageElement.getBoundingClientRect()
      const nextLocalDeltaY = nextLayout.offsetY - previousLayout.offsetY
      const nextBoundary = {
        blockTop: blockRect.top + nextLocalDeltaY,
        blockBottom: blockRect.bottom + nextLocalDeltaY,
        pageTop: pageRect.top,
        pageBottom: pageRect.bottom,
      }
      const pageDelta = getCanvasPageBoundaryDelta(direction, nextBoundary)
      if (pageDelta !== 0) {
        const anchoredResult = anchorCanvasBlockToPageOffset(result.blocks, blockId, pageDelta)
        if (anchoredResult.changed) {
          result = anchoredResult
          nextLayout = getCanvasBlockLayout(result.renderData)
        }
      } else if (shouldSettleCanvasBlockOnPageAnchor(direction, previousLayout.offsetY, nextBoundary)) {
        const settledResult = settleCanvasBlockOnPageAnchor(result.blocks, blockId)
        if (settledResult.changed) {
          result = settledResult
          nextLayout = getCanvasBlockLayout(result.renderData)
        }
      }
    }

    const existingSession = canvasNudgeSessionRef.current
    if (existingSession && existingSession.blockId !== blockId) {
      flushCanvasNudgeSession(existingSession)
    }

    const activeSession = canvasNudgeSessionRef.current ?? {
      blockId,
      beforeBlocks: currentBlocks,
      latestBlocks: currentBlocks,
      latestRenderData: block.render_data ?? null,
      commitTimer: null,
      cleanupTimer: null,
      lastAppliedAtMs: null,
    }

    activeSession.latestBlocks = result.blocks
    activeSession.latestRenderData = result.renderData
    activeSession.lastAppliedAtMs = nowMs
    blocksRef.current = result.blocks
    canvasNudgeSessionRef.current = activeSession

    setSelectedBlockId(blockId)
    if (previousLayout.pageOffset !== nextLayout.pageOffset) {
      flushCanvasNudgeSession(activeSession)
      return
    }

    applyCanvasNudgePreview(blockId, result.renderData)

    if (activeSession.commitTimer) window.clearTimeout(activeSession.commitTimer)
    activeSession.commitTimer = window.setTimeout(() => {
      flushCanvasNudgeSession(activeSession)
    }, 1600)
  }, [applyCanvasNudgePreview, blocksRef, flushCanvasNudgeSession, setSelectedBlockId])

  const handleResetBlockPosition = useCallback(async (blockId: string) => {
    flushCanvasNudgeSession()

    const currentBlocks = blocksRef.current
    const result = resetCanvasBlockLayout(currentBlocks, blockId)
    if (!result.changed) return

    setBlocksWithHistory(result.blocks)
    setSelectedBlockId(blockId)

    try {
      await updateMaterialBlockRpc({
        blockId,
        renderData: result.renderData,
      })
    } catch (error: any) {
      toast.error('Erro ao resetar posicao: ' + (error?.message ?? 'Erro desconhecido'))
      refetch()
    }
  }, [blocksRef, flushCanvasNudgeSession, refetch, setBlocksWithHistory, setSelectedBlockId])

  // Salvar alterações do bloco selecionado
  const handleSaveBlock = useCallback(async () => {
    if (!selectedBlock) return
    setSaving(true)
    try {
      await updateMaterialBlockRpc({
        blockId: selectedBlock.id,
        title: selectedBlock.title,
        content: selectedBlock.content,
        renderData: selectedBlock.render_data,
      })
      setBlocks(prev => prev.map(b =>
        b.id === selectedBlock.id ? { ...b, is_edited: true } : b,
      ))

      // 7.4 — Criar versão automática no save manual
      const schoolId = school?.id || 'a1b2c3d4-0001-4000-8000-000000000001'
      try {
        await saveVersion(materialId, schoolId, blocksRef.current, pageConfig)
        toast.success('Bloco salvo — versão criada')
      } catch {
        toast.success('Bloco salvo')
      }
    } catch (e: any) {
      toast.error('Erro ao salvar bloco: ' + (e?.message ?? ''))
    } finally {
      setSaving(false)
    }
  }, [selectedBlock, school, materialId, pageConfig])

  // Reverter bloco ao original
  const handleRevertBlock = useCallback(async () => {
    if (!selectedBlock?.original_content) return
    const reverted = { ...selectedBlock, content: selectedBlock.original_content, is_edited: false }
    setBlocksWithHistory(prev => prev.map(b => b.id === selectedBlock.id ? reverted : b))
    try {
      await updateMaterialBlockRpc({
        blockId: selectedBlock.id,
        content: selectedBlock.original_content,
      })
      toast.success('Bloco revertido ao original')
    } catch (e: any) {
      toast.error('Erro ao reverter: ' + (e?.message ?? ''))
    }
  }, [selectedBlock])

  // Atualizar campo local do bloco selecionado
  const updateSelectedField = useCallback((field: 'title' | 'content', value: any) => {
    if (!selectedBlockId) return
    setBlockWithHistory(selectedBlockId, b => {
      if (field === 'title') return { ...b, title: value }
      if (field === 'content') return { ...b, content: value }
      return b
    })
    queueBlockAutosave(selectedBlockId)
  }, [queueBlockAutosave, selectedBlockId, setBlockWithHistory])

  // Atualizar render_data do bloco selecionado (para capa, grade de acordes, etc.)
  const updateSelectedRenderData = useCallback((field: string, value: any) => {
    if (!selectedBlockId) return
    setBlockWithHistory(selectedBlockId, b => {
      return { ...b, render_data: { ...(b.render_data ?? {}), [field]: value } }
    })
    queueBlockAutosave(selectedBlockId)
  }, [queueBlockAutosave, selectedBlockId, setBlockWithHistory])

  const applyTitleTemplate = useCallback((templateId: TitleTemplateId | 'legacy') => {
    if (!selectedBlockId) return
    setBlockWithHistory(selectedBlockId, block => {
      if (block.block_type !== 'title') return block
      const currentRenderData = (block.render_data ?? {}) as Record<string, any>
      const nextRenderData = {
        ...currentRenderData,
        title_template_id: templateId,
        title_color_mode: 'brand',
        brand_primary_color: school?.primary_color ?? currentRenderData.brand_primary_color ?? '#1E3A5F',
        brand_secondary_color: school?.secondary_color ?? currentRenderData.brand_secondary_color ?? '#FF2D78',
      }
      if (templateId === 'legacy') {
        delete nextRenderData.title_template_id
      }
      return { ...block, render_data: nextRenderData }
    })
    queueBlockAutosave(selectedBlockId)
    toast.success(templateId === 'legacy' ? 'Decoração removida do título.' : 'Template aplicado ao título.')
  }, [queueBlockAutosave, school?.primary_color, school?.secondary_color, selectedBlockId, setBlockWithHistory])

  const updateBlockPaginationPolicy = useCallback((updates: Partial<BlockPaginationPolicy>) => {
    if (!selectedBlockId) return
    setBlockWithHistory(selectedBlockId, b => {
      const current = ((b.render_data ?? {}).pagination ?? {}) as Partial<BlockPaginationPolicy>
      const next = { ...current, ...updates }
      delete next.source
      return {
        ...b,
        render_data: {
          ...(b.render_data ?? {}),
          pagination: next,
        },
      }
    })
    queueBlockAutosave(selectedBlockId)
  }, [queueBlockAutosave, selectedBlockId, setBlockWithHistory])

  // Atualizar estilo visual do bloco selecionado (render_data.style)
  const updateBlockStyle = useCallback((updates: Partial<BlockStyle>) => {
    if (!selectedBlockId) return
    setBlockWithHistory(selectedBlockId, b => {
      const currentStyle = (b.render_data?.style as BlockStyle | undefined) ?? undefined
      const newStyle = mergeBlockStyle(currentStyle, updates)
      return { ...b, render_data: { ...(b.render_data ?? {}), style: newStyle } }
    })
    queueBlockAutosave(selectedBlockId)
  }, [queueBlockAutosave, selectedBlockId, setBlockWithHistory])

  // Atualizar estilo do separador (render_data.separatorStyle)
  const updateSeparatorStyle = useCallback((updates: Partial<SeparatorStyle>) => {
    if (!selectedBlockId) return
    setBlockWithHistory(selectedBlockId, b => {
      const currentStyle = (b.render_data?.separatorStyle as SeparatorStyle | undefined) ?? undefined
      const newStyle = mergeSeparatorStyle(currentStyle, updates)
      return { ...b, render_data: { ...(b.render_data ?? {}), separatorStyle: newStyle } }
    })
    queueBlockAutosave(selectedBlockId)
  }, [queueBlockAutosave, selectedBlockId, setBlockWithHistory])

  // Abrir KeyboardEditor para bloco tipo 'keyboard'
  const [keyboardEditorBlockId, setKeyboardEditorBlockId] = useState<string | null>(null)
  const [keyboardEditorOpen, setKeyboardEditorOpen] = useState(false)

  const openKeyboardEditorForBlock = useCallback((blockId: string) => {
    setKeyboardEditorBlockId(blockId)
    setKeyboardEditorOpen(true)
  }, [])

  // Grade de teclados — estado e handlers (antes do save genérico)
  const [keyboardGridTargetBlockId, setKeyboardGridTargetBlockId] = useState<string | null>(null)
  const [keyboardGridEditingIndex, setKeyboardGridEditingIndex] = useState<number | null>(null)

  const openKeyboardEditorForGrid = useCallback((blockId: string, keyboardToEdit?: any, index?: number) => {
    setKeyboardGridTargetBlockId(blockId)
    setKeyboardGridEditingIndex(typeof index === 'number' ? index : null)
    setKeyboardEditorBlockId(null)
    setKeyboardEditorOpen(true)
  }, [])

  const handleKeyboardGridSave = useCallback((data: PianoChordData) => {
    if (!keyboardGridTargetBlockId) return
    const newKeyboard = editorChordToKeyboardRenderData(data)
    setBlocksWithHistory(prev => prev.map(b => {
      if (b.id !== keyboardGridTargetBlockId) return b
      const existingKbs = ((b.render_data as any)?.keyboards ?? []) as any[]
      const updatedKeyboards = keyboardGridEditingIndex !== null
        ? existingKbs.map((kb, idx) => idx === keyboardGridEditingIndex ? { ...kb, ...newKeyboard } : kb)
        : [...existingKbs, newKeyboard]
      return { ...b, render_data: { ...(b.render_data ?? {}), keyboards: updatedKeyboards } }
    }))
    setKeyboardGridTargetBlockId(null)
    setKeyboardGridEditingIndex(null)
    setKeyboardEditorOpen(false)
    toast.success(keyboardGridEditingIndex !== null
      ? `Teclado "${data.name || 'Acorde'}" atualizado na grade`
      : `Teclado "${data.name || 'Acorde'}" adicionado à grade`)
  }, [keyboardGridTargetBlockId, keyboardGridEditingIndex])

  const handleKeyboardEditorSave = useCallback(async (data: PianoChordData) => {
    // Se estamos adicionando à grade de teclados, despacha para o handler da grade
    if (keyboardGridTargetBlockId) {
      handleKeyboardGridSave(data)
      return
    }
    if (!keyboardEditorBlockId) return
    const newKeyboard = editorChordToKeyboardRenderData(data)
    const blockToUpdate = blocksRef.current.find(b => b.id === keyboardEditorBlockId)
    const currentRenderData = (blockToUpdate?.render_data as any) ?? {}
    const newRenderData = Array.isArray(currentRenderData.chords)
      ? {
          ...currentRenderData,
          chords: currentRenderData.chords.map((chord: any, index: number) =>
            index === 0
              ? {
                  ...chord,
                  name: data.name || chord.name,
                  keys: newKeyboard.keys,
                  keys_lh: newKeyboard.keys_lh,
                  root: newKeyboard.root,
                  octave: newKeyboard.octave,
                  fingering_rh: newKeyboard.fingering_rh,
                  fingering_lh: newKeyboard.fingering_lh,
                  type: newKeyboard.type,
                  quality: newKeyboard.quality,
                  octave_start: newKeyboard.octave_start,
                  octave_count: newKeyboard.octave_count,
                  voicing_position: newKeyboard.voicing_position,
                  hand: newKeyboard.hand,
                }
              : chord,
          ),
        }
      : newKeyboard
    const nextTitle = Array.isArray(currentRenderData.chords) ? blockToUpdate?.title : data.name
    setBlocksWithHistory(prev => prev.map(b =>
      b.id === keyboardEditorBlockId ? { ...b, title: nextTitle || b.title, render_data: newRenderData } : b,
    ))
    try {
      await updateMaterialBlockRpc({
        blockId: keyboardEditorBlockId,
        title: nextTitle,
        renderData: newRenderData,
      })
      toast.success('Teclado atualizado no bloco')
    } catch (e: any) {
      toast.error('Erro ao salvar teclado')
    }
    setKeyboardEditorOpen(false)
    setKeyboardEditorBlockId(null)
  }, [keyboardEditorBlockId, keyboardGridTargetBlockId, handleKeyboardGridSave])

  // Abrir ChordEditor para grade de acordes (adiciona acorde à grade)
  const [chordGridTargetBlockId, setChordGridTargetBlockId] = useState<string | null>(null)
  const [chordGridEditingIndex, setChordGridEditingIndex] = useState<number | null>(null)

  const openChordEditorForGrid = useCallback((blockId: string, chordToEdit?: any, index?: number) => {
    setChordGridTargetBlockId(blockId)
    setChordGridEditingIndex(typeof index === 'number' ? index : null)

    const positions: ChordPositions = {
      fingers: (chordToEdit?.fingers ?? []) as any[],
      barres: (chordToEdit?.barres ?? []) as any[],
      muted: (chordToEdit?.muted ?? []) as number[],
    }
    const startFret = (chordToEdit?.position ?? 1) as number

    setChordEditorState(chordToEdit ? positionsToState(positions, startFret) : createEmptyState())
    setChordEditorName((chordToEdit?.chord_name ?? chordToEdit?.name ?? '') as string)
    setChordEditorStartFret(startFret)
    setChordEditorBlockId(null) // não é edição de chord_diagram individual
    setChordEditorOpen(true)
  }, [])

  const handleChordGridSave = useCallback(() => {
    if (!chordGridTargetBlockId) return
    const positions = stateToPositions(chordEditorState, chordEditorStartFret)
    const newChord = {
      chord_name: chordEditorName || 'Acorde',
      fingers: positions.fingers,
      barres: positions.barres,
      muted: positions.muted,
      position: chordEditorStartFret,
    }
    setBlocksWithHistory(prev => prev.map(b => {
      if (b.id !== chordGridTargetBlockId) return b
      const existingChords = ((b.render_data as any)?.chords ?? []) as any[]
      const updatedChords = chordGridEditingIndex !== null
        ? existingChords.map((chord, idx) => idx === chordGridEditingIndex ? { ...chord, ...newChord } : chord)
        : [...existingChords, newChord]
      return { ...b, render_data: { ...(b.render_data ?? {}), chords: updatedChords } }
    }))
    setChordGridTargetBlockId(null)
    setChordGridEditingIndex(null)
    toast.success(chordGridEditingIndex !== null
      ? `Acorde "${chordEditorName || 'Acorde'}" atualizado na grade`
      : `Acorde "${chordEditorName || 'Acorde'}" adicionado à grade`)
  }, [chordGridTargetBlockId, chordGridEditingIndex, chordEditorState, chordEditorName, chordEditorStartFret])

  // Gerar imagem de capa com IA (Nano Banana 2)
  const [coverImageLoading, setCoverImageLoading] = useState(false)
  const [coverImageStatus, setCoverImageStatus] = useState('')
  const [coverPromptLoading, setCoverPromptLoading] = useState(false)
  const [coverPropertiesTab, setCoverPropertiesTab] = useState<'imagem' | 'textos' | 'elementos' | 'metadados'>('imagem')

  // Imagens de referência visual para a capa (opcional)
  const [coverReferenceFiles, setCoverReferenceFiles] = useState<File[]>([])
  const [coverReferencePreviews, setCoverReferencePreviews] = useState<string[]>([])
  const coverRefInputRef = useRef<HTMLInputElement>(null)

  // Melhorar prompt do usuário com IA (usa enhancePromptWithAI do imageGenerationService)
  const handleEnhanceCoverPrompt = useCallback(async () => {
    if (!selectedBlock) return
    const rd = selectedBlock.render_data as any ?? {}
    const userPrompt = (rd.cover_prompt as string) ?? ''
    if (!userPrompt.trim()) {
      toast.error('Escreva uma descrição antes de melhorar')
      return
    }
    const coverDirection = resolveCoverVisualDirection(rd)
    setCoverPromptLoading(true)
    try {
      const enhanced = await enhancePromptWithAI(userPrompt.trim(), 'cover', coverDirection.style)
      updateSelectedRenderData('cover_prompt', enhanced)
      toast.success('Prompt melhorado!')
    } catch (e: any) {
      toast.error('Erro ao melhorar prompt: ' + (e?.message?.slice(0, 80) ?? ''))
    } finally {
      setCoverPromptLoading(false)
    }
  }, [selectedBlock, updateSelectedRenderData])

  const handleGenerateCoverImage = useCallback(async (blockId: string) => {
    // Usa blocksRef.current para ler o estado mais recente (evita closure stale no "Regenerar")
    const block = blocksRef.current.find(b => b.id === blockId)
    if (!block) return
    const rd = block.render_data as any ?? {}
    const titulo = rd.titulo || block.title || materialTitle || 'Material Didático Musical'
    const instrumento = rd.instrumento || ''
    const nivel = rd.nivel || ''
    const escola = rd.escola || ''
    const coverDirection = resolveCoverVisualDirection(rd)
    const advancedPrompt = ((rd.cover_prompt as string) ?? '').trim()
    const hasReferences = coverReferenceFiles.length > 0

    // Se o usuário escreveu um prompt personalizado, usar ele como base
    const prompt = [
      'Artistic background image for a music school workbook cover.',
      `Visual direction: ${coverDirection.label}. ${coverDirection.prompt}`,
      titulo && `Workbook title context: ${titulo}.`,
      instrumento && `Main musical theme: ${instrumento}. Show the instrument or its atmosphere clearly.`,
      !instrumento && 'Main musical theme: music education.',
      nivel && `Student level: ${nivel}.`,
      escola && `School identity: ${escola}.`,
      hasReferences && 'Use the uploaded reference images as visual guidance for composition, colors, mood, and cover style without copying text or logos.',
      advancedPrompt && `Additional teacher direction: ${advancedPrompt}`,
      'Clean, professional portrait composition for A4. Leave clear space in the upper third for title overlay. Do not include text, letters, logos, notation, staff lines, notes, clefs, or sheet music.',
    ].filter(Boolean).join(' ')

    setCoverImageLoading(true)
    setCoverImageStatus('Preparando a geração da imagem...')
    const startTime = performance.now()
    const toastId = toast.loading('Gerando capa com IA...')
    const statusTimers = [
      window.setTimeout(() => setCoverImageStatus('Criando imagem da capa...'), 8_000),
      window.setTimeout(() => setCoverImageStatus('Ainda gerando. Se passar de 75s, vamos cancelar automaticamente.'), 25_000),
      window.setTimeout(() => setCoverImageStatus('Finalizando a imagem...'), 50_000),
    ]
    try {
      // Gerar via Gemini (Nano Banana 2) com style enhancer + referências opcionais
      const result = await generateCoverImageRaw(prompt, coverDirection.style, hasReferences ? coverReferenceFiles : undefined)

      // Upload para Supabase Storage (content-images bucket)
      setCoverImageStatus('Salvando imagem...')
      const ext = result.mimeType === 'image/jpeg' ? 'jpg' : 'png'
      const filePath = `covers/${materialId}/${blockId}_${Date.now()}.${ext}`
      const binaryStr = atob(result.imageBase64)
      const bytes = new Uint8Array(binaryStr.length)
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i)
      const file = new Blob([bytes], { type: result.mimeType })

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('content-images')
        .upload(filePath, file, { contentType: result.mimeType, upsert: true })

      if (uploadError) throw new Error(`Upload falhou: ${uploadError.message}`)

      const { data: urlData } = supabase.storage
        .from('content-images')
        .getPublicUrl(uploadData.path)

      const publicUrl = urlData.publicUrl

      // Atualizar o render_data do bloco com a URL pública
      setBlocksWithHistory(prev => prev.map(b =>
        b.id === blockId
          ? { ...b, render_data: { ...(b.render_data ?? {}), cover_image_url: publicUrl } }
          : b,
      ))
      queueBlockAutosave(blockId)
      const elapsed = ((performance.now() - startTime) / 1000).toFixed(1)
      toast.success(`Capa gerada em ${elapsed}s`, { id: toastId })
    } catch (e: any) {
      console.error('Erro ao gerar capa:', e)
      toast.error(e?.message?.slice(0, 140) || 'Erro ao gerar imagem da capa', { id: toastId })
    } finally {
      statusTimers.forEach(timer => window.clearTimeout(timer))
      setCoverImageLoading(false)
      setCoverImageStatus('')
    }
  }, [materialTitle, materialId, coverReferenceFiles, queueBlockAutosave])

  const handleCoverRefAdd = useCallback((files: FileList | File[]) => {
    const maxFiles = 5
    const maxSize = 5 * 1024 * 1024
    const allowed = ['image/png', 'image/jpeg', 'image/webp']
    const newFiles: File[] = []
    const newPreviews: string[] = []

    for (const file of Array.from(files)) {
      if (coverReferenceFiles.length + newFiles.length >= maxFiles) break
      if (!allowed.includes(file.type)) { toast.error(`${file.name}: formato inválido`); continue }
      if (file.size > maxSize) { toast.error(`${file.name}: máximo 5MB`); continue }
      newFiles.push(file)
      newPreviews.push(URL.createObjectURL(file))
    }

    if (newFiles.length > 0) {
      setCoverReferenceFiles(prev => [...prev, ...newFiles])
      setCoverReferencePreviews(prev => [...prev, ...newPreviews])
    }
  }, [coverReferenceFiles])

  const handleCoverRefRemove = useCallback((index: number) => {
    setCoverReferencePreviews(prev => {
      URL.revokeObjectURL(prev[index])
      return prev.filter((_, i) => i !== index)
    })
    setCoverReferenceFiles(prev => prev.filter((_, i) => i !== index))
  }, [])

  // Importar imagem da biblioteca para a capa
  const [coverLibraryOpen, setCoverLibraryOpen] = useState(false)
  const [coverLibraryImages, setCoverLibraryImages] = useState<ImageLibraryItem[]>([])
  const [coverLibraryLoading, setCoverLibraryLoading] = useState(false)
  const [coverLibrarySearch, setCoverLibrarySearch] = useState('')

  const loadLibraryImages = useCallback(async () => {
    setCoverLibraryLoading(true)
    try {
      const schoolId = school?.id || 'a1b2c3d4-0001-4000-8000-000000000001'
      const images = await fetchImageLibrary(schoolId)
      setCoverLibraryImages(images)
    } catch (e: any) {
      toast.error('Erro ao carregar biblioteca: ' + (e?.message?.slice(0, 60) ?? ''))
    } finally {
      setCoverLibraryLoading(false)
    }
  }, [school])

  const handleOpenCoverLibrary = useCallback(async () => {
    setCoverLibraryOpen(true)
    loadLibraryImages()
  }, [loadLibraryImages])

  const handleSelectLibraryImage = useCallback((imageUrl: string) => {
    if (!selectedBlockId) return
    updateSelectedRenderData('cover_image_url', imageUrl)
    setCoverLibraryOpen(false)
    toast.success('Imagem aplicada como fundo da capa')
  }, [selectedBlockId, updateSelectedRenderData])

  const filteredLibraryImages = useMemo(() => {
    if (!coverLibrarySearch.trim()) return coverLibraryImages
    const q = coverLibrarySearch.toLowerCase()
    return coverLibraryImages.filter(img =>
      img.label.toLowerCase().includes(q) || img.tags?.some(t => t.toLowerCase().includes(q))
    )
  }, [coverLibraryImages, coverLibrarySearch])

  // ── Overlay Elements (camadas sobrepostas na capa) ──
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null)
  const [elementPickerOpen, setElementPickerOpen] = useState(false)

  const activeCoverBlockId = useMemo(() => {
    if (selectedBlock?.block_type === 'cover') return selectedBlock.id
    return blocks.find(block => block.block_type === 'cover')?.id ?? null
  }, [blocks, selectedBlock])

  const activeCoverBlock = useMemo(() => {
    if (!activeCoverBlockId) return null
    return blocks.find(block => block.id === activeCoverBlockId) ?? null
  }, [activeCoverBlockId, blocks])

  const overlayElements: CoverOverlayElement[] = useMemo(() => {
    if (!activeCoverBlock || activeCoverBlock.block_type !== 'cover') return []
    return ((activeCoverBlock.render_data as any)?.overlay_elements as CoverOverlayElement[]) ?? []
  }, [activeCoverBlock])

  const updateCoverOverlayElements = useCallback((nextOverlayElements: CoverOverlayElement[]) => {
    if (!activeCoverBlockId) return
    setBlockWithHistory(activeCoverBlockId, block => ({
      ...block,
      render_data: { ...(block.render_data ?? {}), overlay_elements: nextOverlayElements },
    }))
    queueBlockAutosave(activeCoverBlockId)
  }, [activeCoverBlockId, queueBlockAutosave, setBlockWithHistory])

  const addOverlayElement = useCallback((image: ImageLibraryItem) => {
    if (!activeCoverBlockId) return
    const el: CoverOverlayElement = {
      id: crypto.randomUUID(),
      image_url: image.image_url ?? '',
      label: image.label ?? 'Elemento',
      x: 50, y: 50,
      width: 20,
      rotation: 0,
      opacity: 1,
      shadow: false,
      zIndex: overlayElements.length + 1,
      flipX: false,
    }
    updateCoverOverlayElements([...overlayElements, el])
    setElementPickerOpen(false)
    setSelectedOverlayId(el.id)
    toast.success(`"${el.label}" adicionado à capa`)
  }, [activeCoverBlockId, overlayElements, updateCoverOverlayElements])

  const updateOverlayElement = useCallback((id: string, patch: Partial<CoverOverlayElement>) => {
    if (!activeCoverBlockId) return
    setBlockWithHistory(activeCoverBlockId, block => {
      const rd = block.render_data as any ?? {}
      const current = (Array.isArray(rd.overlay_elements) ? rd.overlay_elements : []) as CoverOverlayElement[]
      return {
        ...block,
        render_data: {
          ...rd,
          overlay_elements: current.map(el => el.id === id ? { ...el, ...patch } : el),
        },
      }
    })
    queueBlockAutosave(activeCoverBlockId)
  }, [activeCoverBlockId, queueBlockAutosave, setBlockWithHistory])

  const removeOverlayElement = useCallback((id: string) => {
    updateCoverOverlayElements(overlayElements.filter(el => el.id !== id))
    if (selectedOverlayId === id) setSelectedOverlayId(null)
  }, [overlayElements, selectedOverlayId, updateCoverOverlayElements])

  const selectOverlayElement = useCallback((id: string | null) => {
    setSelectedOverlayId(id)
    if (id) {
      setCoverPropertiesTab('elementos')
      setSelectedBlockId(null)
      setInlineEditingBlockId(null)
      setToolbarPosition(null)
      setSelectedFloatingId(null)
      setSelectedTextId(null)
      setEditingTextId(null)
    }
  }, [])

  const selectedOverlay = useMemo(() =>
    overlayElements.find(el => el.id === selectedOverlayId) ?? null
  , [overlayElements, selectedOverlayId])

  // ── Text Elements (tipografia avançada na capa) ──
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null)
  const [editingTextId, setEditingTextId] = useState<string | null>(null)

  const textElements: CoverTextElement[] = useMemo(() => {
    if (!activeCoverBlock || activeCoverBlock.block_type !== 'cover') return []
    const rd = activeCoverBlock.render_data as any ?? {}
    // Se já tem text_elements, usa diretamente
    if (Array.isArray(rd.text_elements) && rd.text_elements.length > 0) {
      return rd.text_elements as CoverTextElement[]
    }
    return []
  }, [activeCoverBlock])

  const updateCoverTextElements = useCallback((nextTextElements: CoverTextElement[]) => {
    if (!activeCoverBlockId) return
    setBlockWithHistory(activeCoverBlockId, block => ({
      ...block,
      render_data: { ...(block.render_data ?? {}), text_elements: nextTextElements },
    }))
    queueBlockAutosave(activeCoverBlockId)
  }, [activeCoverBlockId, queueBlockAutosave, setBlockWithHistory])

  // Migra campos legados para text_elements (chamado ao ativar tipografia avançada)
  const initTextElements = useCallback(() => {
    if (!activeCoverBlock || activeCoverBlock.block_type !== 'cover') return
    const rd = activeCoverBlock.render_data as any ?? {}
    const brandCoverFont = school?.default_cover_font || 'Playfair Display'
    const brandBodyFont = school?.default_body_font || 'DM Sans'
    if (Array.isArray(rd.text_elements) && rd.text_elements.length > 0) return // já migrado
    const titulo = rd.titulo || activeCoverBlock.title || materialTitle || 'Material Didático'
    const subtitulo = rd.subtitulo || ''
    const instrumento = rd.instrumento || ''
    const nivel = rd.nivel || ''
    const contentPos = rd.content_pos ?? { x: 50, y: 45 }
    const elements: CoverTextElement[] = []
    // Badge instrumento
    if (instrumento) {
      elements.push({
        id: 'instrument',
        content: instrumento + (nivel ? ` · ${nivel}` : ''),
        x: contentPos.x, y: contentPos.y - 8,
        fontFamily: brandBodyFont, fontSize: 13, fontWeight: 500,
        color: '#ffffffcc', align: 'center', uppercase: true,
        letterSpacing: 3, lineHeight: 1.2,
        shadow: { ...DEFAULT_TEXT_SHADOW }, outline: { ...DEFAULT_TEXT_OUTLINE },
        background: { ...DEFAULT_TEXT_BG }, maxWidth: 60, zIndex: 20,
      })
    }
    // Título
    elements.push({
      id: 'title',
      content: titulo,
      x: contentPos.x, y: contentPos.y,
      fontFamily: brandCoverFont,
      fontSize: rd.title_font_size ?? 36,
      fontWeight: 700,
      color: rd.title_color || '#ffffff',
      align: (rd.title_align as 'left' | 'center' | 'right') ?? 'center',
      uppercase: false, letterSpacing: 1, lineHeight: 1.1,
      shadow: { enabled: true, color: '#000000', blur: 8, offsetX: 2, offsetY: 2 },
      outline: { ...DEFAULT_TEXT_OUTLINE },
      background: { ...DEFAULT_TEXT_BG }, maxWidth: 80, zIndex: 21,
    })
    // Subtítulo
    if (subtitulo) {
      elements.push({
        id: 'subtitle',
        content: subtitulo,
        x: contentPos.x, y: contentPos.y + 8,
        fontFamily: brandBodyFont, fontSize: 18, fontWeight: 400,
        color: '#ffffffcc', align: 'center', uppercase: false,
        letterSpacing: 1, lineHeight: 1.4,
        shadow: { ...DEFAULT_TEXT_SHADOW }, outline: { ...DEFAULT_TEXT_OUTLINE },
        background: { ...DEFAULT_TEXT_BG }, maxWidth: 60, zIndex: 22,
      })
    }
    updateCoverTextElements(elements)
    setSelectedTextId('title')
    setCoverPropertiesTab('textos')
  }, [activeCoverBlock, materialTitle, school?.default_body_font, school?.default_cover_font, updateCoverTextElements])

  const addTextElement = useCallback(() => {
    if (!activeCoverBlockId) return
    const brandCoverFont = school?.default_cover_font || 'Montserrat'
    const el: CoverTextElement = {
      id: crypto.randomUUID(),
      content: 'Novo texto',
      x: 50, y: 70,
      fontFamily: brandCoverFont, fontSize: 20, fontWeight: 400,
      color: '#ffffff', align: 'center', uppercase: false,
      letterSpacing: 0, lineHeight: 1.3,
      shadow: { ...DEFAULT_TEXT_SHADOW }, outline: { ...DEFAULT_TEXT_OUTLINE },
      background: { ...DEFAULT_TEXT_BG }, maxWidth: 60,
      zIndex: 22 + textElements.length,
    }
    updateCoverTextElements([...textElements, el])
    setSelectedTextId(el.id)
    setEditingTextId(el.id)
    setCoverPropertiesTab('textos')
  }, [activeCoverBlockId, school?.default_cover_font, textElements, updateCoverTextElements])

  const updateTextElement = useCallback((id: string, patch: Partial<CoverTextElement>) => {
    if (!activeCoverBlockId) return
    setBlockWithHistory(activeCoverBlockId, block => {
      const rd = block.render_data as any ?? {}
      const current = (Array.isArray(rd.text_elements) ? rd.text_elements : []) as CoverTextElement[]
      return {
        ...block,
        render_data: {
          ...rd,
          text_elements: current.map(el => el.id === id ? { ...el, ...patch } : el),
        },
      }
    })
    queueBlockAutosave(activeCoverBlockId)
  }, [activeCoverBlockId, queueBlockAutosave, setBlockWithHistory])

  const removeTextElement = useCallback((id: string) => {
    updateCoverTextElements(textElements.filter(el => el.id !== id))
    if (selectedTextId === id) setSelectedTextId(null)
  }, [textElements, selectedTextId, updateCoverTextElements])

  const selectedText = useMemo(() =>
    textElements.find(el => el.id === selectedTextId) ?? null
  , [textElements, selectedTextId])

  type CoverCanvasClipboard =
    | { kind: 'text'; item: CoverTextElement }
    | { kind: 'overlay'; item: CoverOverlayElement }

  const coverCanvasClipboardRef = useRef<CoverCanvasClipboard | null>(null)

  const selectTextElement = useCallback((id: string | null) => {
    setSelectedTextId(id)
    if (id) {
      setCoverPropertiesTab('textos')
      if (activeCoverBlockId) setSelectedBlockId(activeCoverBlockId)
      setSelectedOverlayId(null)
      setSelectedFloatingId(null)
      setEditingFloatingId(null)
      setInlineEditingBlockId(null)
      setToolbarPosition(null)
    }
  }, [activeCoverBlockId])

  const duplicateTextElement = useCallback((id: string) => {
    const source = textElements.find(el => el.id === id)
    if (!source) return
    const maxZ = Math.max(...textElements.map(el => el.zIndex), 22)
    const copy: CoverTextElement = {
      ...source,
      id: crypto.randomUUID(),
      x: Math.min(96, source.x + 3),
      y: Math.min(96, source.y + 3),
      zIndex: maxZ + 1,
    }
    updateCoverTextElements([...textElements, copy])
    setSelectedTextId(copy.id)
    setEditingTextId(null)
    setCoverPropertiesTab('textos')
    toast.success('Texto duplicado')
  }, [textElements, updateCoverTextElements])

  const cloneTextElementForDrag = useCallback((id: string) => {
    const source = textElements.find(el => el.id === id)
    if (!source) return null
    const maxZ = Math.max(...textElements.map(el => el.zIndex), 22)
    const copy: CoverTextElement = {
      ...source,
      id: crypto.randomUUID(),
      zIndex: maxZ + 1,
    }
    updateCoverTextElements([...textElements, copy])
    setSelectedTextId(copy.id)
    setSelectedOverlayId(null)
    setEditingTextId(null)
    setCoverPropertiesTab('textos')
    return copy
  }, [textElements, updateCoverTextElements])

  const duplicateOverlayElement = useCallback((id: string) => {
    const source = overlayElements.find(el => el.id === id)
    if (!source) return
    const maxZ = Math.max(...overlayElements.map(el => el.zIndex), 0)
    const copy: CoverOverlayElement = {
      ...source,
      id: crypto.randomUUID(),
      x: Math.min(96, source.x + 3),
      y: Math.min(96, source.y + 3),
      zIndex: maxZ + 1,
    }
    updateCoverOverlayElements([...overlayElements, copy])
    setSelectedOverlayId(copy.id)
    setCoverPropertiesTab('elementos')
    toast.success('Elemento duplicado')
  }, [overlayElements, updateCoverOverlayElements])

  const cloneOverlayElementForDrag = useCallback((id: string) => {
    const source = overlayElements.find(el => el.id === id)
    if (!source) return null
    const maxZ = Math.max(...overlayElements.map(el => el.zIndex), 0)
    const copy: CoverOverlayElement = {
      ...source,
      id: crypto.randomUUID(),
      zIndex: maxZ + 1,
    }
    updateCoverOverlayElements([...overlayElements, copy])
    setSelectedOverlayId(copy.id)
    setSelectedTextId(null)
    setEditingTextId(null)
    setCoverPropertiesTab('elementos')
    return copy
  }, [overlayElements, updateCoverOverlayElements])

  const copySelectedCoverElement = useCallback(() => {
    if (selectedText) {
      coverCanvasClipboardRef.current = { kind: 'text', item: { ...selectedText } }
      toast.success('Texto copiado')
      return true
    }
    if (selectedOverlay) {
      coverCanvasClipboardRef.current = { kind: 'overlay', item: { ...selectedOverlay } }
      toast.success('Elemento copiado')
      return true
    }
    return false
  }, [selectedOverlay, selectedText])

  const copyTextElement = useCallback((id: string) => {
    const source = textElements.find(el => el.id === id)
    if (!source) return
    coverCanvasClipboardRef.current = { kind: 'text', item: { ...source } }
    setSelectedTextId(id)
    setSelectedOverlayId(null)
    setCoverPropertiesTab('textos')
    toast.success('Texto copiado')
  }, [textElements])

  const updateTextLayer = useCallback((id: string, action: 'front' | 'forward' | 'backward' | 'back') => {
    if (!activeCoverBlockId) return
    setBlockWithHistory(activeCoverBlockId, block => {
      const rd = block.render_data as any ?? {}
      const current = (Array.isArray(rd.text_elements) ? rd.text_elements : []) as CoverTextElement[]
      const target = current.find(el => el.id === id)
      if (!target) return block
      const ordered = [...current].sort((a, b) => a.zIndex - b.zIndex)
      const targetIndex = ordered.findIndex(el => el.id === id)
      const next = current.map(el => ({ ...el }))
      const patchZ = (itemId: string, zIndex: number) => {
        const item = next.find(el => el.id === itemId)
        if (item) item.zIndex = zIndex
      }

      if (action === 'front') {
        patchZ(id, Math.max(...current.map(el => el.zIndex), target.zIndex) + 1)
      } else if (action === 'back') {
        patchZ(id, Math.min(...current.map(el => el.zIndex), target.zIndex) - 1)
      } else if (action === 'forward' && targetIndex < ordered.length - 1) {
        const neighbor = ordered[targetIndex + 1]
        patchZ(id, neighbor.zIndex)
        patchZ(neighbor.id, target.zIndex)
      } else if (action === 'backward' && targetIndex > 0) {
        const neighbor = ordered[targetIndex - 1]
        patchZ(id, neighbor.zIndex)
        patchZ(neighbor.id, target.zIndex)
      } else {
        return block
      }

      return {
        ...block,
        render_data: { ...rd, text_elements: next },
      }
    })
    queueBlockAutosave(activeCoverBlockId)
  }, [activeCoverBlockId, queueBlockAutosave, setBlockWithHistory, textElements])

  const pasteCoverElement = useCallback(() => {
    const clipboard = coverCanvasClipboardRef.current
    if (!clipboard || !activeCoverBlockId) return false

    if (clipboard.kind === 'text') {
      const maxZ = Math.max(...textElements.map(el => el.zIndex), 22)
      const copy: CoverTextElement = {
        ...clipboard.item,
        id: crypto.randomUUID(),
        x: Math.min(96, clipboard.item.x + 4),
        y: Math.min(96, clipboard.item.y + 4),
        zIndex: maxZ + 1,
      }
      updateCoverTextElements([...textElements, copy])
      setSelectedTextId(copy.id)
      setSelectedOverlayId(null)
      setEditingTextId(null)
      setCoverPropertiesTab('textos')
      toast.success('Texto colado')
      return true
    }

    const maxZ = Math.max(...overlayElements.map(el => el.zIndex), 0)
    const copy: CoverOverlayElement = {
      ...clipboard.item,
      id: crypto.randomUUID(),
      x: Math.min(96, clipboard.item.x + 4),
      y: Math.min(96, clipboard.item.y + 4),
      zIndex: maxZ + 1,
    }
    updateCoverOverlayElements([...overlayElements, copy])
    setSelectedOverlayId(copy.id)
    setSelectedTextId(null)
    setCoverPropertiesTab('elementos')
    toast.success('Elemento colado')
    return true
  }, [activeCoverBlockId, overlayElements, textElements, updateCoverOverlayElements, updateCoverTextElements])

  const nudgeSelectedCoverElement = useCallback((key: string, step: number) => {
    const delta = {
      x: key === 'ArrowLeft' ? -step : key === 'ArrowRight' ? step : 0,
      y: key === 'ArrowUp' ? -step : key === 'ArrowDown' ? step : 0,
    }
    if (selectedText) {
      updateTextElement(selectedText.id, {
        x: Math.max(0, Math.min(100, Math.round((selectedText.x + delta.x) * 10) / 10)),
        y: Math.max(0, Math.min(100, Math.round((selectedText.y + delta.y) * 10) / 10)),
      })
      return true
    }
    if (selectedOverlay) {
      updateOverlayElement(selectedOverlay.id, {
        x: Math.max(0, Math.min(100, Math.round((selectedOverlay.x + delta.x) * 10) / 10)),
        y: Math.max(0, Math.min(100, Math.round((selectedOverlay.y + delta.y) * 10) / 10)),
      })
      return true
    }
    return false
  }, [selectedOverlay, selectedText, updateOverlayElement, updateTextElement])

  // ── Floating Elements (Fase 3 — elementos livres) ──
  const [floatingElements, setFloatingElements] = useState<FloatingElement[]>([])
  const [selectedFloatingId, setSelectedFloatingId] = useState<string | null>(null)
  const [editingFloatingId, setEditingFloatingId] = useState<string | null>(null)
  const [floatingTransformState, setFloatingTransformState] = useState<{
    id: string
    type: 'drag' | 'resize' | 'rotate'
    rotation?: number
  } | null>(null)
  const [showLayersPanel, setShowLayersPanel] = useState(false)
  const [floatingImagePickerOpen, setFloatingImagePickerOpen] = useState(false)
  const [elementsPickerOpen, setElementsPickerOpen] = useState(false)
  const floatingImageInputRef = useRef<HTMLInputElement>(null)
  const floatingElementsHydratedRef = useRef(false)

  // Carregar floating elements do pageConfig
  useEffect(() => {
    if (pageConfig.floating_elements && pageConfig.floating_elements.length > 0) {
      setFloatingElements(pageConfig.floating_elements)
      floatingElementsHydratedRef.current = true
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps — apenas no mount

  // Hidratar quando o page_config real chega depois do mount.
  useEffect(() => {
    const savedFloatingElements = pageConfig.floating_elements ?? []
    if (shouldHydrateFloatingElementsFromPageConfig({
      alreadyHydrated: floatingElementsHydratedRef.current,
      localElementCount: floatingElements.length,
      pageConfigElementCount: savedFloatingElements.length,
    })) {
      setFloatingElements(savedFloatingElements)
      floatingElementsHydratedRef.current = true
    }
  }, [floatingElements.length, pageConfig.floating_elements])

  // Persistir floating elements no pageConfig
  useEffect(() => {
    const savedFloatingElements = pageConfig.floating_elements ?? []
    if (!shouldPersistFloatingElementsToPageConfig({
      initialLoadDone: initialLoadDone.current,
      alreadyHydrated: floatingElementsHydratedRef.current,
      localElementCount: floatingElements.length,
      pageConfigElementCount: savedFloatingElements.length,
    })) return

    setPageConfig(prev => {
      if (stableSerialize(prev.floating_elements ?? []) === stableSerialize(floatingElements)) return prev
      return { ...prev, floating_elements: floatingElements }
    })
  }, [floatingElements, pageConfig.floating_elements])

  const selectedFloating = useMemo(() =>
    floatingElements.find(el => el.id === selectedFloatingId) ?? null
  , [floatingElements, selectedFloatingId])

  const floatingUndoStack = useRef<Array<{ before: FloatingElement[]; after: FloatingElement[] }>>([])
  const floatingRedoStack = useRef<Array<{ before: FloatingElement[]; after: FloatingElement[] }>>([])
  const [, setFloatingHistoryVersion] = useState(0)

  const pushFloatingHistoryEntry = useCallback((before: FloatingElement[], after: FloatingElement[]) => {
    if (stableSerialize(before) === stableSerialize(after)) return
    floatingUndoStack.current = [
      ...floatingUndoStack.current.slice(-29),
      { before: structuredClone(before) as FloatingElement[], after: structuredClone(after) as FloatingElement[] },
    ]
    floatingRedoStack.current = []
    setFloatingHistoryVersion(v => v + 1)
  }, [])

  const setFloatingElementsWithHistory = useCallback((
    updater: FloatingElement[] | ((prev: FloatingElement[]) => FloatingElement[]),
  ) => {
    floatingElementsHydratedRef.current = true
    setFloatingElements(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      pushFloatingHistoryEntry(prev, next)
      return next
    })
  }, [pushFloatingHistoryEntry])

  const undoFloatingElementChange = useCallback(() => {
    const entry = floatingUndoStack.current.pop()
    if (!entry) return false
    floatingRedoStack.current.push(entry)
    floatingElementsHydratedRef.current = true
    setFloatingElements(entry.before)
    setSelectedFloatingId(currentId => (
      currentId && entry.before.some(el => el.id === currentId)
        ? currentId
        : entry.before.at(-1)?.id ?? null
    ))
    setEditingFloatingId(null)
    setFloatingHistoryVersion(v => v + 1)
    toast.info('Desfazer elemento', { duration: 1500 })
    return true
  }, [])

  const redoFloatingElementChange = useCallback(() => {
    const entry = floatingRedoStack.current.pop()
    if (!entry) return false
    floatingUndoStack.current.push(entry)
    floatingElementsHydratedRef.current = true
    setFloatingElements(entry.after)
    setSelectedFloatingId(currentId => (
      currentId && entry.after.some(el => el.id === currentId)
        ? currentId
        : entry.after.at(-1)?.id ?? null
    ))
    setEditingFloatingId(null)
    setFloatingHistoryVersion(v => v + 1)
    toast.info('Refazer elemento', { duration: 1500 })
    return true
  }, [])

  const canUndoFloatingElementChange = useCallback(() => floatingUndoStack.current.length > 0, [])
  const canRedoFloatingElementChange = useCallback(() => floatingRedoStack.current.length > 0, [])

  // Qual página está visível no canvas (baseado no scroll)
  const getCurrentVisiblePageIndex = useCallback((): number => {
    const scrollEl = canvasScrollRef.current
    if (!scrollEl) return currentVisiblePage
    const pageEls = Array.from(scrollEl.querySelectorAll('.a4-page')) as HTMLElement[]
    if (!pageEls.length) return currentVisiblePage
    const viewportRect = scrollEl.getBoundingClientRect()
    const pageRects = pageEls.map(page => page.getBoundingClientRect())
    return getVisiblePageIndexFromRects(viewportRect, pageRects, currentVisiblePage)
  }, [currentVisiblePage])

  const addFloatingTextElement = useCallback(() => {
    const currentPage = getCurrentVisiblePageIndex()
    const count = floatingElements.filter(e => e.type === 'floating_text').length
    const newEl: FloatingElement = {
      ...DEFAULT_FLOATING_TEXT,
      id: crypto.randomUUID(),
      pageIndex: currentPage,
      zIndex: (floatingElements.length + 1) * 10,
      name: `Texto ${count + 1}`,
    } as FloatingElement
    setFloatingElementsWithHistory(prev => [...prev, newEl])
    setSelectedFloatingId(newEl.id)
    setEditingFloatingId(null)
    setSelectedBlockId(null) // desselecionar bloco normal
  }, [floatingElements, getCurrentVisiblePageIndex, setFloatingElementsWithHistory])

  const addFloatingShapeElement = useCallback((shape: FloatingShapeKind = 'rectangle') => {
    const currentPage = getCurrentVisiblePageIndex()
    const count = floatingElements.filter(e => e.type === 'shape').length
    const newEl = createFloatingShape(shape, {
      id: crypto.randomUUID(),
      pageIndex: currentPage,
      zIndex: (floatingElements.length + 1) * 10,
      name: `${getFloatingShapeLabel(shape)} ${count + 1}`,
    })
    setFloatingElementsWithHistory(prev => [...prev, newEl])
    setSelectedFloatingId(newEl.id)
    setSelectedBlockId(null)
  }, [floatingElements, getCurrentVisiblePageIndex, setFloatingElementsWithHistory])

  const addFloatingIconElement = useCallback((icon: string, label: string) => {
    const currentPage = getCurrentVisiblePageIndex()
    const count = floatingElements.filter(e => e.type === 'iconify_icon').length
    const newEl = createFloatingIcon({
      id: crypto.randomUUID(),
      icon,
      label: `${label} ${count + 1}`,
      pageIndex: currentPage,
      zIndex: (floatingElements.length + 1) * 10,
    })
    setFloatingElementsWithHistory(prev => [...prev, newEl])
    setSelectedFloatingId(newEl.id)
    setSelectedBlockId(null)
  }, [floatingElements, getCurrentVisiblePageIndex, setFloatingElementsWithHistory])

  const addFloatingImage = useCallback((imageUrl: string, label: string) => {
    const currentPage = getCurrentVisiblePageIndex()
    const count = floatingElements.filter(e => e.type === 'floating_image').length
    const newEl: FloatingImage = {
      ...DEFAULT_FLOATING_IMAGE,
      id: crypto.randomUUID(),
      imageUrl,
      pageIndex: currentPage,
      zIndex: (floatingElements.length + 1) * 10,
      name: label || `Imagem ${count + 1}`,
    } as FloatingImage
    setFloatingElementsWithHistory(prev => [...prev, newEl])
    setSelectedFloatingId(newEl.id)
    setSelectedBlockId(null)
    setFloatingImagePickerOpen(false)
  }, [floatingElements, getCurrentVisiblePageIndex, setFloatingElementsWithHistory])

  const addElementAssetFromPicker = useCallback((asset: ElementLibraryAsset) => {
    try {
      const maxZ = Math.max(0, ...floatingElements.map(el => el.zIndex))
      const newEl = createFloatingImageFromElementAsset(asset, {
        id: crypto.randomUUID(),
        pageIndex: getCurrentVisiblePageIndex(),
        zIndex: maxZ + 10,
      })
      setFloatingElementsWithHistory(prev => [...prev, newEl])
      setSelectedFloatingId(newEl.id)
      setSelectedBlockId(null)
      setEditingFloatingId(null)
      setElementsPickerOpen(false)
      toast.success('Elemento adicionado ao material')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nao foi possivel adicionar o elemento.')
    }
  }, [floatingElements, getCurrentVisiblePageIndex, setFloatingElementsWithHistory])

  const updateFloatingElement = useCallback((id: string, updates: Record<string, unknown>, options: { history?: boolean } = {}) => {
    floatingElementsHydratedRef.current = true
    const setter = options.history === false ? setFloatingElements : setFloatingElementsWithHistory
    setter(prev => {
      const next: FloatingElement[] = []
      for (const el of prev) {
        if (el.id === id) {
          next.push(Object.assign({}, el, updates) as FloatingElement)
        } else {
          next.push(el)
        }
      }
      return next
    })
  }, [setFloatingElementsWithHistory])

  const removeFloatingElement = useCallback((id: string) => {
    setFloatingElementsWithHistory(prev => prev.filter(el => el.id !== id))
    if (selectedFloatingId === id) setSelectedFloatingId(null)
    if (editingFloatingId === id) setEditingFloatingId(null)
  }, [selectedFloatingId, editingFloatingId, setFloatingElementsWithHistory])

  const floatingClipboardRef = useRef<FloatingElement | null>(null)

  const duplicateFloatingElement = useCallback((id: string) => {
    const source = floatingElements.find(el => el.id === id)
    if (!source) return
    const maxZ = Math.max(...floatingElements.map(el => el.zIndex), 0)
    const copy: FloatingElement = {
      ...(structuredClone(source) as FloatingElement),
      id: crypto.randomUUID(),
      x: Math.min(96, source.x + 3),
      y: Math.min(96, source.y + 3),
      zIndex: maxZ + 10,
      name: `${source.name} cópia`,
      locked: false,
    }
    setFloatingElementsWithHistory(prev => [...prev, copy])
    setSelectedFloatingId(copy.id)
    setSelectedBlockId(null)
    setEditingFloatingId(null)
    toast.success('Elemento duplicado')
  }, [floatingElements, setFloatingElementsWithHistory])

  const copySelectedFloatingElement = useCallback(() => {
    if (!selectedFloating) return false
    floatingClipboardRef.current = structuredClone(selectedFloating) as FloatingElement
    toast.success('Elemento copiado')
    return true
  }, [selectedFloating])

  const pasteFloatingElement = useCallback(() => {
    const source = floatingClipboardRef.current
    if (!source) return false
    const maxZ = Math.max(...floatingElements.map(el => el.zIndex), 0)
    const copy: FloatingElement = {
      ...(structuredClone(source) as FloatingElement),
      id: crypto.randomUUID(),
      x: Math.min(96, source.x + 4),
      y: Math.min(96, source.y + 4),
      zIndex: maxZ + 10,
      locked: false,
    }
    setFloatingElementsWithHistory(prev => [...prev, copy])
    setSelectedFloatingId(copy.id)
    setSelectedBlockId(null)
    setEditingFloatingId(null)
    toast.success('Elemento colado')
    return true
  }, [floatingElements, setFloatingElementsWithHistory])

  const bringFloatingElementForward = useCallback((id: string) => {
    const maxZ = Math.max(...floatingElements.map(el => el.zIndex), 0)
    updateFloatingElement(id, { zIndex: maxZ + 10 })
  }, [floatingElements, updateFloatingElement])

  const sendFloatingElementBackward = useCallback((id: string) => {
    const minZ = Math.min(...floatingElements.map(el => el.zIndex), 0)
    updateFloatingElement(id, { zIndex: minZ - 10 })
  }, [floatingElements, updateFloatingElement])

  const nudgeSelectedFloatingElement = useCallback((key: string, step: number) => {
    if (!selectedFloating || selectedFloating.locked) return false
    const delta = {
      x: key === 'ArrowLeft' ? -step : key === 'ArrowRight' ? step : 0,
      y: key === 'ArrowUp' ? -step : key === 'ArrowDown' ? step : 0,
    }
    updateFloatingElement(selectedFloating.id, {
      x: Math.max(0, Math.min(100, Math.round((selectedFloating.x + delta.x) * 10) / 10)),
      y: Math.max(0, Math.min(100, Math.round((selectedFloating.y + delta.y) * 10) / 10)),
    })
    return true
  }, [selectedFloating, updateFloatingElement])

  const handleFloatingDragStart = useCallback((e: React.MouseEvent<HTMLDivElement>, elementId: string) => {
    e.preventDefault()
    e.stopPropagation()
    const element = floatingElements.find(el => el.id === elementId)
    if (!element || element.locked) return

    const pageEls = Array.from(canvasScrollRef.current?.querySelectorAll('.a4-page') ?? []) as HTMLElement[]
    const pageEl = pageEls[element.pageIndex]
    if (!pageEl) return

    const rect = pageEl.getBoundingClientRect()
    const startElementRect = e.currentTarget.getBoundingClientRect()
    const startX = e.clientX
    const startY = e.clientY
    const startElX = element.x
    const startElY = element.y
    const targetEl = e.currentTarget
    let pendingPosition: { x: number; y: number } | null = null
    let finalPosition = { pageIndex: element.pageIndex, x: startElX, y: startElY }
    let animationFrame: number | null = null

    const flushPosition = () => {
      animationFrame = null
      if (!pendingPosition) return
      targetEl.style.left = `${pendingPosition.x}%`
      targetEl.style.top = `${pendingPosition.y}%`
      pendingPosition = null
    }

    setFloatingTransformState({ id: elementId, type: 'drag' })

    const handleMove = (moveEvent: MouseEvent) => {
      const deltaXPercent = ((moveEvent.clientX - startX) / rect.width) * 100
      const deltaYPercent = ((moveEvent.clientY - startY) / rect.height) * 100
      const sx = floatingSnapValue(startElX + deltaXPercent)
      const sy = floatingSnapValue(startElY + deltaYPercent)
      finalPosition = calculateFloatingElementPageDrag({
        startPointer: { x: startX, y: startY },
        currentPointer: { x: moveEvent.clientX, y: moveEvent.clientY },
        startPageIndex: element.pageIndex,
        startElementX: startElX,
        startElementY: startElY,
        startElementRect,
        pageRects: pageEls.map(page => page.getBoundingClientRect()),
      })
      pendingPosition = {
        x: Math.round(sx.snapped * 10) / 10,
        y: Math.round(sy.snapped * 10) / 10,
      }
      if (animationFrame === null) {
        animationFrame = window.requestAnimationFrame(flushPosition)
      }
    }

    const handleUp = () => {
      if (animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame)
        flushPosition()
      }
      targetEl.style.willChange = ''
      updateFloatingElement(elementId, finalPosition)
      setFloatingTransformState(null)
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }

    targetEl.style.willChange = 'left, top'
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
  }, [floatingElements, updateFloatingElement])

  const handleFloatingResizeStart = useCallback((
    e: React.MouseEvent<HTMLButtonElement>,
    elementId: string,
    handle: FloatingResizeHandle,
  ) => {
    e.preventDefault()
    e.stopPropagation()
    const element = floatingElements.find(el => el.id === elementId)
    if (!element || element.locked) return
    const pageEl = document.querySelectorAll('.a4-page')[element.pageIndex] as HTMLElement | undefined
    if (!pageEl) return

    const rect = pageEl.getBoundingClientRect()
    const startX = e.clientX
    const startY = e.clientY
    const beforeElements = structuredClone(floatingElements) as FloatingElement[]
    let pendingUpdates: Partial<FloatingElement> | null = null
    let finalUpdates: Partial<FloatingElement> | null = null
    let animationFrame: number | null = null
    setFloatingTransformState({ id: elementId, type: 'resize' })

    const flushResize = () => {
      animationFrame = null
      if (!pendingUpdates) return
      finalUpdates = pendingUpdates
      updateFloatingElement(elementId, finalUpdates as Record<string, unknown>, { history: false })
      pendingUpdates = null
    }

    const handleMove = (moveEvent: MouseEvent) => {
      pendingUpdates = calculateFloatingElementResize({
        element,
        handle,
        deltaXPercent: ((moveEvent.clientX - startX) / rect.width) * 100,
        deltaYPercent: ((moveEvent.clientY - startY) / rect.height) * 100,
        fromCenter: moveEvent.altKey,
        keepAspectRatio: moveEvent.shiftKey,
      })
      if (animationFrame === null) {
        animationFrame = window.requestAnimationFrame(flushResize)
      }
    }

    const handleUp = () => {
      if (animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame)
        flushResize()
      }
      if (finalUpdates) {
        const afterElements = beforeElements.map(el => (
          el.id === elementId
            ? Object.assign({}, el, finalUpdates) as FloatingElement
            : el
        ))
        pushFloatingHistoryEntry(beforeElements, afterElements)
      }
      setFloatingTransformState(null)
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
  }, [floatingElements, pushFloatingHistoryEntry, updateFloatingElement])

  const handleFloatingRotateStart = useCallback((e: React.MouseEvent<HTMLButtonElement>, elementId: string) => {
    e.preventDefault()
    e.stopPropagation()
    const element = floatingElements.find(el => el.id === elementId)
    if (!element || element.locked) return
    const elementNode = document.querySelector(`[data-floating-element-id="${elementId}"]`) as HTMLElement | null
    if (!elementNode) return

    const rect = elementNode.getBoundingClientRect()
    const beforeElements = structuredClone(floatingElements) as FloatingElement[]
    const center = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    }
    const startPointer = { x: e.clientX, y: e.clientY }
    const startRotation = element.rotation
    let finalRotation = element.rotation
    setFloatingTransformState({ id: elementId, type: 'rotate', rotation: element.rotation })

    const handleMove = (moveEvent: MouseEvent) => {
      finalRotation = calculateFloatingElementRotationFromDrag({
        center,
        startPointer,
        currentPointer: { x: moveEvent.clientX, y: moveEvent.clientY },
        startRotation,
      })
      setFloatingTransformState({ id: elementId, type: 'rotate', rotation: finalRotation })
      updateFloatingElement(elementId, {
        rotation: finalRotation,
      }, { history: false })
    }

    const handleUp = () => {
      const afterElements = beforeElements.map(el => (
        el.id === elementId
          ? { ...el, rotation: finalRotation }
          : el
      ))
      pushFloatingHistoryEntry(beforeElements, afterElements)
      setFloatingTransformState(null)
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
  }, [floatingElements, pushFloatingHistoryEntry, updateFloatingElement])

  // Upload de imagem para floating_image
  const handleFloatingImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) { toast.error('Imagem deve ter no máximo 5MB'); return }
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      toast.error('Formato inválido. Use PNG, JPG ou WebP'); return
    }
    try {
      const ext = file.name.split('.').pop() ?? 'png'
      const filePath = `floating/${materialId}/${crypto.randomUUID()}.${ext}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('content-images')
        .upload(filePath, file, { contentType: file.type, upsert: true })
      if (uploadError) throw new Error(uploadError.message)
      const { data: urlData } = supabase.storage.from('content-images').getPublicUrl(uploadData.path)
      addFloatingImage(urlData.publicUrl, file.name.replace(/\.[^/.]+$/, ''))
      toast.success('Imagem adicionada!')
    } catch (err: any) {
      toast.error('Erro ao enviar: ' + (err?.message?.slice(0, 60) ?? ''))
    }
    e.target.value = '' // reset input
  }, [materialId, addFloatingImage])

  // Upload de logomarca para a capa
  const logoInputRef = useRef<HTMLInputElement>(null)
  const [logoUploading, setLogoUploading] = useState(false)

  const brandLogoVariants = useMemo(() => {
    const rawVariants = school?.logo_variants
    const variants: BrandLogoVariants =
      rawVariants && typeof rawVariants === 'object' && !Array.isArray(rawVariants)
        ? rawVariants as BrandLogoVariants
        : {}
    if (school?.logo_url && !variants.primary) {
      return { ...variants, primary: school.logo_url }
    }
    return variants
  }, [school?.logo_url, school?.logo_variants])

  const availableBrandLogos = useMemo(
    () => BRAND_LOGO_VARIANT_ORDER
      .map(key => ({ key, label: BRAND_LOGO_VARIANT_LABELS[key], url: brandLogoVariants[key] }))
      .filter((item): item is { key: BrandLogoVariantKey; label: string; url: string } => Boolean(item.url)),
    [brandLogoVariants],
  )
  const [headerFooterLogoKey, setHeaderFooterLogoKey] = useState<BrandLogoVariantKey>('horizontal')
  const selectedHeaderFooterLogo = useMemo(
    () => availableBrandLogos.find(logo => logo.key === headerFooterLogoKey) ?? availableBrandLogos[0] ?? null,
    [availableBrandLogos, headerFooterLogoKey],
  )

  const applyLogoToHeaderConfig = useCallback((config: HeaderFooterConfig, logoUrl: string): HeaderFooterConfig => {
    const zones = ['left', 'center', 'right'] as const
    const targetZone = zones.find(zone => config[zone].type === 'image') ?? 'left'
    const currentZone = config[targetZone]

    return {
      ...config,
      [targetZone]: {
        ...currentZone,
        type: 'image',
        imageUrl: logoUrl,
        imageHeight: currentZone.imageHeight ?? 26,
      },
    }
  }, [])

  const replaceExistingFooterLogos = useCallback((config: HeaderFooterConfig, logoUrl: string): HeaderFooterConfig => {
    const zones = ['left', 'center', 'right'] as const
    const hasFooterLogo = zones.some(zone => config[zone].type === 'image')
    if (!hasFooterLogo) return config

    return zones.reduce((nextConfig, zone) => {
      if (nextConfig[zone].type !== 'image') return nextConfig
      return {
        ...nextConfig,
        [zone]: {
          ...nextConfig[zone],
          imageUrl: logoUrl,
        },
      }
    }, config)
  }, [])

  const handleHeaderFooterLogoSelect = useCallback((logo: { key: BrandLogoVariantKey; label: string; url: string }) => {
    setHeaderFooterLogoKey(logo.key)
    setPageConfig(prev => ({
      ...prev,
      header: applyLogoToHeaderConfig(prev.header, logo.url),
      footer: replaceExistingFooterLogos(prev.footer, logo.url),
    }))
    toast.success(`Logo ${logo.label} aplicada no cabeçalho.`)
  }, [applyLogoToHeaderConfig, replaceExistingFooterLogos])

  const [coverTemplates, setCoverTemplates] = useState<SchoolCoverTemplate[]>([])
  const [coverTemplatesLoading, setCoverTemplatesLoading] = useState(false)
  const [saveCoverTemplateOpen, setSaveCoverTemplateOpen] = useState(false)
  const [coverTemplateName, setCoverTemplateName] = useState('')
  const [coverTemplateDescription, setCoverTemplateDescription] = useState('')
  const [coverTemplateSaving, setCoverTemplateSaving] = useState(false)

  const loadSavedCoverTemplates = useCallback(async () => {
    if (!school?.id) return
    setCoverTemplatesLoading(true)
    try {
      const data = await listSchoolCoverTemplates(school.id)
      setCoverTemplates(data)
    } catch (err: any) {
      toast.error('Erro ao carregar capas salvas: ' + (err?.message?.slice(0, 80) ?? ''))
    } finally {
      setCoverTemplatesLoading(false)
    }
  }, [school?.id])

  useEffect(() => {
    void loadSavedCoverTemplates()
  }, [loadSavedCoverTemplates])

  const cloneCoverRenderData = useCallback((renderData: unknown) => (
    JSON.parse(JSON.stringify(renderData ?? {})) as Record<string, any>
  ), [])

  const getCoverTemplateThumbnail = useCallback((renderData: Record<string, any>) => (
    (renderData.cover_image_url as string | undefined)
    ?? (renderData.logo_url as string | undefined)
    ?? null
  ), [])

  const handleSaveCoverTemplate = useCallback(async () => {
    if (!school?.id || !activeCoverBlock || activeCoverBlock.block_type !== 'cover') return
    const name = coverTemplateName.trim()
    if (!name) {
      toast.error('Dê um nome para a capa salva.')
      return
    }

    const renderData = cloneCoverRenderData(activeCoverBlock.render_data)
    setCoverTemplateSaving(true)
    try {
      const saved = await createSchoolCoverTemplate({
        school_id: school.id,
        name,
        description: coverTemplateDescription.trim() || null,
        render_data: renderData,
        thumbnail_url: getCoverTemplateThumbnail(renderData),
        created_by: user?.id ?? null,
      })
      setCoverTemplates(prev => [saved, ...prev])
      setSaveCoverTemplateOpen(false)
      setCoverTemplateName('')
      setCoverTemplateDescription('')
      toast.success('Capa salva como modelo.')
    } catch (err: any) {
      toast.error('Erro ao salvar capa: ' + (err?.message?.slice(0, 80) ?? ''))
    } finally {
      setCoverTemplateSaving(false)
    }
  }, [
    activeCoverBlock,
    cloneCoverRenderData,
    coverTemplateDescription,
    coverTemplateName,
    getCoverTemplateThumbnail,
    school?.id,
    user?.id,
  ])

  const getCurrentCoverTextValues = useCallback((block: EditorBlock, renderData: Record<string, any>) => {
    const currentTexts = Array.isArray(renderData.text_elements)
      ? renderData.text_elements as CoverTextElement[]
      : []
    const byId = new Map(currentTexts.map(text => [text.id, text.content]))
    return {
      title: byId.get('title') ?? renderData.titulo ?? block.title ?? materialTitle ?? '',
      subtitle: byId.get('subtitle') ?? renderData.subtitulo ?? '',
      instrument: byId.get('instrument') ?? (
        renderData.instrumento
          ? `${renderData.instrumento}${renderData.nivel ? ` · ${renderData.nivel}` : ''}`
          : ''
      ),
      titulo: renderData.titulo ?? block.title ?? materialTitle ?? '',
      subtitulo: renderData.subtitulo ?? '',
      instrumento: renderData.instrumento ?? '',
      nivel: renderData.nivel ?? '',
    }
  }, [materialTitle])

  const mergeTemplateWithCurrentText = useCallback((
    templateRenderData: Record<string, any>,
    currentBlock: EditorBlock,
    currentRenderData: Record<string, any>,
  ) => {
    const currentValues = getCurrentCoverTextValues(currentBlock, currentRenderData)
    const templateTexts = Array.isArray(templateRenderData.text_elements)
      ? templateRenderData.text_elements as CoverTextElement[]
      : []

    const nextTexts = templateTexts.map(text => {
      if (text.id === 'title') return { ...text, content: currentValues.title }
      if (text.id === 'subtitle') return { ...text, content: currentValues.subtitle }
      if (text.id === 'instrument') return { ...text, content: currentValues.instrument }
      return text
    }).filter(text => text.content.trim().length > 0)

    return {
      ...templateRenderData,
      titulo: currentValues.titulo,
      subtitulo: currentValues.subtitulo,
      instrumento: currentValues.instrumento,
      nivel: currentValues.nivel,
      text_elements: nextTexts,
    }
  }, [getCurrentCoverTextValues])

  const applySavedCoverTemplate = useCallback((
    template: SchoolCoverTemplate,
    mode: 'complete' | 'preserve-text' | 'variation',
  ) => {
    if (!activeCoverBlockId) return

    setBlockWithHistory(activeCoverBlockId, block => {
      const currentRenderData = cloneCoverRenderData(block.render_data)
      const templateRenderData = cloneCoverRenderData(template.render_data)
      const baseRenderData: Record<string, any> = mode === 'complete'
        ? templateRenderData
        : mergeTemplateWithCurrentText(templateRenderData, block, currentRenderData)

      if (mode === 'variation') {
        const logoEntry = availableBrandLogos.find(logo => logo.key === 'primary') ?? availableBrandLogos[0] ?? null
        const hasCoverImage = Boolean(baseRenderData.cover_image_url)
        const primaryColor = school?.primary_color || baseRenderData.brand_primary_color || '#1E3A5F'
        const secondaryColor = school?.secondary_color || baseRenderData.brand_secondary_color || '#FF2D78'

        baseRenderData.brand_primary_color = primaryColor
        baseRenderData.brand_secondary_color = secondaryColor
        baseRenderData.cover_image_url = currentRenderData.cover_image_url ?? baseRenderData.cover_image_url
        if (logoEntry) {
          baseRenderData.logo_url = logoEntry.url
          baseRenderData.logo_source = 'brand-kit'
          baseRenderData.logo_variant = logoEntry.key
          baseRenderData.logo_pos = baseRenderData.logo_pos ?? { x: 50, y: 8 }
          baseRenderData.logo_size = baseRenderData.logo_size ?? 80
        }
        if (Array.isArray(baseRenderData.text_elements)) {
          baseRenderData.text_elements = (baseRenderData.text_elements as CoverTextElement[]).map(text => ({
            ...text,
            fontFamily: text.id === 'title'
              ? school?.default_cover_font || text.fontFamily
              : school?.default_body_font || text.fontFamily,
            color: text.id === 'title'
              ? (hasCoverImage ? '#ffffff' : primaryColor)
              : (hasCoverImage ? '#ffffffcc' : secondaryColor),
          }))
        }
      }

      return {
        ...block,
        render_data: baseRenderData,
      }
    })
    queueBlockAutosave(activeCoverBlockId)
    setSelectedBlockId(activeCoverBlockId)
    setSelectedOverlayId(null)
    setEditingTextId(null)
    setCoverPropertiesTab(mode === 'complete' ? 'imagem' : 'textos')
    toast.success(
      mode === 'complete'
        ? 'Capa salva aplicada.'
        : mode === 'preserve-text'
          ? 'Capa aplicada mantendo os textos atuais.'
          : 'Variação criada a partir da capa salva.',
    )
  }, [
    activeCoverBlockId,
    availableBrandLogos,
    cloneCoverRenderData,
    mergeTemplateWithCurrentText,
    queueBlockAutosave,
    school?.default_body_font,
    school?.default_cover_font,
    school?.primary_color,
    school?.secondary_color,
    setBlockWithHistory,
  ])

  const handleDeleteCoverTemplate = useCallback(async (templateId: string) => {
    try {
      await deleteSchoolCoverTemplate(templateId)
      setCoverTemplates(prev => prev.filter(template => template.id !== templateId))
      toast.success('Capa salva removida.')
    } catch (err: any) {
      toast.error('Erro ao remover capa: ' + (err?.message?.slice(0, 80) ?? ''))
    }
  }, [])

  const applyBrandLogoToCover = useCallback((url: string, key: BrandLogoVariantKey) => {
    if (!selectedBlockId) return
    updateSelectedRenderData('logo_url', url)
    updateSelectedRenderData('logo_source', 'brand-kit')
    updateSelectedRenderData('logo_variant', key)
    if (!(selectedBlock?.render_data as any)?.logo_pos) {
      updateSelectedRenderData('logo_pos', { x: 50, y: 8 })
    }
    if (!(selectedBlock?.render_data as any)?.logo_size) {
      updateSelectedRenderData('logo_size', 80)
    }
    toast.success(`Logo ${BRAND_LOGO_VARIANT_LABELS[key]} aplicada na capa.`)
  }, [selectedBlockId, selectedBlock, updateSelectedRenderData])

  const applySchoolIdentityToCover = useCallback(() => {
    if (!activeCoverBlockId || !school) return

    const coverFont = school.default_cover_font || 'Montserrat'
    const bodyFont = school.default_body_font || 'DM Sans'
    const primaryColor = school.primary_color || '#1E3A5F'
    const secondaryColor = school.secondary_color || '#FF2D78'
    const logoEntry = availableBrandLogos.find(logo => logo.key === 'primary') ?? availableBrandLogos[0] ?? null

    setBlockWithHistory(activeCoverBlockId, block => {
      const rd = (block.render_data ?? {}) as Record<string, any>
      const hasCoverImage = Boolean(rd.cover_image_url)
      const titleColor = hasCoverImage ? '#ffffff' : primaryColor
      const bodyColor = hasCoverImage ? '#ffffffcc' : secondaryColor
      const contentPos = rd.content_pos ?? { x: 50, y: 45 }
      const existingTexts = Array.isArray(rd.text_elements) ? rd.text_elements as CoverTextElement[] : []
      const titleText = rd.titulo || block.title || materialTitle || 'Material Didático'
      const subtitleText = rd.subtitulo || ''
      const instrumentText = rd.instrumento
        ? `${rd.instrumento}${rd.nivel ? ` · ${rd.nivel}` : ''}`
        : ''

      const brandedTexts: CoverTextElement[] = existingTexts.length > 0
        ? existingTexts.map(el => {
          const isTitle = el.id === 'title'
          const isBody = el.id === 'subtitle' || el.id === 'instrument'
          return {
            ...el,
            fontFamily: isTitle ? coverFont : isBody ? bodyFont : el.fontFamily,
            color: isTitle ? titleColor : isBody ? bodyColor : el.color,
          }
        })
        : [
          ...(instrumentText ? [{
            id: 'instrument',
            content: instrumentText,
            x: contentPos.x,
            y: contentPos.y - 8,
            fontFamily: bodyFont,
            fontSize: 13,
            fontWeight: 500,
            color: bodyColor,
            align: 'center' as const,
            uppercase: true,
            letterSpacing: 3,
            lineHeight: 1.2,
            shadow: { ...DEFAULT_TEXT_SHADOW },
            outline: { ...DEFAULT_TEXT_OUTLINE },
            background: { ...DEFAULT_TEXT_BG },
            maxWidth: 60,
            zIndex: 20,
          }] : []),
          {
            id: 'title',
            content: titleText,
            x: contentPos.x,
            y: contentPos.y,
            fontFamily: coverFont,
            fontSize: rd.title_font_size ?? 36,
            fontWeight: 700,
            color: titleColor,
            align: (rd.title_align as 'left' | 'center' | 'right') ?? 'center',
            uppercase: false,
            letterSpacing: 1,
            lineHeight: 1.1,
            shadow: { enabled: true, color: '#000000', blur: 8, offsetX: 2, offsetY: 2 },
            outline: { ...DEFAULT_TEXT_OUTLINE },
            background: { ...DEFAULT_TEXT_BG },
            maxWidth: 80,
            zIndex: 21,
          },
          ...(subtitleText ? [{
            id: 'subtitle',
            content: subtitleText,
            x: contentPos.x,
            y: contentPos.y + 8,
            fontFamily: bodyFont,
            fontSize: 18,
            fontWeight: 400,
            color: bodyColor,
            align: 'center' as const,
            uppercase: false,
            letterSpacing: 1,
            lineHeight: 1.4,
            shadow: { ...DEFAULT_TEXT_SHADOW },
            outline: { ...DEFAULT_TEXT_OUTLINE },
            background: { ...DEFAULT_TEXT_BG },
            maxWidth: 60,
            zIndex: 22,
          }] : []),
        ]

      return {
        ...block,
        render_data: {
          ...rd,
          brand_primary_color: primaryColor,
          brand_secondary_color: secondaryColor,
          ...(logoEntry ? {
            logo_url: logoEntry.url,
            logo_source: 'brand-kit',
            logo_variant: logoEntry.key,
            logo_pos: rd.logo_pos ?? { x: 50, y: 8 },
            logo_size: rd.logo_size ?? 80,
          } : {}),
          title_color: titleColor,
          text_elements: brandedTexts,
        },
      }
    })
    queueBlockAutosave(activeCoverBlockId)
    setSelectedBlockId(activeCoverBlockId)
    setSelectedTextId('title')
    setSelectedOverlayId(null)
    setEditingTextId(null)
    setCoverPropertiesTab('textos')
    toast.success('Identidade da escola aplicada à capa.')
  }, [
    activeCoverBlockId,
    availableBrandLogos,
    materialTitle,
    queueBlockAutosave,
    school,
    setBlockWithHistory,
  ])

  const applySchoolIdentityToHeaderFooter = useCallback(() => {
    if (!school) {
      toast.error('Configure a identidade visual da escola antes de aplicar.')
      return
    }

    const { header, footer } = createBrandKitHeaderFooterConfig({
      school,
      logoVariant: selectedHeaderFooterLogo?.key,
    })
    setPageConfig(prev => ({
      ...prev,
      header,
      footer,
    }))
    toast.success(
      selectedHeaderFooterLogo
        ? `Identidade aplicada com a logo ${selectedHeaderFooterLogo.label}.`
        : 'Identidade aplicada no cabeçalho e rodapé.',
    )
  }, [school, selectedHeaderFooterLogo])

  const handleLogoUpload = useCallback(async (file: File) => {
    if (!selectedBlockId) return
    const maxSize = 2 * 1024 * 1024
    if (file.size > maxSize) { toast.error('Logomarca deve ter no máximo 2MB'); return }
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'].includes(file.type)) {
      toast.error('Formato inválido. Use PNG, JPG, WebP ou SVG'); return
    }
    setLogoUploading(true)
    try {
      const ext = file.name.split('.').pop() ?? 'png'
      const filePath = `logos/${materialId}/${selectedBlockId}_${Date.now()}.${ext}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('content-images')
        .upload(filePath, file, { contentType: file.type, upsert: true })
      if (uploadError) throw new Error(uploadError.message)
      const { data: urlData } = supabase.storage.from('content-images').getPublicUrl(uploadData.path)
      updateSelectedRenderData('logo_url', urlData.publicUrl)
      if (!(selectedBlock?.render_data as any)?.logo_pos) {
        updateSelectedRenderData('logo_pos', { x: 50, y: 8 })
      }
      if (!(selectedBlock?.render_data as any)?.logo_size) {
        updateSelectedRenderData('logo_size', 80)
      }
      toast.success('Logomarca enviada!')
    } catch (e: any) {
      toast.error('Erro ao enviar logomarca: ' + (e?.message?.slice(0, 60) ?? ''))
    } finally {
      setLogoUploading(false)
    }
  }, [selectedBlockId, materialId, selectedBlock, updateSelectedRenderData])

  // Upload de imagem para bloco 'image'
  const [imageUploading, setImageUploading] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = useCallback(async (file: File) => {
    if (!selectedBlockId) return
    const maxSize = 5 * 1024 * 1024 // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Formato não suportado. Use JPG, PNG ou WebP.')
      return
    }
    if (file.size > maxSize) {
      toast.error('Imagem muito grande. Máximo 5MB.')
      return
    }

    setImageUploading(true)
    try {
      const ext = file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/webp' ? 'webp' : 'png'
      const filePath = `images/${materialId}/${selectedBlockId}_${Date.now()}.${ext}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('content-images')
        .upload(filePath, file, { contentType: file.type, upsert: true })

      if (uploadError) throw new Error(`Upload falhou: ${uploadError.message}`)

      const { data: urlData } = supabase.storage
        .from('content-images')
        .getPublicUrl(uploadData.path)

      updateSelectedRenderData('url', urlData.publicUrl)
      toast.success('Imagem enviada!')
    } catch (e: any) {
      console.error('Erro ao enviar imagem:', e)
      toast.error(e?.message?.slice(0, 100) || 'Erro ao enviar imagem')
    } finally {
      setImageUploading(false)
    }
  }, [selectedBlockId, materialId, updateSelectedRenderData])

  // Handler de IA contextual para o RichTextEditor
  const handleAITextAction = useCallback(async (selectedText: string, action: AIActionType): Promise<string | null> => {
    const prompts: Record<AIActionType, { system: string; user: string }> = {
      rewrite: {
        system: 'Você é um professor de música reescrevendo material didático. Mantenha o mesmo significado mas melhore a clareza e fluidez. Responda APENAS com o texto reescrito, sem explicações.',
        user: `Reescreva este trecho de material didático musical:\n\n"${selectedText}"`,
      },
      simplify: {
        system: 'Você é um professor de música simplificando material para alunos iniciantes. Use linguagem simples e direta. Responda APENAS com o texto simplificado, sem explicações.',
        user: `Simplifique este trecho para um aluno iniciante:\n\n"${selectedText}"`,
      },
      expand: {
        system: 'Você é um professor de música expandindo material didático. Adicione exemplos, analogias e explicações mais detalhadas. Responda APENAS com o texto expandido, sem explicações.',
        user: `Expanda este trecho com mais detalhes e exemplos:\n\n"${selectedText}"`,
      },
      correct: {
        system: 'Você é um revisor de português brasileiro. Corrija erros de ortografia, gramática e pontuação. Mantenha o conteúdo idêntico. Responda APENAS com o texto corrigido, sem explicações.',
        user: `Corrija a ortografia e gramática deste texto:\n\n"${selectedText}"`,
      },
      translate: {
        system: 'Você é um tradutor especializado em música. Se o texto está em português, traduza para inglês. Se está em inglês, traduza para português brasileiro. Responda APENAS com a tradução, sem explicações.',
        user: `Traduza este texto:\n\n"${selectedText}"`,
      },
    }

    const { system, user } = prompts[action]
    try {
      const result = await generateText(user, undefined, system)
      toast.success(`IA: ${action === 'rewrite' ? 'Reescrito' : action === 'simplify' ? 'Simplificado' : action === 'expand' ? 'Expandido' : action === 'correct' ? 'Corrigido' : 'Traduzido'} (${(result.latencyMs / 1000).toFixed(1)}s)`)
      return result.text.trim()
    } catch (e: any) {
      toast.error('Erro da IA: ' + (e?.message?.slice(0, 80) ?? ''))
      return null
    }
  }, [])

  // Geração de bloco por IA
  const [aiBlockDialogOpen, setAiBlockDialogOpen] = useState(false)
  const [aiBlockPrompt, setAiBlockPrompt] = useState('')
  const [aiBlockLoading, setAiBlockLoading] = useState(false)

  const handleGenerateAIBlock = useCallback(async () => {
    if (!aiBlockPrompt.trim()) return
    setAiBlockLoading(true)
    try {
      const systemPrompt = `Você é um professor de música criando blocos de material didático para a plataforma LA Journey.
Retorne APENAS um objeto JSON válido (não array) com esta estrutura:
{
  "block_type": "text" | "tip" | "exercise",
  "title": "título do bloco",
  "content": { "text": "conteúdo em HTML com <strong> para termos técnicos, <p> para parágrafos" }
}

Para exercícios: inclua instruções passo-a-passo detalhadas.
Para dicas: seja conciso e prático.
Para texto: use linguagem didática e acessível, 2-3 parágrafos.
Use APENAS HTML básico: <p>, <strong>, <em>, <br>, <ul>, <li>, <ol>.`

      const prompt = `Gere um bloco de material didático musical baseado nesta descrição:
"${aiBlockPrompt}"

Contexto do material: "${materialTitle}"

Retorne APENAS o JSON do bloco, sem markdown ou explicações.`

      const result = await generateText(prompt, undefined, systemPrompt)
      let jsonStr = result.text.trim()
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
      }

      const blockData = JSON.parse(jsonStr)
      const blockType = ['text', 'tip', 'exercise'].includes(blockData.block_type) ? blockData.block_type : 'text'

      const lastOrder = blocks.length > 0 ? Math.max(...blocks.map(b => b.sort_order)) : 0
      const contentHtml = blockData.content?.text ?? ''
      const contentPlain = contentHtml.replace(/<[^>]+>/g, '')
      const newBlockId = await addMaterialBlock({
        materialId,
        blockType,
        title: blockData.title ?? 'Bloco gerado',
        content: { html: contentHtml, text: contentPlain },
        renderData: blockData.render_data ?? null,
        afterOrder: lastOrder,
      })

      setBlocksWithHistory(prev => [...prev, {
        id: newBlockId,
        block_type: blockType,
        title: blockData.title ?? 'Bloco gerado',
        content: { html: blockData.content?.text ?? '', text: blockData.content?.text?.replace(/<[^>]+>/g, '') ?? '' },
        render_data: blockData.render_data ?? null,
        sort_order: lastOrder + 1,
        is_edited: false,
        original_content: null,
      }])

      toast.success(`Bloco "${blockData.title}" gerado em ${(result.latencyMs / 1000).toFixed(1)}s`)
      setAiBlockDialogOpen(false)
      setAiBlockPrompt('')
    } catch (e: any) {
      console.error('Erro ao gerar bloco:', e)
      toast.error('Erro ao gerar bloco: ' + (e?.message?.slice(0, 80) ?? ''))
    } finally {
      setAiBlockLoading(false)
    }
  }, [aiBlockPrompt, blocks, materialId, materialTitle])

  // Sugestão automática de próximo bloco
  const [aiSuggestion, setAiSuggestion] = useState<{ block_type: string; title: string; content: { text: string } } | null>(null)
  const [aiSuggestLoading, setAiSuggestLoading] = useState(false)

  const handleSuggestNextBlock = useCallback(async () => {
    if (blocks.length === 0) return
    setAiSuggestLoading(true)
    setAiSuggestion(null)
    try {
      const ctx = blocks.slice(-3).map(b => `[${b.block_type}] ${b.title}: ${((b.content as any)?.text ?? '').slice(0, 150)}`).join('\n')
      const sys = 'Você é professor de música. Sugira o próximo bloco pedagógico. Retorne APENAS JSON: {"block_type":"text"|"tip"|"exercise","title":"...","content":{"text":"HTML"}}'
      const result = await generateText(`Material: "${materialTitle}"\nÚltimos blocos:\n${ctx}\n\nSugira o próximo bloco.`, undefined, sys)
      let json = result.text.trim()
      if (json.startsWith('```')) json = json.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
      setAiSuggestion(JSON.parse(json))
      toast.success(`Sugestão gerada em ${(result.latencyMs / 1000).toFixed(1)}s`)
    } catch (e: any) {
      toast.error('Erro ao sugerir: ' + (e?.message?.slice(0, 60) ?? ''))
    } finally {
      setAiSuggestLoading(false)
    }
  }, [blocks, materialTitle])

  const handleAcceptSuggestion = useCallback(async () => {
    if (!aiSuggestion) return
    const lastOrder = blocks.length > 0 ? Math.max(...blocks.map(b => b.sort_order)) : 0
    const html = aiSuggestion.content?.text ?? ''
    const plain = html.replace(/<[^>]+>/g, '')
    try {
      const id = await addMaterialBlock({ materialId, blockType: aiSuggestion.block_type, title: aiSuggestion.title, content: { html, text: plain }, afterOrder: lastOrder })
      setBlocksWithHistory(prev => [...prev, { id, block_type: aiSuggestion.block_type, title: aiSuggestion.title, content: { html, text: plain }, render_data: null, sort_order: lastOrder + 1, is_edited: false, original_content: null }])
      toast.success(`Bloco "${aiSuggestion.title}" aceito!`)
      setAiSuggestion(null)
    } catch (e: any) {
      toast.error('Erro ao salvar sugestão')
    }
  }, [aiSuggestion, blocks, materialId])

  // ── Fase 6: IA Avançada — States ──────────────────────────────────

  // 6.1 — Reescrever bloco
  const [isAIProcessing, setIsAIProcessing] = useState(false)
  const [aiCustomInstruction, setAiCustomInstruction] = useState('')

  // 6.2 — Variações
  const [showVariationsDialog, setShowVariationsDialog] = useState(false)
  const [variations, setVariations] = useState<string[]>([])
  const [isGeneratingVariations, setIsGeneratingVariations] = useState(false)

  // 6.3 — Traduzir
  const [translateTarget, setTranslateTarget] = useState('en')
  const [isTranslating, setIsTranslating] = useState(false)
  const [translateProgress, setTranslateProgress] = useState('')

  // 6.4 — Ortografia
  const [isSpellChecking, setIsSpellChecking] = useState(false)
  const [spellCheckProgress, setSpellCheckProgress] = useState('')

  // ── Fase 7: Polimento — States ──────────────────────────────────

  // 7.1 — Régua visual
  const [showRulers, setShowRulers] = useState(() => {
    try { return localStorage.getItem('editor-show-rulers') === 'true' } catch { return false }
  })
  const [propertiesSectionOpen, setPropertiesSectionOpenState] = useState<Record<string, boolean>>({})

  const getPropertiesSectionKey = useCallback((blockType: string, sectionId: string) => {
    return `la-journey:properties-sidebar:${blockType}:${sectionId}`
  }, [])

  const isPropertiesSectionOpen = useCallback((blockType: string, sectionId: string, defaultOpen: boolean) => {
    const key = getPropertiesSectionKey(blockType, sectionId)
    if (Object.prototype.hasOwnProperty.call(propertiesSectionOpen, key)) return propertiesSectionOpen[key]
    try {
      const saved = localStorage.getItem(key)
      if (saved !== null) return saved === 'true'
    } catch {
      // localStorage can be unavailable in restricted contexts.
    }
    return defaultOpen
  }, [getPropertiesSectionKey, propertiesSectionOpen])

  const setPropertiesSectionOpen = useCallback((blockType: string, sectionId: string, open: boolean) => {
    const key = getPropertiesSectionKey(blockType, sectionId)
    setPropertiesSectionOpenState(prev => ({ ...prev, [key]: open }))
    try { localStorage.setItem(key, String(open)) } catch {}
  }, [getPropertiesSectionKey])

  // 7.3 — Templates
  const [showTemplatesDialog, setShowTemplatesDialog] = useState(false)

  // 7.4 — Histórico de versões
  const [showVersionsDialog, setShowVersionsDialog] = useState(false)

  // ── Fase 6: IA Avançada — Handlers ────────────────────────────────

  type AIRewriteAction = 'rewrite' | 'simplify' | 'expand' | 'formal' | 'custom'

  const AI_REWRITE_PROMPTS: Record<Exclude<AIRewriteAction, 'custom'>, string> = {
    rewrite: 'Reescreva este conteúdo de material didático musical mantendo o mesmo significado mas com palavras e estrutura diferentes. Mantenha o tom educativo e acessível.',
    simplify: 'Simplifique este conteúdo para que seja mais fácil de entender por iniciantes em música. Use vocabulário simples, frases curtas e exemplos práticos.',
    expand: 'Expanda este conteúdo adicionando mais detalhes, exemplos práticos, curiosidades musicais e dicas pedagógicas. Mantenha o tom educativo.',
    formal: 'Reescreva este conteúdo em um tom mais formal e acadêmico, adequado para um material didático profissional de escola de música.',
  }

  // 6.1 — Reescrever bloco inteiro
  const handleAIRewrite = useCallback(async (action: AIRewriteAction, customInstruction?: string) => {
    if (!selectedBlock) return
    setIsAIProcessing(true)
    pushSnapshot(blocksRef.current)

    try {
      const currentContent = (selectedBlock.content as any)?.html
        ?? (selectedBlock.content as any)?.text
        ?? selectedBlock.title ?? ''

      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = currentContent
      const plainText = tempDiv.textContent || ''

      const systemPrompt = `Você é um assistente especializado em criar material didático para escolas de música.
Plataforma LA Journey, metodologia "Ancoragem de Fundamentos".
Material: ${materialTitle || 'Material didático musical'}
Tipo de bloco: ${selectedBlock.block_type}
${selectedBlock.block_type === 'tip' ? 'Este é um bloco de DICA (informação complementar, destaque).' : ''}
${selectedBlock.block_type === 'exercise' ? 'Este é um bloco de EXERCÍCIO (atividade prática para o aluno).' : ''}

Regras:
- Responda APENAS com o conteúdo reescrito em HTML simples (use <p>, <strong>, <em>, <ul>, <li>, <h3>)
- NÃO inclua explicações, comentários ou markdown
- Mantenha o mesmo idioma (português brasileiro)
- Mantenha a formatação HTML compatível com TipTap editor`

      const userPrompt = action === 'custom'
        ? `${customInstruction}\n\nConteúdo original:\n${plainText}`
        : `${AI_REWRITE_PROMPTS[action]}\n\nConteúdo original:\n${plainText}`

      const result = await generateText(userPrompt, undefined, systemPrompt)
      let newContent = result.text.trim()
      newContent = newContent.replace(/^```html?\n?/i, '').replace(/\n?```$/i, '').trim()

      setBlocks(prev => prev.map(b => {
        if (b.id !== selectedBlock.id) return b
        return { ...b, content: { ...(b.content ?? {}), html: newContent, text: newContent.replace(/<[^>]+>/g, '') } }
      }))
      queueBlockAutosave(selectedBlock.id)

      const actionLabels: Record<AIRewriteAction, string> = {
        rewrite: 'Conteúdo reescrito', simplify: 'Conteúdo simplificado',
        expand: 'Conteúdo expandido', formal: 'Conteúdo formalizado', custom: 'Instrução aplicada',
      }
      toast.success(`IA: ${actionLabels[action]} (${(result.latencyMs / 1000).toFixed(1)}s)`)
    } catch (err) {
      console.error('AI rewrite failed:', err)
      toast.error('Falha ao processar com IA')
    } finally {
      setIsAIProcessing(false)
    }
  }, [selectedBlock, materialTitle, pushSnapshot, queueBlockAutosave])

  // 6.2 — Gerar variações
  const handleGenerateVariations = useCallback(async () => {
    if (!selectedBlock) return
    setIsGeneratingVariations(true)
    setVariations([])

    try {
      const currentContent = (selectedBlock.content as any)?.html
        ?? (selectedBlock.content as any)?.text
        ?? selectedBlock.title ?? ''

      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = currentContent
      const plainText = tempDiv.textContent || ''

      const systemPrompt = `Você é um assistente especializado em criar material didático para escolas de música.
Plataforma LA Journey, metodologia "Ancoragem de Fundamentos".
Material: ${materialTitle || 'Material didático musical'}
Tipo de bloco: ${selectedBlock.block_type}

Gere EXATAMENTE 3 variações diferentes do conteúdo abaixo.
Cada variação deve:
- Manter o mesmo tema e informações essenciais
- Ter abordagem, tom ou estrutura diferente
- Usar HTML simples (<p>, <strong>, <em>, <ul>, <li>, <h3>)
- Ser em português brasileiro

Responda no formato JSON EXATO (sem markdown, sem backticks):
["<p>Variação 1...</p>","<p>Variação 2...</p>","<p>Variação 3...</p>"]`

      const result = await generateText(`Conteúdo original:\n${plainText}`, undefined, systemPrompt)
      let raw = result.text.trim()
      raw = raw.replace(/^```json?\n?/i, '').replace(/\n?```$/i, '').trim()

      const parsed = JSON.parse(raw) as string[]
      setVariations(parsed.slice(0, 3))
    } catch (err) {
      console.error('Generate variations failed:', err)
      toast.error('Falha ao gerar variações')
    } finally {
      setIsGeneratingVariations(false)
    }
  }, [selectedBlock, materialTitle])

  const handleApplyVariation = useCallback((variationIndex: number) => {
    if (!selectedBlock || !variations[variationIndex]) return
    pushSnapshot(blocksRef.current)
    const newContent = variations[variationIndex]
    setBlocks(prev => prev.map(b => {
      if (b.id !== selectedBlock.id) return b
      return { ...b, content: { ...(b.content ?? {}), html: newContent, text: newContent.replace(/<[^>]+>/g, '') } }
    }))
    queueBlockAutosave(selectedBlock.id)
    setShowVariationsDialog(false)
    toast.success('Variação aplicada')
  }, [selectedBlock, variations, pushSnapshot, queueBlockAutosave])

  // 6.3 — Traduzir material inteiro
  const handleTranslateAll = useCallback(async () => {
    const textBlocks = blocks.filter(b =>
      ['text', 'tip', 'exercise', 'title'].includes(b.block_type)
    )
    if (textBlocks.length === 0) {
      toast.info('Nenhum bloco de texto para traduzir')
      return
    }

    setIsTranslating(true)
    pushSnapshot(blocksRef.current)

    const langMap: Record<string, string> = { en: 'inglês', pt: 'português brasileiro', es: 'espanhol' }
    const targetLang = langMap[translateTarget] || 'inglês'

    try {
      for (let i = 0; i < textBlocks.length; i++) {
        const block = textBlocks[i]
        setTranslateProgress(`${i + 1}/${textBlocks.length}`)

        const currentContent = (block.content as any)?.html
          ?? (block.content as any)?.text ?? ''
        if (!currentContent.trim()) continue

        const sys = `Você é um tradutor profissional especializado em material didático musical.
Traduza o conteúdo HTML abaixo para ${targetLang}.
Regras:
- Mantenha TODA a formatação HTML (<p>, <strong>, <em>, <ul>, <li>, <h3>, etc.)
- Traduza APENAS o texto, não altere tags HTML
- Mantenha termos musicais técnicos quando apropriado (ex: "staccato" permanece)
- Responda APENAS com o HTML traduzido, sem explicações`

        try {
          const result = await generateText(currentContent, undefined, sys)
          let translated = result.text.trim()
          translated = translated.replace(/^```html?\n?/i, '').replace(/\n?```$/i, '').trim()

          if (translated) {
            setBlocks(prev => prev.map(b => {
              if (b.id !== block.id) return b
              return { ...b, content: { ...(b.content ?? {}), html: translated, text: translated.replace(/<[^>]+>/g, '') } }
            }))
          }
        } catch { /* pula bloco com erro */ }

        if (i < textBlocks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300))
        }
      }

      toast.success(`Tradução concluída: ${textBlocks.length} blocos traduzidos`)
    } catch (err) {
      console.error('Translation failed:', err)
      toast.error('Erro na tradução')
    } finally {
      setIsTranslating(false)
      setTranslateProgress('')
    }
  }, [blocks, translateTarget, pushSnapshot])

  // 6.4 — Corrigir ortografia do material inteiro
  const handleSpellCheckAll = useCallback(async () => {
    const textBlocks = blocks.filter(b =>
      ['text', 'tip', 'exercise', 'title'].includes(b.block_type)
    )
    if (textBlocks.length === 0) {
      toast.info('Nenhum bloco de texto para revisar')
      return
    }

    setIsSpellChecking(true)
    pushSnapshot(blocksRef.current)
    let correctionsCount = 0

    try {
      for (let i = 0; i < textBlocks.length; i++) {
        const block = textBlocks[i]
        setSpellCheckProgress(`${i + 1}/${textBlocks.length}`)

        const currentContent = (block.content as any)?.html
          ?? (block.content as any)?.text ?? ''
        if (!currentContent.trim()) continue

        const sys = `Você é um revisor de português brasileiro especializado em material didático musical.
Corrija APENAS erros de: ortografia, gramática, concordância verbal e nominal, acentuação, pontuação.
Regras:
- Mantenha TODA a formatação HTML intacta
- NÃO altere o estilo, tom ou significado do texto
- NÃO reescreva frases que estão corretas
- Se o texto não tem erros, retorne-o exatamente como está
- Responda APENAS com o HTML corrigido, sem explicações
- Mantenha termos musicais técnicos como estão`

        try {
          const result = await generateText(currentContent, undefined, sys)
          let corrected = result.text.trim()
          corrected = corrected.replace(/^```html?\n?/i, '').replace(/\n?```$/i, '').trim()

          if (corrected && corrected !== currentContent) {
            setBlocks(prev => prev.map(b => {
              if (b.id !== block.id) return b
              return { ...b, content: { ...(b.content ?? {}), html: corrected, text: corrected.replace(/<[^>]+>/g, '') } }
            }))
            correctionsCount++
          }
        } catch { /* pula bloco com erro */ }

        if (i < textBlocks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300))
        }
      }

      toast.success(
        correctionsCount > 0
          ? `Revisão concluída: ${correctionsCount} bloco(s) corrigido(s). Ctrl+Z para desfazer.`
          : 'Revisão concluída: nenhuma correção necessária!'
      )
    } catch (err) {
      console.error('Spell check failed:', err)
      toast.error('Erro na revisão ortográfica')
    } finally {
      setIsSpellChecking(false)
      setSpellCheckProgress('')
    }
  }, [blocks, pushSnapshot])

  // ── Fase 7: Polimento — Handlers ──────────────────────────────────

  // 7.2 — scrollToPage + IntersectionObserver
  const scrollToPage = useCallback((pageIndex: number) => {
    const pages = document.querySelectorAll('.a4-page')
    const page = pages[pageIndex]
    page?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  useEffect(() => {
    const canvas = canvasScrollRef.current
    if (!canvas) return

    const observer = new IntersectionObserver(
      (entries) => {
        let maxRatio = -1
        let maxIndex = 0
        entries.forEach((entry) => {
          const idx = Number((entry.target as HTMLElement).dataset.pageIndex || 0)
          if (entry.intersectionRatio > maxRatio) {
            maxRatio = entry.intersectionRatio
            maxIndex = idx
          }
        })
        if (maxRatio > 0) setCurrentVisiblePage(maxIndex)
      },
      { root: canvas, rootMargin: '0px', threshold: [0, 0.01, 0.25, 0.5, 0.75, 1] },
    )

    const timer = setTimeout(() => {
      const pageEls = canvas.querySelectorAll('.a4-page')
      pageEls.forEach((page, i) => {
        ;(page as HTMLElement).dataset.pageIndex = String(i)
        observer.observe(page)
      })
    }, 500)

    return () => {
      clearTimeout(timer)
      observer.disconnect()
    }
  }, [pages.length])

  // 7.3 — Aplicar template
  const handleApplyTemplate = useCallback(async (template: MaterialTemplate) => {
    pushSnapshot(blocksRef.current)

    toast.info(`Aplicando template "${template.name}"...`)

    try {
      // Deletar blocos atuais
      for (const block of blocks) {
        try { await deleteMaterialBlock(block.id) } catch { /* ignora blocos temp */ }
      }

      // Criar blocos do template
      const newBlocks: EditorBlock[] = []
      for (let i = 0; i < template.blocks.length; i++) {
        const tmpl = template.blocks[i]
        const content = tmpl.content ? { html: tmpl.content, text: tmpl.content.replace(/<[^>]+>/g, '') } : {}
        try {
          const id = await addMaterialBlock({
            materialId,
            blockType: tmpl.block_type,
            title: tmpl.title,
            content: Object.keys(content).length > 0 ? content : null,
            renderData: tmpl.render_data || null,
            afterOrder: i > 0 ? i - 1 : null,
          })
          newBlocks.push({
            id,
            block_type: tmpl.block_type,
            title: tmpl.title,
            content: Object.keys(content).length > 0 ? content : null,
            render_data: tmpl.render_data || null,
            sort_order: i,
            is_edited: false,
            original_content: null,
          })
        } catch (err) {
          console.error(`Erro ao criar bloco ${tmpl.title}:`, err)
        }
      }

      setBlocks(newBlocks)
      if (newBlocks.length > 0) setSelectedBlockId(newBlocks[0].id)
      toast.success(`Template "${template.name}" aplicado com ${newBlocks.length} blocos`)
    } catch (err) {
      console.error('Apply template failed:', err)
      toast.error('Erro ao aplicar template')
    }
  }, [blocks, materialId, pushSnapshot])

  // 7.4 — Restaurar versão
  const handleRestoreVersion = useCallback(async (snapshot: { blocks: any[]; page_config: any }) => {
    const schoolId = school?.id || 'a1b2c3d4-0001-4000-8000-000000000001'

    // Salvar estado atual como versão antes de restaurar
    try {
      await saveVersion(materialId, schoolId, blocks, pageConfig, 'Antes de restaurar')
    } catch { /* não bloquear */ }

    pushSnapshot(blocksRef.current)

    // Aplicar snapshot
    setBlocks(snapshot.blocks)
    if (snapshot.page_config) {
      setPageConfig(snapshot.page_config)
      try {
        await updateMaterial(materialId, { page_config: snapshot.page_config } as any)
      } catch { /* silencioso */ }
    }

    // Salvar blocos restaurados no banco
    for (const block of snapshot.blocks) {
      try {
        await updateMaterialBlockRpc({
          blockId: block.id,
          title: block.title,
          content: block.content,
          renderData: block.render_data,
        })
      } catch { /* ignora se bloco não existe mais */ }
    }
  }, [blocks, pageConfig, materialId, school, pushSnapshot])

  // Salvar título do material
  const handleSaveTitle = useCallback(async () => {
    setEditingTitle(false)
    if (!materialTitle.trim()) return
    try {
      await updateMaterial(materialId, { title: materialTitle.trim() })
      toast.success('Título atualizado')
    } catch (e: any) {
      toast.error('Erro ao atualizar título')
    }
  }, [materialId, materialTitle])

  // ── Editores visuais integrados ──────────────────────────────────────

  // Helper: converter render_data.notation.staves[].notes (formato VexFlow) → notation_data.beats
  // Preserva separação entre staves com barAfter + salva stave_boundaries para reconstrução
  const vexNotesToBeats = useCallback((staves: any[]): any => {
    if (!staves || staves.length === 0) return null
    const beats: any[] = []
    const staveBoundaries: number[] = [] // índices onde cada stave termina
    for (let s = 0; s < staves.length; s++) {
      const stave = staves[s]
      const notes = (stave.notes ?? []) as string[]
      const accs = (stave.accidentals ?? []) as (string | null)[]
      for (let i = 0; i < notes.length; i++) {
        const isLastNoteOfStave = i === notes.length - 1
        const isLastStave = s === staves.length - 1
        beats.push({
          notes: [notes[i]],
          accidentals: [accs[i] ?? null],
          // Colocar barra de compasso entre staves para separação visual
          ...(isLastNoteOfStave && !isLastStave ? { barAfter: true } : {}),
        })
      }
      staveBoundaries.push(beats.length)
    }
    if (beats.length === 0) return null
    return { beats, _stave_boundaries: staveBoundaries }
  }, [])

  const v2BeatToLegacyNote = useCallback((beat: any) => {
    const durationToken = `${beat.duration ?? 'q'}${beat.doubleDotted ? 'dd' : beat.dotted ? 'd' : ''}${beat.isRest ? 'r' : ''}`

    if (beat.isRest || !Array.isArray(beat.pitches) || beat.pitches.length === 0) {
      return { note: `b/4:${durationToken}`, accidental: null }
    }

    const firstPitch = beat.pitches[0]
    const pitchText = String(firstPitch?.pitch ?? '')
    const [notePart = 'B', octave = '4'] = pitchText.split('/')
    const normalizedBase = notePart.replace(/[#bn]/gi, '').toLowerCase()
    const accidental = firstPitch?.accidental ?? null
    const inlineAccidental = accidental && accidental !== 'n' ? accidental : ''

    return {
      note: `${normalizedBase}${inlineAccidental}/${octave}:${durationToken}`,
      accidental,
    }
  }, [])

  const alphaTexToNotationData = useCallback((alphaTex: string, fallback?: { clef?: string | null; keySignature?: string | null; timeSignature?: string | null }) => {
    if (!alphaTex?.trim()) return null

    const normalized = alphaTex
      .trim()
      .replace(/:w\b/g, ':1')
      .replace(/:h\b/g, ':2')
      .replace(/:q\b/g, ':4')
      .replace(/\{t\}/g, '{-}')
      .replace(/:2d\s+/g, ':2 ')

    const clefMatch = normalized.match(/\\clef\s+(treble|bass|alto|percussion)/i)
    const keySignatureMatch = normalized.match(/\\ks\s+([A-G][b#]?)/)
    const timeSignatureMatch = normalized.match(/\\ts\s+(\d+)\s+(\d+)/)
    const bpmMatch = normalized.match(/\\tempo\s+(\d+)/)

    const body = normalized
      .replace(/\\title\s+"[^"]*"/g, ' ')
      .replace(/\\tempo\s+\d+/g, ' ')
      .replace(/\\clef\s+(treble|bass|alto|percussion)/gi, ' ')
      .replace(/\\ks\s+[A-G][b#]?/g, ' ')
      .replace(/\\ts\s+\d+\s+\d+/g, ' ')
      .replace(/\./g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    const noteToPitch = (value: string) => {
      const match = value.trim().match(/^([a-gA-G])([#bn]?)(\d)$/)

      if (!match) return null
      const note = match[1].toUpperCase()
      const accidental = match[2] || ''
      const octave = match[3]
      return {
        pitch: `${note}${accidental}/${octave}`,
        accidental: accidental || undefined,
      }
    }

    const beats: any[] = []
    const measures = body.split('|').map((measure) => measure.trim()).filter(Boolean)
    let currentDuration = '4'

    for (let measureIndex = 0; measureIndex < measures.length; measureIndex++) {
      const measure = measures[measureIndex]
      const entries = measure.match(/(?::(?:1|2|4|8|16|32|64)\s+)?(?:\([^)]+\)|r|[a-gA-G][#bn]?\d)(?:\{[^}]+\})?/g) ?? []

      for (let tokenIndex = 0; tokenIndex < entries.length; tokenIndex++) {
        const entry = entries[tokenIndex].trim()
        const fullMatch = entry.match(/^(?::(1|2|4|8|16|32|64)\s+)?(\([^)]+\)|r|[a-gA-G][#bn]?\d)(\{[^}]+\})?$/)
        if (!fullMatch) continue

        const [, explicitDuration, noteToken, modifierToken] = fullMatch
        const duration = explicitDuration ?? currentDuration
        currentDuration = duration

        const isRest = noteToken === 'r'
        const chordTokens = noteToken.startsWith('(')
          ? noteToken.slice(1, -1).trim().split(/\s+/).map(noteToPitch).filter(Boolean)
          : isRest
            ? []
            : [noteToPitch(noteToken)].filter(Boolean)

        const modifiers = modifierToken ?? ''

        beats.push({
          pitches: chordTokens,
          duration,
          isRest,
          dotted: modifiers.includes('{d}') && !modifiers.includes('{dd}'),
          doubleDotted: modifiers.includes('{dd}'),
          tieToNext: modifiers.includes('{-}'),
          ...(tokenIndex === entries.length - 1 && measureIndex < measures.length - 1 ? { barAfter: true } : {}),
        })
      }
    }

    if (beats.length === 0) return null

    return {
      beats,
      clef: clefMatch?.[1] ?? fallback?.clef ?? 'treble',
      keySignature: keySignatureMatch?.[1] ?? fallback?.keySignature ?? 'C',
      timeSignature: timeSignatureMatch ? `${timeSignatureMatch[1]}/${timeSignatureMatch[2]}` : (fallback?.timeSignature ?? 'free'),
      bpm: bpmMatch ? Number(bpmMatch[1]) : 120,
    }
  }, [])

  // Helper: converter render_data de um bloco para um NotationLibraryRow fake para o NotationEditor
  const blockToNotationRow = useCallback((block: EditorBlock) => {
    const rd = (block.render_data ?? {}) as any
    const legacyStaves = Array.isArray(rd.notation?.staves) ? rd.notation.staves : []
    const targetedLegacyStave = notationEditorStaveIndex !== null ? legacyStaves[notationEditorStaveIndex] : legacyStaves[0]
    // Primeiro tenta notation_data salvo (com beats completos do editor)
    // Se não existir, converte notas VexFlow → beats
    const nd = legacyStaves.length > 1
      ? vexNotesToBeats(targetedLegacyStave ? [targetedLegacyStave] : [])
      : (block.content as any)?.notation_data
        ?? rd.notation_data
        ?? vexNotesToBeats(rd.notation?.staves)
        ?? (typeof rd.alphaTex === 'string'
          ? alphaTexToNotationData(rd.alphaTex, {
              clef: rd.clef ?? targetedLegacyStave?.clef ?? null,
              keySignature: rd.key_signature ?? targetedLegacyStave?.key_signature ?? null,
              timeSignature: rd.time_signature ?? targetedLegacyStave?.time_signature ?? null,
            })
          : null)
        ?? null
    return {
      id: block.id,
      name: block.title ?? '',
      category: 'exercicio',
      clef: (targetedLegacyStave?.clef ?? rd.notation?.staves?.[0]?.clef ?? rd.clef ?? 'treble') as string,
      key_signature: (targetedLegacyStave?.key_signature ?? rd.notation?.staves?.[0]?.key_signature ?? rd.key_signature ?? 'C') as string,
      time_signature: (targetedLegacyStave?.time_signature ?? rd.notation?.staves?.[0]?.time_signature ?? rd.time_signature ?? null) as string | null,
      notation_data: nd,
      difficulty: 1,
      tags: [],
      description: null,
    }
  }, [notationEditorStaveIndex, vexNotesToBeats, alphaTexToNotationData])

  // Abrir editor de notação para um bloco
  const openNotationEditorForBlock = useCallback((blockId: string) => {
    setNotationEditorBlockId(blockId)
    const block = blocks.find((b) => b.id === blockId)
    const staves = ((block?.render_data ?? {}) as any)?.notation?.staves
    const pointedStave = notationPreviewStaveRef.current?.blockId === blockId
      ? notationPreviewStaveRef.current.staveIndex
      : null
    setNotationEditorStaveIndex(
      Array.isArray(staves) && staves.length > 1
        ? (pointedStave ?? 0)
        : null,
    )
    notationPreviewStaveRef.current = null
    setNotationEditorOpen(true)
  }, [blocks])

  // Salvar notação de volta no bloco
  const handleNotationEditorSave = useCallback(async (data: NotationEditorMaterialSaveData) => {
    if (!notationEditorBlockId) return
    const block = blocks.find(b => b.id === notationEditorBlockId)
    if (!block) return

    const rd = (block.render_data ?? {}) as any
    const originalStaves = rd.notation?.staves ?? []
    const beats = data.notation_data?.beats ?? []

    // Reconstruir múltiplos staves usando barAfter como separador
    // Cada grupo de beats entre barras vira um stave separado
    const staveGroups: any[][] = []
    let currentGroup: any[] = []
    for (const b of beats) {
      currentGroup.push(b)
      if (b.barAfter) {
        staveGroups.push(currentGroup)
        currentGroup = []
      }
    }
    if (currentGroup.length > 0) staveGroups.push(currentGroup)

    // Construir staves preservando labels originais
    const clefVal = data.clef as 'treble' | 'bass' | 'alto' | 'percussion'
    const keySigVal = data.clef === 'percussion' ? undefined : (data.key_signature !== 'C' ? data.key_signature : undefined)
    const timeSigVal = data.time_signature ?? undefined

    const newStaves = staveGroups.map((group, idx) => {
      const notes: string[] = []
      const accidentals: (string | null)[] = []
      for (const b of group) {
        const legacyNote = v2BeatToLegacyNote(b)
        notes.push(legacyNote.note)
        accidentals.push(legacyNote.accidental)
      }
      return {
        clef: clefVal,
        key_signature: keySigVal,
        time_signature: timeSigVal,
        notes,
        accidentals,
        label: originalStaves[idx]?.label ?? '',
      }
    })

    const updatedStaves = notationEditorStaveIndex !== null && originalStaves.length > 1
      ? originalStaves.map((stave: any, idx: number) => idx === notationEditorStaveIndex
        ? {
          ...stave,
          ...newStaves[0],
          label: stave?.label ?? '',
        }
        : stave)
      : newStaves

    const staveNotation = {
      type: 'staff' as const,
      staves: updatedStaves,
      width: rd.notation?.width ?? 500,
      height: updatedStaves.length > 1 ? 140 * updatedStaves.length : 150,
    }

    const newRenderData = {
      ...(block.render_data ?? {}),
      notation: staveNotation,
      notation_data: notationEditorStaveIndex !== null && originalStaves.length > 1 ? undefined : data.notation_data,
      clef: data.clef,
      key_signature: data.key_signature,
      time_signature: data.time_signature,
    }

    // Atualizar localmente
    setBlocksWithHistory(prev => prev.map(b =>
      b.id === notationEditorBlockId ? { ...b, title: data.name || b.title, render_data: newRenderData } : b,
    ))

    // Persistir no banco
    try {
      await updateMaterialBlockRpc({
        blockId: notationEditorBlockId,
        title: data.name || block.title,
        renderData: newRenderData,
      })
      toast.success('Notação atualizada no bloco')
    } catch (e: any) {
      toast.error('Erro ao salvar notação: ' + (e?.message ?? ''))
    }
  }, [notationEditorBlockId, notationEditorStaveIndex, blocks, v2BeatToLegacyNote])

  const openTablatureEditorForBlock = useCallback((blockId: string) => {
    setTablatureEditorBlockId(blockId)
    setTablatureEditorOpen(true)
  }, [])

  const handleTablatureEditorSave = useCallback(async (lines: string[], label: string, data: TablatureData) => {
    if (!tablatureEditorBlockId) return
    const block = blocks.find(b => b.id === tablatureEditorBlockId)
    if (!block) return

    const instrument = data.instrument && TAB_INSTRUMENTS[data.instrument] ? data.instrument : 'guitar'
    const normalizedData: TablatureData = {
      ...data,
      instrument,
      label,
    }
    const alphaTex = gridToAlphaTex(
      normalizedData.grid,
      normalizedData.columns,
      normalizedData.durations,
      TAB_INSTRUMENTS[instrument],
      label || undefined,
      normalizedData.timeSignature ?? 'free',
      new Set(normalizedData.ties ?? []),
      normalizedData.dots ?? [],
      normalizedData.pickings ?? [],
      normalizedData.tuplets ?? [],
      normalizedData.chordNames ?? [],
    )
    const newRenderData = {
      ...(block.render_data ?? {}),
      notation_data: normalizedData,
      lines,
      tab: lines.join('\n'),
      alphaTex,
      instrument,
    }
    const newTitle = label || block.title || 'Tablatura'

    setBlocksWithHistory(prev => prev.map(b =>
      b.id === tablatureEditorBlockId ? { ...b, title: newTitle, render_data: newRenderData } : b,
    ))

    try {
      await updateMaterialBlockRpc({
        blockId: tablatureEditorBlockId,
        title: newTitle,
        renderData: newRenderData,
      })
      toast.success('Tablatura atualizada no bloco')
    } catch (e: any) {
      toast.error('Erro ao salvar tablatura: ' + (e?.message ?? ''))
    }
  }, [blocks, tablatureEditorBlockId, setBlocksWithHistory])

  // Abrir editor de acorde para um bloco
  const openChordEditorForBlock = useCallback((blockId: string) => {
    const block = blocks.find(b => b.id === blockId)
    if (!block) return
    const rd = block.render_data ?? {}
    const positions: ChordPositions = {
      fingers: (rd.fingers ?? []) as any[],
      barres: (rd.barres ?? []) as any[],
      muted: (rd.muted ?? []) as number[],
    }
    const startFret = (rd.position ?? 1) as number
    setChordEditorState(positionsToState(positions, startFret))
    setChordEditorName((rd.chord_name ?? block.title ?? '') as string)
    setChordEditorStartFret(startFret)
    setChordEditorBlockId(blockId)
    setChordEditorOpen(true)
  }, [blocks])

  // Salvar acorde de volta no bloco
  const handleSaveChordToBlock = useCallback(async () => {
    if (!chordEditorBlockId) return
    const block = blocks.find(b => b.id === chordEditorBlockId)
    if (!block) return

    const positions = stateToPositions(chordEditorState, chordEditorStartFret)
    const newRenderData = {
      ...(block.render_data ?? {}),
      chord_name: chordEditorName,
      fingers: positions.fingers,
      barres: positions.barres,
      muted: positions.muted,
      position: chordEditorStartFret,
    }

    setBlocksWithHistory(prev => prev.map(b =>
      b.id === chordEditorBlockId ? { ...b, title: chordEditorName || b.title, render_data: newRenderData } : b,
    ))

    try {
      await updateMaterialBlockRpc({
        blockId: chordEditorBlockId,
        title: chordEditorName || block.title,
        renderData: newRenderData,
      })
      toast.success('Acorde atualizado no bloco')
      setChordEditorOpen(false)
    } catch (e: any) {
      toast.error('Erro ao salvar acorde: ' + (e?.message ?? ''))
    }
  }, [chordEditorBlockId, chordEditorState, chordEditorName, chordEditorStartFret, blocks])

  // Helper: bloco tem notação editável?
  const blockHasNotation = useCallback((block: EditorBlock) => {
    if (block.block_type === 'tablature') return false
    return block.render_data?.notation || block.render_data?.notation_data || block.render_data?.notes
  }, [])

  const enterInlineEditForBlock = useCallback((blockId: string, focusPoint: { x: number; y: number } | null = null) => {
    const block = blocksRef.current.find(b => b.id === blockId)
    if (!block || !canEnterInlineEdit(block.block_type)) return false
    setSelectedBlockId(blockId)
    setInlineEditingBlockId(blockId)
    setInlineEditFocusPoint(focusPoint)
    setCoverTitleEditing(false)
    return true
  }, [setSelectedBlockId])

  const openPrimaryCanvasActionForBlock = useCallback((block: EditorBlock, focusPoint: { x: number; y: number } | null = null) => {
    if (canEnterInlineEdit(block.block_type)) {
      enterInlineEditForBlock(block.id, focusPoint)
      return
    }
    if (block.block_type === 'chord_diagram') openChordEditorForBlock(block.id)
    else if (block.block_type === 'chord_grid') openChordEditorForGrid(block.id)
    else if (block.block_type === 'keyboard') openKeyboardEditorForBlock(block.id)
    else if (block.block_type === 'keyboard_grid') openKeyboardEditorForGrid(block.id)
    else if (block.block_type === 'tablature') openTablatureEditorForBlock(block.id)
    else if (block.block_type === 'notation' || blockHasNotation(block)) openNotationEditorForBlock(block.id)
    else if (block.block_type === 'image') imageInputRef.current?.click()
    else if (block.block_type === 'cover') setCoverTitleEditing(true)
  }, [
    blockHasNotation,
    enterInlineEditForBlock,
    openChordEditorForBlock,
    openChordEditorForGrid,
    openKeyboardEditorForBlock,
    openKeyboardEditorForGrid,
    openNotationEditorForBlock,
    openTablatureEditorForBlock,
  ])

  const handleCanvasInlineTitleChange = useCallback((blockId: string, title: string) => {
    setBlockWithHistory(blockId, block => ({ ...block, title }))
    queueBlockAutosave(blockId)
  }, [queueBlockAutosave, setBlockWithHistory])

  const handleCanvasInlineContentChange = useCallback((blockId: string, html: string) => {
    setBlockWithHistory(blockId, block => ({
      ...block,
      content: { ...(block.content ?? {}), html, text: htmlToMarkdown(html) },
    }))
    queueBlockAutosave(blockId)
  }, [queueBlockAutosave, setBlockWithHistory])

  const exitInlineEdit = useCallback(() => {
    setInlineEditingBlockId(null)
    setInlineEditFocusPoint(null)
  }, [])

  const handleCanvasNotationStavePointerDown = useCallback((blockId: string, staveIndex: number) => {
    notationPreviewStaveRef.current = { blockId, staveIndex }
  }, [])

  const handleCanvasChordGridItemClick = useCallback((blockId: string, chord: any, index: number) => {
    openChordEditorForGrid(blockId, chord, index)
  }, [openChordEditorForGrid])

  const handleCanvasKeyboardGridItemClick = useCallback((blockId: string, keyboard: any, index: number) => {
    openKeyboardEditorForGrid(blockId, keyboard, index)
  }, [openKeyboardEditorForGrid])

  const handleCanvasCoverPositionChange = useCallback((blockId: string, field: string, pos: { x: number; y: number }) => {
    setBlockWithHistory(blockId, b => ({ ...b, render_data: { ...(b.render_data ?? {}), [field]: pos } }))
    queueBlockAutosave(blockId)
  }, [queueBlockAutosave, setBlockWithHistory])

  const handleCanvasCoverRenderDataChange = useCallback((blockId: string, patch: Record<string, any>) => {
    setBlockWithHistory(blockId, b => ({ ...b, render_data: { ...(b.render_data ?? {}), ...patch } }))
    queueBlockAutosave(blockId)
  }, [queueBlockAutosave, setBlockWithHistory])

  const handleCanvasCoverLogoDuplicate = useCallback((blockId: string) => {
    const block = blocksRef.current.find(b => b.id === blockId)
    const rd = block?.render_data as any
    const logoUrl = rd?.logo_url as string | undefined
    if (!block || !logoUrl) return
    const logoPos = (rd.logo_pos as { x: number; y: number } | undefined) ?? { x: 50, y: 8 }
    const logoSize = (rd.logo_size as number | undefined) ?? 80
    const current = (Array.isArray(rd.overlay_elements) ? rd.overlay_elements : []) as CoverOverlayElement[]
    const duplicated: CoverOverlayElement = {
      id: crypto.randomUUID(),
      image_url: logoUrl,
      label: 'Logomarca',
      x: Math.min(95, logoPos.x + 4),
      y: Math.min(95, logoPos.y + 4),
      width: Math.max(8, Math.min(34, Math.round((logoSize / 4) * 10) / 10)),
      rotation: 0,
      opacity: 1,
      shadow: false,
      zIndex: current.length + 1,
      flipX: false,
    }
    setBlockWithHistory(blockId, b => ({
      ...b,
      render_data: {
        ...(b.render_data ?? {}),
        overlay_elements: [...current, duplicated],
      },
    }))
    queueBlockAutosave(blockId)
    setSelectedOverlayId(duplicated.id)
    setCoverPropertiesTab('elementos')
    toast.success('Logomarca duplicada como elemento.')
  }, [blocksRef, queueBlockAutosave, setBlockWithHistory])

  const handleCanvasCoverTitleChange = useCallback((value: string) => {
    updateSelectedRenderData('titulo', value)
  }, [updateSelectedRenderData])

  // Exportação
  const activateAllCanvasPages = useCallback(async () => {
    setForceAllPagesActive(true)
    await new Promise(resolve => setTimeout(resolve, 300))
  }, [])

  const handlePrint = useCallback(async () => {
    await activateAllCanvasPages()
    // Forçar tema light para notações SVG (remove filter:invert do dark mode)
    const currentTheme = document.documentElement.getAttribute('data-theme')
    document.documentElement.setAttribute('data-theme', 'light')

    // Aguardar re-render, imprimir, restaurar tema
    // O @media print CSS cuida de TUDO: esconde sidebar/nav, reseta containers, dimensiona páginas A4
    setTimeout(() => {
      window.print()
      if (currentTheme) document.documentElement.setAttribute('data-theme', currentTheme)
      else document.documentElement.removeAttribute('data-theme')
      setForceAllPagesActive(false)
    }, 150)
  }, [activateAllCanvasPages])

  const handleExportHTML = useCallback(async () => {
    await activateAllCanvasPages()
    const pagesEl = document.querySelectorAll('.a4-page')
    if (!pagesEl.length) { toast.error('Nenhuma página encontrada'); return }

    // Aguardar fontes do browser antes de serializar SVGs inline
    await document.fonts.ready

    // Converter SVG inline para PNG para garantir portabilidade no HTML exportado
    const svgToDataUrl = async (svgEl: SVGSVGElement): Promise<string> => {
      return new Promise((resolve) => {
        try {
          const clone = svgEl.cloneNode(true) as SVGSVGElement
          clone.style.filter = 'none'
          if (!clone.getAttribute('fill')) clone.setAttribute('fill', 'black')
          if (!clone.getAttribute('stroke')) clone.setAttribute('stroke', 'black')
          clone.querySelectorAll('text').forEach(t => { if (!t.getAttribute('fill')) t.setAttribute('fill', '#333') })
          if (!clone.getAttribute('xmlns')) clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')

          const w = parseInt(clone.getAttribute('width') || '500')
          const h = parseInt(clone.getAttribute('height') || '200')
          const svgData = new XMLSerializer().serializeToString(clone)
          // CRÍTICO: usar Blob URL (mesma origem) em vez de data: URL
          // data: URLs bloqueiam @font-face dentro do SVG — Blob URLs permitem
          const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
          const blobUrl = URL.createObjectURL(blob)
          const img = new Image()
          const canvas = document.createElement('canvas')
          canvas.width = w * 2
          canvas.height = h * 2
          const ctx = canvas.getContext('2d')!
          ctx.scale(2, 2)
          img.onload = () => {
            ctx.fillStyle = '#fff'
            ctx.fillRect(0, 0, w, h)
            ctx.drawImage(img, 0, 0, w, h)
            URL.revokeObjectURL(blobUrl)
            resolve(canvas.toDataURL('image/png'))
          }
          img.onerror = () => { URL.revokeObjectURL(blobUrl); resolve('') }
          img.src = blobUrl
        } catch (e) { resolve('') }
      })
    }

    // Clonar conteúdo das páginas A4 e limpar elementos de edição
    const pagesHtmlParts: string[] = []
    for (let i = 0; i < pagesEl.length; i++) {
      const page = pagesEl[i]
      const clone = page.cloneNode(true) as HTMLElement
      // Remover bordas de seleção, botões de edição, snap guides
      clone.querySelectorAll('.block-selection-border, .cover-snap-guide, .add-block-btn, button, [contenteditable]').forEach(el => {
        if (el.tagName === 'BUTTON') el.remove()
        if (el.classList?.contains('block-selection-border')) {
          (el as HTMLElement).style.border = 'none'
          ;(el as HTMLElement).style.outline = 'none'
          ;(el as HTMLElement).style.boxShadow = 'none'
        }
        if (el.classList?.contains('cover-snap-guide')) el.remove()
        el.removeAttribute('contenteditable')
      })
      // Remover classes de edição
      clone.querySelectorAll('.cover-draggable').forEach(el => el.classList.remove('cover-draggable'))
      clone.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'))
      // Limpar rings/cursors de edição dos text_elements e overlays da capa
      clone.querySelectorAll('[class*="ring-"], [class*="cursor-move"]').forEach(el => {
        const cls = el.getAttribute('class') || ''
        const cleaned = cls.split(' ').filter(c => !c.startsWith('ring-') && c !== 'cursor-move' && c !== 'cursor-grab').join(' ')
        el.setAttribute('class', cleaned)
      })

      // Injetar classes semânticas para blocos de dica (amarelo) e exercício (verde)
      clone.querySelectorAll('[class*="bg-dourado-soft"]').forEach(el => {
        el.classList.add('block-tip')
      })
      clone.querySelectorAll('[class*="bg-advance"]').forEach(el => {
        if ((el.getAttribute('class') || '').includes('bg-advance/10') || (el.getAttribute('class') || '').includes('bg-advance')) {
          el.classList.add('block-exercise')
        }
      })

      // Notação musical: converter SVGs para imagens PNG (garante renderização correta)
      const notationContainers = clone.querySelectorAll('.notation-container')
      for (const container of Array.from(notationContainers)) {
        const origContainer = page.querySelector(`.notation-container:nth-of-type(${Array.from(clone.querySelectorAll('.notation-container')).indexOf(container) + 1})`)
        // Buscar o SVG original na página (não no clone) para capturar visual correto
        const svgEl = container.querySelector('svg')
        // Também buscar na página original pelo data-block ou pela posição
        if (svgEl) {
          // Encontrar o SVG original correspondente na página real
          const allOrigSvgs = page.querySelectorAll('.notation-container svg')
          const allCloneSvgs = clone.querySelectorAll('.notation-container svg')
          const svgIndex = Array.from(allCloneSvgs).indexOf(svgEl)
          const origSvg = allOrigSvgs[svgIndex] as SVGSVGElement | undefined
          if (origSvg) {
            const dataUrl = await svgToDataUrl(origSvg)
            if (dataUrl) {
              const w = origSvg.getAttribute('width') || '500'
              const h = origSvg.getAttribute('height') || '200'
              const imgEl = document.createElement('img')
              imgEl.src = dataUrl
              imgEl.style.width = w + 'px'
              imgEl.style.maxWidth = '100%'
              imgEl.style.height = 'auto'
              imgEl.alt = 'Notação musical'
              svgEl.replaceWith(imgEl)
            }
          }
        }
        ;(container as HTMLElement).style.background = '#fff'
      }

      // Se é capa, copiar background computado do .block-cover para inline
      // (as classes CSS do template não existem no HTML standalone)
      const isCover = clone.classList.contains('a4-page--cover')
      if (isCover) {
        const origBlockCover = page.querySelector('.block-cover') as HTMLElement | null
        const cloneBlockCover = clone.querySelector('.block-cover') as HTMLElement | null
        if (origBlockCover && cloneBlockCover) {
          const computed = getComputedStyle(origBlockCover)
          cloneBlockCover.style.background = computed.background
          cloneBlockCover.style.backgroundColor = computed.backgroundColor
          cloneBlockCover.style.color = computed.color
        }
      }

      // Page break entre páginas (exceto a última)
      const pageBreak = i < pagesEl.length - 1 ? 'page-break-after:always;' : ''
      const coverStyle = isCover ? 'min-height:297mm;background:transparent;' : ''
      pagesHtmlParts.push(`<div class="${clone.className}" style="margin-bottom:40px;${coverStyle}${pageBreak}">${clone.innerHTML}</div>`)
    }
    const pagesHtml = pagesHtmlParts.join('\n')

    const fontLinks = getGoogleFontLinkTags(collectUsedGoogleFontFamilies([
      ...blocks,
      { render_data: pageConfig },
    ]))
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${materialTitle || 'Material Didático'}</title>
${fontLinks}
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'DM Sans',sans-serif;background:#f8fafc;color:#1E293B;line-height:1.7}
h1,h2,h3{font-family:'DM Sans',sans-serif;font-weight:700;margin:0 0 12px}
h1{font-size:28px} h2{font-size:22px} h3{font-size:18px}
strong{font-weight:600}
p{margin:0 0 12px}
.a4-page{max-width:794px;margin:0 auto 24px;background:#fff;box-shadow:0 2px 12px rgba(0,0,0,.08);border-radius:4px;overflow:hidden;min-height:1123px;display:flex;flex-direction:column}
.a4-page--cover{background:transparent;min-height:1123px;border-radius:0;margin:0 auto 24px;box-shadow:none;overflow:hidden}
.a4-page--cover .a4-page-content{padding:0;overflow:hidden}
.a4-page--cover .canvas-block{padding:0;margin:0}
.a4-page-header{padding:20px 60px 8px;font-size:11px;color:#94a3b8;border-bottom:1px solid #e2e8f0;flex-shrink:0}
.a4-page-content{padding:12px 60px;flex:1;overflow:hidden}
.a4-page-footer{padding:8px 60px 16px;font-size:10px;color:#94a3b8;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;flex-shrink:0}
.canvas-block{padding:10px 16px;margin-bottom:4px}
.block-cover{position:relative;width:100%;min-height:1123px;display:flex;align-items:center;justify-content:center}
.block-cover--with-image{background-size:cover!important;background-position:center!important;color:#fff}
.cover-overlay{position:absolute;inset:0;background:rgba(0,0,0,.45)}
.cover-content,.cover-footer,.cover-logo{position:absolute;z-index:1}
.cover-title{font-size:36px;font-weight:700;line-height:1.2}
.cover-subtitle{font-size:16px;opacity:.8}
.cover-instrument{font-size:13px;letter-spacing:3px;text-transform:uppercase;margin-bottom:24px;font-weight:600}
.cover-footer{font-size:12px;opacity:.7;color:#fff;text-align:center}
.cover-professor{font-weight:600}
.cover-escola,.cover-data{opacity:.8}
img{max-width:100%}
.absolute{position:absolute}
.select-none{user-select:none}
.pointer-events-none{pointer-events:none}
.notation-container{background:#fff;border-radius:4px;overflow:hidden;margin:8px 0}
.notation-container svg{filter:none!important;display:block;max-width:100%}
svg{max-width:100%}
.block-columns{display:grid;gap:16px;align-items:start}
.block-column{min-width:0}
.block-tip{margin-bottom:16px;padding:16px;background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.2);border-radius:8px}
.block-tip .tip-icon{color:#F59E0B;font-weight:700;margin-right:6px}
.block-tip h3,.block-tip .tip-title{color:#F59E0B;font-weight:700;font-size:14px;margin-bottom:4px}
.block-exercise{margin-bottom:16px;padding:16px;background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.2);border-radius:8px}
.block-exercise .exercise-icon{color:#22C55E;font-weight:700;margin-right:6px}
.block-exercise h3,.block-exercise .exercise-title{color:#22C55E;font-weight:700;font-size:14px;margin-bottom:4px}
@media print{
  body{background:#fff}
  .a4-page{box-shadow:none;page-break-after:always;break-after:page;margin:0}
  .a4-page:last-child{page-break-after:auto}
  *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
  .canvas-block,.notation-container,.block-tip,.block-exercise,.mb-4,img,svg,table,pre,figure{page-break-inside:avoid!important;break-inside:avoid!important}
  h1,h2,h3,h4{page-break-after:avoid!important;break-after:avoid!important}
  [class*="bg-dourado-soft"],[class*="bg-advance"]{page-break-inside:avoid!important;break-inside:avoid!important}
  @page{size:A4 portrait;margin:0}
}
</style>
</head>
<body>
${pagesHtml}
</body>
</html>`

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    toast.success('HTML exportado em nova aba')
    setForceAllPagesActive(false)
  }, [activateAllCanvasPages, blocks, materialTitle, pageConfig])

  const handleDownloadPDF = useCallback(async () => {
    const toastId = toast.loading('Gerando PDF profissional...')
    const pdfTab = window.open('', '_blank')

    if (pdfTab) {
      pdfTab.document.write(`
        <!doctype html>
        <html>
          <head>
            <title>Gerando PDF...</title>
            <style>
              body {
                margin: 0;
                min-height: 100vh;
                display: grid;
                place-items: center;
                font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                color: #10233f;
                background: #f7f4fb;
              }
              div {
                padding: 24px 28px;
                border: 1px solid #e3ddea;
                border-radius: 14px;
                background: white;
                box-shadow: 0 16px 40px rgb(16 35 63 / 12%);
              }
            </style>
          </head>
          <body>
            <div>Gerando PDF profissional...</div>
          </body>
        </html>
      `)
      pdfTab.document.close()
    }

    try {
      const { data, error } = await supabase.functions.invoke('generate-pdf', {
        body: { materialId },
      })

      if (error) throw error

      const url = (data as { url?: string } | null)?.url
      if (!url) throw new Error('A Edge Function nao retornou a URL do PDF.')

      toast.success('PDF gerado com sucesso.', { id: toastId })
      if (pdfTab && !pdfTab.closed) {
        pdfTab.location.href = url
      } else {
        const openedPdf = window.open(url, '_blank')
        if (!openedPdf) {
          window.location.href = url
        }
      }
    } catch (error) {
      console.error('[PDF] Erro ao gerar PDF profissional:', error)
      if (pdfTab && !pdfTab.closed) {
        pdfTab.document.body.innerHTML = '<div>Erro ao gerar PDF. Volte ao editor e tente novamente.</div>'
      }
      toast.error(error instanceof Error ? error.message : 'Erro ao gerar PDF.', { id: toastId })
    }
  }, [materialId])

  // --- Atalhos de teclado globais ---
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isCanvasNudgeShortcut = isCanvasNudgeKey(e)
      if (e.repeat && !isCanvasNudgeShortcut) return

      const isEditingTarget = isTextInputTarget(e.target)

      // Ctrl+Z — Undo (funciona mesmo em inputs, exceto contentEditable)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey && !(e.target as HTMLElement)?.isContentEditable) {
        e.preventDefault()
        flushCanvasNudgeSession()
        if (
          (selectedFloatingId || (!selectedBlockId && !selectedTextId && !selectedOverlayId && canUndoFloatingElementChange())) &&
          undoFloatingElementChange()
        ) return
        handleUndo()
        return
      }
      // Ctrl+Y ou Ctrl+Shift+Z — Redo
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey)) && !(e.target as HTMLElement)?.isContentEditable) {
        e.preventDefault()
        flushCanvasNudgeSession()
        if (
          (selectedFloatingId || (!selectedBlockId && !selectedTextId && !selectedOverlayId && canRedoFloatingElementChange())) &&
          redoFloatingElementChange()
        ) return
        handleRedo()
        return
      }
      // Ctrl+S — Salvar bloco
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        handleSaveBlock()
        return
      }
      // Ctrl+D — Duplicar bloco
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !isEditingTarget && !editingTextId) {
        if (copySelectedFloatingElement()) {
          e.preventDefault()
          return
        }
        if (copySelectedCoverElement()) {
          e.preventDefault()
          return
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && !isEditingTarget && !editingTextId) {
        if (pasteFloatingElement()) {
          e.preventDefault()
          return
        }
        if (pasteCoverElement()) {
          e.preventDefault()
          return
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'd' && !isEditingTarget && !editingTextId) {
        if (selectedFloatingId) {
          e.preventDefault()
          duplicateFloatingElement(selectedFloatingId)
          return
        }
        if (selectedTextId) {
          e.preventDefault()
          duplicateTextElement(selectedTextId)
          return
        }
        if (selectedOverlayId) {
          e.preventDefault()
          duplicateOverlayElement(selectedOverlayId)
          return
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectedBlockId && !isEditingTarget) {
        e.preventDefault()
        handleDuplicateBlock(selectedBlockId)
        return
      }

      // Ctrl+\ — Toggle modo foco
      if ((e.ctrlKey || e.metaKey) && e.key === '\\') {
        e.preventDefault()
        setLeftSidebarOpen(prev => {
          const nextVal = !(prev || rightSidebarOpen)
          setRightSidebarOpen(nextVal)
          return nextVal
        })
        return
      }
      // Ctrl+[ — Toggle sidebar esquerda
      if ((e.ctrlKey || e.metaKey) && e.key === '[') {
        e.preventDefault()
        setLeftSidebarOpen(prev => !prev)
        return
      }
      // Ctrl+] — Toggle sidebar direita
      if ((e.ctrlKey || e.metaKey) && e.key === ']') {
        e.preventDefault()
        setRightSidebarOpen(prev => !prev)
        return
      }

      if (e.key === 'Escape' && inlineEditingBlockId) {
        e.preventDefault()
        exitInlineEdit()
        return
      }

      // Os atalhos abaixo NÃO funcionam dentro de inputs/textareas
      if (isEditingTarget) return

      // Delete / Backspace — Remover elemento selecionado da capa
      if (e.key.toLowerCase() === 't' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault()
        addFloatingTextElement()
        return
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedFloatingId && !editingFloatingId) {
          e.preventDefault()
          removeFloatingElement(selectedFloatingId)
          return
        }
        if (selectedOverlayId) {
          e.preventDefault()
          removeOverlayElement(selectedOverlayId)
          return
        }
        if (selectedTextId && !editingTextId) {
          e.preventDefault()
          removeTextElement(selectedTextId)
          return
        }
        const blockToDelete = selectedBlockId
          ? blocks.find(block => block.id === selectedBlockId)
          : null
        if (
          blockToDelete &&
          !['cover', 'page_break'].includes(blockToDelete.block_type) &&
          canDeleteSelectedBlock({ selectedBlockId, inlineEditingBlockId, isTextInputTarget: isEditingTarget })
        ) {
          e.preventDefault()
          handleDeleteBlock(selectedBlockId!)
          return
        }
      }

      // Shift+Delete — Remover bloco ou floating element sem confirmação
      if (e.key === 'Delete' && e.shiftKey) {
        e.preventDefault()
        if (selectedFloatingId) {
          removeFloatingElement(selectedFloatingId)
        }
        return
      }
      // Escape — Desselecionar / sair do inline editing
      if (e.key === 'Escape') {
        if (editingFloatingId) {
          setEditingFloatingId(null)
        } else if (editingTextId) {
          setEditingTextId(null)
        } else if (selectedFloatingId) {
          setSelectedFloatingId(null)
        } else if (selectedTextId) {
          setSelectedTextId(null)
        } else if (selectedOverlayId) {
          setSelectedOverlayId(null)
        } else if (inlineEditingBlockId) {
          exitInlineEdit()
        } else if (coverTitleEditing) {
          setCoverTitleEditing(false)
        } else {
          setSelectedBlockId(null)
        }
        return
      }
      // Setas ↑↓ — Navegar entre blocos
      if (e.key === 'Enter' && selectedBlockId && !inlineEditingBlockId) {
        const block = blocks.find(b => b.id === selectedBlockId)
        if (block) {
          e.preventDefault()
          openPrimaryCanvasActionForBlock(block)
        }
        return
      }
      if (inlineEditingBlockId) return
      if (
        shouldNudgeFloatingElementFromKey(e) &&
        (selectedFloatingId || selectedTextId || selectedOverlayId)
      ) {
        e.preventDefault()
        if (nudgeSelectedFloatingElement(e.key, getFloatingElementNudgeStep(e))) return
        if (nudgeSelectedCoverElement(e.key, e.shiftKey ? 1.5 : 0.3)) return
      }
      if (e.altKey && e.key === '0' && selectedBlockId) {
        e.preventDefault()
        void handleResetBlockPosition(selectedBlockId)
        return
      }
      if (isCanvasNudgeShortcut && e.key === 'ArrowUp' && selectedBlockId) {
        e.preventDefault()
        handleMoveBlock(selectedBlockId, 'up', e.repeat, getCanvasNudgeStep(e))
        return
      }
      if (isCanvasNudgeShortcut && e.key === 'ArrowDown' && selectedBlockId) {
        e.preventDefault()
        handleMoveBlock(selectedBlockId, 'down', e.repeat, getCanvasNudgeStep(e))
        return
      }
      if (isCanvasNudgeShortcut && e.key === 'ArrowLeft' && selectedBlockId) {
        e.preventDefault()
        handleMoveBlock(selectedBlockId, 'left', e.repeat, getCanvasNudgeStep(e))
        return
      }
      if (isCanvasNudgeShortcut && e.key === 'ArrowRight' && selectedBlockId) {
        e.preventDefault()
        handleMoveBlock(selectedBlockId, 'right', e.repeat, getCanvasNudgeStep(e))
        return
      }
      if (e.key === 'ArrowUp' && selectedBlockId) {
        e.preventDefault()
        const idx = blocks.findIndex(b => b.id === selectedBlockId)
        if (idx > 0) selectBlock(blocks[idx - 1].id)
        return
      }
      if (e.key === 'ArrowDown' && selectedBlockId) {
        e.preventDefault()
        const idx = blocks.findIndex(b => b.id === selectedBlockId)
        if (idx < blocks.length - 1) selectBlock(blocks[idx + 1].id)
        return
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (
        e.key === 'Alt' ||
        e.key === 'ArrowUp' ||
        e.key === 'ArrowDown' ||
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowRight'
      ) {
        flushCanvasNudgeSession()
      }
    }

    const handleBlur = () => {
      flushCanvasNudgeSession()
    }

    window.addEventListener('keydown', handler)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleBlur)
    return () => {
      window.removeEventListener('keydown', handler)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleBlur)
    }
  }, [handleUndo, handleRedo, handleSaveBlock, handleDuplicateBlock, handleDeleteBlock, handleMoveBlock, handleResetBlockPosition, flushCanvasNudgeSession, selectedBlockId, blocks, inlineEditingBlockId, coverTitleEditing, selectBlock, selectedFloatingId, editingFloatingId, removeFloatingElement, rightSidebarOpen, selectedOverlayId, removeOverlayElement, selectedTextId, editingTextId, removeTextElement, openPrimaryCanvasActionForBlock, exitInlineEdit, copySelectedFloatingElement, pasteFloatingElement, duplicateFloatingElement, copySelectedCoverElement, pasteCoverElement, duplicateTextElement, duplicateOverlayElement, nudgeSelectedFloatingElement, nudgeSelectedCoverElement, undoFloatingElementChange, redoFloatingElementChange, canUndoFloatingElementChange, canRedoFloatingElementChange, addFloatingTextElement])

  // Persistir estado da sidebar no localStorage
  useEffect(() => {
    localStorage.setItem('editor-sidebar-state', JSON.stringify({ left: leftSidebarOpen, right: rightSidebarOpen }))
  }, [leftSidebarOpen, rightSidebarOpen])

  // Posicionar toolbar contextual sobre o bloco selecionado
  useEffect(() => {
    if (!selectedBlockId) {
      setToolbarPosition(null)
      return
    }
    const updatePosition = () => {
      const blockEl = canvasRefs.current[selectedBlockId]
      if (!blockEl) { setToolbarPosition(null); return }
      const rect = blockEl.getBoundingClientRect()
      const canvasRect = canvasScrollRef.current?.getBoundingClientRect()
      setToolbarPosition(getCanvasToolbarPosition({
        blockTop: rect.top,
        blockBottom: rect.bottom,
        blockLeft: rect.left,
        blockWidth: rect.width,
        viewportTop: canvasRect?.top ?? 0,
      }))
    }
    updatePosition()
    const canvas = canvasScrollRef.current
    canvas?.addEventListener('scroll', updatePosition)
    window.addEventListener('resize', updatePosition)
    return () => {
      canvas?.removeEventListener('scroll', updatePosition)
      window.removeEventListener('resize', updatePosition)
    }
  }, [selectedBlockId, blocks, inlineEditingBlockId, zoom])

  // --- Loading/Error ---
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh] gap-2 text-text2">
        <SpinnerGap size={24} className="animate-spin" /> Carregando material...
      </div>
    )
  }

  if (error || !rawData || rawData.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-vermelho mb-4">{error ?? 'Material não encontrado'}</div>
        <Button variant="ghost" onClick={() => navigate('/editor')}>
          <ArrowLeft size={16} /> Voltar para lista
        </Button>
      </div>
    )
  }

  const previewBlocks: MaterialBlock[] = blocks.map(editorBlockToPreview)
  const activeTablatureBlock = tablatureEditorBlockId
    ? blocks.find(block => block.id === tablatureEditorBlockId) ?? null
    : null
  const activeTablatureRenderData = (activeTablatureBlock?.render_data ?? {}) as any
  const activeTablatureNotationData = activeTablatureRenderData.notation_data as TablatureData | undefined
  const activeTablatureLines = Array.isArray(activeTablatureRenderData.lines)
    ? activeTablatureRenderData.lines as string[]
    : typeof activeTablatureRenderData.tab === 'string' && activeTablatureRenderData.tab.trim()
      ? activeTablatureRenderData.tab.split('\n')
      : []
  const canvasRulerGutter = showRulers ? 28 : 0
  const canvasBaseWidth = 794 + canvasRulerGutter
  const canvasBaseHeight = (canvasPages.length * 1123)
    + (Math.max(canvasPages.length - 1, 0) * 32)
    + canvasRulerGutter
    + 48
  const headerFooterCoverBlock = blocks.find(b => b.block_type === 'cover')
  const headerFooterCoverData = (headerFooterCoverBlock?.render_data ?? {}) as Record<string, string>
  const headerFooterPreviewContext: PlaceholderContext = {
    title: materialTitle || '',
    subtitle: headerFooterCoverData.subtitulo || '',
    pageNumber: 1,
    totalPages: pages.length,
    schoolName: headerFooterCoverData.escola || school?.name || 'LA Music',
    professorName: headerFooterCoverData.professor || '',
    instrument: headerFooterCoverData.instrumento || '',
    level: headerFooterCoverData.nivel || '',
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header do Editor */}
      <div className="editor-header flex items-center justify-between mb-0 px-5 py-3 border-b border-border bg-surface sticky top-0 z-10 shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/editor')}>
            <ArrowLeft size={16} />
          </Button>
          <div>
            {editingTitle ? (
              <Input
                value={materialTitle}
                onChange={e => setMaterialTitle(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={e => e.key === 'Enter' && handleSaveTitle()}
                className="font-serif text-lg h-8 w-[300px]"
                autoFocus
              />
            ) : (
              <h1
                className="font-serif text-lg text-text cursor-pointer hover:text-accent transition-colors"
                onClick={() => setEditingTitle(true)}
              >
                {materialTitle}
              </h1>
            )}
            <div className="flex items-center gap-2 mt-0.5">
              {materialMeta?.is_draft !== false
                ? <Badge variant="gold" className="text-[9px]">Rascunho</Badge>
                : <Badge variant="advance" className="text-[9px]">Publicado</Badge>
              }
              <span className="text-[11px] text-text3">v{materialMeta?.version ?? 1} · {blocks.length} blocos</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                autoSaveStatus === 'saved' ? 'bg-verde/10 text-verde' :
                autoSaveStatus === 'saving' ? 'bg-dourado/10 text-dourado' :
                'bg-vermelho/10 text-vermelho'
              }`}>
                {autoSaveStatus === 'saved' ? 'Salvo' : autoSaveStatus === 'saving' ? 'Salvando...' : 'Alterações pendentes'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Undo/Redo */}
          <div className="flex items-center gap-0.5 mr-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => {
                if (
                  (selectedFloatingId || (!selectedBlockId && !selectedTextId && !selectedOverlayId && canUndoFloatingElementChange())) &&
                  undoFloatingElementChange()
                ) return
                handleUndo()
              }}
              disabled={!canUndo() && !((selectedFloatingId || (!selectedBlockId && !selectedTextId && !selectedOverlayId)) && canUndoFloatingElementChange())}
              title="Desfazer (Ctrl+Z)"
            >
              <ArrowCounterClockwise size={15} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => {
                if (
                  (selectedFloatingId || (!selectedBlockId && !selectedTextId && !selectedOverlayId && canRedoFloatingElementChange())) &&
                  redoFloatingElementChange()
                ) return
                handleRedo()
              }}
              disabled={!canRedo() && !((selectedFloatingId || (!selectedBlockId && !selectedTextId && !selectedOverlayId)) && canRedoFloatingElementChange())}
              title="Refazer (Ctrl+Y)"
            >
              <ArrowCounterClockwise size={15} className="scale-x-[-1]" />
            </Button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-1 mr-2 px-2 py-1 bg-bg2 rounded-md">
            <Button
              variant="ghost" size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setZoom(z => Math.max(0.5, +(z - 0.1).toFixed(2)))}
              title="Diminuir zoom"
            >
              <MagnifyingGlassMinus size={14} />
            </Button>
            <input
              type="range"
              min={0.5} max={1.5} step={0.05}
              value={zoom}
              onChange={e => setZoom(+e.target.value)}
              className="w-20 h-1 accent-accent cursor-pointer"
              title={`Zoom: ${Math.round(zoom * 100)}%`}
            />
            <Button
              variant="ghost" size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setZoom(z => Math.min(1.5, +(z + 0.1).toFixed(2)))}
              title="Aumentar zoom"
            >
              <MagnifyingGlassPlus size={14} />
            </Button>
            <span className="text-[10px] text-text3 w-8 text-center font-mono">{Math.round(zoom * 100)}%</span>
          </div>

          {/* 7.1 — Toggle Régua */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showRulers ? 'default' : 'ghost'}
                  size="sm" className="h-8 w-8 p-0"
                  onClick={() => {
                    setShowRulers(!showRulers)
                    localStorage.setItem('editor-show-rulers', String(!showRulers))
                  }}
                >
                  <Ruler size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Régua</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {import.meta.env.DEV && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={showPaginationDebug ? 'default' : 'ghost'}
                    size="sm"
                    className="h-8 gap-1 text-[11px]"
                    onClick={() => setShowPaginationDebug(true)}
                  >
                    <MapTrifold size={14} /> Mapa
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Mapa de paginação</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* 7.3 — Templates */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost" size="sm"
                  className="h-8 gap-1 text-[11px]"
                  onClick={() => setShowTemplatesDialog(true)}
                >
                  <Layout size={14} /> Templates
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Aplicar template de material</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline" size="sm"
                  className="h-8 gap-1 text-[11px]"
                  onClick={() => setElementsPickerOpen(true)}
                >
                  <Shapes size={14} /> Elementos
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Adicionar elemento visual ao material</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* 7.4 — Versões */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost" size="sm"
                  className="h-8 gap-1 text-[11px]"
                  onClick={() => setShowVersionsDialog(true)}
                >
                  <ClockCounterClockwise size={14} /> Versões
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Histórico de versões</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* 6.3 — Traduzir material */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1 text-[11px]" disabled={isTranslating}>
                {isTranslating
                  ? <><SpinnerGap size={14} className="animate-spin" /> Traduzindo ({translateProgress})...</>
                  : <><Translate size={14} /> Traduzir</>
                }
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-3" side="bottom">
              <div className="space-y-3">
                <Label className="text-[11px] text-text3 uppercase tracking-wider">
                  Traduzir material completo
                </Label>
                <p className="text-[10px] text-text3/70">
                  Traduz todos os blocos de texto mantendo a formatação. Use Ctrl+Z para desfazer.
                </p>
                <Select value={translateTarget} onValueChange={setTranslateTarget}>
                  <SelectTrigger className="h-8 text-[12px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">Português → Inglês</SelectItem>
                    <SelectItem value="pt">Inglês → Português</SelectItem>
                    <SelectItem value="es">Português → Espanhol</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  className="w-full h-8 text-[11px] gap-1"
                  onClick={handleTranslateAll}
                  disabled={isTranslating}
                >
                  <Translate size={14} /> Traduzir tudo
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* 6.4 — Ortografia */}
          <Button
            variant="outline" size="sm"
            className="h-8 gap-1 text-[11px]"
            onClick={handleSpellCheckAll}
            disabled={isSpellChecking}
          >
            {isSpellChecking
              ? <><SpinnerGap size={14} className="animate-spin" /> Corrigindo ({spellCheckProgress})...</>
              : <><TextAa size={14} /> Ortografia</>
            }
          </Button>

          <Button variant="ghost" size="sm" onClick={handleDownloadPDF} title="Baixar PDF">
            <DownloadSimple size={16} />
          </Button>
          <Button variant="ghost" size="sm" onClick={handlePrint} title="Imprimir / PDF">
            <Printer size={16} />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleExportHTML} title="Exportar HTML">
            <Code size={16} />
          </Button>
        </div>
      </div>

      {/* Layout 3 colunas com sidebars retráteis */}
      <div className="editor-layout editor-layout--flex flex-1 min-h-0" style={{ marginTop: 0 }}>
        {/* Coluna 1 — Sidebar Esquerda: Lista de Blocos */}
        <BlockListSidebar open={leftSidebarOpen}>
          <Tabs defaultValue="blocks" className="flex flex-col h-full">
            <TabsList className="grid grid-cols-2 mx-3 mt-2 h-8 shrink-0">
              <TabsTrigger value="blocks" className="text-[10px] gap-1">Blocos</TabsTrigger>
              <TabsTrigger value="pages" className="text-[10px] gap-1"><MapTrifold size={12} /> Páginas</TabsTrigger>
            </TabsList>

            <TabsContent value="blocks" className="flex-1 overflow-y-auto p-4 pt-2 mt-0">
          <div className="flex items-center justify-between mb-3">
            <div className="prop-label" style={{ marginBottom: 0 }}>Blocos ({blocks.length})</div>
          </div>

          <div className="flex flex-col">
            {blocks.map(block => (
              <BlockListItem
                key={block.id}
                block={block}
                isSelected={block.id === selectedBlockId}
                onSelectBlock={selectBlock}
                onDeleteBlock={handleDeleteBlock}
                onDuplicateBlock={handleDuplicateBlock}
              />
            ))}
          </div>

          {/* Botão Adicionar */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="add-block-btn mt-2">
                <Plus size={16} className="inline-block mb-0.5" /> Adicionar bloco
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem onClick={() => setExerciseBrowserOpen(true)} className="gap-2 text-accent font-medium">
                <BookmarkSimple size={16} weight="fill" className="text-accent" />
                Da Biblioteca
              </DropdownMenuItem>
              <div className="h-px bg-border my-1" />
              {['text', 'tip', 'exercise', 'title', 'image', 'audio', 'video', 'qr_code', 'cover', 'columns', 'notation', 'chord_diagram', 'chord_grid', 'keyboard', 'keyboard_grid', 'tablature', 'separator', 'page_break'].map(type => {
                const cfg = getBlockConfig(type)
                const Icon = cfg.icon
                return (
                  <DropdownMenuItem key={type} onClick={() => handleAddBlock(type)} className="gap-2">
                    <Icon size={16} style={{ color: cfg.color }} />
                    {cfg.label}
                  </DropdownMenuItem>
                )
              })}
              <div className="h-px bg-border my-1" />
              <DropdownMenuItem onClick={() => setAiBlockDialogOpen(true)} className="gap-2 text-accent font-medium">
                <Sparkle size={16} weight="fill" className="text-accent" />
                Gerar com IA
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Ghost block — sugestão automática */}
          {aiSuggestion && (
            <div className="mt-2 border border-dashed border-accent/40 rounded-[var(--radius-sm)] p-2.5 bg-accent/5 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Sparkle size={12} weight="fill" className="text-accent" />
                <span className="text-[10px] font-semibold text-accent uppercase tracking-wide">Sugestão IA</span>
              </div>
              <div className="text-[11px] font-medium text-text1 mb-0.5">{aiSuggestion.title}</div>
              <div className="text-[10px] text-text3 line-clamp-3 mb-2" dangerouslySetInnerHTML={{ __html: aiSuggestion.content?.text?.slice(0, 200) + '...' }} />
              <div className="flex gap-1.5">
                <Button size="sm" onClick={handleAcceptSuggestion} className="h-6 text-[10px] px-2 gap-1">
                  <Plus size={10} /> Aceitar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setAiSuggestion(null)} className="h-6 text-[10px] px-2">
                  Descartar
                </Button>
                <Button size="sm" variant="ghost" onClick={handleSuggestNextBlock} className="h-6 text-[10px] px-2" disabled={aiSuggestLoading}>
                  Outra
                </Button>
              </div>
            </div>
          )}

          {/* Botão sugerir próximo */}
          {!aiSuggestion && blocks.length >= 2 && (
            <button
              onClick={handleSuggestNextBlock}
              disabled={aiSuggestLoading}
              className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 text-[10px] text-accent/70 hover:text-accent hover:bg-accent/5 rounded-[var(--radius-sm)] transition-colors disabled:opacity-50"
            >
              {aiSuggestLoading ? (
                <><SpinnerGap size={12} className="animate-spin" /> Gerando sugestão...</>
              ) : (
                <><Sparkle size={12} /> Sugerir próximo bloco</>
              )}
            </button>
          )}

          {/* Rodapé info */}
          <div className="mt-3 p-2.5 bg-azul-soft rounded-[var(--radius-sm)] text-[11px] text-text2">
            <strong>{blocks.length} blocos</strong> · v{materialMeta?.version ?? 1}
            {materialMeta?.generated_at && (
              <div className="text-text3 mt-0.5">
                Gerado em: {new Date(materialMeta.generated_at).toLocaleDateString('pt-BR')}
              </div>
            )}
          </div>

            </TabsContent>{/* fim tab blocos */}

            <TabsContent value="pages" className="flex-1 overflow-hidden mt-0">
              <PageMinimap
                totalPages={pages.length}
                currentPage={currentVisiblePage}
                onNavigate={scrollToPage}
              />
            </TabsContent>
          </Tabs>
        </BlockListSidebar>

        {/* Botão toggle sidebar esquerda */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost" size="sm"
                className="self-start mt-3 z-40 h-8 w-6 p-0 rounded-l-none shrink-0
                           bg-card border border-l-0 border-border hover:bg-accent/10"
                onClick={() => setLeftSidebarOpen(prev => !prev)}
              >
                {leftSidebarOpen ? <CaretLeft size={12} /> : <CaretRight size={12} />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{leftSidebarOpen ? 'Esconder blocos (Ctrl+[)' : 'Mostrar blocos (Ctrl+[)'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Coluna 2 — Canvas A4 (Preview) */}
        <EditorCanvas
          ref={canvasScrollRef}
          onCanvasClick={handleCanvasClick}
          onCanvasWheel={handleCanvasWheel}
        >
          {/* Botão Modo Foco */}
          <div className="sticky top-2 z-30 flex justify-end pr-2 pointer-events-none" style={{ marginBottom: '-32px' }}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost" size="sm"
                    className="h-7 px-2 text-[10px] text-text3 bg-card/80 backdrop-blur-sm
                               border border-border rounded-lg pointer-events-auto"
                    onClick={(e) => {
                      e.stopPropagation()
                      const bothOpen = leftSidebarOpen || rightSidebarOpen
                      setLeftSidebarOpen(!bothOpen)
                      setRightSidebarOpen(!bothOpen)
                    }}
                  >
                    {(leftSidebarOpen || rightSidebarOpen) ? (
                      <><ArrowsInSimple size={14} className="mr-1" /> Foco</>
                    ) : (
                      <><ArrowsOutSimple size={14} className="mr-1" /> Normal</>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Modo foco (Ctrl+\)</p></TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* 7.1 — Grid réguas + canvas (layout já considera o zoom visual) */}
          <div
            style={{
              width: `${canvasBaseWidth * zoom}px`,
              height: `${canvasBaseHeight * zoom}px`,
              marginLeft: 'auto',
              marginRight: 'auto',
              position: 'relative',
            }}
          >
          <div style={{
            display: 'grid',
            gridTemplateColumns: showRulers ? '24px 1fr' : '1fr',
            gridTemplateRows: showRulers ? '24px 1fr' : '1fr',
            columnGap: showRulers ? '4px' : 0,
            rowGap: showRulers ? '4px' : 0,
            width: `${canvasBaseWidth}px`,
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
          }}>
            {/* Régua horizontal */}
            {showRulers && (
              <div data-canvas-ruler="horizontal" style={{ gridRow: 1, gridColumn: 2 }}>
                <CanvasRuler 
                  zoom={1} 
                  parentScale={zoom}
                  margins={pageConfig.margins}
                  guides={pageConfig.guides}
                  onGuidesChange={(guides) => setPageConfig(prev => ({ ...prev, guides }))}
                  orientation="horizontal"
                />
              </div>
            )}

            {/* Régua vertical */}
            {showRulers && (
              <div data-canvas-ruler="vertical" style={{ gridRow: 2, gridColumn: 1 }}>
                <CanvasRuler
                  zoom={1}
                  parentScale={zoom}
                  margins={pageConfig.margins}
                  guides={pageConfig.guides}
                  onGuidesChange={(guides) => setPageConfig(prev => ({ ...prev, guides }))}
                  orientation="vertical"
                />
              </div>
            )}

          <div
            className="a4-canvas-wrapper"
            style={{
              gridRow: showRulers ? 2 : 1,
              gridColumn: showRulers ? 2 : 1,
            }}
          >
            {canvasPages.map((pageBlocks, pageIdx) => {
              const isCoverPage = pageBlocks.some(b => b.block_type === 'cover')
              // Extrair dados da capa para contexto dos placeholders
              const coverBlock = blocks.find(b => b.block_type === 'cover')
              const coverRd = (coverBlock?.render_data ?? {}) as Record<string, string>
              const hfContext: PlaceholderContext = {
                title: materialTitle || '',
                subtitle: coverRd.subtitulo || '',
                pageNumber: pageIdx + 1,
                totalPages: pages.length,
                schoolName: coverRd.escola || school?.name || 'LA Music',
                professorName: coverRd.professor || '',
                instrument: coverRd.instrumento || '',
                level: coverRd.nivel || '',
              }
              const showHeader = !isCoverPage && pageConfig.header.enabled && (pageConfig.header.showOnFirstPage || pageIdx > 0)
              const showFooter = !isCoverPage && pageConfig.footer.enabled && (pageConfig.footer.showOnFirstPage || pageIdx > 0)

              const pageBgColor = !isCoverPage ? (pageConfig.background?.color || '#ffffff') : undefined
              const watermark = !isCoverPage ? pageConfig.background?.watermark : undefined
              const isPageActive = activePageIndexes.has(pageIdx)

              if (!isPageActive) {
                return (
                  <div
                    key={pageIdx}
                    ref={el => { pageRefs.current[pageIdx] = el }}
                    className="a4-page a4-page--placeholder"
                    data-page-index={pageIdx}
                    data-editor-page-active="false"
                    style={{ position: 'relative', backgroundColor: '#ffffff' }}
                  >
                    <div
                      className="a4-page-content"
                      style={!isCoverPage && pageConfig.margins ? {
                        paddingLeft: `${pageConfig.margins.left}px`,
                        paddingRight: `${pageConfig.margins.right}px`,
                        paddingTop: `${pageConfig.margins.top / 4}px`,
                        paddingBottom: `${pageConfig.margins.bottom / 4}px`,
                      } : undefined}
                    >
                      <div
                        data-editor-page-placeholder="true"
                        className="h-full w-full rounded-sm bg-white"
                        aria-label={`Pagina ${pageIdx + 1} em modo placeholder`}
                      />
                    </div>
                  </div>
                )
              }

              const pageHasSelectedBlock = selectedBlockId
                ? pageBlocks.some(block => getPaginationSourceBlockId(block) === selectedBlockId)
                : false
              const pageHasShiftedBlock = pageBlocks.some(block => hasCanvasBlockLayoutOffset(block.render_data))
              const pageHasFloatingTransform = floatingTransformState
                ? floatingElements.some(el => el.id === floatingTransformState.id && el.pageIndex === pageIdx)
                : false
              const pageLayerStyle = canvasPageLayerToCSS({
                hasSelectedBlock: pageHasSelectedBlock,
                hasShiftedBlock: pageHasShiftedBlock,
                hasFloatingTransform: pageHasFloatingTransform,
              })

              return (
              <div
                key={pageIdx}
                ref={el => { pageRefs.current[pageIdx] = el }}
                className={`a4-page ${isCoverPage ? 'a4-page--cover' : ''}`}
                data-page-index={pageIdx}
                data-editor-page-active="true"
                onMouseDownCapture={handleCanvasPageMouseDownCapture}
                style={{ position: 'relative', ...pageLayerStyle, ...(pageBgColor ? { backgroundColor: pageBgColor } : {}) }}
              >
                {/* Guias visuais */}
                {showRulers && pageConfig.guides && pageConfig.guides.length > 0 && (
                  <div className="page-guides-overlay absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 100 }}>
                    {pageConfig.guides.map(guide => (
                      guide.type === 'vertical' ? (
                        <div
                          key={guide.id}
                          className="absolute top-0 bottom-0 w-px"
                          style={{ left: `${guide.position}px`, backgroundColor: guide.color, opacity: 0.6 }}
                        />
                      ) : (
                        <div
                          key={guide.id}
                          className="absolute left-0 right-0 h-px"
                          style={{ top: `${guide.position}px`, backgroundColor: guide.color, opacity: 0.6 }}
                        />
                      )
                    ))}
                  </div>
                )}

                {/* Marca d'água */}
                {watermark?.enabled && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
                    {watermark.type === 'text' ? (
                      <span style={{
                        fontSize: `${watermark.fontSize || 80}px`,
                        fontWeight: 900,
                        color: `rgba(0, 0, 0, ${watermark.opacity || 0.08})`,
                        transform: `rotate(${watermark.rotation || -30}deg)`,
                        whiteSpace: 'nowrap',
                        userSelect: 'none',
                        letterSpacing: '8px',
                        textTransform: 'uppercase',
                      }}>
                        {watermark.text || 'RASCUNHO'}
                      </span>
                    ) : watermark.imageUrl ? (
                      <img
                        src={watermark.imageUrl}
                        alt=""
                        style={{
                          opacity: watermark.opacity || 0.08,
                          transform: `rotate(${watermark.rotation || 0}deg)`,
                          maxWidth: '60%',
                          maxHeight: '60%',
                          objectFit: 'contain',
                          userSelect: 'none',
                          pointerEvents: 'none',
                        }}
                      />
                    ) : null}
                  </div>
                )}

                {/* Cabeçalho */}
                {showHeader ? (
                  <HeaderFooterBar
                    config={pageConfig.header}
                    type="header"
                    context={hfContext}
                    pageIndex={pageIdx}
                  />
                ) : !isCoverPage ? (
                  <div className="a4-page-header" style={{ borderBottom: 'none', padding: '8px 60px 0' }} />
                ) : null}

                {/* Conteúdo dos blocos */}
                <div 
                  className="a4-page-content"
                  style={!isCoverPage && pageConfig.margins ? {
                    ...(pageHasShiftedBlock || pageHasSelectedBlock ? { overflow: 'visible' } : {}),
                    paddingLeft: `${pageConfig.margins.left}px`,
                    paddingRight: `${pageConfig.margins.right}px`,
                    paddingTop: `${pageConfig.margins.top / 4}px`,
                    paddingBottom: `${pageConfig.margins.bottom / 4}px`,
                  } : (pageHasShiftedBlock || pageHasSelectedBlock ? { overflow: 'visible' } : undefined)}
                >
                  {pageBlocks.map(block => {
                    const fragment = getPaginationFragmentData(block)
                    const sourceBlockId = getPaginationSourceBlockId(block)
                    const sourceBlock = fragment ? blocksRef.current.find(item => item.id === sourceBlockId) : null
                    const interactionBlock = sourceBlock ?? block
                    const isVirtualFragment = Boolean(fragment)
                    const isInlineEditing = !isVirtualFragment && inlineEditingBlockId === sourceBlockId
                    const blockMode = isInlineEditing
                      ? 'editing'
                      : sourceBlockId === selectedBlockId
                        ? 'selected'
                        : 'idle'

                    const bStyle = !['cover', 'page_break', 'separator'].includes(block.block_type)
                      ? {
                          ...blockStyleToCSS(block.render_data?.style as BlockStyle | undefined),
                          ...canvasBlockLayoutToCSS(block.render_data),
                        }
                      : {}

                    return (
                      <EditableBlock
                        key={block.id}
                        block={block}
                        mode={blockMode}
                        style={bStyle}
                        previewStateKey={block.block_type === 'cover'
                          ? `${selectedTextId ?? ''}|${editingTextId ?? ''}|${selectedOverlayId ?? ''}`
                          : undefined}
                        blockRef={el => {
                          canvasRefs.current[block.id] = el
                          if (!isVirtualFragment || fragment?.index === 0 || !canvasRefs.current[sourceBlockId]) {
                            canvasRefs.current[sourceBlockId] = el
                          }
                        }}
                        focusPoint={isInlineEditing ? inlineEditFocusPoint : null}
                        onSelect={() => {
                          selectBlock(sourceBlockId)
                          const nextInlineEditingBlockId = getInlineEditingBlockAfterCanvasBlockClick({
                            inlineEditingBlockId,
                            clickedBlockId: isVirtualFragment ? null : sourceBlockId,
                          })
                          setInlineEditingBlockId(nextInlineEditingBlockId)
                          if (!nextInlineEditingBlockId) setInlineEditFocusPoint(null)
                          if (interactionBlock.block_type !== 'cover') setCoverTitleEditing(false)
                        }}
                        onPrimaryAction={(_editableBlock, focusPoint) => openPrimaryCanvasActionForBlock(interactionBlock as EditorBlock, focusPoint)}
                        onExitInlineEdit={exitInlineEdit}
                        onTitleChange={handleCanvasInlineTitleChange}
                        onContentChange={handleCanvasInlineContentChange}
                        onAIAction={handleAITextAction}
                        renderPreview={() => (
                          <>
                          <CanvasMaterialPreview
                            block={block}
                            brandKit={{
                              primaryColor: school?.primary_color,
                              secondaryColor: school?.secondary_color,
                            }}
                            coverTitleEditing={coverTitleEditing}
                            musicRendererSnapshotCacheRef={musicRendererSnapshotCacheRef}
                            canHydrateMusicRenderer={!blockUsesAlphaTab(block) || hydratingAlphaTabBlockIds.has(block.id)}
                            overlayElements={block.block_type === 'cover' ? overlayElements : undefined}
                            selectedOverlayId={block.block_type === 'cover' ? selectedOverlayId : undefined}
                            onOverlaySelect={block.block_type === 'cover' ? selectOverlayElement : undefined}
                            onOverlayUpdate={block.block_type === 'cover' ? updateOverlayElement : undefined}
                            onOverlayCloneForDrag={block.block_type === 'cover' ? cloneOverlayElementForDrag : undefined}
                            textElements={block.block_type === 'cover' ? textElements : undefined}
                            selectedTextId={block.block_type === 'cover' ? selectedTextId : undefined}
                            editingTextId={block.block_type === 'cover' ? editingTextId : undefined}
                            onTextSelect={block.block_type === 'cover' ? selectTextElement : undefined}
                            onTextUpdate={block.block_type === 'cover' ? updateTextElement : undefined}
                            onTextEditStart={block.block_type === 'cover' ? setEditingTextId : undefined}
                            onTextCopy={block.block_type === 'cover' ? copyTextElement : undefined}
                            onTextDuplicate={block.block_type === 'cover' ? duplicateTextElement : undefined}
                            onTextDelete={block.block_type === 'cover' ? removeTextElement : undefined}
                            onTextCloneForDrag={block.block_type === 'cover' ? cloneTextElementForDrag : undefined}
                            onTextLayerChange={block.block_type === 'cover' ? updateTextLayer : undefined}
                            onLegacyCoverTextActivate={block.block_type === 'cover' ? initTextElements : undefined}
                            onLegacyNotationStavePointerDown={handleCanvasNotationStavePointerDown}
                            onChordGridItemClick={handleCanvasChordGridItemClick}
                            onKeyboardGridItemClick={handleCanvasKeyboardGridItemClick}
                            onCoverPositionChange={handleCanvasCoverPositionChange}
                            onCoverRenderDataChange={handleCanvasCoverRenderDataChange}
                            onCoverLogoDuplicate={handleCanvasCoverLogoDuplicate}
                            onCoverTitleChange={handleCanvasCoverTitleChange}
                          />
                          </>
                        )}
                      />
                    )
                  })}

                  {pageBlocks.length === 0 && pageIdx === 0 && (
                    <div className="text-center py-16 text-[#94a3b8] text-sm">
                      Material sem blocos. Adicione blocos usando o painel à esquerda.
                    </div>
                  )}
                </div>

                {/* Rodapé */}
                {showFooter ? (
                  <HeaderFooterBar
                    config={pageConfig.footer}
                    type="footer"
                    context={hfContext}
                    pageIndex={pageIdx}
                  />
                ) : !isCoverPage ? (
                  <div className="a4-page-footer" style={{ borderTop: 'none', padding: '0 60px 8px' }} />
                ) : null}

                {/* ── Floating Elements desta página ── */}
                {floatingElements
                  .filter((el) => el.pageIndex === pageIdx && el.visible)
                  .sort((a, b) => a.zIndex - b.zIndex)
                  .map((el) => (
                    <FloatingElementRenderer
                      key={el.id}
                      element={el}
                      isSelected={selectedFloatingId === el.id}
                      isEditing={editingFloatingId === el.id}
                      onSelect={() => {
                        setSelectedFloatingId(el.id)
                        setSelectedBlockId(null)
                        setInlineEditingBlockId(null)
                        setToolbarPosition(null)
                      }}
                      onDoubleClick={() => {
                        if (el.type === 'floating_text' && !el.locked) {
                          setEditingFloatingId(el.id)
                        }
                      }}
                      onDragStart={(e) => handleFloatingDragStart(e, el.id)}
                      onResizeStart={(e, handle) => handleFloatingResizeStart(e, el.id, handle)}
                      onRotateStart={(e) => handleFloatingRotateStart(e, el.id)}
                      isTransforming={floatingTransformState?.id === el.id}
                      isRotating={floatingTransformState?.id === el.id && floatingTransformState.type === 'rotate'}
                      rotationPreview={floatingTransformState?.id === el.id ? floatingTransformState.rotation ?? null : null}
                      onDuplicate={() => duplicateFloatingElement(el.id)}
                      onDelete={() => removeFloatingElement(el.id)}
                      onToggleLock={() => updateFloatingElement(el.id, { locked: !el.locked })}
                      onBringForward={() => bringFloatingElementForward(el.id)}
                      onSendBackward={() => sendFloatingElementBackward(el.id)}
                      onOpenLayers={() => setShowLayersPanel(true)}
                      onResetRotation={() => updateFloatingElement(el.id, { rotation: 0 })}
                      onUpdate={(updates) => updateFloatingElement(el.id, updates)}
                      onStopEditing={() => setEditingFloatingId(null)}
                      onEditText={() => setEditingFloatingId(el.id)}
                    />
                  ))}
              </div>
              )
            })}
          </div>
          </div>{/* fecha grid réguas+canvas */}
          </div>
        </EditorCanvas>
        <MusicSnapshotPreheater
          blocks={blocks}
          enabled={initialLoadDone.current && blocks.length > 0}
          musicRendererSnapshotCacheRef={musicRendererSnapshotCacheRef}
        />

        {/* Botão toggle sidebar direita */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost" size="sm"
                className="self-start mt-3 z-40 h-8 w-6 p-0 rounded-r-none shrink-0
                           bg-card border border-r-0 border-border hover:bg-accent/10"
                onClick={() => setRightSidebarOpen(prev => !prev)}
              >
                {rightSidebarOpen ? <CaretRight size={12} /> : <CaretLeft size={12} />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>{rightSidebarOpen ? 'Esconder propriedades (Ctrl+])' : 'Mostrar propriedades (Ctrl+])'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Coluna 3 — Propriedades */}
        <PropertiesSidebar open={rightSidebarOpen}>
          {(() => {
            const selectedBlock = propertiesSelectedBlock
            return (
              <>
          {/* ── Painel de propriedades do Floating Element ── */}
          {selectedFloating && !selectedBlock ? (
            <div className="space-y-3 pb-4">
              {/* Header com nome e tipo */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {selectedFloating.type === 'floating_text' && <TextT size={16} className="text-accent" />}
                  {selectedFloating.type === 'floating_image' && <ImageIcon size={16} className="text-accent" />}
                  {selectedFloating.type === 'shape' && <Hash size={16} className="text-accent" />}
                  {selectedFloating.type === 'iconify_icon' && <Sparkle size={16} className="text-accent" />}
                  <Input
                    value={selectedFloating.name}
                    onChange={(e) => updateFloatingElement(selectedFloating.id, { name: e.target.value })}
                    className="h-7 text-[12px] font-medium border-none bg-transparent p-0"
                  />
                </div>
                <div className="flex gap-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost" size="sm" className="h-7 w-7 p-0"
                          onClick={() => updateFloatingElement(selectedFloating.id, { locked: !selectedFloating.locked })}
                        >
                          {selectedFloating.locked
                            ? <Eye size={14} className="text-dourado" />
                            : <EyeSlash size={14} />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{selectedFloating.locked ? 'Desbloquear' : 'Bloquear'}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Button
                    variant="ghost" size="sm"
                    className="h-7 w-7 p-0 text-text3 hover:text-vermelho"
                    onClick={() => removeFloatingElement(selectedFloating.id)}
                  >
                    <Trash size={14} />
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Posição e Tamanho */}
              <div className="space-y-2">
                <Label className="text-[10px] text-text3 uppercase tracking-wider">Posição e Tamanho</Label>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-0.5">
                    <Label className="text-[9px] text-text3">X</Label>
                    <input type="range" min={0} max={100} step={1}
                      value={selectedFloating.x}
                      onChange={(e) => updateFloatingElement(selectedFloating.id, { x: Number(e.target.value) })}
                      className="w-full accent-accent h-1.5"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-[9px] text-text3">Y</Label>
                    <input type="range" min={0} max={100} step={1}
                      value={selectedFloating.y}
                      onChange={(e) => updateFloatingElement(selectedFloating.id, { y: Number(e.target.value) })}
                      className="w-full accent-accent h-1.5"
                    />
                  </div>
                </div>

                <div className="space-y-0.5">
                  <Label className="text-[9px] text-text3">Largura</Label>
                  <div className="flex items-center gap-2">
                    <input type="range" min={5} max={100} step={1}
                      value={selectedFloating.width}
                      onChange={(e) => updateFloatingElement(selectedFloating.id, { width: Number(e.target.value) })}
                      className="flex-1 accent-accent h-1.5"
                    />
                    <span className="text-[10px] text-text3 w-8 font-mono">{selectedFloating.width}%</span>
                  </div>
                </div>

                <div className="space-y-0.5">
                  <Label className="text-[9px] text-text3">Rotação</Label>
                  <div className="flex items-center gap-2">
                    <input type="range" min={0} max={360} step={1}
                      value={selectedFloating.rotation}
                      onChange={(e) => updateFloatingElement(selectedFloating.id, { rotation: Number(e.target.value) })}
                      className="flex-1 accent-accent h-1.5"
                    />
                    <span className="text-[10px] text-text3 w-8 font-mono">{formatFloatingRotationForDisplay(selectedFloating.rotation)}°</span>
                  </div>
                </div>

                <div className="space-y-0.5">
                  <Label className="text-[9px] text-text3">Opacidade</Label>
                  <div className="flex items-center gap-2">
                    <input type="range" min={0} max={100} step={5}
                      value={Math.round(selectedFloating.opacity * 100)}
                      onChange={(e) => updateFloatingElement(selectedFloating.id, { opacity: Number(e.target.value) / 100 })}
                      className="flex-1 accent-accent h-1.5"
                    />
                    <span className="text-[10px] text-text3 w-8 font-mono">{Math.round(selectedFloating.opacity * 100)}%</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Controles específicos por tipo */}
              {selectedFloating.type === 'floating_text' && (
                <FloatingTextProperties
                  element={selectedFloating as FloatingText}
                  onUpdate={(updates) => updateFloatingElement(selectedFloating.id, updates)}
                />
              )}
              {selectedFloating.type === 'floating_image' && (
                <FloatingImageProperties
                  element={selectedFloating as FloatingImage}
                  onUpdate={(updates) => updateFloatingElement(selectedFloating.id, updates)}
                />
              )}
              {selectedFloating.type === 'shape' && (
                <FloatingShapeProperties
                  element={selectedFloating as FloatingShape}
                  onUpdate={(updates) => updateFloatingElement(selectedFloating.id, updates)}
                />
              )}
              {selectedFloating.type === 'iconify_icon' && (
                <FloatingIconProperties
                  element={selectedFloating as FloatingIcon}
                  onUpdate={(updates) => updateFloatingElement(selectedFloating.id, updates)}
                />
              )}

              <Separator />

              {/* Camadas rápidas */}
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="flex-1 h-7 text-[10px]"
                  onClick={() => {
                    const maxZ = Math.max(...floatingElements.map(e => e.zIndex), 0)
                    updateFloatingElement(selectedFloating.id, { zIndex: maxZ + 10 })
                  }}
                >
                  <ArrowFatUp size={12} className="mr-1" /> Frente
                </Button>
                <Button variant="ghost" size="sm" className="flex-1 h-7 text-[10px]"
                  onClick={() => updateFloatingElement(selectedFloating.id, { zIndex: 1 })}
                >
                  <ArrowFatDown size={12} className="mr-1" /> Trás
                </Button>
              </div>
            </div>
          ) : !selectedBlock ? (
            <div className="space-y-4 pb-4">
              <div className="prop-label mb-1" style={{ color: 'var(--accent)' }}>
                <Gear size={12} className="inline-block mr-1 mb-0.5" />
                Configuração da Página
              </div>
              <p className="text-[10px] text-text3 -mt-2 mb-3">
                As alterações aparecem na folha em tempo real.
              </p>

              {/* === CABEÇALHO E RODAPÉ === */}
              <div className="space-y-3 border-t border-border pt-3">
                <Label className="text-[11px] text-text3 uppercase tracking-wider">
                  Cabeçalho e Rodapé
                </Label>

                {availableBrandLogos.length > 0 && (
                  <div className="space-y-2 rounded-lg border border-border bg-card/50 p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-[10px] text-text3 uppercase tracking-wider">Identidade</Label>
                      {selectedHeaderFooterLogo && (
                        <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[9px] font-medium text-accent">
                          {selectedHeaderFooterLogo.label}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                        {availableBrandLogos.map(logo => {
                          const selected = selectedHeaderFooterLogo?.key === logo.key
                          return (
                            <button
                              key={logo.key}
                              type="button"
                              onClick={() => handleHeaderFooterLogoSelect(logo)}
                              className={cn(
                                'min-w-0 rounded-md border p-1.5 text-left transition-all',
                                'bg-white hover:border-accent/60 hover:bg-accent-soft',
                                selected ? 'border-accent ring-1 ring-accent/40' : 'border-border',
                              )}
                            >
                              <div className="flex h-7 items-center justify-center rounded bg-bg2">
                                <img src={logo.url} alt={`Logo ${logo.label}`} className="max-h-6 max-w-full object-contain" />
                              </div>
                              <div className="mt-1 truncate text-[9px] font-semibold text-text2">
                                {logo.label}
                              </div>
                            </button>
                          )
                        })}
                    </div>
                  </div>
                )}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 w-full justify-center gap-2 text-[10px]"
                  onClick={applySchoolIdentityToHeaderFooter}
                  disabled={!school}
                >
                  <MagicWand size={13} />
                  Aplicar identidade completa
                </Button>

                <Tabs defaultValue="header" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 h-8">
                    <TabsTrigger value="header" className="text-[11px]">Cabeçalho</TabsTrigger>
                    <TabsTrigger value="footer" className="text-[11px]">Rodapé</TabsTrigger>
                  </TabsList>

                  <TabsContent value="header" className="space-y-3 mt-2">
                    <HeaderFooterEditor
                      config={pageConfig.header}
                      type="header"
                      placeholderContext={headerFooterPreviewContext}
                      onChange={(config) => setPageConfig(prev => ({ ...prev, header: config }))}
                      onApplyTemplate={(template) => setPageConfig(prev => ({ ...prev, header: template }))}
                      onCopyAppearanceFromPair={() => setPageConfig(prev => ({
                        ...prev,
                        header: copyHeaderFooterAppearance({
                          source: prev.footer,
                          sourceType: 'footer',
                          target: prev.header,
                          targetType: 'header',
                        }),
                      }))}
                    />
                  </TabsContent>

                  <TabsContent value="footer" className="space-y-3 mt-2">
                    <HeaderFooterEditor
                      config={pageConfig.footer}
                      type="footer"
                      placeholderContext={headerFooterPreviewContext}
                      onChange={(config) => setPageConfig(prev => ({ ...prev, footer: config }))}
                      onApplyTemplate={(template) => setPageConfig(prev => ({ ...prev, footer: template }))}
                      onCopyAppearanceFromPair={() => setPageConfig(prev => ({
                        ...prev,
                        footer: copyHeaderFooterAppearance({
                          source: prev.header,
                          sourceType: 'header',
                          target: prev.footer,
                          targetType: 'footer',
                        }),
                      }))}
                    />
                  </TabsContent>
                </Tabs>
              </div>

              {/* Margens da Página */}
              <div className="space-y-3 border-t border-border pt-3">
                <Label className="text-[11px] text-text3 uppercase tracking-wider">
                  Margens da Página
                </Label>
                <PageMarginsPanel
                  margins={pageConfig.margins ?? DEFAULT_PAGE_MARGINS}
                  onChange={(margins) => setPageConfig(prev => ({ ...prev, margins }))}
                />
              </div>

              {/* Background da Página */}
              <PageBackgroundPanel
                background={pageConfig.background ?? DEFAULT_PAGE_BACKGROUND}
                onChange={(updates) => setPageConfig(prev => ({
                  ...prev,
                  background: { ...(prev.background ?? DEFAULT_PAGE_BACKGROUND), ...updates },
                }))}
              />

              <div className="text-[10px] text-text3 text-center mt-2">
                Clique em um bloco para editar suas propriedades
              </div>
            </div>
          ) : (
            <>
              <div className="prop-label mb-3" style={{ color: 'var(--accent)' }}>
                Propriedades do Bloco
              </div>

              {/* Tipo */}
              <div className="prop-section">
                <div className="prop-label">Tipo</div>
                <div className="flex items-center gap-2 px-3 py-2 bg-azul-soft rounded-md">
                  {(() => {
                    const cfg = getBlockConfig(selectedBlock.block_type)
                    const Icon = cfg.icon
                    return (
                      <>
                        <Icon size={16} style={{ color: cfg.color }} />
                        <span className="text-[12px] font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
                      </>
                    )
                  })()}
                  {selectedBlock.is_edited && (
                    <Badge variant="gold" className="text-[8px] ml-auto">editado</Badge>
                  )}
                </div>
                {selectedBlock.block_type === 'notation' && (
                  <Button size="sm" variant="outline" className="mt-2 h-8 w-full justify-center gap-2 border-master/30 text-master hover:bg-master/10" onClick={() => openNotationEditorForBlock(selectedBlock.id)}>
                    <MusicNotes size={14} weight="bold" /> Editar Notação
                  </Button>
                )}
                {selectedBlock.block_type === 'tablature' && (
                  <Button size="sm" variant="outline" className="mt-2 h-8 w-full justify-center gap-2 border-foundation/30 text-foundation hover:bg-foundation/10" onClick={() => openTablatureEditorForBlock(selectedBlock.id)}>
                    <ListNumbers size={14} weight="bold" /> Editar Tablatura
                  </Button>
                )}
                {selectedBlock.block_type === 'keyboard' && (
                  <Button size="sm" variant="outline" className="mt-2 h-8 w-full justify-center gap-2 border-master/30 text-master hover:bg-master/10" onClick={() => openKeyboardEditorForBlock(selectedBlock.id)}>
                    <PianoKeys size={14} weight="bold" /> Editar Teclado
                  </Button>
                )}
                {selectedBlock.block_type === 'chord_diagram' && (
                  <Button size="sm" variant="outline" className="mt-2 h-8 w-full justify-center gap-2 border-grow/30 text-grow hover:bg-grow/10" onClick={() => openChordEditorForBlock(selectedBlock.id)}>
                    <Guitar size={14} weight="bold" /> Editar Acorde
                  </Button>
                )}
                {selectedBlock.block_type === 'chord_grid' && (
                  <Button size="sm" variant="outline" className="mt-2 h-8 w-full justify-center gap-2 border-grow/30 text-grow hover:bg-grow/10" onClick={() => openChordEditorForGrid(selectedBlock.id)}>
                    <Guitar size={14} weight="bold" /> Adicionar Acorde
                  </Button>
                )}
                {selectedBlock.block_type === 'keyboard_grid' && (
                  <Button size="sm" variant="outline" className="mt-2 h-8 w-full justify-center gap-2 border-master/30 text-master hover:bg-master/10" onClick={() => openKeyboardEditorForGrid(selectedBlock.id)}>
                    <PianoKeys size={14} weight="bold" /> Adicionar Teclado
                  </Button>
                )}
              </div>

              {/* Conteúdo */}
              {!['cover', 'page_break', 'separator', 'qr_code'].includes(selectedBlock.block_type) && (
                <PropertiesCollapsibleSection
                  title="Conteúdo"
                  subtitle={['text', 'tip', 'exercise', 'title'].includes(selectedBlock.block_type)
                    ? 'Titulo e texto editavel do bloco.'
                    : 'Titulo e status principal do bloco.'}
                  open={isPropertiesSectionOpen(selectedBlock.block_type, 'content', true)}
                  onOpenChange={(open) => setPropertiesSectionOpen(selectedBlock.block_type, 'content', open)}
                >
                  {selectedBlock.block_type === 'title' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="prop-label mb-0">Templates de titulo</div>
                          <p className="text-[9px] leading-snug text-text3">Aplica um visual pronto sem apagar o texto.</p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 rounded-md px-2 text-[10px]"
                          onClick={() => applyTitleTemplate('legacy')}
                        >
                          Limpar
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {TITLE_TEMPLATE_PRESETS.map(template => {
                          const renderData = (selectedBlock.render_data ?? {}) as Record<string, any>
                          const activeTemplate = renderData.title_template_id ?? null
                          const isActive = activeTemplate === template.id
                          return (
                            <button
                              key={template.id}
                              type="button"
                              onClick={() => applyTitleTemplate(template.id)}
                              className={cn(
                                'group rounded-[12px] border bg-white p-2 text-left transition hover:border-accent/60 hover:shadow-sm',
                                isActive ? 'border-accent ring-2 ring-accent/15' : 'border-border',
                              )}
                            >
                              <div className="mb-1.5 flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="truncate text-[11px] font-semibold text-text">{template.name}</div>
                                  <div className="truncate text-[8px] text-text3">{template.description}</div>
                                </div>
                                {isActive && <Badge variant="gold" className="text-[8px]">ativo</Badge>}
                              </div>
                              <div className="overflow-hidden rounded-[10px] border border-border/60 bg-bg2/50 p-1.5">
                                <TitleTemplateRenderer
                                  templateId={template.id}
                                  title="Modulo 1"
                                  subtitle="Elementos Basicos da Musica"
                                  accentColor={String(school?.primary_color ?? renderData.brand_primary_color ?? '#1E3A5F')}
                                  secondaryColor={String(school?.secondary_color ?? renderData.brand_secondary_color ?? '#FF2D78')}
                                  compact
                                />
                              </div>
                            </button>
                          )
                        })}
                      </div>
                      {!((selectedBlock.render_data ?? {}) as Record<string, any>).title_template_id && (
                        <Button
                          type="button"
                          size="sm"
                          className="h-8 w-full rounded-md bg-accent text-[11px] text-white hover:bg-accent/90"
                          onClick={() => applyTitleTemplate(DEFAULT_TITLE_TEMPLATE_ID)}
                        >
                          Aplicar recomendado
                        </Button>
                      )}
                    </div>
                  )}

                  <div>
                    <div className="prop-label">Título</div>
                    <div className="title-editor-compact">
                      <RichTextEditor
                        key={`title-${selectedBlock.id}`}
                        content={
                          (selectedBlock.content as any)?.title_html
                          ?? `<p>${selectedBlock.title ?? ''}</p>`
                        }
                        onChange={(html) => {
                          const plainText = html.replace(/<[^>]+>/g, '').trim()
                          setBlockWithHistory(selectedBlockId, b => ({
                              ...b,
                              title: plainText,
                              content: { ...(b.content ?? {}), title_html: html },
                          }))
                          queueBlockAutosave(selectedBlockId)
                        }}
                        placeholder="Título do bloco"
                        variant="title"
                        className="[&_.tiptap_p]:mb-0 [&_.tiptap_h1]:mb-0 [&_.tiptap_h2]:mb-0 [&_.tiptap_h3]:mb-0"
                      />
                    </div>
                  </div>

                  {['text', 'tip', 'exercise', 'title'].includes(selectedBlock.block_type) ? (
                    <div>
                      <div className="prop-label">Texto</div>
                      <RichTextEditor
                        key={selectedBlock.id}
                        content={ensureHtml((selectedBlock.content as any)?.html ?? (selectedBlock.content as any)?.text ?? '')}
                        onChange={(html) => {
                          setBlockWithHistory(selectedBlockId, b => ({
                              ...b,
                              content: { ...(b.content ?? {}), html, text: htmlToMarkdown(html) },
                          }))
                          queueBlockAutosave(selectedBlockId)
                        }}
                        placeholder="Conteúdo do bloco"
                        compact
                        onAIAction={handleAITextAction}
                      />
                    </div>
                  ) : (
                    <div className="rounded-md bg-bg2 px-2.5 py-2 text-[10px] leading-snug text-text3">
                      {selectedBlock.block_type === 'notation' && `${(selectedBlock.render_data as any)?.notation?.staves?.[0]?.notes?.length ?? 0} notas cadastradas.`}
                      {selectedBlock.block_type === 'tablature' && 'Tablatura editavel no editor visual.'}
                      {selectedBlock.block_type === 'keyboard' && `${((selectedBlock.render_data as any)?.keys as string[])?.length ?? 0} teclas destacadas.`}
                      {selectedBlock.block_type === 'chord_diagram' && `Acorde: ${(selectedBlock.render_data as any)?.chord_name ?? 'nao definido'}.`}
                      {selectedBlock.block_type === 'chord_grid' && `${((selectedBlock.render_data as any)?.chords as any[])?.length ?? 0} acordes na grade.`}
                      {selectedBlock.block_type === 'keyboard_grid' && `${((selectedBlock.render_data as any)?.keyboards as any[])?.length ?? 0} teclados na grade.`}
                      {!['notation', 'tablature', 'keyboard', 'chord_diagram', 'chord_grid', 'keyboard_grid'].includes(selectedBlock.block_type) && 'Configure os controles especificos abaixo.'}
                    </div>
                  )}
                </PropertiesCollapsibleSection>
              )}

              {/* Tablatura — botão para abrir editor visual */}
              {selectedPaginationPolicy && !['cover', 'page_break'].includes(selectedBlock.block_type) && (
                <PropertiesCollapsibleSection
                  title="Paginação"
                  subtitle="Quebras, acoplamento e espacos no PDF."
                  open={isPropertiesSectionOpen(selectedBlock.block_type, 'pagination', false)}
                  onOpenChange={(open) => setPropertiesSectionOpen(selectedBlock.block_type, 'pagination', open)}
                >
                  <div className="space-y-2 rounded-lg border border-border bg-bg/70 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <Label className="text-[11px] font-semibold text-text">Manter com próximo</Label>
                        <p className="mt-0.5 text-[9px] leading-snug text-text3">Evita separar título/enunciado do bloco seguinte.</p>
                      </div>
                      <Switch
                        checked={selectedPaginationPolicy.keepWithNext}
                        onCheckedChange={(checked) => updateBlockPaginationPolicy({ keepWithNext: checked })}
                      />
                    </div>
                    {selectedPaginationPolicy.keepWithNext && (
                      <div className="rounded-md border border-dourado/30 bg-dourado/10 px-2 py-2">
                        <p className="text-[10px] leading-snug text-text3">
                          Este bloco est&aacute; acoplado ao pr&oacute;ximo. Solte apenas quando quiser permitir que ele suba sozinho na pagina&ccedil;&atilde;o.
                        </p>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="mt-2 h-7 w-full border-dourado/40 text-[10px] text-dourado hover:bg-dourado/10"
                          onClick={() => updateBlockPaginationPolicy({ keepWithNext: false })}
                        >
                          Soltar do pr&oacute;ximo
                        </Button>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-2">
                      <div>
                        <Label className="text-[11px] font-semibold text-text">Começar em nova página</Label>
                        <p className="mt-0.5 text-[9px] leading-snug text-text3">Força este bloco a abrir uma nova página A4.</p>
                      </div>
                      <Switch
                        checked={selectedPaginationPolicy.startOnNewPage}
                        onCheckedChange={(checked) => updateBlockPaginationPolicy({ startOnNewPage: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-2">
                      <div>
                        <Label className="text-[11px] font-semibold text-text">Permitir quebra</Label>
                        <p className="mt-0.5 text-[9px] leading-snug text-text3">
                          {['text', 'tip', 'exercise', 'columns'].includes(selectedBlock.block_type)
                            ? 'Permite dividir visualmente textos longos entre páginas.'
                            : 'Blocos musicais ficam inteiros para preservar partitura e PDF.'}
                        </p>
                      </div>
                      <Switch
                        checked={selectedPaginationPolicy.allowSplit}
                        disabled={!['text', 'tip', 'exercise', 'columns'].includes(selectedBlock.block_type)}
                        onCheckedChange={(checked) => updateBlockPaginationPolicy({
                          allowSplit: checked,
                          behavior: checked ? 'breakable' : 'unbreakable',
                        })}
                      />
                    </div>

                    <div className="rounded-md bg-bg2 px-2 py-1.5 text-[10px] text-text3">
                      Política atual: <span className="font-semibold text-text">{describePaginationPolicy(selectedPaginationPolicy)}</span>
                    </div>

                    <div className="space-y-2 border-t border-border/70 pt-2">
                      <div className="flex items-center gap-2">
                        <Label className="w-20 text-[10px] text-text3">Espaço antes</Label>
                        <input
                          type="range"
                          min={0}
                          max={96}
                          step={4}
                          value={selectedBlockStyle.margin.top}
                          onChange={(event) => updateBlockStyle({
                            margin: { ...selectedBlockStyle.margin, top: Number(event.target.value) },
                          })}
                          className="h-1 flex-1 accent-accent"
                        />
                        <span className="w-9 text-right font-mono text-[10px] text-text3">{selectedBlockStyle.margin.top}px</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="w-20 text-[10px] text-text3">Espaço depois</Label>
                        <input
                          type="range"
                          min={0}
                          max={96}
                          step={4}
                          value={selectedBlockStyle.margin.bottom}
                          onChange={(event) => updateBlockStyle({
                            margin: { ...selectedBlockStyle.margin, bottom: Number(event.target.value) },
                          })}
                          className="h-1 flex-1 accent-accent"
                        />
                        <span className="w-9 text-right font-mono text-[10px] text-text3">{selectedBlockStyle.margin.bottom}px</span>
                      </div>
                    </div>
                  </div>
                </PropertiesCollapsibleSection>
              )}

              {selectedBlock.block_type === 'tablature' && (
                <div className="prop-section">
                  <div className="prop-label">Tablatura</div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full justify-center gap-2 border-foundation/30 text-foundation hover:bg-foundation/10"
                    onClick={() => openTablatureEditorForBlock(selectedBlock.id)}
                  >
                    <ListNumbers size={14} weight="bold" />
                    Editar Tablatura
                  </Button>
                </div>
              )}

              {/* Notação — botão para abrir editor visual */}
              {(selectedBlock.block_type === 'notation' || blockHasNotation(selectedBlock)) && (
                <div className="prop-section">
                  <div className="prop-label">
                    {selectedBlock.block_type === 'notation' ? 'Notação' : 'Notação do bloco'}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full justify-center gap-2 border-master/30 text-master hover:bg-master/10"
                    onClick={() => openNotationEditorForBlock(selectedBlock.id)}
                  >
                    <MusicNotes size={14} weight="bold" />
                    {selectedBlock.block_type === 'notation' ? 'Editar Notação' : 'Editar Pauta'}
                  </Button>
                  {blockHasNotation(selectedBlock) && (
                    <div className="text-[10px] text-text3 mt-1 text-center">
                      {(selectedBlock.render_data as any)?.notation?.staves?.[0]?.notes?.length ?? 0} notas · clave {(selectedBlock.render_data as any)?.clef ?? 'Sol'}
                    </div>
                  )}

                  {/* Labels das pautas — editáveis */}
                  {(() => {
                    const staves = (selectedBlock.render_data as any)?.notation?.staves as any[] | undefined
                    if (!staves || staves.length === 0) return null
                    const hasLabels = staves.some((s: any) => s.label !== undefined)
                    if (!hasLabels && staves.length <= 1) return null
                    return (
                      <div className="mt-2.5 space-y-1.5">
                        <div className="text-[10px] text-text3 font-medium uppercase tracking-wider">Legendas das pautas</div>
                        {staves.map((stave: any, idx: number) => (
                          <Input
                            key={idx}
                            value={stave.label ?? ''}
                            onChange={e => {
                              const newStaves = staves.map((s: any, i: number) =>
                                i === idx ? { ...s, label: e.target.value } : s
                              )
                              const notation = { ...(selectedBlock.render_data as any)?.notation, staves: newStaves }
                              updateSelectedRenderData('notation', notation)
                            }}
                            placeholder={`Legenda da pauta ${idx + 1}`}
                            className="h-7 text-[11px]"
                          />
                        ))}
                      </div>
                    )
                  })()}
                </div>
              )}

              {/* Acorde — botão para abrir editor visual */}
              {selectedBlock.block_type === 'chord_diagram' && (
                <div className="prop-section">
                  <div className="prop-label">Diagrama</div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full justify-center gap-2 border-grow/30 text-grow hover:bg-grow/10"
                    onClick={() => openChordEditorForBlock(selectedBlock.id)}
                  >
                    <Guitar size={14} weight="bold" /> Editar Acorde
                  </Button>
                  {(selectedBlock.render_data as any)?.chord_name && (
                    <div className="text-[10px] text-text3 mt-1 text-center">
                      Acorde: {(selectedBlock.render_data as any).chord_name}
                    </div>
                  )}
                </div>
              )}

              {/* Capa — formulário de campos */}
              {selectedBlock.block_type === 'cover' && (
                <div className="prop-section space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="prop-label">Dados da Capa</div>
                      <p className="cover-helper mt-1">Imagem, textos e identidade visual da capa.</p>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 shrink-0 gap-1.5 rounded-xl border-accent/30 px-2.5 text-[10px] font-semibold text-accent hover:bg-accent/10"
                          disabled={!school}
                        >
                          <MagicWand size={13} weight="bold" />
                          Brand Kit
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Aplicar identidade da escola?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Isso aplica a logo principal, fontes padrão e paleta do Brand Kit nesta capa. A imagem de fundo e a composição atual serão preservadas sempre que possível.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={applySchoolIdentityToCover}>
                            Aplicar identidade
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                  <Tabs value={coverPropertiesTab} onValueChange={value => setCoverPropertiesTab(value as typeof coverPropertiesTab)} className="cover-properties-tabs w-full">
                    <TabsList className="grid w-full grid-cols-4 h-9">
                      <TabsTrigger value="imagem" className="px-1 text-[11px]">Imagem</TabsTrigger>
                      <TabsTrigger value="textos" className="px-1 text-[11px]">Textos</TabsTrigger>
                      <TabsTrigger value="elementos" className="px-1 text-[11px]">Elementos</TabsTrigger>
                      <TabsTrigger value="metadados" className="px-1 text-[11px]">Dados</TabsTrigger>
                    </TabsList>

                    <TabsContent value="imagem" className="cover-image-tab mt-3 space-y-4">
                  <div>
                    <label className="cover-field-label block mb-1.5">Direção visual</label>
                    {(() => {
                      const currentDirection = resolveCoverVisualDirection(selectedBlock.render_data)
                      return (
                        <>
                          <LASelect
                            value={currentDirection.value}
                            onValueChange={value => updateSelectedRenderData('cover_visual_direction', value)}
                            options={COVER_VISUAL_DIRECTIONS.map(direction => ({
                              value: direction.value,
                              label: direction.label,
                            }))}
                            placeholder="Selecionar direcao"
                          />
                          <p className="cover-helper mt-1.5">{currentDirection.description}</p>
                        </>
                      )
                    })()}
                  </div>
                  <div className="rounded-[16px] border border-border bg-paper p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="cover-field-label">Capas salvas</div>
                        <p className="cover-helper mt-1">Reutilize composições aprovadas da escola.</p>
                      </div>
                      <Dialog open={saveCoverTemplateOpen} onOpenChange={setSaveCoverTemplateOpen}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 shrink-0 gap-1.5 rounded-xl px-2.5 text-[10px] font-semibold"
                          onClick={() => {
                            setCoverTemplateName(
                              ((selectedBlock.render_data as any)?.titulo as string | undefined)
                              || materialTitle
                              || 'Nova capa'
                            )
                            setCoverTemplateDescription('')
                            setSaveCoverTemplateOpen(true)
                          }}
                        >
                          <BookmarkSimple size={13} weight="bold" />
                          Salvar
                        </Button>
                        <DialogContent className="sm:max-w-[420px]">
                          <DialogHeader>
                            <DialogTitle>Salvar capa como modelo</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-3 py-2">
                            <div className="space-y-1.5">
                              <Label>Nome do modelo</Label>
                              <Input
                                value={coverTemplateName}
                                onChange={event => setCoverTemplateName(event.target.value)}
                                placeholder="Ex: Teoria moderna laranja"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label>Descrição</Label>
                              <Textarea
                                value={coverTemplateDescription}
                                onChange={event => setCoverTemplateDescription(event.target.value)}
                                placeholder="Ex: Para apostilas de teoria, com piano geométrico e logo no topo."
                                className="min-h-[90px] resize-none"
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setSaveCoverTemplateOpen(false)}>
                              Cancelar
                            </Button>
                            <Button onClick={handleSaveCoverTemplate} disabled={coverTemplateSaving}>
                              {coverTemplateSaving ? <SpinnerGap size={14} className="animate-spin" /> : <FloppyDisk size={14} />}
                              Salvar modelo
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>

                    <div className="mt-3 space-y-2">
                      {coverTemplatesLoading ? (
                        <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-bg2 py-4 text-[11px] text-text3">
                          <SpinnerGap size={14} className="animate-spin" />
                          Carregando capas...
                        </div>
                      ) : coverTemplates.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border bg-bg2/50 px-3 py-4 text-center text-[11px] leading-relaxed text-text3">
                          Nenhuma capa salva ainda. Salve esta composição para reutilizar em outros materiais.
                        </div>
                      ) : (
                        coverTemplates.map(template => {
                          const renderData = (template.render_data ?? {}) as Record<string, any>
                          const thumbUrl = template.thumbnail_url ?? getCoverTemplateThumbnail(renderData)
                          const logoUrl = renderData.logo_url as string | undefined
                          return (
                            <div key={template.id} className="rounded-[14px] border border-border bg-card p-2.5">
                              <div className="flex gap-2">
                                <div
                                  className="relative h-16 w-20 shrink-0 overflow-hidden rounded-[10px] border border-border bg-bg2"
                                  style={thumbUrl ? { backgroundImage: `url(${thumbUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
                                >
                                  {!thumbUrl && logoUrl && (
                                    <img src={logoUrl} alt={template.name} className="h-full w-full object-contain p-2" />
                                  )}
                                  {!thumbUrl && !logoUrl && (
                                    <div className="flex h-full items-center justify-center text-[9px] text-text3">
                                      Capa
                                    </div>
                                  )}
                                  <div className="absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t from-black/45 to-transparent" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="truncate text-[12px] font-bold text-text">{template.name}</div>
                                  {template.description && (
                                    <div className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-text3">
                                      {template.description}
                                    </div>
                                  )}
                                  <div className="mt-1 text-[9px] text-text3">
                                    {template.updated_at ? new Date(template.updated_at).toLocaleDateString('pt-BR') : 'Modelo salvo'}
                                  </div>
                                </div>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <button
                                      type="button"
                                      className="h-7 w-7 rounded-lg border border-border text-text3 hover:border-vermelho/40 hover:text-vermelho"
                                      title="Excluir capa salva"
                                    >
                                      <Trash size={13} />
                                    </button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Excluir capa salva?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        O modelo "{template.name}" será removido da biblioteca da escola. A capa atual do material não será alterada.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteCoverTemplate(template.id)}>
                                        Excluir modelo
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                              <div className="mt-2 grid grid-cols-3 gap-1">
                                <button
                                  type="button"
                                  className="h-7 rounded-lg border border-border bg-bg2 text-[9px] font-semibold text-text2 hover:border-accent/40 hover:text-accent"
                                  onClick={() => applySavedCoverTemplate(template, 'complete')}
                                >
                                  Completo
                                </button>
                                <button
                                  type="button"
                                  className="h-7 rounded-lg border border-border bg-bg2 text-[9px] font-semibold text-text2 hover:border-accent/40 hover:text-accent"
                                  onClick={() => applySavedCoverTemplate(template, 'preserve-text')}
                                >
                                  Manter texto
                                </button>
                                <button
                                  type="button"
                                  className="h-7 rounded-lg border border-accent/25 bg-accent/10 text-[9px] font-bold text-accent hover:bg-accent/15"
                                  onClick={() => applySavedCoverTemplate(template, 'variation')}
                                >
                                  Variação
                                </button>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                  {/* Referência visual (opcional) */}
                  <div className="space-y-2">
                    <label className="cover-field-label block">
                      Referência Visual <span className="cover-field-meta">(opcional · até 5)</span>
                    </label>
                    <p className="cover-helper">
                      Envie exemplos de capas que você gosta. A IA vai seguir o estilo visual.
                    </p>
                    <input
                      ref={coverRefInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      multiple
                      className="hidden"
                      onChange={e => { if (e.target.files) handleCoverRefAdd(e.target.files); e.target.value = '' }}
                    />
                    {coverReferencePreviews.length > 0 && (
                      <div className="flex gap-1.5 flex-wrap">
                        {coverReferencePreviews.map((src, i) => (
                          <div key={i} className="relative group">
                            <img
                              src={src}
                              alt={`Ref ${i + 1}`}
                              className="w-14 h-14 rounded-md object-cover border border-border"
                            />
                            <button
                              onClick={() => handleCoverRefRemove(i)}
                              className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-vermelho text-white flex items-center justify-center text-[8px] opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {coverReferenceFiles.length < 5 && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full h-8 text-[11px] gap-1.5 border-dashed font-semibold"
                        onClick={() => coverRefInputRef.current?.click()}
                      >
                        <ImageIcon size={13} /> {coverReferenceFiles.length > 0 ? 'Adicionar mais' : 'Enviar referências'}
                      </Button>
                    )}
                  </div>
                  {/* Imagem de fundo IA */}
                  <div>
                    <label className="cover-field-label block mb-1.5">Imagem de Fundo (IA)</label>
                    {(selectedBlock.render_data as any)?.cover_image_url ? (
                      <div className="space-y-2">
                        <div className="relative rounded overflow-hidden border border-border">
                          <img
                            src={(selectedBlock.render_data as any).cover_image_url}
                            alt="Capa gerada"
                            className="w-full h-24 object-cover"
                          />
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-8 text-[11px] gap-1.5 border-accent/30 text-accent hover:bg-accent/10"
                            onClick={() => handleGenerateCoverImage(selectedBlock.id)}
                            disabled={coverImageLoading}
                          >
                            {coverImageLoading ? <SpinnerGap size={13} className="animate-spin" /> : <Sparkle size={13} weight="bold" />} Regenerar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-[11px] border-vermelho/30 text-vermelho hover:bg-vermelho/10"
                            onClick={() => updateSelectedRenderData('cover_image_url', null)}
                          >
                            <Trash size={13} />
                          </Button>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full justify-center gap-2 h-8 text-[11px] font-semibold"
                          onClick={handleOpenCoverLibrary}
                        >
                          <ImageIcon size={13} /> Trocar por imagem da Biblioteca
                        </Button>
                        {coverImageLoading && coverImageStatus && (
                          <p className="rounded-md bg-accent/10 px-2 py-1.5 text-center text-[10px] leading-snug text-accent">
                            {coverImageStatus}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full h-9 justify-center gap-2 border-accent/30 text-[12px] font-semibold text-accent hover:bg-accent/10"
                          onClick={() => handleGenerateCoverImage(selectedBlock.id)}
                          disabled={coverImageLoading}
                        >
                          {coverImageLoading ? (
                            <><SpinnerGap size={14} className="animate-spin" /> Gerando...</>
                          ) : (
                            <><Sparkle size={14} weight="bold" /> Gerar Capa com IA</>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full justify-center gap-2 h-8 text-[11px] font-semibold"
                          onClick={handleOpenCoverLibrary}
                        >
                          <ImageIcon size={13} /> Importar da Biblioteca
                        </Button>
                        {coverImageLoading && coverImageStatus && (
                          <p className="rounded-md bg-accent/10 px-2 py-1.5 text-center text-[10px] leading-snug text-accent">
                            {coverImageStatus}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  {/* Prompt personalizado para IA */}
                  <Collapsible
                    defaultOpen={Boolean((selectedBlock.render_data as any)?.cover_prompt)}
                    className="rounded-lg border border-border/70 bg-bg2/35"
                  >
                    <CollapsibleTrigger asChild>
                      <button className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left">
                        <span>
                          <span className="cover-field-label block">Prompt avançado</span>
                          <span className="cover-helper block">Opcional, para instruções específicas.</span>
                        </span>
                        <CaretRight size={14} className="text-text3" />
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="border-t border-border/60 p-3">
                    <Textarea
                      value={(selectedBlock.render_data as any)?.cover_prompt ?? ''}
                      onChange={e => updateSelectedRenderData('cover_prompt', e.target.value)}
                      placeholder="Ex: Capa minimalista com violão acústico, tons azuis e dourados, estilo profissional..."
                      className="min-h-[104px] resize-none text-[13px] leading-relaxed"
                      rows={3}
                    />
                    <div className="flex gap-1 mt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-8 text-[11px] gap-1.5 border-azul-claro/30 text-azul-claro hover:bg-azul-claro/10"
                        onClick={handleEnhanceCoverPrompt}
                        disabled={coverPromptLoading}
                      >
                        {coverPromptLoading ? (
                          <><SpinnerGap size={12} className="animate-spin" /> Melhorando...</>
                        ) : (
                          <><Sparkle size={12} weight="bold" /> Melhorar Prompt</>
                        )}
                      </Button>
                    </div>
                      <p className="cover-helper mt-1.5">
                        Descreva como quer a capa. Se vazio, a IA gera automaticamente com base nos dados.
                      </p>
                    </CollapsibleContent>
                  </Collapsible>
                    </TabsContent>

                    <TabsContent value="elementos" className="mt-3 space-y-3">
                  <div className="rounded-[var(--radius-sm)] border border-border bg-card/60 p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <label className="block text-[10px] font-medium uppercase tracking-wider text-text3">
                          Elementos do material
                        </label>
                        <p className="mt-0.5 text-[10px] leading-snug text-text3">
                          Use o painel unico da barra superior para formas, icones, SVG e PNG.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 shrink-0 gap-1.5 px-2 text-[10px]"
                        onClick={() => setElementsPickerOpen(true)}
                      >
                        <Shapes size={13} /> Abrir
                      </Button>
                    </div>
                  </div>

                  {/* Logomarca */}
                  <div className="space-y-2">
                    <label className="text-[10px] text-text3 block mb-1">Logomarca</label>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); e.target.value = '' }}
                    />
                    {availableBrandLogos.length > 0 && (
                      <div className="rounded-[14px] border border-border bg-paper p-2.5">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div>
                            <div className="text-[10px] uppercase tracking-[0.18em] text-accent font-bold">Do Brand Kit</div>
                            <div className="text-[9px] text-text3">Clique para aplicar na capa.</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {availableBrandLogos.map(logo => {
                            const isActive =
                              (selectedBlock.render_data as any)?.logo_url === logo.url
                              && (selectedBlock.render_data as any)?.logo_variant === logo.key
                            return (
                              <button
                                key={logo.key}
                                type="button"
                                onClick={() => applyBrandLogoToCover(logo.url, logo.key)}
                                className={cn(
                                  "group rounded-[12px] border bg-bg2 p-2 text-left transition hover:border-accent/60 hover:bg-accent/5",
                                  isActive ? "border-accent ring-2 ring-accent/15" : "border-border",
                                )}
                              >
                                <div className={cn(
                                  "h-12 rounded-[9px] border border-border flex items-center justify-center overflow-hidden",
                                  logo.key === 'dark' ? "bg-slate-950" : "bg-white",
                                )}>
                                  <img src={logo.url} alt={logo.label} className="max-h-full max-w-full object-contain p-1.5" />
                                </div>
                                <div className="mt-1.5 text-[10px] font-semibold text-text truncate">{logo.label}</div>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                    {(selectedBlock.render_data as any)?.logo_url ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 p-1.5 rounded border border-border bg-bg2">
                          <img
                            src={(selectedBlock.render_data as any).logo_url}
                            alt="Logomarca"
                            className="h-10 w-auto max-w-[80px] object-contain rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-[9px] text-text3 truncate">Logomarca carregada</div>
                            <div className="text-[9px] text-text3 opacity-60">Arraste na capa para posicionar</div>
                            {(selectedBlock.render_data as any)?.logo_source === 'brand-kit' && (
                              <div className="text-[9px] text-accent font-medium">
                                Brand Kit - {BRAND_LOGO_VARIANT_LABELS[((selectedBlock.render_data as any)?.logo_variant as BrandLogoVariantKey) ?? 'primary'] ?? 'Logo'}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <label className="text-[9px] text-text3 shrink-0">Tamanho:</label>
                          <input
                            type="range"
                            min={30}
                            max={200}
                            value={(selectedBlock.render_data as any)?.logo_size ?? 80}
                            onChange={e => updateSelectedRenderData('logo_size', Number(e.target.value))}
                            className="flex-1 h-1 accent-accent"
                          />
                          <span className="text-[9px] text-text3 w-8 text-right">{(selectedBlock.render_data as any)?.logo_size ?? 80}px</span>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-6 text-[9px] gap-1"
                            onClick={() => logoInputRef.current?.click()}
                          >
                            Enviar personalizada
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-[9px] border-vermelho/30 text-vermelho hover:bg-vermelho/10"
                            onClick={() => {
                              updateSelectedRenderData('logo_url', null)
                              updateSelectedRenderData('logo_pos', null)
                              updateSelectedRenderData('logo_size', null)
                              updateSelectedRenderData('logo_source', null)
                              updateSelectedRenderData('logo_variant', null)
                            }}
                          >
                            <Trash size={10} />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full justify-center gap-2 h-7 text-[10px]"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={logoUploading}
                      >
                        {logoUploading ? (
                          <><SpinnerGap size={12} className="animate-spin" /> Enviando...</>
                        ) : (
                          <><ImageIcon size={12} /> Enviar logo personalizada</>
                        )}
                      </Button>
                    )}
                  </div>
                  {/* ── Elementos Sobrepostos ── */}
                  <div className="space-y-2 border-t border-border pt-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-text3 uppercase tracking-wider font-medium">
                        Elementos
                      </label>
                      <button
                        onClick={() => { setElementPickerOpen(true); loadLibraryImages() }}
                        className="text-[10px] text-accent hover:text-accent/80 flex items-center gap-0.5"
                      >
                        <PlusCircle size={13} /> Adicionar
                      </button>
                    </div>

                    {overlayElements.length === 0 && (
                      <p className="text-[9px] text-text3/60 leading-relaxed">
                        Adicione imagens da biblioteca como camadas sobrepostas na capa. Arraste para posicionar.
                      </p>
                    )}

                    {overlayElements.map(el => (
                      <div
                        key={el.id}
                        className={`flex items-center gap-2 p-1.5 rounded-lg border transition-all cursor-pointer ${
                          selectedOverlayId === el.id
                            ? 'border-accent bg-accent/5'
                            : 'border-border bg-card hover:border-accent/30'
                        }`}
                        onClick={() => setSelectedOverlayId(selectedOverlayId === el.id ? null : el.id)}
                      >
                        <img src={el.image_url} alt={el.label} className="w-8 h-8 object-contain rounded" />
                        <span className="text-[10px] text-text2 flex-1 truncate">{el.label}</span>
                        <button
                          onClick={e => { e.stopPropagation(); setSelectedOverlayId(el.id) }}
                          className="p-0.5 text-text3 hover:text-accent"
                          title="Editar"
                        >
                          <SlidersHorizontal size={13} />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); removeOverlayElement(el.id) }}
                          className="p-0.5 text-text3 hover:text-vermelho"
                          title="Remover"
                        >
                          <Trash size={13} />
                        </button>
                      </div>
                    ))}

                    {/* Controles do elemento selecionado */}
                    {selectedOverlay && (
                      <div className="space-y-2 p-2 bg-card/50 rounded-lg border border-accent/20">
                        <span className="text-[10px] text-accent font-medium">{selectedOverlay.label}</span>

                        {/* Tamanho */}
                        <div className="flex items-center gap-2">
                          <ImageIcon size={11} className="text-text3 shrink-0" />
                          <input
                            type="range" min={5} max={80} step={1}
                            value={selectedOverlay.width}
                            onChange={e => updateOverlayElement(selectedOverlay.id, { width: +e.target.value })}
                            className="flex-1 h-1 accent-accent"
                          />
                          <span className="text-[9px] text-text3 w-8 text-right">{selectedOverlay.width}%</span>
                        </div>

                        {/* Rotação */}
                        <div className="flex items-center gap-2">
                          <ArrowsClockwise size={11} className="text-text3 shrink-0" />
                          <input
                            type="range" min={0} max={360} step={1}
                            value={selectedOverlay.rotation}
                            onChange={e => updateOverlayElement(selectedOverlay.id, { rotation: +e.target.value })}
                            className="flex-1 h-1 accent-accent"
                          />
                          <span className="text-[9px] text-text3 w-8 text-right">{selectedOverlay.rotation}°</span>
                        </div>

                        {/* Opacidade */}
                        <div className="flex items-center gap-2">
                          <Drop size={11} className="text-text3 shrink-0" />
                          <input
                            type="range" min={0} max={100} step={5}
                            value={Math.round(selectedOverlay.opacity * 100)}
                            onChange={e => updateOverlayElement(selectedOverlay.id, { opacity: +e.target.value / 100 })}
                            className="flex-1 h-1 accent-accent"
                          />
                          <span className="text-[9px] text-text3 w-8 text-right">{Math.round(selectedOverlay.opacity * 100)}%</span>
                        </div>

                        {/* Botões rápidos */}
                        <div className="flex gap-1 flex-wrap">
                          <button
                            onClick={() => updateOverlayElement(selectedOverlay.id, { shadow: !selectedOverlay.shadow })}
                            className={`px-2 py-0.5 rounded text-[9px] border transition-all ${
                              selectedOverlay.shadow ? 'bg-accent/15 text-accent border-accent/30' : 'bg-card text-text3 border-border'
                            }`}
                          >
                            Sombra
                          </button>
                          <button
                            onClick={() => updateOverlayElement(selectedOverlay.id, { flipX: !selectedOverlay.flipX })}
                            className={`px-2 py-0.5 rounded text-[9px] border transition-all ${
                              selectedOverlay.flipX ? 'bg-accent/15 text-accent border-accent/30' : 'bg-card text-text3 border-border'
                            }`}
                          >
                            Espelhar
                          </button>
                          <button
                            onClick={() => {
                              const maxZ = Math.max(...overlayElements.map(e => e.zIndex), 0)
                              updateOverlayElement(selectedOverlay.id, { zIndex: maxZ + 1 })
                            }}
                            className="px-2 py-0.5 rounded text-[9px] bg-card text-text3 border border-border hover:border-accent/30"
                          >
                            <ArrowFatUp size={10} className="inline mr-0.5" /> Frente
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── Tipografia Avançada ── */}
                    </TabsContent>

                    <TabsContent value="textos" className="mt-3 space-y-3">
                  <div className="space-y-2 border-t border-border pt-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-text3 uppercase tracking-wider font-medium">Textos</label>
                      {textElements.length === 0 ? (
                        <button onClick={initTextElements} className="text-[10px] text-accent hover:text-accent/80 flex items-center gap-0.5">
                          <TextT size={13} /> Ativar Tipografia
                        </button>
                      ) : (
                        <button onClick={addTextElement} className="text-[10px] text-accent hover:text-accent/80 flex items-center gap-0.5">
                          <PlusCircle size={13} /> Adicionar
                        </button>
                      )}
                    </div>

                    {textElements.length === 0 && (
                      <>
                        <p className="text-[9px] text-text3/60 leading-relaxed">
                          Clique em "Ativar Tipografia" para controlar fontes, cores, sombras e contorno dos textos da capa.
                        </p>
                        <div>
                          <label className="text-[10px] text-text3 block mb-1">Título da capa</label>
                          <Input
                            value={(selectedBlock.render_data as any)?.titulo ?? ''}
                            onChange={e => updateSelectedRenderData('titulo', e.target.value)}
                            placeholder={materialTitle || 'Título do material'}
                            className="h-8 text-[12px]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-text3 block mb-1">Tipografia do Título</label>
                          <div className="grid grid-cols-[1fr_auto_auto] gap-1.5 items-center">
                            <div className="flex items-center gap-1">
                              <input type="range" min={20} max={64}
                                value={(selectedBlock.render_data as any)?.title_font_size ?? 36}
                                onChange={e => updateSelectedRenderData('title_font_size', Number(e.target.value))}
                                className="flex-1 h-1 accent-accent" />
                              <span className="text-[9px] text-text3 w-8 text-right">{(selectedBlock.render_data as any)?.title_font_size ?? 36}px</span>
                            </div>
                            <input type="color" value={(selectedBlock.render_data as any)?.title_color ?? '#ffffff'}
                              onChange={e => updateSelectedRenderData('title_color', e.target.value)}
                              className="w-7 h-7 rounded border border-border cursor-pointer p-0.5" title="Cor do título" />
                            <div className="flex border border-border rounded overflow-hidden">
                              {[{ value: 'left', icon: TextAlignLeft }, { value: 'center', icon: TextAlignCenter }, { value: 'right', icon: TextAlignRight }].map(({ value, icon: Icon }) => (
                                <button key={value} onClick={() => updateSelectedRenderData('title_align', value)}
                                  className={`p-1 ${((selectedBlock.render_data as any)?.title_align ?? 'center') === value ? 'bg-accent/15 text-accent' : 'text-text3 hover:bg-bg2'}`}
                                  title={`Alinhar ${value}`}><Icon size={12} /></button>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] text-text3 block mb-1">Subtítulo</label>
                          <Input value={(selectedBlock.render_data as any)?.subtitulo ?? ''}
                            onChange={e => updateSelectedRenderData('subtitulo', e.target.value)}
                            placeholder="Descrição ou complemento" className="h-8 text-[12px]" />
                        </div>
                      </>
                    )}

                    {/* Lista de text_elements */}
                    {textElements.map(el => (
                      <div key={el.id}
                        className={`flex items-center gap-2 p-1.5 rounded-lg border transition-all cursor-pointer ${
                          selectedTextId === el.id ? 'border-[#8B5CF6] bg-[#8B5CF6]/5' : 'border-border bg-card hover:border-[#8B5CF6]/30'
                        }`}
                        onClick={() => {
                          const nextId = selectedTextId === el.id ? null : el.id
                          setSelectedTextId(nextId)
                          if (nextId) setCoverPropertiesTab('textos')
                        }}
                      >
                        <TextT size={14} className="text-text3 shrink-0" />
                        <span className="text-[10px] text-text2 flex-1 truncate" style={{ fontFamily: el.fontFamily }}>
                          {el.content}
                        </span>
                        {!['title', 'subtitle', 'instrument'].includes(el.id) && (
                          <button onClick={e => { e.stopPropagation(); removeTextElement(el.id) }}
                            className="p-0.5 text-text3 hover:text-vermelho" title="Remover">
                            <Trash size={13} />
                          </button>
                        )}
                      </div>
                    ))}

                    {/* ── Controles do texto selecionado ── */}
                    {selectedText && (
                      <div className="space-y-2.5 p-2.5 bg-card/50 rounded-lg border border-[#8B5CF6]/20">
                        <span className="text-[10px] text-[#8B5CF6] font-medium">
                          {selectedText.id === 'title' ? 'Título' : selectedText.id === 'subtitle' ? 'Subtítulo' : selectedText.id === 'instrument' ? 'Instrumento' : selectedText.content.slice(0, 20)}
                        </span>

                        {/* Conteúdo */}
                        <div className="space-y-1">
                          <label className="text-[9px] text-text3">Texto</label>
                          <Input value={selectedText.content}
                            onChange={e => updateTextElement(selectedText.id, { content: e.target.value })}
                            className="h-7 text-[11px]" />
                        </div>

                        {/* Fonte */}
                        <div className="space-y-1">
                          <label className="text-[9px] text-text3">Fonte</label>
                          <LAFontPicker
                            value={selectedText.fontFamily}
                            onValueChange={value => updateTextElement(selectedText.id, { fontFamily: value })}
                            context="cover"
                            className="h-8 w-full rounded-lg text-[11px]"
                          />
                        </div>

                        {/* Tamanho */}
                        <div className="space-y-0.5">
                          <label className="text-[9px] text-text3">Tamanho</label>
                          <div className="flex items-center gap-1">
                            <input type="range" min={12} max={120} step={1} value={selectedText.fontSize}
                              onChange={e => updateTextElement(selectedText.id, { fontSize: +e.target.value })}
                              className="flex-1 h-1 accent-[#8B5CF6]" />
                            <span className="text-[9px] text-text3 w-6 text-right">{selectedText.fontSize}</span>
                          </div>
                        </div>

                        {/* Peso + Itálico */}
                        <div className="space-y-0.5">
                          <label className="text-[9px] text-text3">Peso / Estilo</label>
                          <div className="flex items-center gap-1">
                            <div className="flex bg-card rounded border border-border overflow-hidden flex-1">
                              {([
                                { w: 300, label: 'L' },
                                { w: 400, label: 'R' },
                                { w: 600, label: 'Sb' },
                                { w: 700, label: 'B' },
                                { w: 900, label: 'Bk' },
                              ] as const).map(({ w, label }) => (
                                <button key={w} onClick={() => updateTextElement(selectedText.id, { fontWeight: w })}
                                  className={`flex-1 py-1 text-[9px] transition-colors ${selectedText.fontWeight === w ? 'bg-[#8B5CF6]/20 text-[#8B5CF6] font-semibold' : 'text-text3 hover:bg-bg2'}`}
                                  title={w === 300 ? 'Light' : w === 400 ? 'Regular' : w === 600 ? 'Semibold' : w === 700 ? 'Bold' : 'Black'}>
                                  {label}
                                </button>
                              ))}
                            </div>
                            <button onClick={() => updateTextElement(selectedText.id, { fontStyle: (selectedText.fontStyle ?? 'normal') === 'italic' ? 'normal' : 'italic' })}
                              className={`px-2 py-1 rounded border text-[10px] italic font-serif ${(selectedText.fontStyle ?? 'normal') === 'italic' ? 'bg-[#8B5CF6]/20 text-[#8B5CF6] border-[#8B5CF6]/30' : 'bg-card text-text3 border-border hover:bg-bg2'}`}
                              title="Itálico">
                              I
                            </button>
                          </div>
                        </div>

                        {/* Cor */}
                        <div className="space-y-0.5">
                          <label className="text-[9px] text-text3">Cor</label>
                          <div className="flex items-center gap-1.5">
                            <input type="color" value={selectedText.color.slice(0, 7)}
                              onChange={e => updateTextElement(selectedText.id, { color: e.target.value })}
                              className="w-6 h-6 rounded border border-border cursor-pointer p-0" />
                            <div className="flex gap-0.5">
                              {['#ffffff', '#000000', '#f43f5e', '#3b82f6', '#eab308', '#22c55e'].map(c => (
                                <button key={c} onClick={() => updateTextElement(selectedText.id, { color: c })}
                                  className="w-4 h-4 rounded-full border border-border/50" style={{ backgroundColor: c }} />
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Alinhamento + Caixa Alta */}
                        <div className="flex items-center gap-2">
                          <div className="flex bg-card rounded border border-border">
                            {(['left', 'center', 'right'] as const).map(a => (
                              <button key={a} onClick={() => updateTextElement(selectedText.id, { align: a })}
                                className={`px-2 py-1 text-[11px] ${selectedText.align === a ? 'bg-[#8B5CF6]/20 text-[#8B5CF6]' : 'text-text3'}`}>
                                {a === 'left' ? <TextAlignLeft size={13} /> : a === 'center' ? <TextAlignCenter size={13} /> : <TextAlignRight size={13} />}
                              </button>
                            ))}
                          </div>
                          <button onClick={() => updateTextElement(selectedText.id, { uppercase: !selectedText.uppercase })}
                            className={`px-2 py-1 rounded border text-[9px] font-bold ${selectedText.uppercase ? 'bg-[#8B5CF6]/20 text-[#8B5CF6] border-[#8B5CF6]/30' : 'bg-card text-text3 border-border'}`}>
                            AA
                          </button>
                        </div>

                        {/* Espaçamento + Altura Linha */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-0.5">
                            <label className="text-[9px] text-text3">Espaçamento</label>
                            <div className="flex items-center gap-1">
                              <input type="range" min={0} max={20} step={0.5} value={selectedText.letterSpacing}
                                onChange={e => updateTextElement(selectedText.id, { letterSpacing: +e.target.value })}
                                className="flex-1 h-1 accent-[#8B5CF6]" />
                              <span className="text-[9px] text-text3 w-4">{selectedText.letterSpacing}</span>
                            </div>
                          </div>
                          <div className="space-y-0.5">
                            <label className="text-[9px] text-text3">Alt. linha</label>
                            <div className="flex items-center gap-1">
                              <input type="range" min={0.8} max={2.5} step={0.1} value={selectedText.lineHeight}
                                onChange={e => updateTextElement(selectedText.id, { lineHeight: +e.target.value })}
                                className="flex-1 h-1 accent-[#8B5CF6]" />
                              <span className="text-[9px] text-text3 w-4">{selectedText.lineHeight}</span>
                            </div>
                          </div>
                        </div>

                        {/* Largura máxima */}
                        <div className="space-y-0.5">
                          <label className="text-[9px] text-text3">Largura máx.</label>
                          <div className="flex items-center gap-1">
                            <input type="range" min={20} max={100} step={5} value={selectedText.maxWidth}
                              onChange={e => updateTextElement(selectedText.id, { maxWidth: +e.target.value })}
                              className="flex-1 h-1 accent-[#8B5CF6]" />
                            <span className="text-[9px] text-text3 w-7">{selectedText.maxWidth}%</span>
                          </div>
                        </div>

                        {/* ── Efeitos ── */}
                        <div className="space-y-1.5 border-t border-border pt-2">
                          <label className="text-[9px] text-text3 uppercase tracking-wider">Efeitos</label>

                          {/* Sombra */}
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={selectedText.shadow.enabled}
                              onChange={e => updateTextElement(selectedText.id, { shadow: { ...selectedText.shadow, enabled: e.target.checked } })}
                              className="w-3 h-3 rounded accent-[#8B5CF6]" />
                            <span className="text-[10px] text-text2">Sombra</span>
                          </label>
                          {selectedText.shadow.enabled && (
                            <div className="space-y-1.5 pl-5">
                              <div className="flex items-center gap-1">
                                <label className="text-[8px] text-text3 w-5">Cor</label>
                                <input type="color" value={selectedText.shadow.color}
                                  onChange={e => updateTextElement(selectedText.id, { shadow: { ...selectedText.shadow, color: e.target.value } })}
                                  className="w-5 h-5 rounded border border-border cursor-pointer p-0" />
                              </div>
                              <div className="flex items-center gap-1">
                                <label className="text-[8px] text-text3 w-5 shrink-0">Blur</label>
                                <input type="range" min={0} max={20} step={1} value={selectedText.shadow.blur}
                                  onChange={e => updateTextElement(selectedText.id, { shadow: { ...selectedText.shadow, blur: +e.target.value } })}
                                  className="flex-1 min-w-0 h-1 accent-[#8B5CF6]" />
                                <span className="text-[8px] text-text3 w-4 text-right shrink-0">{selectedText.shadow.blur}</span>
                              </div>
                            </div>
                          )}

                          {/* Contorno */}
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={selectedText.outline.enabled}
                              onChange={e => updateTextElement(selectedText.id, { outline: { ...selectedText.outline, enabled: e.target.checked } })}
                              className="w-3 h-3 rounded accent-[#8B5CF6]" />
                            <span className="text-[10px] text-text2">Contorno</span>
                          </label>
                          {selectedText.outline.enabled && (
                            <div className="space-y-1.5 pl-5">
                              <div className="flex items-center gap-1">
                                <label className="text-[8px] text-text3 w-5">Cor</label>
                                <input type="color" value={selectedText.outline.color}
                                  onChange={e => updateTextElement(selectedText.id, { outline: { ...selectedText.outline, color: e.target.value } })}
                                  className="w-5 h-5 rounded border border-border cursor-pointer p-0" />
                              </div>
                              <div className="flex items-center gap-1">
                                <label className="text-[8px] text-text3 w-5 shrink-0">Esp.</label>
                                <input type="range" min={1} max={5} step={0.5} value={selectedText.outline.width}
                                  onChange={e => updateTextElement(selectedText.id, { outline: { ...selectedText.outline, width: +e.target.value } })}
                                  className="flex-1 min-w-0 h-1 accent-[#8B5CF6]" />
                                <span className="text-[8px] text-text3 w-4 text-right shrink-0">{selectedText.outline.width}</span>
                              </div>
                            </div>
                          )}

                          {/* Fundo do texto */}
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={selectedText.background.enabled}
                              onChange={e => updateTextElement(selectedText.id, { background: { ...selectedText.background, enabled: e.target.checked } })}
                              className="w-3 h-3 rounded accent-[#8B5CF6]" />
                            <span className="text-[10px] text-text2">Fundo</span>
                          </label>
                          {selectedText.background.enabled && (
                            <div className="space-y-1.5 pl-5">
                              <div className="flex items-center gap-1">
                                <label className="text-[8px] text-text3 w-5">Cor</label>
                                <input type="color" value={selectedText.background.color.slice(0, 7)}
                                  onChange={e => updateTextElement(selectedText.id, { background: { ...selectedText.background, color: e.target.value + '80' } })}
                                  className="w-5 h-5 rounded border border-border cursor-pointer p-0" />
                              </div>
                              <div className="flex items-center gap-1">
                                <label className="text-[8px] text-text3 w-8 shrink-0">Radius</label>
                                <input type="range" min={0} max={20} step={1} value={selectedText.background.borderRadius}
                                  onChange={e => updateTextElement(selectedText.id, { background: { ...selectedText.background, borderRadius: +e.target.value } })}
                                  className="flex-1 min-w-0 h-1 accent-[#8B5CF6]" />
                                <span className="text-[8px] text-text3 w-4 text-right shrink-0">{selectedText.background.borderRadius}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                    </TabsContent>

                    <TabsContent value="metadados" className="mt-3 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-text3 block mb-1">Instrumento</label>
                      <LASelect
                        value={(selectedBlock.render_data as any)?.instrumento ?? ''}
                        onValueChange={value => updateSelectedRenderData('instrumento', value)}
                        options={ensureSelectOption(COVER_INSTRUMENT_OPTIONS, (selectedBlock.render_data as any)?.instrumento)}
                        placeholder="Instrumento"
                        className="h-8 rounded-lg text-[12px]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-text3 block mb-1">Nível</label>
                      <LASelect
                        value={(selectedBlock.render_data as any)?.nivel ?? ''}
                        onValueChange={value => updateSelectedRenderData('nivel', value)}
                        options={ensureSelectOption(COVER_LEVEL_OPTIONS, (selectedBlock.render_data as any)?.nivel)}
                        placeholder="Nivel"
                        className="h-8 rounded-lg text-[12px]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-text3 block mb-1">Professor</label>
                    <Input
                      value={(selectedBlock.render_data as any)?.professor ?? ''}
                      onChange={e => updateSelectedRenderData('professor', e.target.value)}
                      placeholder="Nome do professor"
                      className="h-8 text-[12px]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-text3 block mb-1">Escola</label>
                    <Input
                      value={(selectedBlock.render_data as any)?.escola ?? ''}
                      onChange={e => updateSelectedRenderData('escola', e.target.value)}
                      placeholder="Nome da escola"
                      className="h-8 text-[12px]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-text3 block mb-1">Data</label>
                    <Input
                      value={(selectedBlock.render_data as any)?.data ?? ''}
                      onChange={e => updateSelectedRenderData('data', e.target.value)}
                      placeholder="Março 2026"
                      className="h-8 text-[12px]"
                    />
                  </div>
                    </TabsContent>
                  </Tabs>
                </div>
              )}

              {/* Teclado — botão para abrir KeyboardEditor */}
              {selectedBlock.block_type === 'keyboard' && (
                <div className="prop-section">
                  <div className="prop-label">Teclado</div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full justify-center gap-2 border-master/30 text-master hover:bg-master/10"
                    onClick={() => openKeyboardEditorForBlock(selectedBlock.id)}
                  >
                    <PianoKeys size={14} weight="bold" /> Editar Teclado
                  </Button>
                  {(selectedBlock.render_data as any)?.chord_name && (
                    <div className="text-[10px] text-text3 mt-1 text-center">
                      {(selectedBlock.render_data as any).chord_name}
                      {' · '}
                      {((selectedBlock.render_data as any)?.keys as string[])?.length ?? 0} teclas
                    </div>
                  )}
                </div>
              )}

              {/* Grade de Acordes — lista de acordes + controle de colunas */}
              {selectedBlock.block_type === 'chord_grid' && (
                <div className="prop-section space-y-2.5">
                  <div className="prop-label">Grade de Acordes</div>
                  <div>
                    <label className="text-[10px] text-text3 block mb-1">Colunas</label>
                    <div className="flex gap-1">
                      {[2, 3, 4, 6].map(n => (
                        <button
                          key={n}
                          className={`flex-1 px-2 py-1.5 rounded text-[11px] border transition-colors ${
                            ((selectedBlock.render_data as any)?.columns ?? 3) === n
                              ? 'border-grow bg-grow/10 text-grow font-semibold'
                              : 'border-border text-text3 hover:bg-azul-soft'
                          }`}
                          onClick={() => updateSelectedRenderData('columns', n)}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="text-[10px] text-text3">
                    {((selectedBlock.render_data as any)?.chords as any[])?.length ?? 0} acordes na grade
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full justify-center gap-2 border-grow/30 text-grow hover:bg-grow/10"
                    onClick={() => openChordEditorForGrid(selectedBlock.id)}
                  >
                    <Guitar size={14} weight="bold" /> Adicionar Acorde
                  </Button>
                  {/* Lista dos acordes existentes */}
                  {((selectedBlock.render_data as any)?.chords as any[])?.length > 0 && (
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {((selectedBlock.render_data as any).chords as any[]).map((chord: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between px-2 py-1 bg-bg2 rounded text-[11px]">
                          <span className="font-medium text-text">{chord.chord_name ?? chord.name ?? `Acorde ${idx + 1}`}</span>
                          <button
                            className="text-text3 hover:text-vermelho transition-colors"
                            onClick={() => {
                              const chords = [...((selectedBlock.render_data as any)?.chords ?? [])]
                              chords.splice(idx, 1)
                              updateSelectedRenderData('chords', chords)
                            }}
                          >
                            <Trash size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Grade de Teclados — lista de teclados + controle de colunas */}
              {selectedBlock.block_type === 'keyboard_grid' && (
                <div className="prop-section space-y-2.5">
                  <div className="prop-label">Grade de Teclados</div>
                  <div>
                    <label className="text-[10px] text-text3 block mb-1">Colunas</label>
                    <div className="flex gap-1">
                      {[2, 3, 4, 6].map(n => (
                        <button
                          key={n}
                          className={`flex-1 px-2 py-1.5 rounded text-[11px] border transition-colors ${
                            ((selectedBlock.render_data as any)?.columns ?? 3) === n
                              ? 'border-master bg-master/10 text-master font-semibold'
                              : 'border-border text-text3 hover:bg-azul-soft'
                          }`}
                          onClick={() => updateSelectedRenderData('columns', n)}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="text-[10px] text-text3">
                    {((selectedBlock.render_data as any)?.keyboards as any[])?.length ?? 0} teclados na grade
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full justify-center gap-2 border-master/30 text-master hover:bg-master/10"
                    onClick={() => openKeyboardEditorForGrid(selectedBlock.id)}
                  >
                    <PianoKeys size={14} weight="bold" /> Adicionar Teclado
                  </Button>
                  {/* Lista dos teclados existentes */}
                  {((selectedBlock.render_data as any)?.keyboards as any[])?.length > 0 && (
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {((selectedBlock.render_data as any).keyboards as any[]).map((kb: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between px-2 py-1 bg-bg2 rounded text-[11px]">
                          <span className="font-medium text-text">{kb.chord_name ?? `Teclado ${idx + 1}`}</span>
                          <button
                            className="text-text3 hover:text-vermelho transition-colors"
                            onClick={() => {
                              const keyboards = [...((selectedBlock.render_data as any)?.keyboards ?? [])]
                              keyboards.splice(idx, 1)
                              updateSelectedRenderData('keyboards', keyboards)
                            }}
                          >
                            <Trash size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Bloco Áudio — URL + legenda */}
              {selectedBlock.block_type === 'audio' && (
                <div className="prop-section space-y-2.5">
                  <div className="prop-label">Áudio</div>
                  <div>
                    <label className="text-[10px] text-text3 block mb-1">URL do áudio</label>
                    <Input
                      value={(selectedBlock.render_data as any)?.url ?? ''}
                      onChange={e => updateSelectedRenderData('url', e.target.value)}
                      placeholder="https://... (.mp3, .ogg, .wav)"
                      className="h-7 text-[11px]"
                    />
                    <span className="text-[9px] text-text3/60 mt-0.5 block">
                      Cole a URL de um arquivo de áudio ou do Supabase Storage
                    </span>
                  </div>
                  <div>
                    <label className="text-[10px] text-text3 block mb-1">Legenda</label>
                    <Input
                      value={(selectedBlock.render_data as any)?.caption ?? ''}
                      onChange={e => updateSelectedRenderData('caption', e.target.value)}
                      placeholder="Ex: Como soa o acorde de Dó Maior"
                      className="h-7 text-[11px]"
                    />
                  </div>
                </div>
              )}

              {/* Bloco Vídeo — URL YouTube/Vimeo + legenda */}
              {selectedBlock.block_type === 'video' && (
                <div className="prop-section space-y-2.5">
                  <div className="prop-label">Vídeo</div>
                  <div>
                    <label className="text-[10px] text-text3 block mb-1">URL do vídeo</label>
                    <Input
                      value={(selectedBlock.render_data as any)?.url ?? ''}
                      onChange={e => updateSelectedRenderData('url', e.target.value)}
                      placeholder="https://youtube.com/watch?v=... ou vimeo.com/..."
                      className="h-7 text-[11px]"
                    />
                    <span className="text-[9px] text-text3/60 mt-0.5 block">
                      YouTube ou Vimeo · No PDF será exibido como QR code
                    </span>
                  </div>
                  <div>
                    <label className="text-[10px] text-text3 block mb-1">Legenda</label>
                    <Input
                      value={(selectedBlock.render_data as any)?.caption ?? ''}
                      onChange={e => updateSelectedRenderData('caption', e.target.value)}
                      placeholder="Descrição do vídeo"
                      className="h-7 text-[11px]"
                    />
                  </div>
                </div>
              )}

              {/* Bloco Imagem — upload, URL, legenda, tamanho */}
              {selectedBlock.block_type === 'qr_code' && (
                <div className="prop-section space-y-3">
                  <div className="prop-label">QR Code</div>
                  <div>
                    <label className="text-[10px] text-text3 block mb-1">Título</label>
                    <Input
                      value={selectedBlock.title ?? ''}
                      onChange={e => {
                        setBlockWithHistory(selectedBlockId, b => ({ ...b, title: e.target.value }))
                        queueBlockAutosave(selectedBlockId)
                      }}
                      placeholder="Ex: Aula complementar"
                      className="h-7 text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-text3 block mb-1">URL</label>
                    <Input
                      value={(selectedBlock.render_data as any)?.url ?? ''}
                      onChange={e => updateSelectedRenderData('url', e.target.value)}
                      placeholder="https://..."
                      className="h-7 text-[11px]"
                    />
                    <span className="text-[9px] text-text3/60 mt-0.5 block">
                      O QR Code é gerado automaticamente no canvas e no PDF.
                    </span>
                  </div>
                  <QrCodePreview value={String((selectedBlock.render_data as any)?.url ?? '')} />
                  <div>
                    <label className="text-[10px] text-text3 block mb-1">Legenda</label>
                    <Input
                      value={(selectedBlock.render_data as any)?.caption ?? ''}
                      onChange={e => updateSelectedRenderData('caption', e.target.value)}
                      placeholder="Ex: Escaneie para abrir o vídeo de apoio"
                      className="h-7 text-[11px]"
                    />
                  </div>
                </div>
              )}

              {selectedBlock.block_type === 'image' && (
                <div className="prop-section space-y-2.5">
                  <div className="prop-label">Imagem</div>

                  {/* Preview da imagem atual */}
                  {(selectedBlock.render_data as any)?.url ? (
                    <div className="space-y-1.5">
                      <img
                        src={(selectedBlock.render_data as any).url}
                        alt={selectedBlock.title ?? 'Imagem'}
                        className="w-full rounded-md border border-border object-cover max-h-32"
                      />
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-7 text-[10px] border-accent/30 text-accent hover:bg-accent/10"
                          onClick={() => imageInputRef.current?.click()}
                          disabled={imageUploading}
                        >
                          {imageUploading ? <SpinnerGap size={12} className="animate-spin" /> : <ImageIcon size={12} />}
                          Trocar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[10px] border-vermelho/30 text-vermelho hover:bg-vermelho/10"
                          onClick={() => updateSelectedRenderData('url', null)}
                        >
                          <Trash size={12} />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* Zona de upload drag-and-drop */
                    <div
                      className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-accent/50 hover:bg-accent/5 transition-colors"
                      onClick={() => imageInputRef.current?.click()}
                      onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-accent', 'bg-accent/5') }}
                      onDragLeave={e => { e.currentTarget.classList.remove('border-accent', 'bg-accent/5') }}
                      onDrop={e => {
                        e.preventDefault()
                        e.currentTarget.classList.remove('border-accent', 'bg-accent/5')
                        const file = e.dataTransfer.files?.[0]
                        if (file) handleImageUpload(file)
                      }}
                    >
                      {imageUploading ? (
                        <div className="flex flex-col items-center gap-2">
                          <SpinnerGap size={24} className="animate-spin text-accent" />
                          <span className="text-[11px] text-text3">Enviando...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <ImageIcon size={24} className="text-text3" />
                          <span className="text-[11px] text-text3">Arraste uma imagem ou clique para selecionar</span>
                          <span className="text-[9px] text-text3/60">JPG, PNG ou WebP · máx. 5MB</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Input hidden para file */}
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (file) handleImageUpload(file)
                      e.target.value = ''
                    }}
                  />

                  {/* URL manual */}
                  <div>
                    <label className="text-[10px] text-text3 block mb-1">ou URL externa</label>
                    <Input
                      value={(selectedBlock.render_data as any)?.url ?? ''}
                      onChange={e => updateSelectedRenderData('url', e.target.value)}
                      placeholder="https://..."
                      className="h-7 text-[11px]"
                    />
                  </div>

                  {/* Legenda */}
                  <div>
                    <label className="text-[10px] text-text3 block mb-1">Legenda</label>
                    <Input
                      value={(selectedBlock.render_data as any)?.caption ?? ''}
                      onChange={e => updateSelectedRenderData('caption', e.target.value)}
                      placeholder="Descrição da imagem"
                      className="h-7 text-[11px]"
                    />
                  </div>

                  {/* Tamanho */}
                  <div>
                    <label className="text-[10px] text-text3 block mb-1">Tamanho</label>
                    <div className="flex gap-1">
                      {[
                        { value: 'small', label: 'P' },
                        { value: 'medium', label: 'M' },
                        { value: 'large', label: 'G' },
                        { value: 'full', label: 'Total' },
                      ].map(s => (
                        <button
                          key={s.value}
                          className={`flex-1 px-2 py-1.5 rounded text-[11px] border transition-colors ${
                            ((selectedBlock.render_data as any)?.size ?? 'medium') === s.value
                              ? 'border-accent bg-accent/10 text-accent font-semibold'
                              : 'border-border text-text3 hover:bg-accent-soft'
                          }`}
                          onClick={() => updateSelectedRenderData('size', s.value)}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Bloco Colunas — controle de layout + conteúdo das colunas */}
              {selectedBlock.block_type === 'columns' && (
                <div className="prop-section space-y-2.5">
                  <div className="prop-label">Layout de Colunas</div>
                  <div>
                    <label className="text-[10px] text-text3 block mb-1">Número de colunas</label>
                    <div className="flex gap-1">
                      {[2, 3].map(n => (
                        <button
                          key={n}
                          className={`flex-1 px-2 py-1.5 rounded text-[11px] border transition-colors ${
                            ((selectedBlock.render_data as any)?.columns as any[])?.length === n
                              ? 'border-azul bg-azul/10 text-azul font-semibold'
                              : 'border-border text-text3 hover:bg-azul-soft'
                          }`}
                          onClick={() => {
                            const current = ((selectedBlock.render_data as any)?.columns as any[]) ?? []
                            let newCols: any[]
                            if (n > current.length) {
                              newCols = [...current, ...Array.from({ length: n - current.length }, () => ({ blocks: [] }))]
                            } else {
                              newCols = current.slice(0, n)
                            }
                            updateSelectedRenderData('columns', newCols)
                          }}
                        >
                          {n} col
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Conteúdo de cada coluna */}
                  {((selectedBlock.render_data as any)?.columns as any[])?.map((col: any, ci: number) => (
                    <div key={ci} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-text2">Coluna {ci + 1}</span>
                        <span className="text-[9px] text-text3">{(col.blocks?.length ?? 0)} itens</span>
                      </div>

                      {/* Lista dos sub-blocos */}
                      {(col.blocks ?? []).length > 0 && (
                        <div className="space-y-0.5">
                          {(col.blocks as any[]).map((sb: any, si: number) => {
                            const cfg = getBlockConfig(sb.block_type)
                            return (
                              <div key={si} className="flex items-center justify-between px-2 py-1 bg-bg2 rounded text-[10px]">
                                <span className="font-medium text-text truncate flex-1">{sb.title || cfg.label}</span>
                                <button
                                  className="text-text3 hover:text-vermelho transition-colors ml-1 shrink-0"
                                  onClick={() => {
                                    const cols = [...((selectedBlock.render_data as any)?.columns ?? [])]
                                    const newBlocks = [...(cols[ci]?.blocks ?? [])]
                                    newBlocks.splice(si, 1)
                                    cols[ci] = { ...cols[ci], blocks: newBlocks }
                                    updateSelectedRenderData('columns', cols)
                                  }}
                                >
                                  <Trash size={11} />
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Adicionar sub-bloco */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="outline" className="w-full justify-center gap-1 text-[10px] h-7 border-azul/30 text-azul hover:bg-azul/10">
                            <Plus size={12} /> Adicionar na coluna {ci + 1}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-44">
                          {['text', 'tip', 'exercise', 'chord_diagram', 'chord_grid', 'notation', 'keyboard', 'image'].map(subType => {
                            const cfg = getBlockConfig(subType)
                            const Icon = cfg.icon
                            return (
                              <DropdownMenuItem
                                key={subType}
                                className="gap-2 text-[11px]"
                                onClick={() => {
                                  const cols = [...((selectedBlock.render_data as any)?.columns ?? [])]
                                  const newBlock = {
                                    block_type: subType,
                                    title: subType === 'text' ? 'Texto' : subType === 'tip' ? 'Dica' : subType === 'exercise' ? 'Exercício' : null,
                                    content: { text: '' },
                                    render_data: subType === 'chord_grid' ? { chords: [], columns: 2 } : null,
                                  }
                                  const newBlocks = [...(cols[ci]?.blocks ?? []), newBlock]
                                  cols[ci] = { ...cols[ci], blocks: newBlocks }
                                  updateSelectedRenderData('columns', cols)
                                }}
                              >
                                <Icon size={14} style={{ color: cfg.color }} />
                                {cfg.label}
                              </DropdownMenuItem>
                            )
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              )}

              {/* Estilo do Bloco — para qualquer bloco exceto cover e page_break */}
              {!['cover', 'page_break'].includes(selectedBlock.block_type) && selectedBlock.block_type !== 'separator' && (
                <PropertiesCollapsibleSection
                  title="Estilo"
                  subtitle="Fundo, espacamento, bordas e margens."
                  open={isPropertiesSectionOpen(selectedBlock.block_type, 'style', false)}
                  onOpenChange={(open) => setPropertiesSectionOpen(selectedBlock.block_type, 'style', open)}
                >
                  <BlockStylePanel
                    style={(selectedBlock.render_data?.style as BlockStyle) ?? DEFAULT_BLOCK_STYLE}
                    onChange={updateBlockStyle}
                  />
                </PropertiesCollapsibleSection>
              )}

              {/* Separador customizável */}
              {selectedBlock.block_type === 'separator' && (
                <div className="prop-section space-y-3">
                  <div>
                    <div className="prop-label">Separador</div>
                    <p className="mt-0.5 text-[9px] leading-snug text-text3">Linha, espessura, cor e decora&ccedil;&atilde;o visual.</p>
                  </div>
                  <SeparatorStylePanel
                    style={(selectedBlock.render_data?.separatorStyle as SeparatorStyle) ?? DEFAULT_SEPARATOR_STYLE}
                    onChange={updateSeparatorStyle}
                    pageBackgroundColor={pageConfig.background?.color ?? '#ffffff'}
                  />
                </div>
              )}

              {/* 6.1 — Assistente IA (só para blocos de texto) */}
              {selectedBlock && ['text', 'tip', 'exercise', 'title'].includes(selectedBlock.block_type) && (
                <PropertiesCollapsibleSection
                  title="Assistente IA"
                  subtitle="Reescrever, simplificar, expandir e gerar variacoes."
                  open={isPropertiesSectionOpen(selectedBlock.block_type, 'ai', false)}
                  onOpenChange={(open) => setPropertiesSectionOpen(selectedBlock.block_type, 'ai', open)}
                >
                    <div className="grid grid-cols-2 gap-1.5">
                      <Button
                        variant="outline" size="sm"
                        className="h-8 text-[10px] gap-1"
                        onClick={() => handleAIRewrite('rewrite')}
                        disabled={isAIProcessing}
                      >
                        <ArrowsClockwise size={12} /> Reescrever
                      </Button>
                      <Button
                        variant="outline" size="sm"
                        className="h-8 text-[10px] gap-1"
                        onClick={() => handleAIRewrite('simplify')}
                        disabled={isAIProcessing}
                      >
                        <TextAa size={12} /> Simplificar
                      </Button>
                      <Button
                        variant="outline" size="sm"
                        className="h-8 text-[10px] gap-1"
                        onClick={() => handleAIRewrite('expand')}
                        disabled={isAIProcessing}
                      >
                        <Sparkle size={12} /> Expandir
                      </Button>
                      <Button
                        variant="outline" size="sm"
                        className="h-8 text-[10px] gap-1"
                        onClick={() => handleAIRewrite('formal')}
                        disabled={isAIProcessing}
                      >
                        <PencilSimple size={12} /> Formalizar
                      </Button>
                    </div>

                    {/* Instrução customizada */}
                    <div className="flex gap-1.5 mt-2">
                      <Textarea
                        value={aiCustomInstruction}
                        onChange={(e) => setAiCustomInstruction(e.target.value)}
                        placeholder="Instrução personalizada... Ex: 'Adapte para crianças de 6 anos'"
                        className="text-[11px] min-h-[60px] resize-none"
                      />
                      <Button
                        variant="default" size="sm"
                        className="h-auto px-2 shrink-0"
                        onClick={() => handleAIRewrite('custom', aiCustomInstruction)}
                        disabled={isAIProcessing || !aiCustomInstruction.trim()}
                      >
                        {isAIProcessing ? <SpinnerGap size={14} className="animate-spin" /> : <Lightning size={14} />}
                      </Button>
                    </div>

                    {/* 6.2 — Gerar variações */}
                    <Button
                      variant="outline" size="sm"
                      className="w-full h-8 text-[10px] gap-1 mt-2"
                      onClick={() => {
                        setShowVariationsDialog(true)
                        handleGenerateVariations()
                      }}
                      disabled={isAIProcessing || isGeneratingVariations}
                    >
                      <Sparkle size={12} /> Gerar 3 variações
                    </Button>
                </PropertiesCollapsibleSection>
              )}

              <div className="sticky bottom-0 z-20 -mx-4 -mb-4 mt-4 border-t border-border bg-surface/95 p-3 shadow-[0_-10px_24px_rgba(15,23,42,0.10)] backdrop-blur">
                {selectedBlock.original_content && selectedBlock.is_edited && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mb-2 h-8 w-full justify-center text-[11px]"
                    onClick={handleRevertBlock}
                  >
                    <ArrowCounterClockwise size={14} /> Reverter original
                  </Button>
                )}
                <div className="grid grid-cols-[1fr_auto_auto] gap-2">
                  <Button
                    size="sm"
                    className="h-9 justify-center bg-azul-escuro text-[11px] hover:bg-azul"
                    onClick={handleSaveBlock}
                    disabled={saving}
                  >
                    {saving ? <SpinnerGap size={14} className="animate-spin" /> : <FloppyDisk size={14} />}
                    Salvar Alterações
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 w-10 justify-center p-0"
                    onClick={() => handleDuplicateBlock(selectedBlock.id)}
                    title="Duplicar bloco"
                  >
                    <Copy size={15} />
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 w-10 justify-center border-vermelho/30 p-0 text-vermelho hover:bg-vermelho/10"
                        title="Excluir bloco"
                      >
                        <Trash size={15} />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-surface border-border">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir bloco?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação remove o bloco selecionado do material. Você ainda pode desfazer pelo histórico enquanto estiver nesta sessão.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-vermelho text-white hover:bg-vermelho/80"
                          onClick={() => handleDeleteBlock(selectedBlock.id)}
                        >
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </>
          )}
              </>
            )
          })()}
        </PropertiesSidebar>
      </div>{/* fim editor-layout */}

      {/* ── Toolbar contextual flutuante ── */}
      {selectedBlock && toolbarPosition && getCanvasToolbarMode({ selectedBlockId, inlineEditingBlockId }) && (
        <ContextualToolbar
          blockType={selectedBlock.block_type}
          position={toolbarPosition}
          mode={getCanvasToolbarMode({ selectedBlockId, inlineEditingBlockId }) ?? 'selected'}
          onDuplicate={() => handleDuplicateBlock(selectedBlock.id)}
          onDelete={() => handleDeleteBlock(selectedBlock.id)}
          onStyleChange={updateBlockStyle}
          blockStyle={selectedBlockStyle}
          paginationPolicy={selectedPaginationPolicy}
          canSplitBlock={['text', 'tip', 'exercise', 'columns'].includes(selectedBlock.block_type)}
          onPaginationChange={updateBlockPaginationPolicy}
          onEditInline={() => enterInlineEditForBlock(selectedBlock.id)}
          onExitEdit={exitInlineEdit}
          onEditNotation={() => openNotationEditorForBlock(selectedBlock.id)}
          onEditTablature={() => openTablatureEditorForBlock(selectedBlock.id)}
          onEditChord={() => selectedBlock.block_type === 'chord_grid' ? openChordEditorForGrid(selectedBlock.id) : openChordEditorForBlock(selectedBlock.id)}
          onEditKeyboard={() => selectedBlock.block_type === 'keyboard_grid' ? openKeyboardEditorForGrid(selectedBlock.id) : openKeyboardEditorForBlock(selectedBlock.id)}
          onReplaceImage={() => imageInputRef.current?.click()}
          onAIRewrite={() => handleAIRewrite('rewrite')}
          isAIProcessing={isAIProcessing}
          onSaveReusable={handleOpenSaveReusable}
          saveReusableDisabled={!selectedBlockCanBeReusable || !school?.id}
        />
      )}

      {/* 6.2 — Dialog de variações */}
      {import.meta.env.DEV && (
        <PaginationDebugPanel
          open={showPaginationDebug}
          onOpenChange={setShowPaginationDebug}
          pages={paginationDebugPages}
        />
      )}

      <AIVariationsDialog
        open={showVariationsDialog}
        onOpenChange={setShowVariationsDialog}
        variations={variations}
        isGenerating={isGeneratingVariations}
        onRegenerate={handleGenerateVariations}
        onApply={handleApplyVariation}
        originalContent={selectedBlock ? ((selectedBlock.content as any)?.html ?? '') : ''}
      />

      {/* 7.3 — Dialog de Templates */}
      <MaterialTemplatesDialog
        open={showTemplatesDialog}
        onOpenChange={setShowTemplatesDialog}
        onApply={handleApplyTemplate}
      />

      {/* 7.4 — Dialog de Versões */}
      <VersionHistoryDialog
        open={showVersionsDialog}
        onOpenChange={setShowVersionsDialog}
        materialId={materialId}
        onRestore={handleRestoreVersion}
      />

      <SaveAsReusableDialog
        open={saveReusableOpen}
        onOpenChange={setSaveReusableOpen}
        loading={saveReusableLoading}
        selectedBlock={selectedBlock ? {
          block_type: selectedBlock.block_type,
          title: selectedBlock.title,
        } : null}
        onSave={handleSaveReusable}
      />

      <ExerciseLibraryBrowser
        open={exerciseBrowserOpen}
        onClose={() => setExerciseBrowserOpen(false)}
        onSelect={handleInsertExerciseFromLibrary}
        insertingId={insertingExerciseId}
      />

      {/* ── Modais dos editores visuais integrados ── */}

      {/* NotationEditorMaterialAdapter — edição de partitura */}
      <NotationEditorMaterialAdapter
        open={notationEditorOpen}
        onOpenChange={(v) => {
          setNotationEditorOpen(v)
          if (!v) {
            setNotationEditorBlockId(null)
            setNotationEditorStaveIndex(null)
          }
        }}
        notation={notationEditorBlockId ? blockToNotationRow(blocks.find(b => b.id === notationEditorBlockId)!) as any : null}
        onSave={handleNotationEditorSave}
      />

      <TablatureEditor
        open={tablatureEditorOpen}
        onOpenChange={(v) => {
          setTablatureEditorOpen(v)
          if (!v) setTablatureEditorBlockId(null)
        }}
        initialLines={activeTablatureLines}
        initialData={activeTablatureNotationData?.grid ? activeTablatureNotationData : null}
        initialLabel={activeTablatureNotationData?.label ?? activeTablatureBlock?.title ?? ''}
        initialInstrument={(activeTablatureNotationData?.instrument ?? activeTablatureRenderData.instrument ?? 'guitar') as TabInstrument}
        onSave={handleTablatureEditorSave}
      />

      {/* Dialog — Gerar bloco com IA */}
      <Dialog open={aiBlockDialogOpen} onOpenChange={setAiBlockDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-surface border-border">
          <DialogHeader>
            <DialogTitle className="font-serif text-[20px] flex items-center gap-2">
              <Sparkle size={20} weight="fill" className="text-accent" />
              Gerar bloco com <span className="text-accent">IA</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <label className="text-[11px] text-text3 block mb-1">Descreva o bloco que deseja gerar</label>
              <Textarea
                value={aiBlockPrompt}
                onChange={e => setAiBlockPrompt(e.target.value)}
                placeholder="Ex: Exercício de escala pentatônica menor no violão, com tablatura e dica de dedilhado"
                className="min-h-[100px] text-[13px]"
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault()
                    handleGenerateAIBlock()
                  }
                }}
              />
              <span className="text-[9px] text-text3/60 mt-0.5 block">
                Ctrl+Enter para gerar · A IA criará um bloco de texto, dica ou exercício
              </span>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setAiBlockDialogOpen(false)} disabled={aiBlockLoading}>
              Cancelar
            </Button>
            <Button onClick={handleGenerateAIBlock} disabled={aiBlockLoading || !aiBlockPrompt.trim()} className="gap-2">
              {aiBlockLoading ? (
                <>
                  <SpinnerGap size={14} className="animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Sparkle size={14} weight="fill" />
                  Gerar bloco
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ChordEditor — edição de diagrama de acorde (wrapper Dialog) */}
      <Dialog open={chordEditorOpen} onOpenChange={(v) => { setChordEditorOpen(v); if (!v) { setChordEditorBlockId(null); setChordGridTargetBlockId(null); setChordGridEditingIndex(null) } }}>
        <DialogContent className="sm:max-w-[860px] max-h-[90vh] overflow-y-auto bg-surface border-border" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="font-serif text-[22px]">
              Editar <span className="text-accent">Acorde</span>
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-[1fr_200px] gap-6 mt-2">
            <ChordEditor
              state={chordEditorState}
              onChange={setChordEditorState}
              chordName={chordEditorName}
              startFret={chordEditorStartFret}
            />
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-[11px] text-text3 uppercase tracking-wider mb-1 block">Nome</label>
                <Input
                  value={chordEditorName}
                  onChange={e => setChordEditorName(e.target.value)}
                  placeholder="Ex: Am7"
                  className="text-[13px] h-9"
                />
              </div>
              <div>
                <label className="text-[11px] text-text3 uppercase tracking-wider mb-1 block">Traste inicial</label>
                <Select value={String(chordEditorStartFret)} onValueChange={v => setChordEditorStartFret(Number(v))}>
                  <SelectTrigger className="h-9 text-[13px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                      <SelectItem key={n} value={String(n)}>{n}ª casa</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setChordEditorOpen(false)}>Cancelar</Button>
            <Button onClick={() => {
              if (chordGridTargetBlockId) {
                handleChordGridSave()
                setChordEditorOpen(false)
              } else {
                handleSaveChordToBlock()
              }
            }}>
              <FloppyDisk size={16} /> {chordGridTargetBlockId ? (chordGridEditingIndex !== null ? 'Salvar na Grade' : 'Adicionar à Grade') : 'Salvar Acorde'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* KeyboardEditor — edição de teclado/piano */}
      <KeyboardEditor
        open={keyboardEditorOpen}
        onOpenChange={(v) => { setKeyboardEditorOpen(v); if (!v) { setKeyboardEditorBlockId(null); setKeyboardGridTargetBlockId(null); setKeyboardGridEditingIndex(null) } }}
        chord={keyboardEditorBlockId ? (() => {
          const block = blocks.find(b => b.id === keyboardEditorBlockId)
          return keyboardBlockToEditorChord(block)
        })() : keyboardGridTargetBlockId && keyboardGridEditingIndex !== null ? (() => {
          const block = blocks.find(b => b.id === keyboardGridTargetBlockId)
          return keyboardBlockToEditorChord(block, { keyboardIndex: keyboardGridEditingIndex })
        })() : null}
        onSave={handleKeyboardEditorSave}
      />

      <ElementsPicker
        open={elementsPickerOpen}
        schoolId={school?.id}
        layersPanel={showLayersPanel ? (
          <LayersPanel
            elements={floatingElements}
            currentPageIndex={getCurrentVisiblePageIndex()}
            selectedId={selectedFloatingId}
            onSelect={(id) => { setSelectedFloatingId(id); setSelectedBlockId(null) }}
            onUpdate={updateFloatingElement}
            onClose={() => setShowLayersPanel(false)}
          />
        ) : undefined}
        onAddText={() => {
          addFloatingTextElement()
          setElementsPickerOpen(false)
        }}
        onOpenImagePicker={() => {
          setElementsPickerOpen(false)
          setFloatingImagePickerOpen(true)
          loadLibraryImages()
        }}
        onAddShape={(shape) => {
          addFloatingShapeElement(shape)
          setElementsPickerOpen(false)
        }}
        onAddIcon={(icon, label) => {
          addFloatingIconElement(icon, label)
          setElementsPickerOpen(false)
        }}
        onOpenChange={setElementsPickerOpen}
        onSelectElement={addElementAssetFromPicker}
        onToggleLayers={() => setShowLayersPanel(!showLayersPanel)}
      />
      {/* Dialog — Importar imagem da Biblioteca para capa */}
      <Dialog open={coverLibraryOpen} onOpenChange={setCoverLibraryOpen}>
        <DialogContent className="sm:max-w-[720px] max-h-[80vh] bg-surface border-border">
          <DialogHeader>
            <DialogTitle className="font-serif text-[20px]">
              Importar da <span className="text-accent">Biblioteca</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={coverLibrarySearch}
              onChange={e => setCoverLibrarySearch(e.target.value)}
              placeholder="Buscar imagem por nome ou tag..."
              className="h-9 text-[12px]"
            />
            {coverLibraryLoading ? (
              <div className="flex items-center justify-center py-12 gap-2 text-text3">
                <SpinnerGap size={20} className="animate-spin" /> Carregando biblioteca...
              </div>
            ) : filteredLibraryImages.length === 0 ? (
              <div className="text-center py-12 text-text3 text-[13px]">
                Nenhuma imagem encontrada na biblioteca.
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2 max-h-[50vh] overflow-y-auto pr-1">
                {filteredLibraryImages.map(img => (
                  <button
                    key={img.id}
                    onClick={() => img.image_url && handleSelectLibraryImage(img.image_url)}
                    className="group relative rounded-lg overflow-hidden border border-border hover:border-accent transition-all hover:shadow-md"
                  >
                    <div
                      className="aspect-square flex items-center justify-center"
                      style={img.tags?.includes('fundo-transparente') ? {
                        backgroundImage: 'repeating-conic-gradient(#e0e0e0 0% 25%, #ffffff 0% 50%)',
                        backgroundSize: '10px 10px',
                      } : { background: 'rgba(0,0,0,0.03)' }}
                    >
                      <img
                        src={img.image_url}
                        alt={img.label}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="p-1.5 bg-surface">
                      <div className="text-[9px] font-medium text-text truncate">{img.label}</div>
                      <div className="text-[8px] text-text3 uppercase">{img.category} · {img.image_format}</div>
                    </div>
                    <div className="absolute inset-0 bg-accent/0 group-hover:bg-accent/5 transition-colors" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      {/* Dialog — Element Picker (adicionar overlay element da Biblioteca) */}
      <Dialog open={elementPickerOpen} onOpenChange={setElementPickerOpen}>
        <DialogContent className="sm:max-w-[720px] max-h-[80vh] bg-surface border-border">
          <DialogHeader>
            <DialogTitle className="font-serif text-[20px]">
              Adicionar <span className="text-accent">Elemento</span>
            </DialogTitle>
          </DialogHeader>
          <p className="text-[11px] text-text3 -mt-1">
            Escolha uma imagem da biblioteca para sobrepor na capa. Arraste para posicionar.
          </p>
          <div className="space-y-3">
            <Input
              value={coverLibrarySearch}
              onChange={e => setCoverLibrarySearch(e.target.value)}
              placeholder="Buscar imagem por nome ou tag..."
              className="h-9 text-[12px]"
            />
            {coverLibraryLoading ? (
              <div className="flex items-center justify-center py-12 gap-2 text-text3">
                <SpinnerGap size={20} className="animate-spin" /> Carregando biblioteca...
              </div>
            ) : filteredLibraryImages.length === 0 ? (
              <div className="text-center py-12 text-text3 text-[13px]">
                Nenhuma imagem encontrada na biblioteca.
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2 max-h-[50vh] overflow-y-auto pr-1">
                {filteredLibraryImages.map(img => (
                  <button
                    key={img.id}
                    onClick={() => addOverlayElement(img)}
                    className="group relative rounded-lg overflow-hidden border border-border hover:border-accent transition-all hover:shadow-md"
                  >
                    <div
                      className="aspect-square flex items-center justify-center"
                      style={img.tags?.includes('fundo-transparente') ? {
                        backgroundImage: 'repeating-conic-gradient(#e0e0e0 0% 25%, #ffffff 0% 50%)',
                        backgroundSize: '10px 10px',
                      } : { background: 'rgba(0,0,0,0.03)' }}
                    >
                      <img
                        src={img.image_url}
                        alt={img.label}
                        className="w-full h-full object-contain"
                        loading="lazy"
                      />
                    </div>
                    <div className="p-1.5 bg-surface">
                      <div className="text-[9px] font-medium text-text truncate">{img.label}</div>
                      <div className="text-[8px] text-text3 uppercase">{img.category} · {img.image_format}</div>
                    </div>
                    <div className="absolute inset-0 bg-accent/0 group-hover:bg-accent/5 transition-colors" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog — Floating Image Picker */}
      <Dialog open={floatingImagePickerOpen} onOpenChange={setFloatingImagePickerOpen}>
        <DialogContent className="sm:max-w-[640px] max-h-[80vh] bg-surface border-border">
          <DialogHeader>
            <DialogTitle className="font-serif text-[20px]">
              Adicionar <span className="text-accent">Imagem</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {/* Upload */}
            <div
              className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-accent/30 transition-colors"
              onClick={() => floatingImageInputRef.current?.click()}
            >
              <ImageIcon size={28} className="text-text3/40 mb-1" />
              <span className="text-[12px] text-text3/60">Clique para fazer upload</span>
              <span className="text-[10px] text-text3/40">PNG, JPG, WebP até 5MB</span>
              <input
                ref={floatingImageInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleFloatingImageUpload}
              />
            </div>

            {/* Biblioteca */}
            <div className="text-[11px] text-text3 font-medium uppercase tracking-wider">Da Biblioteca</div>
            {coverLibraryLoading ? (
              <div className="flex items-center justify-center py-8 gap-2 text-text3">
                <SpinnerGap size={20} className="animate-spin" /> Carregando...
              </div>
            ) : filteredLibraryImages.length === 0 ? (
              <div className="text-center py-8 text-text3 text-[13px]">
                Nenhuma imagem encontrada.
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2 max-h-[40vh] overflow-y-auto pr-1">
                {filteredLibraryImages.map(img => (
                  <button
                    key={img.id}
                    onClick={() => img.image_url && addFloatingImage(img.image_url, img.label)}
                    className="group relative rounded-lg border border-border overflow-hidden hover:ring-2 hover:ring-accent transition-all"
                    style={img.tags?.includes('fundo-transparente') ? {
                      backgroundImage: 'repeating-conic-gradient(#e0e0e0 0% 25%, #fff 0% 50%)',
                      backgroundSize: '12px 12px',
                    } : undefined}
                  >
                    <div className="aspect-square">
                      <img
                        src={img.image_url ?? ''}
                        alt={img.label}
                        className="w-full h-full object-contain"
                        loading="lazy"
                      />
                    </div>
                    <div className="p-1 bg-surface">
                      <div className="text-[9px] font-medium text-text truncate">{img.label}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// =============================================
// Componente exportado — detecta se tem :id
// =============================================

export function Editor() {
  const { id } = useParams<{ id: string }>()

  if (id) {
    return <MaterialEditor materialId={id} />
  }

  return <MaterialList />
}
