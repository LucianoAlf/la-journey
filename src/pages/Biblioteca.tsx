import { Plus } from "@phosphor-icons/react";
import { useState } from "react";
import { cn } from "../utils";
import { useAppContext } from "../AppContext";

export function Biblioteca() {
  const [activeTab, setActiveTab] = useState("acordes");
  const { openModal } = useAppContext();

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-[26px] leading-[1.2] text-text">
            Biblioteca <em className="not-italic text-accent">Musical</em>
          </h1>
          <p className="text-text2 text-[13.5px] mt-1.5">
            Acordes, escalas, notação e elementos renderizados · SVGuitar · VexFlow · VexTab
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => openModal(activeTab === 'imagens' ? 'modal-imagem' : 'modal-acorde')}>
          <Plus size={16} /> {activeTab === 'imagens' ? 'Gerar Imagem' : 'Novo Acorde'}
        </button>
      </div>

      <div className="flex gap-0.5 bg-bg2 rounded-[var(--radius-sm)] p-1 mb-6 w-fit flex-wrap">
        <div onClick={() => setActiveTab("acordes")} className={cn("px-4 py-2 rounded-md text-[13px] font-medium cursor-pointer transition-all whitespace-nowrap", activeTab === "acordes" ? "bg-gradient-to-br from-azul-escuro to-azul text-white shadow-[0_2px_8px_rgba(30,58,95,0.3)]" : "text-text2 hover:text-azul-claro hover:bg-azul-soft")}>Biblioteca de Acordes</div>
        <div onClick={() => setActiveTab("escalas")} className={cn("px-4 py-2 rounded-md text-[13px] font-medium cursor-pointer transition-all whitespace-nowrap", activeTab === "escalas" ? "bg-gradient-to-br from-azul-escuro to-azul text-white shadow-[0_2px_8px_rgba(30,58,95,0.3)]" : "text-text2 hover:text-azul-claro hover:bg-azul-soft")}>Escalas</div>
        <div onClick={() => setActiveTab("notacao")} className={cn("px-4 py-2 rounded-md text-[13px] font-medium cursor-pointer transition-all whitespace-nowrap", activeTab === "notacao" ? "bg-gradient-to-br from-azul-escuro to-azul text-white shadow-[0_2px_8px_rgba(30,58,95,0.3)]" : "text-text2 hover:text-azul-claro hover:bg-azul-soft")}>Notação (VexFlow)</div>
        <div onClick={() => setActiveTab("imagens")} className={cn("px-4 py-2 rounded-md text-[13px] font-medium cursor-pointer transition-all whitespace-nowrap", activeTab === "imagens" ? "bg-gradient-to-br from-azul-escuro to-azul text-white shadow-[0_2px_8px_rgba(30,58,95,0.3)]" : "text-text2 hover:text-azul-claro hover:bg-azul-soft")}>Imagens IA</div>
      </div>

      {activeTab === "acordes" && (
        <div>
          <div className="card mb-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="form-group mb-0">
                <label className="form-label">Buscar acorde</label>
                <input className="form-input" placeholder="Ex: Am7, F#m, Bb" />
              </div>
              <div className="form-group mb-0">
                <label className="form-label">Instrumento</label>
                <select className="form-select">
                  <option>Violão</option>
                  <option>Guitarra</option>
                  <option>Ukulele</option>
                </select>
              </div>
              <div className="form-group mb-0">
                <label className="form-label">Tipo</label>
                <select className="form-select">
                  <option>Todos</option>
                  <option>Aberto</option>
                  <option>Pestana</option>
                  <option>Jazz</option>
                </select>
              </div>
              <div className="form-group mb-0">
                <label className="form-label">Dificuldade</label>
                <select className="form-select">
                  <option>Todos</option>
                  <option>1 - Fácil</option>
                  <option>2</option>
                  <option>3</option>
                  <option>4</option>
                  <option>5 - Avançado</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-6 gap-3">
            {['C', 'D', 'E', 'G', 'A', 'Am', 'F', 'Bm', 'Am7', 'Cmaj7', 'Dm7'].map((chord, i) => (
              <div key={i} className="card text-center p-4">
                <div className="w-20 h-[100px] mx-auto mb-2 border border-border rounded-lg flex items-center justify-center bg-bg">
                  <div className="text-[10px] text-text3">SVGuitar<br/>Preview</div>
                </div>
                <div className="font-bold">{chord}</div>
                <div className="text-[11px] text-text3">{i > 7 ? 'Jazz · Nível 4' : i > 5 ? 'Pestana · Nível 3' : 'Aberto · Nível 1'}</div>
              </div>
            ))}
            <div className="card text-center p-4 border-2 border-dashed border-border cursor-pointer hover:border-accent hover:text-accent">
              <div className="w-20 h-[100px] mx-auto mb-2 flex items-center justify-center">
                <div className="text-[28px] text-text3">+</div>
              </div>
              <div className="text-sm text-text2">Adicionar</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "escalas" && (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left px-3.5 py-2.5 text-[10px] tracking-[2px] uppercase text-text3 border-b-2 border-border font-semibold">Escala</th>
                  <th className="text-left px-3.5 py-2.5 text-[10px] tracking-[2px] uppercase text-text3 border-b-2 border-border font-semibold">Notas</th>
                  <th className="text-left px-3.5 py-2.5 text-[10px] tracking-[2px] uppercase text-text3 border-b-2 border-border font-semibold">Intervalos</th>
                  <th className="text-left px-3.5 py-2.5 text-[10px] tracking-[2px] uppercase text-text3 border-b-2 border-border font-semibold">Instrumento</th>
                  <th className="text-left px-3.5 py-2.5 text-[10px] tracking-[2px] uppercase text-text3 border-b-2 border-border font-semibold">Nível</th>
                  <th className="text-left px-3.5 py-2.5 text-[10px] tracking-[2px] uppercase text-text3 border-b-2 border-border font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border hover:bg-azul-soft transition-all">
                  <td className="px-3.5 py-3 text-[13.5px] text-text font-bold">Dó Maior</td>
                  <td className="px-3.5 py-3 text-[13.5px] text-text2 font-mono text-xs">C D E F G A B</td>
                  <td className="px-3.5 py-3 text-[13.5px] text-text2 text-xs">T T ST T T T ST</td>
                  <td className="px-3.5 py-3 text-[13.5px] text-text2">Universal</td>
                  <td className="px-3.5 py-3 text-[13.5px] text-text2"><span className="badge badge-grow">Grow</span></td>
                  <td className="px-3.5 py-3 text-[13.5px] text-text2"><span className="text-[11px] text-text3">VexFlow Preview</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "notacao" && (
        <div className="grid grid-cols-2 gap-5">
          <div className="card">
            <div className="font-serif mb-3 text-[17px]">Figuras Rítmicas</div>
            <div className="flex flex-col gap-2">
              <div className="p-3 border border-border rounded-[var(--radius-sm)] flex items-center gap-3">
                <div className="w-[60px] h-10 border border-border rounded-md flex items-center justify-center bg-bg text-[9px] text-text3">VexFlow</div>
                <div>
                  <div className="font-bold text-sm">Semibreve, Mínima, Semínima</div>
                  <div className="text-[11px] text-text3">Foundation · Aula 3</div>
                </div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="font-serif mb-3 text-[17px]">Tablatura (VexTab)</div>
            <div className="flex flex-col gap-2">
              <div className="p-3 border border-border rounded-[var(--radius-sm)] flex items-center gap-3">
                <div className="w-[60px] h-10 border border-border rounded-md flex items-center justify-center bg-bg text-[9px] text-text3">VexTab</div>
                <div>
                  <div className="font-bold text-sm">Exercício 1234 — Tablatura</div>
                  <div className="text-[11px] text-text3">Foundation · Violão/Guitarra</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "imagens" && (
        <div>
          <div className="flex items-center gap-2.5 py-3.5 px-5 bg-foundation-soft border border-[rgba(99,102,241,0.2)] rounded-[var(--radius)] mb-4">
            <span className="text-lg">🤖</span>
            <div className="flex-1">
              <div className="font-bold text-foundation">Geração de Imagens via IA (Gemini API)</div>
              <div className="text-sm text-text2">Gere imagens reais para materiais: instrumentos, anatomia vocal, cenas musicais, história da música</div>
            </div>
            <button className="btn btn-primary btn-sm">✨ Gerar Imagem</button>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div className="card p-3">
              <div className="aspect-[4/3] bg-gradient-to-br from-azul-soft to-accent-soft rounded-lg flex items-center justify-center mb-2">
                <span className="text-[36px]">🎸</span>
              </div>
              <div className="font-bold text-xs">Violão clássico</div>
              <div className="text-[11px] text-text3">Gemini · 512x512</div>
            </div>
            <div className="card p-3">
              <div className="aspect-[4/3] bg-gradient-to-br from-master-soft to-accent-soft rounded-lg flex items-center justify-center mb-2">
                <span className="text-[36px]">🎤</span>
              </div>
              <div className="font-bold text-xs">Aparelho fonador</div>
              <div className="text-[11px] text-text3">Gemini · Anatomia vocal</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
