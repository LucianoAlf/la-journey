import { useState, useMemo } from "react";
import {
  Lightning, Plus, PencilSimple, Trash, SpinnerGap, Warning,
  Eye, MusicNote, Guitar, PianoKeys, MicrophoneStage, Rows, Table as TableIcon,
  MagnifyingGlass, Funnel, Star
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
import { CifraClubImportModal } from "@/components/modals/CifraClubImportModal";
import { RepertoireSheet } from "@/components/repertoire/RepertoireSheet";
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
              <AlertDialogTitle>Excluir música?</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir <strong>{song.title}</strong>? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => onDelete()}>Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}

// --- Página Principal ---
export function Repertorio() {
  const { data: songs, loading, error, refetch } = useRepertoire();
  const [modalOpen, setModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [editingSong, setEditingSong] = useState<Repertoire | null>(null);
  const [previewSong, setPreviewSong] = useState<Repertoire | null>(null);
  const [search, setSearch] = useState('');
  const [filterGenre, setFilterGenre] = useState('todos');
  const [filterDifficulty, setFilterDifficulty] = useState(0); // 0 = todos, 1-5
  const [filterCuration, setFilterCuration] = useState('todos');
  const [filterOrigin, setFilterOrigin] = useState('todos'); // todos, cifra_club, manual
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const activeFilterCount = [
    filterGenre !== 'todos',
    filterDifficulty > 0,
    filterCuration !== 'todos',
    filterOrigin !== 'todos',
  ].filter(Boolean).length

  // --- Filtros ---
  const filtered = useMemo(() => {
    if (!songs) return [];
    return songs.filter(s => {
      const searchLower = search.toLowerCase()
      const matchesSearch = !search ||
        s.title.toLowerCase().includes(searchLower) ||
        (s.artist ?? '').toLowerCase().includes(searchLower) ||
        (s.chords ?? []).some(c => c.toLowerCase().includes(searchLower));
      const matchesGenre = filterGenre === 'todos' ||
        (s.genre ?? '').toLowerCase() === filterGenre.toLowerCase();
      const matchesDifficulty = filterDifficulty === 0 || (s.difficulty ?? 1) === filterDifficulty;
      const matchesCuration = filterCuration === 'todos' || (s.curation_status ?? 'draft') === filterCuration;
      const matchesOrigin = filterOrigin === 'todos' ||
        (filterOrigin === 'cifra_club' && s.cifra_source === 'cifra_club') ||
        (filterOrigin === 'manual' && s.cifra_source !== 'cifra_club');
      return matchesSearch && matchesGenre && matchesDifficulty && matchesCuration && matchesOrigin;
    });
  }, [songs, search, filterGenre, filterDifficulty, filterCuration, filterOrigin]);

  // --- KPIs ---
  const kpis = useMemo(() => {
    if (!songs || songs.length === 0) return { total: 0, genres: 0, avgDiff: 0, cifraClub: 0, manual: 0 }
    const genres = new Set(songs.map(s => s.genre).filter(Boolean))
    const avgDiff = songs.reduce((sum, s) => sum + (s.difficulty ?? 1), 0) / songs.length
    const cifraClub = songs.filter(s => s.cifra_source === 'cifra_club').length
    return { total: songs.length, genres: genres.size, avgDiff: Math.round(avgDiff * 10) / 10, cifraClub, manual: songs.length - cifraClub }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-text2">
        <SpinnerGap size={20} className="animate-spin" /> Carregando repertório...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-red-400">
        <Warning size={20} /> Erro ao carregar repertório: {error}
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-5">

      {/* ====== HEADER ====== */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-[26px] leading-[1.2] text-text">
            <em className="not-italic text-accent">Repertório</em>
          </h1>
          <p className="text-text2 text-[13.5px] mt-1.5">
            Curadoria de músicas para aulas · {kpis.total} cadastrada{kpis.total !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
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
          <Button variant="ghost" size="sm" onClick={() => setImportModalOpen(true)}>
            <Lightning size={16} weight="fill" className="text-amber-400" /> Importar Cifra Club
          </Button>
          <Button onClick={handleNew}>
            <Plus size={16} /> Nova Música
          </Button>
        </div>
      </div>

      {/* ====== KPIs ====== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Total"
          value={kpis.total}
          icon={<MusicNote size={18} weight="fill" />}
          barColor="bg-[#2D5A8E]"
          iconBg="bg-[#2D5A8E]/15"
          iconColor="text-[#4A7DC0]"
          sub={`${kpis.cifraClub} importada${kpis.cifraClub !== 1 ? 's' : ''} · ${kpis.manual} manual`}
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
          label="Cifra Club"
          value={kpis.cifraClub}
          icon={<Lightning size={18} weight="fill" />}
          barColor="bg-[#FF2D78]"
          iconBg="bg-[#FF2D78]/15"
          iconColor="text-[#FF2D78]"
          sub={kpis.total > 0 ? `${Math.round(kpis.cifraClub / kpis.total * 100)}% do total` : '—'}
        />
      </div>

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
                {([
                  { key: 'todos', label: 'Todos' },
                  { key: 'cifra_club', label: 'Cifra Club' },
                  { key: 'manual', label: 'Manual' },
                ] as const).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setFilterOrigin(filterOrigin === key ? 'todos' : key)}
                    className={`px-2.5 py-1 text-[11px] rounded-full border transition-colors flex items-center gap-1 ${
                      filterOrigin === key
                        ? 'border-accent/40 bg-accent/10 text-accent font-semibold'
                        : 'border-border text-text3 hover:text-text2'
                    }`}
                  >
                    {key === 'cifra_club' && <Lightning size={11} weight="fill" className="text-amber-400" />}
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Limpar filtros */}
            {activeFilterCount > 0 && (
              <button
                onClick={() => {
                  setFilterGenre('todos')
                  setFilterDifficulty(0)
                  setFilterCuration('todos')
                  setFilterOrigin('todos')
                }}
                className="text-[11px] text-accent hover:text-accent/80 font-semibold transition-colors"
              >
                Limpar todos os filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* ====== CONTEÚDO: TABELA ====== */}
      {viewMode === 'table' && (
        <div className="rounded-[14px] bg-card border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-[var(--bg2)] hover:bg-[var(--bg2)]">
                <TableHead className="text-[9px] uppercase tracking-[2px] font-semibold text-text3 py-3">Música</TableHead>
                <TableHead className="text-[9px] uppercase tracking-[2px] font-semibold text-text3 py-3">Artista</TableHead>
                <TableHead className="text-[9px] uppercase tracking-[2px] font-semibold text-text3 py-3">Acordes</TableHead>
                <TableHead className="text-[9px] uppercase tracking-[2px] font-semibold text-text3 py-3">Tom</TableHead>
                <TableHead className="text-[9px] uppercase tracking-[2px] font-semibold text-text3 py-3">Gênero</TableHead>
                <TableHead className="text-[9px] uppercase tracking-[2px] font-semibold text-text3 py-3">Nível</TableHead>
                <TableHead className="text-[9px] uppercase tracking-[2px] font-semibold text-text3 py-3">Status</TableHead>
                <TableHead className="text-[9px] uppercase tracking-[2px] font-semibold text-text3 py-3 text-right">Ações</TableHead>
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
                filtered.map(song => (
                  <TableRow
                    key={song.id}
                    className="cursor-pointer hover:bg-[var(--azul-soft)] transition-colors border-b border-border"
                    onClick={() => handlePreview(song)}
                  >
                    <TableCell className="py-3.5">
                      <div className="flex items-center gap-2">
                        {song.cifra_source === 'cifra_club' && (
                          <Lightning size={12} weight="fill" className="text-amber-400 flex-shrink-0" />
                        )}
                        <span className="font-semibold text-[13px] text-text">{song.title}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-text2 text-[13px] py-3.5">{song.artist ?? '—'}</TableCell>
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
                          <AlertDialogTrigger asChild>
                            <TooltipProvider delayDuration={200}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-300">
                                    <Trash size={15} />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent><p className="text-xs">Excluir</p></TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-surface border-border">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir música?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir <strong>{song.title}</strong>? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => handleDelete(song.id)}>
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
              {filtered.map(song => (
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

      {/* ====== MODAIS ====== */}
      <RepertoireModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingSong(null); }}
        onSuccess={refetch}
        song={editingSong}
      />

      <CifraClubImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSuccess={refetch}
      />

      <RepertoireSheet
        song={previewSong}
        open={!!previewSong}
        onOpenChange={(open) => { if (!open) setPreviewSong(null) }}
        onEdit={(song) => { setPreviewSong(null); handleEdit(song) }}
      />
    </div>
  );
}
