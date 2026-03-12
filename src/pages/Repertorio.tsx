import { Lightning, Plus, FileText } from "@phosphor-icons/react";
import { useAppContext } from "../AppContext";

export function Repertorio() {
  const { openModal } = useAppContext();

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-[26px] leading-[1.2] text-text">
            <em className="not-italic text-accent">Repertório</em>
          </h1>
          <p className="text-text2 text-[13.5px] mt-1.5">
            Banco de músicas por instrumento, dificuldade e gênero · Cifra Club API
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost btn-sm">
            <Lightning size={16} /> Importar Cifra Club
          </button>
          <button className="btn btn-primary" onClick={() => openModal('modal-musica')}>
            <Plus size={16} /> Nova Música
          </button>
        </div>
      </div>

      <div className="card mb-4">
        <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr] gap-4">
          <div className="form-group mb-0">
            <label className="form-label">Buscar</label>
            <input className="form-input" placeholder="Nome ou artista" />
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Instrumento</label>
            <select className="form-select">
              <option>Todos</option>
              <option>Violão</option>
              <option>Guitarra</option>
              <option>Teclado</option>
            </select>
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Dificuldade</label>
            <select className="form-select">
              <option>Todas</option>
              <option>1 - Iniciante</option>
              <option>2 - Fácil</option>
              <option>3 - Médio</option>
            </select>
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Gênero</label>
            <select className="form-select">
              <option>Todos</option>
              <option>Rock</option>
              <option>MPB</option>
              <option>Pop</option>
              <option>Reggae</option>
            </select>
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Curadoria</label>
            <select className="form-select">
              <option>Aprovado</option>
              <option>Em revisão</option>
              <option>Rascunho</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left px-3.5 py-2.5 text-[10px] tracking-[2px] uppercase text-text3 border-b-2 border-border font-semibold">Música</th>
                <th className="text-left px-3.5 py-2.5 text-[10px] tracking-[2px] uppercase text-text3 border-b-2 border-border font-semibold">Artista</th>
                <th className="text-left px-3.5 py-2.5 text-[10px] tracking-[2px] uppercase text-text3 border-b-2 border-border font-semibold">Acordes</th>
                <th className="text-left px-3.5 py-2.5 text-[10px] tracking-[2px] uppercase text-text3 border-b-2 border-border font-semibold">Tom</th>
                <th className="text-left px-3.5 py-2.5 text-[10px] tracking-[2px] uppercase text-text3 border-b-2 border-border font-semibold">Gênero</th>
                <th className="text-left px-3.5 py-2.5 text-[10px] tracking-[2px] uppercase text-text3 border-b-2 border-border font-semibold">Nível</th>
                <th className="text-left px-3.5 py-2.5 text-[10px] tracking-[2px] uppercase text-text3 border-b-2 border-border font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border hover:bg-azul-soft transition-all">
                <td className="px-3.5 py-3 text-[13.5px] text-text font-bold">Love Me Do</td>
                <td className="px-3.5 py-3 text-[13.5px] text-text2">Beatles</td>
                <td className="px-3.5 py-3 text-[13.5px] text-text2">
                  <span className="badge badge-azul text-[10px] mr-1">G</span>
                  <span className="badge badge-azul text-[10px] mr-1">C</span>
                  <span className="badge badge-azul text-[10px]">D</span>
                </td>
                <td className="px-3.5 py-3 text-[13.5px] text-text2 font-mono text-xs">G</td>
                <td className="px-3.5 py-3 text-[13.5px] text-text2">Rock</td>
                <td className="px-3.5 py-3 text-[13.5px] text-text2">⭐</td>
                <td className="px-3.5 py-3 text-[13.5px] text-text2"><button className="btn btn-ghost btn-sm"><FileText size={16} /></button></td>
              </tr>
              <tr className="border-b border-border hover:bg-azul-soft transition-all">
                <td className="px-3.5 py-3 text-[13.5px] text-text font-bold">Trem Bala</td>
                <td className="px-3.5 py-3 text-[13.5px] text-text2">Ana Vilela</td>
                <td className="px-3.5 py-3 text-[13.5px] text-text2">
                  <span className="badge badge-azul text-[10px] mr-1">C</span>
                  <span className="badge badge-azul text-[10px] mr-1">G</span>
                  <span className="badge badge-azul text-[10px] mr-1">Am</span>
                  <span className="badge badge-azul text-[10px]">F</span>
                </td>
                <td className="px-3.5 py-3 text-[13.5px] text-text2 font-mono text-xs">C</td>
                <td className="px-3.5 py-3 text-[13.5px] text-text2">MPB</td>
                <td className="px-3.5 py-3 text-[13.5px] text-text2">⭐⭐</td>
                <td className="px-3.5 py-3 text-[13.5px] text-text2"><button className="btn btn-ghost btn-sm"><FileText size={16} /></button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
