import { useMemo } from 'react'
import {
  MusicNote, Star, Lightning, Guitar, Funnel,
  CheckCircle, Clock, PencilSimple, FileArrowUp,
  FileText, PianoKeys, MicrophoneStage, ChartDonut,
  TrendUp, CalendarBlank, Globe
} from '@phosphor-icons/react'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts'
import type { Tables } from '@/lib/database.types'

type Repertoire = Tables<'repertoire'>

// --- Cores ---
const GENRE_CHART_COLORS = [
  '#FF6B8A', '#6C5CE7', '#00B894', '#FDCB6E', '#E17055',
  '#0984E3', '#A29BFE', '#55EFC4', '#FAB1A0', '#74B9FF',
]

const DIFFICULTY_COLORS: Record<number, string> = {
  1: '#22C55E', 2: '#34D399', 3: '#F59E0B', 4: '#F97316', 5: '#EF4444',
}

const DIFFICULTY_LABELS: Record<number, string> = {
  1: 'Iniciante', 2: 'Fácil', 3: 'Médio', 4: 'Avançado', 5: 'Expert',
}

const ORIGIN_ICONS: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  cifra_club: { icon: <Lightning size={12} weight="fill" />, color: 'text-amber-400', label: 'Cifra Club' },
  songsterr: { icon: <Guitar size={12} weight="fill" />, color: 'text-orange-400', label: 'Songsterr' },
  gp_import: { icon: <FileArrowUp size={12} weight="fill" />, color: 'text-green-400', label: 'Guitar Pro' },
  chordpro: { icon: <FileText size={12} weight="fill" />, color: 'text-purple-400', label: 'ChordPro' },
  olga: { icon: <Globe size={12} weight="fill" />, color: 'text-sky-400', label: 'OLGA' },
  manual: { icon: <PencilSimple size={12} />, color: 'text-text3', label: 'Manual' },
}

const INSTRUMENT_ICONS: Record<string, React.ReactNode> = {
  Violão: <Guitar size={14} />,
  Guitarra: <Guitar size={14} />,
  Teclado: <PianoKeys size={14} />,
  Canto: <MicrophoneStage size={14} />,
  Baixo: <Guitar size={14} />,
  Bateria: <MusicNote size={14} />,
  Ukulele: <Guitar size={14} />,
}

interface RepertorioDashboardProps {
  songs: Repertoire[]
  onAddMusic?: () => void
}

// --- Tooltip customizado para Recharts ---
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface border border-border rounded-lg px-3 py-2 shadow-lg">
      <p className="text-[11px] font-semibold text-text">{label || payload[0]?.name}</p>
      <p className="text-[11px] text-text2">{payload[0]?.value} música{payload[0]?.value !== 1 ? 's' : ''}</p>
    </div>
  )
}

export function RepertorioDashboard({ songs, onAddMusic }: RepertorioDashboardProps) {
  // --- Métricas calculadas ---
  const stats = useMemo(() => {
    const total = songs.length
    if (total === 0) return null

    // Gêneros
    const genreMap = new Map<string, number>()
    songs.forEach(s => {
      const g = s.genre || 'Sem gênero'
      genreMap.set(g, (genreMap.get(g) ?? 0) + 1)
    })
    const genreData = [...genreMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, value], i) => ({ name, value, fill: GENRE_CHART_COLORS[i % GENRE_CHART_COLORS.length] }))

    // Dificuldade
    const diffMap = new Map<number, number>()
    songs.forEach(s => {
      const d = s.difficulty ?? 1
      diffMap.set(d, (diffMap.get(d) ?? 0) + 1)
    })
    const diffData = [1, 2, 3, 4, 5].map(n => ({
      name: DIFFICULTY_LABELS[n],
      value: diffMap.get(n) ?? 0,
      fill: DIFFICULTY_COLORS[n],
    }))
    const avgDiff = songs.reduce((sum, s) => sum + (s.difficulty ?? 1), 0) / total

    // Curadoria
    const curationMap = { draft: 0, review: 0, approved: 0, published: 0 }
    songs.forEach(s => {
      const st = (s.curation_status ?? 'draft') as keyof typeof curationMap
      if (st in curationMap) curationMap[st]++
    })
    const approvedPercent = Math.round(((curationMap.approved + curationMap.published) / total) * 100)

    // Instrumentos
    const instMap = new Map<string, number>()
    songs.forEach(s => {
      (s.instruments ?? []).forEach(i => {
        instMap.set(i, (instMap.get(i) ?? 0) + 1)
      })
    })
    const instData = [...instMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count, percent: Math.round((count / total) * 100) }))

    // Origens
    const originMap = new Map<string, number>()
    songs.forEach(s => {
      const src = s.cifra_source || 'manual'
      originMap.set(src, (originMap.get(src) ?? 0) + 1)
    })
    const originData = [...originMap.entries()].sort((a, b) => b[1] - a[1])

    // Últimas 5 importações
    const recentSongs = [...songs]
      .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
      .slice(0, 5)

    return {
      total,
      genreData,
      genreCount: genreMap.size,
      diffData,
      avgDiff: Math.round(avgDiff * 10) / 10,
      curationMap,
      approvedPercent,
      instData,
      originData,
      recentSongs,
    }
  }, [songs])

  if (!stats) return null

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-top-3 duration-300">
      {/* ─── Linha 1: KPIs principais ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiMini label="Total" value={stats.total} icon={<MusicNote size={16} weight="fill" />} color="text-[#4A7DC0]" bg="bg-[#2D5A8E]/15" />
        <KpiMini label="Gêneros" value={stats.genreCount} icon={<Funnel size={16} />} color="text-indigo-400" bg="bg-indigo-500/15" />
        <KpiMini label="Dificuldade" value={stats.avgDiff} icon={<Star size={16} weight="fill" />} color="text-amber-400" bg="bg-amber-500/15" sub="média" />
        <KpiMini label="Curadas" value={`${stats.approvedPercent}%`} icon={<CheckCircle size={16} weight="fill" />} color="text-green-400" bg="bg-green-500/15" sub={`${stats.curationMap.approved + stats.curationMap.published}/${stats.total}`} />
        <KpiMini label="Rascunhos" value={stats.curationMap.draft} icon={<Clock size={16} />} color="text-amber-400" bg="bg-amber-500/15" sub="pendentes" />
      </div>

      {/* ─── Linha 2: Gráficos ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Donut: Gêneros */}
        <div className="rounded-[14px] bg-card border border-border p-4">
          <h3 className="text-[11px] font-semibold uppercase tracking-[1.5px] text-text3 flex items-center gap-1.5 mb-3">
            <ChartDonut size={13} /> Distribuição por Gênero
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={stats.genreData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={72}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
              >
                {stats.genreData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value: string) => <span className="text-[10px] text-text2">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bar: Dificuldade */}
        <div className="rounded-[14px] bg-card border border-border p-4">
          <h3 className="text-[11px] font-semibold uppercase tracking-[1.5px] text-text3 flex items-center gap-1.5 mb-3">
            <Star size={13} weight="fill" /> Distribuição por Dificuldade
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={stats.diffData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: 'var(--text3)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'var(--text3)' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={36}>
                {stats.diffData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Instrumentos + Origens */}
        <div className="space-y-4">
          {/* Cobertura por Instrumento */}
          <div className="rounded-[14px] bg-card border border-border p-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-[1.5px] text-text3 flex items-center gap-1.5 mb-3">
              <Guitar size={13} /> Cobertura por Instrumento
            </h3>
            <div className="space-y-2">
              {stats.instData.slice(0, 5).map(inst => (
                <div key={inst.name} className="space-y-0.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1.5 text-text2">
                      {INSTRUMENT_ICONS[inst.name] ?? <MusicNote size={14} />}
                      {inst.name}
                    </span>
                    <span className="text-text3 font-mono">{inst.count} <span className="text-[9px]">({inst.percent}%)</span></span>
                  </div>
                  <div className="h-1.5 rounded-full bg-border overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--azul-claro)] transition-all duration-500"
                      style={{ width: `${inst.percent}%` }}
                    />
                  </div>
                </div>
              ))}
              {stats.instData.length === 0 && (
                <p className="text-[11px] text-text3 text-center py-3">Nenhum instrumento definido</p>
              )}
            </div>
          </div>

          {/* Origens */}
          <div className="rounded-[14px] bg-card border border-border p-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-[1.5px] text-text3 flex items-center gap-1.5 mb-2.5">
              <TrendUp size={13} /> Fontes de Importação
            </h3>
            <div className="space-y-1.5">
              {stats.originData.map(([source, count]) => {
                const cfg = ORIGIN_ICONS[source] ?? ORIGIN_ICONS.manual
                return (
                  <div key={source} className="flex items-center justify-between">
                    <span className={`flex items-center gap-1.5 text-[11px] ${cfg.color}`}>
                      {cfg.icon} {cfg.label}
                    </span>
                    <span className="text-[11px] font-mono text-text2 font-semibold">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Linha 3: Timeline + Curadoria ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Últimas importações */}
        <div className="rounded-[14px] bg-card border border-border p-4">
          <h3 className="text-[11px] font-semibold uppercase tracking-[1.5px] text-text3 flex items-center gap-1.5 mb-3">
            <CalendarBlank size={13} /> Últimas Importações
          </h3>
          <div className="space-y-2">
            {stats.recentSongs.map(song => {
              const originCfg = ORIGIN_ICONS[song.cifra_source || 'manual'] ?? ORIGIN_ICONS.manual
              const dateStr = song.created_at
                ? new Date(song.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
                : '—'
              return (
                <div key={song.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--bg2)] transition-colors">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center bg-surface ${originCfg.color}`}>
                    {originCfg.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-text truncate">{song.title}</p>
                    <p className="text-[10px] text-text3 truncate">{song.artist ?? 'Sem artista'}</p>
                  </div>
                  <span className="text-[10px] text-text3 shrink-0 font-mono">{dateStr}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Progresso de Curadoria */}
        <div className="rounded-[14px] bg-card border border-border p-4">
          <h3 className="text-[11px] font-semibold uppercase tracking-[1.5px] text-text3 flex items-center gap-1.5 mb-3">
            <CheckCircle size={13} weight="fill" /> Progresso de Curadoria
          </h3>

          {/* Gauge visual */}
          <div className="flex items-center justify-center py-4">
            <div className="relative w-28 h-28">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="var(--border)" strokeWidth="8" />
                <circle
                  cx="50" cy="50" r="42" fill="none"
                  stroke="var(--accent)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${stats.approvedPercent * 2.64} 264`}
                  className="transition-all duration-700"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[22px] font-extrabold text-text">{stats.approvedPercent}%</span>
                <span className="text-[9px] text-text3 uppercase tracking-wider">curadas</span>
              </div>
            </div>
          </div>

          {/* Breakdown */}
          <div className="grid grid-cols-2 gap-2 mt-2">
            <StatusChip label="Rascunho" count={stats.curationMap.draft} color="text-amber-400" bg="bg-amber-500/10" />
            <StatusChip label="Em revisão" count={stats.curationMap.review} color="text-blue-400" bg="bg-blue-500/10" />
            <StatusChip label="Aprovado" count={stats.curationMap.approved} color="text-green-400" bg="bg-green-500/10" />
            <StatusChip label="Publicado" count={stats.curationMap.published} color="text-[#FF2D78]" bg="bg-[#FF2D78]/10" />
          </div>
        </div>
      </div>
    </div>
  )
}

// --- Sub-componentes ---

function KpiMini({ label, value, icon, color, bg, sub }: {
  label: string; value: string | number; icon: React.ReactNode; color: string; bg: string; sub?: string
}) {
  return (
    <div className="rounded-[12px] bg-card border border-border p-3 flex items-center gap-2.5">
      <div className={`w-8 h-8 rounded-[8px] flex items-center justify-center ${bg} ${color} shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-semibold uppercase tracking-[1.5px] text-text3">{label}</p>
        <p className="text-[18px] font-extrabold text-text leading-tight">{value}</p>
        {sub && <p className="text-[9px] text-text3">{sub}</p>}
      </div>
    </div>
  )
}

function StatusChip({ label, count, color, bg }: {
  label: string; count: number; color: string; bg: string
}) {
  return (
    <div className={`rounded-lg ${bg} px-3 py-2 flex items-center justify-between`}>
      <span className={`text-[11px] font-medium ${color}`}>{label}</span>
      <span className={`text-[14px] font-bold ${color}`}>{count}</span>
    </div>
  )
}
