import { DownloadSimple, FileText, TrendUp, Star } from "@phosphor-icons/react";
import { useAppContext } from "../AppContext";

export function Relatorios() {
  const { showToast } = useAppContext();

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-[26px] leading-[1.2] text-text">
            <em className="not-italic text-accent">Relatórios</em>
          </h1>
          <p className="text-text2 text-[13.5px] mt-1.5">
            Métricas, análises e desempenho da escola
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => showToast('Iniciando exportação...')}>
          <DownloadSimple size={16} /> Exportar
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-[var(--radius)] bg-gradient-to-r from-accent to-[#D91A60]" />
          <span className="absolute top-[18px] right-[18px] w-10 h-10 rounded-xl flex items-center justify-center text-lg bg-accent-soft text-accent">
            <FileText size={20} />
          </span>
          <div className="text-[10px] tracking-[2.5px] uppercase text-text3 mb-2">Materiais gerados</div>
          <div className="font-serif text-[30px] font-semibold leading-none mb-2 text-text">347</div>
          <div className="text-xs text-text2">
            <span className="inline-flex items-center gap-[3px] text-[11px] font-semibold mr-1 text-verde">↑ 28%</span> vs anterior
          </div>
        </div>

        <div className="card relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-[var(--radius)] bg-gradient-to-r from-[#16A34A] to-advance" />
          <span className="absolute top-[18px] right-[18px] w-10 h-10 rounded-xl flex items-center justify-center text-lg bg-advance-soft text-advance">
            <TrendUp size={20} />
          </span>
          <div className="text-[10px] tracking-[2.5px] uppercase text-text3 mb-2">Taxa de retenção</div>
          <div className="font-serif text-[30px] font-semibold leading-none mb-2 text-text">94%</div>
          <div className="text-xs text-text2">Meta: {'>'}90%</div>
        </div>

        <div className="card relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-[var(--radius)] bg-gradient-to-r from-[#4F46E5] to-foundation" />
          <span className="absolute top-[18px] right-[18px] w-10 h-10 rounded-xl flex items-center justify-center text-lg bg-foundation-soft text-foundation">
            <Star size={20} />
          </span>
          <div className="text-[10px] tracking-[2.5px] uppercase text-text3 mb-2">NPS Coordenadores</div>
          <div className="font-serif text-[30px] font-semibold leading-none mb-2 text-text">78</div>
          <div className="text-xs text-text2">Meta: {'>'}70</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div className="card">
          <div className="font-serif mb-4 text-[17px]">Alunos por Stage</div>
          <div className="flex flex-col gap-3">
            <div>
              <div className="flex justify-between text-[13px] mb-2">
                <span>Foundation</span><span className="text-text2">687 (53%)</span>
              </div>
              <div className="h-1 bg-bg2 rounded-sm overflow-hidden">
                <div className="h-full rounded-sm transition-all duration-1000 w-[53%] bg-foundation" />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[13px] mb-2">
                <span>Grow</span><span className="text-text2">345 (27%)</span>
              </div>
              <div className="h-1 bg-bg2 rounded-sm overflow-hidden">
                <div className="h-full rounded-sm transition-all duration-1000 w-[27%] bg-grow" />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[13px] mb-2">
                <span>Advance</span><span className="text-text2">189 (15%)</span>
              </div>
              <div className="h-1 bg-bg2 rounded-sm overflow-hidden">
                <div className="h-full rounded-sm transition-all duration-1000 w-[15%] bg-advance" />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[13px] mb-2">
                <span>Master</span><span className="text-text2">76 (5%)</span>
              </div>
              <div className="h-1 bg-bg2 rounded-sm overflow-hidden">
                <div className="h-full rounded-sm transition-all duration-1000 w-[5%] bg-master" />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="font-serif mb-4 text-[17px]">Geração por instrumento</div>
          <div className="flex flex-col gap-3">
            <div>
              <div className="flex justify-between text-[13px] mb-2">
                <span>🎸 Violão</span><span className="text-text2">87 materiais</span>
              </div>
              <div className="h-1 bg-bg2 rounded-sm overflow-hidden">
                <div className="h-full rounded-sm transition-all duration-1000 w-[87%] bg-accent" />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[13px] mb-2">
                <span>🎤 Canto</span><span className="text-text2">54 materiais</span>
              </div>
              <div className="h-1 bg-bg2 rounded-sm overflow-hidden">
                <div className="h-full rounded-sm transition-all duration-1000 w-[54%] bg-accent" />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[13px] mb-2">
                <span>🎸 Guitarra</span><span className="text-text2">43 materiais</span>
              </div>
              <div className="h-1 bg-bg2 rounded-sm overflow-hidden">
                <div className="h-full rounded-sm transition-all duration-1000 w-[43%] bg-accent" />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[13px] mb-2">
                <span>🎹 Teclado</span><span className="text-text2">38 materiais</span>
              </div>
              <div className="h-1 bg-bg2 rounded-sm overflow-hidden">
                <div className="h-full rounded-sm transition-all duration-1000 w-[38%] bg-accent" />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[13px] mb-2">
                <span>🥁 Bateria</span><span className="text-text2">29 materiais</span>
              </div>
              <div className="h-1 bg-bg2 rounded-sm overflow-hidden">
                <div className="h-full rounded-sm transition-all duration-1000 w-[29%] bg-accent" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
