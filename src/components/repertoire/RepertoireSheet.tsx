import { useMemo, useEffect, useState, useCallback, useRef } from "react"
import {
  MusicNote, Guitar, PianoKeys, MicrophoneStage, Lightning,
  Star, YoutubeLogo, Link as LinkIcon, PencilSimple, ArrowSquareOut, WarningCircle,
  FloppyDisk, SpinnerGap, Trash, Eye, EyeSlash, FilePdf, UploadSimple, MusicNotesSimple
} from "@phosphor-icons/react"
import { toast } from "sonner"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { ChordDiagram } from "@/components/music/ChordDiagram"
import type { ChordPositions } from "@/components/music/ChordDiagram"
import { ChordEditor, createEmptyState, positionsToState, stateToPositions, type ChordEditorState } from "@/components/music/ChordEditor"
import { PianoKeyboard } from "@/components/music/PianoKeyboard"
import { KeyboardEditor, type PianoChordData } from "@/components/music/KeyboardEditor"
import { TablatureEditor } from "@/components/music/TablatureEditor"
import { getChordsByNames, updateChord, createChord, type Chord } from "@/services/libraryService"
import { autoFillChordsFound, type AutoFillResult, type PianoPositions } from "@/services/chordAutoFillService"
import { updateSong } from "@/services/repertoireService"
import { enrichSongWithAI, enrichmentToUpdates, type EnrichmentResult, type EnrichmentPreview } from "@/services/aiEnrichService"
import { uploadGpFile, deleteGpFile, updateGpFileUrl } from "@/services/gpFileService"
import { generateRepertoireBookPdf } from "@/services/repertoirePdfEngine"
import { TransposeControl } from "@/components/repertoire/TransposeControl"
import { ChordSuggestions } from "@/components/repertoire/ChordSuggestions"
import { AlphaTabPlayer } from "@/components/music/AlphaTabPlayer"
import { transposeCifraContent, transposeChords, shouldUseFlats, transposeKey } from "@/lib/transpose"
import type { Tables, Database } from "@/lib/database.types"
import type { Json } from "@/lib/database.types"

type Repertoire = Tables<'repertoire'>

// --- Configurações de visual ---

const DIFFICULTY_CONFIG: Record<number, { label: string; color: string; bg: string }> = {
  1: { label: 'Iniciante', color: 'text-green-400', bg: 'bg-green-500/15' },
  2: { label: 'Fácil', color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
  3: { label: 'Intermediário', color: 'text-amber-400', bg: 'bg-amber-500/15' },
  4: { label: 'Avançado', color: 'text-orange-400', bg: 'bg-orange-500/15' },
  5: { label: 'Virtuoso', color: 'text-red-400', bg: 'bg-red-500/15' },
}

const CURATION_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: 'Rascunho', color: 'text-amber-400', bg: 'bg-amber-500/15' },
  review: { label: 'Em revisão', color: 'text-blue-400', bg: 'bg-blue-500/15' },
  approved: { label: 'Aprovado', color: 'text-green-400', bg: 'bg-green-500/15' },
  published: { label: 'Publicado', color: 'text-[#FF2D78]', bg: 'bg-[#FF2D78]/15' },
}

const GENRE_COLORS: Record<string, string> = {
  'Rock': 'bg-red-500/15 text-red-400',
  'Pop Rock': 'bg-rose-500/15 text-rose-400',
  'Pop': 'bg-pink-500/15 text-pink-400',
  'MPB': 'bg-indigo-500/15 text-indigo-400',
  'Reggae': 'bg-green-500/15 text-green-400',
  'Sertanejo': 'bg-amber-500/15 text-amber-400',
  'Blues': 'bg-blue-500/15 text-blue-400',
  'Jazz': 'bg-violet-500/15 text-violet-400',
  'Bossa Nova': 'bg-teal-500/15 text-teal-400',
}

// --- Sub-componentes ---

function DifficultyStars({ level }: { level: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          size={14}
          weight={i <= level ? 'fill' : 'regular'}
          className={i <= level ? (DIFFICULTY_CONFIG[level]?.color ?? 'text-text3') : 'text-text3/30'}
        />
      ))}
    </div>
  )
}

function InstrumentBadge({ instrument }: { instrument: string }) {
  const lower = instrument.toLowerCase()
  let Icon = MusicNote
  if (lower.includes('violão') || lower.includes('guitarra') || lower.includes('baixo') || lower.includes('ukulele'))
    Icon = Guitar
  else if (lower.includes('teclado') || lower.includes('piano'))
    Icon = PianoKeys
  else if (lower.includes('canto') || lower.includes('voz'))
    Icon = MicrophoneStage

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--azul-escuro)]/15 text-[var(--azul-claro)]">
      <Icon size={12} /> {instrument}
    </span>
  )
}

// Detecta se uma linha é de tablatura
const TAB_LINE_RE = /^\s*[EBADGe]\|/

// Renderiza uma linha de tablatura com label de corda colorido e números destacados
function TabLine({ line }: { line: string }) {
  // Extrair label da corda (ex: "E|", "B|") e o conteúdo
  const match = line.match(/^(\s*)([EBADGe])(\|)(.*)$/)
  if (!match) return <div className="text-blue-400/60">{line}</div>

  const [, indent, stringLabel, pipe, rest] = match

  // Colorir números dos trastes no conteúdo
  const highlighted = rest.replace(/(\d+)/g, '<n>$1</n>')
  const parts = highlighted.split(/(<n>\d+<\/n>)/)

  return (
    <div className="flex">
      <span className="text-text3/40 whitespace-pre">{indent}</span>
      <span className="text-emerald-400 font-bold w-[1ch] text-center">{stringLabel}</span>
      <span className="text-text3/30">{pipe}</span>
      <span className="text-blue-400/50">
        {parts.map((part, j) => {
          const numMatch = part.match(/^<n>(\d+)<\/n>$/)
          if (numMatch) {
            return (
              <span key={j} className="text-[#FF2D78] font-bold">
                {numMatch[1]}
              </span>
            )
          }
          return <span key={j}>{part}</span>
        })}
      </span>
    </div>
  )
}

// Bloco visual de tablatura agrupado
function TabBlock({ lines, label, onDoubleClick }: { lines: string[]; label?: string; onDoubleClick?: () => void }) {
  return (
    <TooltipProvider delayDuration={400}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`my-2 rounded-lg bg-[var(--bg2)] border border-border/50 overflow-hidden ${
              onDoubleClick ? 'cursor-pointer hover:border-accent/30 transition-colors' : ''
            }`}
            onDoubleClick={onDoubleClick}
          >
            {label && (
              <div className="px-3 pt-2 text-[10px] font-semibold uppercase tracking-[1px] text-text3/60">
                {label}
              </div>
            )}
            <div className="px-3 py-2 overflow-x-auto">
              <pre className="font-mono text-[11px] leading-[1.5] whitespace-pre">
                {lines.map((line, i) => (
                  <TabLine key={i} line={line} />
                ))}
              </pre>
            </div>
          </div>
        </TooltipTrigger>
        {onDoubleClick && (
          <TooltipContent side="bottom">
            <p className="text-xs">Duplo clique para editar tablatura</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  )
}

// Pré-processa linhas para agrupar blocos de tablatura
type CifraBlock =
  | { type: 'section'; text: string }
  | { type: 'chord'; text: string }
  | { type: 'lyric'; text: string }
  | { type: 'empty' }
  | { type: 'tab'; lines: string[]; label?: string }

function parseCifraBlocks(content: string): CifraBlock[] {
  const lines = content.split('\n')
  const blocks: CifraBlock[] = []
  let i = 0

  const chordPattern = /^[A-G][#b]?(?:m|M|maj|min|dim|aug|sus[24]?|add[249]?|[0-9])*(?:\/[A-G][#b]?)?$/

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    // Agrupar linhas consecutivas de tablatura
    if (TAB_LINE_RE.test(line)) {
      const tabLines: string[] = []
      // Olhar a linha anterior para possível label de acorde
      let label: string | undefined
      if (blocks.length > 0) {
        const prev = blocks[blocks.length - 1]
        if (prev.type === 'chord') {
          label = prev.text.trim()
          blocks.pop() // Remover o label avulso, vai dentro do TabBlock
        }
      }
      while (i < lines.length && TAB_LINE_RE.test(lines[i])) {
        tabLines.push(lines[i])
        i++
      }
      blocks.push({ type: 'tab', lines: tabLines, label })
      continue
    }

    // Seção [Intro], [Verso], etc
    if (/^\[.*\]/.test(trimmed)) {
      blocks.push({ type: 'section', text: trimmed })
      i++
      continue
    }

    // Linha vazia
    if (!trimmed) {
      blocks.push({ type: 'empty' })
      i++
      continue
    }

    // Linha de acordes
    const tokens = trimmed.split(/\s+/)
    const chordRatio = tokens.filter(t => chordPattern.test(t) || t === '|').length / (tokens.length || 1)
    if (chordRatio > 0.5) {
      blocks.push({ type: 'chord', text: line })
      i++
      continue
    }

    // Letra normal
    blocks.push({ type: 'lyric', text: line })
    i++
  }

  return blocks
}

// Renderiza o conteúdo da cifra com syntax highlighting e tablatura estilizada
function CifraContentView({ content, onTabDoubleClick, hideTabs = false }: { content: string; onTabDoubleClick?: (lines: string[], label: string | undefined, tabIdx: number) => void; hideTabs?: boolean }) {
  const blocks = useMemo(() => parseCifraBlocks(content), [content])

  // Contar índice de blocos tab para identificar qual está sendo editado
  let tabCounter = -1

  return (
    <div className="font-mono text-[12px] leading-[1.7]">
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'section': {
            // Ocultar seções de tablatura ([Tab - ...]) quando hideTabs está ativo
            if (hideTabs && /^\[Tab\b/i.test(block.text.trim())) return null
            return (
              <div key={i} className="text-accent font-bold mt-4 mb-1 text-[13px]">
                {block.text}
              </div>
            )
          }
          case 'tab': {
            tabCounter++
            if (hideTabs) return null
            const idx = tabCounter
            return (
              <TabBlock
                key={i}
                lines={block.lines}
                label={block.label}
                onDoubleClick={onTabDoubleClick ? () => onTabDoubleClick(block.lines, block.label, idx) : undefined}
              />
            )
          }
          case 'chord':
            return (
              <div key={i} className="text-accent font-semibold whitespace-pre">
                {block.text}
              </div>
            )
          case 'empty':
            return <div key={i} className="h-2" />
          case 'lyric':
            return (
              <div key={i} className="text-text whitespace-pre-wrap">
                {block.text}
              </div>
            )
        }
      })}
    </div>
  )
}

// Progressão de acordes por seção
function ChordStructureView({ structure }: { structure: Json | null }) {
  if (!structure || typeof structure !== 'object' || Array.isArray(structure)) return null

  const sections = Object.entries(structure as Record<string, unknown>)
  if (sections.length === 0) return null

  return (
    <div className="space-y-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-[1.5px] text-text3">
        Progressão por seção
      </h3>
      <div className="space-y-2">
        {sections.map(([section, chords]) => {
          const chordList = Array.isArray(chords) ? chords : []
          if (chordList.length === 0) return null
          return (
            <div key={section} className="flex items-start gap-2">
              <span className="text-[11px] font-bold text-accent min-w-[80px] pt-0.5 capitalize">
                {section.replace(/_/g, ' ')}
              </span>
              <div className="flex gap-1 flex-wrap">
                {chordList.map((chord, j) => (
                  <span
                    key={j}
                    className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[var(--azul-escuro)]/20 text-[var(--azul-claro)]"
                  >
                    {String(chord)}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// YouTube embed
function YouTubeEmbed({ url }: { url: string }) {
  const videoId = useMemo(() => {
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
    return match?.[1] ?? null
  }, [url])

  if (!videoId) return null

  return (
    <div className="space-y-2">
      <h3 className="text-[11px] font-semibold uppercase tracking-[1.5px] text-text3">
        Vídeo de referência
      </h3>
      <div className="relative w-full rounded-xl overflow-hidden" style={{ paddingBottom: '56.25%' }}>
        <iframe
          className="absolute inset-0 w-full h-full"
          src={`https://www.youtube.com/embed/${videoId}`}
          title="YouTube"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  )
}

// --- Componente principal ---

type CurationStatus = Database['public']['Enums']['curation_status']

interface EditForm {
  title: string
  artist: string
  key: string
  genre: string
  difficulty: number
  curation_status: CurationStatus
  youtube_url: string
  chords: string
  cifra_content: string
  lyrics: string
  gp_file_url: string
}

interface RepertoireSheetProps {
  song: Repertoire | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: (song: Repertoire) => void
  /** Callback após salvar edição — usado para recarregar a lista */
  onSaved?: () => void
}

export function RepertoireSheet({ song: songProp, open, onOpenChange, onEdit, onSaved }: RepertoireSheetProps) {
  // Estado local da música — sincroniza com a prop mas pode ser atualizado localmente (ex: enriquecimento IA)
  const [liveSong, setLiveSong] = useState<Repertoire | null>(songProp)
  const justSavedRef = useRef(false)
  useEffect(() => {
    // Após enriquecimento IA, não sobrescrever o liveSong com prop stale
    if (justSavedRef.current) {
      justSavedRef.current = false
      // Mesclar: manter campos locais que foram enriquecidos + atualizar o resto da prop
      if (songProp && liveSong && songProp.id === liveSong.id) {
        setLiveSong(prev => prev ? { ...songProp, ...Object.fromEntries(
          Object.entries(prev).filter(([, v]) => v != null)
        ) } as Repertoire : songProp)
        return
      }
    }
    setLiveSong(songProp)
  }, [songProp])
  const song = liveSong

  const [libraryChords, setLibraryChords] = useState<Chord[]>([])
  const [loadingChords, setLoadingChords] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('cifra')

  // Filtros de visibilidade das seções na cifra
  const [showGuitar, setShowGuitar] = useState(true)
  const [showPiano, setShowPiano] = useState(true)
  const [showTab, setShowTab] = useState(true)

  // Transposição de tonalidade
  const [transposeSemitones, setTransposeSemitones] = useState(0)

  // Enriquecimento IA
  const [enriching, setEnriching] = useState(false)
  const [enrichPreview, setEnrichPreview] = useState<EnrichmentPreview[] | null>(null)
  const [enrichResult, setEnrichResult] = useState<EnrichmentResult | null>(null)
  const [enrichSelectedFields, setEnrichSelectedFields] = useState<Set<string>>(new Set())
  const [applyingEnrich, setApplyingEnrich] = useState(false)

  const [generatingPdf, setGeneratingPdf] = useState(false)

  // --- Enriquecimento IA ---
  const handleEnrichWithAI = useCallback(async () => {
    if (!song) return
    setEnriching(true)
    setEnrichPreview(null)
    setEnrichResult(null)

    try {
      const { result, preview, latencyMs, tokensUsed } = await enrichSongWithAI(song)

      if (preview.length === 0) {
        toast.info('Todos os campos já estão preenchidos!')
        setEnriching(false)
        return
      }

      setEnrichResult(result)
      setEnrichPreview(preview)
      setEnrichSelectedFields(new Set(preview.map(p => p.field)))
      toast.success(`IA encontrou ${preview.length} campo${preview.length > 1 ? 's' : ''} para preencher (${latencyMs}ms)`)
    } catch (e: any) {
      toast.error('Erro na IA: ' + (e?.message ?? 'Desconhecido'))
    } finally {
      setEnriching(false)
    }
  }, [song])

  const handleApplyEnrichment = useCallback(async () => {
    if (!song || !enrichResult) {
      console.warn('[Enrich] song ou enrichResult nulo', { song: !!song, enrichResult: !!enrichResult })
      return
    }
    setApplyingEnrich(true)

    try {
      const selectedArr = [...enrichSelectedFields]
      const updates = enrichmentToUpdates(enrichResult, selectedArr)

      if (Object.keys(updates).length === 0) {
        toast.info('Nenhum campo selecionado para aplicar.')
        setApplyingEnrich(false)
        return
      }

      const result = await updateSong(song.id, updates as any)
      toast.success(`${Object.keys(updates).length} campo${Object.keys(updates).length > 1 ? 's' : ''} atualizado${Object.keys(updates).length > 1 ? 's' : ''} com sucesso!`)
      // Atualizar música localmente (sem fechar o sheet)
      setLiveSong(prev => prev ? { ...prev, ...updates } as Repertoire : prev)
      setEnrichPreview(null)
      setEnrichResult(null)
      // Marcar que acabamos de salvar — proteger liveSong de ser sobrescrito pelo refetch
      justSavedRef.current = true
      // Refresh da lista em background — sem fechar o sheet
      onSaved?.()
    } catch (e: any) {
      console.error('[Enrich] Erro:', e)
      toast.error('Erro ao salvar: ' + (e?.message ?? ''))
    } finally {
      setApplyingEnrich(false)
    }
  }, [song, enrichResult, enrichSelectedFields, onSaved])

  const toggleEnrichField = useCallback((field: string) => {
    setEnrichSelectedFields(prev => {
      const next = new Set(prev)
      if (next.has(field)) next.delete(field)
      else next.add(field)
      return next
    })
  }, [])

  // Separar acordes de violão e piano (antes dos handlers que dependem)
  const guitarChords = useMemo(() => libraryChords.filter(c => c.instrument === 'guitar'), [libraryChords])
  const pianoChords = useMemo(() => libraryChords.filter(c => (c.instrument as string) === 'piano'), [libraryChords])
  const guitarChordMap = useMemo(() => new Map(guitarChords.map(c => [c.name, c])), [guitarChords])
  const pianoChordMap = useMemo(() => new Map(pianoChords.map(c => [c.name, c])), [pianoChords])

  // --- Editor de acorde de violão (ChordEditor modal) ---
  const [chordEditorOpen, setChordEditorOpen] = useState(false)
  const [chordEditorState, setChordEditorState] = useState<ChordEditorState>(createEmptyState())
  const [chordEditorName, setChordEditorName] = useState('')
  const [chordEditorStartFret, setChordEditorStartFret] = useState(1)
  const [chordEditorId, setChordEditorId] = useState<string | null>(null) // id na chord_library

  const openChordEditor = useCallback((chord: Chord) => {
    const pos = (chord.positions ?? { fingers: [], barres: [], muted: [] }) as any
    // Usar position salvo no banco (baseFret) se existir, senão calcular pelo minFret
    const sf = pos.position && pos.position > 0
      ? pos.position
      : (() => {
          const frets = [
            ...(pos.fingers ?? []).map((f: any) => f[1]).filter((f: number) => f > 0),
            ...(pos.barres ?? []).map((b: any) => b.fret),
          ]
          const minFret = frets.length > 0 ? Math.min(...frets) : 1
          return minFret > 0 ? minFret : 1
        })()
    setChordEditorState(positionsToState(pos as ChordPositions, sf))
    setChordEditorName(chord.name)
    setChordEditorStartFret(sf)
    setChordEditorId(chord.id)
    setChordEditorOpen(true)
  }, [])

  // Abrir editor para CRIAR novo acorde (grid vazia, nome pré-preenchido)
  const openChordEditorForNew = useCallback((chordName: string) => {
    setChordEditorState(createEmptyState())
    setChordEditorName(chordName)
    setChordEditorStartFret(1)
    setChordEditorId(null) // null = criação
    setChordEditorOpen(true)
  }, [])

  const handleSaveChordEditor = useCallback(async () => {
    const positions = stateToPositions(chordEditorState, chordEditorStartFret)
    const positionsWithPosition = { ...positions, position: chordEditorStartFret }
    try {
      if (chordEditorId) {
        // Atualizar acorde existente
        await updateChord(chordEditorId, {
          name: chordEditorName,
          positions: positionsWithPosition as any,
        })
        toast.success(`Acorde "${chordEditorName}" atualizado na biblioteca!`)
      } else {
        // Criar novo acorde na biblioteca
        await createChord({
          name: chordEditorName,
          instrument: 'guitar' as any,
          positions: positionsWithPosition as any,
          difficulty: 1,
          tags: [],
        })
        toast.success(`Acorde "${chordEditorName}" criado na biblioteca!`)
        // Disparar evento para outras páginas (Biblioteca Musical)
        window.dispatchEvent(new Event('chord-library-updated'))
      }
      setChordEditorOpen(false)
      // Recarregar acordes no sheet
      if (song?.chords?.length) {
        getChordsByNames(song.chords)
          .then(data => setLibraryChords(data))
          .catch(() => {})
      }
    } catch (e: any) {
      toast.error('Erro ao salvar acorde: ' + (e?.message ?? ''))
    }
  }, [chordEditorId, chordEditorState, chordEditorName, chordEditorStartFret, song?.chords])

  // --- Editor de teclado (KeyboardEditor modal) ---
  const [keyboardEditorOpen, setKeyboardEditorOpen] = useState(false)
  const [keyboardEditorChord, setKeyboardEditorChord] = useState<any>(null)

  const openKeyboardEditor = useCallback((chord: Chord) => {
    const pos = chord.positions as any
    setKeyboardEditorChord({
      id: chord.id,
      name: chord.name,
      instrument: 'piano',
      difficulty: chord.difficulty,
      positions: pos,
    })
    setKeyboardEditorOpen(true)
  }, [])

  // Abrir editor de teclado para CRIAR novo acorde (vazio, nome pré-preenchido)
  const openKeyboardEditorForNew = useCallback((chordName: string) => {
    setKeyboardEditorChord({
      id: null, // null = criação
      name: chordName,
      instrument: 'piano',
      difficulty: 1,
      positions: {},
    })
    setKeyboardEditorOpen(true)
  }, [])

  const handleSaveKeyboard = useCallback(async (data: PianoChordData) => {
    try {
      if (keyboardEditorChord?.id) {
        // Atualizar acorde existente
        await updateChord(keyboardEditorChord.id, {
          name: data.name,
          positions: data.positions as any,
        })
        toast.success(`Teclado "${data.name}" atualizado na biblioteca!`)
      } else {
        // Criar novo acorde de piano na biblioteca
        await createChord({
          name: data.name,
          instrument: 'piano' as any,
          positions: data.positions as any,
          difficulty: data.difficulty ?? 1,
          tags: data.tags ?? [],
        })
        toast.success(`Teclado "${data.name}" criado na biblioteca!`)
        window.dispatchEvent(new Event('chord-library-updated'))
      }
      setKeyboardEditorOpen(false)
      // Recarregar acordes
      if (song?.chords?.length) {
        getChordsByNames(song.chords)
          .then(d => setLibraryChords(d))
          .catch(() => {})
      }
    } catch (e: any) {
      toast.error('Erro ao salvar teclado: ' + (e?.message ?? ''))
    }
  }, [keyboardEditorChord, song?.chords])

  // --- Editor de tablatura (TablatureEditor modal) ---
  const [tabEditorOpen, setTabEditorOpen] = useState(false)
  const [tabEditorLines, setTabEditorLines] = useState<string[]>([])
  const [tabEditorLabel, setTabEditorLabel] = useState('')
  const [tabEditorBlockIdx, setTabEditorBlockIdx] = useState<number | null>(null) // índice no array de CifraBlocks

  const openTabEditor = useCallback((lines: string[], label: string | undefined, blockIdx: number) => {
    setTabEditorLines(lines)
    setTabEditorLabel(label ?? '')
    setTabEditorBlockIdx(blockIdx)
    setTabEditorOpen(true)
  }, [])

  const handleSaveTab = useCallback((newLines: string[], newLabel: string, _data?: any) => {
    if (tabEditorBlockIdx === null || !song?.cifra_content) return
    // Reconstruir o cifra_content substituindo o bloco de tab editado
    const blocks = parseCifraBlocks(song.cifra_content)
    let tabCount = -1
    const outputLines: string[] = []

    for (const block of blocks) {
      if (block.type === 'tab') {
        tabCount++
        if (tabCount === tabEditorBlockIdx) {
          // Substituir este bloco
          if (newLabel) outputLines.push(newLabel)
          outputLines.push(...newLines)
        } else {
          if (block.label) outputLines.push(block.label)
          outputLines.push(...block.lines)
        }
      } else if (block.type === 'section') {
        outputLines.push(block.text)
      } else if (block.type === 'chord') {
        outputLines.push(block.text)
      } else if (block.type === 'lyric') {
        outputLines.push(block.text)
      } else if (block.type === 'empty') {
        outputLines.push('')
      }
    }

    const newContent = outputLines.join('\n')
    // Salvar no banco
    updateSong(song.id, { cifra_content: newContent })
      .then(() => {
        toast.success('Tablatura atualizada!')
        setTabEditorOpen(false)
        onSaved?.()
      })
      .catch((e: any) => {
        toast.error('Erro ao salvar tablatura: ' + (e?.message ?? ''))
      })
  }, [tabEditorBlockIdx, song, onSaved])

  // Resetar transposição quando a música muda
  useEffect(() => {
    setTransposeSemitones(0)
  }, [song?.id])

  // Cifra e acordes transpostos (derivados, sem salvar no banco)
  const useFlats = useMemo(() => shouldUseFlats(song?.key ?? null), [song?.key])

  const transposedCifra = useMemo(() => {
    if (!song?.cifra_content || transposeSemitones === 0) return song?.cifra_content ?? ''
    return transposeCifraContent(song.cifra_content, transposeSemitones, useFlats)
  }, [song?.cifra_content, transposeSemitones, useFlats])

  const transposedChords = useMemo(() => {
    if (!(song?.chords?.length) || transposeSemitones === 0) return song?.chords ?? []
    return transposeChords(song.chords, transposeSemitones, useFlats)
  }, [song?.chords, transposeSemitones, useFlats])

  const handleGeneratePdf = useCallback(async () => {
    if (!song) return
    setGeneratingPdf(true)
    try {
      const filename = `${song.title} - ${song.artist}`.replace(/[^a-zA-Z0-9À-ÿ\s\-_]/g, '').trim()
      await generateRepertoireBookPdf({
        songs: [{
          title: song.title,
          artist: song.artist ?? '',
          key: transposeSemitones !== 0
            ? transposeKey(song.key ?? '', transposeSemitones, useFlats)
            : (song.key ?? undefined),
          chords: transposedChords,
          cifraContent: transposedCifra,
        }],
        recipe: {
          guitar: showGuitar,
          piano: showPiano,
          ukulele: false,
          tab: showTab,
        },
        filename,
        guitarChordMap,
        pianoChordMap,
      })
      toast.success('PDF gerado com sucesso!')
    } catch (e: any) {
      toast.error('Erro ao gerar PDF: ' + (e?.message ?? ''))
    } finally {
      setGeneratingPdf(false)
    }
  }, [song, showGuitar, showPiano, showTab, transposeSemitones, useFlats, transposedChords, transposedCifra, guitarChordMap, pianoChordMap])

  // Buscar diagramas dos acordes transpostos (quando transpõe, buscar novos diagramas)
  const chordsForLibrary = useMemo(() => {
    return transposeSemitones === 0 ? (song?.chords ?? []) : transposedChords
  }, [song?.chords, transposeSemitones, transposedChords])

  // Chave estável para evitar loop infinito no useEffect de busca de acordes
  const chordsKey = useMemo(() => chordsForLibrary.join(','), [chordsForLibrary])

  // --- Auto-preenchimento de acordes faltantes ---
  const [autoFilling, setAutoFilling] = useState(false)

  const missingGuitarChords = useMemo(() => {
    if (!transposedChords.length) return []
    return transposedChords.filter(name => !guitarChordMap.has(name))
  }, [transposedChords, guitarChordMap])

  const missingPianoChords = useMemo(() => {
    if (!transposedChords.length) return []
    return transposedChords.filter(name => {
      const lib = pianoChordMap.get(name)
      if (!lib) return true
      const pos = lib.positions as any
      return !(pos?.keys?.length > 0)
    })
  }, [transposedChords, pianoChordMap])

  const totalMissing = missingGuitarChords.length + missingPianoChords.length

  const handleAutoFillChords = useCallback(async () => {
    if (!transposedChords.length) return
    setAutoFilling(true)

    try {
      // Buscar acordes faltantes de violão
      const guitarResults = autoFillChordsFound(missingGuitarChords, ['guitar'])
      // Buscar acordes faltantes de piano
      const pianoResults = autoFillChordsFound(missingPianoChords, ['piano'])

      let createdGuitar = 0
      let createdPiano = 0
      const errors: string[] = []

      // Acordes já na biblioteca (evitar duplicatas)
      const existingNames = new Set(
        libraryChords.map(c => `${c.name}::${c.instrument}`)
      )

      // Criar acordes de violão na biblioteca
      for (const result of guitarResults) {
        if (existingNames.has(`${result.chordName}::guitar`)) continue
        try {
          const posWithPosition = {
            ...result.positions,
            position: result.baseFret ?? 1,
          }
          await createChord({
            name: result.chordName,
            instrument: 'guitar' as any,
            positions: posWithPosition as any,
            difficulty: 1,
            tags: ['auto-preenchido'],
          })
          createdGuitar++
        } catch (e: any) {
          errors.push(`${result.chordName} (violão): ${e?.message ?? 'erro'}`)
        }
      }

      // Criar acordes de piano na biblioteca
      for (const result of pianoResults) {
        if (existingNames.has(`${result.chordName}::piano`)) continue
        try {
          await createChord({
            name: result.chordName,
            instrument: 'piano' as any,
            positions: result.positions as any,
            difficulty: 1,
            tags: ['auto-preenchido'],
          })
          createdPiano++
        } catch (e: any) {
          errors.push(`${result.chordName} (piano): ${e?.message ?? 'erro'}`)
        }
      }

      const total = createdGuitar + createdPiano
      if (total > 0) {
        toast.success(`${total} acorde${total > 1 ? 's' : ''} criado${total > 1 ? 's' : ''} automaticamente!`, {
          description: `🎸 ${createdGuitar} violão · 🎹 ${createdPiano} piano`,
        })
        window.dispatchEvent(new Event('chord-library-updated'))
        // Recarregar acordes no sheet (usar transposedChords, não song.chords)
        getChordsByNames(transposedChords)
          .then(data => setLibraryChords(data))
          .catch(() => {})
      }

      const notFound = guitarResults.length === 0 && pianoResults.length === 0
        ? missingGuitarChords.length + missingPianoChords.length
        : (missingGuitarChords.length - createdGuitar) + (missingPianoChords.length - createdPiano)

      if (notFound > 0) {
        toast.info(`${notFound} acorde${notFound > 1 ? 's' : ''} não encontrado${notFound > 1 ? 's' : ''} no banco automático`, {
          description: 'Use duplo clique para criar manualmente',
        })
      }

      if (errors.length > 0) {
        console.warn('Erros ao auto-preencher:', errors)
      }
    } catch (e: any) {
      toast.error('Erro ao preencher acordes: ' + (e?.message ?? ''))
    } finally {
      setAutoFilling(false)
    }
  }, [transposedChords, missingGuitarChords, missingPianoChords, guitarChordMap, pianoChordMap])

  // Estado do formulário de edição
  const [form, setForm] = useState<EditForm>({
    title: '', artist: '', key: '', genre: '', difficulty: 1,
    curation_status: 'draft', youtube_url: '', chords: '',
    cifra_content: '', lyrics: '', gp_file_url: '',
  })
  const [uploadingGp, setUploadingGp] = useState(false)
  const gpInputRef = useRef<HTMLInputElement>(null)

  // Sincronizar formulário quando a música muda
  useEffect(() => {
    if (song) {
      setForm({
        title: song.title ?? '',
        artist: song.artist ?? '',
        key: song.key ?? '',
        genre: song.genre ?? '',
        difficulty: song.difficulty ?? 1,
        curation_status: (song.curation_status ?? 'draft') as CurationStatus,
        youtube_url: song.youtube_url ?? '',
        chords: (song.chords ?? []).join(', '),
        cifra_content: song.cifra_content ?? '',
        lyrics: song.lyrics ?? '',
        gp_file_url: (song as any).gp_file_url ?? '',
      })
      setActiveTab('cifra')
    }
  }, [song?.id, open])

  // Buscar acordes da chord_library quando abrir a ficha (ou quando transpõe)
  useEffect(() => {
    if (!open || !song || chordsForLibrary.length === 0) {
      setLibraryChords([])
      return
    }
    let cancelled = false
    setLoadingChords(true)
    // Buscar todos os instrumentos (guitar + piano)
    getChordsByNames(chordsForLibrary)
      .then(data => { if (!cancelled) setLibraryChords(data) })
      .catch(() => { if (!cancelled) setLibraryChords([]) })
      .finally(() => { if (!cancelled) setLoadingChords(false) })
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, song?.id, chordsKey])

  // Upload de arquivo Guitar Pro
  const handleGpUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !song) return
    setUploadingGp(true)
    try {
      // Se já tem um arquivo, remover o antigo
      if (form.gp_file_url && form.gp_file_url.includes('supabase')) {
        await deleteGpFile(form.gp_file_url).catch(() => {})
      }
      const publicUrl = await uploadGpFile(file, song.id)
      await updateGpFileUrl(song.id, publicUrl)
      updateField('gp_file_url', publicUrl)
      toast.success('Arquivo GP enviado com sucesso!')
      onSaved?.() // Recarregar dados
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao enviar arquivo GP')
    } finally {
      setUploadingGp(false)
      if (gpInputRef.current) gpInputRef.current.value = ''
    }
  }, [song, form.gp_file_url])

  const handleRemoveGp = useCallback(async () => {
    if (!song) return
    try {
      if (form.gp_file_url && form.gp_file_url.includes('supabase')) {
        await deleteGpFile(form.gp_file_url).catch(() => {})
      }
      await updateGpFileUrl(song.id, null)
      updateField('gp_file_url', '')
      toast.success('Arquivo GP removido')
      onSaved?.()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao remover arquivo GP')
    }
  }, [song, form.gp_file_url])

  const handleSave = useCallback(async () => {
    if (!song) return
    setSaving(true)
    try {
      const chordsArr = form.chords
        .split(',')
        .map(c => c.trim())
        .filter(Boolean)

      await updateSong(song.id, {
        title: form.title,
        artist: form.artist || null,
        key: form.key || null,
        genre: form.genre || null,
        difficulty: form.difficulty,
        curation_status: form.curation_status,
        youtube_url: form.youtube_url || null,
        chords: chordsArr.length > 0 ? chordsArr : null,
        cifra_content: form.cifra_content || null,
        lyrics: form.lyrics || null,
        gp_file_url: form.gp_file_url || null,
      } as any)
      toast.success('Ficha atualizada com sucesso!')
      onSaved?.()
    } catch (e: any) {
      toast.error('Erro ao salvar: ' + (e?.message ?? 'Erro desconhecido'))
    } finally {
      setSaving(false)
    }
  }, [song, form, onSaved])

  const updateField = useCallback(<K extends keyof EditForm>(field: K, value: EditForm[K]) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }, [])

  if (!song) return null

  const diff = song.difficulty ?? 1
  const diffConfig = DIFFICULTY_CONFIG[diff] ?? DIFFICULTY_CONFIG[1]
  const curationConfig = CURATION_CONFIG[song.curation_status ?? 'draft'] ?? CURATION_CONFIG.draft
  const genreColors = GENRE_COLORS[song.genre ?? ''] ?? 'bg-slate-500/15 text-slate-400'

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={true}
        className="!w-[65vw] !max-w-[900px] !sm:max-w-[900px] p-0 bg-[var(--bg)] border-l border-border"
      >
        <div className="flex flex-col h-full">

          {/* ====== HEADER ====== */}
          <SheetHeader className="px-6 pt-6 pb-4 border-b border-border bg-card space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <SheetTitle className="font-serif text-[22px] text-text leading-tight">
                  {song.title}
                </SheetTitle>
                <SheetDescription className="text-text2 text-[14px] mt-1">
                  {song.artist ?? 'Artista desconhecido'}
                </SheetDescription>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEnrichWithAI}
                  disabled={enriching}
                  className="border-accent/30 text-accent hover:bg-accent/10 text-xs"
                >
                  {enriching ? <SpinnerGap size={14} className="animate-spin" /> : <MusicNotesSimple size={14} />}
                  {enriching ? 'Analisando...' : 'Completar com IA'}
                </Button>
                {onEdit && (
                  <Button variant="ghost" size="sm" onClick={() => onEdit(song)}>
                    <PencilSimple size={16} /> Editar
                  </Button>
                )}
              </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Tom */}
              {song.key && (
                <span className="font-mono text-[12px] font-bold px-2.5 py-1 rounded-lg bg-[var(--azul-escuro)]/25 text-[var(--azul-claro)]">
                  Tom: {song.key}
                </span>
              )}
              {/* BPM */}
              {song.bpm && (
                <span className="font-mono text-[12px] font-bold px-2.5 py-1 rounded-lg bg-[var(--azul-escuro)]/25 text-[var(--rosa)]">
                  {song.bpm} BPM
                </span>
              )}
              {/* Gênero */}
              {song.genre && (
                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold ${genreColors}`}>
                  {song.genre}
                </span>
              )}
              {/* Dificuldade */}
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${diffConfig.bg} ${diffConfig.color}`}>
                <DifficultyStars level={diff} />
                {diffConfig.label}
              </span>
              {/* Curadoria */}
              <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-[0.5px] ${curationConfig.bg} ${curationConfig.color}`}>
                {curationConfig.label}
              </span>
              {/* Origem */}
              {song.cifra_source === 'cifra_club' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-500/15 text-amber-400">
                  <Lightning size={12} weight="fill" /> Cifra Club
                </span>
              )}
            </div>

            {/* Instrumentos */}
            {(song.instruments ?? []).length > 0 && (
              <div className="flex gap-1.5 flex-wrap">
                {(song.instruments ?? []).map(inst => (
                  <InstrumentBadge key={inst} instrument={inst} />
                ))}
              </div>
            )}

            {/* Links */}
            <div className="flex gap-2">
              {song.youtube_url && (
                <a
                  href={song.youtube_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-red-400 hover:text-red-300 transition-colors"
                >
                  <YoutubeLogo size={14} weight="fill" /> YouTube
                  <ArrowSquareOut size={10} />
                </a>
              )}
              {song.source_url && (
                <a
                  href={song.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-text3 hover:text-text2 transition-colors"
                >
                  <LinkIcon size={14} /> Fonte original
                  <ArrowSquareOut size={10} />
                </a>
              )}
            </div>
          </SheetHeader>

          {/* ====== CONTEÚDO ====== */}
          <div className="flex-1 min-h-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
              <TabsList className="mx-6 mt-4 mb-0 bg-[var(--bg2)] rounded-lg w-fit">
                <TabsTrigger value="cifra" className="text-[12px]">Cifra Completa</TabsTrigger>
                <TabsTrigger value="info" className="text-[12px]">Informações</TabsTrigger>
                {song.lyrics && <TabsTrigger value="letra" className="text-[12px]">Letra</TabsTrigger>}
                {(song as any).gp_file_url && (
                  <TabsTrigger value="tablatura" className="text-[12px]">Tablatura</TabsTrigger>
                )}
                <TabsTrigger value="editar" className="text-[12px] gap-1">
                  <PencilSimple size={12} /> Editar
                </TabsTrigger>
              </TabsList>

              {/* Tab: Cifra completa */}
              <TabsContent value="cifra" className="flex-1 min-h-0 mt-0 px-0">
                <ScrollArea className="h-[calc(100vh-280px)]">
                  <div className="px-6 py-4">
                    {/* Acordes da música */}
                    {(song.chords ?? []).length > 0 && (
                      <div className="mb-4">
                        <h3 className="text-[11px] font-semibold uppercase tracking-[1.5px] text-text3 mb-2">
                          Acordes ({transposedChords.length})
                        </h3>
                        <div className="flex gap-1.5 flex-wrap items-center">
                          {transposedChords.map(chord => (
                            <span
                              key={chord}
                              className="font-mono text-[12px] font-bold px-2.5 py-1 rounded-lg bg-[var(--azul-escuro)]/20 text-[var(--azul-claro)] border border-[var(--azul-escuro)]/10"
                            >
                              {chord}
                            </span>
                          ))}
                        </div>
                        {/* Botão auto-preencher acordes faltantes */}
                        {totalMissing > 0 && !loadingChords && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2 gap-1.5 text-[11px] h-7 border-accent/30 text-accent hover:bg-accent/10 hover:text-accent"
                            onClick={handleAutoFillChords}
                            disabled={autoFilling}
                          >
                            {autoFilling ? (
                              <SpinnerGap size={14} className="animate-spin" />
                            ) : (
                              <Lightning size={14} weight="fill" />
                            )}
                            {autoFilling
                              ? 'Preenchendo...'
                              : `Preencher ${totalMissing} acorde${totalMissing > 1 ? 's' : ''} faltante${totalMissing > 1 ? 's' : ''}`
                            }
                          </Button>
                        )}

                        {/* Sugestões pedagógicas */}
                        <ChordSuggestions
                          knownChords={transposedChords}
                        />
                      </div>
                    )}

                    {/* Transposição de tonalidade */}
                    {(song.chords ?? []).length > 0 && song.cifra_content && (
                      <div className="mb-3">
                        <TransposeControl
                          originalKey={song.key}
                          semitones={transposeSemitones}
                          onChange={setTransposeSemitones}
                        />
                      </div>
                    )}

                    {/* Filtros de visibilidade */}
                    {(song.chords ?? []).length > 0 && (
                      <div className="flex items-center gap-1.5 mb-4">
                        <span className="text-[10px] text-text3/60 uppercase tracking-wider mr-1">Exibir:</span>
                        <button
                          onClick={() => setShowGuitar(v => !v)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border ${
                            showGuitar
                              ? 'bg-accent/15 text-accent border-accent/30'
                              : 'bg-transparent text-text3/50 border-border hover:border-text3/30'
                          }`}
                        >
                          {showGuitar ? <Eye size={13} /> : <EyeSlash size={13} />}
                          Violão
                        </button>
                        <button
                          onClick={() => setShowPiano(v => !v)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border ${
                            showPiano
                              ? 'bg-accent/15 text-accent border-accent/30'
                              : 'bg-transparent text-text3/50 border-border hover:border-text3/30'
                          }`}
                        >
                          {showPiano ? <Eye size={13} /> : <EyeSlash size={13} />}
                          Teclado
                        </button>
                        <button
                          onClick={() => setShowTab(v => !v)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border ${
                            showTab
                              ? 'bg-accent/15 text-accent border-accent/30'
                              : 'bg-transparent text-text3/50 border-border hover:border-text3/30'
                          }`}
                        >
                          {showTab ? <Eye size={13} /> : <EyeSlash size={13} />}
                          Tablatura
                        </button>

                        {/* Botão Gerar PDF */}
                        <div className="ml-auto">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 text-[11px] h-7 border-accent/30 text-accent hover:bg-accent/10"
                            onClick={handleGeneratePdf}
                            disabled={generatingPdf}
                          >
                            {generatingPdf ? (
                              <SpinnerGap size={13} className="animate-spin" />
                            ) : (
                              <FilePdf size={13} weight="fill" />
                            )}
                            {generatingPdf ? 'Gerando...' : 'Gerar PDF'}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Diagramas SVGuitar */}
                    {showGuitar && (song.chords ?? []).length > 0 && !loadingChords && (
                      <div className="mb-4">
                        <h3 className="text-[11px] font-semibold uppercase tracking-[1.5px] text-text3 mb-3">
                          Violão
                          {guitarChords.length > 0 && (
                            <span className="ml-2 text-text3/60">
                              ({guitarChords.length} de {transposedChords.length} na biblioteca)
                            </span>
                          )}
                        </h3>
                        <div className="flex flex-wrap gap-3">
                          {transposedChords.map(chordName => {
                            const lib = guitarChordMap.get(chordName)
                            if (lib && lib.positions && typeof lib.positions === 'object') {
                              const pos = lib.positions as any
                              return (
                                <TooltipProvider key={chordName} delayDuration={400}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div
                                        className="text-center cursor-pointer rounded-lg hover:bg-[var(--azul-soft)] transition-colors"
                                        onDoubleClick={() => openChordEditor(lib)}
                                      >
                                        <ChordDiagram
                                          name={chordName}
                                          positions={{
                                            fingers: pos.fingers ?? [],
                                            barres: pos.barres ?? [],
                                            muted: pos.muted ?? [],
                                          }}
                                          position={pos.position ?? 1}
                                          size="compact"
                                        />
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">
                                      <p className="text-xs">Duplo clique para editar</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )
                            }
                            // Acorde não encontrado na biblioteca — duplo clique para criar
                            return (
                              <TooltipProvider key={chordName} delayDuration={200}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div
                                      className="w-[90px] h-[120px] rounded-lg border border-dashed border-border flex flex-col items-center justify-center gap-1 text-text3/50 cursor-pointer hover:border-accent/40 hover:text-accent/70 transition-colors"
                                      onDoubleClick={() => openChordEditorForNew(chordName)}
                                    >
                                      <WarningCircle size={16} />
                                      <span className="font-mono text-[11px] font-bold">{chordName}</span>
                                      <span className="text-[8px]">Sem diagrama</span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs">Duplo clique para criar acorde "{chordName}"</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Diagramas de Teclado */}
                    {showPiano && (song.chords ?? []).length > 0 && (
                      <div className="mb-4">
                        <h3 className="text-[11px] font-semibold uppercase tracking-[1.5px] text-text3 mb-3">
                          Teclado
                          <span className="ml-2 text-text3/60">
                            ({pianoChords.length} de {transposedChords.length} na biblioteca)
                          </span>
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {transposedChords.map(chordName => {
                            const lib = pianoChordMap.get(chordName)
                            if (lib && lib.positions && typeof lib.positions === 'object') {
                              const pos = lib.positions as any
                              const keys = (pos.keys ?? []) as string[]
                              if (keys.length === 0) {
                                // Acorde existe mas sem teclas — tratar como faltante
                              } else {
                                const fingeringRh = (pos.fingering_rh ?? []) as number[]
                                return (
                                  <TooltipProvider key={chordName} delayDuration={400}>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div
                                          className="rounded-lg bg-card border border-border p-3 cursor-pointer hover:bg-[var(--azul-soft)] transition-colors"
                                          onDoubleClick={() => openKeyboardEditor(lib)}
                                        >
                                          <PianoKeyboard
                                            keys={keys}
                                            fingeringRH={fingeringRh.length > 0 ? fingeringRh : undefined}
                                            label={chordName}
                                            showLabels={fingeringRh.length > 0}
                                            range={['C4', 'C6']}
                                            scale={0.8}
                                            className="w-full"
                                          />
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent side="bottom">
                                        <p className="text-xs">Duplo clique para editar</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )
                              }
                            }
                            // Acorde não encontrado na biblioteca (piano) — duplo clique para criar
                            return (
                              <TooltipProvider key={chordName} delayDuration={200}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div
                                      className="rounded-lg bg-card border border-dashed border-border p-3 flex flex-col items-center justify-center gap-1 text-text3/50 cursor-pointer hover:border-accent/40 hover:text-accent/70 transition-colors min-h-[100px]"
                                      onDoubleClick={() => openKeyboardEditorForNew(chordName)}
                                    >
                                      <PianoKeys size={20} />
                                      <span className="font-mono text-[12px] font-bold">{chordName}</span>
                                      <span className="text-[9px]">Sem diagrama</span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs">Duplo clique para criar acorde "{chordName}" no teclado</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    <Separator className="my-4" />

                    {/* Cifra formatada */}
                    {song.cifra_content ? (
                      <div className="rounded-xl bg-card border border-border p-5">
                        <CifraContentView content={transposedCifra} onTabDoubleClick={openTabEditor} hideTabs={!showTab} />
                      </div>
                    ) : (
                      <div className="text-center py-12 text-text3">
                        <MusicNote size={32} className="mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Nenhuma cifra importada para esta música.</p>
                        <p className="text-xs mt-1">Use o botão "Editar" para adicionar manualmente.</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Tab: Informações */}
              <TabsContent value="info" className="flex-1 min-h-0 mt-0 px-0">
                <ScrollArea className="h-[calc(100vh-280px)]">
                  <div className="px-6 py-4 space-y-6">

                    {/* Chord Structure */}
                    <ChordStructureView structure={song.chord_structure} />

                    {/* YouTube embed */}
                    {song.youtube_url && <YouTubeEmbed url={song.youtube_url} />}

                    {/* Metadados */}
                    <div className="space-y-3">
                      <h3 className="text-[11px] font-semibold uppercase tracking-[1.5px] text-text3">
                        Metadados
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        <MetaItem label="Título" value={song.title} />
                        <MetaItem label="Artista" value={song.artist ?? '—'} />
                        <MetaItem label="Tom" value={song.key ?? '—'} mono />
                        <MetaItem label="BPM" value={song.bpm ? `${song.bpm}` : '—'} mono />
                        <MetaItem label="Gênero" value={song.genre ?? '—'} />
                        <MetaItem label="Dificuldade" value={diffConfig.label} />
                        <MetaItem label="Curadoria" value={curationConfig.label} />
                        <MetaItem label="Origem" value={
                          song.cifra_source === 'cifra_club' ? 'Cifra Club' :
                          song.cifra_source === 'songsterr' ? 'Songsterr' :
                          song.cifra_source === 'gp_import' ? 'Guitar Pro' :
                          song.cifra_source === 'chordpro' ? 'ChordPro' :
                          song.cifra_source === 'olga' ? 'OLGA' :
                          'Manual'
                        } />
                        <MetaItem label="Acordes" value={`${(song.chords ?? []).length} acordes`} />
                        {song.created_at && (
                          <MetaItem label="Cadastrado em" value={new Date(song.created_at).toLocaleDateString('pt-BR')} />
                        )}
                        {song.updated_at && (
                          <MetaItem label="Atualizado em" value={new Date(song.updated_at).toLocaleDateString('pt-BR')} />
                        )}
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Tab: Letra */}
              {song.lyrics && (
                <TabsContent value="letra" className="flex-1 min-h-0 mt-0 px-0">
                  <ScrollArea className="h-[calc(100vh-280px)]">
                    <div className="px-6 py-4">
                      <div className="rounded-xl bg-card border border-border p-5">
                        <div className="text-[14px] leading-[1.8] text-text whitespace-pre-wrap">
                          {song.lyrics}
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                </TabsContent>
              )}

              {/* Tab: Tablatura (AlphaTab) */}
              {(song as any).gp_file_url && (
                <TabsContent value="tablatura" className="flex-1 min-h-0 mt-0 px-0">
                  <div className="px-6 py-4">
                    <AlphaTabPlayer
                      fileUrl={(song as any).gp_file_url}
                      minHeight={500}
                    />
                  </div>
                </TabsContent>
              )}

              {/* Tab: Editar */}
              <TabsContent value="editar" className="flex-1 min-h-0 mt-0 px-0">
                <ScrollArea className="h-[calc(100vh-280px)]">
                  <div className="px-6 py-4 space-y-6">

                    {/* Metadados principais */}
                    <div className="space-y-3">
                      <h3 className="text-[11px] font-semibold uppercase tracking-[1.5px] text-text3">
                        Dados da Música
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-[11px] text-text3">Título *</Label>
                          <Input
                            value={form.title}
                            onChange={e => updateField('title', e.target.value)}
                            placeholder="Nome da música"
                            className="h-9 text-[13px]"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[11px] text-text3">Artista</Label>
                          <Input
                            value={form.artist}
                            onChange={e => updateField('artist', e.target.value)}
                            placeholder="Nome do artista"
                            className="h-9 text-[13px]"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[11px] text-text3">Tom</Label>
                          <Input
                            value={form.key}
                            onChange={e => updateField('key', e.target.value)}
                            placeholder="Ex: Am, C, G"
                            className="h-9 text-[13px] font-mono"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[11px] text-text3">Gênero</Label>
                          <Input
                            value={form.genre}
                            onChange={e => updateField('genre', e.target.value)}
                            placeholder="Ex: Rock, MPB, Pop"
                            className="h-9 text-[13px]"
                          />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Dificuldade e Curadoria */}
                    <div className="space-y-3">
                      <h3 className="text-[11px] font-semibold uppercase tracking-[1.5px] text-text3">
                        Classificação
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-[11px] text-text3">Dificuldade</Label>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map(n => (
                              <button
                                key={n}
                                type="button"
                                onClick={() => updateField('difficulty', n)}
                                className="p-1 hover:scale-110 transition-transform"
                              >
                                <Star
                                  size={20}
                                  weight={n <= form.difficulty ? 'fill' : 'regular'}
                                  className={n <= form.difficulty ? 'text-amber-400' : 'text-text3/30'}
                                />
                              </button>
                            ))}
                            <span className="ml-2 text-[11px] text-text3 self-center">
                              {DIFFICULTY_CONFIG[form.difficulty]?.label ?? ''}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[11px] text-text3">Status de curadoria</Label>
                          <Select
                            value={form.curation_status}
                            onValueChange={v => updateField('curation_status', v as CurationStatus)}
                          >
                            <SelectTrigger className="h-9 text-[13px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="draft">Rascunho</SelectItem>
                              <SelectItem value="review">Em Revisão</SelectItem>
                              <SelectItem value="approved">Aprovado</SelectItem>
                              <SelectItem value="published">Publicado</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* YouTube e Acordes */}
                    <div className="space-y-3">
                      <h3 className="text-[11px] font-semibold uppercase tracking-[1.5px] text-text3">
                        Mídia e Acordes
                      </h3>
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <Label className="text-[11px] text-text3">URL do YouTube</Label>
                          <Input
                            value={form.youtube_url}
                            onChange={e => updateField('youtube_url', e.target.value)}
                            placeholder="https://youtube.com/watch?v=..."
                            className="h-9 text-[13px] font-mono"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[11px] text-text3">Arquivo Guitar Pro (tablatura)</Label>
                          <input
                            ref={gpInputRef}
                            type="file"
                            accept=".gp,.gp3,.gp4,.gp5,.gpx,.gp7,.musicxml,.mxl"
                            onChange={handleGpUpload}
                            className="hidden"
                          />
                          {form.gp_file_url ? (
                            <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                              <MusicNotesSimple size={16} className="text-green-400 shrink-0" />
                              <span className="text-[11px] text-green-300 truncate flex-1 font-mono">
                                {form.gp_file_url.includes('supabase')
                                  ? decodeURIComponent(form.gp_file_url.split('/').pop() || 'arquivo.gp')
                                  : form.gp_file_url}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-green-400 hover:text-accent hover:bg-accent/10"
                                onClick={() => gpInputRef.current?.click()}
                                disabled={uploadingGp}
                                title="Trocar arquivo"
                              >
                                {uploadingGp ? <SpinnerGap size={12} className="animate-spin" /> : <UploadSimple size={12} />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-text3 hover:text-red-400 hover:bg-red-400/10"
                                onClick={handleRemoveGp}
                                title="Remover arquivo GP"
                              >
                                <Trash size={12} />
                              </Button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => gpInputRef.current?.click()}
                              disabled={uploadingGp}
                              className="w-full flex items-center justify-center gap-2 p-3 rounded-lg border border-dashed border-border hover:border-accent/40 hover:bg-accent/5 transition-colors text-text3 disabled:opacity-50"
                            >
                              {uploadingGp ? (
                                <SpinnerGap size={16} className="animate-spin text-accent" />
                              ) : (
                                <UploadSimple size={16} />
                              )}
                              <span className="text-[11px]">
                                {uploadingGp ? 'Enviando...' : 'Enviar arquivo .gp, .gpx, .gp7, .musicxml'}
                              </span>
                            </button>
                          )}
                          <Input
                            value={form.gp_file_url}
                            onChange={e => updateField('gp_file_url', e.target.value)}
                            placeholder="Ou cole uma URL direta do arquivo GP"
                            className="h-7 text-[10px] font-mono text-text3/70"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[11px] text-text3">
                            Acordes <span className="text-text3/50">(separados por vírgula)</span>
                          </Label>
                          <Input
                            value={form.chords}
                            onChange={e => updateField('chords', e.target.value)}
                            placeholder="C, Am, F, G"
                            className="h-9 text-[13px] font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Cifra */}
                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-text3">
                        Cifra Completa <span className="text-text3/50">(inclui tablatura, acordes, seções)</span>
                      </Label>
                      <Textarea
                        value={form.cifra_content}
                        onChange={e => updateField('cifra_content', e.target.value)}
                        placeholder="Cole aqui a cifra completa..."
                        className="min-h-[200px] font-mono text-[11px] leading-[1.5] resize-y"
                      />
                    </div>

                    {/* Letra */}
                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-text3">
                        Letra <span className="text-text3/50">(sem acordes)</span>
                      </Label>
                      <Textarea
                        value={form.lyrics}
                        onChange={e => updateField('lyrics', e.target.value)}
                        placeholder="Cole aqui a letra da música..."
                        className="min-h-[150px] text-[13px] leading-[1.7] resize-y"
                      />
                    </div>

                    {/* Botão Salvar */}
                    <div className="flex justify-end gap-3 pt-2 pb-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveTab('cifra')}
                        disabled={saving}
                      >
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={saving || !form.title.trim()}
                        className="gap-1.5"
                      >
                        {saving ? (
                          <SpinnerGap size={14} className="animate-spin" />
                        ) : (
                          <FloppyDisk size={14} />
                        )}
                        {saving ? 'Salvando...' : 'Salvar Alterações'}
                      </Button>
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </SheetContent>

      {/* ====== MODAL: Editor de Acorde (Violão) ====== */}
      <Dialog open={chordEditorOpen} onOpenChange={setChordEditorOpen}>
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
                <Label className="text-[11px] text-text3 uppercase tracking-wider mb-1 block">Nome do acorde</Label>
                <Input
                  value={chordEditorName}
                  onChange={e => setChordEditorName(e.target.value)}
                  placeholder="Ex: Am7"
                  className="text-[13px] h-9"
                />
              </div>
              <div>
                <Label className="text-[11px] text-text3 uppercase tracking-wider mb-1 block">Traste inicial</Label>
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
            <Button onClick={handleSaveChordEditor}>
              <FloppyDisk size={16} /> {chordEditorId ? 'Salvar Acorde' : 'Criar Acorde'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ====== MODAL: Preview Enriquecimento IA ====== */}
      <Dialog open={!!enrichPreview} onOpenChange={(v) => { if (!v) { setEnrichPreview(null); setEnrichResult(null) } }}>
        <DialogContent className="bg-surface border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-text flex items-center gap-2">
              <MusicNotesSimple size={18} className="text-accent" />
              Completar com IA
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {enrichPreview?.map(item => (
              <label
                key={item.field}
                className={`flex items-start gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${
                  enrichSelectedFields.has(item.field)
                    ? 'border-accent/40 bg-accent/5'
                    : 'border-border bg-card hover:border-border/80'
                }`}
              >
                <input
                  type="checkbox"
                  checked={enrichSelectedFields.has(item.field)}
                  onChange={() => toggleEnrichField(item.field)}
                  className="mt-1 accent-[var(--accent)]"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-text3">{item.label}</p>
                  <div className="mt-1 space-y-0.5">
                    <p className="text-[12px] text-text3 line-through">{item.before}</p>
                    <p className="text-[13px] text-text font-medium break-words">{item.after}</p>
                  </div>
                </div>
              </label>
            ))}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => { setEnrichPreview(null); setEnrichResult(null) }} className="border-border text-text2">
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleApplyEnrichment}
              disabled={applyingEnrich || enrichSelectedFields.size === 0}
              className="bg-accent hover:bg-accent/90 text-white"
            >
              {applyingEnrich ? <SpinnerGap size={14} className="animate-spin" /> : null}
              Aplicar {enrichSelectedFields.size} campo{enrichSelectedFields.size !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ====== MODAL: Editor de Teclado (Piano) ====== */}
      <KeyboardEditor
        open={keyboardEditorOpen}
        onOpenChange={(v) => { setKeyboardEditorOpen(v); if (!v) setKeyboardEditorChord(null) }}
        chord={keyboardEditorChord}
        onSave={handleSaveKeyboard}
      />

      {/* ====== MODAL: Editor de Tablatura ====== */}
      <TablatureEditor
        open={tabEditorOpen}
        onOpenChange={setTabEditorOpen}
        initialLines={tabEditorLines}
        initialLabel={tabEditorLabel}
        onSave={handleSaveTab}
      />
    </Sheet>
  )
}

// Item de metadados
function MetaItem({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg bg-card border border-border px-3 py-2">
      <p className="text-[9px] font-semibold uppercase tracking-[1.5px] text-text3 mb-0.5">{label}</p>
      <p className={`text-[13px] text-text font-medium ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  )
}
