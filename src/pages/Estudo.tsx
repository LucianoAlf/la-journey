import { useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pause, Play, SpinnerGap } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { StudyPlayalongSurface, type StudyPlayalongSurfaceHandle } from '@/components/music/StudyPlayalongSurface'
import { useMaterials, useMaterialWithBlocks } from '@/hooks/useMaterials'
import { useSchool } from '@/hooks/useSchool'
import { parsePlayalong, playalongToJson, type PlayalongConfig, type PlayalongSyncPoint } from '@/lib/playalong'
import { studyTexFromBlock } from '@/lib/studyNotationTex'
import { updateMaterial, type GeneratedMaterial, type MaterialListItem, type MaterialWithBlocks } from '@/services/materialService'
import { uploadPlayalongFile } from '@/services/playalongUpload'

function EstudoList() {
  const navigate = useNavigate()
  const { data: school } = useSchool()
  const { data: materials, loading, error } = useMaterials(school?.id)

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="mb-6">
        <h1 className="font-serif text-[26px] leading-[1.2] text-text">
          Sala de <em className="not-italic text-accent">Estudo</em>
        </h1>
        <p className="mt-1.5 text-[13.5px] text-text2">
          Escolha um material com pauta e toque o playalong
        </p>
      </div>

      <div className="card">
        {loading && (
          <div className="flex items-center justify-center gap-2 py-12 text-text2">
            <SpinnerGap size={20} className="animate-spin" /> Carregando materiais...
          </div>
        )}
        {error && (
          <div className="rounded-[var(--radius-sm)] bg-vermelho-soft p-4 text-sm text-vermelho">
            Erro ao carregar materiais: {error}
          </div>
        )}
        {!loading && !error && (!materials || materials.length === 0) && (
          <div className="py-12 text-center text-sm text-text3">
            Nenhum material ainda.
          </div>
        )}
        {materials && materials.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-[9px] font-semibold uppercase tracking-[2px] text-text3">Título</th>
                  <th className="px-4 py-3 text-[9px] font-semibold uppercase tracking-[2px] text-text3">Jornada</th>
                  <th className="px-4 py-3 text-[9px] font-semibold uppercase tracking-[2px] text-text3">Estação</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((material: MaterialListItem) => (
                  <tr
                    key={material.id}
                    className="cursor-pointer border-b border-border transition-colors hover:bg-azul-soft/30"
                    onClick={() => navigate(`/estudo/${material.id}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="text-[13px] font-semibold text-text">{material.title}</div>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-text2">{material.journey_name ?? '—'}</td>
                    <td className="px-4 py-3 text-[12px] text-text2">{material.station_name ?? '—'}</td>
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
  const { data: rows, loading, error, refetch } = useMaterialWithBlocks(materialId)
  const surfaceRef = useRef<StudyPlayalongSurfaceHandle>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [playing, setPlaying] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [playalongOverride, setPlayalongOverride] = useState<PlayalongConfig | null>(null)
  const [marking, setMarking] = useState(false)
  const dirtyRef = useRef(false)
  const playalongRef = useRef<PlayalongConfig | null>(null)

  const material = rows?.[0] ?? null
  const notation = useMemo(() => pickNotationBlock(rows), [rows])
  const study = notation
    ? studyTexFromBlock({ content: notation.block_content, render_data: notation.block_render_data })
    : null
  const playalong = playalongOverride ?? parsePlayalong(material?.page_config?.playalong)
  playalongRef.current = playalong

  const persistPlayalong = async (next: PlayalongConfig) => {
    const existing = (material?.page_config ?? {}) as Record<string, unknown>
    await updateMaterial(materialId, {
      page_config: {
        ...existing,
        playalong: playalongToJson(next),
      } as GeneratedMaterial['page_config'],
    })
    setPlayalongOverride(next)
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
      toast.success('Playalong salvo neste material')
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
      setPlaying(false)
      void flushMarks()
      return
    }
    surfaceRef.current?.play()
    setPlaying(true)
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

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/estudo')}>
            <ArrowLeft size={16} /> Materiais
          </Button>
          <div>
            <h1 className="font-serif text-[22px] leading-[1.2] text-text">
              {material?.material_title ?? 'Estudo'}
            </h1>
            <p className="text-[12px] text-text2">Playalong na grade — cursor no compasso</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/mpeg,audio/ogg,audio/mp4,.mp3,.ogg"
            className="hidden"
            onChange={onPickAudio}
          />
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? <SpinnerGap size={16} className="animate-spin" /> : null}
            Carregar playalong
          </Button>
          <Button variant={marking ? 'default' : 'outline'} size="sm" onClick={toggleMarking} disabled={!study}>
            {marking ? 'Parar marcação' : 'Marcar compassos'}
          </Button>
          <Button size="sm" onClick={togglePlayback} disabled={!study}>
            {playing ? <Pause size={16} /> : <Play size={16} />}
            {playing ? 'Pausar' : 'Play'}
          </Button>
        </div>
      </div>
      {marking && (
        <p className="mb-3 text-[12px] text-text2">
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
        <StudyPlayalongSurface
          ref={surfaceRef}
          tex={study.tex}
          barsPerRow={study.barsPerSystem}
          audioUrl={playalong?.audioUrl ?? null}
          syncPoints={playalong?.syncPoints ?? []}
          marking={marking}
          onMarkBar={onMarkBar}
        />
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
