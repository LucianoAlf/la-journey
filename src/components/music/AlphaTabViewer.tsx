import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react'
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
  lines.push('\\tempo 120')
  lines.push('\\staff{tabs}')
  lines.push('\\tuning E4 B3 G3 D3 A2 E2')
  lines.push('\\instrument AcousticGuitarSteel')
  lines.push('\\ts 32 4')
  lines.push('.')

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

/** Handle exposto via ref pelo AlphaTabViewer */
export interface AlphaTabViewerHandle {
  /** Instância da API AlphaTab (null até inicializar) */
  api: alphaTabModule.AlphaTabApi | null
  /** Container DOM do viewer */
  container: HTMLDivElement | null
}

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
  /** Mostrar fórmula de compasso, barras e números (default: false) */
  showTimeSignature?: boolean
  /** Perfil de pauta: 'tab' (tablatura), 'score' (notação), 'scoreTab' (ambos). Default: 'tab' */
  staveProfile?: 'tab' | 'score' | 'scoreTab'
  /** Indica se o tex vem de uma grande pauta (piano) */
  grandStaffMode?: boolean
  /** Habilitar bounds de notas individuais para interação (default: false) */
  includeNoteBounds?: boolean
  /** Callback quando um beat é clicado */
  onBeatMouseDown?: (beat: alphaTabModule.model.Beat) => void
  /** Callback quando mouse move sobre um beat */
  onBeatMouseMove?: (beat: alphaTabModule.model.Beat) => void
  /** Callback quando uma nota é clicada */
  onNoteMouseDown?: (note: alphaTabModule.model.Note) => void
  /** Callback quando render termina */
  onRenderFinished?: () => void
}

/** CSS para limpar visualmente o alphaTab — esconde branding */
const CLEAN_TAB_CSS = `
  .at-viewer-clean .at-surface > div:last-child { display: none !important; }
  .at-viewer-clean { overflow: hidden; }
`

/** Limpeza DOM pós-render: esconde clef TAB, time signature, bar number, "Free time", branding */
function cleanupAlphaTabDom(container: HTMLDivElement | null, showTimeSignature = false) {
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
    if (!showTimeSignature) {
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
    }

    // Esconder textos: bar number (vermelho — sempre), "Free time" (só se não tem TS)
    const texts = svg.querySelectorAll('text')
    texts.forEach(t => {
      const content = t.textContent?.trim() || ''
      const fill = t.getAttribute('fill') || ''
      if (fill.includes('C80000') || fill.includes('c80000')) {
        ;(t as SVGElement).style.display = 'none'
      }
      if (!showTimeSignature && content.toLowerCase().includes('free time')) {
        ;(t as SVGElement).style.display = 'none'
      }
    })

    if (!showTimeSignature) {
      // Esconder paths (brackets de free time) — são curvas na região esquerda
      const paths = svg.querySelectorAll(':scope > path')
      paths.forEach(p => {
        ;(p as SVGElement).style.display = 'none'
      })
    }

    // Estender staff lines até a borda direita do SVG (linhas completas)
    // Filtrar apenas linhas que começam perto da margem esquerda (staff lines reais),
    // e esconder retângulos extras do diagrama de acorde (que começam mais à direita)
    const svgWidth = parseFloat(svg.getAttribute('width') || '0')
    if (svgWidth > 0) {
      const rects = svg.querySelectorAll(':scope > rect')
      rects.forEach(r => {
        const x = parseFloat(r.getAttribute('x') || '0')
        const w = parseFloat(r.getAttribute('width') || '0')
        const h = parseFloat(r.getAttribute('height') || '0')
        // Staff lines reais: retângulos finos que começam perto da margem esquerda
        // Não estender retângulos do diagrama de acorde (x >= 100)
        if (h > 0.3 && h < 2 && w > 30 && x < 100) {
          const rightEdge = x + w
          if (rightEdge < svgWidth - 5) {
            r.setAttribute('width', String(svgWidth - x))
          }
        }
      })
    }
  })
}

/**
 * Viewer leve de tablatura usando alphaTab — sem player, sem controles.
 * Mostra apenas a tablatura (TAB) limpa, sem pauta, sem barras, sem metadados.
 *
 * Suporta forwardRef para expor a API AlphaTab (para interação no editor de notação).
 * Reutiliza a instância quando apenas o tex muda (sem destruir/recriar).
 */
export const AlphaTabViewer = forwardRef<AlphaTabViewerHandle, AlphaTabViewerProps>(
  function AlphaTabViewerInner({
    tex,
    minHeight = 120,
    className = '',
    layout = 'page',
    scale = 0.8,
    showTimeSignature = false,
    staveProfile = 'tab',
    grandStaffMode = false,
    includeNoteBounds = false,
    onBeatMouseDown,
    onBeatMouseMove,
    onNoteMouseDown,
    onRenderFinished,
  }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    const apiRef = useRef<alphaTabModule.AlphaTabApi | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    // Refs estáveis para callbacks (evita re-criar API quando callbacks mudam)
    const onBeatMouseDownRef = useRef(onBeatMouseDown)
    onBeatMouseDownRef.current = onBeatMouseDown
    const onBeatMouseMoveRef = useRef(onBeatMouseMove)
    onBeatMouseMoveRef.current = onBeatMouseMove
    const onNoteMouseDownRef = useRef(onNoteMouseDown)
    onNoteMouseDownRef.current = onNoteMouseDown
    const onRenderFinishedRef = useRef(onRenderFinished)
    onRenderFinishedRef.current = onRenderFinished
    // Guardar config anterior para detectar se precisa recriar instância ou só atualizar tex
    const configKeyRef = useRef('')

    // Expor API via ref
    useImperativeHandle(ref, () => ({
      get api() { return apiRef.current },
      get container() { return containerRef.current },
    }), [])

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

    // Chave de configuração — quando muda, precisa recriar a instância
    const configKey = `${layout}|${scale}|${showTimeSignature}|${staveProfile}|${grandStaffMode}|${includeNoteBounds}`

    // Criar/recriar instância quando config muda
    useEffect(() => {
      if (!containerRef.current) return

      // Destruir instância anterior
      if (apiRef.current) {
        apiRef.current.destroy()
        apiRef.current = null
      }

      const settings = new alphaTabModule.Settings()
      settings.core.fontDirectory = window.location.origin + '/font/'
      settings.core.tex = true
      // Habilitar bounds de notas individuais para interação
      settings.core.includeNoteBounds = includeNoteBounds

      // Layout page → preenche a largura do container
      settings.display.layoutMode = layout === 'horizontal'
        ? alphaTabModule.LayoutMode.Horizontal
        : alphaTabModule.LayoutMode.Page
      settings.display.scale = scale
      // Espaçamento entre sistemas (linhas) no layout page
      settings.display.systemPaddingBottom = 20
      const isScoreMode = staveProfile === 'score' || staveProfile === 'scoreTab'
      // Perfil de pauta: tab (tablatura), score (notação), scoreTab (ambos)
      settings.display.staveProfile =
        staveProfile === 'score' ? alphaTabModule.StaveProfile.Score :
        staveProfile === 'scoreTab' ? alphaTabModule.StaveProfile.ScoreTab :
        alphaTabModule.StaveProfile.Tab

      // Sem player (leve)
      settings.player.enablePlayer = false
      settings.player.enableCursor = false

      // Mostrar hastes/stems quando tem fórmula de compasso, esconder quando livre
      settings.notation.rhythmMode = isScoreMode
        ? alphaTabModule.TabRhythmMode.ShowWithBars
        : showTimeSignature
          ? alphaTabModule.TabRhythmMode.ShowWithBars
          : alphaTabModule.TabRhythmMode.Hidden
      // Modo SongBook: mais limpo
      settings.notation.notationMode = alphaTabModule.NotationMode.SongBook

      // ── Esconder elementos visuais desnecessários ──
      const NE = alphaTabModule.NotationElement
      const elements = settings.notation.elements
      // Metadados do score — sempre esconder (mostramos na UI)
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
      elements.set(NE.TrackNames, isScoreMode) // mostrar nome do track em score
      // Efeitos — no modo score, mostrar dinâmicas e crescendo
      elements.set(NE.EffectTempo, false)
      elements.set(NE.EffectDynamics, isScoreMode)
      elements.set(NE.EffectPickStroke, true)
      elements.set(NE.EffectCrescendo, isScoreMode)
      elements.set(NE.EffectFreeTime, false)
      // Número de compasso — mostrar no modo score com time signature
      elements.set(NE.BarNumber, isScoreMode && showTimeSignature)

      const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
        || document.documentElement.classList.contains('dark')
      const res = settings.display.resources
      // Barras de compasso: visíveis quando tem fórmula, invisíveis quando livre
      if (!showTimeSignature) {
        res.barSeparatorColor = new alphaTabModule.model.Color(0, 0, 0, 0)
      } else {
        // Cor das barras de compasso — sutil
        res.barSeparatorColor = isDark
          ? new alphaTabModule.model.Color(120, 130, 150, 200)
          : new alphaTabModule.model.Color(148, 163, 184, 220)
      }
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
        for (let i = 0; i < score.masterBars.length; i++) {
          const mb = score.masterBars[i]
          // Só marcar free time se NÃO tem fórmula de compasso
          if (!showTimeSignature) {
            mb.isFreeTime = true
          }
          // Limpar tempo automations para não mostrar BPM
          mb.tempoAutomations = []
        }
        // Limpar dinâmicas em todos os beats — apenas no modo tab
        // No modo score, preservar dinâmicas para exibição
        if (!isScoreMode) {
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
        }
      })

      api.renderFinished.on(() => {
        setLoading(false)
        // Delay para garantir que SVGs estejam no DOM
        setTimeout(() => cleanupAlphaTabDom(containerRef.current, showTimeSignature), 50)
        // Callback externo
        onRenderFinishedRef.current?.()
      })

      api.error.on((e: any) => {
        console.error('[AlphaTabViewer] Erro:', e)
        setError(e?.message || String(e) || 'Erro ao renderizar tablatura')
        setLoading(false)
      })

      // Registrar eventos de interação (usam refs estáveis — não recriam a API)
      api.beatMouseDown.on((beat) => {
        onBeatMouseDownRef.current?.(beat)
      })
      api.beatMouseMove.on((beat) => {
        onBeatMouseMoveRef.current?.(beat)
      })
      api.noteMouseDown.on((note) => {
        onNoteMouseDownRef.current?.(note)
      })

      // Carregar tex inicial (se disponível)
      if (tex) {
        setLoading(true)
        setError(null)
        api.tex(tex)
      }

      configKeyRef.current = configKey

      return () => {
        api.destroy()
        apiRef.current = null
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [configKey]) // Recriar instância SOMENTE quando a config muda

    // Atualizar tex na instância existente (sem destruir/recriar)
    useEffect(() => {
      // Pular se a config acabou de mudar (o useEffect acima já carregou o tex)
      if (configKeyRef.current !== configKey) return
      const api = apiRef.current
      if (!api || !tex) return

      setLoading(true)
      setError(null)
      api.tex(tex)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tex]) // Só quando tex muda (config fica no outro effect)

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
  },
)
