import { 
  UsersThree, FileText, MapTrifold, Trophy, ArrowRight, Hourglass, DownloadSimple 
} from "@phosphor-icons/react";

export function Dashboard() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-[26px] leading-[1.2] text-text">
            Boa tarde, <em className="not-italic text-accent">Alf</em> 🎵
          </h1>
          <p className="text-text2 text-[13.5px] mt-1.5">
            Quarta-feira, 11 de março de 2026 · 3 materiais gerados hoje · 12 alunos avançaram
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost btn-sm">
            <MapTrifold size={16} /> Jornadas
          </button>
          <button className="btn btn-accent">
            <span className="text-base">✨</span> Gerar Material
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-[var(--radius)] bg-gradient-to-r from-azul-escuro to-azul-claro" />
          <span className="absolute top-[18px] right-[18px] w-10 h-10 rounded-xl flex items-center justify-center text-lg bg-azul-soft text-azul-claro">
            <UsersThree size={20} />
          </span>
          <div className="text-[10px] tracking-[2.5px] uppercase text-text3 mb-2">Alunos ativos</div>
          <div className="font-serif text-[30px] font-semibold leading-none mb-2 text-text">1.297</div>
          <div className="text-xs text-text2">
            Em jornada <span className="inline-flex items-center gap-[3px] text-[11px] font-semibold ml-1 text-verde">↑ 12%</span>
          </div>
          <div className="h-1 bg-bg2 rounded-sm mt-2 overflow-hidden">
            <div className="h-full rounded-sm transition-all duration-1000 w-[65%] bg-gradient-to-r from-azul-escuro to-azul-claro" />
          </div>
        </div>

        <div className="card relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-[var(--radius)] bg-gradient-to-r from-accent to-[#D91A60]" />
          <span className="absolute top-[18px] right-[18px] w-10 h-10 rounded-xl flex items-center justify-center text-lg bg-accent-soft text-accent">
            <FileText size={20} />
          </span>
          <div className="text-[10px] tracking-[2.5px] uppercase text-text3 mb-2">Materiais gerados</div>
          <div className="font-serif text-[30px] font-semibold leading-none mb-2 text-text">347</div>
          <div className="text-xs text-text2">
            Este mês <span className="inline-flex items-center gap-[3px] text-[11px] font-semibold ml-1 text-verde">↑ 28%</span>
          </div>
          <div className="h-1 bg-bg2 rounded-sm mt-2 overflow-hidden">
            <div className="h-full rounded-sm transition-all duration-1000 w-[70%] bg-gradient-to-r from-accent to-[#D91A60]" />
          </div>
        </div>

        <div className="card relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-[var(--radius)] bg-gradient-to-r from-[#4F46E5] to-foundation" />
          <span className="absolute top-[18px] right-[18px] w-10 h-10 rounded-xl flex items-center justify-center text-lg bg-foundation-soft text-foundation">
            <MapTrifold size={20} />
          </span>
          <div className="text-[10px] tracking-[2.5px] uppercase text-text3 mb-2">Jornadas ativas</div>
          <div className="font-serif text-[30px] font-semibold leading-none mb-2 text-text">21</div>
          <div className="text-xs text-text2">
            8 instrumentos <span className="inline-flex items-center gap-[3px] text-[11px] font-semibold ml-1 text-verde">↑ 5</span>
          </div>
          <div className="h-1 bg-bg2 rounded-sm mt-2 overflow-hidden">
            <div className="h-full rounded-sm transition-all duration-1000 w-[53%] bg-foundation" />
          </div>
        </div>

        <div className="card relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-[var(--radius)] bg-gradient-to-r from-[#D97706] to-dourado" />
          <span className="absolute top-[18px] right-[18px] w-10 h-10 rounded-xl flex items-center justify-center text-lg bg-dourado-soft text-dourado">
            <Trophy size={20} />
          </span>
          <div className="text-[10px] tracking-[2.5px] uppercase text-text3 mb-2">Conquistas</div>
          <div className="font-serif text-[30px] font-semibold leading-none mb-2 text-text">2.891</div>
          <div className="text-xs text-text2">
            Desbloqueadas <span className="inline-flex items-center gap-[3px] text-[11px] font-semibold ml-1 text-verde">↑ 34%</span>
          </div>
          <div className="h-1 bg-bg2 rounded-sm mt-2 overflow-hidden">
            <div className="h-full rounded-sm transition-all duration-1000 w-[80%] bg-dourado" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="font-serif text-[17px]">Progresso por Stage</div>
            <span className="badge badge-azul">Violão Adulto</span>
          </div>
          <div className="flex flex-col gap-3">
            <div>
              <div className="flex justify-between text-[13px] mb-2">
                <span>🧱 Foundation</span><span className="text-text2">78%</span>
              </div>
              <div className="h-1 bg-bg2 rounded-sm overflow-hidden">
                <div className="h-full rounded-sm transition-all duration-1000 w-[78%] bg-foundation" />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[13px] mb-2">
                <span>📈 Grow</span><span className="text-text2">45%</span>
              </div>
              <div className="h-1 bg-bg2 rounded-sm overflow-hidden">
                <div className="h-full rounded-sm transition-all duration-1000 w-[45%] bg-grow" />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[13px] mb-2">
                <span>✅ Advance</span><span className="text-text2">22%</span>
              </div>
              <div className="h-1 bg-bg2 rounded-sm overflow-hidden">
                <div className="h-full rounded-sm transition-all duration-1000 w-[22%] bg-advance" />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[13px] mb-2">
                <span>🏆 Master</span><span className="text-text2">8%</span>
              </div>
              <div className="h-1 bg-bg2 rounded-sm overflow-hidden">
                <div className="h-full rounded-sm transition-all duration-1000 w-[8%] bg-master" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <div className="font-serif text-[17px]">Materiais recentes</div>
              <button className="btn btn-ghost btn-sm">
                <ArrowRight size={16} /> Ver todos
              </button>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3 p-2.5 bg-foundation-soft rounded-[var(--radius-sm)] border-l-[3px] border-foundation">
                <div className="flex-1">
                  <div className="font-bold text-[13px]">Violão Foundation — Fund. 1</div>
                  <div className="text-[11px] text-text3">32 págs · 10/03 · 45 downloads</div>
                </div>
                <span className="badge badge-verde">Pronto</span>
              </div>
              <div className="flex items-center gap-3 p-2.5 bg-grow-soft rounded-[var(--radius-sm)] border-l-[3px] border-grow">
                <div className="flex-1">
                  <div className="font-bold text-[13px]">Guitarra Foundation — Fund. 2</div>
                  <div className="text-[11px] text-text3">28 págs · 09/03 · 23 downloads</div>
                </div>
                <span className="badge badge-verde">Pronto</span>
              </div>
              <div className="flex items-center gap-3 p-2.5 bg-dourado-soft rounded-[var(--radius-sm)] border-l-[3px] border-dourado">
                <div className="flex-1">
                  <div className="font-bold text-[13px]">Repertório Violão — Nível 1</div>
                  <div className="text-[11px] text-text3">12 págs · 11/03</div>
                </div>
                <span className="badge badge-dourado">Gerando...</span>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="font-serif mb-3 text-[17px]">Alertas prioritários</div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2.5 p-2.5 bg-dourado-soft rounded-[var(--radius-sm)] border-l-[3px] border-dourado">
                <span>⚠️</span>
                <div className="flex-1 text-[13px]"><strong>Ana Oliveira</strong> — atrasada 3 aulas</div>
                <button className="btn btn-ghost btn-sm">Enviar material</button>
              </div>
              <div className="flex items-center gap-2.5 p-2.5 bg-vermelho-soft rounded-[var(--radius-sm)] border-l-[3px] border-vermelho">
                <span>🛑</span>
                <div className="flex-1 text-[13px]"><strong>João Ferreira</strong> — estagnado há 2 semanas</div>
                <button className="btn btn-ghost btn-sm">Ver</button>
              </div>
              <div className="flex items-center gap-2.5 p-2.5 bg-verde-soft rounded-[var(--radius-sm)] border-l-[3px] border-verde">
                <span>✅</span>
                <div className="flex-1 text-[13px]"><strong>15 alunos</strong> completaram checkpoint esta semana</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card mt-4">
        <div className="flex items-center justify-between mb-4">
          <div className="font-serif text-[17px]">Instrumentos</div>
          <span className="badge badge-azul">8 ativos</span>
        </div>
        <div className="grid grid-cols-8 gap-2.5">
          {[
            { icon: '🎸', name: 'Violão', count: 342 },
            { icon: '🎸', name: 'Guitarra', count: 187 },
            { icon: '🎹', name: 'Teclado', count: 156 },
            { icon: '🎹', name: 'Piano', count: 98 },
            { icon: '🎤', name: 'Canto', count: 224 },
            { icon: '🥁', name: 'Bateria', count: 134 },
            { icon: '🎸', name: 'Baixo', count: 67 },
            { icon: '🪕', name: 'Ukulele', count: 89 },
          ].map((inst, i) => (
            <div key={i} className="text-center p-3.5 rounded-[var(--radius-sm)] border border-border cursor-pointer transition-all hover:border-azul-claro hover:bg-azul-soft">
              <div className="text-2xl mb-1.5">{inst.icon}</div>
              <div className="font-bold text-[11px]">{inst.name}</div>
              <div className="text-[11px] text-text3">{inst.count}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
