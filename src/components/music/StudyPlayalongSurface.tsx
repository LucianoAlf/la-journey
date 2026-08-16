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
  onPlayingChange?: (playing: boolean) => void
}

export interface StudyPlayalongSurfaceHandle {
  play: () => boolean
  pause: () => void
  api: alphaTabModule.AlphaTabApi | null
}

const STUDY_CURSOR_CSS = `
  .at-study-playalong .at-cursor-beat { display: none !important; }
`

type ExternalMediaOutput = {
  handler?: {
    backingTrackDuration: number
    playbackRate: number
    masterVolume: number
    seekTo: (time: number) => void
    play: () => void
    pause: () => void
  }
  updatePosition: (currentTime: number) => void
}

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

function externalOutput(api: alphaTabModule.AlphaTabApi | null): ExternalMediaOutput | null {
  const output = api?.player?.output as unknown as ExternalMediaOutput | undefined
  if (!output || typeof output.updatePosition !== 'function') return null
  return output
}

export const StudyPlayalongSurface = forwardRef<StudyPlayalongSurfaceHandle, StudyPlayalongSurfaceProps>(
  function StudyPlayalongSurfaceInner({
    tex,
    barsPerRow,
    audioUrl,
    syncPoints,
    marking,
    onMarkBar,
    onPlayingChange,
  }, ref) {
    const scrollRef = useRef<HTMLDivElement>(null)
    const hostRef = useRef<HTMLDivElement>(null)
    const mediaRef = useRef<HTMLAudioElement>(null)
    const apiRef = useRef<alphaTabModule.AlphaTabApi | null>(null)
    const lastBarIndexRef = useRef(0)
    const syncPointsRef = useRef(syncPoints)
    const onMarkBarRef = useRef(onMarkBar)
    const markingRef = useRef(marking)
    const audioUrlRef = useRef(audioUrl)
    const onPlayingChangeRef = useRef(onPlayingChange)
    const positionTimerRef = useRef<number>(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    syncPointsRef.current = syncPoints
    onMarkBarRef.current = onMarkBar
    markingRef.current = marking
    audioUrlRef.current = audioUrl
    onPlayingChangeRef.current = onPlayingChange

    const pushPosition = useCallback(() => {
      const audio = mediaRef.current
      const output = externalOutput(apiRef.current)
      if (!audio || !output) return
      const rate = audio.playbackRate || 1
      output.updatePosition((audio.currentTime / rate) * 1000)
    }, [])

    const stopPositionTimer = useCallback(() => {
      if (positionTimerRef.current) {
        window.clearInterval(positionTimerRef.current)
        positionTimerRef.current = 0
      }
    }, [])

    const startPositionTimer = useCallback(() => {
      stopPositionTimer()
      positionTimerRef.current = window.setInterval(pushPosition, 50)
    }, [pushPosition, stopPositionTimer])

    const wireMediaHandler = useCallback((api: alphaTabModule.AlphaTabApi | null) => {
      const audio = mediaRef.current
      const output = externalOutput(api)
      if (!audio || !output) return false
      output.handler = {
        get backingTrackDuration() {
          return Number.isFinite(audio.duration) ? audio.duration * 1000 : 0
        },
        get playbackRate() {
          return audio.playbackRate
        },
        set playbackRate(value) {
          audio.playbackRate = value
        },
        get masterVolume() {
          return audio.volume
        },
        set masterVolume(value) {
          audio.volume = value
        },
        seekTo(time) {
          audio.currentTime = (time * audio.playbackRate) / 1000
        },
        play() {
          void audio.play()
        },
        pause() {
          audio.pause()
        },
      }
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
        const audio = mediaRef.current
        if (!audioUrlRef.current || !audio) {
          toast.error('Carregue um playalong para tocar')
          return false
        }
        const api = apiRef.current
        if (api) wireMediaHandler(api)
        const playPromise = audio.play()
        if (api && Number.isFinite(audio.duration) && audio.duration > 0) {
          api.play()
        }
        startPositionTimer()
        void playPromise.catch((err: unknown) => {
          stopPositionTimer()
          apiRef.current?.pause()
          onPlayingChangeRef.current?.(false)
          const message = err instanceof Error ? err.message : 'O navegador bloqueou o áudio'
          toast.error(message)
        })
        return true
      },
      pause: () => {
        mediaRef.current?.pause()
        apiRef.current?.pause()
        stopPositionTimer()
      },
      get api() {
        return apiRef.current
      },
    }), [startPositionTimer, stopPositionTimer, wireMediaHandler])

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
        if (syncPointsRef.current.length > 0) {
          score.applyFlatSyncPoints(toFlatSyncPoints(syncPointsRef.current))
        }
        wireMediaHandler(api)
      })

      api.playerReady.on(() => {
        wireMediaHandler(api)
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
        stopPositionTimer()
        api.destroy()
        apiRef.current = null
      }
    }, [barsPerRow, stopPositionTimer, tex, wireMediaHandler])

    useEffect(() => {
      const api = apiRef.current
      const score = api?.score
      if (!api || !score) return
      if (syncPoints.length === 0) return
      score.applyFlatSyncPoints(toFlatSyncPoints(syncPoints))
      api.updateSyncPoints()
    }, [syncPoints])

    useEffect(() => {
      const audio = mediaRef.current
      if (!audio) return

      const onPlay = () => {
        wireMediaHandler(apiRef.current)
        startPositionTimer()
        onPlayingChangeRef.current?.(true)
      }
      const onPause = () => {
        stopPositionTimer()
        apiRef.current?.pause()
        onPlayingChangeRef.current?.(false)
      }
      const onEnded = () => {
        stopPositionTimer()
        apiRef.current?.pause()
        onPlayingChangeRef.current?.(false)
      }

      audio.addEventListener('play', onPlay)
      audio.addEventListener('pause', onPause)
      audio.addEventListener('ended', onEnded)
      audio.addEventListener('timeupdate', pushPosition)
      audio.addEventListener('seeked', pushPosition)
      return () => {
        audio.removeEventListener('play', onPlay)
        audio.removeEventListener('pause', onPause)
        audio.removeEventListener('ended', onEnded)
        audio.removeEventListener('timeupdate', pushPosition)
        audio.removeEventListener('seeked', pushPosition)
      }
    }, [audioUrl, pushPosition, startPositionTimer, stopPositionTimer, wireMediaHandler])

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
      <div className="space-y-3">
        {audioUrl && (
          <audio
            ref={mediaRef}
            src={audioUrl}
            preload="auto"
            controls
            className="h-10 w-full"
          />
        )}
        <div
          ref={scrollRef}
          className="at-study-playalong relative overflow-auto rounded-[var(--radius)] border border-border bg-surface"
          style={{ minHeight: 280, maxHeight: 'calc(100vh - 220px)' }}
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
      </div>
    )
  },
)
