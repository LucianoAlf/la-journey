import { useRef, useEffect, useState } from 'react'
import * as alphaTabModule from '@coderline/alphatab'
import { SpinnerGap } from '@phosphor-icons/react'
import type { FretboardNote } from './GuitarFretboardDiagram'

// ── Conversão FretboardNote[] → alphaTex ──────────────────────────────

/**
 * Converte notas do fretboard (escala/arpejo) em alphaTex.
 * Cada nota é um beat individual (sequencial, não acordes).
 * Ordem: corda grave → aguda (6→1), traste crescente dentro de cada corda.
 */
export function notesToAlphaTex(
  notes: FretboardNote[],
  _title?: string,
): string {
  if (notes.length === 0) return ''

  // Ordenar: corda grave (6) → aguda (1), depois traste crescente
  const sorted = [...notes].sort((a, b) => {
    if (a.string !== b.string) return b.string - a.string // 6 primeiro (grave)
    return a.fret - b.fret
  })

  // Header alphaTex — mínimo necessário
  const lines: string[] = []
  lines.push('\\tuning(E4 B3 G3 D3 A2 E2)')
  lines.push('\\instrument(AcousticGuitarSteel)')
  lines.push('\\tempo(120)')
  lines.push('\\staff{tabs}')
  lines.push('\\ts(32 4)')

  // Cada nota = um beat individual (semínima)
  const texBeats: string[] = []
  for (const n of sorted) {
    texBeats.push(`${n.fret}.${n.string}.4`)
  }

  // Agrupar em compassos de 32 beats (32/4 — máximo permitido)
  const bars: string[] = []
  for (let i = 0; i < texBeats.length; i += 32) {
    bars.push(texBeats.slice(i, i + 32).join(' '))
  }
  lines.push(bars.join(' | \n'))

  return lines.join('\n')
}

// ── Componente AlphaTabViewer ──────────────────────────────────────────

interface AlphaTabViewerProps {
  /** Conteúdo alphaTex para renderizar */
  tex: string
  /** Altura mínima */
  minHeight?: number
  /** Classe CSS adicional */
  className?: string
  /** Layout horizontal (scrollar) ou vertical (página) */
  layout?: 'horizontal' | 'page'
  /** Escala de renderização (default: 0.8) */
  scale?: number
}

/** CSS para limpar visualmente o alphaTab — esconde branding */
const CLEAN_TAB_CSS = `
  .at-viewer-clean .at-surface > div:last-child { display: none !important; }
  .at-viewer-clean { overflow: hidden; }
`

/** Limpeza DOM pós-render: esconde clef TAB, time signature, bar number, "Free time", branding */
function cleanupAlphaTabDom(container: HTMLDivElement | null) {
  if (!container) return

  // Remover texto "rendered by alphaTab"
  const surface = container.querySelector('.at-surface')
  if (surface) {
    const children = surface.children
    for (let i = children.length - 1; i >= 0; i--) {
      const child = children[i] as HTMLElement
      if (child.textContent?.includes('rendered by alphaTab')) {
        child.style.display = 'none'
      }
    }
  }

  // Limpar SVGs: esconder clef TAB, time signature, bar number, "Free time"
  const svgs = container.querySelectorAll('svg')
  svgs.forEach(svg => {
    // Esconder time signature glyphs (translateX 65..110) mas MANTER TAB clef (translateX < 65)
    const gElements = svg.querySelectorAll(':scope > g[transform]')
    gElements.forEach(g => {
      const transform = g.getAttribute('transform') || ''
      const match = transform.match(/translate\(\s*([\d.]+)/)
      if (match) {
        const tx = parseFloat(match[1])
        // Time signature fica na faixa 65-110; TAB clef fica em ~50
        if (tx >= 65 && tx < 110) {
          ;(g as SVGElement).style.display = 'none'
        }
      }
    })

    // Esconder textos: bar number (vermelho), "Free time"
    const texts = svg.querySelectorAll('text')
    texts.forEach(t => {
      const content = t.textContent?.trim() || ''
      const fill = t.getAttribute('fill') || ''
      if (fill.includes('C80000') || fill.includes('c80000')) {
        ;(t as SVGElement).style.display = 'none'
      }
      if (content.toLowerCase().includes('free time')) {
        ;(t as SVGElement).style.display = 'none'
      }
    })

    // Esconder paths (brackets de free time) — são curvas na região esquerda
    const paths = svg.querySelectorAll(':scope > path')
    paths.forEach(p => {
      // Brackets de free time são os únicos <path> diretos no SVG
      ;(p as SVGElement).style.display = 'none'
    })

    // Estender staff lines de x=0 até a borda direita do SVG (full width)
    const svgWidth = parseFloat(svg.getAttribute('width') || '0')
    if (svgWidth > 0) {
      const rects = svg.querySelectorAll(':scope > rect')
      rects.forEach(r => {
        const x = parseFloat(r.getAttribute('x') || '0')
        const w = parseFloat(r.getAttribute('width') || '0')
        const h = parseFloat(r.getAttribute('height') || '0')
        // Staff lines: começam em x~35, height ~0.9 (linhas finas)
        if (x >= 30 && x <= 40 && h > 0.5 && h < 2 && w > 50) {
          r.setAttribute('x', '0')
          r.setAttribute('width', String(svgWidth))
        }
      })
    }
  })
}

/**
 * Viewer leve de tablatura usando alphaTab — sem player, sem controles.
 * Mostra apenas a tablatura (TAB) limpa, sem pauta, sem barras, sem metadados.
 */
export function AlphaTabViewer({
  tex,
  minHeight = 120,
  className = '',
  layout = 'page',
  scale = 0.8,
}: AlphaTabViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<alphaTabModule.AlphaTabApi | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Injetar CSS uma vez
  useEffect(() => {
    const id = 'at-viewer-clean-css'
    if (!document.getElementById(id)) {
      const style = document.createElement('style')
      style.id = id
      style.textContent = CLEAN_TAB_CSS
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

    // Layout page → preenche a largura do container
    settings.display.layoutMode = layout === 'horizontal'
      ? alphaTabModule.LayoutMode.Horizontal
      : alphaTabModule.LayoutMode.Page
    settings.display.scale = scale
    // Forçar apenas tablatura (sem pauta standard)
    settings.display.staveProfile = alphaTabModule.StaveProfile.Tab

    // Sem player (leve)
    settings.player.enablePlayer = false
    settings.player.enableCursor = false

    // Esconder hastes/stems das notas na tab
    settings.notation.rhythmMode = alphaTabModule.TabRhythmMode.Hidden
    // Modo SongBook: mais limpo
    settings.notation.notationMode = alphaTabModule.NotationMode.SongBook

    // ── Esconder elementos visuais desnecessários ──
    const NE = alphaTabModule.NotationElement
    const elements = settings.notation.elements
    // Metadados do score
    elements.set(NE.ScoreTitle, false)
    elements.set(NE.ScoreSubTitle, false)
    elements.set(NE.ScoreArtist, false)
    elements.set(NE.ScoreAlbum, false)
    elements.set(NE.ScoreWords, false)
    elements.set(NE.ScoreMusic, false)
    elements.set(NE.ScoreWordsAndMusic, false)
    elements.set(NE.ScoreCopyright, false)
    // Track/tuning info
    elements.set(NE.GuitarTuning, false)
    elements.set(NE.TrackNames, false)
    // Efeitos
    elements.set(NE.EffectTempo, false)
    elements.set(NE.EffectDynamics, false)
    elements.set(NE.EffectPickStroke, false)
    elements.set(NE.EffectCrescendo, false)
    elements.set(NE.EffectFreeTime, false)
    // Número de compasso, clef TAB, fórmula de compasso, barras
    elements.set(NE.BarNumber, false)

    // Esconder barras de compasso tornando-as transparentes
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
      || document.documentElement.classList.contains('dark')
    const res = settings.display.resources
    // Barras de compasso invisíveis
    res.barSeparatorColor = new alphaTabModule.model.Color(0, 0, 0, 0)
    if (isDark) {
      res.mainGlyphColor = new alphaTabModule.model.Color(220, 225, 235, 255)
      res.secondaryGlyphColor = new alphaTabModule.model.Color(150, 160, 180, 255)
      res.staffLineColor = new alphaTabModule.model.Color(80, 90, 110, 255)
      res.scoreInfoColor = new alphaTabModule.model.Color(200, 210, 225, 255)
    } else {
      res.mainGlyphColor = new alphaTabModule.model.Color(30, 30, 40, 255)
      res.secondaryGlyphColor = new alphaTabModule.model.Color(100, 100, 120, 255)
      res.staffLineColor = new alphaTabModule.model.Color(180, 185, 195, 255)
      res.scoreInfoColor = new alphaTabModule.model.Color(40, 40, 55, 255)
    }

    const api = new alphaTabModule.AlphaTabApi(containerRef.current, settings)
    apiRef.current = api

    // Manipular o modelo antes da renderização
    api.scoreLoaded.on((score: any) => {
      // Marcar todos os compassos como free time → remove barras de compasso
      for (let i = 0; i < score.masterBars.length; i++) {
        const mb = score.masterBars[i]
        mb.isFreeTime = true
        // Limpar tempo automations para não mostrar BPM
        mb.tempoAutomations = []
      }
      // Limpar dinâmicas em todos os beats
      for (const track of score.tracks) {
        for (const staff of track.staves) {
          for (const bar of staff.bars) {
            for (const voice of bar.voices) {
              for (const beat of voice.beats) {
                beat.dynamics = alphaTabModule.model.DynamicValue.F
              }
            }
          }
        }
      }
    })

    api.renderFinished.on(() => {
      setLoading(false)
      // Delay para garantir que SVGs estejam no DOM
      setTimeout(() => cleanupAlphaTabDom(containerRef.current), 50)
    })

    api.error.on((e: any) => {
      console.error('[AlphaTabViewer] Erro:', e)
      setError(e?.message || String(e) || 'Erro ao renderizar tablatura')
      setLoading(false)
    })

    // Carregar o tex
    api.tex(tex)

    return () => {
      api.destroy()
      apiRef.current = null
    }
  }, [tex, layout, scale])

  if (!tex) return null

  return (
    <div className={`relative at-viewer-clean ${className}`}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-card/80 z-10 rounded-xl">
          <SpinnerGap size={24} className="animate-spin text-accent" />
        </div>
      )}
      {error && (
        <div className="text-[11px] text-destructive p-2">{error}</div>
      )}
      <div
        ref={containerRef}
        className="w-full"
        style={{ minHeight }}
      />
    </div>
  )
}
