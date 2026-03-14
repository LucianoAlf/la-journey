import { useRef, useEffect, useState, useCallback } from 'react'
import * as alphaTabModule from '@coderline/alphatab'
import { SpinnerGap, Gauge, FilePdf, Play, Pause, Stop, Metronome, Repeat, SpeakerHigh, SpeakerSlash, Faders, SpeakerSimpleHigh, SpeakerSimpleSlash } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { generatePdfFromElement } from '@/services/pdfService'
import { convertSongsterrToScore } from '@/lib/songsterr-converter'
import { toast } from 'sonner'

type PlayerState = 'stopped' | 'playing' | 'paused'

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

/** Formata milissegundos em mm:ss */
function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/**
 * Wrapper React para AlphaTab — renderiza tablaturas Guitar Pro
 * com player MIDI, seleção de tracks e geração de PDF.
 */
export function AlphaTabPlayer({ fileUrl, tex, minHeight = 400, className = '' }: AlphaTabPlayerProps) {
  const mainRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<alphaTabModule.AlphaTabApi | null>(null)

  const [loading, setLoading] = useState(true)
  const [tracks, setTracks] = useState<alphaTabModule.model.Track[]>([])
  const [activeTrackIndex, setActiveTrackIndex] = useState(0)
  const [songTitle, setSongTitle] = useState('')
  const [songArtist, setSongArtist] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [generatingPdf, setGeneratingPdf] = useState(false)

  // Player states
  const [playerState, setPlayerState] = useState<PlayerState>('stopped')
  const [playerReady, setPlayerReady] = useState(false)
  const [currentTime, setCurrentTime] = useState('00:00')
  const [totalTime, setTotalTime] = useState('00:00')
  const [progress, setProgress] = useState(0)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [metronomeOn, setMetronomeOn] = useState(false)
  const [countIn, setCountIn] = useState(false)
  const [loopOn, setLoopOn] = useState(false)
  const [muted, setMuted] = useState(false)

  // Mixer states
  const [mixerOpen, setMixerOpen] = useState(false)
  const [trackVolumes, setTrackVolumes] = useState<Record<number, number>>({})
  const [trackMutes, setTrackMutes] = useState<Record<number, boolean>>({})
  const [trackSolos, setTrackSolos] = useState<Record<number, boolean>>({})

  // Inicializar AlphaTab
  useEffect(() => {
    if (!mainRef.current || (!fileUrl && !tex)) return

    setLoading(true)
    setError(null)
    setPlayerReady(false)
    setPlayerState('stopped')

    const settings: alphaTabModule.Settings = new alphaTabModule.Settings()
    settings.core.fontDirectory = window.location.origin + '/font/'
    settings.display.layoutMode = alphaTabModule.LayoutMode.Page

    // Habilitar player (plugin Vite gerencia workers; fonts/soundfont vêm de public/)
    settings.player.enablePlayer = true
    settings.player.enableCursor = true
    settings.player.enableAnimatedBeatCursor = true
    settings.player.soundFont = window.location.origin + '/soundfont/generaluser-gs.sf2'
    settings.player.scrollOffsetY = -30
    settings.player.scrollMode = alphaTabModule.ScrollMode.Continuous

    // Detectar tema e aplicar cores
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
    const res = settings.display.resources
    if (isDark) {
      res.mainGlyphColor = new alphaTabModule.model.Color(220, 225, 235, 255)
      res.secondaryGlyphColor = new alphaTabModule.model.Color(150, 160, 180, 255)
      res.staffLineColor = new alphaTabModule.model.Color(80, 90, 110, 255)
      res.barSeparatorColor = new alphaTabModule.model.Color(80, 90, 110, 255)
      res.scoreInfoColor = new alphaTabModule.model.Color(200, 210, 225, 255)
    } else {
      res.mainGlyphColor = new alphaTabModule.model.Color(30, 30, 40, 255)
      res.secondaryGlyphColor = new alphaTabModule.model.Color(100, 100, 120, 255)
      res.staffLineColor = new alphaTabModule.model.Color(180, 185, 195, 255)
      res.barSeparatorColor = new alphaTabModule.model.Color(180, 185, 195, 255)
      res.scoreInfoColor = new alphaTabModule.model.Color(40, 40, 55, 255)
    }

    const isSongsterrJson = fileUrl?.includes('.songsterr.json') ?? false

    if (fileUrl && !isSongsterrJson) {
      settings.core.file = fileUrl
    } else if (tex) {
      settings.core.tex = true
    }
    // Se for .songsterr.json, NÃO setamos settings.core.file — carregamos manualmente

    const api = new alphaTabModule.AlphaTabApi(mainRef.current, settings)
    apiRef.current = api

    // Configurar scroll element para o viewport (acompanhar cursor durante playback)
    if (viewportRef.current) {
      api.settings.player.scrollElement = viewportRef.current
      api.updateSettings()
    }

    if (tex) {
      api.tex(tex)
    }

    // Songsterr JSON: fetch → converter → renderScore in-memory
    if (isSongsterrJson && fileUrl) {
      fetch(fileUrl)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          return res.json()
        })
        .then((bundle) => {
          console.log('[AlphaTab] Convertendo Songsterr JSON →', bundle.title, bundle.artist)
          const score = convertSongsterrToScore(bundle)
          console.log('[AlphaTab] Score gerado:', score.tracks.length, 'tracks,', score.masterBars.length, 'compassos')
          api.renderScore(score)
        })
        .catch((err) => {
          console.error('[AlphaTab] Erro ao converter Songsterr JSON:', err)
          setError(`Erro ao converter tablatura: ${err?.message || err}`)
          setLoading(false)
        })
    }

    // Score carregado
    api.scoreLoaded.on((score: alphaTabModule.model.Score) => {
      setSongTitle(score.title || '')
      setSongArtist(score.artist || '')
      setTracks(score.tracks)
      setActiveTrackIndex(0)
      // Inicializar volumes do mixer (100% para todas)
      const vols: Record<number, number> = {}
      const muts: Record<number, boolean> = {}
      const sols: Record<number, boolean> = {}
      score.tracks.forEach((_: any, i: number) => {
        vols[i] = 1
        muts[i] = false
        sols[i] = false
      })
      setTrackVolumes(vols)
      setTrackMutes(muts)
      setTrackSolos(sols)
    })

    // Render finalizado
    api.renderFinished.on(() => {
      setLoading(false)
    })

    // Player pronto (soundfont carregado)
    api.playerReady.on(() => {
      console.log('[AlphaTab] Player MIDI pronto — soundfont carregado')
      setPlayerReady(true)
    })

    // Estado do player mudou
    api.playerStateChanged.on((e: any) => {
      const state = e.state ?? e
      if (state === 0) setPlayerState('stopped')
      else if (state === 1) setPlayerState('playing')
      else if (state === 2) setPlayerState('paused')
    })

    // Progresso da reprodução
    api.playerPositionChanged.on((e: any) => {
      const cur = e.currentTime ?? 0
      const total = e.endTime ?? 0
      setCurrentTime(formatTime(cur))
      setTotalTime(formatTime(total))
      setProgress(total > 0 ? (cur / total) * 100 : 0)
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
  }, [fileUrl, tex])

  // Controles do player
  const handlePlayPause = useCallback(() => {
    if (!apiRef.current) return
    apiRef.current.playPause()
  }, [])

  const handleStop = useCallback(() => {
    if (!apiRef.current) return
    apiRef.current.stop()
  }, [])

  const handleTrackChange = useCallback((index: number) => {
    if (!apiRef.current || !tracks[index]) return
    setActiveTrackIndex(index)
    apiRef.current.renderTracks([tracks[index]])
  }, [tracks])

  const handleSpeedChange = useCallback((speed: number) => {
    if (!apiRef.current) return
    setPlaybackSpeed(speed)
    apiRef.current.playbackSpeed = speed
  }, [])

  const handleMetronomeToggle = useCallback(() => {
    if (!apiRef.current) return
    const next = !metronomeOn
    setMetronomeOn(next)
    apiRef.current.metronomeVolume = next ? 1 : 0
  }, [metronomeOn])

  const handleCountInToggle = useCallback(() => {
    if (!apiRef.current) return
    const next = !countIn
    setCountIn(next)
    apiRef.current.countInVolume = next ? 1 : 0
  }, [countIn])

  const handleLoopToggle = useCallback(() => {
    if (!apiRef.current) return
    setLoopOn(prev => !prev)
    apiRef.current.isLooping = !loopOn
  }, [loopOn])

  const handleMuteToggle = useCallback(() => {
    if (!apiRef.current) return
    const next = !muted
    setMuted(next)
    apiRef.current.masterVolume = next ? 0 : 1
  }, [muted])

  // Mixer: alterar volume de uma track
  const handleTrackVolume = useCallback((trackIndex: number, volume: number) => {
    if (!apiRef.current || !tracks[trackIndex]) return
    setTrackVolumes(prev => ({ ...prev, [trackIndex]: volume }))
    apiRef.current.changeTrackVolume([tracks[trackIndex]], volume)
  }, [tracks])

  // Mixer: toggle mute de uma track
  const handleTrackMute = useCallback((trackIndex: number) => {
    if (!apiRef.current || !tracks[trackIndex]) return
    const next = !trackMutes[trackIndex]
    setTrackMutes(prev => ({ ...prev, [trackIndex]: next }))
    apiRef.current.changeTrackMute([tracks[trackIndex]], next)
  }, [tracks, trackMutes])

  // Mixer: toggle solo de uma track
  const handleTrackSolo = useCallback((trackIndex: number) => {
    if (!apiRef.current || !tracks[trackIndex]) return
    const next = !trackSolos[trackIndex]
    setTrackSolos(prev => ({ ...prev, [trackIndex]: next }))
    apiRef.current.changeTrackSolo([tracks[trackIndex]], next)
  }, [tracks, trackSolos])

  // Gerar PDF da tablatura — expande container temporariamente para captura completa
  const handleGeneratePdf = useCallback(async () => {
    const el = mainRef.current
    const viewport = viewportRef.current
    if (!el || !viewport) return

    setGeneratingPdf(true)
    try {
      // Salvar estilos originais do viewport (overflow/maxHeight limitam a área visível)
      const origOverflow = viewport.style.overflow
      const origMaxHeight = viewport.style.maxHeight
      const parentEl = viewport.parentElement
      const origParentMaxHeight = parentEl?.style.maxHeight ?? ''

      // Expandir temporariamente para capturar TODO o conteúdo
      viewport.style.overflow = 'visible'
      viewport.style.maxHeight = 'none'
      if (parentEl) parentEl.style.maxHeight = 'none'

      // Aguardar reflow
      await new Promise(r => setTimeout(r, 100))

      const title = songTitle || 'Tablatura'
      const artist = songArtist ? ` - ${songArtist}` : ''
      const filename = `${title}${artist}`.replace(/[^a-zA-Z0-9À-ÿ\s\-_]/g, '').trim()

      await generatePdfFromElement(el, { filename, margin: 8, scale: 2 })
      toast.success('PDF da tablatura gerado com sucesso!')

      // Restaurar estilos originais
      viewport.style.overflow = origOverflow
      viewport.style.maxHeight = origMaxHeight
      if (parentEl) parentEl.style.maxHeight = origParentMaxHeight
    } catch (e: any) {
      toast.error('Erro ao gerar PDF: ' + (e?.message ?? ''))
      if (viewportRef.current) {
        viewportRef.current.style.overflow = 'auto'
        viewportRef.current.style.maxHeight = ''
      }
    } finally {
      setGeneratingPdf(false)
    }
  }, [songTitle, songArtist])

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
    <div className={`flex flex-col bg-surface rounded-xl border border-border overflow-hidden ${className}`} style={{ maxHeight: '70vh' }}>
      {/* Barra superior: info da música + tracks + PDF */}
      {(songTitle || tracks.length > 1 || (!loading && !error)) && (
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

          {/* Botão Gerar PDF */}
          {!loading && !error && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 text-[11px] border-accent/30 text-accent hover:bg-accent/10 ml-auto"
              onClick={handleGeneratePdf}
              disabled={generatingPdf}
            >
              {generatingPdf ? (
                <SpinnerGap size={13} className="animate-spin" />
              ) : (
                <FilePdf size={13} weight="fill" />
              )}
              {generatingPdf ? 'Gerando...' : 'Gerar PDF'}
            </Button>
          )}
        </div>
      )}

      {/* Viewport com a tablatura renderizada */}
      <div
        ref={viewportRef}
        className="relative overflow-auto flex-1 min-h-0"
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

      {/* ====== Mixer de tracks (expansível) ====== */}
      {!loading && !error && mixerOpen && tracks.length > 0 && (
        <div className="border-t border-border bg-background/90 backdrop-blur-sm px-3 py-2 max-h-[200px] overflow-y-auto">
          <div className="space-y-1">
            {tracks.map((track, i) => {
              const vol = trackVolumes[i] ?? 1
              const isMuted = trackMutes[i] ?? false
              const isSolo = trackSolos[i] ?? false
              const isActive = i === activeTrackIndex
              return (
                <div
                  key={i}
                  className={`flex items-center gap-2 px-2 py-1 rounded-lg transition-colors ${
                    isActive ? 'bg-accent/10 border border-accent/20' : 'hover:bg-surface-hover'
                  }`}
                >
                  {/* Nome da track (clicável para trocar visualização) */}
                  <button
                    className={`text-[11px] font-medium truncate w-[130px] text-left ${
                      isActive ? 'text-accent' : 'text-text2 hover:text-text'
                    }`}
                    onClick={() => handleTrackChange(i)}
                    title={track.name || `Track ${i + 1}`}
                  >
                    {track.name || `Track ${i + 1}`}
                  </button>

                  {/* Botão Solo */}
                  <button
                    className={`text-[9px] font-bold w-5 h-5 rounded flex items-center justify-center transition-colors ${
                      isSolo
                        ? 'bg-yellow-500/90 text-black'
                        : 'bg-border/50 text-text3 hover:bg-border'
                    }`}
                    onClick={() => handleTrackSolo(i)}
                    title={isSolo ? 'Desativar solo' : 'Solo'}
                  >
                    S
                  </button>

                  {/* Botão Mute */}
                  <button
                    className={`text-[9px] font-bold w-5 h-5 rounded flex items-center justify-center transition-colors ${
                      isMuted
                        ? 'bg-red-500/90 text-white'
                        : 'bg-border/50 text-text3 hover:bg-border'
                    }`}
                    onClick={() => handleTrackMute(i)}
                    title={isMuted ? 'Desmutar' : 'Mutar'}
                  >
                    M
                  </button>

                  {/* Ícone volume */}
                  <button
                    className="text-text3 hover:text-text flex-shrink-0"
                    onClick={() => handleTrackMute(i)}
                    title={isMuted ? 'Desmutar' : 'Mutar'}
                  >
                    {isMuted ? <SpeakerSimpleSlash size={13} /> : <SpeakerSimpleHigh size={13} />}
                  </button>

                  {/* Slider de volume */}
                  <input
                    type="range"
                    min={0}
                    max={1.6}
                    step={0.05}
                    value={vol}
                    onChange={e => handleTrackVolume(i, parseFloat(e.target.value))}
                    className="flex-1 h-1 accent-accent cursor-pointer"
                    title={`Volume: ${Math.round(vol * 100)}%`}
                    style={{ minWidth: 60 }}
                  />

                  {/* Porcentagem */}
                  <span className="text-[9px] text-text3 font-mono w-8 text-right">
                    {Math.round(vol * 100)}%
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ====== Player MIDI — barra inferior fixa ====== */}
      {!loading && !error && (
        <div className="border-t border-border bg-background/80 backdrop-blur-sm px-3 py-1 space-y-0.5">
          {/* Barra de progresso */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-text3 font-mono w-10 text-right">{currentTime}</span>
            <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[10px] text-text3 font-mono w-10">{totalTime}</span>
          </div>

          {/* Controles */}
          <div className="flex items-center gap-1.5">
            {/* Play/Pause */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full"
              onClick={handlePlayPause}
              disabled={!playerReady}
              title={playerState === 'playing' ? 'Pausar' : 'Tocar'}
            >
              {!playerReady ? (
                <SpinnerGap size={16} className="animate-spin text-text3" />
              ) : playerState === 'playing' ? (
                <Pause size={16} weight="fill" />
              ) : (
                <Play size={16} weight="fill" />
              )}
            </Button>

            {/* Stop */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleStop}
              disabled={!playerReady || playerState === 'stopped'}
              title="Parar"
            >
              <Stop size={14} weight="fill" />
            </Button>

            {/* Separador */}
            <div className="w-px h-5 bg-border mx-1" />

            {/* Velocidade */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-text3 font-medium">Vel:</span>
              <Select value={String(playbackSpeed)} onValueChange={v => handleSpeedChange(parseFloat(v))}>
                <SelectTrigger className="h-6 text-[10px] w-[72px] px-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2].map(s => (
                    <SelectItem key={s} value={String(s)} className="text-[10px]">
                      {s === 1 ? '1× Normal' : `${s}×`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Separador */}
            <div className="w-px h-5 bg-border mx-1" />

            {/* Metrônomo */}
            <Button
              variant="ghost"
              size="icon"
              className={`h-7 w-7 ${metronomeOn ? 'text-accent bg-accent/10' : 'text-text3'}`}
              onClick={handleMetronomeToggle}
              title={metronomeOn ? 'Desligar metrônomo' : 'Ligar metrônomo'}
            >
              <Metronome size={14} />
            </Button>

            {/* Count-in */}
            <Button
              variant="ghost"
              size="sm"
              className={`h-7 px-2 text-[10px] ${countIn ? 'text-accent bg-accent/10' : 'text-text3'}`}
              onClick={handleCountInToggle}
              title={countIn ? 'Desligar contagem' : 'Contagem de entrada'}
            >
              1-2-3
            </Button>

            {/* Loop */}
            <Button
              variant="ghost"
              size="icon"
              className={`h-7 w-7 ${loopOn ? 'text-accent bg-accent/10' : 'text-text3'}`}
              onClick={handleLoopToggle}
              title={loopOn ? 'Desligar loop' : 'Repetir'}
            >
              <Repeat size={14} />
            </Button>

            {/* Mixer toggle */}
            {tracks.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className={`h-7 w-7 ml-auto ${mixerOpen ? 'text-accent bg-accent/10' : 'text-text3'}`}
                onClick={() => setMixerOpen(prev => !prev)}
                title={mixerOpen ? 'Fechar mixer' : 'Abrir mixer de volumes'}
              >
                <Faders size={14} />
              </Button>
            )}

            {/* Volume / Mute */}
            <Button
              variant="ghost"
              size="icon"
              className={`h-7 w-7 ${tracks.length <= 1 ? 'ml-auto' : ''} ${muted ? 'text-red-400' : 'text-text3'}`}
              onClick={handleMuteToggle}
              title={muted ? 'Ativar som' : 'Mutar'}
            >
              {muted ? <SpeakerSlash size={14} /> : <SpeakerHigh size={14} />}
            </Button>

            {/* Status */}
            {!playerReady && (
              <span className="text-[9px] text-text3/60 ml-1">Carregando player...</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
