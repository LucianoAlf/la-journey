import { 
  SquaresFour, MapTrifold, FileText, NotePencil, Books, MusicNotesSimple, 
  UsersThree, MusicNote, ChalkboardTeacher, GraduationCap, Trophy, 
  WhatsappLogo, ChartBar, PlugsConnected, GearSix, Plus, Bell, Moon, Sun, CaretLeft, CaretRight
} from "@phosphor-icons/react";
import { useState, useRef, useEffect } from "react";
import { cn } from "../utils";

interface SidebarProps {
  activePage: string;
  setActivePage: (page: string) => void;
  isCollapsed: boolean;
  toggleSidebar: () => void;
  theme: string;
  toggleTheme: () => void;
}

export function Sidebar({ activePage, setActivePage, isCollapsed, toggleSidebar, theme, toggleTheme }: SidebarProps) {
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navItems = [
    { section: "Principal" },
    { id: "dashboard", label: "Dashboard", icon: SquaresFour },
    { section: "Pedagógico" },
    { id: "jornadas", label: "Jornadas", icon: MapTrifold },
    { id: "gerador", label: "Gerador", icon: FileText },
    { id: "editor", label: "Editor Material", icon: NotePencil },
    { id: "conteudo", label: "Base Curada", icon: Books },
    { id: "biblioteca", label: "Biblioteca Musical", icon: MusicNotesSimple },
    { id: "alunos", label: "Alunos", icon: UsersThree },
    { id: "repertorio", label: "Repertório", icon: MusicNote },
    { section: "Operacional" },
    { id: "turmas", label: "Turmas", icon: ChalkboardTeacher },
    { id: "professor", label: "Visão Professor", icon: GraduationCap },
    { section: "Engajamento" },
    { id: "gamificacao", label: "Gamificação", icon: Trophy },
    { id: "whatsapp", label: "WhatsApp", icon: WhatsappLogo, badge: "4" },
    { section: "Gestão" },
    { id: "relatorios", label: "Relatórios", icon: ChartBar },
    { id: "integracoes", label: "Integrações", icon: PlugsConnected },
    { id: "configuracoes", label: "Configurações", icon: GearSix },
  ];

  return (
    <nav className={cn(
      "fixed left-0 top-0 bottom-0 z-50 flex flex-col bg-sidebar-bg border-r border-sidebar-border shadow-[var(--shadow)] transition-all duration-300 overflow-hidden",
      isCollapsed ? "w-[var(--sidebar-w-collapsed)]" : "w-[var(--sidebar-w)]"
    )}>
      <div className="flex items-center gap-2.5 p-4 border-b border-sidebar-border overflow-hidden shrink-0 min-h-[68px]">
        <div className="w-9 h-9 shrink-0 bg-gradient-to-br from-accent to-foundation rounded-[10px] flex items-center justify-center text-[13px] font-extrabold text-white">
          LA
        </div>
        <div className={cn("whitespace-nowrap overflow-hidden transition-all duration-300", isCollapsed ? "opacity-0 w-0" : "opacity-100 w-auto")}>
          <div className="font-serif text-sm text-text font-semibold">LA <em className="not-italic text-accent">Journey</em></div>
          <div className="text-[8px] tracking-[2.5px] uppercase text-accent">Ancoragem de Fundamentos</div>
        </div>
      </div>

      <div className="flex-1 py-2.5 overflow-y-auto overflow-x-hidden">
        {navItems.map((item, index) => {
          if (item.section) {
            return (
              <div key={index} className={cn(
                "px-4 pt-2.5 pb-1 text-[9px] tracking-[3px] uppercase text-text3 whitespace-nowrap transition-all duration-300",
                isCollapsed ? "opacity-0 h-0 p-0" : "opacity-100 h-auto"
              )}>
                {item.section}
              </div>
            );
          }

          const Icon = item.icon!;
          const isActive = activePage === item.id;

          return (
            <div 
              key={item.id}
              onClick={() => setActivePage(item.id!)}
              className={cn(
                "flex items-center gap-2.5 py-[9px] px-3.5 mx-2 my-px rounded-[var(--radius-sm)] cursor-pointer transition-all duration-200 text-text2 text-[13.5px] relative select-none whitespace-nowrap overflow-hidden group",
                isActive ? "bg-gradient-to-br from-[rgba(30,58,95,0.2)] to-[rgba(45,90,142,0.12)] text-azul-claro font-semibold dark:from-[rgba(30,58,95,0.5)] dark:to-[rgba(45,90,142,0.25)] dark:text-white" : "hover:bg-azul-soft hover:text-azul-claro",
                isCollapsed && "justify-center px-2"
              )}
            >
              {isActive && <div className="absolute left-[-8px] top-1/2 -translate-y-1/2 w-[3px] h-5 bg-accent rounded-sm" />}
              <span className="text-lg w-5 text-center shrink-0 leading-none">
                <Icon weight={isActive ? "fill" : "regular"} />
              </span>
              <span className={cn("transition-all duration-300", isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100 w-auto")}>
                {item.label}
              </span>
              {item.badge && !isCollapsed && (
                <span className="ml-auto bg-accent text-white text-[10px] font-semibold py-px px-[7px] rounded-full">
                  {item.badge}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="p-3 border-t border-sidebar-border flex flex-col gap-2 shrink-0">
        <div className="flex items-center gap-1.5 px-1 flex-wrap justify-center relative">
          <button className="w-8 h-8 rounded-[var(--radius-sm)] bg-surface border border-border flex items-center justify-center cursor-pointer text-text2 text-sm transition-all hover:bg-azul-soft hover:text-azul-claro shrink-0" title="Ação rápida">
            <Plus />
          </button>
          <div className="relative" ref={notifRef}>
            <button 
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="w-8 h-8 rounded-[var(--radius-sm)] bg-surface border border-border flex items-center justify-center cursor-pointer text-text2 text-sm transition-all hover:bg-azul-soft hover:text-azul-claro shrink-0 relative"
            >
              <Bell />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-accent rounded-full border-2 border-sidebar-bg" />
            </button>
            
            {isNotifOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-[300px] bg-surface border border-border rounded-[var(--radius)] shadow-[var(--shadow-lg)] z-[999] animate-in fade-in slide-in-from-bottom-2">
                <div className="px-4 py-3.5 text-xs font-semibold uppercase tracking-[1.5px] text-text3 border-b border-border">
                  Notificações
                </div>
                <div className="px-4 py-3.5 border-b border-border cursor-pointer transition-all hover:bg-azul-soft">
                  <div className="text-[13px] font-medium flex items-center gap-1.5"><FileText size={16}/> Material gerado</div>
                  <div className="text-[11px] text-text3 mt-1">Violão Foundation — Fundamentos 1 · há 5 min</div>
                </div>
                <div className="px-4 py-3.5 border-b border-border cursor-pointer transition-all hover:bg-azul-soft">
                  <div className="text-[13px] font-medium flex items-center gap-1.5"><span className="text-dourado">⚠️</span> Aluno atrasado</div>
                  <div className="text-[11px] text-text3 mt-1">Ana Oliveira faltou 3 aulas seguidas</div>
                </div>
                <div className="px-4 py-3.5 cursor-pointer transition-all hover:bg-azul-soft">
                  <div className="text-[13px] font-medium flex items-center gap-1.5"><Trophy size={16} className="text-dourado"/> Conquista desbloqueada</div>
                  <div className="text-[11px] text-text3 mt-1">Lucas Silva: Primeiro Acorde · há 2h</div>
                </div>
              </div>
            )}
          </div>
          <button onClick={toggleTheme} className="w-8 h-8 rounded-[var(--radius-sm)] bg-surface border border-border flex items-center justify-center cursor-pointer text-text2 text-sm transition-all hover:bg-azul-soft hover:text-azul-claro shrink-0" title="Tema">
            {theme === 'dark' ? <Moon /> : <Sun />}
          </button>
        </div>

        <div className={cn(
          "flex items-center gap-2.5 p-2 bg-azul-soft rounded-[var(--radius-sm)] cursor-pointer overflow-hidden",
          isCollapsed && "justify-center"
        )}>
          <div className="w-[30px] h-[30px] rounded-full shrink-0 bg-gradient-to-br from-azul-escuro to-azul-claro flex items-center justify-center text-xs font-semibold text-white">
            A
          </div>
          <div className={cn("overflow-hidden transition-all duration-300", isCollapsed ? "opacity-0 w-0" : "opacity-100 w-auto")}>
            <div className="text-xs font-semibold text-text whitespace-nowrap">Alf (Admin)</div>
            <div className="text-[10px] text-text3 whitespace-nowrap">Diretor · LA Music</div>
          </div>
        </div>

        <button 
          onClick={toggleSidebar}
          className="flex items-center justify-center w-full p-2 rounded-[var(--radius-sm)] cursor-pointer transition-all bg-azul-soft text-azul-claro border-none text-base hover:bg-azul-escuro hover:text-white"
        >
          {isCollapsed ? <CaretRight /> : <CaretLeft />}
        </button>
      </div>
    </nav>
  );
}
