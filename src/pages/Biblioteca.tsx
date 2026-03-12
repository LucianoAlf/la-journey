import { Plus, SpinnerGap, Warning, Guitar, PianoKeys } from "@phosphor-icons/react";
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
import { KeyboardEditor, type PianoChordData } from "@/components/music/KeyboardEditor";
import { createChord, updateChord, deleteChord } from "@/services/libraryService";


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
  const { data: chords, loading: chordsLoading, refetch: refetchChords } = useChords(instrument as any);
  const { data: scales, loading: scalesLoading } = useScales();

  // Refetch automático quando um novo acorde é salvo via modal
  useEffect(() => {
    const handler = () => refetchChords();
    window.addEventListener('chord-library-updated', handler);
    return () => window.removeEventListener('chord-library-updated', handler);
  }, [refetchChords]);
  const [chordSearch, setChordSearch] = useState('');
  const [diffFilter, setDiffFilter] = useState('todos');

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

  const filteredChords = useMemo(() => {
    let list = chords ?? []
    if (chordSearch) {
      const q = chordSearch.toLowerCase()
      list = list.filter(c => c.name.toLowerCase().includes(q))
    }
    if (diffFilter !== 'todos') {
      list = list.filter(c => c.difficulty === Number(diffFilter))
    }
    return list
  }, [chords, chordSearch, diffFilter])

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-[26px] leading-[1.2] text-text">
            Biblioteca <em className="not-italic text-accent">Musical</em>
          </h1>
          <p className="text-text2 text-[13.5px] mt-1.5">
            {(chords ?? []).length} acordes · {(scales ?? []).length} escalas · {instrument === 'piano' ? 'Piano' : 'SVGuitar'} · VexFlow
          </p>
        </div>
        <Button onClick={() => {
          if (activeTab === 'imagens') {
            openModal('modal-imagem');
          } else if (instrument === 'piano') {
            setEditingPianoChord(null);
            setPianoEditorOpen(true);
          } else {
            openModal('modal-acorde');
          }
        }}>
          <Plus size={16} /> {activeTab === 'imagens' ? 'Gerar Imagem' : 'Novo Acorde'}
        </Button>
      </div>

      <Tabs defaultValue="acordes" className="mb-6" onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="acordes">Acordes ({(chords ?? []).length})</TabsTrigger>
          <TabsTrigger value="escalas">Escalas ({(scales ?? []).length})</TabsTrigger>
          <TabsTrigger value="notacao">Notação (VexFlow)</TabsTrigger>
          <TabsTrigger value="imagens">Imagens IA</TabsTrigger>
        </TabsList>

        <TabsContent value="acordes">
          <div>
            {/* Filtro de instrumento */}
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
          <div className="grid grid-cols-2 gap-5">
            <div className="card">
              <div className="font-serif mb-3 text-[17px]">Figuras Rítmicas</div>
              <p className="text-[12px] text-text3 mb-3">
                Semibreve (4 tempos), Mínima (2), Semínima (1), Colcheia (½), Semicolcheia (¼)
              </p>
              <RhythmNotation />
            </div>
            <div className="card">
              <div className="font-serif mb-3 text-[17px]">Escala de Dó Maior na Pauta</div>
              <p className="text-[12px] text-text3 mb-3">
                Exemplo de notação na pauta com VexFlow — 8 notas ascendentes
              </p>
              <StaffNotation
                notes={['c/4:q', 'd/4:q', 'e/4:q', 'f/4:q', 'g/4:q', 'a/4:q', 'b/4:q', 'c/5:q']}
                clef="treble"
                keySignature="C"
                width={480}
                height={130}
              />
            </div>
            <div className="card">
              <div className="font-serif mb-3 text-[17px]">Acorde na Pauta</div>
              <p className="text-[12px] text-text3 mb-3">
                Notas empilhadas formando um acorde de Dó Maior (C E G)
              </p>
              <StaffNotation
                notes={['c/4:w']}
                clef="treble"
                width={250}
                height={130}
              />
            </div>
            <div className="card">
              <div className="font-serif mb-3 text-[17px]">Tablatura — Exercício 1234</div>
              <p className="text-[12px] text-text3 mb-3">
                Exercício psicomotor para mão esquerda — 4 trastes sequenciais
              </p>
              <Tablature
                title="Exercício 1234 — 1ª corda"
                tab={`e|--1--2--3--4--|--4--3--2--1--|
B|-------------|--------------|
G|-------------|--------------|
D|-------------|--------------|
A|-------------|--------------|
E|-------------|--------------|`}
              />
            </div>
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
    </div>
  );
}
