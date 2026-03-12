import { Plus, Medal, LockKeyOpen, Star } from "@phosphor-icons/react";
import { useAppContext } from "../AppContext";
import { Button } from "@/components/ui/button";

export function Gamificacao() {
  const { openModal } = useAppContext();

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-[26px] leading-[1.2] text-text">
            <em className="not-italic text-accent">Gamificação</em>
          </h1>
          <p className="text-text2 text-[13.5px] mt-1.5">
            Conquistas, badges, desafios e ranking para engajamento
          </p>
        </div>
        <Button onClick={() => openModal('modal-conquista')}>
          <Plus size={16} /> Nova Conquista
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-[var(--radius)] bg-gradient-to-r from-accent to-[#D91A60]" />
          <span className="absolute top-[18px] right-[18px] w-10 h-10 rounded-xl flex items-center justify-center text-lg bg-accent-soft text-accent">
            <Medal size={20} />
          </span>
          <div className="text-[10px] tracking-[2.5px] uppercase text-text3 mb-2">Total conquistas</div>
          <div className="font-serif text-[30px] font-semibold leading-none mb-2 text-text">12</div>
          <div className="text-xs text-text2">6 tipos diferentes</div>
        </div>

        <div className="card relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-[var(--radius)] bg-gradient-to-r from-[#D97706] to-dourado" />
          <span className="absolute top-[18px] right-[18px] w-10 h-10 rounded-xl flex items-center justify-center text-lg bg-dourado-soft text-dourado">
            <LockKeyOpen size={20} />
          </span>
          <div className="text-[10px] tracking-[2.5px] uppercase text-text3 mb-2">Desbloqueadas/mês</div>
          <div className="font-serif text-[30px] font-semibold leading-none mb-2 text-text">347</div>
          <div className="text-xs text-text2">
            <span className="inline-flex items-center gap-[3px] text-[11px] font-semibold mr-1 text-verde">↑ 34%</span> vs anterior
          </div>
        </div>

        <div className="card relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-[var(--radius)] bg-gradient-to-r from-[#16A34A] to-advance" />
          <span className="absolute top-[18px] right-[18px] w-10 h-10 rounded-xl flex items-center justify-center text-lg bg-advance-soft text-advance">
            <Star size={20} />
          </span>
          <div className="text-[10px] tracking-[2.5px] uppercase text-text3 mb-2">Alunos com 5+ conquistas</div>
          <div className="font-serif text-[30px] font-semibold leading-none mb-2 text-text">89</div>
          <div className="text-xs text-text2">15% da base ativa</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        {[
          { icon: '🎸', name: 'Primeiro Acorde', desc: 'Tocou o primeiro acorde', count: '847 alunos' },
          { icon: '🏆', name: 'Fundamentos Completos', desc: 'Completou Fundamentos 1', count: '412 alunos' },
          { icon: '🎵', name: 'Primeira Música', desc: 'Tocou música completa', count: '623 alunos' },
          { icon: '⭐', name: 'Semana Perfeita', desc: 'Estudou todos os dias', count: '156 alunos' },
          { icon: '👂', name: 'Ouvido Musical', desc: '10 exercícios de percepção', count: '289 alunos' },
          { icon: '🎤', name: 'Sarau', desc: 'Participou do primeiro sarau', count: '98 alunos' },
        ].map((badge, i) => (
          <div key={i} className="card text-center">
            <div className="text-[36px] mb-2">{badge.icon}</div>
            <div className="font-bold">{badge.name}</div>
            <div className="text-xs text-text2 mt-1">{badge.desc}</div>
            <div className="text-[11px] text-text3 mt-3">{badge.count}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="font-serif mb-4 text-[17px]">🏅 Top alunos do mês</div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 p-3 bg-dourado-soft rounded-[var(--radius-sm)]">
            <div className="w-7 h-7 rounded-full bg-dourado text-white flex items-center justify-center font-bold text-xs">1</div>
            <div className="flex-1">
              <div className="font-bold text-[13px]">Maria Santos</div>
              <div className="text-[11px] text-text3">Canto · Grow</div>
            </div>
            <div className="text-[13px] font-bold text-accent">18 conquistas</div>
          </div>
          <div className="flex items-center gap-3 p-3 border border-border rounded-[var(--radius-sm)]">
            <div className="w-7 h-7 rounded-full bg-[#94A3B8] text-white flex items-center justify-center font-bold text-xs">2</div>
            <div className="flex-1">
              <div className="font-bold text-[13px]">Lucas Silva</div>
              <div className="text-[11px] text-text3">Violão · Foundation</div>
            </div>
            <div className="text-[13px] font-bold text-accent">15 conquistas</div>
          </div>
          <div className="flex items-center gap-3 p-3 border border-border rounded-[var(--radius-sm)]">
            <div className="w-7 h-7 rounded-full bg-[#CD7F32] text-white flex items-center justify-center font-bold text-xs">3</div>
            <div className="flex-1">
              <div className="font-bold text-[13px]">Pedro Costa</div>
              <div className="text-[11px] text-text3">Guitarra · Foundation</div>
            </div>
            <div className="text-[13px] font-bold text-accent">12 conquistas</div>
          </div>
        </div>
      </div>
    </div>
  );
}
