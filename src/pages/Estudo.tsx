import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pause, Play, Printer, SpinnerGap, Trash } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { StudyCifraOverlay } from '@/components/estudo/StudyCifraOverlay'
import { StudySheetFrame } from '@/components/estudo/StudySheetFrame'
import { StudyTitleField } from '@/components/estudo/StudyTitleField'
import { Button } from '@/components/ui/button'
import { StudyPlayalongSurface, type StudyPlayalongSurfaceHandle } from '@/components/music/StudyPlayalongSurface'
import { useEstudoMaterials } from '@/hooks/useEstudoMaterials'
import { useMaterialWithBlocks } from '@/hooks/useMaterials'
import { useSchool } from '@/hooks/useSchool'
import {
  ESTUDO_DISPLAY_MODES,
  estudoToJson,
  mergeEstudoPageConfig,
  parseEstudo,
  type EstudoDisplayMode,
} from '@/lib/estudoConfig'
import { nextCifraBeatIndex } from '@/lib/estudoCifra'
import { hydrateNotationFromBlock, type InlineBeat } from '@/lib/notationInlineHydrate'
import { normalizeCifraSymbol } from '@/lib/notationCifra'
import { studyTexFromBlock } from '@/lib/studyNotationTex'
import { deleteEstudoMaterial, fetchCurrentUserName, type EstudoListItem } from '@/services/estudoCatalogService'
import { updateMaterial, updateMaterialBlockRpc, type GeneratedMaterial, type MaterialWithBlocks } from '@/services/materialService'
import { uploadPlayalongFile } from '@/services/playalongUpload'
import { createStudyMaterialFromMp3 } from '@/services/studyFromMp3Service'

const GRAVURA_LABEL: Record<EstudoDisplayMode, string> = {
  'slash-beat': 'Pulso',
  'slash-rhythm': 'Ritmo',
  chords: 'Cifra',
  score: 'Score',
}

function EstudoList() {
  const navigate = useNavigate()
  const { data: school } = useSchool()
  const { data: materials, loading, error } = useEstudoMaterials(school?.id)
  const [rows, setRows] = useState<EstudoListItem[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    if (materials) setRows(materials)
  }, [materials])

  const onPickMp3 = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!school?.id) {
      toast.error('Escola não encontrada')
      return
    }
    setImporting(true)
    try {
      const id = await createStudyMaterialFromMp3({ schoolId: school.id, file })
      navigate(`/estudo/${id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao ler o MP3')
    } finally {
      setImporting(false)
    }
  }

  const rename = async (id: string, title: string) => {
    const previous = rows
    setRows((current) => current.map((row) => (row.id === id ? { ...row, title } : row)))
    try {
      await updateMaterial(id, { title })
    } catch (err) {
      setRows(previous)
      toast.error(err instanceof Error ? err.message : 'Não deu para renomear')
    }
  }

  const remove = async (id: string) => {
    if (!window.confirm('Apagar esta faixa?')) return
    const previous = rows
    setRows((current) => current.filter((row) => row.id !== id))
    try {
      await deleteEstudoMaterial(id)
    } catch (err) {
      setRows(previous)
      toast.error(err instanceof Error ? err.message : 'Não deu para apagar')
    }
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-[26px] leading-[1.2] text-text">
            Sala de <em className="not-italic text-accent">Estudo</em>
          </h1>
          <p className="mt-1.5 text-[13.5px] text-text2">
            Suba um MP3 para nascer a pauta
          </p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/mpeg,audio/ogg,.mp3,.ogg"
            className="hidden"
            onChange={onPickMp3}
          />
          <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={importing}>
            {importing ? <SpinnerGap size={16} className="animate-spin" /> : null}
            Do MP3
          </Button>
        </div>
      </div>

      {importing && (
        <div className="card mb-4 flex items-center gap-2 py-4 text-[13px] text-text2">
          <SpinnerGap size={18} className="animate-spin text-accent" />
          Lendo cifra e compassos…
        </div>
      )}

      <div className="card">
        {loading && (
          <div className="flex items-center gap-2 justify-center py-12 text-text2">
            <SpinnerGap size={20} className="animate-spin" /> Carregando faixas...
          </div>
        )}
        {error && (
          <div className="rounded-[var(--radius-sm)] bg-vermelho-soft p-4 text-sm text-vermelho">
            Erro ao carregar faixas: {error}
          </div>
        )}
        {!loading && !error && rows.length === 0 && (
          <div className="py-12 text-center text-sm text-text3">
            Nenhuma música ainda. Use Do MP3 para criar a primeira.
          </div>
        )}
        {!loading && !error && rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-[9px] font-semibold uppercase tracking-[2px] text-text3">Título</th>
                  <th className="px-4 py-3 text-[9px] font-semibold uppercase tracking-[2px] text-text3">Atualizado</th>
                  <th className="px-4 py-3 text-[9px] font-semibold uppercase tracking-[2px] text-text3" />
                </tr>
              </thead>
              <tbody>
                {rows.map((material) => (
                  <tr
                    key={material.id}
                    className="cursor-pointer border-b border-border transition-colors hover:bg-azul-soft/30"
                    onClick={() => navigate(`/estudo/${material.id}`)}
                  >
                    <td className="px-4 py-3">
                      <StudyTitleField
                        value={material.title}
                        onCommit={(title) => void rename(material.id, title)}
                        className="w-full bg-transparent text-[13px] font-semibold text-text outline-none"
                      />
                    </td>
                    <td className="px-4 py-3 text-[12px] text-text2">
                      {material.updated_at
                        ? new Date(material.updated_at).toLocaleDateString('pt-BR')
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label="Apagar faixa"
                        onClick={(event) => {
                          event.stopPropagation()
                          void remove(material.id)
                        }}
                      >
                        <Trash size={16} />
                      </Button>
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

function EstudoRoom({ materialId }: { materialId: string }) {
  const navigate = useNavigate()
  const { data: school } = useSchool()
  const { data: rows, loading, error, refetch } = useMaterialWithBlocks(materialId)
  const surfaceRef = useRef<StudyPlayalongSurfaceHandle>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [playing, setPlaying] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [playalongOverride, setPlayalongOverride] = useState<PlayalongConfig | null>(null)
  const [marking, setMarking] = useState(false)
  const [displayMode, setDisplayMode] = useState<EstudoDisplayMode>('slash-beat')
  const [title, setTitle] = useState('Estudo')
  const [curatorName, setCuratorName] = useState<string | null>(null)
  const [beats, setBeats] = useState<InlineBeat[] | null>(null)
  const [editingBeat, setEditingBeat] = useState<number | null>(null)
  const dirtyRef = useRef(false)
  const playalongRef = useRef<PlayalongConfig | null>(null)
  const curatorFilledRef = useRef(false)

  const material = rows?.[0] ?? null
  const estudo = parseEstudo(material?.page_config?.estudo)
  const notation = useMemo(() => pickNotationBlock(rows), [rows])
  const study = useMemo(() => {
    if (!notation) return null
    const content = beats
      ? {
          ...(notation.block_content ?? {}),
          notation_data: {
            ...((notation.block_content as { notation_data?: Record<string, unknown> } | null)?.notation_data ?? {}),
            beats,
          },
        }
      : notation.block_content
    return studyTexFromBlock(
      { content, render_data: notation.block_render_data },
      displayMode,
    )
  }, [beats, displayMode, notation])
  const playalong = playalongOverride ?? parsePlayalong(material?.page_config?.playalong)
  playalongRef.current = playalong

  useEffect(() => {
    if (!notation) {
      setBeats(null)
      return
    }
    const session = hydrateNotationFromBlock({
      content: notation.block_content,
      render_data: notation.block_render_data,
    })
    setBeats(session.beats)
  }, [notation])

  useEffect(() => {
    if (!material) return
    const parsed = parseEstudo(material.page_config?.estudo)
    if (parsed) {
      setDisplayMode(parsed.displayMode)
      setCuratorName(parsed.curatorName)
    }
    setTitle(material.material_title ?? 'Estudo')
  }, [material])

  useEffect(() => {
    if (!material || !estudo || estudo.curatorName || curatorFilledRef.current) return
    curatorFilledRef.current = true
    void fetchCurrentUserName().then(async (name) => {
      if (!name) return
      const existing = (material.page_config ?? {}) as Record<string, unknown>
      await updateMaterial(materialId, {
        page_config: mergeEstudoPageConfig(existing, {
          estudo: estudoToJson({ ...estudo, curatorName: name }),
        }) as unknown as GeneratedMaterial['page_config'],
      })
      setCuratorName(name)
    })
  }, [estudo, material, materialId])

  const persistPlayalong = async (next: PlayalongConfig) => {
    const existing = (material?.page_config ?? {}) as Record<string, unknown>
    await updateMaterial(materialId, {
      page_config: {
        ...existing,
        playalong: playalongToJson(next),
      } as unknown as GeneratedMaterial['page_config'],
    })
    setPlayalongOverride(next)
  }

  const persistDisplayMode = async (next: EstudoDisplayMode) => {
    setDisplayMode(next)
    const existing = (material?.page_config ?? {}) as Record<string, unknown>
    const current = parseEstudo(existing.estudo) ?? {
      origin: 'from-mp3' as const,
      displayMode: next,
      curatorName,
    }
    await updateMaterial(materialId, {
      page_config: mergeEstudoPageConfig(existing, {
        estudo: estudoToJson({ ...current, displayMode: next, curatorName: current.curatorName ?? curatorName }),
      }) as unknown as GeneratedMaterial['page_config'],
    })
  }

  const renameTitle = async (next: string) => {
    const previous = title
    setTitle(next)
    try {
      await updateMaterial(materialId, { title: next })
    } catch (err) {
      setTitle(previous)
      toast.error(err instanceof Error ? err.message : 'Não deu para renomear')
    }
  }

  const commitCifra = async (index: number, raw: string, moveNext = false) => {
    if (!beats || !notation?.block_id) return
    const cifra = normalizeCifraSymbol(raw)
    const nextBeats = beats.map((beat, beatIndex) => (
      beatIndex === index ? { ...beat, cifra } : beat
    ))
    setBeats(nextBeats)
    if (moveNext) setEditingBeat(nextCifraBeatIndex(nextBeats, index))
    else setEditingBeat(null)
    try {
      const notationData = (notation.block_content as { notation_data?: Record<string, unknown> } | null)?.notation_data ?? {}
      await updateMaterialBlockRpc({
        blockId: notation.block_id,
        content: {
          ...(notation.block_content ?? {}),
          notation_data: {
            ...notationData,
            beats: nextBeats,
          },
        },
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não deu para gravar a cifra')
    }
  }

  const flushMarks = async () => {
    const current = playalongRef.current
    if (!dirtyRef.current || !current) return
    dirtyRef.current = false
    await persistPlayalong(current)
    toast.success('Compassos salvos')
  }

  const onPickAudio = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setUploading(true)
    try {
      const audioUrl = await uploadPlayalongFile(materialId, file)
      await persistPlayalong({
        audioUrl,
        countInMs: playalong?.countInMs ?? 0,
        syncPoints: playalong?.syncPoints ?? [],
      })
      toast.success('Playalong salvo. Aperte Play para ouvir.')
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao enviar o áudio')
    } finally {
      setUploading(false)
    }
  }

  const togglePlayback = () => {
    if (playing) {
      surfaceRef.current?.pause()
      void flushMarks()
      return
    }
    surfaceRef.current?.play()
  }

  const toggleMarking = () => {
    if (marking) {
      setMarking(false)
      void flushMarks()
      return
    }
    if (!playalong?.audioUrl) {
      toast.error('Carregue um playalong antes de marcar')
      return
    }
    setMarking(true)
  }

  const onMarkBar = (point: PlayalongSyncPoint) => {
    const current = playalongRef.current
    if (!current) return
    const next = {
      ...current,
      syncPoints: upsertSyncPoint(current.syncPoints, point),
    }
    dirtyRef.current = true
    setPlayalongOverride(next)
  }

  if (!loading && !error && material && !estudo) {
    return (
      <div className="card py-12 text-center text-sm text-text3">
        <p className="mb-4">Esta faixa não é da sala de Estudo</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/estudo')}>
          <ArrowLeft size={16} /> Voltar
        </Button>
      </div>
    )
  }

  return (
    <div className="estudo-room animate-in fade-in slide-in-from-bottom-4 print:bg-white duration-300">
      <div className="estudo-no-print mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/estudo')}>
            <ArrowLeft size={16} /> Materiais
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {ESTUDO_DISPLAY_MODES.map((mode) => (
            <Button
              key={mode}
              variant={displayMode === mode ? 'default' : 'outline'}
              size="sm"
              onClick={() => void persistDisplayMode(mode)}
            >
              {GRAVURA_LABEL[mode]}
            </Button>
          ))}
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/mpeg,audio/ogg,audio/mp4,.mp3,.ogg"
            className="hidden"
            onChange={onPickAudio}
          />
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? <SpinnerGap size={16} className="animate-spin" /> : null}
            Colar faixa nesta pauta
          </Button>
          <Button variant={marking ? 'default' : 'outline'} size="sm" onClick={toggleMarking} disabled={!playalong?.audioUrl}>
            {marking ? 'Parar marcação' : 'Marcar compassos'}
          </Button>
          <Button size="sm" onClick={togglePlayback} disabled={!playalong?.audioUrl}>
            {playing ? <Pause size={16} /> : <Play size={16} />}
            {playing ? 'Pausar' : 'Play'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer size={16} />
            Imprimir
          </Button>
        </div>
      </div>
      {marking && (
        <p className="estudo-no-print mb-3 text-[12px] text-text2 print:hidden">
          Espaço ou clique na pauta marca o tempo 1 do compasso. {playalong?.syncPoints.length ?? 0} ponto(s).
        </p>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 py-16 text-text2">
          <SpinnerGap size={20} className="animate-spin" /> Carregando pauta...
        </div>
      )}
      {error && (
        <div className="rounded-[var(--radius-sm)] bg-vermelho-soft p-4 text-sm text-vermelho">
          {error}
        </div>
      )}
      {!loading && !error && !study && (
        <div className="card py-12 text-center text-sm text-text3">
          Este material não tem pauta.
        </div>
      )}
      {study && (
        <StudySheetFrame
          schoolName={school?.name ?? ''}
          logoUrl={school?.logo_url ?? null}
          title={title}
          curatorName={curatorName}
          onTitleCommit={(next) => void renameTitle(next)}
        >
          <StudyPlayalongSurface
            ref={surfaceRef}
            tex={study.tex}
            barsPerRow={study.barsPerSystem}
            indexMap={study.indexMap}
            displayMode={displayMode}
            audioUrl={playalong?.audioUrl ?? null}
            syncPoints={playalong?.syncPoints ?? []}
            marking={marking}
            onMarkBar={onMarkBar}
            onPlayingChange={setPlaying}
            onSelectBeat={setEditingBeat}
          />
          {editingBeat !== null && beats && (
            <StudyCifraOverlay
              value={beats[editingBeat]?.cifra ?? ''}
              onCommit={(next) => void commitCifra(editingBeat, next)}
              onCancel={() => setEditingBeat(null)}
              onNext={(current) => void commitCifra(editingBeat, current, true)}
            />
          )}
        </StudySheetFrame>
      )}
    </div>
  )
}

function upsertSyncPoint(points: PlayalongSyncPoint[], point: PlayalongSyncPoint) {
  const index = points.findIndex((item) => (
    item.masterBarIndex === point.masterBarIndex
    && item.masterBarOccurence === point.masterBarOccurence
  ))
  if (index < 0) return [...points, point]
  const next = [...points]
  next[index] = point
  return next
}

function pickNotationBlock(rows: MaterialWithBlocks[] | null | undefined) {
  if (!rows?.length) return null
  const sorted = [...rows].sort((a, b) => (a.block_sort_order ?? 0) - (b.block_sort_order ?? 0))
  return sorted.find((row) => row.block_type === 'notation') ?? null
}

export function Estudo() {
  const { id } = useParams<{ id: string }>()
  if (id) return <EstudoRoom materialId={id} />
  return <EstudoList />
}
