import { FloppyDisk, Plus } from "@phosphor-icons/react";
import { useState } from "react";
import { cn } from "../utils";
import { useAppContext } from "../AppContext";

export function Configuracoes() {
  const [activeTab, setActiveTab] = useState("escola");
  const { showToast } = useAppContext();

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-[26px] leading-[1.2] text-text">
            <em className="not-italic text-accent">Configurações</em>
          </h1>
          <p className="text-text2 text-[13.5px] mt-1.5">
            Painel administrativo da escola
          </p>
        </div>
      </div>

      <div className="flex gap-0.5 bg-bg2 rounded-[var(--radius-sm)] p-1 mb-6 w-fit flex-wrap">
        <div onClick={() => setActiveTab("escola")} className={cn("px-4 py-2 rounded-md text-[13px] font-medium cursor-pointer transition-all whitespace-nowrap", activeTab === "escola" ? "bg-gradient-to-br from-azul-escuro to-azul text-white shadow-[0_2px_8px_rgba(30,58,95,0.3)]" : "text-text2 hover:text-azul-claro hover:bg-azul-soft")}>Escola</div>
        <div onClick={() => setActiveTab("usuarios")} className={cn("px-4 py-2 rounded-md text-[13px] font-medium cursor-pointer transition-all whitespace-nowrap", activeTab === "usuarios" ? "bg-gradient-to-br from-azul-escuro to-azul text-white shadow-[0_2px_8px_rgba(30,58,95,0.3)]" : "text-text2 hover:text-azul-claro hover:bg-azul-soft")}>Usuários</div>
        <div onClick={() => setActiveTab("visual")} className={cn("px-4 py-2 rounded-md text-[13px] font-medium cursor-pointer transition-all whitespace-nowrap", activeTab === "visual" ? "bg-gradient-to-br from-azul-escuro to-azul text-white shadow-[0_2px_8px_rgba(30,58,95,0.3)]" : "text-text2 hover:text-azul-claro hover:bg-azul-soft")}>Identidade Visual</div>
        <div onClick={() => setActiveTab("plano")} className={cn("px-4 py-2 rounded-md text-[13px] font-medium cursor-pointer transition-all whitespace-nowrap", activeTab === "plano" ? "bg-gradient-to-br from-azul-escuro to-azul text-white shadow-[0_2px_8px_rgba(30,58,95,0.3)]" : "text-text2 hover:text-azul-claro hover:bg-azul-soft")}>Plano</div>
      </div>

      {activeTab === "escola" && (
        <div className="card">
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group mb-0">
              <label className="form-label">Nome da escola</label>
              <input className="form-input" defaultValue="LA Music School" />
            </div>
            <div className="form-group mb-0">
              <label className="form-label">CNPJ</label>
              <input className="form-input" defaultValue="00.000.000/0001-00" />
            </div>
            <div className="form-group mb-0">
              <label className="form-label">Cidade</label>
              <input className="form-input" defaultValue="Rio de Janeiro" />
            </div>
            <div className="form-group mb-0">
              <label className="form-label">Estado</label>
              <input className="form-input" defaultValue="RJ" />
            </div>
            <div className="form-group mb-0">
              <label className="form-label">WhatsApp</label>
              <input className="form-input" defaultValue="(21) 99999-0000" />
            </div>
            <div className="form-group mb-0">
              <label className="form-label">E-mail</label>
              <input className="form-input" defaultValue="contato@lamusic.com.br" />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button className="btn btn-primary" onClick={() => showToast('Configurações salvas!')}>
              <FloppyDisk size={16} /> Salvar
            </button>
          </div>
        </div>
      )}

      {activeTab === "usuarios" && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="font-serif text-[17px]">Equipe</div>
            <button className="btn btn-primary btn-sm">
              <Plus size={16} /> Novo Usuário
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {[
              { name: 'Luciano Alf', role: 'Diretor (Owner)', email: 'alf@lamusic.com.br', initials: 'LA', color: 'bg-gradient-to-br from-azul-escuro to-azul-claro' },
              { name: 'Renan Amorim', role: 'Coordenador (N4)', email: 'renan@lamusic.com.br', initials: 'R', color: 'bg-foundation' },
              { name: 'Kinho', role: 'Professor (N4)', email: 'kinho@lamusic.com.br', initials: 'K', color: 'bg-grow' },
              { name: 'Peterson', role: 'Professor (N4)', email: 'peterson@lamusic.com.br', initials: 'P', color: 'bg-advance' },
              { name: 'Juliana Quintella', role: 'Coordenadora (N4)', email: 'juliana@lamusic.com.br', initials: 'J', color: 'bg-master' },
            ].map((user, i) => (
              <div key={i} className="flex items-center gap-3 p-3 border border-border rounded-[var(--radius-sm)]">
                <div className={cn("w-[30px] h-[30px] rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0", user.color)}>
                  {user.initials}
                </div>
                <div className="flex-1">
                  <div className="font-bold text-[13px]">{user.name}</div>
                  <div className="text-[11px] text-text3">{user.role} · {user.email}</div>
                </div>
                <div className="w-2 h-2 rounded-full bg-verde" />
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "visual" && (
        <div className="card">
          <div className="grid grid-cols-2 gap-4">
            <div className="form-group mb-0">
              <label className="form-label">Cor primária (hex)</label>
              <input className="form-input" defaultValue="#1E3A5F" />
            </div>
            <div className="form-group mb-0">
              <label className="form-label">Cor secundária (hex)</label>
              <input className="form-input" defaultValue="#FF2D78" />
            </div>
            <div className="form-group mb-0">
              <label className="form-label">Template de capa</label>
              <select className="form-select">
                <option>Padrão LA Journey</option>
                <option>Minimalista</option>
                <option>Moderno</option>
              </select>
            </div>
            <div className="form-group mb-0">
              <label className="form-label">Tipografia</label>
              <select className="form-select">
                <option>Playfair Display + DM Sans</option>
                <option>Inter</option>
                <option>Poppins</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button className="btn btn-primary" onClick={() => showToast('Configurações salvas!')}>
              <FloppyDisk size={16} /> Salvar
            </button>
          </div>
        </div>
      )}

      {activeTab === "plano" && (
        <div className="grid grid-cols-2 gap-5">
          <div className="card">
            <div className="form-label">Plano atual</div>
            <div className="font-serif text-[28px] mt-2">Premium</div>
            <div className="text-[32px] font-bold text-accent my-2">
              R$ 147<span className="text-sm font-normal text-text3">/mês</span>
            </div>
            <div className="text-sm text-text2 leading-loose">
              ✓ Todos os instrumentos<br/>
              ✓ Geração ilimitada<br/>
              ✓ Gamificação completa<br/>
              ✓ WhatsApp integrado<br/>
              ✓ Relatórios avançados
            </div>
          </div>
          <div className="card">
            <div className="form-label">Uso este mês</div>
            <div className="mt-4">
              <div className="flex justify-between text-[13px] mb-2">
                <span>Materiais gerados</span><span>47 / ilimitado</span>
              </div>
              <div className="h-1 bg-bg2 rounded-sm overflow-hidden">
                <div className="h-full rounded-sm transition-all duration-1000 w-[47%] bg-accent" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-[13px] mb-2">
                <span>Alunos ativos</span><span>1.297</span>
              </div>
              <div className="h-1 bg-bg2 rounded-sm overflow-hidden">
                <div className="h-full rounded-sm transition-all duration-1000 w-[65%] bg-foundation" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-[13px] mb-2">
                <span>Mensagens WhatsApp</span><span>234 / 500</span>
              </div>
              <div className="h-1 bg-bg2 rounded-sm overflow-hidden">
                <div className="h-full rounded-sm transition-all duration-1000 w-[47%] bg-grow" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
