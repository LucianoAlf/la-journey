import { Plus, DownloadSimple, PencilSimple, FileText } from "@phosphor-icons/react";
import { useState } from "react";
import { cn } from "../utils";
import { useAppContext } from "../AppContext";

export function Whatsapp() {
  const [activeTab, setActiveTab] = useState("msgs");
  const { openModal } = useAppContext();

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-[26px] leading-[1.2] text-text">
            WhatsApp · <em className="not-italic text-accent">UAZAPI</em>
          </h1>
          <p className="text-text2 text-[13.5px] mt-1.5">
            Comunicação automatizada com professores, alunos e responsáveis
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => openModal('modal-template')}>
          <Plus size={16} /> Novo Template
        </button>
      </div>

      <div className="flex gap-0.5 bg-bg2 rounded-[var(--radius-sm)] p-1 mb-6 w-fit flex-wrap">
        <div onClick={() => setActiveTab("msgs")} className={cn("px-4 py-2 rounded-md text-[13px] font-medium cursor-pointer transition-all whitespace-nowrap", activeTab === "msgs" ? "bg-gradient-to-br from-azul-escuro to-azul text-white shadow-[0_2px_8px_rgba(30,58,95,0.3)]" : "text-text2 hover:text-azul-claro hover:bg-azul-soft")}>Mensagens</div>
        <div onClick={() => setActiveTab("templates")} className={cn("px-4 py-2 rounded-md text-[13px] font-medium cursor-pointer transition-all whitespace-nowrap", activeTab === "templates" ? "bg-gradient-to-br from-azul-escuro to-azul text-white shadow-[0_2px_8px_rgba(30,58,95,0.3)]" : "text-text2 hover:text-azul-claro hover:bg-azul-soft")}>Templates</div>
        <div onClick={() => setActiveTab("automacoes")} className={cn("px-4 py-2 rounded-md text-[13px] font-medium cursor-pointer transition-all whitespace-nowrap", activeTab === "automacoes" ? "bg-gradient-to-br from-azul-escuro to-azul text-white shadow-[0_2px_8px_rgba(30,58,95,0.3)]" : "text-text2 hover:text-azul-claro hover:bg-azul-soft")}>Automações</div>
      </div>

      {activeTab === "msgs" && (
        <div className="card">
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-3 p-3.5 bg-accent-soft rounded-[var(--radius-sm)] border-l-[3px] border-accent">
              <span className="text-base">📤</span>
              <div className="flex-1">
                <div className="font-bold text-[13px]">Ana Oliveira (Responsável) <span className="badge badge-accent text-[9px] ml-1.5">Falta consecutiva</span></div>
                <div className="text-xs text-text2 mt-1">Oi! O Lucas faltou 2 aulas seguidas. Preparamos um material pra ele não ficar pra trás 🎸</div>
              </div>
              <span className="badge badge-verde">Entregue</span>
              <span className="text-[11px] text-text3">10:30</span>
            </div>
            <div className="flex items-center gap-3 p-3.5 bg-verde-soft rounded-[var(--radius-sm)] border-l-[3px] border-verde">
              <span className="text-base">📤</span>
              <div className="flex-1">
                <div className="font-bold text-[13px]">Maria Santos <span className="badge badge-advance text-[9px] ml-1.5">Progresso</span></div>
                <div className="text-xs text-text2 mt-1">Parabéns Maria! Você completou a estação Fundamentos 2 🏆</div>
              </div>
              <span className="badge badge-azul">Lida</span>
              <span className="text-[11px] text-text3">09:15</span>
            </div>
            <div className="flex items-center gap-3 p-3.5 bg-foundation-soft rounded-[var(--radius-sm)] border-l-[3px] border-foundation">
              <span className="text-base"><DownloadSimple size={16} /></span>
              <div className="flex-1">
                <div className="font-bold text-[13px]">Prof. Renan</div>
                <div className="text-xs text-text2 mt-1">Aluno João completou Fundamentos 1</div>
              </div>
              <span className="badge badge-verde">Processada</span>
              <span className="text-[11px] text-text3">14:22</span>
            </div>
            <div className="flex items-center gap-3 p-3.5 border border-border rounded-[var(--radius-sm)] border-l-[3px] border-azul-claro">
              <span className="text-base">📤</span>
              <div className="flex-1">
                <div className="font-bold text-[13px]">Camila Rocha <span className="badge badge-azul text-[9px] ml-1.5">Lembrete</span></div>
                <div className="text-xs text-text2 mt-1">Lembre de praticar o exercício 1234 antes da próxima aula 🥁</div>
              </div>
              <span className="badge badge-foundation">Enviada</span>
              <span className="text-[11px] text-text3">08:00</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === "templates" && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: '💬', name: 'Falta consecutiva', desc: 'Envia material complementar para aluno ausente', trigger: '2+ faltas' },
            { icon: '🏆', name: 'Progresso', desc: 'Parabéns pela conquista + certificado', trigger: 'Checkpoint completo' },
            { icon: '⏰', name: 'Lembrete de aula', desc: 'Lembrete automático de próxima aula', trigger: '24h antes' },
            { icon: <FileText size={16} />, name: 'Material complementar', desc: 'Cifra + exercício gerado por IA', trigger: 'Professor solicita' },
            { icon: '📊', name: 'Relatório mensal', desc: 'Resumo de progresso para responsáveis', trigger: 'Dia 1 de cada mês' },
            { icon: '🎤', name: 'Sarau', desc: 'Convite e preparação para o sarau', trigger: '7 dias antes' },
          ].map((tpl, i) => (
            <div key={i} className="card">
              <div className="flex items-center gap-2 mb-2">
                <span>{tpl.icon}</span>
                <div className="font-bold text-[13px]">{tpl.name}</div>
              </div>
              <div className="text-xs text-text2">{tpl.desc}</div>
              <div className="text-[11px] text-text3 mt-3">⚡ Trigger: {tpl.trigger}</div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "automacoes" && (
        <div className="card">
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-3 p-3.5 border border-border rounded-[var(--radius-sm)]">
              <div className="w-2 h-2 rounded-full bg-verde shrink-0" />
              <div className="flex-1">
                <div className="font-bold text-[13px]">Aluno faltou 2+ aulas</div>
                <div className="text-xs text-text2 mt-1">Gerar material → Enviar ao professor → Professor encaminha ao aluno</div>
              </div>
              <button className="btn btn-ghost btn-sm"><PencilSimple size={16} /></button>
            </div>
            <div className="flex items-center gap-3 p-3.5 border border-border rounded-[var(--radius-sm)]">
              <div className="w-2 h-2 rounded-full bg-verde shrink-0" />
              <div className="flex-1">
                <div className="font-bold text-[13px]">Aluno completou Checkpoint</div>
                <div className="text-xs text-text2 mt-1">Enviar certificado → Mensagem de parabéns → Desbloquear badge</div>
              </div>
              <button className="btn btn-ghost btn-sm"><PencilSimple size={16} /></button>
            </div>
            <div className="flex items-center gap-3 p-3.5 border border-border rounded-[var(--radius-sm)]">
              <div className="w-2 h-2 rounded-full bg-verde shrink-0" />
              <div className="flex-1">
                <div className="font-bold text-[13px]">Aluno estagnado 2+ semanas</div>
                <div className="text-xs text-text2 mt-1">Alerta ao coordenador → Sugerir intervenção pedagógica</div>
              </div>
              <button className="btn btn-ghost btn-sm"><PencilSimple size={16} /></button>
            </div>
            <div className="flex items-center gap-3 p-3.5 border border-border rounded-[var(--radius-sm)] opacity-60">
              <div className="w-2 h-2 rounded-full bg-text3 shrink-0" />
              <div className="flex-1">
                <div className="font-bold text-[13px]">Lembrete de estudo (desativado)</div>
                <div className="text-xs text-text2 mt-1">Enviar exercício diário 48h antes da aula</div>
              </div>
              <button className="btn btn-ghost btn-sm"><PencilSimple size={16} /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
