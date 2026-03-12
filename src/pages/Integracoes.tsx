import { useState } from "react";
import { cn } from "../utils";
import { useAppContext } from "../AppContext";

export function Integracoes() {
  const [activeTab, setActiveTab] = useState("ativas");
  const { showToast } = useAppContext();

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-[26px] leading-[1.2] text-text">
            <em className="not-italic text-accent">Integrações</em>
          </h1>
          <p className="text-text2 text-[13.5px] mt-1.5">
            APIs, serviços e ferramentas conectadas à plataforma
          </p>
        </div>
      </div>

      <div className="flex gap-0.5 bg-bg2 rounded-[var(--radius-sm)] p-1 mb-6 w-fit flex-wrap">
        <div onClick={() => setActiveTab("ativas")} className={cn("px-4 py-2 rounded-md text-[13px] font-medium cursor-pointer transition-all whitespace-nowrap", activeTab === "ativas" ? "bg-gradient-to-br from-azul-escuro to-azul text-white shadow-[0_2px_8px_rgba(30,58,95,0.3)]" : "text-text2 hover:text-azul-claro hover:bg-azul-soft")}>Ativas</div>
        <div onClick={() => setActiveTab("disponiveis")} className={cn("px-4 py-2 rounded-md text-[13px] font-medium cursor-pointer transition-all whitespace-nowrap", activeTab === "disponiveis" ? "bg-gradient-to-br from-azul-escuro to-azul text-white shadow-[0_2px_8px_rgba(30,58,95,0.3)]" : "text-text2 hover:text-azul-claro hover:bg-azul-soft")}>Disponíveis</div>
      </div>

      {activeTab === "ativas" && (
        <div className="flex flex-col gap-3">
          <div className="card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-azul-escuro to-azul flex items-center justify-center text-white text-base shrink-0">🤖</div>
              <div className="flex-1">
                <div className="font-bold">Claude API (Anthropic)</div>
                <div className="text-xs text-text2 mt-1">Agentes: Compositor (Sonnet), Arquiteto Musical (Sonnet), Curador (Haiku), Assistente WhatsApp (Haiku), Designer de Material (Sonnet)</div>
                <div className="text-[11px] text-text3 mt-1">Uso: 12.340 tokens este mês · Modelo: claude-sonnet-4-20250514</div>
              </div>
              <span className="badge badge-verde">Conectada ✓</span>
              <button className="btn btn-ghost btn-sm">⚙️</button>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#22C55E] to-[#16A34A] flex items-center justify-center text-white text-base shrink-0">💬</div>
              <div className="flex-1">
                <div className="font-bold">UAZAPI — WhatsApp Business</div>
                <div className="text-xs text-text2 mt-1">Notificações, materiais, lembretes, progresso, bot professor</div>
                <div className="text-[11px] text-text3 mt-1">234 mensagens enviadas este mês · Instância: la-music-prod</div>
              </div>
              <span className="badge badge-verde">Conectada ✓</span>
              <button className="btn btn-ghost btn-sm">⚙️</button>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-foundation to-[#4F46E5] flex items-center justify-center text-white text-base shrink-0">🎼</div>
              <div className="flex-1">
                <div className="font-bold">SVGuitar + VexFlow + VexTab</div>
                <div className="text-xs text-text2 mt-1">Renderização: diagramas de acordes (SVGuitar), notação na pauta (VexFlow), tablatura (VexTab)</div>
                <div className="text-[11px] text-text3 mt-1">1.247 elementos SVG renderizados · Bracinhos, escalas, partituras</div>
              </div>
              <span className="badge badge-verde">Integrada ✓</span>
              <button className="btn btn-ghost btn-sm">⚙️</button>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#4285F4] to-[#34A853] flex items-center justify-center text-white text-base shrink-0">✨</div>
              <div className="flex-1">
                <div className="font-bold">Gemini API (Google) — Geração de Imagens</div>
                <div className="text-xs text-text2 mt-1">Imagens reais para materiais: instrumentos, anatomia vocal, cenas históricas, ilustrações musicais</div>
                <div className="text-[11px] text-text3 mt-1">89 imagens geradas este mês · Modelo: gemini-2.0-flash</div>
              </div>
              <span className="badge badge-verde">Conectada ✓</span>
              <button className="btn btn-ghost btn-sm">⚙️</button>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#3ECF8E] to-[#1C8656] flex items-center justify-center text-white text-base shrink-0">⚡</div>
              <div className="flex-1">
                <div className="font-bold">Supabase — Backend as a Service</div>
                <div className="text-xs text-text2 mt-1">PostgreSQL, Auth, Storage (PDFs/SVGs), Edge Functions, Realtime</div>
                <div className="text-[11px] text-text3 mt-1">Projeto: la-journey-prod · Região: sa-east-1</div>
              </div>
              <span className="badge badge-verde">Conectada ✓</span>
              <button className="btn btn-ghost btn-sm">⚙️</button>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#F97316] to-[#EA580C] flex items-center justify-center text-white text-base shrink-0">🎵</div>
              <div className="flex-1">
                <div className="font-bold">Cifra Club API — Repertório</div>
                <div className="text-xs text-text2 mt-1">Importação de cifras para curadoria interna (uso interno, não redistribuição)</div>
                <div className="text-[11px] text-text3 mt-1">45 cifras importadas · Curadoria obrigatória antes de uso</div>
              </div>
              <span className="badge badge-verde">Conectada ✓</span>
              <button className="btn btn-ghost btn-sm">⚙️</button>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#F97316] to-[#7C3AED] flex items-center justify-center text-white text-base shrink-0">🧠</div>
              <div className="flex-1">
                <div className="font-bold">Groq — Modelos Open Source (Llama/Mistral)</div>
                <div className="text-xs text-text2 mt-1">Agente Monitor Pedagógico: análise de progresso, detecção de desvios, classificação de baixo custo</div>
                <div className="text-[11px] text-text3 mt-1">Modelo: llama-3.3-70b · Latência média: 120ms</div>
              </div>
              <span className="badge badge-verde">Conectada ✓</span>
              <button className="btn btn-ghost btn-sm">⚙️</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "disponiveis" && (
        <div className="flex flex-col gap-3">
          <div className="card opacity-70">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-bg2 flex items-center justify-center text-base shrink-0">🎵</div>
              <div className="flex-1">
                <div className="font-bold">Suno API — Backing Tracks</div>
                <div className="text-xs text-text2 mt-1">Geração de backing tracks personalizados por tonalidade, andamento e estilo</div>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => showToast('Iniciando conexão...')}>Conectar</button>
            </div>
          </div>
          <div className="card opacity-70">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-bg2 flex items-center justify-center text-base shrink-0">🎚️</div>
              <div className="flex-1">
                <div className="font-bold">Moises API — Separação de Áudio</div>
                <div className="text-xs text-text2 mt-1">Isolar instrumentos de músicas para prática</div>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => showToast('Iniciando conexão...')}>Conectar</button>
            </div>
          </div>
          <div className="card opacity-70">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-bg2 flex items-center justify-center text-base shrink-0">🖨️</div>
              <div className="flex-1">
                <div className="font-bold">IPres Net — Impressão sob Demanda</div>
                <div className="text-xs text-text2 mt-1">Envio direto de PDFs para gráfica inteligente</div>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => showToast('Iniciando conexão...')}>Conectar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
