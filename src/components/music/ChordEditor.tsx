import { useRef, useEffect, useCallback, useState } from 'react'
import type { ChordPositions } from './ChordDiagram'
import { cn } from '@/lib/utils'

// ── Tipos ───────────────────────────────────────────────────────────────

interface Dot { s: number; f: number; finger: number }
interface Barre { fret: number; from: number; to: number; finger: number }
type OpenMuted = ('open' | 'muted' | null)[]

export interface ChordEditorState {
  dots: Dot[]
  openMuted: OpenMuted
  barres: Barre[]
}

export interface ChordEditorProps {
  state: ChordEditorState
  onChange: (state: ChordEditorState) => void
  chordName?: string
  startFret?: number
}

// ── Constantes ──────────────────────────────────────────────────────────

const S = 6, F = 7
const NAMES = ['E', 'A', 'D', 'G', 'B', 'e']
const PT = 40, PB = 10, PL = 30, PR = 10, NUT_H = 5
const MARKERS = [3, 5, 7, 9, 12]
const ACCENT = '#FF2D78'
const NECK_W = 260, NECK_H = 440
const PREV_W = 160, PREV_H = 210

// ── Helpers ─────────────────────────────────────────────────────────────

export function createEmptyState(): ChordEditorState {
  return { dots: [], openMuted: Array(S).fill(null), barres: [] }
}

/** Converte positions do banco → estado do editor */
export function positionsToState(positions: ChordPositions, startFret = 1): ChordEditorState {
  const state = createEmptyState()

  for (const finger of positions.fingers ?? []) {
    const [svgStr, fret, label] = finger
    const sIdx = 6 - svgStr
    if (sIdx < 0 || sIdx >= S) continue

    if (fret === 0) {
      state.openMuted[sIdx] = 'open'
    } else if (typeof fret === 'number' && fret >= startFret) {
      const localFret = fret - startFret
      if (localFret >= 0 && localFret < F) {
        state.dots.push({ s: sIdx, f: localFret, finger: label ? parseInt(label) || 0 : 0 })
      }
    }
  }

  for (const m of positions.muted ?? []) {
    const sIdx = 6 - m
    if (sIdx >= 0 && sIdx < S) state.openMuted[sIdx] = 'muted'
  }

  for (const b of positions.barres ?? []) {
    const localFret = b.fret - startFret
    if (localFret >= 0 && localFret < F) {
      state.barres.push({
        fret: localFret,
        from: 6 - b.fromString,
        to: 6 - b.toString,
        finger: 1,
      })
    }
  }

  return state
}

/** Converte estado do editor → formato positions do banco/SVGuitar */
export function stateToPositions(state: ChordEditorState, startFret = 1): ChordPositions {
  const fingers: ChordPositions['fingers'] = []
  const muted: number[] = []

  state.openMuted.forEach((status, i) => {
    const sv = 6 - i
    if (status === 'muted') muted.push(sv)
    else if (status === 'open') fingers.push([sv, 0])
  })

  state.dots.forEach(d => {
    const sv = 6 - d.s, fret = d.f + startFret
    d.finger ? fingers.push([sv, fret, String(d.finger)]) : fingers.push([sv, fret])
  })

  const barresOut = state.barres.map(b => ({
    fromString: 6 - b.from,
    toString: 6 - b.to,
    fret: b.fret + startFret,
  }))

  return { fingers, barres: barresOut, muted }
}

// ── Layout helpers ──────────────────────────────────────────────────────

function stringSpacing() { return (NECK_W - PL - PR) / (S - 1) }
function fretSpacing() { return (NECK_H - PT - NUT_H - PB) / F }
function stringX(s: number) { return PL + s * stringSpacing() }
function fretY(f: number) { return PT + NUT_H + f * fretSpacing() }
function cellY(f: number) { return fretY(f) + fretSpacing() / 2 }

// ── Hit testing ─────────────────────────────────────────────────────────

function findString(mx: number) {
  for (let s = 0; s < S; s++) if (Math.abs(mx - stringX(s)) < stringSpacing() / 2) return s
  return null
}

function findFret(my: number) {
  for (let f = 0; f < F; f++) if (Math.abs(my - cellY(f)) < fretSpacing() / 2) return f
  return null
}

function findDot(dots: Dot[], mx: number, my: number) {
  for (let i = dots.length - 1; i >= 0; i--) {
    const d = dots[i]
    const dx = mx - stringX(d.s), dy = my - cellY(d.f)
    if (dx * dx + dy * dy < 16 * 16) return i
  }
  return null
}

function findBarre(barres: Barre[], mx: number, my: number) {
  for (let i = barres.length - 1; i >= 0; i--) {
    const b = barres[i]
    const mn = Math.min(b.from, b.to), mxB = Math.max(b.from, b.to)
    const y = cellY(b.fret)
    if (my > y - 14 && my < y + 14 && mx > stringX(mn) - 14 && mx < stringX(mxB) + 14) return i
  }
  return null
}

// ── Canvas draw: Neck ───────────────────────────────────────────────────

function drawNeck(
  ctx: CanvasRenderingContext2D,
  dots: Dot[],
  openMuted: OpenMuted,
  barres: Barre[],
  startFret: number,
  hoveredDot: number | null,
  barreMode: boolean,
  barreFirst: { s: number; f: number } | null,
  isDark: boolean,
) {
  const c = ctx
  c.clearRect(0, 0, NECK_W, NECK_H)

  const txtMuted = isDark ? '#64748B' : '#94A3B8'
  const nutColor = isDark ? '#CBD5E1' : '#1a1a2e'
  const fretColor = isDark ? '#475569' : '#CBD5E1'
  const stringColorA = isDark ? '#A0A0A0' : '#6B7280'
  const stringColorB = isDark ? '#8B8B8B' : '#9CA3AF'
  const fretNumColor = isDark ? '#475569' : '#94A3B8'
  const markerColor = isDark ? 'rgba(71,85,105,0.25)' : 'rgba(148,163,184,0.3)'

  // Nomes das cordas
  c.font = '500 11px "DM Mono", monospace'
  c.textAlign = 'center'
  c.textBaseline = 'middle'
  for (let i = 0; i < S; i++) {
    c.fillStyle = txtMuted
    c.fillText(NAMES[i], stringX(i), 12)
  }

  // Open/Muted
  for (let i = 0; i < S; i++) {
    const x = stringX(i), y = 28
    if (openMuted[i] === 'open') {
      c.strokeStyle = '#22C55E'; c.lineWidth = 2
      c.beginPath(); c.arc(x, y, 7, 0, Math.PI * 2); c.stroke()
    } else if (openMuted[i] === 'muted') {
      c.fillStyle = '#EF4444'
      c.font = '700 14px "DM Sans", sans-serif'
      c.textAlign = 'center'; c.textBaseline = 'middle'
      c.fillText('✕', x, y)
    }
  }

  // Nut
  if (startFret === 1) {
    c.fillStyle = nutColor
    c.fillRect(PL - 2, PT, NECK_W - PL - PR + 4, NUT_H)
  }

  // Trastes
  for (let f = 1; f <= F; f++) {
    c.strokeStyle = fretColor; c.lineWidth = 1.5
    c.beginPath(); c.moveTo(PL - 2, fretY(f)); c.lineTo(PL + (S - 1) * stringSpacing() + 2, fretY(f)); c.stroke()
  }

  // Cordas com espessura variável
  for (let i = 0; i < S; i++) {
    c.strokeStyle = i < 3 ? stringColorA : stringColorB
    c.lineWidth = Math.max(2.5 - i * 0.3, 0.8)
    c.beginPath(); c.moveTo(stringX(i), PT + NUT_H); c.lineTo(stringX(i), fretY(F)); c.stroke()
  }

  // Números dos trastes
  c.fillStyle = fretNumColor
  c.font = '500 11px "DM Mono", monospace'
  c.textAlign = 'right'; c.textBaseline = 'middle'
  for (let f = 0; f < F; f++) c.fillText(String(f + startFret), PL - 10, cellY(f))

  // Marcadores de posição
  for (let f = 0; f < F; f++) {
    if (MARKERS.includes(f + startFret)) {
      c.fillStyle = markerColor
      c.beginPath(); c.arc((stringX(2) + stringX(3)) / 2, cellY(f), 4, 0, Math.PI * 2); c.fill()
    }
  }

  // Overlay modo pestana
  if (barreMode) {
    c.fillStyle = 'rgba(255,45,120,0.04)'
    c.fillRect(PL - 5, PT, (S - 1) * stringSpacing() + 10, F * fretSpacing())
  }
  if (barreFirst) {
    c.strokeStyle = ACCENT; c.lineWidth = 2; c.setLineDash([4, 4])
    c.beginPath(); c.arc(stringX(barreFirst.s), cellY(barreFirst.f), 16, 0, Math.PI * 2); c.stroke()
    c.setLineDash([])
  }

  // Pestanas (preta no light, cinza claro no dark)
  const barreColor = isDark ? '#cbd5e1' : '#1a1a2e'
  const barreTextColor = isDark ? '#0f172a' : '#ffffff'
  barres.forEach(b => {
    const mn = Math.min(b.from, b.to), mx = Math.max(b.from, b.to)
    const y = cellY(b.fret), x1 = stringX(mn), x2 = stringX(mx), bh = 18, r = bh / 2
    c.fillStyle = barreColor
    c.beginPath(); c.roundRect(x1 - r, y - r, (x2 - x1) + 2 * r, bh, r); c.fill()
    c.fillStyle = barreTextColor; c.font = '700 12px "DM Sans", sans-serif'
    c.textAlign = 'center'; c.textBaseline = 'middle'
    c.fillText(String(b.finger || 1), (x1 + x2) / 2, y)
  })

  // Bolinhas dos dedos (sem sombra)
  dots.forEach((d, i) => {
    const x = stringX(d.s), y = cellY(d.f), r = 14
    const isHov = hoveredDot === i

    c.fillStyle = isHov ? '#FF4D8E' : ACCENT
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill()

    // Número do dedo
    if (d.finger) {
      c.fillStyle = '#fff'; c.font = '700 13px "DM Sans", sans-serif'
      c.textAlign = 'center'; c.textBaseline = 'middle'
      c.fillText(String(d.finger), x, y)
    }
  })
}

// ── Canvas draw: Preview ────────────────────────────────────────────────

function drawPreview(
  ctx: CanvasRenderingContext2D,
  dots: Dot[],
  openMuted: OpenMuted,
  barres: Barre[],
  startFret: number,
  isDark: boolean,
) {
  const c = ctx
  c.clearRect(0, 0, PREV_W, PREV_H)

  const pt = 22, pr = 15
  const pl = startFret === 1 ? 15 : 30
  const nutY = pt + 4, fsp = 25
  const ssp = (PREV_W - pl - pr) / 5
  const px = (s: number) => pl + s * ssp
  const pfy = (f: number) => nutY + 4 + f * fsp

  const nutColor = isDark ? '#CBD5E1' : '#1a1a2e'
  const fretColor = isDark ? '#475569' : '#CBD5E1'
  const stringColor = isDark ? '#64748B' : '#9CA3AF'

  // Nut ou indicador de posição
  if (startFret === 1) {
    c.fillStyle = nutColor
    c.fillRect(pl - 1, nutY, PREV_W - pl - pr + 2, 3)
  } else {
    // Linha fina no lugar do nut
    c.strokeStyle = fretColor; c.lineWidth = 1
    c.beginPath(); c.moveTo(pl - 1, nutY + 1); c.lineTo(PREV_W - pr + 1, nutY + 1); c.stroke()
    // Indicador do traste à esquerda das cordas
    c.font = '600 10px "DM Mono", monospace'
    c.textAlign = 'right'; c.textBaseline = 'middle'
    c.fillStyle = isDark ? '#94a3b8' : '#475569'
    c.fillText(startFret + 'fr', pl - 4, nutY + fsp / 2 + 2)
  }

  // Cordas
  for (let s = 0; s < 6; s++) {
    c.strokeStyle = stringColor; c.lineWidth = 1.6 - s * 0.15
    c.beginPath(); c.moveTo(px(s), nutY + 3); c.lineTo(px(s), pfy(F)); c.stroke()
  }

  // Trastes
  for (let f = 1; f <= F; f++) {
    c.strokeStyle = fretColor; c.lineWidth = 1
    c.beginPath(); c.moveTo(pl - 1, nutY + 3 + f * fsp); c.lineTo(PREV_W - pr + 1, nutY + 3 + f * fsp); c.stroke()
  }

  // Open/Muted
  for (let s = 0; s < 6; s++) {
    const x = px(s)
    if (openMuted[s] === 'open') {
      c.strokeStyle = '#22C55E'; c.lineWidth = 1.5
      c.beginPath(); c.arc(x, nutY - 7, 5, 0, Math.PI * 2); c.stroke()
    } else if (openMuted[s] === 'muted') {
      c.fillStyle = '#EF4444'; c.font = '700 10px "DM Sans", sans-serif'
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('✕', x, nutY - 7)
    }
  }

  // Pestanas (preta no light, cinza claro no dark)
  const barreCol = isDark ? '#cbd5e1' : '#1a1a2e'
  const barreTxt = isDark ? '#0f172a' : '#ffffff'
  barres.forEach(b => {
    const mn = Math.min(b.from, b.to), mx = Math.max(b.from, b.to)
    const y = pfy(b.fret) + fsp / 2 + 1
    c.fillStyle = barreCol
    c.beginPath(); c.roundRect(px(mn) - 5, y - 6, px(mx) - px(mn) + 10, 12, 6); c.fill()
    c.fillStyle = barreTxt; c.font = '700 8px "DM Sans", sans-serif'
    c.textAlign = 'center'; c.textBaseline = 'middle'
    c.fillText(String(b.finger || 1), (px(mn) + px(mx)) / 2, y)
  })

  // Bolinhas
  dots.forEach(d => {
    const x = px(d.s), y = pfy(d.f) + fsp / 2 + 1
    c.fillStyle = ACCENT; c.beginPath(); c.arc(x, y, 7, 0, Math.PI * 2); c.fill()
    if (d.finger) {
      c.fillStyle = '#fff'; c.font = '700 8px "DM Sans", sans-serif'
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(d.finger), x, y)
    }
  })
}

// ── Componente ──────────────────────────────────────────────────────────

export function ChordEditor({ state, onChange, chordName = '', startFret = 1 }: ChordEditorProps) {
  const neckRef = useRef<HTMLCanvasElement>(null)
  const prevRef = useRef<HTMLCanvasElement>(null)
  const tipRef = useRef<HTMLDivElement>(null)

  const [barreMode, setBarreMode] = useState(false)
  const [barreFirst, setBarreFirst] = useState<{ s: number; f: number } | null>(null)
  const [selectedDot, setSelectedDot] = useState<number | null>(null)
  const [tipPos, setTipPos] = useState<{ x: number; y: number } | null>(null)
  const [tipVisible, setTipVisible] = useState(false)
  const tipJustClosed = useRef(false)

  // Detectar dark mode
  const isDark = typeof document !== 'undefined' &&
    (document.documentElement.getAttribute('data-theme') === 'dark' || document.documentElement.classList.contains('dark'))

  // ── Render ambos os canvas ──
  const renderAll = useCallback(() => {
    const nCtx = neckRef.current?.getContext('2d')
    const pCtx = prevRef.current?.getContext('2d')
    if (nCtx) drawNeck(nCtx, state.dots, state.openMuted, state.barres, startFret, selectedDot, barreMode, barreFirst, isDark)
    if (pCtx) drawPreview(pCtx, state.dots, state.openMuted, state.barres, startFret, isDark)
  }, [state, startFret, selectedDot, barreMode, barreFirst, isDark])

  useEffect(() => { renderAll() }, [renderAll])

  // ── Tooltip helpers ──
  const hideTooltip = useCallback(() => {
    setTipVisible(false)
    setTipPos(null)
    setSelectedDot(null)
    tipJustClosed.current = true
    setTimeout(() => { tipJustClosed.current = false }, 200)
  }, [])

  const assignFinger = useCallback((n: number) => {
    if (selectedDot === null) return
    const newDots = [...state.dots]
    newDots[selectedDot] = { ...newDots[selectedDot], finger: n }
    hideTooltip()
    onChange({ ...state, dots: newDots })
  }, [selectedDot, state, onChange, hideTooltip])

  // ── Clique direito: abrir tooltip para numerar dedo ──
  const handleContextMenu = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const rect = neckRef.current!.getBoundingClientRect()
    const mx = e.clientX - rect.left, my = e.clientY - rect.top

    const di = findDot(state.dots, mx, my)
    if (di !== null) {
      setSelectedDot(di)
      const d = state.dots[di]
      // Posição relativa ao canvas (não à tela)
      setTipPos({ x: stringX(d.s) - 68, y: cellY(d.f) - 46 })
      setTipVisible(true)
    } else {
      hideTooltip()
    }
  }, [state.dots, hideTooltip])

  // ── Click: colocar dedo, open/muted, barre ──
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = neckRef.current!.getBoundingClientRect()
    const mx = e.clientX - rect.left, my = e.clientY - rect.top

    // Se o tooltip acabou de fechar, ignorar este clique
    if (tipJustClosed.current) { tipJustClosed.current = false; return }

    hideTooltip()

    // Área open/muted (acima do nut)
    if (my < PT - 5) {
      const s = findString(mx)
      if (s !== null) {
        const cycle: (typeof state.openMuted[0])[] = [null, 'open', 'muted']
        const newOM = [...state.openMuted]
        newOM[s] = cycle[(cycle.indexOf(newOM[s]) + 1) % 3]
        const newDots = newOM[s] === 'muted' ? state.dots.filter(d => d.s !== s) : state.dots
        onChange({ ...state, openMuted: newOM, dots: newDots })
      }
      return
    }

    const s = findString(mx), f = findFret(my)
    if (s === null || f === null) return

    // Modo pestana
    if (barreMode) {
      if (!barreFirst) {
        setBarreFirst({ s, f })
      } else {
        if (barreFirst.f === f && barreFirst.s !== s) {
          const from = Math.min(barreFirst.s, s), to = Math.max(barreFirst.s, s)
          const newBarres = [...state.barres, { fret: f, from, to, finger: 1 }]
          const newDots = state.dots.filter(d => !(d.f === f && d.s >= from && d.s <= to))
          const newOM = [...state.openMuted]
          for (let i = from; i <= to; i++) if (newOM[i] === 'muted') newOM[i] = null
          onChange({ ...state, barres: newBarres, dots: newDots, openMuted: newOM })
        }
        setBarreFirst(null)
        setBarreMode(false)
      }
      return
    }

    // Se clicou em bolinha existente, ignorar
    if (findDot(state.dots, mx, my) !== null) return

    // Colocar novo dedo
    const newDots = [...state.dots, { s, f, finger: 0 }]
    const newOM = [...state.openMuted]
    if (newOM[s] === 'muted') newOM[s] = null
    onChange({ ...state, dots: newDots, openMuted: newOM })
  }, [state, onChange, barreMode, barreFirst, hideTooltip])

  // ── Duplo clique: apagar dedo ou pestana ──
  const handleDblClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = neckRef.current!.getBoundingClientRect()
    const mx = e.clientX - rect.left, my = e.clientY - rect.top

    hideTooltip()

    const di = findDot(state.dots, mx, my)
    if (di !== null) {
      const newDots = state.dots.filter((_, i) => i !== di)
      onChange({ ...state, dots: newDots })
      return
    }

    const bi = findBarre(state.barres, mx, my)
    if (bi !== null) {
      const newBarres = state.barres.filter((_, i) => i !== bi)
      onChange({ ...state, barres: newBarres })
    }
  }, [state, onChange, hideTooltip])

  // ── Limpar tudo ──
  const clearAll = useCallback(() => {
    setBarreMode(false)
    setBarreFirst(null)
    hideTooltip()
    onChange(createEmptyState())
  }, [onChange, hideTooltip])

  // ── Toggle pestana ──
  const toggleBarre = useCallback(() => {
    setBarreFirst(null)
    setBarreMode(prev => !prev)
  }, [])


  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-6 items-start">
        {/* Neck canvas */}
        <div className="flex flex-col items-center relative">
          <canvas
            ref={neckRef}
            width={NECK_W}
            height={NECK_H}
            className="cursor-pointer rounded"
            onClick={handleClick}
            onDoubleClick={handleDblClick}
            onContextMenu={handleContextMenu}
          />

          {/* Tooltip flutuante para dedos — abre com clique direito */}
          {tipVisible && tipPos && selectedDot !== null && (
            <>
              {/* Overlay invisível para fechar ao clicar fora */}
              <div
                className="fixed inset-0 z-[199]"
                onMouseDown={hideTooltip}
              />
              <div
                ref={tipRef}
                className="absolute z-[200] flex gap-[3px] p-[5px] rounded-xl border-2 border-accent bg-surface shadow-2xl"
                style={{ left: tipPos.x, top: tipPos.y }}
              >
                {[1, 2, 3, 4].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => assignFinger(n)}
                    className={cn(
                      'w-[30px] h-[30px] rounded-full border-2 border-accent font-bold text-[13px] transition-all cursor-pointer select-none',
                      state.dots[selectedDot]?.finger === n
                        ? 'bg-accent text-white'
                        : 'bg-transparent text-accent hover:bg-accent hover:text-white',
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Instruções */}
          <div className="mt-3 text-[11px] text-text3 text-center leading-relaxed">
            <span className="text-accent font-semibold">Clique</span> = colocar dedo · <span className="text-accent font-semibold">Clique direito</span> no dedo = número (1–4)
            <br />
            <span className="text-accent font-semibold">Duplo clique</span> = apagar dedo ou pestana · <span className="text-accent font-semibold">Topo</span>: ○ aberta / ✕ muda
          </div>

          {/* Botões de ferramenta */}
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={toggleBarre}
              className={cn(
                'px-3.5 py-1.5 text-[12px] rounded-lg border transition-all',
                barreMode
                  ? 'bg-accent border-accent text-white'
                  : 'border-border text-text3 hover:border-accent hover:text-accent',
              )}
            >
              🎸 Pestana
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="px-3.5 py-1.5 text-[12px] rounded-lg border border-border text-text3 hover:border-red-400 hover:text-red-400 transition-all"
            >
              ✕ Limpar tudo
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="flex flex-col items-center gap-2">
          <div className="bg-bg border border-border rounded-xl p-4 text-center">
            <div className="text-[10px] uppercase tracking-wider text-text3 font-semibold mb-2">Preview</div>
            <div className="font-serif text-[26px] mb-1.5">{chordName || '?'}</div>
            <canvas ref={prevRef} width={PREV_W} height={PREV_H} />
            <div className="text-[10px] text-text3 mt-1">Tempo real</div>
          </div>
        </div>
      </div>

    </div>
  )
}
