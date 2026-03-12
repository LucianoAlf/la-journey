import { UploadSimple, Plus, PencilSimple } from "@phosphor-icons/react";
import { useState } from "react";
import { cn } from "../utils";
import { useAppContext } from "../AppContext";

export function Conteudo() {
  const [activeTab, setActiveTab] = useState("lista");
  const { openModal } = useAppContext();

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-[26px] leading-[1.2] text-text">
            Base de Conteúdo <em className="not-italic text-accent">Curado</em>
          </h1>
          <p className="text-text2 text-[13.5px] mt-1.5">
            Repositório pedagógico musical · Curadoria N4 · Versionamento
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost btn-sm">
            <UploadSimple size={16} /> Importar
          </button>
          <button className="btn btn-primary" onClick={() => openModal('modal-conteudo')}>
            <Plus size={16} /> Novo Bloco
          </button>
        </div>
      </div>

      <div className="card mb-4">
        <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr] gap-4">
          <div className="form-group mb-0">
            <label className="form-label">Buscar conteúdo</label>
            <input className="form-input" placeholder="Título ou tag..." />
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Instrumento</label>
            <select className="form-select">
              <option>Todos</option>
              <option>Universal (Teoria)</option>
              <option>Violão</option>
              <option>Guitarra</option>
              <option>Teclado</option>
              <option>Canto</option>
              <option>Bateria</option>
            </select>
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Pilar</label>
            <select className="form-select">
              <option>Todos</option>
              <option>Fund. Teóricos</option>
              <option>Prática Instrumento</option>
              <option>Repertório</option>
              <option>Improv. e Composição</option>
              <option>Desenv. Auditivo</option>
              <option>Avaliações</option>
            </select>
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Nível</label>
            <select className="form-select">
              <option>Todos</option>
              <option>Foundation</option>
              <option>Grow</option>
              <option>Advance</option>
              <option>Master</option>
            </select>
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Tipo</label>
            <select className="form-select">
              <option>Todos</option>
              <option>Texto explicativo</option>
              <option>Exercício</option>
              <option>Diagrama</option>
              <option>Partitura</option>
              <option>Imagem</option>
            </select>
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Status</label>
            <select className="form-select">
              <option>Todos</option>
              <option>Rascunho</option>
              <option>Em revisão</option>
              <option>Aprovado</option>
              <option>Publicado</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex gap-0.5 bg-bg2 rounded-[var(--radius-sm)] p-1 mb-6 w-fit flex-wrap">
        <div 
          onClick={() => setActiveTab("lista")}
          className={cn("px-4 py-2 rounded-md text-[13px] font-medium cursor-pointer transition-all whitespace-nowrap", activeTab === "lista" ? "bg-gradient-to-br from-azul-escuro to-azul text-white shadow-[0_2px_8px_rgba(30,58,95,0.3)]" : "text-text2 hover:text-azul-claro hover:bg-azul-soft")}
        >
          Lista
        </div>
        <div 
          onClick={() => setActiveTab("topicos")}
          className={cn("px-4 py-2 rounded-md text-[13px] font-medium cursor-pointer transition-all whitespace-nowrap", activeTab === "topicos" ? "bg-gradient-to-br from-azul-escuro to-azul text-white shadow-[0_2px_8px_rgba(30,58,95,0.3)]" : "text-text2 hover:text-azul-claro hover:bg-azul-soft")}
        >
          Por Tópico
        </div>
        <div 
          onClick={() => setActiveTab("curadoria")}
          className={cn("px-4 py-2 rounded-md text-[13px] font-medium cursor-pointer transition-all whitespace-nowrap", activeTab === "curadoria" ? "bg-gradient-to-br from-azul-escuro to-azul text-white shadow-[0_2px_8px_rgba(30,58,95,0.3)]" : "text-text2 hover:text-azul-claro hover:bg-azul-soft")}
        >
          Fila de Curadoria
        </div>
      </div>

      {activeTab === "lista" && (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left px-3.5 py-2.5 text-[10px] tracking-[2px] uppercase text-text3 border-b-2 border-border font-semibold">Bloco de Conteúdo</th>
                  <th className="text-left px-3.5 py-2.5 text-[10px] tracking-[2px] uppercase text-text3 border-b-2 border-border font-semibold">Instrumento</th>
                  <th className="text-left px-3.5 py-2.5 text-[10px] tracking-[2px] uppercase text-text3 border-b-2 border-border font-semibold">Pilar</th>
                  <th className="text-left px-3.5 py-2.5 text-[10px] tracking-[2px] uppercase text-text3 border-b-2 border-border font-semibold">Nível</th>
                  <th className="text-left px-3.5 py-2.5 text-[10px] tracking-[2px] uppercase text-text3 border-b-2 border-border font-semibold">Tipo</th>
                  <th className="text-left px-3.5 py-2.5 text-[10px] tracking-[2px] uppercase text-text3 border-b-2 border-border font-semibold">Curador</th>
                  <th className="text-left px-3.5 py-2.5 text-[10px] tracking-[2px] uppercase text-text3 border-b-2 border-border font-semibold">Versão</th>
                  <th className="text-left px-3.5 py-2.5 text-[10px] tracking-[2px] uppercase text-text3 border-b-2 border-border font-semibold">Status</th>
                  <th className="text-left px-3.5 py-2.5 text-[10px] tracking-[2px] uppercase text-text3 border-b-2 border-border font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border hover:bg-azul-soft transition-all">
                  <td className="px-3.5 py-3 text-[13.5px] text-text">
                    <div className="font-bold">Anatomia do Violão</div>
                    <div className="text-[11px] text-text3">Partes do instrumento, cordas, trastes, braço</div>
                  </td>
                  <td className="px-3.5 py-3 text-[13.5px] text-text2">Violão</td>
                  <td className="px-3.5 py-3 text-[13.5px] text-text2">Fund. Teóricos</td>
                  <td className="px-3.5 py-3 text-[13.5px] text-text2"><span className="badge badge-foundation">Foundation</span></td>
                  <td className="px-3.5 py-3 text-[13.5px] text-text2"><span className="badge badge-azul">Texto + Imagem</span></td>
                  <td className="px-3.5 py-3 text-[13.5px] text-text2">Renan</td>
                  <td className="px-3.5 py-3 text-[13.5px] text-text2 font-mono text-xs">v3</td>
                  <td className="px-3.5 py-3 text-[13.5px] text-text2"><span className="badge badge-verde">Publicado</span></td>
                  <td className="px-3.5 py-3 text-[13.5px] text-text2"><button className="btn btn-ghost btn-sm"><PencilSimple size={16} /></button></td>
                </tr>
                <tr className="border-b border-border hover:bg-azul-soft transition-all">
                  <td className="px-3.5 py-3 text-[13.5px] text-text">
                    <div className="font-bold">Escala Maior — Construção e Aplicação</div>
                    <div className="text-[11px] text-text3">T T ST T T T ST · Todas as tonalidades</div>
                  </td>
                  <td className="px-3.5 py-3 text-[13.5px] text-text2">Universal</td>
                  <td className="px-3.5 py-3 text-[13.5px] text-text2">Fund. Teóricos</td>
                  <td className="px-3.5 py-3 text-[13.5px] text-text2"><span className="badge badge-grow">Grow</span></td>
                  <td className="px-3.5 py-3 text-[13.5px] text-text2"><span className="badge badge-azul">Texto + Diagrama</span></td>
                  <td className="px-3.5 py-3 text-[13.5px] text-text2">Kinho</td>
                  <td className="px-3.5 py-3 text-[13.5px] text-text2 font-mono text-xs">v2</td>
                  <td className="px-3.5 py-3 text-[13.5px] text-text2"><span className="badge badge-verde">Publicado</span></td>
                  <td className="px-3.5 py-3 text-[13.5px] text-text2"><button className="btn btn-ghost btn-sm"><PencilSimple size={16} /></button></td>
                </tr>
                <tr className="border-b border-border hover:bg-azul-soft transition-all">
                  <td className="px-3.5 py-3 text-[13.5px] text-text">
                    <div className="font-bold">Formação de Acordes Tríades</div>
                    <div className="text-[11px] text-text3">Maior, menor, diminuto, aumentado</div>
                  </td>
                  <td className="px-3.5 py-3 text-[13.5px] text-text2">Universal</td>
                  <td className="px-3.5 py-3 text-[13.5px] text-text2">Fund. Teóricos</td>
                  <td className="px-3.5 py-3 text-[13.5px] text-text2"><span className="badge badge-grow">Grow</span></td>
                  <td className="px-3.5 py-3 text-[13.5px] text-text2"><span className="badge badge-azul">Texto + Notação</span></td>
                  <td className="px-3.5 py-3 text-[13.5px] text-text2">Peterson</td>
                  <td className="px-3.5 py-3 text-[13.5px] text-text2 font-mono text-xs">v1</td>
                  <td className="px-3.5 py-3 text-[13.5px] text-text2"><span className="badge badge-dourado">Em revisão</span></td>
                  <td className="px-3.5 py-3 text-[13.5px] text-text2"><button className="btn btn-ghost btn-sm"><PencilSimple size={16} /></button></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "topicos" && (
        <div className="grid grid-cols-2 gap-5">
          <div className="card">
            <div className="font-serif mb-3 text-[17px]">Foundation — Violão</div>
            <div className="flex flex-col gap-1.5">
              <div className="p-2.5 border border-border rounded-[var(--radius-sm)]">
                <div className="font-bold text-sm">Anatomia do instrumento</div>
                <div className="text-[11px] text-text3 mt-1">3 blocos · Texto + Imagem · <span className="text-verde">Publicado</span></div>
              </div>
              <div className="p-2.5 border border-border rounded-[var(--radius-sm)]">
                <div className="font-bold text-sm">Postura e posição das mãos</div>
                <div className="text-[11px] text-text3 mt-1">2 blocos · Texto + Imagem IA · <span className="text-verde">Publicado</span></div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="font-serif mb-3 text-[17px]">Grow — Universal (Teoria)</div>
            <div className="flex flex-col gap-1.5">
              <div className="p-2.5 border border-border rounded-[var(--radius-sm)]">
                <div className="font-bold text-sm">Escala Maior</div>
                <div className="text-[11px] text-text3 mt-1">4 blocos · VexFlow + Diagrama · <span className="text-verde">Publicado</span></div>
              </div>
              <div className="p-2.5 border border-border rounded-[var(--radius-sm)]">
                <div className="font-bold text-sm">Escala Menor Natural / Harmônica / Melódica</div>
                <div className="text-[11px] text-text3 mt-1">6 blocos · VexFlow + Diagrama · <span className="text-dourado">Em revisão</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "curadoria" && (
        <div>
          <div className="flex items-center gap-2.5 py-3.5 px-5 bg-dourado-soft border border-[rgba(245,158,11,0.2)] rounded-[var(--radius)] mb-4">
            <span className="text-lg">📋</span>
            <div className="flex-1">
              <div className="font-bold text-dourado">5 blocos aguardando curadoria</div>
              <div className="text-sm text-text2">Professores N4 precisam revisar e aprovar antes da publicação</div>
            </div>
          </div>
          <div className="card">
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-3 p-3.5 border border-border rounded-[var(--radius-sm)] border-l-[3px] border-l-dourado">
                <div className="flex-1">
                  <div className="font-bold text-sm">Formação de Acordes Tríades <span className="badge badge-dourado ml-1.5">Em revisão</span></div>
                  <div className="text-[11px] text-text3 mt-1">Peterson · v1 · Enviado há 2 dias</div>
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-ghost btn-sm text-verde">✓ Aprovar</button>
                  <button className="btn btn-ghost btn-sm text-vermelho">✕ Devolver</button>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3.5 border border-border rounded-[var(--radius-sm)] border-l-[3px] border-l-accent">
                <div className="flex-1">
                  <div className="font-bold text-sm">Modos Gregos — Visão Geral <span className="badge badge-accent ml-1.5">Rascunho</span></div>
                  <div className="text-[11px] text-text3 mt-1">Kinho · v1 · Criado há 5 dias</div>
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-ghost btn-sm">👁️ Revisar</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
