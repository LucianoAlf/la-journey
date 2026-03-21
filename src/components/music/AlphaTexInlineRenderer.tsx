import { useRef, useEffect, useState } from 'react'
import * as alphaTabModule from '@coderline/alphatab'
import { SpinnerGap } from '@phosphor-icons/react'

/**
 * Renderer inline leve de AlphaTex — sem player, sem soundfont, sem cursor.
 * Ideal para cards de biblioteca, MaterialPreview e qualquer lugar que
 * precisa mostrar notação de pauta de forma estática e leve.
 *
 * Diferente do AlphaTabViewer completo:
 * - Sem player (enablePlayer=false, enableCursor=false)
 * - Sem cleanup DOM agressivo
 * - Suporta score, tab ou scoreTab
 * - Esconde metadados (título, artista, etc.)
 * - Esconde branding
 */

interface AlphaTexInlineRendererProps {
  /** Conteúdo AlphaTex para renderizar */
  tex: string
  /** Largura máxima em pixels */
  width?: number
  /** Altura mínima */
  minHeight?: number
  /** Perfil de pauta: 'score' (notação), 'tab' (tablatura), 'scoreTab' (ambos). Default: 'score' */
  staveProfile?: 'tab' | 'score' | 'scoreTab'
  /** Escala de renderização (default: 0.7) */
  scale?: number
  /** Classe CSS adicional */
  className?: string
}

/** CSS para esconder branding */
const INLINE_CSS = `
  .at-inline-clean .at-surface > div:last-child { display: none !important; }
  .at-inline-clean { overflow: hidden; }
`

export function AlphaTexInlineRenderer({
  tex,
  width,
  minHeight = 80,
  staveProfile = 'score',
  scale = 0.7,
  className = '',
}: AlphaTexInlineRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<alphaTabModule.AlphaTabApi | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Injetar CSS uma vez
  useEffect(() => {
    const id = 'at-inline-clean-css'
    if (!document.getElementById(id)) {
      const style = document.createElement('style')
      style.id = id
      style.textContent = INLINE_CSS
      document.head.appendChild(style)
    }
  }, [])

  useEffect(() => {
    if (!containerRef.current || !tex) return

    setLoading(true)
    setError(null)

    // Destruir instância anterior
    if (apiRef.current) {
      apiRef.current.destroy()
      apiRef.current = null
    }

    const settings = new alphaTabModule.Settings()
    settings.core.fontDirectory = window.location.origin + '/font/'
    settings.core.tex = true

    // Layout page — preenche largura do container
    settings.display.layoutMode = alphaTabModule.LayoutMode.Page
    settings.display.scale = scale
    settings.display.systemPaddingBottom = 10

    // Perfil de pauta
    settings.display.staveProfile =
      staveProfile === 'score' ? alphaTabModule.StaveProfile.Score :
      staveProfile === 'scoreTab' ? alphaTabModule.StaveProfile.ScoreTab :
      alphaTabModule.StaveProfile.Tab

    // Sem player (leve — sem soundfont)
    settings.player.enablePlayer = false
    settings.player.enableCursor = false

    // Esconder metadados
    const NE = alphaTabModule.NotationElement
    const elements = settings.notation.elements
    elements.set(NE.ScoreTitle, false)
    elements.set(NE.ScoreSubTitle, false)
    elements.set(NE.ScoreArtist, false)
    elements.set(NE.ScoreAlbum, false)
    elements.set(NE.ScoreWords, false)
    elements.set(NE.ScoreMusic, false)
    elements.set(NE.ScoreWordsAndMusic, false)
    elements.set(NE.ScoreCopyright, false)
    elements.set(NE.GuitarTuning, false)
    elements.set(NE.TrackNames, false)
    elements.set(NE.EffectTempo, false)
    elements.set(NE.EffectFreeTime, false)
    elements.set(NE.BarNumber, false)

    // Cores adaptáveis ao tema
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
      || document.documentElement.classList.contains('dark')
    const res = settings.display.resources
    if (isDark) {
      res.mainGlyphColor = new alphaTabModule.model.Color(220, 225, 235, 255)
      res.secondaryGlyphColor = new alphaTabModule.model.Color(150, 160, 180, 255)
      res.staffLineColor = new alphaTabModule.model.Color(80, 90, 110, 255)
    } else {
      res.mainGlyphColor = new alphaTabModule.model.Color(30, 30, 40, 255)
      res.secondaryGlyphColor = new alphaTabModule.model.Color(100, 100, 120, 255)
      res.staffLineColor = new alphaTabModule.model.Color(180, 185, 195, 255)
    }

    const api = new alphaTabModule.AlphaTabApi(containerRef.current, settings)
    apiRef.current = api

    api.renderFinished.on(() => {
      setLoading(false)
      // Esconder branding
      if (containerRef.current) {
        const surface = containerRef.current.querySelector('.at-surface')
        if (surface) {
          const children = surface.children
          for (let i = children.length - 1; i >= 0; i--) {
            const child = children[i] as HTMLElement
            if (child.textContent?.includes('rendered by alphaTab')) {
              child.style.display = 'none'
            }
          }
        }
      }
    })

    api.error.on((e: any) => {
      console.error('[AlphaTexInlineRenderer] Erro:', e)
      setError(e?.message || String(e) || 'Erro ao renderizar')
      setLoading(false)
    })

    api.tex(tex)

    return () => {
      api.destroy()
      apiRef.current = null
    }
  }, [tex, staveProfile, scale])

  if (!tex) return null

  return (
    <div
      className={`relative at-inline-clean ${className}`}
      style={{ maxWidth: width }}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-card/80 z-10 rounded-lg">
          <SpinnerGap size={18} className="animate-spin text-muted-foreground" />
        </div>
      )}
      {error && (
        <div className="text-[10px] text-destructive p-1">{error}</div>
      )}
      <div
        ref={containerRef}
        className="w-full"
        style={{ minHeight }}
      />
    </div>
  )
}
