import { Plus, SpinnerGap, Warning, Guitar, PianoKeys, MusicNotes, Trash, Database, Lightning } from "@phosphor-icons/react";
import { useState, useMemo, useEffect } from "react";
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

/** Card de acorde de piano com teclado SVG real */
function PianoChordCard({ positions, name }: { positions: any; name: string }) {
  const keys = (positions?.keys ?? []) as string[]
  const fingeringRh = (positions?.fingering_rh ?? []) as number[]
  const quality = positions?.quality as string | undefined

  if (keys.length === 0) {
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
        root={positions?.root}
        fingeringRH={fingeringRh}
        showLabels={true}
        hand="rh"
        highlightColor="#FF2D78"
        range={['C4', 'C6']}
        scale={1}
        className="w-full overflow-hidden"
      />
    </div>
  )
}

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

  const diffFilterNum = diffFilter !== 'todos' ? Number(diffFilter) : undefined;
  const { data: chords, loading: chordsLoading, refetch: refetchChords, count: chordsCount, page: chordsPage, totalPages: chordsTotalPages, setPage: setChordsPage } = useChords(instrument as any, { search: debouncedSearch || undefined, difficulty: diffFilterNum });
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

  const handleSavePianoChord = async (data: PianoChordData) => {
    if (editingPianoChord) {
      await updateChord(editingPianoChord.id, {
        name: data.name,
        instrument: 'piano' as any,
        positions: data.positions as any,
        difficulty: data.difficulty,
        tags: data.tags as any,
      });
      toast.success('Acorde de piano atualizado!');
    } else {
      await createChord({
        name: data.name,
        instrument: 'piano' as any,
        positions: data.positions as any,
        difficulty: data.difficulty,
        tags: data.tags as any,
      });
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

            <div className="card mb-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Buscar acorde</Label>
                  <Input placeholder="Ex: Am7, F#m, Bb" value={chordSearch} onChange={e => setChordSearch(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Tipo (tags)</Label>
                  <Select defaultValue="todos"><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="aberto">Aberto</SelectItem>
                      <SelectItem value="pestana">Pestana</SelectItem>
                      <SelectItem value="jazz">Jazz</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Dificuldade</Label>
                  <Select value={diffFilter} onValueChange={setDiffFilter}><SelectTrigger><SelectValue /></SelectTrigger>
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

            {chordsLoading ? (
              <div className="flex items-center justify-center h-40 gap-2 text-text2">
                <SpinnerGap size={20} className="animate-spin" /> Carregando acordes...
              </div>
            ) : filteredChords.length === 0 ? (
              <div className="card p-8 text-center text-text3">
                <Warning size={20} className="inline mr-1" /> Nenhum acorde encontrado.
              </div>
            ) : (
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
                            size="full"
                          />
                        )}
                      </div>
                      <div className="text-[11px] text-text3">
                        {tags.join(' · ')} · Nível {chord.difficulty}
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
                  onClick={() => setChordsPage(chordsPage - 1)}
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
                  onClick={() => setChordsPage(chordsPage + 1)}
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
