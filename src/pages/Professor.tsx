import { FloppyDisk, PaperPlaneTilt } from "@phosphor-icons/react";
import { useAppContext } from "../AppContext";

export function Professor() {
  const { showToast } = useAppContext();

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-[26px] leading-[1.2] text-text">
            Visão do <em className="not-italic text-accent">Professor</em>
          </h1>
          <p className="text-text2 text-[13.5px] mt-1.5">
            Registro de presença, progresso e tópicos por aula
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost btn-sm">◀ Anterior</button>
          <span className="px-4 py-2 border border-border rounded-[var(--radius-sm)] font-semibold text-[13px]">
            11/03/2026 · Quarta
          </span>
          <button className="btn btn-ghost btn-sm">Próxima ▶</button>
        </div>
      </div>

      <div className="card mb-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="form-group mb-0">
            <label className="form-label">Turma do dia</label>
            <select className="form-select">
              <option>Violão Adulto — Seg/Qua 19h (8 alunos)</option>
              <option>Guitarra Rock — Ter/Qui 20h (6 alunos)</option>
              <option>Canto Popular — Qua/Sex 18h (5 alunos)</option>
            </select>
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Estação atual da turma</label>
            <div className="px-3.5 py-2.5 bg-foundation-soft rounded-[var(--radius-sm)] text-[13px]">
              <strong className="text-foundation">Foundation</strong> · Estação 3 — Revisão 1+2 · Aula 22/44
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="font-serif text-[17px]">Chamada e progresso — Aula 22</div>
          <button className="btn btn-primary" onClick={() => showToast('Progresso salvo com sucesso!')}>
            <FloppyDisk size={16} /> Salvar Progresso
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left px-3.5 py-2.5 text-[10px] tracking-[2px] uppercase text-text3 border-b-2 border-border font-semibold">Aluno</th>
                <th className="text-left px-3.5 py-2.5 text-[10px] tracking-[2px] uppercase text-text3 border-b-2 border-border font-semibold">Presença</th>
                <th className="text-left px-3.5 py-2.5 text-[10px] tracking-[2px] uppercase text-text3 border-b-2 border-border font-semibold">Tópicos abordados</th>
                <th className="text-left px-3.5 py-2.5 text-[10px] tracking-[2px] uppercase text-text3 border-b-2 border-border font-semibold">Avaliação</th>
                <th className="text-left px-3.5 py-2.5 text-[10px] tracking-[2px] uppercase text-text3 border-b-2 border-border font-semibold">Observação</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border hover:bg-azul-soft transition-all">
                <td className="px-3.5 py-3 text-[13.5px] text-text font-bold">Lucas Silva</td>
                <td className="px-3.5 py-3 text-[13.5px] text-text2"><span className="badge badge-verde">✓ Presente</span></td>
                <td className="px-3.5 py-3 text-[13.5px] text-text2">
                  <div className="flex gap-1 flex-wrap">
                    <span className="badge badge-foundation text-[9px]">Revisão acordes</span>
                    <span className="badge badge-grow text-[9px]">Coord. troca</span>
                  </div>
                </td>
                <td className="px-3.5 py-3 text-[13.5px] text-text2">⭐⭐⭐⭐</td>
                <td className="px-3.5 py-3 text-[13.5px] text-text2">
                  <input className="form-input px-2.5 py-1.5 text-xs" placeholder="Obs..." />
                </td>
              </tr>
              <tr className="border-b border-border bg-vermelho-soft transition-all">
                <td className="px-3.5 py-3 text-[13.5px] text-vermelho font-bold">Ana Oliveira ⚠️</td>
                <td className="px-3.5 py-3 text-[13.5px] text-text2"><span className="badge badge-vermelho">✕ Ausente</span></td>
                <td className="px-3.5 py-3 text-[13.5px] text-vermelho text-xs" colSpan={2}>
                  3ª falta consecutiva — material complementar será gerado automaticamente
                </td>
                <td className="px-3.5 py-3 text-[13.5px] text-text2">
                  <button className="btn btn-accent btn-sm"><PaperPlaneTilt size={16} /> Enviar</button>
                </td>
              </tr>
              <tr className="border-b border-border bg-dourado-soft transition-all">
                <td className="px-3.5 py-3 text-[13.5px] text-dourado font-bold">João Ferreira</td>
                <td className="px-3.5 py-3 text-[13.5px] text-text2"><span className="badge badge-dourado">⏰ Atrasado</span></td>
                <td className="px-3.5 py-3 text-[13.5px] text-text2">
                  <div className="flex gap-1 flex-wrap">
                    <span className="badge badge-foundation text-[9px]">Revisão acordes</span>
                  </div>
                </td>
                <td className="px-3.5 py-3 text-[13.5px] text-text2">⭐⭐</td>
                <td className="px-3.5 py-3 text-[13.5px] text-text2">
                  <input className="form-input px-2.5 py-1.5 text-xs" defaultValue="Chegou 20min atrasado, precisa reforço" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div className="card">
          <div className="font-serif mb-3 text-[17px]">Tópicos disponíveis — Estação 3</div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 p-2 rounded-md border border-border">
              <div className="w-4 h-4 rounded-[3px] border-2 border-verde bg-verde text-white flex items-center justify-center text-[9px] shrink-0 cursor-pointer">✓</div>
              <span className="text-[13px]">Revisão: Acordes G, C, E, A, D</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-md border border-border">
              <div className="w-4 h-4 rounded-[3px] border-2 border-verde bg-verde text-white flex items-center justify-center text-[9px] shrink-0 cursor-pointer">✓</div>
              <span className="text-[13px]">Revisão: Coordenação de troca</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-md border border-border">
              <div className="w-4 h-4 rounded-[3px] border-2 border-text3 flex items-center justify-center text-[9px] shrink-0 cursor-pointer"></div>
              <span className="text-[13px]">Revisão: Tablatura</span>
            </div>
          </div>
        </div>
        <div className="card bg-gradient-to-br from-azul-escuro to-azul text-white border-none">
          <div className="text-[10px] tracking-[2.5px] uppercase opacity-50 mb-3">IA Monitor</div>
          <div className="font-serif text-[17px] mb-3">Análise da jornada</div>
          <div className="text-[13px] opacity-80 leading-[1.7]">
            ✅ Turma está <strong>no ritmo</strong> — 80% na estação esperada<br/>
            ⚠️ <strong>Ana Oliveira</strong> precisa de intervenção (3 faltas)<br/>
            ⚠️ <strong>João Ferreira</strong> perdendo engajamento<br/>
            💡 Sugestão: enviar desafio musical via WhatsApp para reengajar<br/>
            📊 Professor aderente à jornada: <strong>92%</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
