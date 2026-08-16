import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import * as alphaTabModule from '@coderline/alphatab'
import { SpinnerGap } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { buildAlphaTabSettings, NOTATION_DIDACTIC_SCALE } from '@/lib/alphaTabSettings'
import type { PlayalongSyncPoint } from '@/lib/playalong'

export interface StudyPlayalongSurfaceProps {
  tex: string
  barsPerRow: number
  audioUrl: string | null
  syncPoints: PlayalongSyncPoint[]
  marking: boolean
  onMarkBar?: (point: PlayalongSyncPoint) => void
}

export interface StudyPlayalongSurfaceHandle {
  play: () => void
  pause: () => void
  api: alphaTabModule.AlphaTabApi | null
}

const STUDY_CURSOR_CSS = `
  .at-study-playalong .at-cursor-beat { display: none !important; }
`

function applyBarsPerRow(score: alphaTabModule.model.Score, barsPerRow: number) {
  if (barsPerRow <= 0) return
  const systems: number[] = []
  let remaining = score.masterBars?.length ?? 0
  while (remaining > 0) {
    systems.push(Math.min(barsPerRow, remaining))
    remaining -= barsPerRow
  }
  score.defaultSystemsLayout = barsPerRow
  score.systemsLayout = systems
  for (const track of score.tracks ?? []) {
    track.defaultSystemsLayout = barsPerRow
    track.systemsLayout = systems
  }
}

function toFlatSyncPoints(points: PlayalongSyncPoint[]): alphaTabModule.model.FlatSyncPoint[] {
  return points.map((point) => ({
    barIndex: point.masterBarIndex,
    barPosition: 0,
    barOccurence: point.masterBarOccurence,
    millisecondOffset: point.syncTime,
  }))
}

function masterBarIndexAtTick(score: alphaTabModule.model.Score | null, tick: number): number {
  const bars = score?.masterBars ?? []
  let index = 0
  for (const bar of bars) {
    if (bar.start <= tick) index = bar.index
    else break
  }
  return index
}

export const StudyPlayalongSurface = forwardRef<StudyPlayalongSurfaceHandle, StudyPlayalongSurfaceProps>(
  function StudyPlayalongSurfaceInner({
    tex,
    barsPerRow,
    audioUrl,
    syncPoints,
    marking,
    onMarkBar,
  }, ref) {
    const scrollRef = useRef<HTMLDivElement>(null)
    const hostRef = useRef<HTMLDivElement>(null)
    const apiRef = useRef<alphaTabModule.AlphaTabApi | null>(null)
    const audioReadyRef = useRef(false)
    const lastBarIndexRef = useRef(0)
    const syncPointsRef = useRef(syncPoints)
    const onMarkBarRef = useRef(onMarkBar)
    const markingRef = useRef(marking)
    const audioUrlRef = useRef(audioUrl)
    const attachedUrlRef = useRef<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [scoreNonce, setScoreNonce] = useState(0)

    syncPointsRef.current = syncPoints
    onMarkBarRef.current = onMarkBar
    markingRef.current = marking
    audioUrlRef.current = audioUrl

    const applyBackingTrack = useCallback(async (api: alphaTabModule.AlphaTabApi, url: string, points: PlayalongSyncPoint[]) => {
      const score = api.score
      if (!score) return false
      const response = await fetch(url)
      if (!response.ok) throw new Error('Não deu para carregar o áudio')
      const bytes = new Uint8Array(await response.arrayBuffer())
      const backingTrack = new alphaTabModule.model.BackingTrack()
      backingTrack.rawAudioFile = bytes
      score.backingTrack = backingTrack
      if (points.length > 0) {
        score.applyFlatSyncPoints(toFlatSyncPoints(points))
      }
      const player = api.player as { loadBackingTrack?: (next: alphaTabModule.model.Score) => void } | null
      player?.loadBackingTrack?.(score)
      api.updateSyncPoints()
      return true
    }, [])

    const captureMark = useCallback(() => {
      const api = apiRef.current
      if (!api || !markingRef.current) return
      const barIndex = lastBarIndexRef.current
      const occurrence = syncPointsRef.current.filter((point) => point.masterBarIndex === barIndex).length
      onMarkBarRef.current?.({
        masterBarIndex: barIndex,
        masterBarOccurence: occurrence,
        syncTime: api.timePosition,
      })
    }, [])

    useImperativeHandle(ref, () => ({
      play: () => {
        const api = apiRef.current
        if (!api) return
        if (!audioUrlRef.current || !audioReadyRef.current) {
          toast.error('Carregue um playalong para tocar')
          return
        }
        api.play()
      },
      pause: () => {
        apiRef.current?.pause()
      },
      get api() {
        return apiRef.current
      },
    }), [])

    useEffect(() => {
      const id = 'at-study-playalong-css'
      if (document.getElementById(id)) return
      const style = document.createElement('style')
      style.id = id
      style.textContent = STUDY_CURSOR_CSS
      document.head.appendChild(style)
    }, [])

    useEffect(() => {
      const host = hostRef.current
      const scroll = scrollRef.current
      if (!host || !tex.trim()) return

      audioReadyRef.current = false
      attachedUrlRef.current = null
      setLoading(true)
      setError(null)

      const settings = buildAlphaTabSettings({
        purpose: 'study-playalong',
        layout: 'page',
        scale: NOTATION_DIDACTIC_SCALE,
        showTimeSignature: true,
        barsPerRow,
      })
      settings.player.enableUserInteraction = false
      settings.player.enableElementHighlighting = false
      settings.player.scrollMode = alphaTabModule.ScrollMode.Continuous
      settings.player.scrollOffsetY = -24
      if (scroll) settings.player.scrollElement = scroll

      const api = new alphaTabModule.AlphaTabApi(host, settings)
      apiRef.current = api

      api.scoreLoaded.on((score) => {
        applyBarsPerRow(score, barsPerRow)
        lastBarIndexRef.current = 0
        setScoreNonce((value) => value + 1)
      })

      api.renderFinished.on(() => {
        setLoading(false)
      })

      api.playedBeatChanged.on((beat) => {
        const index = beat.voice?.bar?.masterBar?.index
        if (typeof index === 'number') lastBarIndexRef.current = index
      })

      api.error.on((err) => {
        const message = err instanceof Error ? err.message : String(err)
        setError(message || 'Erro ao renderizar a pauta')
        setLoading(false)
      })

      api.tex(tex)

      return () => {
        api.destroy()
        apiRef.current = null
        audioReadyRef.current = false
        attachedUrlRef.current = null
      }
    }, [barsPerRow, tex])

    useEffect(() => {
      const api = apiRef.current
      const url = audioUrl
      if (!api?.score || !url) {
        audioReadyRef.current = false
        return
      }
      if (attachedUrlRef.current === url && audioReadyRef.current) return
      let cancelled = false
      void (async () => {
        try {
          await applyBackingTrack(api, url, syncPointsRef.current)
          if (cancelled) return
          attachedUrlRef.current = url
          audioReadyRef.current = true
        } catch (err) {
          if (cancelled) return
          audioReadyRef.current = false
          attachedUrlRef.current = null
          toast.error(err instanceof Error ? err.message : 'Falha ao carregar o áudio')
        }
      })()
      return () => {
        cancelled = true
      }
    }, [applyBackingTrack, audioUrl, scoreNonce])

    useEffect(() => {
      const api = apiRef.current
      const score = api?.score
      if (!api || !score || !audioReadyRef.current) return
      if (syncPoints.length === 0) return
      score.applyFlatSyncPoints(toFlatSyncPoints(syncPoints))
      api.updateSyncPoints()
    }, [syncPoints])

    useEffect(() => {
      if (!marking) return

      const onKeyDown = (event: KeyboardEvent) => {
        if (event.code !== 'Space' && event.key !== ' ') return
        const target = event.target as HTMLElement | null
        if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return
        event.preventDefault()
        const api = apiRef.current
        if (api) {
          lastBarIndexRef.current = masterBarIndexAtTick(api.score, api.tickPosition)
        }
        captureMark()
      }

      const onClick = () => {
        const api = apiRef.current
        if (api) {
          lastBarIndexRef.current = masterBarIndexAtTick(api.score, api.tickPosition)
        }
        captureMark()
      }

      window.addEventListener('keydown', onKeyDown)
      const scroll = scrollRef.current
      scroll?.addEventListener('click', onClick)
      return () => {
        window.removeEventListener('keydown', onKeyDown)
        scroll?.removeEventListener('click', onClick)
      }
    }, [captureMark, marking])

    if (!tex.trim()) return null

    return (
      <div
        ref={scrollRef}
        className="at-study-playalong relative overflow-auto rounded-[var(--radius)] border border-border bg-surface"
        style={{ minHeight: 280, maxHeight: 'calc(100vh - 180px)' }}
      >
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/80">
            <SpinnerGap size={24} className="animate-spin text-accent" />
          </div>
        )}
        {error && (
          <div className="p-3 text-[12px] text-destructive">{error}</div>
        )}
        <div ref={hostRef} className="w-full" />
      </div>
    )
  },
)
