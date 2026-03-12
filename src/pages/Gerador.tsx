import { Sparkle, FilePdf, WhatsappLogo, Eye, Printer, DownloadSimple, Hourglass } from "@phosphor-icons/react";
import { useAppContext } from "../AppContext";

export function Gerador() {
  const { showToast } = useAppContext();

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-[26px] leading-[1.2] text-text">
            Gerador de <em className="not-italic text-accent">Material</em>
          </h1>
          <p className="text-text2 text-[13.5px] mt-1.5">
            Gere apostilas profissionais com a identidade da sua escola
          </p>
        </div>
        <button className="btn btn-accent" onClick={() => showToast('Iniciando geração de material...')}>
          <Sparkle size={16} /> Gerar Material
        </button>
      </div>

      <div className="card mb-4">
        <div className="grid grid-cols-4 gap-4">
          <div className="form-group mb-0">
            <label className="form-label">Jornada</label>
            <select className="form-select">
              <option>Violão Adulto</option>
              <option>Guitarra Rock</option>
              <option>Canto Popular</option>
            </select>
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Stage</label>
            <select className="form-select">
              <option>Foundation</option>
              <option>Grow</option>
              <option>Advance</option>
              <option>Master</option>
            </select>
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Estação</label>
            <select className="form-select">
              <option>Fundamentos 1 (10 aulas)</option>
              <option>Fundamentos 2 (10 aulas)</option>
              <option>Revisão (2 aulas)</option>
            </select>
          </div>
          <div className="form-group mb-0">
            <label className="form-label">Escopo</label>
            <select className="form-select">
              <option>Módulo completo</option>
              <option>Aula individual</option>
              <option>Ficha de repertório</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div className="flex flex-col gap-4">
          <div className="card">
            <div className="font-serif mb-3 text-[17px]">Identidade Visual</div>
            <div className="flex gap-4 items-center">
              <div className="w-[72px] h-[72px] rounded-[14px] bg-gradient-to-br from-azul-escuro to-azul flex items-center justify-center text-white text-[22px] font-extrabold shrink-0">
                LA
              </div>
              <div>
                <div className="font-bold">LA Music School</div>
                <div className="text-[11px] text-text3 mt-1">Logo, cores e nome aplicados automaticamente</div>
                <div className="flex gap-2 mt-3">
                  <div className="w-6 h-6 rounded-md bg-[#1E3A5F] border border-border" />
                  <div className="w-6 h-6 rounded-md bg-[#FF2D78] border border-border" />
                  <div className="w-6 h-6 rounded-md bg-[#F1F5F9] border border-border" />
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="font-serif mb-3 text-[17px]">Sumário do material</div>
            <div className="flex flex-col gap-1.5">
              <div className="px-3 py-2 rounded-md border border-border text-xs text-text2">
                📖 Teoria: Anatomia, Postura, Propriedades do som, Tablatura
              </div>
              <div className="px-3 py-2 rounded-md border border-border text-xs text-text2">
                🎯 Técnica: Exercícios 1234, Acordes G/C/E/A/D, Coordenação
              </div>
              <div className="px-3 py-2 rounded-md border border-border text-xs text-text2">
                🥁 Ritmo: Pulso e Andamento, Exercícios Rítmicos, Percepção
              </div>
              <div className="px-3 py-2 rounded-md border border-border text-xs text-text2">
                🎵 Repertório: W Brasil, Twist and Shout, Love Me Do, Trem Bala
              </div>
              <div className="px-3 py-2 rounded-md border border-border text-xs text-text2">
                🏆 Gamificação: 3 selos desbloqueáveis, 2 QR codes interativos
              </div>
            </div>
          </div>
        </div>

        <div className="card text-center">
          <div className="font-serif mb-4 text-[17px]">Pré-visualização</div>
          <div className="aspect-[210/297] rounded-xl bg-white p-6 shadow-[0_8px_32px_rgba(0,0,0,0.2)] text-center max-w-[260px] mx-auto relative">
            <div className="w-9 h-9 rounded-lg bg-[#1E3A5F] mx-auto mb-2 flex items-center justify-center text-white text-xs font-extrabold">
              LA
            </div>
            <div className="text-[8px] text-[#333] font-semibold">LA Music School</div>
            <div className="text-[13px] font-extrabold text-[#1E293B] my-3">Fundamentos 1</div>
            <div className="text-[7px] text-[#94A3B8]">Violão · Foundation · 10 Aulas</div>
            <div className="border-t border-[#E2E8F0] mt-3 pt-2.5 text-left">
              <div className="text-[6px] text-[#64748B] py-0.5"><span className="text-[#FF2D78]">●</span> Anatomia do instrumento</div>
              <div className="text-[6px] text-[#64748B] py-0.5"><span className="text-[#FF2D78]">●</span> Postura e posição</div>
              <div className="text-[6px] text-[#64748B] py-0.5"><span className="text-[#FF2D78]">●</span> Propriedades do som</div>
              <div className="text-[6px] text-[#64748B] py-0.5"><span className="text-[#FF2D78]">●</span> Exercícios mãos D e E</div>
              <div className="text-[6px] text-[#64748B] py-0.5"><span className="text-[#FF2D78]">●</span> Acordes G, C, E, A, D</div>
            </div>
          </div>
          <div className="flex gap-2 mt-4 justify-center">
            <button className="btn btn-ghost btn-sm"><FilePdf size={16} /> PDF</button>
            <button className="btn btn-ghost btn-sm"><WhatsappLogo size={16} /> WhatsApp</button>
            <button className="btn btn-ghost btn-sm"><Eye size={16} /> HTML</button>
            <button className="btn btn-ghost btn-sm"><Printer size={16} /> Imprimir</button>
          </div>
        </div>
      </div>

      <div className="card mt-4">
        <div className="flex items-center justify-between mb-4">
          <div className="font-serif text-[17px]">Histórico de materiais</div>
          <span className="badge badge-azul">6 materiais</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left px-3.5 py-2.5 text-[10px] tracking-[2px] uppercase text-text3 border-b-2 border-border font-semibold">Material</th>
                <th className="text-left px-3.5 py-2.5 text-[10px] tracking-[2px] uppercase text-text3 border-b-2 border-border font-semibold">Tipo</th>
                <th className="text-left px-3.5 py-2.5 text-[10px] tracking-[2px] uppercase text-text3 border-b-2 border-border font-semibold">Páginas</th>
                <th className="text-left px-3.5 py-2.5 text-[10px] tracking-[2px] uppercase text-text3 border-b-2 border-border font-semibold">Data</th>
                <th className="text-left px-3.5 py-2.5 text-[10px] tracking-[2px] uppercase text-text3 border-b-2 border-border font-semibold">Downloads</th>
                <th className="text-left px-3.5 py-2.5 text-[10px] tracking-[2px] uppercase text-text3 border-b-2 border-border font-semibold">Status</th>
                <th className="text-left px-3.5 py-2.5 text-[10px] tracking-[2px] uppercase text-text3 border-b-2 border-border font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border hover:bg-azul-soft transition-all">
                <td className="px-3.5 py-3 text-[13.5px] text-text font-bold">Violão Foundation — Fund. 1</td>
                <td className="px-3.5 py-3 text-[13.5px] text-text2 text-xs">Módulo</td>
                <td className="px-3.5 py-3 text-[13.5px] text-text2">32</td>
                <td className="px-3.5 py-3 text-[13.5px] text-text2 font-mono text-xs">10/03</td>
                <td className="px-3.5 py-3 text-[13.5px] text-text2">45</td>
                <td className="px-3.5 py-3 text-[13.5px] text-text2"><span className="badge badge-verde">Pronto</span></td>
                <td className="px-3.5 py-3 text-[13.5px] text-text2"><button className="btn btn-ghost btn-sm"><DownloadSimple size={16} /></button></td>
              </tr>
              <tr className="border-b border-border hover:bg-azul-soft transition-all">
                <td className="px-3.5 py-3 text-[13.5px] text-text font-bold">Guitarra Foundation — Fund. 2</td>
                <td className="px-3.5 py-3 text-[13.5px] text-text2 text-xs">Módulo</td>
                <td className="px-3.5 py-3 text-[13.5px] text-text2">28</td>
                <td className="px-3.5 py-3 text-[13.5px] text-text2 font-mono text-xs">09/03</td>
                <td className="px-3.5 py-3 text-[13.5px] text-text2">23</td>
                <td className="px-3.5 py-3 text-[13.5px] text-text2"><span className="badge badge-verde">Pronto</span></td>
                <td className="px-3.5 py-3 text-[13.5px] text-text2"><button className="btn btn-ghost btn-sm"><DownloadSimple size={16} /></button></td>
              </tr>
              <tr className="border-b border-border hover:bg-azul-soft transition-all">
                <td className="px-3.5 py-3 text-[13.5px] text-text font-bold">Repertório Violão — Nível 1</td>
                <td className="px-3.5 py-3 text-[13.5px] text-text2 text-xs">Repertório</td>
                <td className="px-3.5 py-3 text-[13.5px] text-text2">12</td>
                <td className="px-3.5 py-3 text-[13.5px] text-text2 font-mono text-xs">11/03</td>
                <td className="px-3.5 py-3 text-[13.5px] text-text2">—</td>
                <td className="px-3.5 py-3 text-[13.5px] text-text2"><span className="badge badge-dourado">Gerando</span></td>
                <td className="px-3.5 py-3 text-[13.5px] text-text2"><button className="btn btn-ghost btn-sm"><Hourglass size={16} /></button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
