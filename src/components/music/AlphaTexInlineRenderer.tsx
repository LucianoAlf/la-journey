import { useRef, useEffect, useState } from 'react'
import * as alphaTabModule from '@coderline/alphatab'
import { SpinnerGap } from '@phosphor-icons/react'

function normalizeAlphaTex(input: string) {
  let tex = input.trim()

  tex = tex
    .replace(/:w\b/g, ':1')
    .replace(/:h\b/g, ':2')
    .replace(/:q\b/g, ':4')

  tex = tex
    .replace(/\\ts\s+(\d+)\s*[\/xX]\s*(\d+)/g, '\\ts $1 $2')
    .replace(/\\time\s+(\d+)\s*[\/xX]\s*(\d+)/g, '\\ts $1 $2')

  tex = tex
    .replace(/:(1|2|4|8|16|32|64)dd\s+(\([^)]+\)|r|[a-gA-G][#bn]?\d)/g, ':$1 $2{dd}')
    .replace(/:(1|2|4|8|16|32|64)d\s+(\([^)]+\)|r|[a-gA-G][#bn]?\d)/g, ':$1 $2{d}')

  tex = tex
    .replace(/\{t\}/g, '{-}')
    .replace(/\{tie\}/g, '{-}')
    .replace(/\{dot\}/g, '{d}')
    .replace(/\{ddot\}/g, '{dd}')

  if (!/\\title\s+"[^"]+"/.test(tex)) {
    tex = `\\title "Preview" ${tex}`
  }

  if (!/\\tempo\s+\d+/.test(tex)) {
    tex = tex.replace(/^(\\title\s+"[^"]+")\s*/, '$1 \\tempo 80 ')
  }

  if (!/^\s*\.\s*$/m.test(tex)) {
    tex = tex.replace(
      /^(\s*(?:\\title\s+"[^"]+"\s*)?(?:\\subtitle\s+"[^"]+"\s*)?(?:\\tempo\s+\d+\s*)?(?:\\ts\s+\d+\s+\d+\s*)?(?:\\ks\s+[A-G][b#]?\s*)?(?:\\clef\s+\w+\s*)?(?:\\track\b[^\n]*\s*)?(?:\\staff\{[^}]+\}\s*)?(?:\\tuning\s+[^\n]+\s*)?)/,
      '$1.\n',
    )
  }

  return tex
}

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
  /** Quando true, desativa interação do DOM renderizado para o clique cair no container pai */
  pointerEvents?: 'auto' | 'none'
  /** Espaçamento inferior entre sistemas */
  systemPaddingBottom?: number
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
  pointerEvents = 'auto',
  systemPaddingBottom = 10,
}: AlphaTexInlineRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<alphaTabModule.AlphaTabApi | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const normalizedTex = normalizeAlphaTex(tex)
  const hasExplicitTimeSignature = /\\ts\s+\d+\s+\d+/.test(normalizedTex)

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
    if (!containerRef.current || !normalizedTex) return

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

    // Layout horizontal — evita quebrar em múltiplos sistemas cedo demais no preview
    settings.display.layoutMode = alphaTabModule.LayoutMode.Horizontal
    settings.display.scale = scale
    settings.display.systemPaddingBottom = systemPaddingBottom

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
    elements.set(NE.EffectDynamics, false)
    elements.set(NE.EffectCrescendo, false)
    elements.set(NE.EffectFreeTime, false)
    elements.set(NE.BarNumber, false)

    // Cores adaptáveis ao tema — detecta pelo container pai para ser mais preciso
    const containerEl = containerRef.current
    const containerBg = containerEl
      ? window.getComputedStyle(containerEl).backgroundColor
      : ''
    const isTransparentOrLight = !containerBg
      || containerBg === 'rgba(0, 0, 0, 0)'
      || containerBg === 'transparent'
      || containerBg.includes('255')
    const isDark = !isTransparentOrLight && (
      document.documentElement.getAttribute('data-theme') === 'dark'
      || document.documentElement.classList.contains('dark')
    )
    const res = settings.display.resources
    if (isDark) {
      res.mainGlyphColor = new alphaTabModule.model.Color(220, 225, 235, 255)
      res.secondaryGlyphColor = new alphaTabModule.model.Color(150, 160, 180, 255)
      res.staffLineColor = new alphaTabModule.model.Color(80, 90, 110, 255)
    } else {
      res.mainGlyphColor = new alphaTabModule.model.Color(10, 10, 10, 255)
      res.secondaryGlyphColor = new alphaTabModule.model.Color(60, 60, 70, 255)
      res.staffLineColor = new alphaTabModule.model.Color(120, 125, 135, 255)
    }

    const api = new alphaTabModule.AlphaTabApi(containerRef.current, settings)
    apiRef.current = api

    api.scoreLoaded.on((score: any) => {
      for (const masterBar of score.masterBars) {
        masterBar.isFreeTime = !hasExplicitTimeSignature
        masterBar.tempoAutomations = []
      }
    })

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

    api.tex(normalizedTex)

    return () => {
      api.destroy()
      apiRef.current = null
    }
  }, [normalizedTex, staveProfile, scale, systemPaddingBottom])

  if (!normalizedTex) return null

  return (
    <div
      className={`relative at-inline-clean notation-container ${className}`}
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
        style={{ minHeight, pointerEvents }}
      />
    </div>
  )
}
