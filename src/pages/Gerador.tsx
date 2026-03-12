import { useState } from "react";
import { Sparkle, SpinnerGap, MagnifyingGlass, Lightning, Warning, FilePdf, Eye, Printer, Article } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useJourneys, useStages } from "@/hooks/useJourneys";
import { useSchool } from "@/hooks/useSchool";
import { supabase } from "@/lib/supabase";
import { generateEmbedding, generateText } from "@/services/aiService";
import { AI_CONFIG } from "@/lib/ai-config";

interface RAGBlock {
  id: string
  topic_id: string
  block_type: string
  title: string | null
  content: any
  render_data: any
  similarity: number
}

export function Gerador() {
  const { data: journeys } = useJourneys();
  const { data: school } = useSchool();
  const [selectedJourneyId, setSelectedJourneyId] = useState('');
  const [selectedStageId, setSelectedStageId] = useState('');

  const selectedJourney = (journeys ?? []).find(j => j.id === selectedJourneyId);
  const { data: stages } = useStages(selectedJourney?.id);
  const selectedStage = (stages ?? []).find(s => s.id === selectedStageId);

  // RAG State
  const [ragBlocks, setRagBlocks] = useState<RAGBlock[]>([]);
  const [ragLoading, setRagLoading] = useState(false);
  const [ragSearched, setRagSearched] = useState(false);

  // Geração State
  const [generatedText, setGeneratedText] = useState('');
  const [genLoading, setGenLoading] = useState(false);

  const handleRAGSearch = async () => {
    if (!selectedJourney || !selectedStage) {
      toast.error('Selecione uma jornada e um stage');
      return;
    }

    setRagLoading(true);
    setRagBlocks([]);
    setRagSearched(false);

    try {
      const searchQuery = `${selectedStage.name} ${selectedJourney.instrument} ${selectedJourney.name} material didático musical`;

      toast.info(`Gerando embedding para: "${searchQuery.slice(0, 60)}..."`);
      const { embedding } = await generateEmbedding(searchQuery);

      toast.info(`Buscando blocos similares no banco (${embedding.length} dimensões)...`);

      const difficultyMap: Record<string, string> = {
        Foundation: 'foundation', Grow: 'grow', Advance: 'advance', Master: 'master',
      };

      const { data, error } = await (supabase.rpc as any)('match_content_blocks', {
        query_embedding: JSON.stringify(embedding),
        match_threshold: 0.3,
        match_count: 10,
        filter_instrument: selectedJourney.instrument,
        filter_difficulty: difficultyMap[selectedStage.name] ?? null,
      });

      if (error) throw error;

      const blocks = (data ?? []) as RAGBlock[];
      setRagBlocks(blocks);
      setRagSearched(true);

      if (blocks.length > 0) {
        toast.success(`${blocks.length} blocos encontrados via RAG!`);
      } else {
        toast.info('Nenhum conteúdo curado encontrado — geração pura com IA será usada.');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Erro na busca RAG');
      setRagSearched(true);
    } finally {
      setRagLoading(false);
    }
  };

  const handleGeneratePreview = async () => {
    if (!selectedJourney || !selectedStage) {
      toast.error('Selecione jornada e stage');
      return;
    }

    setGenLoading(true);
    setGeneratedText('');

    try {
      let contextBlock = '';
      if (ragBlocks.length > 0) {
        contextBlock = ragBlocks.map((b, i) => {
          const contentStr = typeof b.content === 'object' ? JSON.stringify(b.content) : String(b.content ?? '');
          return `[Bloco ${i + 1}] Tipo: ${b.block_type} | Título: ${b.title ?? 'Sem título'}\nConteúdo: ${contentStr.slice(0, 500)}`;
        }).join('\n\n');
      }

      const systemPrompt = `Você é um compositor de material didático musical para a plataforma LA Journey.
Baseado nos conteúdos curados fornecidos (se houver), gere um texto explicativo para uma apostila de música.
O texto deve ser didático, claro, em português brasileiro, adequado para o nível ${selectedStage.name}.
Instrumento: ${selectedJourney.instrument}.
Formato: parágrafos curtos, com destaques em **negrito** para termos importantes.
Use markdown para formatação.`;

      const prompt = contextBlock
        ? `Conteúdos de referência (RAG):\n\n${contextBlock}\n\nGere um texto didático cobrindo esses tópicos para o stage ${selectedStage.name} de ${selectedJourney.instrument}.`
        : `Gere um texto didático para o stage ${selectedStage.name} de ${selectedJourney.instrument}, cobrindo os fundamentos essenciais deste nível. Não há conteúdo curado disponível — use seu conhecimento musical.`;

      toast.info('Gerando texto com Gemini Flash...');

      const result = await generateText(prompt, AI_CONFIG.generation, systemPrompt);

      setGeneratedText(result.text);
      toast.success(`Texto gerado em ${result.latencyMs}ms · ${result.tokensUsed ?? '?'} tokens`);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao gerar texto');
    } finally {
      setGenLoading(false);
    }
  };

  const blockTypeLabel: Record<string, string> = {
    text: '📖 Texto', exercise: '🎯 Exercício', chord_diagram: '🎸 Acorde',
    notation: '🎼 Notação', tablature: '🎵 Tablatura', scale_diagram: '🎹 Escala',
    image: '🖼️ Imagem', tip: '💡 Dica',
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-[26px] leading-[1.2] text-text">
            Gerador de <em className="not-italic text-accent">Material</em>
          </h1>
          <p className="text-text2 text-[13.5px] mt-1.5">
            Gere apostilas profissionais com RAG + IA generativa
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            onClick={handleRAGSearch}
            disabled={ragLoading || !selectedJourneyId || !selectedStageId}
          >
            {ragLoading ? <SpinnerGap size={16} className="animate-spin" /> : <MagnifyingGlass size={16} />}
            {ragLoading ? 'Buscando...' : 'Buscar RAG'}
          </Button>
          <Button
            className="bg-accent hover:bg-accent/90"
            onClick={handleGeneratePreview}
            disabled={genLoading || !selectedJourneyId || !selectedStageId}
          >
            {genLoading ? <SpinnerGap size={16} className="animate-spin" /> : <Sparkle size={16} />}
            {genLoading ? 'Gerando...' : 'Gerar Preview com IA'}
          </Button>
        </div>
      </div>

      {/* Seletores */}
      <div className="card mb-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>Jornada</Label>
            <Select value={selectedJourneyId} onValueChange={v => { setSelectedJourneyId(v); setSelectedStageId(''); setRagBlocks([]); setRagSearched(false); setGeneratedText(''); }}>
              <SelectTrigger><SelectValue placeholder="Selecione uma jornada" /></SelectTrigger>
              <SelectContent>
                {(journeys ?? []).map(j => (
                  <SelectItem key={j.id} value={j.id}>{j.name} — {j.instrument}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Stage</Label>
            <Select value={selectedStageId} onValueChange={v => { setSelectedStageId(v); setRagBlocks([]); setRagSearched(false); setGeneratedText(''); }}>
              <SelectTrigger><SelectValue placeholder="Selecione um stage" /></SelectTrigger>
              <SelectContent>
                {(stages ?? []).map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name} · {s.total_lessons ?? '?'} aulas</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Escola</Label>
            <div className="flex items-center gap-3 h-9 px-3 bg-bg2 rounded-[var(--radius-sm)] border border-border">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-azul-escuro to-azul flex items-center justify-center text-white text-[9px] font-extrabold">LA</div>
              <span className="text-sm text-text2">{school?.name ?? 'Carregando...'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Coluna esquerda — RAG Results */}
        <div className="flex flex-col gap-4">
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <div className="font-serif text-[17px]">
                <MagnifyingGlass size={18} className="inline mr-2 text-accent" />
                Busca Semântica (RAG)
              </div>
              {ragSearched && (
                <Badge variant={ragBlocks.length > 0 ? 'advance' : 'secondary'}>
                  {ragBlocks.length} blocos
                </Badge>
              )}
            </div>

            {!ragSearched && !ragLoading && (
              <div className="text-center py-8 text-text3 text-sm">
                Selecione jornada e stage, depois clique <strong>Buscar RAG</strong> para encontrar conteúdo curado via embeddings.
              </div>
            )}

            {ragLoading && (
              <div className="flex items-center justify-center py-8 gap-2 text-text2">
                <SpinnerGap size={20} className="animate-spin" /> Gerando embedding e buscando no pgvector...
              </div>
            )}

            {ragSearched && ragBlocks.length === 0 && (
              <div className="p-4 bg-dourado-soft rounded-[var(--radius-sm)] text-sm text-dourado">
                <Warning size={16} className="inline mr-1" />
                Nenhum conteúdo curado encontrado para este instrumento/nível — geração pura com IA será usada.
                <div className="text-[11px] text-text3 mt-1">
                  O Claude está populando o banco com conteúdo curado. Quando os embeddings estiverem prontos, a busca retornará resultados.
                </div>
              </div>
            )}

            {ragBlocks.length > 0 && (
              <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-1">
                {ragBlocks.map((block, i) => {
                  const contentStr = typeof block.content === 'object' ? JSON.stringify(block.content) : String(block.content ?? '');
                  return (
                    <div key={block.id} className="p-3 border border-border rounded-[var(--radius-sm)] bg-bg hover:bg-azul-soft/30 transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px]">{blockTypeLabel[block.block_type] ?? '📄 ' + block.block_type}</span>
                          <span className="font-bold text-[13px]">{block.title ?? `Bloco ${i + 1}`}</span>
                        </div>
                        <Badge variant="foundation" className="text-[9px] font-mono">
                          {(block.similarity * 100).toFixed(1)}%
                        </Badge>
                      </div>
                      <div className="text-[11px] text-text3 line-clamp-2">
                        {contentStr.slice(0, 200)}{contentStr.length > 200 ? '...' : ''}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Coluna direita — Preview gerado */}
        <div className="flex flex-col gap-4">
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <div className="font-serif text-[17px]">
                <Sparkle size={18} className="inline mr-2 text-accent" />
                Preview Gerado (Gemini)
              </div>
              {generatedText && (
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm"><FilePdf size={14} /> PDF</Button>
                  <Button variant="ghost" size="sm"><Eye size={14} /> HTML</Button>
                  <Button variant="ghost" size="sm"><Printer size={14} /></Button>
                </div>
              )}
            </div>

            {!generatedText && !genLoading && (
              <div className="text-center py-8 text-text3 text-sm">
                Clique <strong>Gerar Preview com IA</strong> para criar texto didático.
                {ragBlocks.length > 0 && (
                  <div className="text-[11px] text-verde mt-2">
                    <Lightning size={12} className="inline" /> {ragBlocks.length} blocos RAG serão usados como contexto.
                  </div>
                )}
              </div>
            )}

            {genLoading && (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-text2">
                <SpinnerGap size={28} className="animate-spin text-accent" />
                <div className="text-sm">Gerando texto com <strong>Gemini Flash</strong>...</div>
                <div className="text-[11px] text-text3">
                  {ragBlocks.length > 0 ? `Usando ${ragBlocks.length} blocos RAG como contexto` : 'Geração pura sem contexto RAG'}
                </div>
              </div>
            )}

            {generatedText && (
              <div className="max-h-[500px] overflow-y-auto">
                {/* Mini preview de capa */}
                <div className="bg-white rounded-lg p-4 mb-3 text-center shadow-sm">
                  <div className="w-8 h-8 rounded-md bg-[#1E3A5F] mx-auto mb-1 flex items-center justify-center text-white text-[9px] font-extrabold">LA</div>
                  <div className="text-[9px] text-[#666]">{school?.name ?? 'LA Music School'}</div>
                  <div className="text-sm font-bold text-[#1E293B] mt-1">{selectedStage?.name ?? 'Stage'}</div>
                  <div className="text-[8px] text-[#94A3B8]">{selectedJourney?.instrument} · {selectedStage?.total_lessons ?? '?'} aulas</div>
                </div>

                {/* Texto gerado */}
                <div className="prose prose-sm prose-invert max-w-none text-text2 text-[13px] leading-relaxed">
                  {generatedText.split('\n').map((line, i) => {
                    if (!line.trim()) return <br key={i} />;
                    if (line.startsWith('# ')) return <h2 key={i} className="font-serif text-lg text-text mt-4 mb-2">{line.replace('# ', '')}</h2>;
                    if (line.startsWith('## ')) return <h3 key={i} className="font-serif text-base text-text mt-3 mb-1">{line.replace('## ', '')}</h3>;
                    if (line.startsWith('### ')) return <h4 key={i} className="font-bold text-[13px] text-accent mt-2 mb-1">{line.replace('### ', '')}</h4>;
                    if (line.startsWith('- ') || line.startsWith('* ')) return <div key={i} className="ml-4 text-[12px]">• {line.replace(/^[-*]\s/, '')}</div>;

                    // Renderizar **negrito** inline
                    const parts = line.split(/(\*\*[^*]+\*\*)/g);
                    return (
                      <p key={i} className="mb-2">
                        {parts.map((part, j) =>
                          part.startsWith('**') && part.endsWith('**')
                            ? <strong key={j} className="text-text font-semibold">{part.slice(2, -2)}</strong>
                            : <span key={j}>{part}</span>
                        )}
                      </p>
                    );
                  })}
                </div>

                <div className="mt-4 p-3 bg-azul-soft rounded-[var(--radius-sm)]">
                  <div className="text-[11px] text-text3">
                    <Article size={12} className="inline mr-1" />
                    Gerado por {AI_CONFIG.generation.model} · {ragBlocks.length > 0 ? `${ragBlocks.length} blocos RAG como contexto` : 'Geração pura'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
