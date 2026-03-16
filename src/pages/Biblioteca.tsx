import { Plus, SpinnerGap, Warning, Guitar, PianoKeys, MusicNotes, Trash, Database, Lightning, Funnel, MagnifyingGlass } from "@phosphor-icons/react";
import { useState, useMemo, useEffect, memo } from "react";
import { toast } from 'sonner';
import { useAppContext } from "../AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useChords, useScales } from "@/hooks/useLibrary";
import { ChordDiagram } from "@/components/music/ChordDiagram";
import { StaffNotation } from "@/components/music/StaffNotation";
import { RhythmNotation } from "@/components/music/RhythmNotation";
import { Tablature } from "@/components/music/Tablature";
import { PianoKeyboard } from "@/components/music/PianoKeyboard";
import { NotationRenderer } from "@/components/music/NotationRenderer";
import { KeyboardEditor, type PianoChordData } from "@/components/music/KeyboardEditor";
import { NotationEditor, type NotationSaveData } from "@/components/music/NotationEditor";
import { TablatureEditor } from "@/components/music/TablatureEditor";
import { createChord, updateChord, deleteChord, insertChordsBatch } from "@/services/libraryService";
import { generateAllChordsForPopulation } from "@/services/chordAutoFillService";
import { createNotation, updateNotation, deleteNotation, type NotationLibraryRow } from "@/services/notationService";
import { createTablature, updateTablature, deleteTablature, type TablatureLibraryRow } from "@/services/notationService";
import { useNotations, useTablatures } from "@/hooks/useNotations";


/** Converte notas de escala para formato VexFlow */
function scaleNotesToVexflow(notes: string[]): string[] {
  const noteOctaveMap: Record<string, string> = {
    C: 'c/4', D: 'd/4', E: 'e/4', F: 'f/4', G: 'g/4', A: 'a/4', B: 'b/4',
    Eb: 'eb/4', Bb: 'bb/4', 'F#': 'f#/4', 'C#': 'c#/4',
  }
  return notes.map(n => {
    const base = noteOctaveMap[n] ?? `${n.toLowerCase()}/4`
    return `${base}:q`
  })
}

const STAGE_BADGES: Record<string, 'foundation' | 'grow' | 'advance' | 'master'> = {
  foundation: 'foundation', grow: 'grow', advance: 'advance', master: 'master',
}

/** Traduz family do banco para texto em pt-BR */
const FAMILY_LABELS: Record<string, string> = {
  triad: 'tríade', tetrad: 'tétrade', suspended: 'suspensa',
  tension: 'tensão', power: 'power chord', other: 'outro',
}
function chordFooterText(chord: { family?: string | null; difficulty?: number | null }): string {
  const family = FAMILY_LABELS[(chord.family ?? '')] ?? ''
  const level = chord.difficulty ? `nível ${chord.difficulty}` : ''
  return [family, level].filter(Boolean).join(' · ')
}

/** Card de acorde de piano com teclado SVG real */
const PianoChordCard = memo(function PianoChordCard({ positions, name }: { positions: any; name: string }) {
  const allKeys = (positions?.keys ?? []) as string[]
  const rawKeysLh = (positions?.keys_lh ?? []) as string[]
  const fingeringRhRaw = (positions?.fingering_rh ?? []) as number[]
  const fingeringLhRaw = (positions?.fingering_lh ?? []) as number[]
  const rawQuality = (positions?.quality ?? '') as string
  const rawRoot = (positions?.root ?? '') as string

  // Inferir quality a partir do nome quando campo está vazio
  const quality = rawQuality || (() => {
    // Remover nota raiz do nome para extrair sufixo (ex: "Cm7" → "m7", "C" → "")
    const rootFromName = name.match(/^[A-G][b#]?/)?.[0] ?? ''
    const suffix = name.slice(rootFromName.length)
    return suffix || 'maior'
  })()

  // Extrair nome e oitava do root (pode vir como "C4" ou "C")
  const rootMatch = rawRoot.match(/^([A-G][b#]?)(\d?)$/)
  const rootName = rootMatch ? rootMatch[1] : rawRoot
  const rootOctave = rootMatch?.[2] ? parseInt(rootMatch[2]) : undefined

  // Inferir keysLh para acordes antigos: se nome tem slash e keys_lh está vazio,
  // separar a nota do baixo (slash) da mão direita para a mão esquerda
  let keys = allKeys
  let keysLh = rawKeysLh
  let fingeringRh = fingeringRhRaw
  let fingeringLh = fingeringLhRaw

  if (keysLh.length === 0 && name.includes('/')) {
    const slashNote = name.split('/')[1] // ex: "G" de "C/G"
    if (slashNote) {
      // Encontrar a nota do baixo (mais grave) que corresponde ao slash
      const bassIdx = allKeys.findIndex(k => {
        const m = k.match(/^([A-G][b#]?)/)
        return m && m[1] === slashNote
      })
      if (bassIdx !== -1) {
        keysLh = [allKeys[bassIdx]]
        keys = allKeys.filter((_, i) => i !== bassIdx)
        fingeringLh = fingeringRhRaw[bassIdx] != null ? [fingeringRhRaw[bassIdx]] : []
        fingeringRh = fingeringRhRaw.filter((_, i) => i !== bassIdx)
      }
    }
  }

  if (keys.length === 0 && keysLh.length === 0) {
    return (
      <div className="h-[180px] flex flex-col items-center justify-center gap-2 w-full">
        <PianoKeys size={32} className="text-text3" />
        <div className="text-[11px] text-text3">Sem dados</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center gap-1 w-full">
      <div className="font-bold text-[15px] text-text">{name}</div>
      {quality && (
        <Badge variant="foundation" className="text-[8px] mb-0.5">{quality}</Badge>
      )}
      <PianoKeyboard
        keys={keys}
        keysLh={keysLh}
        root={rootName}
        rootOctave={rootOctave}
        fingeringRH={fingeringRh}
        fingeringLH={fingeringLh}
        showLabels={true}
        hand="rh"
        scale={1}
        className="w-full overflow-hidden"
      />
    </div>
  )
})

const NOTATION_CATEGORY_BADGES: Record<string, { label: string; variant: string }> = {
  scale: { label: 'Escala', variant: 'advance' },
  chord: { label: 'Acorde', variant: 'foundation' },
  interval: { label: 'Intervalo', variant: 'gold' },
  rhythm: { label: 'Ritmo', variant: 'accent' },
  exercise: { label: 'Exercício', variant: 'grow' },
  pattern: { label: 'Padrão', variant: 'secondary' },
}


type InstrumentFilter = 'guitar' | 'piano' | 'bass' | 'ukulele'

const INSTRUMENTS: { value: InstrumentFilter; label: string; icon: typeof Guitar }[] = [
  { value: 'guitar', label: 'Violão', icon: Guitar },
  { value: 'piano', label: 'Piano', icon: PianoKeys },
  { value: 'bass', label: 'Baixo', icon: Guitar },
  { value: 'ukulele', label: 'Ukulele', icon: Guitar },
]

export function Biblioteca() {
  const [activeTab, setActiveTab] = useState("acordes");
  const [instrument, setInstrument] = useState<InstrumentFilter>('guitar');
  const { openModal } = useAppContext();
  const [chordSearch, setChordSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [populating, setPopulating] = useState(false);
  const [diffFilter, setDiffFilter] = useState('todos');
  const [rootNoteFilter, setRootNoteFilter] = useState('todos');
  const [familyFilter, setFamilyFilter] = useState('todos');
  const [slashFilter, setSlashFilter] = useState<'todos' | 'sem' | 'inversion' | 'upper_structure' | 'com'>('todos');
  const [barreFilter, setBarreFilter] = useState<'todos' | 'sem' | 'com'>('todos');
  const [accidentalFilter, setAccidentalFilter] = useState<'todos' | 'natural' | 'sharp_flat'>('todos');
  const [cagedMode, setCagedMode] = useState(false);
  const [voicingMode, setVoicingMode] = useState(false);
  const [voicingFilter, setVoicingFilter] = useState<'todos' | 'root_position' | '1st_inversion' | '2nd_inversion' | '3rd_inversion'>('todos');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // CAGED só é relevante para instrumentos de braço (violão/guitarra)
  const isStringInstrument = instrument === 'guitar';
  const isPiano = instrument === 'piano';

  const activeFilterCount = [
    familyFilter !== 'todos',
    barreFilter !== 'todos',
    slashFilter !== 'todos',
    accidentalFilter !== 'todos',
    voicingFilter !== 'todos',
  ].filter(Boolean).length;

  const diffFilterNum = diffFilter !== 'todos' ? Number(diffFilter) : undefined;
  const rootNoteVal = rootNoteFilter !== 'todos' ? rootNoteFilter : undefined;
  const familyVal = familyFilter !== 'todos' ? familyFilter : undefined;
  const hasBarre = barreFilter === 'sem' ? false : barreFilter === 'com' ? true : null;
  const excludeSlash = slashFilter === 'sem';
  const onlySlash = slashFilter === 'com';
  const slashType = slashFilter === 'inversion' ? 'inversion' : slashFilter === 'upper_structure' ? 'upper_structure' : undefined;
  const accidental = accidentalFilter !== 'todos' ? accidentalFilter as 'natural' | 'sharp_flat' : undefined;
  const voicingPositionVal = voicingFilter !== 'todos' ? voicingFilter : undefined;
  const { data: chords, loading: chordsLoading, refetch: refetchChords, count: chordsCount, page: chordsPage, totalPages: chordsTotalPages, setPage: setChordsPage } = useChords(instrument as any, { search: debouncedSearch || undefined, difficulty: diffFilterNum, rootNote: rootNoteVal, family: familyVal, excludeSlash, onlySlash, slashType, accidental, hasBarre, voicingPosition: voicingPositionVal });
  const { data: scales, loading: scalesLoading } = useScales();
  const { data: notations, loading: notationsLoading, refetch: refetchNotations } = useNotations();
  const { data: tablatures, loading: tablaturesLoading, refetch: refetchTablatures } = useTablatures();

  // Refetch automático quando um novo acorde é salvo via modal
  useEffect(() => {
    const handler = () => refetchChords();
    window.addEventListener('chord-library-updated', handler);
    return () => window.removeEventListener('chord-library-updated', handler);
  }, [refetchChords]);

  // Debounce da busca de acordes (300ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(chordSearch), 300);
    return () => clearTimeout(timer);
  }, [chordSearch]);

  // Estado da aba Notação
  const [notationSearch, setNotationSearch] = useState('');
  const [notationCatFilter, setNotationCatFilter] = useState('todas');
  const [notationDiffFilter, setNotationDiffFilter] = useState('todos');
  const [notationEditorOpen, setNotationEditorOpen] = useState(false);
  const [editingNotation, setEditingNotation] = useState<NotationLibraryRow | null>(null);

  // Estado do KeyboardEditor (piano)
  const [pianoEditorOpen, setPianoEditorOpen] = useState(false);
  const [editingPianoChord, setEditingPianoChord] = useState<any>(null);

  /** Auto-classifica voicing_position e slash_type a partir das notas do piano */
  const classifyPianoVoicing = (positions: PianoChordData['positions']) => {
    const NOTE_SEMITONES: Record<string, number> = {
      'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'Fb': 4,
      'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11, 'Cb': 11,
    }
    const parsePitch = (s: string) => {
      const m = s.match(/^([A-G][b#]?)(\d+)$/)
      if (!m) return null
      return (NOTE_SEMITONES[m[1]] ?? 0) + (parseInt(m[2]) + 1) * 12
    }
    const rootSem = NOTE_SEMITONES[positions.root] ?? 0

    // Intervalos comuns de cada grau em semitons (mod 12)
    const INTERVALS: Record<string, number[]> = {
      '3rd': [3, 4],     // terça menor ou maior
      '5th': [7, 6, 8],  // quinta justa, diminuta, aumentada
      '7th': [10, 11],   // sétima menor ou maior
    }

    const classifyInterval = (noteSem: number): string | null => {
      const interval = ((noteSem - rootSem) % 12 + 12) % 12
      if (interval === 0) return null // é a fundamental
      for (const [degree, semitones] of Object.entries(INTERVALS)) {
        if (semitones.includes(interval)) return degree
      }
      return 'other'
    }

    // voicing_position: baseada na 1ª nota da mão direita
    let voicingPosition: string | null = null
    if (positions.keys.length > 0) {
      const firstRhMidi = parsePitch(positions.keys[0])
      if (firstRhMidi != null) {
        const firstSem = firstRhMidi % 12
        const degree = classifyInterval(firstSem)
        if (degree === null) voicingPosition = 'root_position'
        else if (degree === '3rd') voicingPosition = '1st_inv_shape'
        else if (degree === '5th') voicingPosition = '2nd_inv_shape'
        else if (degree === '7th') voicingPosition = '3rd_inv_shape'
        else voicingPosition = 'root_position'
      }
    }

    // slash_type: baseada na nota mais grave da mão esquerda
    let slashType: string | null = null
    const lhKeys = positions.keys_lh ?? []
    if (lhKeys.length > 0) {
      const lhMidis = lhKeys.map(parsePitch).filter((m): m is number => m != null)
      if (lhMidis.length > 0) {
        const lowestLh = Math.min(...lhMidis)
        const degree = classifyInterval(lowestLh % 12)
        if (degree === '3rd') slashType = '3rd'
        else if (degree === '5th') slashType = '5th'
        else if (degree === '7th') slashType = '7th'
        else if (degree === 'other') slashType = 'upper_structure'
        // se degree === null, é a fundamental → sem slash
      }
    }

    return { voicingPosition, slashType }
  }

  const handleSavePianoChord = async (data: PianoChordData) => {
    const auto = classifyPianoVoicing(data.positions)
    // Usar voicing_position explícito do editor quando disponível
    const voicingPos = data.positions.voicing_position || auto.voicingPosition
    const chordPayload = {
      name: data.name,
      instrument: 'piano' as any,
      positions: data.positions as any,
      difficulty: data.difficulty,
      tags: data.tags as any,
      voicing_position: voicingPos,
      slash_type: auto.slashType,
    }
    if (editingPianoChord) {
      await updateChord(editingPianoChord.id, chordPayload);
      toast.success('Acorde de piano atualizado!');
    } else {
      await createChord(chordPayload);
      toast.success('Acorde de piano criado!');
    }
    refetchChords();
    window.dispatchEvent(new Event('chord-library-updated'));
  };

  const handleDeletePianoChord = async (id: string) => {
    await deleteChord(id);
    toast.success('Acorde de piano excluído');
    refetchChords();
    window.dispatchEvent(new Event('chord-library-updated'));
  };

  // Pré-popular banco com TODOS os acordes do chords-db
  const handlePopulateChords = async () => {
    setPopulating(true)
    try {
      const stats = generateAllChordsForPopulation()
      const allChords = [...stats.guitarChords, ...stats.pianoChords]

      const inserted = await insertChordsBatch(allChords, (done, total) => {
        console.log(`Populando: ${done}/${total}`)
      })

      toast.success(
        `Biblioteca populada! ${inserted} acordes novos inseridos ` +
        `(${stats.totalGuitar} violão + ${stats.totalPiano} piano gerados)`
      )
      refetchChords()
      window.dispatchEvent(new Event('chord-library-updated'))
    } catch (err) {
      console.error('Erro ao popular acordes:', err)
      toast.error('Erro ao popular biblioteca de acordes')
    } finally {
      setPopulating(false)
    }
  }

  // CRUD Notação
  const handleSaveNotation = async (data: NotationSaveData) => {
    if (editingNotation) {
      await updateNotation(editingNotation.id, data);
      toast.success('Notação atualizada!');
    } else {
      await createNotation(data as any);
      toast.success('Notação criada!');
    }
    refetchNotations();
  };

  const handleDeleteNotation = async (id: string) => {
    await deleteNotation(id);
    toast.success('Notação excluída');
    refetchNotations();
  };

  // Estado da aba Tablatura
  const [tabSearch, setTabSearch] = useState('');
  const [tabDiffFilter, setTabDiffFilter] = useState('todos');
  const [tabEditorOpen, setTabEditorOpen] = useState(false);
  const [editingTab, setEditingTab] = useState<TablatureLibraryRow | null>(null);

  const handleSaveTab = async (lines: string[], label: string) => {
    try {
      if (editingTab) {
        await updateTablature(editingTab.id, {
          name: label || editingTab.name,
          notation_data: { lines, label, columns: lines.length > 0 ? undefined : 8 },
        });
        toast.success('Tablatura atualizada!');
      } else {
        await createTablature({
          name: label || 'Nova Tablatura',
          notation_data: { lines, label },
          difficulty: 1,
        });
        toast.success('Tablatura criada!');
      }
      refetchTablatures();
      setTabEditorOpen(false);
      setEditingTab(null);
    } catch (e: any) {
      toast.error('Erro ao salvar tablatura: ' + (e?.message ?? ''));
    }
  };

  const handleDeleteTab = async (id: string) => {
    try {
      await deleteTablature(id);
      toast.success('Tablatura excluída');
      refetchTablatures();
    } catch (e: any) {
      toast.error('Erro ao excluir: ' + (e?.message ?? ''));
    }
  };

  const filteredTablatures = useMemo(() => {
    let list = (tablatures ?? []) as TablatureLibraryRow[]
    if (tabSearch) {
      const q = tabSearch.toLowerCase()
      list = list.filter(t => t.name.toLowerCase().includes(q) || (t.description ?? '').toLowerCase().includes(q))
    }
    if (tabDiffFilter !== 'todos') {
      list = list.filter(t => t.difficulty === Number(tabDiffFilter))
    }
    return list
  }, [tablatures, tabSearch, tabDiffFilter])

  // Helper: calcula baseFret (position) a partir dos dados do acorde
  const getChordPosition = (positions: any): number => {
    if (positions?.position) return positions.position
    const frets: number[] = [
      ...(positions?.fingers ?? []).map((f: any) => f[1]).filter((f: number) => typeof f === 'number' && f > 0),
      ...(positions?.barres ?? []).map((b: any) => b.fret).filter((f: number) => typeof f === 'number' && f > 0),
    ]
    if (frets.length === 0) return 1
    const minFret = Math.min(...frets)
    return minFret > 0 ? minFret : 1
  }

  // Filtros agora são aplicados no server via useChords opts
  const filteredChords = chords ?? []

  const filteredNotations = useMemo(() => {
    let list = (notations ?? []) as NotationLibraryRow[]
    if (notationSearch) {
      const q = notationSearch.toLowerCase()
      list = list.filter(n => n.name.toLowerCase().includes(q) || (n.description ?? '').toLowerCase().includes(q))
    }
    if (notationCatFilter !== 'todas') {
      list = list.filter(n => n.category === notationCatFilter)
    }
    if (notationDiffFilter !== 'todos') {
      list = list.filter(n => n.difficulty === Number(notationDiffFilter))
    }
    return list
  }, [notations, notationSearch, notationCatFilter, notationDiffFilter])

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-[26px] leading-[1.2] text-text">
            Biblioteca <em className="not-italic text-accent">Musical</em>
          </h1>
          <p className="text-text2 text-[13.5px] mt-1.5">
            {chordsCount} acordes · {(scales ?? []).length} escalas · {(notations ?? []).length} notações · {(tablatures ?? []).length} tablaturas
          </p>
        </div>
        <Button onClick={() => {
          if (activeTab === 'imagens') {
            openModal('modal-imagem');
          } else if (activeTab === 'notacao') {
            setEditingNotation(null);
            setNotationEditorOpen(true);
          } else if (activeTab === 'tablatura') {
            setEditingTab(null);
            setTabEditorOpen(true);
          } else if (instrument === 'piano') {
            setEditingPianoChord(null);
            setPianoEditorOpen(true);
          } else {
            openModal('modal-acorde');
          }
        }}>
          <Plus size={16} /> {activeTab === 'imagens' ? 'Gerar Imagem' : activeTab === 'notacao' ? 'Nova Notação' : activeTab === 'tablatura' ? 'Nova Tablatura' : 'Novo Acorde'}
        </Button>
      </div>

      <Tabs defaultValue="acordes" className="mb-6" onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="acordes">🎸 Acordes ({chordsCount})</TabsTrigger>
          <TabsTrigger value="escalas">📊 Escalas ({(scales ?? []).length})</TabsTrigger>
          <TabsTrigger value="notacao">🎵 Notação ({(notations ?? []).length})</TabsTrigger>
          <TabsTrigger value="tablatura">🎼 Tablatura ({(tablatures ?? []).length})</TabsTrigger>
          <TabsTrigger value="imagens">🖼 Imagens IA</TabsTrigger>
        </TabsList>

        <TabsContent value="acordes">
          <div>
            {/* Filtro de instrumento + botão popular */}
            <div className="flex items-center gap-2 mb-4">
              {INSTRUMENTS.map(inst => {
                const Icon = inst.icon
                const active = instrument === inst.value
                return (
                  <button
                    key={inst.value}
                    onClick={() => { setInstrument(inst.value); if (inst.value !== 'guitar') setCagedMode(false); }}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12.5px] font-medium transition-all ${
                      active
                        ? 'bg-accent/15 text-accent border border-accent/30'
                        : 'bg-surface border border-border text-text2 hover:text-text hover:border-text3'
                    }`}
                  >
                    <Icon size={16} weight={active ? 'fill' : 'regular'} />
                    {inst.label}
                  </button>
                )
              })}
              <div className="ml-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePopulateChords}
                  disabled={populating}
                  className="gap-1.5 text-[12px]"
                >
                  {populating ? (
                    <SpinnerGap size={14} className="animate-spin" />
                  ) : (
                    <Database size={14} />
                  )}
                  {populating ? 'Populando...' : 'Popular Biblioteca'}
                </Button>
              </div>
            </div>

            {/* ====== FILTROS (padrão Repertório) ====== */}
            <div className="rounded-[14px] bg-card border border-border p-4 space-y-3 mb-4">
              {/* Linha principal: Busca + Nota Raiz + Dificuldade + Filtros + Resultados */}
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[200px] space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-[1.5px] text-text3 flex items-center gap-1">
                    <MagnifyingGlass size={12} /> Buscar
                  </label>
                  <Input
                    placeholder="Ex: Am7, F#m, Bb, Cmaj7..."
                    value={chordSearch}
                    onChange={e => setChordSearch(e.target.value)}
                    className="h-9 text-[13px]"
                  />
                </div>
                <div className="w-[130px] space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-[1.5px] text-text3">Nota raiz</label>
                  <Select value={rootNoteFilter} onValueChange={setRootNoteFilter}>
                    <SelectTrigger className="h-9 text-[13px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todas</SelectItem>
                      {['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].map(n => (
                        <SelectItem key={n} value={n}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-[150px] space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-[1.5px] text-text3">Dificuldade</label>
                  <Select value={diffFilter} onValueChange={setDiffFilter}>
                    <SelectTrigger className="h-9 text-[13px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="1">1 — Fácil</SelectItem>
                      <SelectItem value="2">2 — Intermediário</SelectItem>
                      <SelectItem value="3">3 — Avançado</SelectItem>
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
                  {chordsCount} acorde{chordsCount !== 1 ? 's' : ''}
                </Badge>
              </div>

              {/* Toggle MODO CAGED — SÓ para Violão/Guitarra */}
              {isStringInstrument && (
                <div className="flex items-center gap-3 pt-2 border-t border-border/50">
                  <button
                    onClick={() => setCagedMode(!cagedMode)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-[12px] font-bold uppercase tracking-wider cursor-pointer transition-colors duration-150 active:scale-[0.97] active:duration-75 ${
                      cagedMode
                        ? 'border-accent bg-accent/15 text-accent shadow-sm shadow-accent/20'
                        : 'border-border text-text3 hover:text-text2 hover:border-text3'
                    }`}
                  >
                    <Guitar size={16} weight={cagedMode ? 'fill' : 'regular'} />
                    Modo CAGED
                    <span className={`w-8 h-4 rounded-full relative transition-colors ${cagedMode ? 'bg-accent' : 'bg-border'}`}>
                      <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${cagedMode ? 'left-[18px]' : 'left-0.5'}`} />
                    </span>
                  </button>
                  {cagedMode && (
                    <span className="text-[11px] text-text3 italic">
                      Visualização em Matriz — 5 regiões do braço
                    </span>
                  )}
                </div>
              )}

              {/* Toggle MODO VOICING — SÓ para Piano */}
              {isPiano && (
                <div className="flex items-center gap-3 pt-2 border-t border-border/50">
                  <button
                    onClick={() => setVoicingMode(!voicingMode)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-[12px] font-bold uppercase tracking-wider cursor-pointer transition-colors duration-150 active:scale-[0.97] active:duration-75 ${
                      voicingMode
                        ? 'border-accent bg-accent/15 text-accent shadow-sm shadow-accent/20'
                        : 'border-border text-text3 hover:text-text2 hover:border-text3'
                    }`}
                  >
                    <PianoKeys size={16} weight={voicingMode ? 'fill' : 'regular'} />
                    Modo Voicing
                    <span className={`w-8 h-4 rounded-full relative transition-colors ${voicingMode ? 'bg-accent' : 'bg-border'}`}>
                      <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${voicingMode ? 'left-[18px]' : 'left-0.5'}`} />
                    </span>
                  </button>
                  {voicingMode && (
                    <span className="text-[11px] text-text3 italic">
                      Visualização em Matriz — Voicings agrupados por nota
                    </span>
                  )}
                </div>
              )}

              {/* Filtros avançados (colapsável) */}
              {showAdvancedFilters && (
                <div className="pt-3 border-t border-border space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                  {/* Família */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-[1.5px] text-text3">Família</label>
                    <div className="flex gap-1.5 flex-wrap">
                      {(['todos', 'triad', 'tetrad', 'tension', 'suspended', 'power'] as const).map(fam => {
                        const labels: Record<string, string> = { todos: 'Todos', triad: 'Tríades', tetrad: 'Tétrades', tension: 'Tensões', suspended: 'Suspensas', power: 'Power' }
                        return (
                          <button
                            key={fam}
                            onClick={() => setFamilyFilter(fam)}
                            className={`px-2.5 py-1 text-[11px] rounded-full border transition-colors ${
                              familyFilter === fam
                                ? 'border-accent/40 bg-accent/10 text-accent font-semibold'
                                : 'border-border text-text3 hover:text-text2'
                            }`}
                          >
                            {labels[fam]}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Pestana — só para instrumentos de braço */}
                  {!isPiano && <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-[1.5px] text-text3">Pestana</label>
                    <div className="flex gap-1.5 flex-wrap">
                      {([
                        { label: 'Todos', value: 'todos' as const },
                        { label: 'Sem pestana', value: 'sem' as const },
                        { label: 'Com pestana', value: 'com' as const },
                      ]).map(opt => (
                        <button
                          key={`barre-${opt.value}`}
                          onClick={() => setBarreFilter(opt.value)}
                          className={`px-2.5 py-1 text-[11px] rounded-full border transition-colors ${
                            barreFilter === opt.value
                              ? 'border-accent/40 bg-accent/10 text-accent font-semibold'
                              : 'border-border text-text3 hover:text-text2'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>}

                  {/* Voicing — só para Piano */}
                  {isPiano && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold uppercase tracking-[1.5px] text-text3">Posição (MD)</label>
                      <div className="flex gap-1.5 flex-wrap">
                        {([
                          { label: 'Todos', value: 'todos' as const },
                          { label: 'Fundamental', value: 'root_position' as const },
                          { label: '1ª Pos', value: '1st_inversion' as const },
                          { label: '2ª Pos', value: '2nd_inversion' as const },
                          { label: '3ª Pos', value: '3rd_inversion' as const },
                        ]).map(opt => (
                          <button
                            key={`voicing-${opt.value}`}
                            onClick={() => setVoicingFilter(opt.value)}
                            className={`px-2.5 py-1 text-[11px] rounded-full border transition-colors ${
                              voicingFilter === opt.value
                                ? 'border-accent/40 bg-accent/10 text-accent font-semibold'
                                : 'border-border text-text3 hover:text-text2'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Baixo / Slash */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-[1.5px] text-text3">Baixo</label>
                    <div className="flex gap-1.5 flex-wrap">
                      {([
                        { label: 'Todos', value: 'todos' as const },
                        { label: 'Pos. Fundamental', value: 'sem' as const },
                        { label: 'Inversões', value: 'inversion' as const },
                        { label: 'Est. Superior', value: 'upper_structure' as const },
                      ]).map(opt => (
                        <button
                          key={`slash-${opt.value}`}
                          onClick={() => setSlashFilter(opt.value)}
                          className={`px-2.5 py-1 text-[11px] rounded-full border transition-colors ${
                            slashFilter === opt.value
                              ? 'border-accent/40 bg-accent/10 text-accent font-semibold'
                              : 'border-border text-text3 hover:text-text2'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notas Raízes */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-[1.5px] text-text3">Notas Raízes</label>
                    <div className="flex gap-1.5 flex-wrap">
                      {([
                        { label: 'Todas', value: 'todos' as const },
                        { label: 'Naturais', value: 'natural' as const },
                        { label: 'Sustenidos / Bemóis', value: 'sharp_flat' as const },
                      ]).map(opt => (
                        <button
                          key={`acc-${opt.value}`}
                          onClick={() => setAccidentalFilter(opt.value)}
                          className={`px-2.5 py-1 text-[11px] rounded-full border transition-colors ${
                            accidentalFilter === opt.value
                              ? 'border-accent/40 bg-accent/10 text-accent font-semibold'
                              : 'border-border text-text3 hover:text-text2'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Limpar filtros avançados */}
                  {activeFilterCount > 0 && (
                    <div className="pt-2 border-t border-border/50">
                      <button
                        onClick={() => { setFamilyFilter('todos'); setBarreFilter('todos'); setSlashFilter('todos'); setAccidentalFilter('todos'); setVoicingFilter('todos') }}
                        className="text-[11px] text-accent hover:underline font-medium"
                      >
                        Limpar filtros avançados
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {chordsLoading ? (
              <div className="flex items-center justify-center h-40 gap-2 text-text2">
                <SpinnerGap size={20} className="animate-spin" /> Carregando acordes...
              </div>
            ) : filteredChords.length === 0 ? (
              <div className="card p-8 text-center text-text3">
                <Warning size={20} className="inline mr-1" /> Nenhum acorde encontrado.
              </div>
            ) : cagedMode && isStringInstrument ? (
              /* ====== MODO CAGED: Swimlanes (Matriz 5 regiões) ====== */
              <div className="space-y-6">
                {(['C', 'A', 'G', 'E', 'D'] as const).map(shape => {
                  const shapeChords = filteredChords.filter(c => (c as any).caged_shape === shape)
                  const shapeLabels: Record<string, string> = { C: 'Formato C', A: 'Formato A', G: 'Formato G', E: 'Formato E', D: 'Formato D' }
                  const shapeDescriptions: Record<string, string> = {
                    C: 'Baixo na 5ª corda — escadinha descendente',
                    A: 'Baixo na 5ª corda — mão compacta subindo',
                    G: 'Baixo na 6ª corda — aranha (grande extensão)',
                    E: 'Baixo na 6ª corda — com pestana',
                    D: 'Baixo na 4ª corda — cordas agudas',
                  }
                  return (
                    <div key={shape} className="rounded-[14px] bg-card border border-border overflow-hidden">
                      {/* Header da raia */}
                      <div className="flex items-center gap-3 px-4 py-2.5 bg-surface/50 border-b border-border">
                        <span className="text-[18px] font-bold font-mono text-accent tracking-wider">{shape}</span>
                        <div>
                          <span className="text-[13px] font-semibold text-text">{shapeLabels[shape]}</span>
                          <span className="text-[11px] text-text3 ml-2">{shapeDescriptions[shape]}</span>
                        </div>
                        <Badge variant="secondary" className="ml-auto text-[10px]">
                          {shapeChords.length} acorde{shapeChords.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      {/* Grid de acordes da raia */}
                      {shapeChords.length === 0 ? (
                        <div className="px-4 py-6 text-center text-[12px] text-text3 italic">
                          Nenhum acorde neste formato para os filtros aplicados
                        </div>
                      ) : (
                        <div className="p-3 grid grid-cols-6 gap-3">
                          {shapeChords.map(chord => {
                            const tags = (chord.tags ?? []) as string[]
                            const positions = (chord.positions ?? {}) as any
                            return (
                              <div
                                key={chord.id}
                                className="card text-center p-3 hover:border-accent/30 transition-colors cursor-pointer"
                                onClick={() => openModal('modal-acorde', chord)}
                              >
                                <div className="flex justify-center mb-1">
                                  <ChordDiagram
                                    name={chord.name}
                                    positions={positions}
                                    position={getChordPosition(positions)}
                                    size="full"
                                    strings={6}
                                  />
                                </div>
                                <div className="text-[11px] text-text3">
                                  {chordFooterText(chord)}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
                {/* Acordes sem shape definido */}
                {filteredChords.some(c => !(c as any).caged_shape) && (
                  <div className="rounded-[14px] bg-card border border-border/50 overflow-hidden opacity-60">
                    <div className="flex items-center gap-3 px-4 py-2.5 bg-surface/30 border-b border-border/50">
                      <span className="text-[14px] font-semibold text-text3">?</span>
                      <span className="text-[12px] text-text3">Sem classificação CAGED</span>
                      <Badge variant="secondary" className="ml-auto text-[10px]">
                        {filteredChords.filter(c => !(c as any).caged_shape).length}
                      </Badge>
                    </div>
                    <div className="p-3 grid grid-cols-6 gap-3">
                      {filteredChords.filter(c => !(c as any).caged_shape).map(chord => {
                        const tags = (chord.tags ?? []) as string[]
                        const positions = (chord.positions ?? {}) as any
                        return (
                          <div
                            key={chord.id}
                            className="card text-center p-3 hover:border-accent/30 transition-colors cursor-pointer"
                            onClick={() => openModal('modal-acorde', chord)}
                          >
                            <div className="flex justify-center mb-1">
                              <ChordDiagram name={chord.name} positions={positions} position={getChordPosition(positions)} size="full" strings={6} />
                            </div>
                            <div className="text-[11px] text-text3">
                              {chordFooterText(chord)}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : voicingMode && isPiano ? (
              /* ====== MODO VOICING: Swimlanes agrupadas por nome base (Piano) ====== */
              (() => {
                // Agrupar acordes por nome, preservando ordem de aparição
                const groups: { name: string; chords: typeof filteredChords }[] = []
                const groupMap = new Map<string, typeof filteredChords>()
                for (const chord of filteredChords) {
                  const key = chord.name
                  if (!groupMap.has(key)) {
                    const arr: typeof filteredChords = []
                    groupMap.set(key, arr)
                    groups.push({ name: key, chords: arr })
                  }
                  groupMap.get(key)!.push(chord)
                }

                const VOICING_COLS = [
                  { key: 'root_position', label: 'Fund.' },
                  { key: '1st_inversion', label: '1ª Pos' },
                  { key: '2nd_inversion', label: '2ª Pos' },
                  { key: '3rd_inversion', label: '3ª Pos' },
                ] as const

                return (
                  <div className="space-y-5">
                    {groups.map(({ name, chords: groupChords }) => (
                      <div key={name} className="rounded-[14px] bg-card border border-border overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center gap-3 px-4 py-2.5 bg-surface/50 border-b border-border">
                          <span className="text-[16px] font-bold text-accent">{name}</span>
                          <Badge variant="secondary" className="ml-auto text-[10px]">
                            {groupChords.length} voicing{groupChords.length !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                        {/* Grid 4 colunas: Fund. | 1ª Pos | 2ª Pos | 3ª Pos */}
                        <div className="grid grid-cols-4 gap-0 divide-x divide-border/50">
                          {VOICING_COLS.map(col => {
                            const colChords = groupChords.filter(c => (c as any).voicing_position === col.key)
                            return (
                              <div key={col.key} className="min-h-[140px]">
                                <div className="text-center py-1.5 bg-surface/30 border-b border-border/50">
                                  <span className="text-[10px] font-semibold uppercase tracking-wider text-text3">{col.label}</span>
                                </div>
                                {colChords.length === 0 ? (
                                  <div className="flex items-center justify-center h-[120px] text-[11px] text-text3/40 italic">—</div>
                                ) : (
                                  <div className="p-2 space-y-2">
                                    {colChords.map(chord => {
                                      const positions = (chord.positions ?? {}) as any
                                      return (
                                        <div
                                          key={chord.id}
                                          className="card text-center p-2 hover:border-accent/30 transition-colors cursor-pointer"
                                          onClick={() => { setEditingPianoChord(chord); setPianoEditorOpen(true) }}
                                        >
                                          <div className="flex justify-center mb-1">
                                            <PianoChordCard positions={positions} name={chord.name} />
                                          </div>
                                          <div className="text-[10px] text-text3">
                                            Nível {chord.difficulty}
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()
            ) : (
              /* ====== MODO NORMAL: Grid flat ====== */
              <div className={`grid gap-4 ${instrument === 'piano' ? 'grid-cols-4' : 'grid-cols-6 gap-3'}`}>
                {filteredChords.map(chord => {
                  const tags = (chord.tags ?? []) as string[]
                  const positions = (chord.positions ?? {}) as any

                  return (
                    <div
                      key={chord.id}
                      className="card text-center p-3 hover:border-accent/30 transition-colors cursor-pointer"
                      onClick={() => {
                        if (instrument === 'piano') {
                          setEditingPianoChord(chord);
                          setPianoEditorOpen(true);
                        } else {
                          openModal('modal-acorde', chord);
                        }
                      }}
                    >
                      <div className="flex justify-center mb-1">
                        {instrument === 'piano' ? (
                          <PianoChordCard positions={positions} name={chord.name} />
                        ) : (
                          <ChordDiagram
                            name={chord.name}
                            positions={positions}
                            position={getChordPosition(positions)}
                            size="full"
                            strings={instrument === 'ukulele' || instrument === 'bass' ? 4 : 6}
                          />
                        )}
                      </div>
                      <div className="text-[11px] text-text3">
                        {chordFooterText(chord)}
                      </div>
                    </div>
                  )
                })}
                <div
                  className="card text-center p-3 border-2 border-dashed border-border cursor-pointer hover:border-accent hover:text-accent transition-colors"
                  onClick={() => {
                    if (instrument === 'piano') {
                      setEditingPianoChord(null);
                      setPianoEditorOpen(true);
                    } else {
                      openModal('modal-acorde');
                    }
                  }}
                >
                  <div className="h-[180px] flex items-center justify-center">
                    <div className="text-[28px] text-text3">+</div>
                  </div>
                  <div className="text-sm text-text2">Adicionar</div>
                </div>
              </div>
            )}

            {/* Paginação */}
            {chordsTotalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={chordsPage === 0}
                  onClick={() => { setChordsPage(chordsPage - 1); document.querySelector('.h-screen.overflow-y-auto')?.scrollTo({ top: 0, behavior: 'smooth' }) }}
                >
                  ← Anterior
                </Button>
                <span className="text-[13px] text-text2 min-w-[120px] text-center">
                  Página {chordsPage + 1} de {chordsTotalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={chordsPage >= chordsTotalPages - 1}
                  onClick={() => { setChordsPage(chordsPage + 1); document.querySelector('.h-screen.overflow-y-auto')?.scrollTo({ top: 0, behavior: 'smooth' }) }}
                >
                  Próxima →
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="escalas">
          {/* Filtro de instrumento (mesmos botões) */}
          <div className="flex gap-2 mb-4">
            {INSTRUMENTS.map(inst => {
              const Icon = inst.icon
              const active = instrument === inst.value
              return (
                <button
                  key={inst.value}
                  onClick={() => setInstrument(inst.value)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12.5px] font-medium transition-all ${
                    active
                      ? 'bg-accent/15 text-accent border border-accent/30'
                      : 'bg-surface border border-border text-text2 hover:text-text hover:border-text3'
                  }`}
                >
                  <Icon size={16} weight={active ? 'fill' : 'regular'} />
                  {inst.label}
                </button>
              )
            })}
          </div>

          {scalesLoading ? (
            <div className="flex items-center justify-center h-40 gap-2 text-text2">
              <SpinnerGap size={20} className="animate-spin" /> Carregando escalas...
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {(scales ?? []).map(scale => {
                const notes = (scale.notes ?? []) as string[]
                const intervals = (scale.intervals ?? []) as string[]
                const vexNotes = scaleNotesToVexflow(notes)
                const badgeVariant = STAGE_BADGES[scale.difficulty_level as string] ?? 'secondary'
                const instPositions = (scale as any).instrument_positions as Record<string, any> | null
                const pianoPos = instPositions?.piano as { keys_rh?: string[]; fingering_rh?: number[]; range?: string } | undefined

                return (
                  <div key={scale.id} className="card">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="font-bold text-[15px]">{scale.name}</div>
                        <div className="text-[12px] text-text3 font-mono mt-0.5">
                          Notas: {notes.join(' – ')} · Intervalos: {intervals.join(' ')}
                        </div>
                      </div>
                      <Badge variant={badgeVariant as any} className="capitalize">{scale.difficulty_level}</Badge>
                    </div>

                    {/* Notação na pauta (sempre visível) */}
                    <StaffNotation
                      notes={vexNotes}
                      clef="treble"
                      width={500}
                      height={130}
                    />

                    {/* Dados de piano (quando selecionado e disponível) */}
                    {instrument === 'piano' && pianoPos && (
                      <div className="mt-3 p-3 rounded-lg bg-foundation-soft border border-foundation/20">
                        <div className="flex items-center gap-1.5 mb-2">
                          <PianoKeys size={14} className="text-foundation" />
                          <span className="text-[11px] font-semibold text-foundation uppercase tracking-wider">Piano</span>
                          {pianoPos.range && (
                            <span className="text-[11px] text-text3 ml-auto font-mono">{pianoPos.range}</span>
                          )}
                        </div>
                        {pianoPos.keys_rh && (
                          <div className="text-[12px] font-mono text-text2">
                            <span className="text-text3">MD:</span>{' '}
                            {pianoPos.keys_rh.join(' · ')}
                            {pianoPos.fingering_rh && (
                              <span className="ml-3 text-text3">
                                Ded: {pianoPos.fingering_rh.join('-')}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="notacao">
          <div>
            {/* Filtros */}
            <div className="card mb-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Buscar</Label>
                  <Input placeholder="Ex: Dó Maior, pentatônica..." value={notationSearch} onChange={e => setNotationSearch(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Categoria</Label>
                  <Select value={notationCatFilter} onValueChange={setNotationCatFilter}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas</SelectItem>
                      <SelectItem value="scale">Escalas</SelectItem>
                      <SelectItem value="chord">Acordes</SelectItem>
                      <SelectItem value="interval">Intervalos</SelectItem>
                      <SelectItem value="rhythm">Ritmo</SelectItem>
                      <SelectItem value="exercise">Exercícios</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Dificuldade</Label>
                  <Select value={notationDiffFilter} onValueChange={setNotationDiffFilter}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="1">1 — Fácil</SelectItem>
                      <SelectItem value="2">2 — Intermediário</SelectItem>
                      <SelectItem value="3">3 — Avançado</SelectItem>
                      <SelectItem value="4">4 — Difícil</SelectItem>
                      <SelectItem value="5">5 — Expert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {notationsLoading ? (
              <div className="flex items-center justify-center h-40 gap-2 text-text2">
                <SpinnerGap size={20} className="animate-spin" /> Carregando notações...
              </div>
            ) : filteredNotations.length === 0 ? (
              <div className="card p-8 text-center text-text3">
                <Warning size={20} className="inline mr-1" /> Nenhuma notação encontrada.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {filteredNotations.map(nota => {
                  const catBadge = NOTATION_CATEGORY_BADGES[nota.category] ?? { label: nota.category, variant: 'secondary' as const }
                  const noteCount = (nota.notation_data?.beats ?? []).reduce((s: number, b: any) => s + (b.notes?.length ?? 0), 0)
                  return (
                    <div
                      key={nota.id}
                      className="card p-4 hover:border-accent/30 transition-colors cursor-pointer"
                      onClick={() => {
                        setEditingNotation(nota);
                        setNotationEditorOpen(true);
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant={catBadge.variant as any} className="text-[8px]">{catBadge.label}</Badge>
                        <span className="text-[10px] text-text3 font-mono">Nível {nota.difficulty}</span>
                      </div>
                      <div className="w-full rounded-lg mb-2 overflow-hidden">
                        {nota.render_data?.notation ? (
                          <NotationRenderer notation={nota.render_data.notation} />
                        ) : (
                          <div className="h-[80px] flex items-center justify-center text-text3 text-[11px]">
                            <MusicNotes size={16} className="mr-1" /> Sem preview
                          </div>
                        )}
                      </div>
                      <div className="font-bold text-[13px] text-text truncate">{nota.name}</div>
                      <div className="text-[11px] text-text3 truncate mt-0.5">
                        <MusicNotes size={12} className="inline mr-1" weight="fill" />
                        {noteCount} notas · {nota.clef === 'treble' ? 'Sol' : nota.clef === 'bass' ? 'Fá' : 'Dó'}
                        {nota.key_signature !== 'C' && ` · ${nota.key_signature}`}
                      </div>
                    </div>
                  )
                })}
                {/* Card "Adicionar" */}
                <div
                  className="card text-center p-4 border-2 border-dashed border-border cursor-pointer hover:border-accent hover:text-accent transition-colors"
                  onClick={() => {
                    setEditingNotation(null);
                    setNotationEditorOpen(true);
                  }}
                >
                  <div className="h-[130px] flex items-center justify-center">
                    <div className="text-[28px] text-text3">+</div>
                  </div>
                  <div className="text-sm text-text2">Adicionar</div>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="tablatura">
          <div>
            {/* Filtros */}
            <div className="card mb-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Buscar tablatura</Label>
                  <Input placeholder="Ex: Intro, Solo, Riff..." value={tabSearch} onChange={e => setTabSearch(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Dificuldade</Label>
                  <Select value={tabDiffFilter} onValueChange={setTabDiffFilter}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="1">1 — Fácil</SelectItem>
                      <SelectItem value="2">2 — Intermediário</SelectItem>
                      <SelectItem value="3">3 — Avançado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {tablaturesLoading ? (
              <div className="flex items-center justify-center h-40 gap-2 text-text2">
                <SpinnerGap size={20} className="animate-spin" /> Carregando tablaturas...
              </div>
            ) : filteredTablatures.length === 0 ? (
              <div className="card p-8 text-center text-text3">
                <Warning size={20} className="inline mr-1" /> Nenhuma tablatura encontrada.
                <p className="text-xs mt-2">Clique em "Nova Tablatura" para criar a primeira.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {filteredTablatures.map(tab => {
                  const nd = tab.notation_data as { lines?: string[]; label?: string } | null
                  const lines = (nd?.lines ?? []) as string[]
                  const label = nd?.label
                  const noteCount = lines.reduce((sum, line) => {
                    const nums = line.match(/\d+/g)
                    return sum + (nums?.length ?? 0)
                  }, 0)

                  return (
                    <div
                      key={tab.id}
                      className="card p-4 hover:border-accent/30 transition-colors cursor-pointer group relative"
                      onClick={() => {
                        setEditingTab(tab);
                        setTabEditorOpen(true);
                      }}
                    >
                      {/* Botão excluir */}
                      <button
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-vermelho/10 text-text3 hover:text-vermelho"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Excluir tablatura "${tab.name}"?`)) {
                            handleDeleteTab(tab.id);
                          }
                        }}
                        title="Excluir tablatura"
                      >
                        <Trash size={14} />
                      </button>

                      <div className="flex items-center justify-between mb-2">
                        <div className="font-bold text-[14px] text-text truncate">{tab.name}</div>
                        <Badge variant="secondary" className="text-[9px] ml-2 flex-shrink-0">
                          Nível {tab.difficulty}
                        </Badge>
                      </div>

                      {/* Preview da tablatura */}
                      {lines.length > 0 ? (
                        <div className="rounded-lg bg-[var(--bg2)] border border-border/50 overflow-hidden">
                          {label && (
                            <div className="px-3 pt-1.5 text-[9px] font-semibold uppercase tracking-[1px] text-text3/60">
                              {label}
                            </div>
                          )}
                          <div className="px-3 py-1.5 overflow-x-auto">
                            <pre className="font-mono text-[10px] leading-[1.4] whitespace-pre text-text2">
                              {lines.map((line, i) => {
                                const match = line.match(/^(\s*)([EBADGe])(\|)(.*)$/)
                                if (!match) return <div key={i}>{line}</div>
                                const [, indent, stringLabel, pipe, rest] = match
                                return (
                                  <div key={i} className="flex">
                                    <span className="text-emerald-400 font-bold w-[1ch] text-center">{stringLabel}</span>
                                    <span className="text-text3/30">{pipe}</span>
                                    <span className="text-blue-400/40">
                                      {rest.split(/(\d+)/).map((part, j) =>
                                        /^\d+$/.test(part)
                                          ? <span key={j} className="text-[#FF2D78] font-bold">{part}</span>
                                          : <span key={j}>{part}</span>
                                      )}
                                    </span>
                                  </div>
                                )
                              })}
                            </pre>
                          </div>
                        </div>
                      ) : (
                        <div className="h-[60px] flex items-center justify-center text-text3 text-[11px]">
                          <Guitar size={16} className="mr-1" /> Tablatura vazia
                        </div>
                      )}

                      <div className="text-[11px] text-text3 mt-2">
                        <Guitar size={12} className="inline mr-1" weight="fill" />
                        {noteCount} nota{noteCount !== 1 ? 's' : ''} · {lines.length} corda{lines.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  )
                })}
                {/* Card "Adicionar" */}
                <div
                  className="card text-center p-4 border-2 border-dashed border-border cursor-pointer hover:border-accent hover:text-accent transition-colors"
                  onClick={() => {
                    setEditingTab(null);
                    setTabEditorOpen(true);
                  }}
                >
                  <div className="h-[130px] flex items-center justify-center">
                    <div className="text-[28px] text-text3">+</div>
                  </div>
                  <div className="text-sm text-text2">Adicionar</div>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="imagens">
          <div>
            <div className="flex items-center gap-2.5 py-3.5 px-5 bg-foundation-soft border border-[rgba(99,102,241,0.2)] rounded-[var(--radius)] mb-4">
              <span className="text-lg">🤖</span>
              <div className="flex-1">
                <div className="font-bold text-foundation">Geração de Imagens via IA (Imagen 4)</div>
                <div className="text-sm text-text2">Gere imagens reais para materiais: instrumentos, anatomia vocal, cenas musicais, história da música</div>
              </div>
              <Button size="sm" onClick={() => openModal('modal-imagem')}>✨ Gerar Imagem</Button>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div className="card p-3">
                <div className="aspect-[4/3] bg-gradient-to-br from-azul-soft to-accent-soft rounded-lg flex items-center justify-center mb-2">
                  <span className="text-[36px]">🎸</span>
                </div>
                <div className="font-bold text-xs">Violão clássico</div>
                <div className="text-[11px] text-text3">Imagen 4 · 512x512</div>
              </div>
              <div className="card p-3">
                <div className="aspect-[4/3] bg-gradient-to-br from-master-soft to-accent-soft rounded-lg flex items-center justify-center mb-2">
                  <span className="text-[36px]">🎤</span>
                </div>
                <div className="font-bold text-xs">Aparelho fonador</div>
                <div className="text-[11px] text-text3">Imagen 4 · Anatomia vocal</div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* KeyboardEditor — modal de piano */}
      <KeyboardEditor
        open={pianoEditorOpen}
        onOpenChange={(v) => { setPianoEditorOpen(v); if (!v) setEditingPianoChord(null); }}
        chord={editingPianoChord}
        onSave={handleSavePianoChord}
        onDelete={handleDeletePianoChord}
      />

      {/* NotationEditor — modal de notação */}
      <NotationEditor
        open={notationEditorOpen}
        onOpenChange={(v) => { setNotationEditorOpen(v); if (!v) setEditingNotation(null); }}
        notation={editingNotation}
        onSave={handleSaveNotation}
        onDelete={handleDeleteNotation}
      />

      {/* TablatureEditor — modal de tablatura */}
      <TablatureEditor
        open={tabEditorOpen}
        onOpenChange={(v) => { setTabEditorOpen(v); if (!v) setEditingTab(null); }}
        initialLines={editingTab?.notation_data?.lines ?? []}
        initialLabel={editingTab?.notation_data?.label ?? editingTab?.name ?? ''}
        onSave={handleSaveTab}
      />
    </div>
  );
}
