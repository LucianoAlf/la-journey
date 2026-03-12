import { 
  ArrowLeft, FloppyDisk, FilePdf, Image as ImageIcon, TextAa, Article, 
  Guitar, MusicNotesSimple, Metronome, MusicNote, Trophy, QrCode, PlusCircle,
  ArrowUp, ArrowDown, Copy, ArrowCounterClockwise, Trash, Code, WhatsappLogo
} from "@phosphor-icons/react";
import { useState } from "react";
import { cn } from "../utils";
import { useAppContext } from "../AppContext";

export function Editor() {
  const [selectedBlock, setSelectedBlock] = useState(0);
  const { showToast } = useAppContext();

  const blocks = [
    { id: 0, type: "Capa", desc: "Logo + título + info", icon: ImageIcon, color: "azul" },
    { id: 1, type: "Título da seção", desc: "Teoria e Conceitos", icon: TextAa, color: "foundation" },
    { id: 2, type: "Texto", desc: "Anatomia do instrumento", icon: Article, color: "azul" },
    { id: 3, type: "Imagem IA", desc: "Partes do violão", icon: ImageIcon, color: "accent" },
    { id: 4, type: "Texto", desc: "Postura e posição", icon: Article, color: "azul" },
    { id: 5, type: "Título da seção", desc: "Técnica", icon: TextAa, color: "foundation" },
    { id: 6, type: "Diagrama de Acorde", desc: "Acorde G (Sol Maior)", icon: Guitar, color: "grow" },
    { id: 7, type: "Diagrama de Acorde", desc: "Acorde C (Dó Maior)", icon: Guitar, color: "grow" },
    { id: 8, type: "Exercício", desc: "Psicomotor 1234", icon: MusicNotesSimple, color: "advance" },
    { id: 9, type: "Título da seção", desc: "Ritmo", icon: TextAa, color: "foundation" },
    { id: 10, type: "Notação (VexFlow)", desc: "Figuras rítmicas", icon: Metronome, color: "master" },
    { id: 11, type: "Título da seção", desc: "Repertório", icon: TextAa, color: "foundation" },
    { id: 12, type: "Ficha de Repertório", desc: "Love Me Do — Beatles", icon: MusicNote, color: "dourado" },
    { id: 13, type: "Selo / Conquista", desc: "Primeiro Acorde 🎸", icon: Trophy, color: "verde" },
    { id: 14, type: "QR Code", desc: "Backing track YouTube", icon: QrCode, color: "azul" },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="grid grid-cols-[260px_1fr_300px] gap-0 h-screen -m-7 overflow-hidden">
        
        {/* LEFT: Block List */}
        <div className="border-r border-border p-4 overflow-y-auto bg-surface">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="form-label text-accent mb-0.5">Editando</div>
              <div className="font-serif text-base">Fundamentos 1</div>
              <div className="text-[11px] text-text3">Violão · Foundation · 10 aulas</div>
            </div>
            <button className="btn btn-ghost btn-sm">
              <ArrowLeft size={16} />
            </button>
          </div>
          <div className="flex gap-1 mb-3">
            <button className="btn btn-primary btn-sm flex-1 justify-center" onClick={() => showToast('Salvo com sucesso!')}>
              <FloppyDisk size={16} /> Salvar
            </button>
            <button className="btn btn-accent btn-sm flex-1 justify-center" onClick={() => showToast('Gerando PDF...')}>
              <FilePdf size={16} /> PDF
            </button>
          </div>
          <div className="form-label mb-2">Blocos do material</div>
          <div className="flex flex-col gap-2">
            {blocks.map((block) => {
              const Icon = block.icon;
              const isSelected = selectedBlock === block.id;
              return (
                <div 
                  key={block.id}
                  onClick={() => setSelectedBlock(block.id)}
                  className={cn(
                    "border-[1.5px] rounded-[var(--radius-sm)] p-3 cursor-pointer transition-all relative bg-card group",
                    isSelected 
                      ? "border-accent bg-accent-soft shadow-[0_0_0_3px_rgba(255,45,120,0.1)]" 
                      : "border-border hover:border-[rgba(30,58,95,0.25)] hover:shadow-[var(--shadow)]"
                  )}
                >
                  <div className="absolute left-1 top-1/2 -translate-y-1/2 cursor-grab text-text3 text-sm opacity-0 transition-opacity group-hover:opacity-100">⠿</div>
                  <div className="flex items-center gap-2 pl-3.5">
                    <div className={cn(
                      "w-7 h-7 rounded-md flex items-center justify-center text-[13px] shrink-0",
                      `bg-${block.color}-soft text-${block.color}`
                    )}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <div className="font-bold text-xs">{block.type}</div>
                      <div className="text-[11px] text-text3">{block.desc}</div>
                    </div>
                  </div>
                  <div className="absolute right-2 top-2 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <button className="w-[22px] h-[22px] rounded border-none bg-bg2 text-text3 cursor-pointer flex items-center justify-center text-[10px] transition-all hover:bg-vermelho-soft hover:text-vermelho">
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="border-2 border-dashed border-border rounded-[var(--radius)] p-3.5 text-center text-text3 cursor-pointer transition-all my-3 hover:border-accent hover:text-accent hover:bg-accent-soft">
            <PlusCircle size={18} className="mx-auto mb-1" /> Adicionar bloco
          </div>
          <div className="p-2.5 bg-azul-soft rounded-[var(--radius-sm)] text-[11px] text-text2">
            <strong>15 blocos</strong> · Versão 2 · Editado por Alf<br/>
            <span className="text-text3">Última edição: 11/03 às 14:30</span>
          </div>
        </div>

        {/* CENTER: Canvas */}
        <div className="p-6 md:p-8 overflow-y-auto bg-bg">
          <div className="max-w-[680px] mx-auto">
            {/* Block 0: Capa */}
            <div 
              onClick={() => setSelectedBlock(0)}
              className={cn(
                "border-2 rounded-[var(--radius)] p-5 md:p-6 mb-3 transition-all cursor-pointer relative",
                selectedBlock === 0 ? "border-accent bg-card shadow-[0_0_0_3px_rgba(255,45,120,0.08)]" : "border-transparent hover:border-border hover:bg-card"
              )}
            >
              <div className="text-center py-5">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-azul-escuro to-azul mx-auto mb-3 flex items-center justify-center text-white text-lg font-extrabold">
                  LA
                </div>
                <div className="text-[10px] tracking-[2px] uppercase text-text3">LA Music School</div>
                <div contentEditable className="font-serif text-[28px] my-4 text-text outline-none rounded focus:bg-input-bg focus:shadow-[0_0_0_2px_rgba(30,58,95,0.15)] transition-all px-1">Fundamentos 1</div>
                <div className="text-[13px] text-text3">Violão · Foundation · 10 Aulas</div>
                <div className="mt-4 flex justify-center gap-2">
                  <span className="badge badge-foundation">Foundation</span>
                  <span className="badge badge-azul">Violão Adulto</span>
                </div>
              </div>
            </div>

            {/* Block 1: Section Title */}
            <div 
              onClick={() => setSelectedBlock(1)}
              className={cn(
                "border-2 rounded-[var(--radius)] p-5 md:p-6 mb-3 transition-all cursor-pointer relative",
                selectedBlock === 1 ? "border-accent bg-card shadow-[0_0_0_3px_rgba(255,45,120,0.08)]" : "border-transparent hover:border-border hover:bg-card"
              )}
            >
              <div contentEditable className="font-serif text-[20px] text-foundation border-l-[3px] border-foundation pl-3 outline-none rounded focus:bg-input-bg focus:shadow-[0_0_0_2px_rgba(30,58,95,0.15)] transition-all">
                📖 Teoria e Conceitos
              </div>
            </div>

            {/* Block 2: Text */}
            <div 
              onClick={() => setSelectedBlock(2)}
              className={cn(
                "border-2 rounded-[var(--radius)] p-5 md:p-6 mb-3 transition-all cursor-pointer relative",
                selectedBlock === 2 ? "border-accent bg-card shadow-[0_0_0_3px_rgba(255,45,120,0.08)]" : "border-transparent hover:border-border hover:bg-card"
              )}
            >
              <div className="font-semibold text-sm text-text mb-2 outline-none rounded focus:bg-input-bg focus:shadow-[0_0_0_2px_rgba(30,58,95,0.15)] transition-all px-1" contentEditable>
                Anatomia do Violão
              </div>
              <div contentEditable className="text-[13px] text-text2 leading-[1.8] outline-none rounded focus:bg-input-bg focus:shadow-[0_0_0_2px_rgba(30,58,95,0.15)] transition-all px-1">
                O violão é composto por três partes principais: <strong>corpo</strong> (caixa de ressonância), <strong>braço</strong> (onde ficam os trastes e as casas) e <strong>mão</strong> ou cabeça (onde ficam as tarraxas para afinação). As 6 cordas são numeradas de baixo para cima: 1ª (mi agudo) até 6ª (mi grave). Os trastes dividem o braço em casas, e cada casa equivale a meio tom.
              </div>
            </div>

            {/* Block 3: Image */}
            <div 
              onClick={() => setSelectedBlock(3)}
              className={cn(
                "border-2 rounded-[var(--radius)] p-5 md:p-6 mb-3 transition-all cursor-pointer relative",
                selectedBlock === 3 ? "border-accent bg-card shadow-[0_0_0_3px_rgba(255,45,120,0.08)]" : "border-transparent hover:border-border hover:bg-card"
              )}
            >
              <div className="aspect-video bg-gradient-to-br from-azul-soft to-accent-soft rounded-[var(--radius-sm)] flex flex-col items-center justify-center cursor-pointer">
                <ImageIcon size={36} className="text-text3 mb-2" />
                <div className="text-xs text-text3">Imagem: Partes do Violão</div>
                <div className="text-[10px] text-text3 mt-1">Clique para trocar · Gemini IA ou Upload</div>
              </div>
            </div>

            <div className="border-2 border-dashed border-border rounded-[var(--radius)] p-3.5 text-center text-text3 cursor-pointer transition-all mb-3 hover:border-accent hover:text-accent hover:bg-accent-soft">
              <PlusCircle size={18} className="mx-auto mb-1" />
              <div className="text-xs">Adicionar novo bloco aqui</div>
            </div>
          </div>
        </div>

        {/* RIGHT: Properties */}
        <div className="border-l border-border p-4 overflow-y-auto bg-surface">
          <div className="form-label text-accent mb-3">Propriedades do Bloco</div>
          
          <div className="mb-5">
            <div className="text-[9px] tracking-[2px] uppercase text-text3 mb-1.5 font-semibold">Tipo</div>
            <div className="px-3 py-2 bg-azul-soft rounded-md text-xs text-azul-claro font-semibold flex items-center gap-2">
              <ImageIcon size={16} /> Capa do Material
            </div>
          </div>

          <div className="mb-5">
            <div className="text-[9px] tracking-[2px] uppercase text-text3 mb-1.5 font-semibold">Logo da escola</div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-azul-escuro to-azul flex items-center justify-center text-white text-xs font-extrabold">LA</div>
              <button className="btn btn-ghost btn-sm">Trocar</button>
            </div>
          </div>

          <div className="mb-5">
            <div className="text-[9px] tracking-[2px] uppercase text-text3 mb-1.5 font-semibold">Título</div>
            <input className="form-input text-xs py-2 px-3" defaultValue="Fundamentos 1" />
          </div>

          <div className="mb-5">
            <div className="text-[9px] tracking-[2px] uppercase text-text3 mb-1.5 font-semibold">Subtítulo</div>
            <input className="form-input text-xs py-2 px-3" defaultValue="Violão · Foundation · 10 Aulas" />
          </div>

          <div className="mb-5">
            <div className="text-[9px] tracking-[2px] uppercase text-text3 mb-1.5 font-semibold">Cores da capa</div>
            <div className="flex gap-1.5 mt-1">
              <div className="w-7 h-7 rounded-md bg-[#1E3A5F] cursor-pointer border-2 border-accent" />
              <div className="w-7 h-7 rounded-md bg-[#FF2D78] cursor-pointer border border-border" />
              <div className="w-7 h-7 rounded-md bg-[#6366F1] cursor-pointer border border-border" />
              <div className="w-7 h-7 rounded-md bg-[#F1F5F9] cursor-pointer border border-border" />
            </div>
          </div>

          <hr className="border-t border-border my-4" />

          <div className="mb-5">
            <div className="text-[9px] tracking-[2px] uppercase text-text3 mb-1.5 font-semibold">Status</div>
            <div className="flex gap-1">
              <span className="badge badge-dourado">Rascunho</span>
              <span className="badge badge-azul">v2</span>
            </div>
          </div>

          <div className="mb-5">
            <div className="text-[9px] tracking-[2px] uppercase text-text3 mb-1.5 font-semibold">Ações do bloco</div>
            <div className="flex flex-col gap-1">
              <button className="btn btn-ghost btn-sm w-full justify-start"><ArrowUp size={16} /> Mover para cima</button>
              <button className="btn btn-ghost btn-sm w-full justify-start"><ArrowDown size={16} /> Mover para baixo</button>
              <button className="btn btn-ghost btn-sm w-full justify-start"><Copy size={16} /> Duplicar bloco</button>
              <button className="btn btn-ghost btn-sm w-full justify-start"><ArrowCounterClockwise size={16} /> Reverter original</button>
              <button className="btn btn-ghost btn-sm w-full justify-start text-vermelho hover:text-vermelho"><Trash size={16} /> Remover bloco</button>
            </div>
          </div>

          <hr className="border-t border-border my-4" />

          <div className="mb-5">
            <div className="text-[9px] tracking-[2px] uppercase text-text3 mb-1.5 font-semibold">Exportar material</div>
            <div className="flex flex-col gap-1">
              <button className="btn btn-primary btn-sm w-full justify-center"><FilePdf size={16} /> Exportar PDF</button>
              <button className="btn btn-ghost btn-sm w-full justify-center"><Code size={16} /> Ver HTML</button>
              <button className="btn btn-ghost btn-sm w-full justify-center"><WhatsappLogo size={16} /> Enviar WhatsApp</button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
