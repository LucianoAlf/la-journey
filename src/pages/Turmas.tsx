import { Plus, PencilSimple } from "@phosphor-icons/react";
import { useAppContext } from "../AppContext";

export function Turmas() {
  const { openModal } = useAppContext();

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-[26px] leading-[1.2] text-text">
            Gestão de <em className="not-italic text-accent">Turmas</em>
          </h1>
          <p className="text-text2 text-[13.5px] mt-1.5">
            Turmas, horários, professores e jornadas vinculadas
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => openModal('modal-turma')}>
          <Plus size={16} /> Nova Turma
        </button>
      </div>

      <div className="card mb-4">
        <div className="grid grid-cols-4 gap-4">
          <div className="form-group mb-0">
            <label className="form-label">Buscar</label>
            <input className="form-input" placeholder="Nome da turma" />
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
            <label className="form-label">Professor</label>
            <select className="form-select">
              <option>Todos</option>
              <option>Renan</option>
              <option>Kinho</option>
              <option>Peterson</option>
              <option>Jeyson</option>
              <option>Juliana</option>
            </select>
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Unidade</label>
            <select className="form-select">
              <option>Todas</option>
              <option>Campo Grande</option>
              <option>Recreio</option>
              <option>Barra</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left px-3.5 py-2.5 text-[10px] tracking-[2px] uppercase text-text3 border-b-2 border-border font-semibold">Turma</th>
                <th className="text-left px-3.5 py-2.5 text-[10px] tracking-[2px] uppercase text-text3 border-b-2 border-border font-semibold">Instrumento</th>
                <th className="text-left px-3.5 py-2.5 text-[10px] tracking-[2px] uppercase text-text3 border-b-2 border-border font-semibold">Professor</th>
                <th className="text-left px-3.5 py-2.5 text-[10px] tracking-[2px] uppercase text-text3 border-b-2 border-border font-semibold">Horário</th>
                <th className="text-left px-3.5 py-2.5 text-[10px] tracking-[2px] uppercase text-text3 border-b-2 border-border font-semibold">Alunos</th>
                <th className="text-left px-3.5 py-2.5 text-[10px] tracking-[2px] uppercase text-text3 border-b-2 border-border font-semibold">Jornada</th>
                <th className="text-left px-3.5 py-2.5 text-[10px] tracking-[2px] uppercase text-text3 border-b-2 border-border font-semibold">Unidade</th>
                <th className="text-left px-3.5 py-2.5 text-[10px] tracking-[2px] uppercase text-text3 border-b-2 border-border font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border hover:bg-azul-soft transition-all">
                <td className="px-3.5 py-3 text-[13.5px] text-text font-bold">Violão Adulto — Seg/Qua 19h</td>
                <td className="px-3.5 py-3 text-[13.5px] text-text2">Violão</td>
                <td className="px-3.5 py-3 text-[13.5px] text-text2">Renan</td>
                <td className="px-3.5 py-3 text-[13.5px] text-text2 font-mono text-xs">Seg/Qua 19:00</td>
                <td className="px-3.5 py-3 text-[13.5px] text-text2">8/10</td>
                <td className="px-3.5 py-3 text-[13.5px] text-text2"><span className="badge badge-foundation">Violão Adulto Padrão</span></td>
                <td className="px-3.5 py-3 text-[13.5px] text-text2">Campo Grande</td>
                <td className="px-3.5 py-3 text-[13.5px] text-text2"><button className="btn btn-ghost btn-sm"><PencilSimple size={16} /></button></td>
              </tr>
              <tr className="border-b border-border hover:bg-azul-soft transition-all">
                <td className="px-3.5 py-3 text-[13.5px] text-text font-bold">Guitarra Rock — Ter/Qui 20h</td>
                <td className="px-3.5 py-3 text-[13.5px] text-text2">Guitarra</td>
                <td className="px-3.5 py-3 text-[13.5px] text-text2">Kinho</td>
                <td className="px-3.5 py-3 text-[13.5px] text-text2 font-mono text-xs">Ter/Qui 20:00</td>
                <td className="px-3.5 py-3 text-[13.5px] text-text2">6/8</td>
                <td className="px-3.5 py-3 text-[13.5px] text-text2"><span className="badge badge-foundation">Guitarra Rock</span></td>
                <td className="px-3.5 py-3 text-[13.5px] text-text2">Campo Grande</td>
                <td className="px-3.5 py-3 text-[13.5px] text-text2"><button className="btn btn-ghost btn-sm"><PencilSimple size={16} /></button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
