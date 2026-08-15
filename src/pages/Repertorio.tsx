import { useState, useMemo, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Lightning, Plus, PencilSimple, Trash, SpinnerGap, Warning,
  Eye, MusicNote, Guitar, PianoKeys, MicrophoneStage, Rows, Table as TableIcon,
  MagnifyingGlass, Funnel, Star, SortAscending, SortDescending,
  ArrowsDownUp, FileArrowUp, FileText, X, ChartDonut, Globe
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useRepertoire } from "@/hooks/useRepertoire";
import { deleteSong } from "@/services/repertoireService";
import { RepertoireModal } from "@/components/modals/RepertoireModal";
import { RepertoireSheet } from "@/components/repertoire/RepertoireSheet";
import { UnifiedImportModal } from "@/components/modals/UnifiedImportModal";
import { RepertorioDashboard } from "@/components/repertoire/RepertorioDashboard";
import { RepertoireNotebookTab } from "@/components/content/RepertoireNotebookTab";
import type { Tables } from "@/lib/database.types";

type Repertoire = Tables<'repertoire'>
type ViewMode = 'table' | 'cards'

// --- Helpers de visual ---

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
  'Forró': 'bg-orange-500/15 text-orange-400',
  'Samba': 'bg-yellow-500/15 text-yellow-400',
}

function DifficultyStars({ level }: { level: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        i <= level
          ? <Star key={i} size={12} weight="fill" className={DIFFICULTY_CONFIG[level]?.color ?? 'text-text3'} />
          : <Star key={i} size={12} className="text-text3/30" />
      ))}
    </div>
  )
}

function DifficultyBadge({ level }: { level: number }) {
  const config = DIFFICULTY_CONFIG[level] ?? DIFFICULTY_CONFIG[1]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${config.bg} ${config.color}`}>
      <DifficultyStars level={level} />
      {config.label}
    </span>
  )
}

function CurationBadge({ status }: { status: string | null }) {
  const config = CURATION_CONFIG[status ?? 'draft'] ?? CURATION_CONFIG.draft
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.5px] ${config.bg} ${config.color}`}>
      {config.label}
    </span>
  )
}

function GenreBadge({ genre }: { genre: string | null }) {
  if (!genre) return <span className="text-text3 text-xs">—</span>
  const colors = GENRE_COLORS[genre] ?? 'bg-slate-500/15 text-slate-400'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${colors}`}>
      {genre}
    </span>
  )
}

function InstrumentIcon({ instrument }: { instrument: string }) {
  const lower = instrument.toLowerCase()
  if (lower.includes('violão') || lower.includes('guitarra') || lower.includes('baixo') || lower.includes('ukulele'))
    return <Guitar size={14} />
  if (lower.includes('teclado') || lower.includes('piano'))
    return <PianoKeys size={14} />
  if (lower.includes('canto') || lower.includes('voz'))
    return <MicrophoneStage size={14} />
  return <MusicNote size={14} />
}

// --- KPI Card ---
function KpiCard({ label, value, icon, barColor, iconBg, iconColor, sub }: {
  label: string; value: string | number; icon: React.ReactNode;
  barColor: string; iconBg: string; iconColor: string; sub?: string
}) {
  return (
    <div className="rounded-[14px] bg-card border border-border p-4 relative overflow-hidden">
      <div className={`absolute top-0 left-0 right-0 h-[3px] ${barColor}`} />
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center ${iconBg} ${iconColor}`}>
          {icon}
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-text3">{label}</p>
          <p className="text-[22px] font-extrabold text-text leading-tight">{value}</p>
          {sub && <p className="text-[10px] text-text3 mt-0.5">{sub}</p>}
        </div>
      </div>
    </div>
  )
}

// --- Card de Música ---
function SongCard({ song, onEdit, onDelete, onPreview }: {
  song: Repertoire; onEdit: () => void; onDelete: () => void; onPreview: () => void
}) {
  const diff = song.difficulty ?? 1
  const config = DIFFICULTY_CONFIG[diff] ?? DIFFICULTY_CONFIG[1]

  return (
    <div
      className="rounded-[14px] bg-card border border-border hover:border-[var(--azul-claro)]/30 transition-all duration-200 cursor-pointer group overflow-hidden"
      onClick={onPreview}
    >
      {/* Header colorido com tom/key */}
      <div className="bg-[var(--bg2)] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MusicNote size={16} className="text-accent" weight="fill" />
          <span className="font-mono text-xs font-bold text-text">
            {song.key ?? '—'}
          </span>
          <GenreBadge genre={song.genre} />
        </div>
        <CurationBadge status={song.curation_status} />
      </div>

      <div className="p-4 space-y-3">
        {/* Título e Artista */}
        <div>
          <h3 className="font-semibold text-[15px] text-text leading-tight group-hover:text-accent transition-colors">
            {song.title}
          </h3>
          <p className="text-text2 text-[12px] mt-0.5">{song.artist ?? 'Artista desconhecido'}</p>
        </div>

        {/* Acordes como pills */}
        <div className="flex gap-1 flex-wrap">
          {(song.chords ?? []).slice(0, 6).map(chord => (
            <span key={chord} className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[var(--azul-escuro)]/20 text-[var(--azul-claro)]">
              {chord}
            </span>
          ))}
          {(song.chords ?? []).length > 6 && (
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-surface text-text3">
              +{(song.chords ?? []).length - 6}
            </span>
          )}
        </div>

        {/* Dificuldade + Instrumentos */}
        <div className="flex items-center justify-between">
          <DifficultyBadge level={diff} />
          <div className="flex gap-1 text-text3">
            {(song.instruments ?? []).slice(0, 3).map(inst => (
              <TooltipProvider key={inst} delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center ${config.bg}`}>
                      <InstrumentIcon instrument={inst} />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top"><p className="text-xs">{inst}</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        </div>

        {/* Origem */}
        {song.cifra_source === 'cifra_club' && (
          <div className="flex items-center gap-1 text-[10px] text-text3">
            <Lightning size={10} weight="fill" className="text-amber-400" />
            Cifra Club
          </div>
        )}
        {song.cifra_source === 'songsterr' && (
          <div className="flex items-center gap-1 text-[10px] text-text3">
            <Guitar size={10} weight="fill" className="text-orange-400" />
            Songsterr
          </div>
        )}
      </div>

      {/* Ações no hover */}
      <div className="border-t border-border px-4 py-2 flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={e => { e.stopPropagation(); onPreview() }}>
          <Eye size={14} /> Ver
        </Button>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={e => { e.stopPropagation(); onEdit() }}>
          <PencilSimple size={14} /> Editar
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 text-xs text-red-400 hover:text-red-300" onClick={e => e.stopPropagation()}>
              <Trash size={14} />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-surface border-border">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-text">Excluir música?</AlertDialogTitle>
              <AlertDialogDescription className="text-text2">
                Tem certeza que deseja excluir <strong className="text-text">{song.title}</strong>? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-border text-text2 hover:bg-surface">Cancelar</AlertDialogCancel>
              <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white" onClick={() => onDelete()}>
                <Trash size={14} />
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}

// --- Tipos de ordenação ---
type SortField = 'title' | 'artist' | 'difficulty' | 'genre' | 'created_at'
type SortDir = 'asc' | 'desc'

// --- Configuração de origens ---
const ORIGIN_CONFIG: Record<string, { label: string; icon?: React.ReactNode; color: string }> = {
  cifra_club: { label: 'Cifra Club', icon: <Lightning size={11} weight="fill" className="text-amber-400" />, color: 'text-amber-400' },
  songsterr: { label: 'Songsterr', icon: <Guitar size={11} weight="fill" className="text-orange-400" />, color: 'text-orange-400' },
  gp_import: { label: 'Guitar Pro', icon: <FileArrowUp size={11} weight="fill" className="text-green-400" />, color: 'text-green-400' },
  chordpro: { label: 'ChordPro', icon: <FileText size={11} weight="fill" className="text-purple-400" />, color: 'text-purple-400' },
  olga: { label: 'OLGA', icon: <Globe size={11} weight="fill" className="text-sky-400" />, color: 'text-sky-400' },
  manual: { label: 'Manual', icon: <PencilSimple size={11} className="text-text3" />, color: 'text-text3' },
}

// --- Instrumentos disponíveis ---
const INSTRUMENT_OPTIONS = [
  { key: 'Violão', icon: <Guitar size={12} /> },
  { key: 'Guitarra', icon: <Guitar size={12} /> },
  { key: 'Teclado', icon: <PianoKeys size={12} /> },
  { key: 'Canto', icon: <MicrophoneStage size={12} /> },
  { key: 'Baixo', icon: <Guitar size={12} /> },
  { key: 'Bateria', icon: <MusicNote size={12} /> },
  { key: 'Ukulele', icon: <Guitar size={12} /> },
]

// --- Página Principal ---
export function Repertorio() {
  const { data: songs, loading, error, refetch } = useRepertoire();
  const [searchParams, setSearchParams] = useSearchParams();
  const [modalOpen, setModalOpen] = useState(false);
  const [unifiedModalOpen, setUnifiedModalOpen] = useState(false);
  const [editingSong, setEditingSong] = useState<Repertoire | null>(null);
  const [previewSong, setPreviewSong] = useState<Repertoire | null>(null);

  // Sincronizar previewSong com dados frescos após refetch (ex: enriquecimento IA)
  useEffect(() => {
    if (previewSong && songs) {
      const fresh = songs.find(s => s.id === previewSong.id)
      if (fresh && fresh.updated_at !== previewSong.updated_at) {
        setPreviewSong(fresh)
      }
    }
  }, [songs])

  // --- Filtros persistidos na URL ---
  const search = searchParams.get('q') ?? '';
  const filterGenre = searchParams.get('genre') ?? 'todos';
  const filterDifficulty = parseInt(searchParams.get('diff') ?? '0');
  const filterCuration = searchParams.get('curation') ?? 'todos';
  const filterOrigin = searchParams.get('origin') ?? 'todos';
  const filterCountry = searchParams.get('country') ?? 'todos';
  const filterInstrument = searchParams.get('instrument') ?? 'todos';
  const sortField = (searchParams.get('sort') ?? 'title') as SortField;
  const sortDir = (searchParams.get('dir') ?? 'asc') as SortDir;
  const viewMode = (searchParams.get('view') ?? 'table') as ViewMode;
  const showAdvancedFilters = searchParams.get('filters') === '1';
  const showDashboard = searchParams.get('dash') === '1';
  const section = searchParams.get('section') === 'cadernos' ? 'cadernos' : 'musicas'

  // --- Helper para atualizar um param da URL sem perder os outros ---
  const setParam = useCallback((key: string, value: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value === '' || value === 'todos' || value === '0' || (key === 'sort' && value === 'title') || (key === 'dir' && value === 'asc') || (key === 'view' && value === 'table') || (key === 'filters' && value === '0') || (key === 'dash' && value === '0') || (key === 'page' && value === '1') || (key === 'section' && value === 'musicas')) {
        next.delete(key);
      } else {
        next.set(key, value);
      }
      // Resetar página ao mudar qualquer filtro (exceto a própria página)
      if (key !== 'page' && key !== 'view' && key !== 'filters' && key !== 'dash' && key !== 'section') {
        next.delete('page');
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const setSearch = useCallback((v: string) => setParam('q', v), [setParam]);
  const setFilterGenre = useCallback((v: string) => setParam('genre', v), [setParam]);
  const setFilterDifficulty = useCallback((v: number) => setParam('diff', String(v)), [setParam]);
  const setFilterCuration = useCallback((v: string) => setParam('curation', v), [setParam]);
  const setFilterOrigin = useCallback((v: string) => setParam('origin', v), [setParam]);
  const setFilterCountry = useCallback((v: string) => setParam('country', v), [setParam]);
  const setFilterInstrument = useCallback((v: string) => setParam('instrument', v), [setParam]);
  const setViewMode = useCallback((v: ViewMode) => setParam('view', v), [setParam]);
  const setShowAdvancedFilters = useCallback((v: boolean) => setParam('filters', v ? '1' : '0'), [setParam]);

  const toggleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setParam('dir', sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.set('sort', field);
        next.delete('dir');
        return next;
      }, { replace: true });
    }
  }, [sortField, sortDir, setParam, setSearchParams]);

  const clearAllFilters = useCallback(() => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete('q');
      next.delete('genre');
      next.delete('diff');
      next.delete('curation');
      next.delete('origin');
      next.delete('country');
      next.delete('instrument');
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const activeFilterCount = [
    filterGenre !== 'todos',
    filterDifficulty > 0,
    filterCuration !== 'todos',
    filterOrigin !== 'todos',
    filterCountry !== 'todos',
    filterInstrument !== 'todos',
  ].filter(Boolean).length

  // --- Filtros + Ordenação ---
  const filtered = useMemo(() => {
    if (!songs) return [];

    const result = songs.filter(s => {
      const searchLower = search.toLowerCase()
      const matchesSearch = !search ||
        s.title.toLowerCase().includes(searchLower) ||
        (s.artist ?? '').toLowerCase().includes(searchLower) ||
        (s.chords ?? []).some(c => c.toLowerCase().includes(searchLower));
      const matchesGenre = filterGenre === 'todos' ||
        (s.genre ?? '').toLowerCase() === filterGenre.toLowerCase();
      const matchesDifficulty = filterDifficulty === 0 || (s.difficulty ?? 1) === filterDifficulty;
      const matchesCuration = filterCuration === 'todos' || (s.curation_status ?? 'draft') === filterCuration;

      // Origem expandida com GP e ChordPro
      let matchesOrigin = true;
      if (filterOrigin !== 'todos') {
        if (filterOrigin === 'manual') {
          matchesOrigin = !s.cifra_source || s.cifra_source === 'manual';
        } else {
          matchesOrigin = s.cifra_source === filterOrigin;
        }
      }

      // País (Nacional/Internacional)
      const matchesCountry = filterCountry === 'todos' || (s.country ?? '') === filterCountry;

      // Instrumento
      const matchesInstrument = filterInstrument === 'todos' ||
        (s.instruments ?? []).some(i => i === filterInstrument);

      return matchesSearch && matchesGenre && matchesDifficulty && matchesCuration && matchesOrigin && matchesCountry && matchesInstrument;
    });

    // Ordenação (strip chars especiais no início para ordem alfabética limpa)
    const stripSort = (s: string) => s.replace(/^[^a-zA-Z0-9À-ÿ]+/, '').toLowerCase()
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'title': cmp = stripSort(a.title ?? '').localeCompare(stripSort(b.title ?? '')); break;
        case 'artist': cmp = stripSort(a.artist ?? '').localeCompare(stripSort(b.artist ?? '')); break;
        case 'difficulty': cmp = (a.difficulty ?? 1) - (b.difficulty ?? 1); break;
        case 'genre': cmp = (a.genre ?? '').localeCompare(b.genre ?? ''); break;
        case 'created_at': cmp = (a.created_at ?? '').localeCompare(b.created_at ?? ''); break;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [songs, search, filterGenre, filterDifficulty, filterCuration, filterOrigin, filterCountry, filterInstrument, sortField, sortDir]);

  // --- Paginação ---
  const PAGE_SIZE = 50
  const page = parseInt(searchParams.get('page') ?? '1')
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginatedSongs = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, currentPage])

  // --- KPIs ---
  const kpis = useMemo(() => {
    if (!songs || songs.length === 0) return { total: 0, genres: 0, avgDiff: 0, imported: 0, manual: 0, importBreakdown: '' }
    const genres = new Set(songs.map(s => s.genre).filter(Boolean))
    const avgDiff = songs.reduce((sum, s) => sum + (s.difficulty ?? 1), 0) / songs.length

    // Contar importadas por fonte
    const sourceCount: Record<string, number> = {}
    for (const s of songs) {
      const src = s.cifra_source || 'manual'
      sourceCount[src] = (sourceCount[src] || 0) + 1
    }
    const manual = sourceCount['manual'] || 0
    const imported = songs.length - manual

    // Breakdown das 3 maiores fontes importadas
    const importSources = Object.entries(sourceCount)
      .filter(([k]) => k !== 'manual')
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
    const importBreakdown = importSources
      .map(([k, v]) => `${v} ${ORIGIN_CONFIG[k]?.label || k}`)
      .join(' · ')

    return { total: songs.length, genres: genres.size, avgDiff: Math.round(avgDiff * 10) / 10, imported, manual, importBreakdown }
  }, [songs])

  // --- Gêneros únicos para o filtro ---
  const uniqueGenres = useMemo(() => {
    if (!songs) return []
    return [...new Set(songs.map(s => s.genre).filter(Boolean) as string[])].sort()
  }, [songs])

  const handleDelete = async (id: string) => {
    try {
      await deleteSong(id);
      toast.success('Música excluída!');
      refetch();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao excluir música');
    }
  };

  const handleEdit = (song: Repertoire) => {
    setEditingSong(song);
    setModalOpen(true);
  };

  const handleNew = () => {
    setEditingSong(null);
    setModalOpen(true);
  };

  const handlePreview = (song: Repertoire) => {
    setPreviewSong(song)
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-5">

      {/* ====== HEADER ====== */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-[26px] leading-[1.2] text-text">
            <em className="not-italic text-accent">Repertório</em>
          </h1>
          <p className="text-text2 text-[13.5px] mt-1.5">
            {section === 'cadernos'
              ? 'Cadernos de repertório'
              : `Curadoria de músicas para aulas · ${kpis.total} cadastrada${kpis.total !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => setParam('section', 'musicas')}
              className={`px-2.5 py-1.5 text-xs flex items-center gap-1 transition-colors ${
                section === 'musicas' ? 'bg-[var(--azul-escuro)] text-white' : 'text-text3 hover:text-text2'
              }`}
            >
              Músicas
            </button>
            <button
              type="button"
              onClick={() => setParam('section', 'cadernos')}
              className={`px-2.5 py-1.5 text-xs flex items-center gap-1 transition-colors ${
                section === 'cadernos' ? 'bg-[var(--azul-escuro)] text-white' : 'text-text3 hover:text-text2'
              }`}
            >
              Cadernos
            </button>
          </div>
          {section === 'musicas' && (
            <>
              {/* Toggle Dashboard */}
              <button
                onClick={() => setParam('dash', showDashboard ? '0' : '1')}
                className={`px-3 py-1.5 text-xs flex items-center gap-1.5 rounded-lg border transition-colors ${
                  showDashboard
                    ? 'bg-accent/10 text-accent border-accent/30 font-semibold'
                    : 'text-text3 hover:text-text2 border-border'
                }`}
              >
                <ChartDonut size={14} /> Dashboard
              </button>
              {/* Toggle Tabela/Cards */}
              <div className="flex rounded-lg border border-border overflow-hidden">
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-2.5 py-1.5 text-xs flex items-center gap-1 transition-colors ${
                    viewMode === 'table' ? 'bg-[var(--azul-escuro)] text-white' : 'text-text3 hover:text-text2'
                  }`}
                >
                  <TableIcon size={14} /> Tabela
                </button>
                <button
                  onClick={() => setViewMode('cards')}
                  className={`px-2.5 py-1.5 text-xs flex items-center gap-1 transition-colors ${
                    viewMode === 'cards' ? 'bg-[var(--azul-escuro)] text-white' : 'text-text3 hover:text-text2'
                  }`}
                >
                  <Rows size={14} /> Cards
                </button>
              </div>
              <Button onClick={() => setUnifiedModalOpen(true)}>
                <Plus size={16} /> Adicionar Música
              </Button>
            </>
          )}
        </div>
      </div>

      {section === 'cadernos' && <RepertoireNotebookTab />}

      {section === 'musicas' && loading && (
        <div className="flex items-center justify-center h-64 gap-2 text-text2">
          <SpinnerGap size={20} className="animate-spin" /> Carregando repertório...
        </div>
      )}

      {section === 'musicas' && error && !loading && (
        <div className="flex items-center justify-center h-64 gap-2 text-red-400">
          <Warning size={20} /> Erro ao carregar repertório: {error}
        </div>
      )}

      {section === 'musicas' && !loading && !error && (
        <>
      {showDashboard ? (
        <RepertorioDashboard
          songs={songs ?? []}
          onAddMusic={() => setUnifiedModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            label="Total"
            value={kpis.total}
            icon={<MusicNote size={18} weight="fill" />}
            barColor="bg-[#2D5A8E]"
            iconBg="bg-[#2D5A8E]/15"
            iconColor="text-[#4A7DC0]"
            sub={`${kpis.imported} importada${kpis.imported !== 1 ? 's' : ''} · ${kpis.manual} manual`}
          />
          <KpiCard
            label="Gêneros"
            value={kpis.genres}
            icon={<Funnel size={18} />}
            barColor="bg-indigo-500"
            iconBg="bg-indigo-500/15"
            iconColor="text-indigo-400"
            sub="gêneros diferentes"
          />
          <KpiCard
            label="Dificuldade Média"
            value={kpis.avgDiff}
            icon={<Star size={18} weight="fill" />}
            barColor="bg-amber-500"
            iconBg="bg-amber-500/15"
            iconColor="text-amber-400"
            sub="de 1 a 5 estrelas"
          />
          <KpiCard
            label="Importadas"
            value={kpis.imported}
            icon={<Lightning size={18} weight="fill" />}
            barColor="bg-[#FF2D78]"
            iconBg="bg-[#FF2D78]/15"
            iconColor="text-[#FF2D78]"
            sub={kpis.importBreakdown || '—'}
          />
        </div>
      )}

      {/* ====== FILTROS ====== */}
      <div className="rounded-[14px] bg-card border border-border p-4 space-y-3">
        {/* Linha principal: busca + gênero + toggle avançados */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px] space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-[1.5px] text-text3 flex items-center gap-1">
              <MagnifyingGlass size={12} /> Buscar
            </label>
            <Input
              placeholder="Nome, artista ou acorde..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-9 text-[13px]"
            />
          </div>
          <div className="w-[160px] space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-[1.5px] text-text3 flex items-center gap-1">
              <Funnel size={12} /> Gênero
            </label>
            <Select value={filterGenre} onValueChange={setFilterGenre}>
              <SelectTrigger className="h-9 text-[13px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {uniqueGenres.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {/* Filtro Nacional/Internacional */}
          <div className="flex rounded-lg border border-border overflow-hidden h-9">
            {[
              { value: 'todos', label: 'Todos' },
              { value: 'BR', label: '🇧🇷 Nacional' },
              { value: 'INT', label: '🌎 Internacional' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setFilterCountry(opt.value)}
                className={`px-2.5 text-[11px] font-semibold transition-colors ${
                  filterCountry === opt.value
                    ? 'bg-accent/15 text-accent'
                    : 'text-text3 hover:text-text2 hover:bg-surface'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`h-9 px-3 text-[11px] font-semibold rounded-lg border transition-colors flex items-center gap-1.5 ${
              showAdvancedFilters || activeFilterCount > 0
                ? 'border-accent/30 bg-accent/10 text-accent'
                : 'border-border text-text3 hover:text-text2'
            }`}
          >
            <Funnel size={13} />
            Filtros
            {activeFilterCount > 0 && (
              <span className="bg-accent text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>
          <Badge variant="secondary" className="h-9 px-3 text-[11px]">
            {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        {/* Filtros avançados (colapsável) */}
        {showAdvancedFilters && (
          <div className="pt-3 border-t border-border space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Dificuldade */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-[1.5px] text-text3">Dificuldade</label>
              <div className="flex gap-1.5 flex-wrap">
                <button
                  onClick={() => setFilterDifficulty(0)}
                  className={`px-2.5 py-1 text-[11px] rounded-full border transition-colors ${
                    filterDifficulty === 0
                      ? 'border-accent/40 bg-accent/10 text-accent font-semibold'
                      : 'border-border text-text3 hover:text-text2'
                  }`}
                >
                  Todos
                </button>
                {[1, 2, 3, 4, 5].map(n => {
                  const cfg = DIFFICULTY_CONFIG[n]
                  return (
                    <button
                      key={n}
                      onClick={() => setFilterDifficulty(filterDifficulty === n ? 0 : n)}
                      className={`px-2.5 py-1 text-[11px] rounded-full border transition-colors flex items-center gap-1 ${
                        filterDifficulty === n
                          ? `${cfg.bg} ${cfg.color} border-transparent font-semibold`
                          : 'border-border text-text3 hover:text-text2'
                      }`}
                    >
                      <Star size={11} weight={filterDifficulty === n ? 'fill' : 'regular'} />
                      {cfg.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Instrumento */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-[1.5px] text-text3">Instrumento</label>
              <div className="flex gap-1.5 flex-wrap">
                <button
                  onClick={() => setFilterInstrument('todos')}
                  className={`px-2.5 py-1 text-[11px] rounded-full border transition-colors ${
                    filterInstrument === 'todos'
                      ? 'border-accent/40 bg-accent/10 text-accent font-semibold'
                      : 'border-border text-text3 hover:text-text2'
                  }`}
                >
                  Todos
                </button>
                {INSTRUMENT_OPTIONS.map(({ key, icon }) => (
                  <button
                    key={key}
                    onClick={() => setFilterInstrument(filterInstrument === key ? 'todos' : key)}
                    className={`px-2.5 py-1 text-[11px] rounded-full border transition-colors flex items-center gap-1 ${
                      filterInstrument === key
                        ? 'border-[var(--azul-claro)]/40 bg-[var(--azul-claro)]/10 text-[var(--azul-claro)] font-semibold'
                        : 'border-border text-text3 hover:text-text2'
                    }`}
                  >
                    {icon}
                    {key}
                  </button>
                ))}
              </div>
            </div>

            {/* Curadoria */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-[1.5px] text-text3">Status de curadoria</label>
              <div className="flex gap-1.5 flex-wrap">
                <button
                  onClick={() => setFilterCuration('todos')}
                  className={`px-2.5 py-1 text-[11px] rounded-full border transition-colors ${
                    filterCuration === 'todos'
                      ? 'border-accent/40 bg-accent/10 text-accent font-semibold'
                      : 'border-border text-text3 hover:text-text2'
                  }`}
                >
                  Todos
                </button>
                {Object.entries(CURATION_CONFIG).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => setFilterCuration(filterCuration === key ? 'todos' : key)}
                    className={`px-2.5 py-1 text-[11px] rounded-full border transition-colors ${
                      filterCuration === key
                        ? `${cfg.bg} ${cfg.color} border-transparent font-semibold`
                        : 'border-border text-text3 hover:text-text2'
                    }`}
                  >
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Origem */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-[1.5px] text-text3">Origem</label>
              <div className="flex gap-1.5 flex-wrap">
                <button
                  onClick={() => setFilterOrigin('todos')}
                  className={`px-2.5 py-1 text-[11px] rounded-full border transition-colors ${
                    filterOrigin === 'todos'
                      ? 'border-accent/40 bg-accent/10 text-accent font-semibold'
                      : 'border-border text-text3 hover:text-text2'
                  }`}
                >
                  Todos
                </button>
                {Object.entries(ORIGIN_CONFIG).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => setFilterOrigin(filterOrigin === key ? 'todos' : key)}
                    className={`px-2.5 py-1 text-[11px] rounded-full border transition-colors flex items-center gap-1 ${
                      filterOrigin === key
                        ? 'border-accent/40 bg-accent/10 text-accent font-semibold'
                        : 'border-border text-text3 hover:text-text2'
                    }`}
                  >
                    {cfg.icon}
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Ordenação */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-[1.5px] text-text3">Ordenar por</label>
              <div className="flex gap-1.5 flex-wrap">
                {([
                  { field: 'title' as SortField, label: 'Título' },
                  { field: 'artist' as SortField, label: 'Artista' },
                  { field: 'difficulty' as SortField, label: 'Dificuldade' },
                  { field: 'genre' as SortField, label: 'Gênero' },
                  { field: 'created_at' as SortField, label: 'Data' },
                ]).map(({ field, label }) => (
                  <button
                    key={field}
                    onClick={() => toggleSort(field)}
                    className={`px-2.5 py-1 text-[11px] rounded-full border transition-colors flex items-center gap-1 ${
                      sortField === field
                        ? 'border-[var(--azul-claro)]/40 bg-[var(--azul-claro)]/10 text-[var(--azul-claro)] font-semibold'
                        : 'border-border text-text3 hover:text-text2'
                    }`}
                  >
                    {sortField === field
                      ? (sortDir === 'asc' ? <SortAscending size={12} /> : <SortDescending size={12} />)
                      : <ArrowsDownUp size={12} />
                    }
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Limpar filtros */}
            {activeFilterCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="text-[11px] text-accent hover:text-accent/80 font-semibold transition-colors flex items-center gap-1"
              >
                <X size={12} />
                Limpar todos os filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* ====== CONTEÚDO: TABELA ====== */}
      {viewMode === 'table' && (
        <div className="rounded-[14px] bg-card border border-border overflow-hidden">
          <Table className="table-fixed w-full">
            <TableHeader>
              <TableRow className="bg-[var(--bg2)] hover:bg-[var(--bg2)]">
                <TableHead
                  className="text-[9px] uppercase tracking-[2px] font-semibold text-text3 py-3 cursor-pointer hover:text-text2 select-none w-[18%]"
                  onClick={() => toggleSort('title')}
                >
                  <span className="flex items-center gap-1">
                    Música
                    {sortField === 'title' && (sortDir === 'asc' ? <SortAscending size={11} /> : <SortDescending size={11} />)}
                  </span>
                </TableHead>
                <TableHead
                  className="text-[9px] uppercase tracking-[2px] font-semibold text-text3 py-3 cursor-pointer hover:text-text2 select-none w-[14%]"
                  onClick={() => toggleSort('artist')}
                >
                  <span className="flex items-center gap-1">
                    Artista
                    {sortField === 'artist' && (sortDir === 'asc' ? <SortAscending size={11} /> : <SortDescending size={11} />)}
                  </span>
                </TableHead>
                <TableHead className="text-[9px] uppercase tracking-[2px] font-semibold text-text3 py-3 w-[20%]">Acordes</TableHead>
                <TableHead className="text-[9px] uppercase tracking-[2px] font-semibold text-text3 py-3 w-[6%]">Tom</TableHead>
                <TableHead
                  className="text-[9px] uppercase tracking-[2px] font-semibold text-text3 py-3 cursor-pointer hover:text-text2 select-none w-[10%]"
                  onClick={() => toggleSort('genre')}
                >
                  <span className="flex items-center gap-1">
                    Gênero
                    {sortField === 'genre' && (sortDir === 'asc' ? <SortAscending size={11} /> : <SortDescending size={11} />)}
                  </span>
                </TableHead>
                <TableHead
                  className="text-[9px] uppercase tracking-[2px] font-semibold text-text3 py-3 cursor-pointer hover:text-text2 select-none w-[10%]"
                  onClick={() => toggleSort('difficulty')}
                >
                  <span className="flex items-center gap-1">
                    Nível
                    {sortField === 'difficulty' && (sortDir === 'asc' ? <SortAscending size={11} /> : <SortDescending size={11} />)}
                  </span>
                </TableHead>
                <TableHead className="text-[9px] uppercase tracking-[2px] font-semibold text-text3 py-3 w-[10%]">Status</TableHead>
                <TableHead className="text-[9px] uppercase tracking-[2px] font-semibold text-text3 py-3 text-right w-[12%]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-text3">
                    <div className="flex flex-col items-center gap-2">
                      <MusicNote size={32} className="text-text3/30" />
                      <p className="text-sm">
                        {search || filterGenre !== 'todos'
                          ? 'Nenhuma música encontrada com esses filtros.'
                          : 'Nenhuma música cadastrada. Clique em "Nova Música" para começar.'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedSongs.map(song => (
                  <TableRow
                    key={song.id}
                    className="cursor-pointer hover:bg-[var(--azul-soft)] transition-colors border-b border-border"
                    onClick={() => handlePreview(song)}
                  >
                    <TableCell className="py-3.5">
                      <div className="flex items-center gap-2">
                        {song.cifra_source && ORIGIN_CONFIG[song.cifra_source]?.icon && (
                          <span className="flex-shrink-0">{ORIGIN_CONFIG[song.cifra_source].icon}</span>
                        )}
                        <span className="font-semibold text-[13px] text-text truncate block max-w-full">{song.title}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-text2 text-[13px] py-3.5 truncate">{song.artist ?? '—'}</TableCell>
                    <TableCell className="py-3.5">
                      <div className="flex gap-1 flex-wrap">
                        {(song.chords ?? []).slice(0, 5).map(chord => (
                          <span key={chord} className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[var(--azul-escuro)]/20 text-[var(--azul-claro)]">
                            {chord}
                          </span>
                        ))}
                        {(song.chords ?? []).length > 5 && (
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-surface text-text3">
                            +{(song.chords ?? []).length - 5}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs font-bold text-text py-3.5">{song.key ?? '—'}</TableCell>
                    <TableCell className="py-3.5"><GenreBadge genre={song.genre} /></TableCell>
                    <TableCell className="py-3.5"><DifficultyStars level={song.difficulty ?? 1} /></TableCell>
                    <TableCell className="py-3.5"><CurationBadge status={song.curation_status} /></TableCell>
                    <TableCell className="text-right py-3.5">
                      <div className="flex gap-1 justify-end" onClick={e => e.stopPropagation()}>
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handlePreview(song)}>
                                <Eye size={15} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent><p className="text-xs">Preview</p></TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleEdit(song)}>
                                <PencilSimple size={15} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent><p className="text-xs">Editar</p></TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <AlertDialog>
                          <TooltipProvider delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-300">
                                    <Trash size={15} />
                                  </Button>
                                </AlertDialogTrigger>
                              </TooltipTrigger>
                              <TooltipContent><p className="text-xs">Excluir</p></TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <AlertDialogContent className="bg-surface border-border">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-text">Excluir música?</AlertDialogTitle>
                              <AlertDialogDescription className="text-text2">
                                Tem certeza que deseja excluir <strong className="text-text">{song.title}</strong>? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="border-border text-text2 hover:bg-surface">Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-600 hover:bg-red-700 text-white"
                                onClick={() => handleDelete(song.id)}
                              >
                                <Trash size={14} />
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ====== PAGINAÇÃO ====== */}
      {filtered.length > PAGE_SIZE && (viewMode === 'table' || viewMode === 'cards') && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-[11px] text-text3">
            Mostrando {((currentPage - 1) * PAGE_SIZE) + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} de {filtered.length}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-[11px] border-border"
              disabled={currentPage <= 1}
              onClick={() => setParam('page', '1')}
            >
              ««
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-[11px] border-border"
              disabled={currentPage <= 1}
              onClick={() => setParam('page', String(currentPage - 1))}
            >
              ‹ Anterior
            </Button>
            <span className="text-[11px] text-text2 px-3 font-mono">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-[11px] border-border"
              disabled={currentPage >= totalPages}
              onClick={() => setParam('page', String(currentPage + 1))}
            >
              Próxima ›
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-[11px] border-border"
              disabled={currentPage >= totalPages}
              onClick={() => setParam('page', String(totalPages))}
            >
              »»
            </Button>
          </div>
        </div>
      )}

      {/* ====== CONTEÚDO: CARDS ====== */}
      {viewMode === 'cards' && (
        <div>
          {filtered.length === 0 ? (
            <div className="rounded-[14px] bg-card border border-border p-12 text-center">
              <MusicNote size={32} className="text-text3/30 mx-auto mb-2" />
              <p className="text-sm text-text3">
                {search || filterGenre !== 'todos'
                  ? 'Nenhuma música encontrada com esses filtros.'
                  : 'Nenhuma música cadastrada. Clique em "Nova Música" para começar.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {paginatedSongs.map(song => (
                <SongCard
                  key={song.id}
                  song={song}
                  onEdit={() => handleEdit(song)}
                  onDelete={() => handleDelete(song.id)}
                  onPreview={() => handlePreview(song)}
                />
              ))}
            </div>
          )}
        </div>
      )}
        </>
      )}

      {/* ====== MODAIS ====== */}
      <RepertoireModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingSong(null); }}
        onSuccess={refetch}
        song={editingSong}
      />

      <UnifiedImportModal
        open={unifiedModalOpen}
        onClose={() => setUnifiedModalOpen(false)}
        onSuccess={refetch}
        onOpenEditor={() => { setEditingSong(null); setModalOpen(true) }}
      />

      <RepertoireSheet
        song={previewSong}
        open={!!previewSong}
        onOpenChange={(open) => { if (!open) setPreviewSong(null) }}
        onEdit={(song) => { setPreviewSong(null); handleEdit(song) }}
        onSaved={() => { refetch() }}
      />
    </div>
  );
}
