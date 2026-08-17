import { useCallback, useEffect, useMemo, useState } from 'react'
import { CircleNotch, MusicNotes, Sparkle, UploadSimple, Warning } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { chordsToCifraLine, recipeFieldsFromRecognizedKey, type PracticeAudioKind, type RecognizedChord } from '@/lib/practiceAudio'
import {
  defaultRecipe,
  requestedCifraPreview,
  type PracticeAudioDuration,
  type PracticeAudioRecipe,
} from '@/lib/practiceAudioRecipe'
import {
  generateAndVerifyPracticeAudio,
  savePracticeAudioToLibrary,
  transcribePracticeAudio,
  updateRecognizedChords,
  uploadPracticeAudio,
  type PracticeAudioTake,
} from '@/services/practiceAudioService'

const KINDS: { id: PracticeAudioKind; label: string }[] = [
  { id: 'vocalize', label: 'Vocalize' },
  { id: 'backing', label: 'Base' },
  { id: 'exercise', label: 'Exercício' },
]

const DURATIONS: { value: PracticeAudioDuration; label: string }[] = [
  { value: 30, label: '30s' },
  { value: 60, label: '1 min' },
  { value: 120, label: '2 min' },
  { value: 180, label: '3 min' },
]

const KEYS = ['C', 'C#', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
const STYLES = ['classroom', 'pop', 'mpb', 'rock', 'bossa', 'folk']
const INSTRUMENTS = ['piano', 'light band', 'acoustic guitar', 'bass', 'keys']
const EXCLUDES = [
  { id: 'drums', label: 'Sem bateria' },
  { id: 'lyric vocals', label: 'Sem voz com letra' },
]

type PracticeAudioModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  schoolId?: string | null
  initialKind?: PracticeAudioKind
  lockKind?: boolean
  repertoireId?: string | null
  preset?: Partial<PracticeAudioRecipe>
  onSaved?: () => void
}

function toggleList(list: string[], value: string) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value]
}

export function PracticeAudioModal({
  open,
  onOpenChange,
  schoolId,
  initialKind = 'vocalize',
  lockKind = false,
  repertoireId,
  preset,
  onSaved,
}: PracticeAudioModalProps) {
  const [tab, setTab] = useState('generate')
  const [recipe, setRecipe] = useState<PracticeAudioRecipe>(() => ({
    ...defaultRecipe(initialKind),
    ...preset,
  }))
  const [chordDraft, setChordDraft] = useState('')
  const [generating, setGenerating] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [take, setTake] = useState<PracticeAudioTake | null>(null)
  const [recognizedLine, setRecognizedLine] = useState('')
  const [linkRepertoire, setLinkRepertoire] = useState(Boolean(repertoireId))
  const [uploadFile, setUploadFile] = useState<File | null>(null)

  useEffect(() => {
    if (!open) return
    setTab('generate')
    setTake(null)
    setRecognizedLine('')
    setGenerating(false)
    setTranscribing(false)
    setSaving(false)
    setUploadFile(null)
    setLinkRepertoire(Boolean(repertoireId))
    setRecipe({
      ...defaultRecipe(initialKind),
      ...preset,
      kind: initialKind,
    })
  }, [open, initialKind, repertoireId, preset?.title, preset?.key, preset?.bpm])

  const requestedLine = useMemo(() => requestedCifraPreview(recipe), [recipe])

  const patch = useCallback((partial: Partial<PracticeAudioRecipe>) => {
    setRecipe((current) => ({ ...current, ...partial }))
  }, [])

  const handleKind = (kind: PracticeAudioKind) => {
    if (lockKind) return
    setRecipe((current) => ({
      ...defaultRecipe(kind),
      title: current.title,
      key: current.key,
      bpm: current.bpm,
      durationSeconds: current.durationSeconds,
    }))
  }

  const addChord = () => {
    const name = chordDraft.trim()
    if (!name) return
    patch({ requestedChords: [...recipe.requestedChords, name] })
    setChordDraft('')
  }

  const runTranscribe = async (id: string, current: PracticeAudioTake) => {
    setTranscribing(true)
    try {
      const next = await transcribePracticeAudio(id)
      const merged = {
        ...current,
        ...next,
        audioUrl: next.audioUrl || current.audioUrl,
        audioPath: next.audioPath || current.audioPath,
        recipe: next.recipe || current.recipe,
        source: current.source,
      }
      if (current.source === 'upload' && next.status !== 'transcribe_failed') {
        const fields = recipeFieldsFromRecognizedKey(merged.recognizedKey)
        const nextRecipe = {
          ...recipe,
          ...(fields ?? {}),
          bpm: merged.recognizedBpm ?? recipe.bpm,
        }
        setRecipe(nextRecipe)
        setTake({ ...merged, recipe: nextRecipe })
        await updateRecognizedChords(merged.id, merged.recognizedChords ?? [], {
          bpm: merged.recognizedBpm,
          key: merged.recognizedKey,
          recipe: nextRecipe,
        })
      } else {
        setTake(merged)
      }
      setRecognizedLine(chordsToCifraLine(merged.recognizedChords ?? []))
      if (next.status === 'transcribe_failed') {
        toast.error('Áudio ok, cifra falhou. Pode reconhecer de novo.')
      }
    } catch (error) {
      setTake({ ...current, status: 'transcribe_failed' })
      toast.error(error instanceof Error ? error.message : 'Falha ao reconhecer a cifra')
    } finally {
      setTranscribing(false)
    }
  }

  const handleGenerate = async () => {
    if (!recipe.title.trim()) {
      toast.error('Informe um título')
      return
    }
    setGenerating(true)
    setTranscribing(true)
    try {
      const next = await generateAndVerifyPracticeAudio(recipe, repertoireId)
      setTake(next)
      setRecognizedLine(chordsToCifraLine(next.recognizedChords ?? []))
      if (next.status === 'transcribe_failed') {
        toast.error('Áudio ok, cifra falhou. Pode reconhecer de novo.')
      } else if (next.keyMatched === false) {
        toast.error(`Pedido ${recipe.key}, reconhecido ${next.recognizedKey || 'outro tom'}. Gere de novo se precisar.`)
      } else {
        toast.success('Áudio pronto no tom pedido.')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao gerar o áudio')
    } finally {
      setGenerating(false)
      setTranscribing(false)
    }
  }

  const handleUpload = async () => {
    if (!uploadFile) {
      toast.error('Escolha um MP3 ou WAV')
      return
    }
    const title = recipe.title.trim() || uploadFile.name.replace(/\.[^.]+$/, '')
    if (!title) {
      toast.error('Informe um título')
      return
    }
    setGenerating(true)
    setTranscribing(true)
    try {
      const uploaded = await uploadPracticeAudio(uploadFile, { ...recipe, title }, repertoireId)
      const next = await transcribePracticeAudio(uploaded.id)
      const merged = {
        ...uploaded,
        ...next,
        audioUrl: next.audioUrl || uploaded.audioUrl,
        audioPath: next.audioPath || uploaded.audioPath,
        recipe: next.recipe || uploaded.recipe,
        source: uploaded.source,
      }
      const fields = recipeFieldsFromRecognizedKey(merged.recognizedKey)
      const nextRecipe = {
        ...recipe,
        title,
        ...(fields ?? {}),
        bpm: merged.recognizedBpm ?? recipe.bpm,
      }
      setRecipe(nextRecipe)
      setTake({ ...merged, recipe: nextRecipe })
      setRecognizedLine(chordsToCifraLine(merged.recognizedChords ?? []))
      setTab('generate')
      if (next.status !== 'transcribe_failed') {
        await updateRecognizedChords(merged.id, merged.recognizedChords ?? [], {
          bpm: merged.recognizedBpm,
          key: merged.recognizedKey,
          recipe: nextRecipe,
        })
      }
      if (next.status === 'transcribe_failed') {
        toast.error('Áudio ok, cifra falhou. Pode reconhecer de novo.')
      } else {
        toast.success('Áudio enviado. Cifra pronta.')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao enviar o áudio')
    } finally {
      setGenerating(false)
      setTranscribing(false)
    }
  }

  const handleSaveRecognized = async () => {
    if (!take) return
    const names = recognizedLine.split('|').map((item) => item.trim().replace(/^\d+:\d+\s+/, '')).filter(Boolean)
    const chords: RecognizedChord[] = names.map((chord, index) => ({
      start: take.recognizedChords?.[index]?.start ?? index,
      end: take.recognizedChords?.[index]?.end ?? index + 1,
      chord,
    }))
    try {
      await updateRecognizedChords(take.id, chords, {
        bpm: take.recognizedBpm,
        key: take.recognizedKey,
      })
      setTake({ ...take, recognizedChords: chords })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não gravou a cifra')
    }
  }

  const handleSaveLibrary = async () => {
    if (!take || !schoolId) {
      toast.error('Não foi possível identificar a escola')
      return
    }
    setSaving(true)
    try {
      const names = recognizedLine.split('|').map((item) => item.trim().replace(/^\d+:\d+\s+/, '')).filter(Boolean)
      const chords: RecognizedChord[] = names.length
        ? names.map((chord, index) => ({
            start: take.recognizedChords?.[index]?.start ?? index,
            end: take.recognizedChords?.[index]?.end ?? index + 1,
            chord,
          }))
        : (take.recognizedChords ?? [])
      if (names.length) {
        await updateRecognizedChords(take.id, chords, {
          bpm: take.recognizedBpm,
          key: take.recognizedKey,
        })
      }
      await savePracticeAudioToLibrary({
        take: {
          ...take,
          recognizedChords: chords,
        },
        schoolId,
        linkRepertoire: linkRepertoire && Boolean(repertoireId),
        repertoireId,
      })
      toast.success(linkRepertoire && repertoireId ? 'Salvo na biblioteca e na ficha' : 'Salvo na biblioteca')
      onSaved?.()
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não salvou o exercício')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !generating && onOpenChange(next)}>
      <DialogContent className="sm:max-w-[720px] bg-surface border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-[22px]">
            Gerar <span className="text-accent">áudio</span> didático
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="generate">Gerar</TabsTrigger>
            <TabsTrigger value="upload">Enviar</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4 pt-4">
            <div className="flex flex-wrap gap-2">
              {KINDS.map((kind) => (
                <button
                  key={kind.id}
                  type="button"
                  disabled={lockKind && recipe.kind !== kind.id}
                  onClick={() => handleKind(kind.id)}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors ${
                    recipe.kind === kind.id
                      ? 'bg-accent text-accent-foreground border-accent'
                      : 'bg-transparent text-text3 border-border hover:border-text3/40'
                  }`}
                >
                  {kind.label}
                </button>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-[1.5px] text-text3">Título</Label>
              <Input
                value={recipe.title}
                onChange={(e) => patch({ title: e.target.value })}
                placeholder="Nome do exercício"
              />
            </div>
            <label className="flex flex-col items-center justify-center gap-2 rounded-[14px] border border-dashed border-border p-8 text-center cursor-pointer hover:border-accent/40">
              <UploadSimple size={28} className="opacity-60" />
              <p className="text-[14px] text-text2">
                {uploadFile ? uploadFile.name : 'Solte um MP3 ou WAV, ou clique para escolher'}
              </p>
              <p className="text-[12px] text-text3">Máximo 20MB. Music.AI lê a cifra depois do envio.</p>
              <input
                type="file"
                accept=".mp3,.wav,audio/mpeg,audio/wav"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null
                  setUploadFile(file)
                  if (file && !recipe.title.trim()) {
                    patch({ title: file.name.replace(/\.[^.]+$/, '') })
                  }
                }}
              />
            </label>
          </TabsContent>

          <TabsContent value="generate" className="space-y-5 pt-4">
            <div className="flex flex-wrap gap-2">
              {KINDS.map((kind) => (
                <button
                  key={kind.id}
                  type="button"
                  disabled={lockKind && recipe.kind !== kind.id}
                  onClick={() => handleKind(kind.id)}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors ${
                    recipe.kind === kind.id
                      ? 'bg-accent text-accent-foreground border-accent'
                      : 'bg-transparent text-text3 border-border hover:border-text3/40'
                  }`}
                >
                  {kind.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-[10px] uppercase tracking-[1.5px] text-text3">Título</Label>
                <Input value={recipe.title} onChange={(e) => patch({ title: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-[1.5px] text-text3">Tom</Label>
                <select
                  className="h-9 w-full rounded-md border border-border bg-background px-3 text-[13px]"
                  value={recipe.key || 'C'}
                  onChange={(e) => patch({ key: e.target.value })}
                >
                  {KEYS.map((key) => (
                    <option key={key} value={key}>{key}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-[1.5px] text-text3">BPM</Label>
                <Input
                  type="number"
                  min={40}
                  max={220}
                  placeholder="Modelo decide"
                  value={recipe.bpm ?? ''}
                  onChange={(e) => patch({ bpm: e.target.value ? Number(e.target.value) : null })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-[1.5px] text-text3">Estilo</Label>
                <select
                  className="h-9 w-full rounded-md border border-border bg-background px-3 text-[13px]"
                  value={recipe.style || 'classroom'}
                  onChange={(e) => patch({ style: e.target.value })}
                >
                  {STYLES.map((style) => (
                    <option key={style} value={style}>{style}</option>
                  ))}
                </select>
              </div>
              {(recipe.kind === 'vocalize' || recipe.kind === 'exercise') && (
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-[1.5px] text-text3">Escala</Label>
                  <Input
                    value={recipe.scale || ''}
                    placeholder="major, minor, dorian…"
                    onChange={(e) => patch({ scale: e.target.value })}
                  />
                </div>
              )}
            </div>

            <div>
              <Label className="text-[10px] uppercase tracking-[1.5px] text-text3 mb-2 block">Duração</Label>
              <div className="flex flex-wrap gap-2">
                {DURATIONS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => patch({ durationSeconds: item.value })}
                    className={`px-3 py-1.5 rounded-full text-[12px] border ${
                      recipe.durationSeconds === item.value
                        ? 'bg-accent text-accent-foreground border-accent'
                        : 'border-border text-text3'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-[10px] uppercase tracking-[1.5px] text-text3 mb-2 block">Instrumentos</Label>
              <div className="flex flex-wrap gap-2">
                {INSTRUMENTS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => patch({ instruments: toggleList(recipe.instruments, item) })}
                    className={`px-2.5 py-1 rounded-full text-[11px] border ${
                      recipe.instruments.includes(item)
                        ? 'bg-accent/15 text-accent border-accent/30'
                        : 'border-border text-text3'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-[10px] uppercase tracking-[1.5px] text-text3 mb-2 block">Tirar da mix</Label>
              <div className="flex flex-wrap gap-2">
                {EXCLUDES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => patch({ exclude: toggleList(recipe.exclude, item.id) })}
                    className={`px-2.5 py-1 rounded-full text-[11px] border ${
                      recipe.exclude.includes(item.id)
                        ? 'bg-accent/15 text-accent border-accent/30'
                        : 'border-border text-text3'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {recipe.kind !== 'vocalize' && (
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-[1.5px] text-text3">Acordes pedidos</Label>
                <div className="flex flex-wrap gap-2">
                  {recipe.requestedChords.map((chord) => (
                    <button
                      key={chord}
                      type="button"
                      onClick={() => patch({ requestedChords: recipe.requestedChords.filter((item) => item !== chord) })}
                      className="px-2.5 py-1 rounded-full text-[11px] bg-accent/15 text-accent border border-accent/30"
                    >
                      {chord} ×
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={chordDraft}
                    placeholder="C, G, D…"
                    onChange={(e) => setChordDraft(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addChord())}
                  />
                  <Button type="button" variant="outline" onClick={addChord}>Adicionar</Button>
                </div>
              </div>
            )}

            <label className="flex items-start gap-2 text-[13px] text-text2">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={recipe.wordlessGuide}
                onChange={(e) => patch({ wordlessGuide: e.target.checked })}
              />
              <span>
                Voz guia sem letra (“ah”)
                <span className="block text-[11px] text-text3 mt-0.5">
                  {recipe.wordlessGuide
                    ? 'Suno V5.5 com voz guia no “ah”. Tom no estilo.'
                    : 'Suno V5.5 instrumental. Melhor no tom. Sem voz guia.'}
                </span>
              </span>
            </label>

            {recipe.kind === 'exercise' && (
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-[1.5px] text-text3">Nota livre</Label>
                <Textarea
                  value={recipe.note || ''}
                  placeholder="Ex: só braço 1"
                  onChange={(e) => patch({ note: e.target.value })}
                />
              </div>
            )}

            {take?.audioUrl && (
              <div className="space-y-3 rounded-[14px] border border-border p-4">
                <audio controls className="w-full" src={take.audioUrl} preload="metadata" />
                <div className="text-[11px] text-text3">
                  Motor: {take.source === 'upload' ? 'Arquivo enviado' : take.source === 'lyria' ? 'Lyria (fallback)' : 'Suno V5.5'}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12px]">
                  <div>
                    <div className="uppercase tracking-[1.5px] text-text3 text-[10px] mb-1">Pedido</div>
                    <div className="text-text2">{requestedLine}</div>
                    <div className="text-text3 mt-1">
                      {recipe.key || '—'} · {recipe.bpm ? `${recipe.bpm} BPM` : 'BPM do modelo'} · {recipe.durationSeconds}s
                    </div>
                  </div>
                  <div>
                    <div className="uppercase tracking-[1.5px] text-text3 text-[10px] mb-1">Reconhecido</div>
                    {transcribing ? (
                      <p className="text-text3 flex items-center gap-1.5">
                        <CircleNotch size={14} className="animate-spin" /> Lendo cifra…
                      </p>
                    ) : take.status === 'transcribe_failed' ? (
                      <p className="text-amber-400 flex items-center gap-1.5">
                        <Warning size={14} /> Cifra falhou. O áudio ficou.
                      </p>
                    ) : (
                      <Textarea
                        value={recognizedLine}
                        onChange={(e) => setRecognizedLine(e.target.value)}
                        onBlur={handleSaveRecognized}
                        rows={2}
                        placeholder="C | F | G | C"
                        className="text-[13px] font-medium"
                      />
                    )}
                    {take.recognizedBpm || take.recognizedKey ? (
                      <div className={`mt-1 ${take.keyMatched === false ? 'text-amber-400' : 'text-text3'}`}>
                        {take.recognizedKey || '—'} · {take.recognizedBpm ? `${take.recognizedBpm} BPM` : ''}
                        {take.keyMatched === false ? ' · tom diferente do pedido' : ''}
                      </div>
                    ) : null}
                  </div>
                </div>
                {repertoireId && (
                  <label className="flex items-center gap-2 text-[13px] text-text2">
                    <input
                      type="checkbox"
                      checked={linkRepertoire}
                      onChange={(e) => setLinkRepertoire(e.target.checked)}
                    />
                    Vincular esta base à música
                  </label>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={generating}>
            Fechar
          </Button>
          {take?.status === 'transcribe_failed' && (
            <Button variant="outline" onClick={() => runTranscribe(take.id, take)} disabled={transcribing}>
              {transcribing ? <CircleNotch size={16} className="animate-spin" /> : <MusicNotes size={16} />}
              Reconhecer de novo
            </Button>
          )}
          {take?.audioUrl && (
            <Button variant="outline" onClick={handleSaveLibrary} disabled={saving || !schoolId}>
              {saving ? <CircleNotch size={16} className="animate-spin" /> : null}
              Salvar na biblioteca
            </Button>
          )}
          {tab === 'generate' && (
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? <CircleNotch size={16} className="animate-spin" /> : <Sparkle size={16} weight="fill" />}
              {generating ? 'Gerando…' : 'Gerar'}
            </Button>
          )}
          {tab === 'upload' && (
            <Button onClick={handleUpload} disabled={generating}>
              {generating ? <CircleNotch size={16} className="animate-spin" /> : <UploadSimple size={16} />}
              {generating ? 'Enviando…' : 'Enviar'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
