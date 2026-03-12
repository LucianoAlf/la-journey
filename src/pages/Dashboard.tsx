import { 
  UsersThree, MapTrifold, Trophy, Chalkboard, 
  SpinnerGap, Warning 
} from "@phosphor-icons/react";
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useSchool } from '@/hooks/useSchool'
import { useStudents } from '@/hooks/useStudents'
import { useClasses } from '@/hooks/useClasses'
import { useJourneys } from '@/hooks/useJourneys'
import { useAchievements } from '@/hooks/useAchievements'
import { PhosphorIconRenderer } from '@/lib/phosphor-icon-map'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const STAGE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  Foundation: { label: '🧱 Foundation', color: 'bg-foundation', bg: 'bg-foundation-soft' },
  Grow:       { label: '📈 Grow',       color: 'bg-grow',       bg: 'bg-grow-soft' },
  Advance:    { label: '✅ Advance',    color: 'bg-advance',    bg: 'bg-advance-soft' },
  Master:     { label: '🏆 Master',     color: 'bg-master',     bg: 'bg-master-soft' },
}

export function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: school, loading: schoolLoading } = useSchool()
  const { data: students, loading: studentsLoading } = useStudents()
  const { data: classes, loading: classesLoading } = useClasses()
  const { data: journeys, loading: journeysLoading } = useJourneys()
  const { data: achievements, loading: achievementsLoading } = useAchievements()

  const loading = schoolLoading || studentsLoading || classesLoading || journeysLoading || achievementsLoading

  const hoje = format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })
  const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Usuário'

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <SpinnerGap size={32} className="animate-spin text-accent mx-auto mb-3" />
          <p className="text-text2 text-sm">Carregando dashboard...</p>
        </div>
      </div>
    )
  }

  const stats = [
    {
      label: 'Alunos',
      value: students?.length ?? 0,
      icon: <UsersThree size={20} />,
      gradient: 'from-azul-escuro to-azul-claro',
      iconBg: 'bg-azul-soft text-azul-claro',
    },
    {
      label: 'Turmas',
      value: classes?.length ?? 0,
      icon: <Chalkboard size={20} />,
      gradient: 'from-accent to-[#D91A60]',
      iconBg: 'bg-accent-soft text-accent',
    },
    {
      label: 'Jornadas',
      value: journeys?.length ?? 0,
      icon: <MapTrifold size={20} />,
      gradient: 'from-[#4F46E5] to-foundation',
      iconBg: 'bg-foundation-soft text-foundation',
    },
    {
      label: 'Conquistas',
      value: achievements?.length ?? 0,
      icon: <Trophy size={20} />,
      gradient: 'from-[#D97706] to-dourado',
      iconBg: 'bg-dourado-soft text-dourado',
    },
  ]

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-[26px] leading-[1.2] text-text">
            Olá, <em className="not-italic text-accent">{userName}</em> 🎵
          </h1>
          <p className="text-text2 text-[13.5px] mt-1.5 capitalize">
            {hoje}
            {school && <> · <strong>{school.name}</strong></>}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/jornadas')}>
            <MapTrifold size={16} /> Jornadas
          </button>
          <button className="btn btn-accent" onClick={() => navigate('/gerador')}>
            <span className="text-base">✨</span> Gerar Material
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {stats.map((stat) => (
          <div key={stat.label} className="card relative overflow-hidden group">
            <div className={`absolute top-0 left-0 right-0 h-[3px] rounded-t-[var(--radius)] bg-gradient-to-r ${stat.gradient}`} />
            <span className={`absolute top-[18px] right-[18px] w-10 h-10 rounded-xl flex items-center justify-center text-lg ${stat.iconBg}`}>
              {stat.icon}
            </span>
            <div className="text-[10px] tracking-[2.5px] uppercase text-text3 mb-2">{stat.label}</div>
            <div className="font-serif text-[30px] font-semibold leading-none mb-2 text-text">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Jornada com Stages */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="font-serif text-[17px]">Jornadas cadastradas</div>
            <span className="badge badge-azul">{journeys?.length ?? 0} ativa(s)</span>
          </div>

          {journeys && journeys.length > 0 ? (
            <div className="flex flex-col gap-3">
              {journeys.map((journey) => (
                <div key={journey.id} className="p-3 rounded-[var(--radius-sm)] border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-bold text-[13px]">{journey.name}</div>
                    <span className="badge badge-azul text-[10px]">{journey.instrument} · {journey.target_audience}</span>
                  </div>
                  <div className="text-[11px] text-text3">
                    Status: <span className="text-verde font-medium">{journey.status}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="Nenhuma jornada cadastrada" />
          )}
        </div>

        {/* Turmas */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="font-serif text-[17px]">Turmas</div>
            <span className="badge badge-azul">{classes?.length ?? 0} turma(s)</span>
          </div>

          {classes && classes.length > 0 ? (
            <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
              {classes.map((cls) => (
                <div key={cls.id} className="flex items-center gap-3 p-2.5 rounded-[var(--radius-sm)] border border-border">
                  <div className="flex-1">
                    <div className="font-bold text-[13px]">{cls.name}</div>
                    <div className="text-[11px] text-text3">
                      {cls.instrument} · Máx {cls.max_students} alunos
                    </div>
                  </div>
                  <span className={`badge ${cls.is_active ? 'badge-verde' : 'badge-vermelho'} text-[10px]`}>
                    {cls.is_active ? 'Ativa' : 'Inativa'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="Nenhuma turma cadastrada" />
          )}
        </div>
      </div>

      {/* Achievements */}
      <div className="card mt-4">
        <div className="flex items-center justify-between mb-4">
          <div className="font-serif text-[17px]">Conquistas disponíveis</div>
          <span className="badge badge-dourado">{achievements?.length ?? 0} conquista(s)</span>
        </div>
        {achievements && achievements.length > 0 ? (
          <div className="grid grid-cols-3 gap-3">
            {achievements.map((ach) => (
              <div key={ach.id} className="flex items-center gap-3 p-3 rounded-[var(--radius-sm)] border border-border">
                <PhosphorIconRenderer name={ach.icon} size={28} className="text-dourado shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[13px] truncate">{ach.name}</div>
                  <div className="text-[11px] text-text3 truncate">{ach.description}</div>
                  {ach.points && (
                    <div className="text-[10px] text-dourado font-semibold mt-0.5">{ach.points} pts</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState message="Nenhuma conquista cadastrada" />
        )}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2.5 p-4 rounded-[var(--radius-sm)] bg-bg2 text-text3 text-[13px]">
      <Warning size={18} />
      <span>{message}</span>
    </div>
  )
}
