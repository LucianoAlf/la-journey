import { Plus, DeviceMobile, PaperPlaneTilt } from "@phosphor-icons/react";
import { useState } from "react";
import { cn } from "../utils";
import { useAppContext } from "../AppContext";

export function Alunos() {
  const [activeTab, setActiveTab] = useState("todos");
  const { openModal } = useAppContext();

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-[26px] leading-[1.2] text-text">
            Monitoramento de <em className="not-italic text-accent">Alunos</em>
          </h1>
          <p className="text-text2 text-[13.5px] mt-1.5">
            Acompanhe o progresso na jornada e envie materiais complementares
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => openModal('modal-aluno')}>
          <Plus size={16} /> Novo Aluno
        </button>
      </div>

      <div className="card mb-4">
        <div className="grid grid-cols-4 gap-4">
          <div className="form-group mb-0">
            <label className="form-label">Buscar aluno</label>
            <input className="form-input" placeholder="Nome do aluno" />
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Instrumento</label>
            <select className="form-select">
              <option>Todos</option>
              <option>Violão</option>
              <option>Guitarra</option>
              <option>Teclado</option>
              <option>Canto</option>
              <option>Bateria</option>
            </select>
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Stage</label>
            <select className="form-select">
              <option>Todos</option>
              <option>Foundation</option>
              <option>Grow</option>
              <option>Advance</option>
              <option>Master</option>
            </select>
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Status</label>
            <select className="form-select">
              <option>Todos</option>
              <option>No ritmo</option>
              <option>Adiantado</option>
              <option>Atrasado</option>
              <option>Estagnado</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5 py-3.5 px-5 bg-dourado-soft border border-[rgba(245,158,11,0.2)] rounded-[var(--radius)] mb-4">
        <span className="text-lg">⚠️</span>
        <div className="flex-1">
          <div className="font-bold text-dourado">2 alunos precisam de atenção</div>
          <div className="text-sm text-text2">Ana Oliveira atrasada (3 aulas) · João Ferreira estagnado há 2 semanas</div>
        </div>
        <button className="btn btn-accent btn-sm">
          <PaperPlaneTilt size={16} /> Enviar Material
        </button>
      </div>

      <div className="flex gap-0.5 bg-bg2 rounded-[var(--radius-sm)] p-1 mb-6 w-fit flex-wrap">
        <div onClick={() => setActiveTab("todos")} className={cn("px-4 py-2 rounded-md text-[13px] font-medium cursor-pointer transition-all whitespace-nowrap", activeTab === "todos" ? "bg-gradient-to-br from-azul-escuro to-azul text-white shadow-[0_2px_8px_rgba(30,58,95,0.3)]" : "text-text2 hover:text-azul-claro hover:bg-azul-soft")}>Todos (8)</div>
        <div onClick={() => setActiveTab("ritmo")} className={cn("px-4 py-2 rounded-md text-[13px] font-medium cursor-pointer transition-all whitespace-nowrap", activeTab === "ritmo" ? "bg-gradient-to-br from-azul-escuro to-azul text-white shadow-[0_2px_8px_rgba(30,58,95,0.3)]" : "text-text2 hover:text-azul-claro hover:bg-azul-soft")}>No ritmo</div>
        <div onClick={() => setActiveTab("adiantados")} className={cn("px-4 py-2 rounded-md text-[13px] font-medium cursor-pointer transition-all whitespace-nowrap", activeTab === "adiantados" ? "bg-gradient-to-br from-azul-escuro to-azul text-white shadow-[0_2px_8px_rgba(30,58,95,0.3)]" : "text-text2 hover:text-azul-claro hover:bg-azul-soft")}>Adiantados</div>
        <div onClick={() => setActiveTab("atrasados")} className={cn("px-4 py-2 rounded-md text-[13px] font-medium cursor-pointer transition-all whitespace-nowrap", activeTab === "atrasados" ? "bg-gradient-to-br from-azul-escuro to-azul text-white shadow-[0_2px_8px_rgba(30,58,95,0.3)]" : "text-text2 hover:text-azul-claro hover:bg-azul-soft")}>Atrasados</div>
        <div onClick={() => setActiveTab("estagnados")} className={cn("px-4 py-2 rounded-md text-[13px] font-medium cursor-pointer transition-all whitespace-nowrap", activeTab === "estagnados" ? "bg-gradient-to-br from-azul-escuro to-azul text-white shadow-[0_2px_8px_rgba(30,58,95,0.3)]" : "text-text2 hover:text-azul-claro hover:bg-azul-soft")}>Estagnados</div>
      </div>

      {activeTab === "todos" && (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left px-3.5 py-2.5 text-[10px] tracking-[2px] uppercase text-text3 border-b-2 border-border font-semibold">Aluno</th>
                  <th className="text-left px-3.5 py-2.5 text-[10px] tracking-[2px] uppercase text-text3 border-b-2 border-border font-semibold">Instrumento</th>
                  <th className="text-left px-3.5 py-2.5 text-[10px] tracking-[2px] uppercase text-text3 border-b-2 border-border font-semibold">Stage</th>
                  <th className="text-left px-3.5 py-2.5 text-[10px] tracking-[2px] uppercase text-text3 border-b-2 border-border font-semibold">Estação</th>
                  <th className="text-left px-3.5 py-2.5 text-[10px] tracking-[2px] uppercase text-text3 border-b-2 border-border font-semibold">Aula</th>
                  <th className="text-left px-3.5 py-2.5 text-[10px] tracking-[2px] uppercase text-text3 border-b-2 border-border font-semibold">Progresso</th>
                  <th className="text-left px-3.5 py-2.5 text-[10px] tracking-[2px] uppercase text-text3 border-b-2 border-border font-semibold">Status</th>
                  <th className="text-left px-3.5 py-2.5 text-[10px] tracking-[2px] uppercase text-text3 border-b-2 border-border font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border hover:bg-azul-soft transition-all">
                  <td className="px-3.5 py-3 text-[13.5px] text-text font-bold">Lucas Silva</td>
                  <td className="px-3.5 py-3 text-[13.5px] text-text2">Violão</td>
                  <td className="px-3.5 py-3 text-[13.5px] text-text2"><span className="badge badge-foundation">Foundation</span></td>
                  <td className="px-3.5 py-3 text-[13.5px] text-text2">Est. 3</td>
                  <td className="px-3.5 py-3 text-[13.5px] text-text2 font-mono">22/44</td>
                  <td className="px-3.5 py-3 text-[13.5px] text-text2">
                    <div className="w-20 h-1 bg-bg2 rounded-sm overflow-hidden"><div className="h-full rounded-sm bg-foundation w-1/2" /></div>
                  </td>
                  <td className="px-3.5 py-3 text-[13.5px] text-text2"><span className="badge badge-verde">No ritmo</span></td>
                  <td className="px-3.5 py-3 text-[13.5px] text-text2"><button className="btn btn-ghost btn-sm"><DeviceMobile size={16} /></button></td>
                </tr>
                <tr className="border-b border-border hover:bg-azul-soft transition-all">
                  <td className="px-3.5 py-3 text-[13.5px] text-dourado font-bold">Ana Oliveira ⚠️</td>
                  <td className="px-3.5 py-3 text-[13.5px] text-text2">Teclado</td>
                  <td className="px-3.5 py-3 text-[13.5px] text-text2"><span className="badge badge-foundation">Foundation</span></td>
                  <td className="px-3.5 py-3 text-[13.5px] text-text2">Est. 1</td>
                  <td className="px-3.5 py-3 text-[13.5px] text-text2 font-mono">8/44</td>
                  <td className="px-3.5 py-3 text-[13.5px] text-text2">
                    <div className="w-20 h-1 bg-bg2 rounded-sm overflow-hidden"><div className="h-full rounded-sm bg-dourado w-[18%]" /></div>
                  </td>
                  <td className="px-3.5 py-3 text-[13.5px] text-text2"><span className="badge badge-dourado">Atrasada</span></td>
                  <td className="px-3.5 py-3 text-[13.5px] text-text2"><button className="btn btn-accent btn-sm">Enviar</button></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
