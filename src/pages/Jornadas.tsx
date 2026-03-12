import { Copy, Plus, FloppyDisk } from "@phosphor-icons/react";
import { useAppContext } from "../AppContext";

export function Jornadas() {
  const { openModal } = useAppContext();

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-[26px] leading-[1.2] text-text">
            Construtor de <em className="not-italic text-accent">Jornada</em>
          </h1>
          <p className="text-text2 text-[13.5px] mt-1.5">
            Configure a trilha pedagógica da sua escola · Ancoragem de Fundamentos
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost btn-sm">
            <Copy size={16} /> Duplicar
          </button>
          <button className="btn btn-primary" onClick={() => openModal('modal-jornada')}>
            <Plus size={16} /> Nova Jornada
          </button>
        </div>
      </div>

      <div className="card mb-4">
        <div className="grid grid-cols-4 gap-4">
          <div className="form-group mb-0">
            <label className="form-label">Instrumento</label>
            <select className="form-select">
              <option>Violão</option>
              <option>Guitarra</option>
              <option>Teclado</option>
              <option>Piano</option>
              <option>Canto</option>
              <option>Bateria</option>
              <option>Baixo</option>
              <option>Ukulele</option>
            </select>
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Público-alvo</label>
            <select className="form-select">
              <option>Adulto</option>
              <option>Teen (12-17)</option>
              <option>Kids (5-11)</option>
              <option>Baby (0-5)</option>
            </select>
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Aulas por Stage</label>
            <select className="form-select">
              <option>40 aulas</option>
              <option>30 aulas</option>
              <option>20 aulas</option>
            </select>
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Template</label>
            <select className="form-select">
              <option>Violão Adulto Padrão</option>
              <option>Guitarra Rock</option>
              <option>Canto Popular</option>
              <option>Novo</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="rounded-[var(--radius)] p-5 text-center text-white relative overflow-hidden cursor-pointer transition-all border-2 border-[rgba(255,255,255,0.4)] bg-gradient-to-br from-[#4F46E5] to-foundation hover:-translate-y-0.5 hover:shadow-[var(--shadow-lg)]">
          <div className="text-2xl mb-1.5">🧱</div>
          <div className="font-bold">Foundation</div>
          <div className="text-[11px] opacity-70">40 aulas · Base Técnica</div>
        </div>
        <div className="rounded-[var(--radius)] p-5 text-center text-white relative overflow-hidden cursor-pointer transition-all border-2 border-transparent bg-gradient-to-br from-[#EA580C] to-grow hover:-translate-y-0.5 hover:shadow-[var(--shadow-lg)]">
          <div className="text-2xl mb-1.5">📈</div>
          <div className="font-bold">Grow</div>
          <div className="text-[11px] opacity-70">40 aulas · Desenvolvimento</div>
        </div>
        <div className="rounded-[var(--radius)] p-5 text-center text-white relative overflow-hidden cursor-pointer transition-all border-2 border-transparent bg-gradient-to-br from-[#16A34A] to-advance hover:-translate-y-0.5 hover:shadow-[var(--shadow-lg)]">
          <div className="text-2xl mb-1.5">✅</div>
          <div className="font-bold">Advance</div>
          <div className="text-[11px] opacity-70">40 aulas · Fluidez e Expressão</div>
        </div>
        <div className="rounded-[var(--radius)] p-5 text-center text-white relative overflow-hidden cursor-pointer transition-all border-2 border-transparent bg-gradient-to-br from-[#DB2777] to-master hover:-translate-y-0.5 hover:shadow-[var(--shadow-lg)]">
          <div className="text-2xl mb-1.5">🏆</div>
          <div className="font-bold">Master</div>
          <div className="text-[11px] opacity-70">40 aulas · Identidade</div>
        </div>
      </div>

      <div className="grid grid-cols-[280px_1fr] gap-5">
        <div className="card p-4">
          <div className="form-label mb-3 text-accent">Estações — Foundation</div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-3 p-3 rounded-[var(--radius-sm)] border border-[rgba(255,45,120,0.25)] bg-accent-soft cursor-pointer transition-all">
              <div className="w-7 h-7 rounded-md bg-accent-soft flex items-center justify-center text-xs text-accent font-bold shrink-0">1</div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[13px] truncate">Fundamentos 1</div>
                <div className="text-[11px] text-text3">Aulas 1-10 · 10 aulas</div>
              </div>
              <span className="badge badge-accent text-[9px] px-1.5 py-0.5">START</span>
            </div>
            
            <div className="flex items-center gap-3 p-3 rounded-[var(--radius-sm)] border border-border cursor-pointer transition-all hover:bg-azul-soft hover:border-[rgba(30,58,95,0.2)]">
              <div className="w-7 h-7 rounded-md bg-azul-soft flex items-center justify-center text-xs text-azul-claro font-bold shrink-0">2</div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[13px] truncate">Fundamentos 2</div>
                <div className="text-[11px] text-text3">Aulas 11-20 · 10 aulas</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-[var(--radius-sm)] border border-border cursor-pointer transition-all hover:bg-azul-soft hover:border-[rgba(30,58,95,0.2)]">
              <div className="w-7 h-7 rounded-md bg-foundation-soft flex items-center justify-center text-xs text-foundation font-bold shrink-0">3</div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[13px] truncate">Revisão 1+2</div>
                <div className="text-[11px] text-text3">Aulas 21-22 · 2 aulas</div>
              </div>
              <span className="badge badge-foundation text-[9px] px-1.5 py-0.5">CORE</span>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-[var(--radius-sm)] border border-border cursor-pointer transition-all hover:bg-azul-soft hover:border-[rgba(30,58,95,0.2)]">
              <div className="w-7 h-7 rounded-md bg-azul-soft flex items-center justify-center text-xs text-azul-claro font-bold shrink-0">4</div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[13px] truncate">Desenvolvimento 1</div>
                <div className="text-[11px] text-text3">Aulas 23-32 · 10 aulas</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-[var(--radius-sm)] border border-border cursor-pointer transition-all hover:bg-azul-soft hover:border-[rgba(30,58,95,0.2)]">
              <div className="w-7 h-7 rounded-md bg-azul-soft flex items-center justify-center text-xs text-azul-claro font-bold shrink-0">5</div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[13px] truncate">Desenvolvimento 2</div>
                <div className="text-[11px] text-text3">Aulas 33-42 · 10 aulas</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-[var(--radius-sm)] border border-border cursor-pointer transition-all hover:bg-azul-soft hover:border-[rgba(30,58,95,0.2)]">
              <div className="w-7 h-7 rounded-md bg-verde-soft flex items-center justify-center text-xs text-verde font-bold shrink-0">6</div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[13px] truncate">Consolidação</div>
                <div className="text-[11px] text-text3">Aulas 43-44 · 2 aulas</div>
              </div>
              <span className="badge badge-verde text-[9px] px-1.5 py-0.5">CHECK</span>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm w-full mt-3 justify-center">
            <Plus size={16} /> Adicionar Estação
          </button>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="form-label text-accent mb-1">Estação 1</div>
              <div className="font-serif text-[20px]">Fundamentos 1</div>
              <div className="text-[11px] text-text3 mt-2">Selecione e reordene os tópicos por dimensão</div>
            </div>
            <button className="btn btn-primary btn-sm">
              <FloppyDisk size={16} /> Salvar
            </button>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="rounded-[var(--radius-sm)] border border-border p-4 bg-bg">
              <div className="font-bold text-[13px] mb-3 text-[#818CF8]">📖 Teoria e Conceitos</div>
              <div className="flex items-center gap-2 p-2.5 rounded-md border border-border mb-1 bg-card text-xs text-text2">
                <div className="w-4 h-4 rounded-[3px] border-2 border-verde bg-verde text-white flex items-center justify-center text-[9px] shrink-0 cursor-pointer">✓</div>
                <span>Anatomia do instrumento</span>
                <span className="ml-auto cursor-grab text-text3">⠿</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-md border border-border mb-1 bg-card text-xs text-text2">
                <div className="w-4 h-4 rounded-[3px] border-2 border-verde bg-verde text-white flex items-center justify-center text-[9px] shrink-0 cursor-pointer">✓</div>
                <span>Postura (indicação dedos, posição mãos)</span>
                <span className="ml-auto cursor-grab text-text3">⠿</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-md border border-border mb-1 bg-card text-xs text-text2">
                <div className="w-4 h-4 rounded-[3px] border-2 border-verde bg-verde text-white flex items-center justify-center text-[9px] shrink-0 cursor-pointer">✓</div>
                <span>Propriedades do som (Altura, Intensidade, Timbre, Duração)</span>
                <span className="ml-auto cursor-grab text-text3">⠿</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-md border border-border mb-1 bg-card text-xs text-text2">
                <div className="w-4 h-4 rounded-[3px] border-2 border-verde bg-verde text-white flex items-center justify-center text-[9px] shrink-0 cursor-pointer">✓</div>
                <span>Leitura — Tablatura</span>
                <span className="ml-auto cursor-grab text-text3">⠿</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-md border border-border mb-1 bg-card text-xs text-text2">
                <div className="w-4 h-4 rounded-[3px] border-2 border-text3 flex items-center justify-center text-[9px] shrink-0 cursor-pointer"></div>
                <span className="text-text3">Tom e semitom</span>
                <span className="ml-auto cursor-grab text-text3">⠿</span>
              </div>
            </div>

            <div className="rounded-[var(--radius-sm)] border border-border p-4 bg-bg">
              <div className="font-bold text-[13px] mb-3 text-grow">🎯 Técnica</div>
              <div className="flex items-center gap-2 p-2.5 rounded-md border border-border mb-1 bg-card text-xs text-text2">
                <div className="w-4 h-4 rounded-[3px] border-2 border-verde bg-verde text-white flex items-center justify-center text-[9px] shrink-0 cursor-pointer">✓</div>
                <span>Exercícios Psicomotor 1234 e variações</span>
                <span className="ml-auto cursor-grab text-text3">⠿</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-md border border-border mb-1 bg-card text-xs text-text2">
                <div className="w-4 h-4 rounded-[3px] border-2 border-verde bg-verde text-white flex items-center justify-center text-[9px] shrink-0 cursor-pointer">✓</div>
                <span>Acordes G, C, E (1 dedo) · A (2 dedos) · D (3 dedos)</span>
                <span className="ml-auto cursor-grab text-text3">⠿</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-md border border-border mb-1 bg-card text-xs text-text2">
                <div className="w-4 h-4 rounded-[3px] border-2 border-verde bg-verde text-white flex items-center justify-center text-[9px] shrink-0 cursor-pointer">✓</div>
                <span>Coordenação na troca dos acordes</span>
                <span className="ml-auto cursor-grab text-text3">⠿</span>
              </div>
            </div>

            <div className="rounded-[var(--radius-sm)] border border-border p-4 bg-bg">
              <div className="font-bold text-[13px] mb-3 text-advance">🥁 Ritmo</div>
              <div className="flex items-center gap-2 p-2.5 rounded-md border border-border mb-1 bg-card text-xs text-text2">
                <div className="w-4 h-4 rounded-[3px] border-2 border-verde bg-verde text-white flex items-center justify-center text-[9px] shrink-0 cursor-pointer">✓</div>
                <span>Pulso e Andamento (metrônomo)</span>
                <span className="ml-auto cursor-grab text-text3">⠿</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-md border border-border mb-1 bg-card text-xs text-text2">
                <div className="w-4 h-4 rounded-[3px] border-2 border-verde bg-verde text-white flex items-center justify-center text-[9px] shrink-0 cursor-pointer">✓</div>
                <span>Exercícios Rítmicos motores</span>
                <span className="ml-auto cursor-grab text-text3">⠿</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-md border border-border mb-1 bg-card text-xs text-text2">
                <div className="w-4 h-4 rounded-[3px] border-2 border-verde bg-verde text-white flex items-center justify-center text-[9px] shrink-0 cursor-pointer">✓</div>
                <span>Percepção Rítmica (auditiva → prática)</span>
                <span className="ml-auto cursor-grab text-text3">⠿</span>
              </div>
            </div>

            <div className="rounded-[var(--radius-sm)] border border-border p-4 bg-bg">
              <div className="font-bold text-[13px] mb-3 text-master">🎵 Repertório</div>
              <div className="flex items-center gap-2 p-2.5 rounded-md border border-border mb-1 bg-card text-xs text-text2">
                <div className="w-4 h-4 rounded-[3px] border-2 border-verde bg-verde text-white flex items-center justify-center text-[9px] shrink-0 cursor-pointer">✓</div>
                <span>Músicas 1-2 dedos (W Brasil, Twist and Shout, Golden)</span>
                <span className="ml-auto cursor-grab text-text3">⠿</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-md border border-border mb-1 bg-card text-xs text-text2">
                <div className="w-4 h-4 rounded-[3px] border-2 border-verde bg-verde text-white flex items-center justify-center text-[9px] shrink-0 cursor-pointer">✓</div>
                <span>Músicas 2-3 dedos (Love Me Do, Trem Bala, Viva La Vida)</span>
                <span className="ml-auto cursor-grab text-text3">⠿</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
