import { useState } from "react";
import { cn } from "../utils";
import { SpinnerGap, CheckCircle, XCircle, Lightning, ArrowClockwise } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AI_CONFIG } from "@/lib/ai-config";
import {
  testGoogleConnection,
  testOpenAIConnection,
  testAnthropicConnection,
  testEmbeddingsConnection,
  type ConnectionTestResult,
} from "@/services/aiService";
import { supabase } from "@/lib/supabase";

type TestStatus = 'idle' | 'testing' | 'success' | 'error'

interface IntegrationDef {
  id: string
  name: string
  description: string
  model: string
  icon: string
  gradient: string
  envKey: string
  configured: boolean
  testFn: (() => Promise<ConnectionTestResult>) | null
}

function getIntegrations(): IntegrationDef[] {
  const googleKey = AI_CONFIG.generation.apiKey
  const openaiKey = AI_CONFIG.classification.apiKey
  const anthropicKey = AI_CONFIG.curation.apiKey
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string

  return [
    {
      id: 'anthropic',
      name: 'Claude API (Anthropic)',
      description: 'Curadoria N4: revisão profunda de conteúdo didático-musical com Sonnet',
      model: AI_CONFIG.curation.model,
      icon: '🤖',
      gradient: 'from-azul-escuro to-azul',
      envKey: 'VITE_ANTHROPIC_API_KEY',
      configured: !!anthropicKey,
      testFn: testAnthropicConnection,
    },
    {
      id: 'google',
      name: 'Gemini API (Google)',
      description: 'Geração de texto (Flash) + Imagens (Imagen 4) para materiais didáticos',
      model: AI_CONFIG.generation.model,
      icon: '✨',
      gradient: 'from-[#4285F4] to-[#34A853]',
      envKey: 'VITE_GOOGLE_AI_KEY',
      configured: !!googleKey,
      testFn: testGoogleConnection,
    },
    {
      id: 'openai',
      name: 'OpenAI API',
      description: 'Classificação (GPT-4.1 Nano), código musical (GPT-4.1), embeddings (text-embedding-3-small)',
      model: `${AI_CONFIG.classification.model} · ${AI_CONFIG.embeddings.model}`,
      icon: '🧠',
      gradient: 'from-[#10A37F] to-[#1A7F64]',
      envKey: 'VITE_OPENAI_API_KEY',
      configured: !!openaiKey,
      testFn: testOpenAIConnection,
    },
    {
      id: 'embeddings',
      name: 'OpenAI Embeddings',
      description: 'Busca semântica RAG: vetorização de conteúdo curado para match inteligente',
      model: AI_CONFIG.embeddings.model,
      icon: '🔍',
      gradient: 'from-[#7C3AED] to-[#A855F7]',
      envKey: 'VITE_OPENAI_API_KEY',
      configured: !!openaiKey,
      testFn: testEmbeddingsConnection,
    },
    {
      id: 'supabase',
      name: 'Supabase — Backend as a Service',
      description: 'PostgreSQL + Auth + Storage + Edge Functions + Realtime + pgvector',
      model: 'sa-east-1 · rkfszavfqplhorvfpkcq',
      icon: '⚡',
      gradient: 'from-[#3ECF8E] to-[#1C8656]',
      envKey: 'VITE_SUPABASE_URL',
      configured: !!supabaseUrl,
      testFn: async () => {
        const start = performance.now()
        try {
          const { error } = await supabase.from('schools').select('id').limit(1)
          if (error) throw error
          return { ok: true, latencyMs: Math.round(performance.now() - start), message: 'Conectado — query OK' }
        } catch (e: any) {
          return { ok: false, latencyMs: 0, message: e?.message ?? 'Erro' }
        }
      },
    },
    {
      id: 'svguitar',
      name: 'SVGuitar + VexFlow + VexTab',
      description: 'Renderização local: diagramas de acordes, partituras, tablaturas',
      model: 'Bibliotecas JS (client-side)',
      icon: '🎼',
      gradient: 'from-foundation to-[#4F46E5]',
      envKey: '',
      configured: true,
      testFn: null,
    },
    {
      id: 'uazapi',
      name: 'UAZAPI — WhatsApp Business',
      description: 'Notificações, materiais, lembretes, progresso, bot professor',
      model: 'API REST · Instância configurável',
      icon: '💬',
      gradient: 'from-[#22C55E] to-[#16A34A]',
      envKey: 'VITE_UAZAPI_KEY',
      configured: false,
      testFn: null,
    },
  ]
}

export function Integracoes() {
  const [activeTab, setActiveTab] = useState("ativas");
  const [testResults, setTestResults] = useState<Record<string, { status: TestStatus; result?: ConnectionTestResult }>>({})

  const integrations = getIntegrations()
  const ativas = integrations.filter(i => i.configured)
  const disponiveis = integrations.filter(i => !i.configured)

  const handleTest = async (integration: IntegrationDef) => {
    if (!integration.testFn) return
    setTestResults(prev => ({ ...prev, [integration.id]: { status: 'testing' } }))

    try {
      const result = await integration.testFn()
      setTestResults(prev => ({
        ...prev,
        [integration.id]: { status: result.ok ? 'success' : 'error', result },
      }))
    } catch (e: any) {
      setTestResults(prev => ({
        ...prev,
        [integration.id]: { status: 'error', result: { ok: false, latencyMs: 0, message: e?.message ?? 'Erro' } },
      }))
    }
  }

  const renderCard = (integration: IntegrationDef) => {
    const test = testResults[integration.id]

    return (
      <div key={integration.id} className="card">
        <div className="flex items-center gap-4">
          <div className={cn("w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-white text-base shrink-0", integration.gradient)}>
            {integration.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-[14px]">{integration.name}</div>
            <div className="text-xs text-text2 mt-1">{integration.description}</div>
            <div className="text-[11px] text-text3 mt-1">Modelo: {integration.model}</div>
            {test?.result && (
              <div className={cn("text-[11px] mt-1 font-medium", test.status === 'success' ? 'text-verde' : 'text-red-400')}>
                {test.result.message}
                {test.result.latencyMs > 0 && ` · ${test.result.latencyMs}ms`}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {integration.configured ? (
              <Badge variant="advance" className="text-[10px]">
                <CheckCircle size={12} weight="fill" className="mr-1" /> Conectado
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px] text-red-400 border-red-400/30">
                <XCircle size={12} weight="fill" className="mr-1" /> Não configurado
              </Badge>
            )}
            {integration.testFn && integration.configured && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleTest(integration)}
                disabled={test?.status === 'testing'}
                className="text-[11px] h-7 px-2"
              >
                {test?.status === 'testing' ? (
                  <><SpinnerGap size={14} className="animate-spin" /> Testando...</>
                ) : test?.status === 'success' ? (
                  <><CheckCircle size={14} className="text-verde" /> {test.result?.latencyMs}ms</>
                ) : test?.status === 'error' ? (
                  <><ArrowClockwise size={14} className="text-red-400" /> Retestar</>
                ) : (
                  <><Lightning size={14} /> Testar</>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-[26px] leading-[1.2] text-text">
            <em className="not-italic text-accent">Integrações</em>
          </h1>
          <p className="text-text2 text-[13.5px] mt-1.5">
            {ativas.length} APIs conectadas · {disponiveis.length} disponíveis para configurar
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            integrations.filter(i => i.configured && i.testFn).forEach(i => handleTest(i))
          }}
        >
          <ArrowClockwise size={16} /> Testar Todas
        </Button>
      </div>

      <div className="flex gap-0.5 bg-bg2 rounded-[var(--radius-sm)] p-1 mb-6 w-fit flex-wrap">
        <div onClick={() => setActiveTab("ativas")} className={cn("px-4 py-2 rounded-md text-[13px] font-medium cursor-pointer transition-all whitespace-nowrap", activeTab === "ativas" ? "bg-gradient-to-br from-azul-escuro to-azul text-white shadow-[0_2px_8px_rgba(30,58,95,0.3)]" : "text-text2 hover:text-azul-claro hover:bg-azul-soft")}>
          Ativas ({ativas.length})
        </div>
        <div onClick={() => setActiveTab("disponiveis")} className={cn("px-4 py-2 rounded-md text-[13px] font-medium cursor-pointer transition-all whitespace-nowrap", activeTab === "disponiveis" ? "bg-gradient-to-br from-azul-escuro to-azul text-white shadow-[0_2px_8px_rgba(30,58,95,0.3)]" : "text-text2 hover:text-azul-claro hover:bg-azul-soft")}>
          Disponíveis ({disponiveis.length})
        </div>
      </div>

      {activeTab === "ativas" && (
        <div className="flex flex-col gap-3">
          {ativas.map(renderCard)}
        </div>
      )}

      {activeTab === "disponiveis" && (
        <div className="flex flex-col gap-3">
          {disponiveis.length === 0 ? (
            <div className="card p-8 text-center text-text3">
              Todas as integrações estão configuradas!
            </div>
          ) : (
            disponiveis.map(i => (
              <div key={i.id} className="card opacity-70">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-bg2 flex items-center justify-center text-base shrink-0">{i.icon}</div>
                  <div className="flex-1">
                    <div className="font-bold">{i.name}</div>
                    <div className="text-xs text-text2 mt-1">{i.description}</div>
                    <div className="text-[11px] text-text3 mt-1">Variável: {i.envKey || 'N/A'}</div>
                  </div>
                  <Badge variant="secondary" className="text-[10px] text-red-400 border-red-400/30">
                    <XCircle size={12} weight="fill" className="mr-1" /> Não configurado
                  </Badge>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
