import { useMemo, useEffect, useState } from "react"
import {
  MusicNote, Guitar, PianoKeys, MicrophoneStage, Lightning,
  Star, YoutubeLogo, Link as LinkIcon, PencilSimple, ArrowSquareOut, WarningCircle
} from "@phosphor-icons/react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ChordDiagram } from "@/components/music/ChordDiagram"
import { PianoKeyboard } from "@/components/music/PianoKeyboard"
import { getChordsByNames, type Chord } from "@/services/libraryService"
import type { Tables } from "@/lib/database.types"
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

// Renderiza o conteúdo da cifra com syntax highlighting
function CifraContentView({ content }: { content: string }) {
  const lines = content.split('\n')

  return (
    <div className="font-mono text-[12px] leading-[1.7] whitespace-pre-wrap">
      {lines.map((line, i) => {
        const trimmed = line.trim()
        // Seção [Intro], [Verso], etc
        if (/^\[.*\]/.test(trimmed)) {
          return (
            <div key={i} className="text-accent font-bold mt-4 mb-1 text-[13px]">
              {trimmed}
            </div>
          )
        }
        // Linha de tablatura (E|---, B|---, etc)
        if (/^\s*[EBADGe]\|/.test(line) || /^\s*\|/.test(trimmed)) {
          return (
            <div key={i} className="text-blue-400/70">
              {line}
            </div>
          )
        }
        // Linha só de acordes
        const chordPattern = /^[A-G][#b]?(?:m|M|maj|min|dim|aug|sus[24]?|add[249]?|[0-9])*(?:\/[A-G][#b]?)?$/
        const tokens = trimmed.split(/\s+/)
        const chordRatio = tokens.filter(t => chordPattern.test(t) || t === '|').length / (tokens.length || 1)
        if (chordRatio > 0.5 && trimmed.length > 0) {
          return (
            <div key={i} className="text-accent font-semibold">
              {line}
            </div>
          )
        }
        // Linha vazia
        if (!trimmed) {
          return <div key={i} className="h-2" />
        }
        // Letra normal
        return (
          <div key={i} className="text-text">
            {line}
          </div>
        )
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

interface RepertoireSheetProps {
  song: Repertoire | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: (song: Repertoire) => void
}

export function RepertoireSheet({ song, open, onOpenChange, onEdit }: RepertoireSheetProps) {
  const [libraryChords, setLibraryChords] = useState<Chord[]>([])
  const [loadingChords, setLoadingChords] = useState(false)

  // Buscar acordes da chord_library quando abrir a ficha
  useEffect(() => {
    if (!open || !song || !(song.chords?.length)) {
      setLibraryChords([])
      return
    }
    let cancelled = false
    setLoadingChords(true)
    // Buscar todos os instrumentos (guitar + piano)
    getChordsByNames(song.chords)
      .then(data => { if (!cancelled) setLibraryChords(data) })
      .catch(() => { if (!cancelled) setLibraryChords([]) })
      .finally(() => { if (!cancelled) setLoadingChords(false) })
    return () => { cancelled = true }
  }, [open, song?.id, song?.chords])

  if (!song) return null

  const diff = song.difficulty ?? 1
  const diffConfig = DIFFICULTY_CONFIG[diff] ?? DIFFICULTY_CONFIG[1]
  const curationConfig = CURATION_CONFIG[song.curation_status ?? 'draft'] ?? CURATION_CONFIG.draft
  const genreColors = GENRE_COLORS[song.genre ?? ''] ?? 'bg-slate-500/15 text-slate-400'

  // Separar acordes de violão e piano
  const guitarChords = libraryChords.filter(c => c.instrument === 'guitar')
  const pianoChords = libraryChords.filter(c => (c.instrument as string) === 'piano')
  const guitarChordMap = new Map(guitarChords.map(c => [c.name, c]))
  const pianoChordMap = new Map(pianoChords.map(c => [c.name, c]))

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
              {onEdit && (
                <Button variant="ghost" size="sm" onClick={() => onEdit(song)} className="flex-shrink-0">
                  <PencilSimple size={16} /> Editar
                </Button>
              )}
            </div>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Tom */}
              {song.key && (
                <span className="font-mono text-[12px] font-bold px-2.5 py-1 rounded-lg bg-[var(--azul-escuro)]/25 text-[var(--azul-claro)]">
                  Tom: {song.key}
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
            <Tabs defaultValue="cifra" className="flex flex-col h-full">
              <TabsList className="mx-6 mt-4 mb-0 bg-[var(--bg2)] rounded-lg w-fit">
                <TabsTrigger value="cifra" className="text-[12px]">Cifra Completa</TabsTrigger>
                <TabsTrigger value="info" className="text-[12px]">Informações</TabsTrigger>
                {song.lyrics && <TabsTrigger value="letra" className="text-[12px]">Letra</TabsTrigger>}
              </TabsList>

              {/* Tab: Cifra completa */}
              <TabsContent value="cifra" className="flex-1 min-h-0 mt-0 px-0">
                <ScrollArea className="h-[calc(100vh-280px)]">
                  <div className="px-6 py-4">
                    {/* Acordes da música */}
                    {(song.chords ?? []).length > 0 && (
                      <div className="mb-4">
                        <h3 className="text-[11px] font-semibold uppercase tracking-[1.5px] text-text3 mb-2">
                          Acordes ({(song.chords ?? []).length})
                        </h3>
                        <div className="flex gap-1.5 flex-wrap">
                          {(song.chords ?? []).map(chord => (
                            <span
                              key={chord}
                              className="font-mono text-[12px] font-bold px-2.5 py-1 rounded-lg bg-[var(--azul-escuro)]/20 text-[var(--azul-claro)] border border-[var(--azul-escuro)]/10"
                            >
                              {chord}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Diagramas SVGuitar */}
                    {(song.chords ?? []).length > 0 && !loadingChords && (
                      <div className="mb-4">
                        <h3 className="text-[11px] font-semibold uppercase tracking-[1.5px] text-text3 mb-3">
                          Violão
                          {guitarChords.length > 0 && (
                            <span className="ml-2 text-text3/60">
                              ({guitarChords.length} de {(song.chords ?? []).length} na biblioteca)
                            </span>
                          )}
                        </h3>
                        <div className="flex flex-wrap gap-3">
                          {(song.chords ?? []).map(chordName => {
                            const lib = guitarChordMap.get(chordName)
                            if (lib && lib.positions && typeof lib.positions === 'object') {
                              const pos = lib.positions as any
                              return (
                                <div key={chordName} className="text-center">
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
                              )
                            }
                            // Acorde não encontrado na biblioteca
                            return (
                              <TooltipProvider key={chordName} delayDuration={200}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="w-[90px] h-[120px] rounded-lg border border-dashed border-border flex flex-col items-center justify-center gap-1 text-text3/50">
                                      <WarningCircle size={16} />
                                      <span className="font-mono text-[11px] font-bold">{chordName}</span>
                                      <span className="text-[8px]">Sem diagrama</span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs">Acorde "{chordName}" não cadastrado na Biblioteca Musical</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Diagramas de Teclado */}
                    {pianoChords.length > 0 && (
                      <div className="mb-4">
                        <h3 className="text-[11px] font-semibold uppercase tracking-[1.5px] text-text3 mb-3">
                          Teclado
                          <span className="ml-2 text-text3/60">
                            ({pianoChords.length} acorde{pianoChords.length !== 1 ? 's' : ''})
                          </span>
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {(song.chords ?? []).map(chordName => {
                            const lib = pianoChordMap.get(chordName)
                            if (!lib || !lib.positions || typeof lib.positions !== 'object') return null
                            const pos = lib.positions as any
                            const keys = (pos.keys ?? []) as string[]
                            if (keys.length === 0) return null
                            const fingeringRh = (pos.fingering_rh ?? []) as number[]
                            return (
                              <div key={chordName} className="rounded-lg bg-card border border-border p-3">
                                <PianoKeyboard
                                  keys={keys}
                                  fingeringRH={fingeringRh.length > 0 ? fingeringRh : undefined}
                                  label={chordName}
                                  showLabels={fingeringRh.length > 0}
                                  scale={0.8}
                                  className="w-full"
                                />
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    <Separator className="my-4" />

                    {/* Cifra formatada */}
                    {song.cifra_content ? (
                      <div className="rounded-xl bg-card border border-border p-5">
                        <CifraContentView content={song.cifra_content} />
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
                        <MetaItem label="Gênero" value={song.genre ?? '—'} />
                        <MetaItem label="Dificuldade" value={diffConfig.label} />
                        <MetaItem label="Curadoria" value={curationConfig.label} />
                        <MetaItem label="Origem" value={song.cifra_source === 'cifra_club' ? 'Cifra Club' : 'Manual'} />
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
            </Tabs>
          </div>
        </div>
      </SheetContent>
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
