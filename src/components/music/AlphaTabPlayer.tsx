import { useRef, useEffect, useState, useCallback } from 'react'
import * as alphaTabModule from '@coderline/alphatab'
import {
  Play, Pause, Stop,
  Metronome, ArrowCounterClockwise, SpinnerGap,
  Gauge,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface AlphaTabPlayerProps {
  /** URL do arquivo Guitar Pro (.gp, .gp5, .gpx, .gp7) ou alphaTex */
  fileUrl?: string
  /** Conteúdo alphaTex direto (alternativa ao fileUrl) */
  tex?: string
  /** Altura mínima do viewport */
  minHeight?: number
  /** Classe CSS adicional */
  className?: string
}

type PlayerState = 'stopped' | 'playing' | 'paused'

/**
 * Wrapper React para AlphaTab — renderiza tablaturas Guitar Pro
 * com player MIDI, controle de velocidade, seleção de tracks e metronomo.
 */
export function AlphaTabPlayer({ fileUrl, tex, minHeight = 400, className = '' }: AlphaTabPlayerProps) {
  const mainRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<alphaTabModule.AlphaTabApi | null>(null)

  const [loading, setLoading] = useState(true)
  const [playerState, setPlayerState] = useState<PlayerState>('stopped')
  const [tracks, setTracks] = useState<alphaTabModule.model.Track[]>([])
  const [activeTrackIndex, setActiveTrackIndex] = useState(0)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [metronomeOn, setMetronomeOn] = useState(false)
  const [loopOn, setLoopOn] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState('00:00')
  const [totalTime, setTotalTime] = useState('00:00')
  const [songTitle, setSongTitle] = useState('')
  const [songArtist, setSongArtist] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Formatar tempo em mm:ss
  const formatTime = useCallback((ms: number) => {
    const totalSecs = Math.floor(ms / 1000)
    const mins = Math.floor(totalSecs / 60)
    const secs = totalSecs % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }, [])

  // Inicializar AlphaTab
  useEffect(() => {
    if (!mainRef.current || (!fileUrl && !tex)) return

    setLoading(true)
    setError(null)

    const settings: alphaTabModule.Settings = new alphaTabModule.Settings()
    settings.core.fontDirectory = window.location.origin + '/font/'
    settings.core.useWorkers = false
    settings.player.enablePlayer = true
    settings.player.enableCursor = true
    settings.player.enableUserInteraction = true
    settings.player.soundFont = window.location.origin + '/soundfont/sonivox.sf2'
    settings.player.scrollElement = viewportRef.current as HTMLElement
    settings.display.layoutMode = alphaTabModule.LayoutMode.Page

    if (fileUrl) {
      settings.core.file = fileUrl
    } else if (tex) {
      settings.core.tex = true
    }

    const api = new alphaTabModule.AlphaTabApi(mainRef.current, settings)
    apiRef.current = api

    if (tex) {
      api.tex(tex)
    }

    // Score carregado
    api.scoreLoaded.on((score: alphaTabModule.model.Score) => {
      setSongTitle(score.title || '')
      setSongArtist(score.artist || '')
      setTracks(score.tracks)
      setActiveTrackIndex(0)
    })

    // Render finalizado
    api.renderFinished.on(() => {
      setLoading(false)
    })

    // Player state
    api.playerStateChanged.on((e: alphaTabModule.synth.PlayerStateChangedEventArgs) => {
      if (e.state === alphaTabModule.synth.PlayerState.Playing) {
        setPlayerState('playing')
      } else if (e.state === alphaTabModule.synth.PlayerState.Paused) {
        setPlayerState('paused')
      } else {
        setPlayerState('stopped')
      }
    })

    // Progresso da reprodução
    api.playerPositionChanged.on((e: alphaTabModule.synth.PositionChangedEventArgs) => {
      const pct = e.endTick > 0 ? (e.currentTick / e.endTick) * 100 : 0
      setProgress(pct)
      setCurrentTime(formatTime(e.currentTime))
      setTotalTime(formatTime(e.endTime))
    })

    // Erro
    api.error.on((e: any) => {
      console.error('AlphaTab erro:', e)
      setError(e?.message || String(e) || 'Erro ao carregar tablatura')
      setLoading(false)
    })

    return () => {
      api.destroy()
      apiRef.current = null
    }
  }, [fileUrl, tex, formatTime])

  // Controles
  const handlePlayPause = useCallback(() => {
    apiRef.current?.playPause()
  }, [])

  const handleStop = useCallback(() => {
    apiRef.current?.stop()
  }, [])

  const handleSpeedChange = useCallback((speed: string) => {
    const value = parseFloat(speed)
    setPlaybackSpeed(value)
    if (apiRef.current) {
      apiRef.current.playbackSpeed = value
    }
  }, [])

  const handleMetronomeToggle = useCallback(() => {
    setMetronomeOn(prev => {
      const next = !prev
      if (apiRef.current) {
        apiRef.current.metronomeVolume = next ? 1 : 0
      }
      return next
    })
  }, [])

  const handleLoopToggle = useCallback(() => {
    setLoopOn(prev => {
      const next = !prev
      if (apiRef.current) {
        apiRef.current.isLooping = next
      }
      return next
    })
  }, [])

  const handleTrackChange = useCallback((index: number) => {
    if (!apiRef.current || !tracks[index]) return
    setActiveTrackIndex(index)
    apiRef.current.renderTracks([tracks[index]])
  }, [tracks])

  // Se não tem arquivo nem tex, mostrar estado vazio
  if (!fileUrl && !tex) {
    return (
      <div className={`flex flex-col items-center justify-center gap-3 text-text3 py-12 ${className}`}>
        <Gauge size={32} />
        <p className="text-[13px]">Nenhum arquivo de tablatura disponível</p>
        <p className="text-[11px] text-text3/60">Formatos suportados: .gp, .gp5, .gpx, .gp7, .musicxml</p>
      </div>
    )
  }

  return (
    <div className={`flex flex-col bg-surface rounded-xl border border-border overflow-hidden ${className}`}>
      {/* Barra superior: info da música + tracks */}
      {(songTitle || tracks.length > 1) && (
        <div className="flex items-center gap-3 px-3 py-2 border-b border-border bg-background/50">
          {songTitle && (
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-text truncate">{songTitle}</div>
              {songArtist && <div className="text-[10px] text-text3 truncate">{songArtist}</div>}
            </div>
          )}
          {tracks.length > 1 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-text3 uppercase tracking-wider">Track:</span>
              <Select value={String(activeTrackIndex)} onValueChange={v => handleTrackChange(parseInt(v))}>
                <SelectTrigger className="h-7 text-[11px] w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tracks.map((track, i) => (
                    <SelectItem key={i} value={String(i)} className="text-[11px]">
                      {track.name || `Track ${i + 1}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      {/* Viewport com a tablatura renderizada */}
      <div
        ref={viewportRef}
        className="relative overflow-auto"
        style={{ minHeight, maxHeight: '70vh' }}
      >
        {/* Overlay de loading */}
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2">
              <SpinnerGap size={24} className="animate-spin text-accent" />
              <span className="text-[12px] text-text2">Carregando tablatura...</span>
            </div>
          </div>
        )}

        {/* Erro */}
        {error && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80">
            <div className="flex flex-col items-center gap-2 text-center px-6">
              <span className="text-[13px] text-red-400 font-medium">{error}</span>
              <span className="text-[11px] text-text3">Verifique se o arquivo é válido</span>
            </div>
          </div>
        )}

        {/* Container onde o AlphaTab renderiza */}
        <div ref={mainRef} className="at-main" style={{ width: '100%', minHeight }} />
      </div>

      {/* Barra de controles inferior */}
      <div className="flex items-center gap-2 px-3 py-2 border-t border-border bg-background/50">
        {/* Play/Pause/Stop */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleStop}
            disabled={playerState === 'stopped'}
          >
            <Stop size={16} weight="fill" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handlePlayPause}
          >
            {playerState === 'playing' ? (
              <Pause size={16} weight="fill" />
            ) : (
              <Play size={16} weight="fill" className="text-accent" />
            )}
          </Button>
        </div>

        {/* Tempo */}
        <span className="text-[10px] font-mono text-text3 min-w-[90px]">
          {currentTime} / {totalTime}
        </span>

        {/* Barra de progresso */}
        <div className="flex-1 mx-2">
          <div className="h-1 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Velocidade */}
        <Select value={String(playbackSpeed)} onValueChange={handleSpeedChange}>
          <SelectTrigger className="h-7 text-[10px] w-[70px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0.25" className="text-[11px]">0.25x</SelectItem>
            <SelectItem value="0.5" className="text-[11px]">0.5x</SelectItem>
            <SelectItem value="0.75" className="text-[11px]">0.75x</SelectItem>
            <SelectItem value="1" className="text-[11px]">1x</SelectItem>
            <SelectItem value="1.25" className="text-[11px]">1.25x</SelectItem>
            <SelectItem value="1.5" className="text-[11px]">1.5x</SelectItem>
            <SelectItem value="2" className="text-[11px]">2x</SelectItem>
          </SelectContent>
        </Select>

        {/* Metrônomo */}
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 w-8 p-0 ${metronomeOn ? 'text-accent' : 'text-text3'}`}
          onClick={handleMetronomeToggle}
        >
          <Metronome size={16} weight={metronomeOn ? 'fill' : 'regular'} />
        </Button>

        {/* Loop */}
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 w-8 p-0 ${loopOn ? 'text-accent' : 'text-text3'}`}
          onClick={handleLoopToggle}
        >
          <ArrowCounterClockwise size={16} weight={loopOn ? 'bold' : 'regular'} />
        </Button>
      </div>
    </div>
  )
}
