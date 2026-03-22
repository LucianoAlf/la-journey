import { Plus, SpinnerGap, Warning, Guitar, PianoKeys, MusicNotes, MusicNotesSimple, ListBullets, ImageSquare, Trash, Database, Funnel, MagnifyingGlass } from "@phosphor-icons/react";
import { useState, useMemo, useEffect, memo } from "react";
import { toast } from 'sonner';
import { useAppContext } from "../AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useChords } from "@/hooks/useLibrary";
import { ChordDiagram } from "@/components/music/ChordDiagram";
import { PianoKeyboard } from "@/components/music/PianoKeyboard";
import { KeyboardEditor, type PianoChordData } from "@/components/music/KeyboardEditor";
import { NotationEditorV2 } from "@/components/music/NotationEditorV2";
import { AlphaTexInlineRenderer } from "@/components/music/AlphaTexInlineRenderer";
import { TablatureEditor, INSTRUMENTS as TAB_INSTRUMENTS, gridToAlphaTex, type TablatureData, type TabInstrument } from "@/components/music/TablatureEditor";
import { AlphaTabViewer } from "@/components/music/AlphaTabViewer";
import { GuitarFretboardDiagram, type GuitarFretboardPositions } from "@/components/music/GuitarFretboardDiagram";
import { GuitarFretboardEditor } from "@/components/music/GuitarFretboardEditor";
import { createChord, updateChord, deleteChord, insertChordsBatch } from "@/services/libraryService";
import { generateAllChordsForPopulation } from "@/services/chordAutoFillService";
import { deleteNotation, type NotationLibraryRow } from "@/services/notationService";
import { createTablature, updateTablature, deleteTablature, type TablatureLibraryRow } from "@/services/notationService";
import { useNotations, useTablatures } from "@/hooks/useNotations";
import { ImageGeneratorModal } from "@/components/music/ImageGeneratorModal";
import { ImageGallery } from "@/components/music/ImageGallery";
import type { ImageLibraryItem } from "@/services/imageGenerationService";
import { beatsToAlphaTex } from "@/lib/beatsToAlphaTex";

function normalizeNotationBeatsForPreview(rawBeats: any[]): any[] {
  return rawBeats
    .map((rawBeat) => {
      if (!rawBeat || typeof rawBeat !== 'object') return null

      if (Array.isArray(rawBeat.pitches)) {
        return rawBeat
      }

      const notes = Array.isArray(rawBeat.notes) ? rawBeat.notes : []
      const accidentals = Array.isArray(rawBeat.accidentals) ? rawBeat.accidentals : []
      const rawDuration = typeof notes[0] === 'string' ? String(notes[0]).split(':')[1] ?? 'q' : 'q'
      const duration = String(rawBeat.duration ?? rawDuration ?? 'q').replace(/dd|d|r/g, '')

      const pitches = notes
        .map((entry: any, i: number) => {
          const noteText = typeof entry === 'string'
            ? entry
            : typeof entry?.key === 'string'
              ? entry.key
              : ''
          const pitch = noteText.split(':')[0]
          if (!pitch.includes('/')) return null
          const accidental = accidentals[i] ?? null
          return { pitch, accidental: accidental ?? null }
        })
        .filter((p: any) => p !== null)

      return {
        pitches,
        duration: ['w', 'h', 'q', '8', '16', '32', '64'].includes(duration) ? duration : 'q',
        isRest: Boolean(rawBeat.isRest) || String(rawBeat.duration ?? rawDuration ?? '').includes('r') || pitches.length === 0,
        dotted: Boolean(rawBeat.dotted) || String(rawBeat.duration ?? rawDuration ?? '').includes('d'),
        doubleDotted: Boolean(rawBeat.doubleDotted) || String(rawBeat.duration ?? rawDuration ?? '').includes('dd'),
        tie: Boolean(rawBeat.tieToNext ?? rawBeat.tie),
        staff: rawBeat.staff,
        timeSlot: rawBeat.timeSlot,
      }
    })
    .filter((b) => b !== null)
}

/** Traduz family do banco para texto em pt-BR */
const FAMILY_LABELS: Record<string, string> = {
  triad: 'tríade', tetrad: 'tétrade', suspended: 'suspensa',
  tension: 'tensão', power: 'power chord', other: 'outro',
}

/** Mapeamento nota → semitom (0-11) */
const NOTE_TO_SEMI: Record<string, number> = {
  'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
  'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11,
}

/** Intervalos da escala maior (referência para bemóis/sustenidos) */
const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11]

/** Nomes dos graus baseado em semitons, com contexto para decidir b vs # */
function semitoneToDegreeName(semi: number, allSemitones: Set<number>): string {
  // Graus naturais (sem ambiguidade)
  const natural: Record<number, string> = {
    0: '1', 2: '2', 4: '3', 5: '4', 7: '5', 9: '6', 11: '7',
  }
  if (natural[semi]) return natural[semi]

  // Graus ambíguos: decidir b ou # baseado no contexto
  // Se o grau natural abaixo existe → é # desse grau
  // Se o grau natural acima existe → é b desse grau
  const ambiguous: Record<number, { sharp: string; flat: string; naturalBelow: number; naturalAbove: number }> = {
    1:  { sharp: '#1', flat: 'b2', naturalBelow: 0, naturalAbove: 2 },
    3:  { sharp: '#2', flat: 'b3', naturalBelow: 2, naturalAbove: 4 },
    6:  { sharp: '#4', flat: 'b5', naturalBelow: 5, naturalAbove: 7 },
    8:  { sharp: '#5', flat: 'b6', naturalBelow: 7, naturalAbove: 9 },
    10: { sharp: '#6', flat: 'b7', naturalBelow: 9, naturalAbove: 11 },
  }

  const info = ambiguous[semi]
  if (!info) return String(semi)

  // Se o grau natural abaixo NÃO existe → este semitom o substitui → # (ex: #4 no lídio, onde 4 natural sumiu)
  if (!allSemitones.has(info.naturalBelow)) return info.sharp
  // Se o grau natural abaixo existe → é alteração extra → b do grau acima (ex: b5 na blues onde 4 e 5 existem)
  return info.flat
}

/** Extrai os graus únicos das notas do fretboard, formatados com b/# */
function extractDegrees(positions: GuitarFretboardPositions, rootNote?: string): string {
  if (!positions?.notes?.length) return ''
  const root = rootNote ?? positions.notes.find(n => n.isRoot)?.note
  if (!root) return ''
  const rootSemi = NOTE_TO_SEMI[root]
  if (rootSemi === undefined) return ''

  const semitones = new Set<number>()
  positions.notes.forEach(n => {
    if (n.note) {
      const semi = NOTE_TO_SEMI[n.note]
      if (semi !== undefined) {
        semitones.add((semi - rootSemi + 12) % 12)
      }
    }
  })

  const sorted = Array.from(semitones).sort((a, b) => a - b)
  return sorted.map(s => semitoneToDegreeName(s, semitones)).join(', ')
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


type InstrumentFilter = 'guitar' | 'electric_guitar' | 'piano' | 'bass' | 'ukulele'


export function Biblioteca() {
  const [activeTab, setActiveTab] = useState<string>('guitar');
  // Derivar instrumento da aba ativa (abas de instrumento = accordion de acordes)
  const INSTRUMENT_TABS = ['guitar', 'electric_guitar', 'bass', 'ukulele', 'piano'] as const;
  const isInstrumentTab = INSTRUMENT_TABS.includes(activeTab as any);
  const instrument: InstrumentFilter = isInstrumentTab ? (activeTab as InstrumentFilter) : 'guitar';
  const { openModal } = useAppContext();

  // Estado da galeria de imagens IA
  const [imageGenOpen, setImageGenOpen] = useState(false);
  const [lastGeneratedImage, setLastGeneratedImage] = useState<ImageLibraryItem | null>(null);
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

  // CAGED só é relevante para instrumentos de braço (violão)
  const isStringInstrument = instrument === 'guitar';
  const isPiano = instrument === 'piano';
  const isElectricGuitar = instrument === 'electric_guitar';
  const isBass = instrument === 'bass';
  const isFretboardInstrument = isElectricGuitar || isBass;

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
  // Escalas removidas — serão substituídas por Exercícios no futuro
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

  // Estado do GuitarFretboardEditor (guitarra elétrica)
  const [guitarEditorOpen, setGuitarEditorOpen] = useState(false);
  const [editingGuitarChord, setEditingGuitarChord] = useState<any>(null);

  // Estado do GuitarFretboardEditor (contrabaixo)
  const [bassEditorOpen, setBassEditorOpen] = useState(false);
  const [editingBassChord, setEditingBassChord] = useState<any>(null);

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
  const handleSaveNotation = async () => {
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

  const handleSaveTab = async (lines: string[], label: string, data?: any) => {
    try {
      // Salvar dados enriquecidos (instrument, grid, durations) + legado (lines)
      const notationData = data
        ? { ...data, lines, label }
        : { lines, label, columns: lines.length > 0 ? undefined : 8 };
      if (editingTab) {
        await updateTablature(editingTab.id, {
          name: label || editingTab.name,
          notation_data: notationData,
        });
        toast.success('Tablatura atualizada!');
      } else {
        await createTablature({
          name: label || 'Nova Tablatura',
          notation_data: notationData,
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
            {chordsCount} acordes · {(notations ?? []).length} notações · {(tablatures ?? []).length} tablaturas
          </p>
        </div>
        <Button onClick={() => {
          if (activeTab === 'imagens') {
            setImageGenOpen(true);
          } else if (activeTab === 'notacao') {
            setEditingNotation(null);
            setNotationEditorOpen(true);
          } else if (activeTab === 'tablatura') {
            setEditingTab(null);
            setTabEditorOpen(true);
          } else if (activeTab === 'piano') {
            setEditingPianoChord(null);
            setPianoEditorOpen(true);
          } else if (activeTab === 'electric_guitar') {
            setEditingGuitarChord(null);
            setGuitarEditorOpen(true);
          } else if (activeTab === 'bass') {
            setEditingBassChord(null);
            setBassEditorOpen(true);
          } else {
            openModal('modal-acorde');
          }
        }}>
          <Plus size={16} /> {activeTab === 'imagens' ? 'Gerar Imagem' : activeTab === 'notacao' ? 'Nova Notação' : activeTab === 'tablatura' ? 'Nova Tablatura' : (activeTab === 'electric_guitar' || activeTab === 'bass') ? 'Nova Escala/Acorde' : 'Novo Acorde'}
        </Button>
      </div>

      <Tabs defaultValue="guitar" className="mb-6" onValueChange={setActiveTab}>
        <div className="flex items-center gap-3">
          <TabsList>
            <TabsTrigger value="guitar"><Guitar size={15} /> Violão</TabsTrigger>
            <TabsTrigger value="electric_guitar"><Guitar size={15} /> Guitarra</TabsTrigger>
            <TabsTrigger value="bass"><Guitar size={15} /> Baixo</TabsTrigger>
            <TabsTrigger value="ukulele"><Guitar size={15} /> Ukulele</TabsTrigger>
            <TabsTrigger value="piano"><PianoKeys size={15} /> Piano</TabsTrigger>
            <TabsTrigger value="notacao"><MusicNotesSimple size={15} /> Notação ({(notations ?? []).length})</TabsTrigger>
            <TabsTrigger value="tablatura"><ListBullets size={15} /> Tablatura ({(tablatures ?? []).length})</TabsTrigger>
            <TabsTrigger value="imagens"><ImageSquare size={15} /> Imagens IA</TabsTrigger>
          </TabsList>
          {isInstrumentTab && (
            <Button
              variant="outline"
              size="sm"
              onClick={handlePopulateChords}
              disabled={populating}
              className="gap-1.5 text-[12px] ml-auto"
            >
              {populating ? (
                <SpinnerGap size={14} className="animate-spin" />
              ) : (
                <Database size={14} />
              )}
              {populating ? 'Populando...' : 'Popular Biblioteca'}
            </Button>
          )}
        </div>

        {/* ====== CONTEÚDO DE ACORDES — renderizado para qualquer aba de instrumento ====== */}
        {INSTRUMENT_TABS.map(tabValue => (
        <TabsContent key={tabValue} value={tabValue}>
          <div>

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
              <div className={`grid gap-4 ${isFretboardInstrument ? 'grid-cols-2' : instrument === 'piano' ? 'grid-cols-4' : 'grid-cols-6 gap-3'}`}>
                {filteredChords.map(chord => {
                  const tags = (chord.tags ?? []) as string[]
                  const positions = (chord.positions ?? {}) as any

                  return (
                    <div
                      key={chord.id}
                      className={`card text-center p-3 hover:border-accent/30 transition-colors cursor-pointer ${isFretboardInstrument ? 'p-4' : ''}`}
                      onClick={() => {
                        if (instrument === 'piano') {
                          setEditingPianoChord(chord);
                          setPianoEditorOpen(true);
                        } else if (isBass) {
                          setEditingBassChord({
                            id: chord.id,
                            name: chord.name,
                            instrument: 'bass' as any,
                            positions: positions as GuitarFretboardPositions,
                            difficulty: chord.difficulty ?? 1,
                            tags: tags,
                            family: chord.family ?? undefined,
                            quality: chord.quality ?? undefined,
                            root_note: chord.root_note ?? 'C',
                          });
                          setBassEditorOpen(true);
                        } else if (isElectricGuitar) {
                          setEditingGuitarChord({
                            id: chord.id,
                            name: chord.name,
                            instrument: 'electric_guitar' as const,
                            positions: positions as GuitarFretboardPositions,
                            difficulty: chord.difficulty ?? 1,
                            tags: (chord.tags ?? []) as string[],
                            family: chord.family ?? undefined,
                            quality: chord.quality ?? undefined,
                            root_note: chord.root_note ?? 'C',
                          });
                          setGuitarEditorOpen(true);
                        } else {
                          openModal('modal-acorde', chord);
                        }
                      }}
                    >
                      {isFretboardInstrument && positions?.format === 'fretboard_horizontal' && (
                        <div className="font-serif font-bold text-[15px] text-text mb-1">{chord.name}</div>
                      )}
                      <div className={`flex justify-center mb-1 ${isFretboardInstrument ? 'w-full' : ''}`}>
                        {isFretboardInstrument && positions?.format === 'fretboard_horizontal' ? (
                          <GuitarFretboardDiagram
                            positions={positions as GuitarFretboardPositions}
                            name={chord.name}
                            height={180}
                            fretCount={positions.fretRange?.[1] ?? 15}
                            dotLabel="note"
                            dotSize={18}
                          />
                        ) : instrument === 'piano' ? (
                          <PianoChordCard positions={positions} name={chord.name} />
                        ) : (
                          <ChordDiagram
                            name={chord.name}
                            positions={positions}
                            position={getChordPosition(positions)}
                            size="full"
                            strings={instrument === 'ukulele' ? 4 : 6}
                          />
                        )}
                      </div>
                      <div className="text-[11px] text-text3">
                        {isFretboardInstrument && positions?.format === 'fretboard_horizontal' ? (
                          <>
                            {(() => {
                              const degrees = extractDegrees(positions as GuitarFretboardPositions, chord.root_note ?? undefined)
                              return degrees ? (
                                <span>Graus: {degrees} · nível {chord.difficulty ?? 1}</span>
                              ) : chordFooterText(chord)
                            })()}
                          </>
                        ) : chordFooterText(chord)}
                      </div>
                    </div>
                  )
                })}
                <div
                  className={`card text-center p-3 border-2 border-dashed border-border cursor-pointer hover:border-accent hover:text-accent transition-colors ${isFretboardInstrument ? 'p-4' : ''}`}
                  onClick={() => {
                    if (instrument === 'piano') {
                      setEditingPianoChord(null);
                      setPianoEditorOpen(true);
                    } else if (isElectricGuitar) {
                      setEditingGuitarChord(null);
                      setGuitarEditorOpen(true);
                    } else if (isBass) {
                      setEditingBassChord(null);
                      setBassEditorOpen(true);
                    } else {
                      openModal('modal-acorde');
                    }
                  }}
                >
                  <div className={`${isFretboardInstrument ? 'h-[140px]' : 'h-[180px]'} flex items-center justify-center`}>
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
        ))}

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
                        {(() => {
                          const beats = Array.isArray(nota.notation_data?.beats) ? nota.notation_data.beats : []
                          if (beats.length === 0) {
                            return (
                              <div className="h-[80px] flex items-center justify-center text-text3 text-[11px]">
                                <MusicNotes size={16} className="mr-1" /> Sem preview
                              </div>
                            )
                          }

                          try {
                            const normalizedBeats = normalizeNotationBeatsForPreview(beats)
                            const tex = beatsToAlphaTex(normalizedBeats as any, {
                              clef: nota.notation_data?.clef || nota.clef || 'treble',
                              keySignature: nota.notation_data?.keySignature || nota.key_signature || 'C',
                              timeSignature: nota.notation_data?.timeSignature || nota.time_signature || null,
                              grandStaff: Boolean(nota.notation_data?.grandStaff),
                              bpm: nota.notation_data?.bpm || undefined,
                            })

                            return tex ? (
                              <AlphaTexInlineRenderer
                                tex={tex}
                                minHeight={100}
                                scale={0.85}
                                staveProfile="score"
                              />
                            ) : (
                              <div className="h-[80px] flex items-center justify-center text-text3 text-[11px]">
                                <MusicNotes size={16} className="mr-1" /> Sem preview
                              </div>
                            )
                          } catch (error) {
                            console.error('[Biblioteca] Falha ao renderizar preview de notação:', error)
                            return (
                              <div className="h-[80px] flex items-center justify-center text-text3 text-[11px]">
                                <MusicNotes size={16} className="mr-1" /> Preview indisponível
                              </div>
                            )
                          }
                        })()}
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
                  const nd = tab.notation_data as (TablatureData & { lines?: string[] }) | null
                  const hasEnrichedData = !!(nd?.grid && nd?.columns && nd?.durations)
                  const instrument = (nd?.instrument ?? 'guitar') as TabInstrument
                  const instConfig = TAB_INSTRUMENTS[instrument]
                  const label = nd?.label

                  // Contar notas
                  let noteCount = 0
                  if (hasEnrichedData && nd?.grid) {
                    for (const row of nd.grid) {
                      for (const cell of row) {
                        if (cell !== null) noteCount++
                      }
                    }
                  }

                  // Gerar alphaTex para preview
                  const alphaTex = hasEnrichedData && nd
                    ? gridToAlphaTex(
                        nd.grid,
                        nd.columns,
                        nd.durations,
                        instConfig,
                        label,
                        nd.timeSignature ?? 'free',
                        nd.ties ? new Set(nd.ties) : new Set(),
                        nd.dots ?? [],
                        nd.pickings ?? [],
                        nd.tuplets ?? [],
                        nd.chordNames ?? [],
                      )
                    : ''

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

                      {/* Preview da tablatura — AlphaTab */}
                      {noteCount > 0 && alphaTex ? (
                        <div className="rounded-lg border border-border/50 overflow-hidden">
                          <AlphaTabViewer
                            tex={alphaTex}
                            layout="page"
                            scale={0.7}
                            minHeight={80}
                            showTimeSignature={nd?.timeSignature !== undefined && nd.timeSignature !== 'free'}
                          />
                        </div>
                      ) : (
                        <div className="h-[60px] flex items-center justify-center text-text3 text-[11px]">
                          <Guitar size={16} className="mr-1" /> Tablatura vazia
                        </div>
                      )}

                      <div className="text-[11px] text-text3 mt-2">
                        <Guitar size={12} className="inline mr-1" weight="fill" />
                        {noteCount} nota{noteCount !== 1 ? 's' : ''} · {instConfig.stringCount} corda{instConfig.stringCount !== 1 ? 's' : ''}
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
          <ImageGallery
            onOpenGenerator={() => setImageGenOpen(true)}
            newImage={lastGeneratedImage}
          />
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

      {/* GuitarFretboardEditor — modal de guitarra */}
      <GuitarFretboardEditor
        open={guitarEditorOpen}
        onOpenChange={(v) => { setGuitarEditorOpen(v); if (!v) setEditingGuitarChord(null); }}
        chord={editingGuitarChord}
        onSave={() => refetchChords()}
      />

      {/* GuitarFretboardEditor — modal de contrabaixo */}
      <GuitarFretboardEditor
        open={bassEditorOpen}
        onOpenChange={(v) => { setBassEditorOpen(v); if (!v) setEditingBassChord(null); }}
        chord={editingBassChord}
        onSave={() => refetchChords()}
        instrument="bass"
      />

      {/* NotationEditorV2 — modal de notação */}
      <NotationEditorV2
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
        initialData={editingTab?.notation_data?.grid ? editingTab.notation_data as any : null}
        initialLabel={editingTab?.notation_data?.label ?? editingTab?.name ?? ''}
        onSave={handleSaveTab}
      />

      {/* ImageGeneratorModal — geração de imagens IA */}
      <ImageGeneratorModal
        open={imageGenOpen}
        onOpenChange={setImageGenOpen}
        onImageGenerated={(img) => setLastGeneratedImage(img)}
      />
    </div>
  );
}
