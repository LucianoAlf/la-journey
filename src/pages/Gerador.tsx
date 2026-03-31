import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkle, SpinnerGap, MagnifyingGlass, Warning, FilePdf, Eye, Printer,
  Article, ListChecks, FloppyDisk, CaretDown, BookOpen, Lightbulb, PencilCircle,
  CheckSquare, Square, Lightning, MusicNotes,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useJourneys, useStages, useStations } from "@/hooks/useJourneys";
import { useSchool } from "@/hooks/useSchool";
import { supabase } from "@/lib/supabase";
import { generateEmbedding, generateText } from "@/services/aiService";
import { AI_CONFIG } from "@/lib/ai-config";
import { MaterialPreview, type MaterialBlock } from "@/components/material/MaterialPreview";
import { TemplateGallery } from "@/components/generator/TemplateGallery";
import type { StationBlock, StageStation } from "@/services/journeyService";
import { getStationBlocks } from "@/services/journeyService";
import { saveGeneratedMaterial } from "@/services/materialService";
import type { SaveMaterialBlock } from "@/services/materialService";

// --- Tipos ---

interface RAGBlock {
  id: string
  topic_id: string
  block_type: string
  title: string | null
  content: any
  render_data: any
  similarity: number
}

interface SelectableBlock extends StationBlock {
  selected: boolean
}

// --- Helpers ---

const BLOCK_TYPE_LABEL: Record<string, { emoji: string; label: string }> = {
  text:           { emoji: '📖', label: 'Texto' },
  exercise:       { emoji: '🎯', label: 'Exercício' },
  chord_diagram:  { emoji: '🎸', label: 'Acorde' },
  chord_grid:     { emoji: '🎸', label: 'Acordes' },
  notation:       { emoji: '🎼', label: 'Notação' },
  tablature:      { emoji: '🎵', label: 'Tablatura' },
  scale_diagram:  { emoji: '🎹', label: 'Escala' },
  image:          { emoji: '🖼️', label: 'Imagem' },
  tip:            { emoji: '💡', label: 'Dica' },
  example:        { emoji: '📄', label: 'Exemplo' },
};

function blockLabel(type: string) {
  const entry = BLOCK_TYPE_LABEL[type];
  return entry ? `${entry.emoji} ${entry.label}` : `📄 ${type}`;
}

/** Mapeia block_type do Gemini → material_block_type do banco */
function mapBlockType(type: string): string {
  const map: Record<string, string> = {
    text: 'text',
    tip: 'tip',
    exercise: 'exercise',
    example: 'text',
    notation: 'notation',
    chord_diagram: 'chord_diagram',
    chord_grid: 'chord_diagram',
    tablature: 'tablature',
    title: 'title',
    image: 'image',
    badge: 'badge',
  };
  return map[type] || 'text';
}

/** Agrupa blocos por tópico preservando a ordem */
function groupByTopic(blocks: SelectableBlock[]) {
  const groups: { topicTitle: string; topicOrder: number; blocks: SelectableBlock[] }[] = [];
  let current: typeof groups[0] | null = null;
  for (const b of blocks) {
    if (!current || current.topicTitle !== b.topic_title) {
      current = { topicTitle: b.topic_title, topicOrder: b.topic_order, blocks: [] };
      groups.push(current);
    }
    current.blocks.push(b);
  }
  return groups;
}

// --- Componente ---

export function Gerador() {
  const navigate = useNavigate();
  const { data: journeys } = useJourneys();
  const { data: school } = useSchool();
  const schoolData = (school ?? null) as { id: string; name?: string | null } | null;

  // Seletores em cascata
  const [selectedJourneyId, setSelectedJourneyId] = useState('');
  const [selectedStageId, setSelectedStageId] = useState('');
  const [selectedStationId, setSelectedStationId] = useState('');

  const selectedJourney = (journeys ?? []).find(j => j.id === selectedJourneyId);
  const { data: stages } = useStages(selectedJourney?.id);
  const selectedStage = (stages ?? []).find(s => s.id === selectedStageId);
  const { data: stations } = useStations(selectedStage?.id);
  const selectedStation = (stations ?? []).find(s => s.station_id === selectedStationId);

  // Modo 1 — Blocos da estação
  const [stationBlocks, setStationBlocks] = useState<SelectableBlock[]>([]);
  const [blocksLoading, setBlocksLoading] = useState(false);
  const [blocksLoaded, setBlocksLoaded] = useState(false);

  // Modo 2 — Busca complementar (RAG)
  const [ragBlocks, setRagBlocks] = useState<RAGBlock[]>([]);
  const [ragLoading, setRagLoading] = useState(false);
  const [ragSearched, setRagSearched] = useState(false);

  // Geração
  const [generatedBlocks, setGeneratedBlocks] = useState<MaterialBlock[]>([]);
  const [genLoading, setGenLoading] = useState(false);
  const [genMeta, setGenMeta] = useState<{ latencyMs: number; tokens: number | string } | null>(null);

  // Salvamento
  const [saveLoading, setSaveLoading] = useState(false);
  const [savedMaterialId, setSavedMaterialId] = useState<string | null>(null);

  // Tab ativa
  const [activeTab, setActiveTab] = useState('station');
  const [generatorMode, setGeneratorMode] = useState<'ia' | 'template'>('ia');

  // Contadores
  const selectedCount = stationBlocks.filter(b => b.selected).length;
  const topicGroups = useMemo(() => groupByTopic(stationBlocks), [stationBlocks]);

  // --- Resetters ---

  const resetAll = () => {
    setStationBlocks([]); setBlocksLoaded(false);
    setRagBlocks([]); setRagSearched(false);
    setGeneratedBlocks([]); setGenMeta(null);
  };

  const resetGeneration = () => {
    setGeneratedBlocks([]); setGenMeta(null); setSavedMaterialId(null);
  };

  // --- Handlers ---

  const handleLoadStationBlocks = async () => {
    if (!selectedStationId) { toast.error('Selecione uma estação'); return; }

    setBlocksLoading(true);
    resetGeneration();

    try {
      const blocks = await getStationBlocks(selectedStationId);
      setStationBlocks(blocks.map(b => ({ ...b, selected: true })));
      setBlocksLoaded(true);
      toast.success(`${blocks.length} blocos carregados de "${selectedStation?.station_name}"`);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao carregar blocos');
    } finally {
      setBlocksLoading(false);
    }
  };

  const handleRAGSearch = async () => {
    if (!selectedJourney || !selectedStage) {
      toast.error('Selecione jornada e stage');
      return;
    }

    setRagLoading(true);
    setRagBlocks([]);
    setRagSearched(false);

    try {
      const searchQuery = `${selectedStage.name} ${selectedJourney.instrument} ${selectedJourney.name} material didático musical`;
      const { embedding } = await generateEmbedding(searchQuery);

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
      if (blocks.length > 0) toast.success(`${blocks.length} blocos encontrados via RAG!`);
      else toast.info('Nenhum conteúdo curado encontrado.');
    } catch (e: any) {
      toast.error(e?.message || 'Erro na busca RAG');
      setRagSearched(true);
    } finally {
      setRagLoading(false);
    }
  };

  const toggleBlock = (blockId: string) => {
    setStationBlocks(prev => prev.map(b =>
      b.block_id === blockId ? { ...b, selected: !b.selected } : b
    ));
  };

  const toggleAll = (selected: boolean) => {
    setStationBlocks(prev => prev.map(b => ({ ...b, selected })));
  };

  const handleGeneratePreview = async () => {
    const selected = stationBlocks.filter(b => b.selected);

    if (selected.length === 0) {
      toast.error('Selecione pelo menos um bloco para gerar');
      return;
    }
    if (!selectedJourney || !selectedStation) {
      toast.error('Selecione jornada e estação');
      return;
    }

    setGenLoading(true);
    setGeneratedBlocks([]);
    setGenMeta(null);

    try {
      // Detectar tipo de conteúdo
      const blockTypes = new Set(selected.map(b => b.block_type));
      const isInstrumental = selectedJourney.instrument !== 'universal' && selectedJourney.instrument !== 'teoria';
      const hasChords = blockTypes.has('chord_diagram') || blockTypes.has('chord_grid');

      // Montar contexto dos blocos curados NA ORDEM
      const blocksWithNotation = new Set<number>();
      const blocksContext = selected.map((b, i) => {
        const contentText = typeof b.block_content === 'object'
          ? (b.block_content?.text ?? JSON.stringify(b.block_content))
          : String(b.block_content ?? '');
        const hasNotation = !!b.block_render_data?.notation;
        if (hasNotation) blocksWithNotation.add(i);
        return `### Bloco ${i + 1} [${b.block_type}] — ${b.block_title}\nTópico: ${b.topic_title}\nConteúdo curado: ${contentText}${hasNotation ? '\n[POSSUI NOTAÇÃO MUSICAL VISUAL — será renderizada automaticamente pelo componente VexFlow]' : ''}`;
      }).join('\n\n');

      const systemPrompt = `Você é um professor de música criando material didático para a plataforma LA Journey.
REGRA: Retorne APENAS um array JSON. Sem texto antes ou depois. Parseável por JSON.parse().

Cada bloco da resposta deve ter esta estrutura:
{
  "block_type": "text" | "tip" | "exercise" | "example" | "notation" | "chord_diagram" | "chord_grid",
  "title": "título do bloco",
  "content": { "text": "conteúdo expandido com **negrito** para termos técnicos", "dimension": "teoria|técnica|ritmo|repertório" },
  "render_data": null
}
${isInstrumental && hasChords ? `
Para chord_diagram: render_data = { "chord_name": "C", "fingers": [[1,2],[2,4],[3,5]], "barres": [], "position": 1 }
Para chord_grid: render_data = { "chords": [{ "chord_name": "G", "fingers": [[2,5],[3,6],[3,1]] }] }` : ''}
Para notation: render_data = { "notes": ["c/4:q","d/4:q"], "clef": "treble", "time_signature": "4/4", "key_signature": "C" }`;

      const prompt = `## Estação: ${selectedStation.station_name}
## Jornada: ${selectedJourney.name} (${selectedJourney.instrument})
## Stage: ${selectedStage?.name ?? ''}

## BLOCOS CURADOS (na ordem pedagógica correta — NÃO reordene):

${blocksContext}

## INSTRUÇÕES:

1. Para cada bloco curado acima, gere uma versão EXPANDIDA com linguagem didática e acessível
2. MANTENHA A ORDEM EXATA dos blocos — não reorganize, não pule nenhum
3. Para blocos tipo "text": expanda em 2-3 parágrafos, mantendo 100% da informação original e adicionando exemplos
4. Para blocos tipo "tip": mantenha como destaque/dica, pode expandir levemente
5. Para blocos tipo "exercise": crie exercícios REAIS e DETALHADOS com instruções passo-a-passo
6. Para blocos tipo "example": mantenha como exemplo prático, pode adicionar contexto
7. NÃO invente conteúdo que não está nos blocos curados
8. NÃO adicione diagramas de acorde a menos que o bloco curado fale sobre acordes
9. Use **negrito** para termos técnicos importantes
10. A quantidade de blocos na resposta deve ser IGUAL à quantidade de blocos curados (${selected.length} blocos)
11. Se o bloco curado tem [POSSUI NOTAÇÃO MUSICAL VISUAL], NÃO descreva as notas individuais em texto. A notação será renderizada visualmente pelo componente VexFlow. Foque em explicar o conceito em prosa e referencie a pauta: "observe a pauta abaixo", "como podemos ver na notação", "a pauta a seguir ilustra".

Retorne APENAS o array JSON com ${selected.length} blocos, na mesma ordem.`;

      toast.info(`Expandindo ${selected.length} blocos com Gemini Flash...`);

      const result = await generateText(prompt, { ...AI_CONFIG.generation, maxTokens: 6144 }, systemPrompt);

      let blocks: MaterialBlock[] = [];
      try {
        let jsonStr = result.text.trim();
        if (jsonStr.startsWith('```')) {
          jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        }
        blocks = JSON.parse(jsonStr);
        if (!Array.isArray(blocks)) blocks = [blocks];
      } catch {
        blocks = [{ block_type: 'text', title: 'Material Gerado', content: { text: result.text } }];
        toast.warning('IA retornou texto em vez de JSON — exibindo como texto.');
      }

      // Injetar render_data.notation dos blocos curados nos blocos gerados correspondentes
      blocks = blocks.map((block, i) => {
        if (blocksWithNotation.has(i) && selected[i]?.block_render_data?.notation) {
          return {
            ...block,
            render_data: {
              ...(block.render_data ?? {}),
              notation: selected[i].block_render_data.notation,
            },
          };
        }
        return block;
      });

      setGeneratedBlocks(blocks);
      setGenMeta({ latencyMs: result.latencyMs, tokens: result.tokensUsed ?? '?' });
      toast.success(`${blocks.length} blocos gerados em ${result.latencyMs}ms`);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao gerar material');
    } finally {
      setGenLoading(false);
    }
  };

  const handleSaveMaterial = async () => {
    // Se já salvou, navegar pro Editor
    if (savedMaterialId) {
      navigate(`/editor/${savedMaterialId}`);
      return;
    }

    if (generatedBlocks.length === 0) return;
    if (!schoolData || !selectedJourney || !selectedStage || !selectedStation) {
      toast.error('Dados incompletos para salvar');
      return;
    }

    setSaveLoading(true);
    try {
      const blocksToSave: SaveMaterialBlock[] = generatedBlocks.map((block, index) => ({
        block_type: mapBlockType(block.block_type),
        title: block.title ?? null,
        content: block.content ? { text: block.content.text ?? '', ...block.content } : null,
        render_data: block.render_data ?? null,
        sort_order: index + 1,
      }));

      const materialId = await saveGeneratedMaterial({
        schoolId: schoolData.id,
        journeyId: selectedJourney.id,
        stageId: selectedStage.id,
        stationId: selectedStation.station_id,
        title: selectedStation.station_name ?? 'Material sem título',
        type: 'full_module',
        generationConfig: {
          model: AI_CONFIG.generation.model,
          station: selectedStation.station_name,
          blocks_used: stationBlocks.filter(b => b.selected).length,
          generated_at: new Date().toISOString(),
        },
        blocks: blocksToSave,
      });

      setSavedMaterialId(materialId);
      toast.success(`Material salvo com ${blocksToSave.length} blocos!`);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao salvar material');
    } finally {
      setSaveLoading(false);
    }
  };

  // --- Render ---

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-[26px] leading-[1.2] text-text">
            Gerador de <em className="not-italic text-accent">Material</em>
          </h1>
          <p className="text-text2 text-[13.5px] mt-1.5">
            {generatorMode === 'ia'
              ? 'Carregue blocos curados por estação e expanda com IA generativa'
              : 'Use um template completo do banco como ponto de partida para o Editor'}
          </p>
        </div>
        {generatorMode === 'ia' && (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={handleLoadStationBlocks}
              disabled={blocksLoading || !selectedStationId}
            >
              {blocksLoading ? <SpinnerGap size={16} className="animate-spin" /> : <ListChecks size={16} />}
              {blocksLoading ? 'Carregando...' : 'Carregar Blocos'}
            </Button>
            <Button
              className="bg-accent hover:bg-accent/90"
              onClick={handleGeneratePreview}
              disabled={genLoading || selectedCount === 0}
            >
              {genLoading ? <SpinnerGap size={16} className="animate-spin" /> : <Sparkle size={16} />}
              {genLoading ? 'Gerando...' : `Gerar com IA (${selectedCount})`}
            </Button>
            <Button
              variant="ghost"
              onClick={handleSaveMaterial}
              disabled={saveLoading || generatedBlocks.length === 0}
            >
              {saveLoading ? <SpinnerGap size={16} className="animate-spin" /> : <FloppyDisk size={16} />}
              {savedMaterialId ? '✓ Salvo — Abrir Editor' : saveLoading ? 'Salvando...' : 'Salvar Material'}
            </Button>
          </div>
        )}
      </div>

      <div className="mb-4 flex gap-2">
        <Button
          variant={generatorMode === 'ia' ? 'default' : 'outline'}
          onClick={() => setGeneratorMode('ia')}
        >
          <Sparkle size={16} />
          Gerar com IA
        </Button>
        <Button
          variant={generatorMode === 'template' ? 'default' : 'outline'}
          onClick={() => setGeneratorMode('template')}
        >
          <BookOpen size={16} />
          Usar Template
        </Button>
      </div>

      {generatorMode === 'template' ? (
        <TemplateGallery />
      ) : (
        <>

      {/* Seletores — 4 dropdowns */}
      <div className="card mb-4">
        <div className="grid grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label>Jornada</Label>
            <Select value={selectedJourneyId} onValueChange={v => { setSelectedJourneyId(v); setSelectedStageId(''); setSelectedStationId(''); resetAll(); }}>
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
            <Select value={selectedStageId} onValueChange={v => { setSelectedStageId(v); setSelectedStationId(''); resetAll(); }}>
              <SelectTrigger><SelectValue placeholder="Selecione um stage" /></SelectTrigger>
              <SelectContent>
                {(stages ?? []).map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name} · {s.total_lessons ?? '?'} aulas</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Estação</Label>
            <Select value={selectedStationId} onValueChange={v => { setSelectedStationId(v); resetAll(); }}>
              <SelectTrigger><SelectValue placeholder="Selecione uma estação" /></SelectTrigger>
              <SelectContent>
                {(stations ?? []).map(s => (
                  <SelectItem key={s.station_id} value={s.station_id}>
                    {s.station_number}. {s.station_name} ({s.topic_count} tóp · {s.block_count} blocos)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Escola</Label>
            <div className="flex items-center gap-3 h-9 px-3 bg-bg2 rounded-[var(--radius-sm)] border border-border">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-azul-escuro to-azul flex items-center justify-center text-white text-[9px] font-extrabold">LA</div>
              <span className="text-sm text-text2">{schoolData?.name ?? 'Carregando...'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo: 2 colunas */}
      <div className="grid grid-cols-2 gap-5">

        {/* Coluna esquerda — Tabs */}
        <div className="flex flex-col gap-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full">
              <TabsTrigger value="station" className="flex-1 gap-1.5">
                <ListChecks size={14} />
                Blocos da Estação
                {blocksLoaded && <Badge variant="advance" className="text-[9px] ml-1">{stationBlocks.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="rag" className="flex-1 gap-1.5">
                <MagnifyingGlass size={14} />
                Busca Complementar
                {ragSearched && ragBlocks.length > 0 && <Badge variant="foundation" className="text-[9px] ml-1">{ragBlocks.length}</Badge>}
              </TabsTrigger>
            </TabsList>

            {/* Tab 1 — Blocos da Estação */}
            <TabsContent value="station" className="mt-3">
              <div className="card">
                {!blocksLoaded && !blocksLoading && (
                  <div className="text-center py-10 text-text3 text-sm">
                    <ListChecks size={32} className="mx-auto mb-3 text-text3/50" />
                    Selecione uma estação e clique <strong>Carregar Blocos</strong> para ver o esqueleto pedagógico.
                  </div>
                )}

                {blocksLoading && (
                  <div className="flex items-center justify-center py-10 gap-2 text-text2">
                    <SpinnerGap size={20} className="animate-spin" /> Carregando blocos da estação...
                  </div>
                )}

                {blocksLoaded && stationBlocks.length === 0 && (
                  <div className="p-4 bg-dourado-soft rounded-[var(--radius-sm)] text-sm text-dourado">
                    <Warning size={16} className="inline mr-1" />
                    Estação sem blocos de conteúdo. Verifique se os tópicos foram curados.
                  </div>
                )}

                {blocksLoaded && stationBlocks.length > 0 && (
                  <div>
                    {/* Header com select all */}
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
                      <span className="text-[12px] text-text2">
                        {selectedCount}/{stationBlocks.length} blocos selecionados
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleAll(true)}
                          className="text-[11px] text-azul-claro hover:underline"
                        >
                          Selecionar todos
                        </button>
                        <span className="text-text3">·</span>
                        <button
                          onClick={() => toggleAll(false)}
                          className="text-[11px] text-text3 hover:underline"
                        >
                          Limpar
                        </button>
                      </div>
                    </div>

                    {/* Blocos agrupados por tópico */}
                    <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1">
                      {topicGroups.map(group => (
                        <div key={group.topicTitle}>
                          <div className="flex items-center gap-2 mb-1.5">
                            <BookOpen size={14} className="text-foundation" />
                            <span className="font-bold text-[12px] text-text uppercase tracking-wider">
                              {group.topicTitle}
                            </span>
                          </div>
                          <div className="flex flex-col gap-1 ml-5">
                            {group.blocks.map(block => {
                              const contentText = typeof block.block_content === 'object'
                                ? (block.block_content?.text ?? '')
                                : String(block.block_content ?? '');
                              return (
                                <label
                                  key={block.block_id}
                                  className={`flex items-start gap-2.5 p-2.5 rounded-[var(--radius-sm)] border cursor-pointer transition-colors ${
                                    block.selected
                                      ? 'border-accent/30 bg-accent-soft'
                                      : 'border-border bg-bg hover:bg-bg2'
                                  }`}
                                >
                                  <Checkbox
                                    checked={block.selected}
                                    onCheckedChange={() => toggleBlock(block.block_id)}
                                    className="mt-0.5 shrink-0"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[10px] text-text3">{blockLabel(block.block_type)}</span>
                                      <span className="font-semibold text-[12px] text-text truncate">{block.block_title}</span>
                                      {block.block_render_data?.notation && (
                                        <MusicNotes size={12} className="text-accent shrink-0" weight="bold" />
                                      )}
                                    </div>
                                    <div className="text-[10px] text-text3 line-clamp-1 mt-0.5">
                                      {String(contentText).slice(0, 120)}
                                    </div>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Tab 2 — Busca Complementar (RAG) */}
            <TabsContent value="rag" className="mt-3">
              <div className="card">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[13px] text-text2">Busca semântica via embeddings (pgvector)</span>
                  <Button
                    variant="ghost" size="sm"
                    onClick={handleRAGSearch}
                    disabled={ragLoading || !selectedJourneyId || !selectedStageId}
                  >
                    {ragLoading ? <SpinnerGap size={14} className="animate-spin" /> : <MagnifyingGlass size={14} />}
                    {ragLoading ? 'Buscando...' : 'Buscar RAG'}
                  </Button>
                </div>

                {!ragSearched && !ragLoading && (
                  <div className="text-center py-8 text-text3 text-sm">
                    <MagnifyingGlass size={28} className="mx-auto mb-2 text-text3/50" />
                    Clique <strong>Buscar RAG</strong> para encontrar conteúdo complementar via embeddings.
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
                    Nenhum resultado. Tente outra combinação de jornada/stage.
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
                              <span className="text-[11px]">{blockLabel(block.block_type)}</span>
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
            </TabsContent>
          </Tabs>
        </div>

        {/* Coluna direita — Preview gerado */}
        <div className="flex flex-col gap-4">
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <div className="font-serif text-[17px]">
                <Sparkle size={18} className="inline mr-2 text-accent" />
                Preview Gerado
              </div>
              {generatedBlocks.length > 0 && (
                <div className="flex gap-1">
                  <Badge variant="advance" className="text-[10px]">{generatedBlocks.length} blocos</Badge>
                  <Button variant="ghost" size="sm"><FilePdf size={14} /> PDF</Button>
                  <Button variant="ghost" size="sm"><Eye size={14} /> HTML</Button>
                  <Button variant="ghost" size="sm"><Printer size={14} /></Button>
                </div>
              )}
            </div>

            {generatedBlocks.length === 0 && !genLoading && (
              <div className="text-center py-10 text-text3 text-sm">
                <Sparkle size={32} className="mx-auto mb-3 text-text3/50" />
                {blocksLoaded && selectedCount > 0 ? (
                  <>
                    <strong>{selectedCount} blocos</strong> selecionados da estação <strong>"{selectedStation?.station_name}"</strong>.
                    <div className="text-[11px] text-verde mt-2">
                      <Lightning size={12} className="inline" /> Clique <strong>Gerar com IA</strong> para expandir o material.
                    </div>
                  </>
                ) : (
                  <>Carregue blocos de uma estação e clique <strong>Gerar com IA</strong> para expandir o material.</>
                )}
              </div>
            )}

            {genLoading && (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-text2">
                <SpinnerGap size={28} className="animate-spin text-accent" />
                <div className="text-sm">Expandindo <strong>{selectedCount} blocos</strong> com Gemini Flash...</div>
                <div className="text-[11px] text-text3">
                  Estação: {selectedStation?.station_name}
                </div>
              </div>
            )}

            {generatedBlocks.length > 0 && (
              <div className="max-h-[600px] overflow-y-auto pr-1">
                {/* Mini capa */}
                <div className="bg-white rounded-lg p-4 mb-4 text-center shadow-sm">
                  <div className="w-8 h-8 rounded-md bg-[#1E3A5F] mx-auto mb-1 flex items-center justify-center text-white text-[9px] font-extrabold">LA</div>
                  <div className="text-[9px] text-[#666]">{schoolData?.name ?? 'LA Music School'}</div>
                  <div className="text-sm font-bold text-[#1E293B] mt-1">{selectedStation?.station_name ?? 'Estação'}</div>
                  <div className="text-[8px] text-[#94A3B8]">{selectedJourney?.instrument} · {selectedStage?.name} · {selectedStation?.topic_count ?? '?'} tópicos</div>
                </div>

                {/* Material renderizado */}
                <MaterialPreview blocks={generatedBlocks} />

                {genMeta && (
                  <div className="mt-4 p-3 bg-azul-soft rounded-[var(--radius-sm)]">
                    <div className="text-[11px] text-text3">
                      <Article size={12} className="inline mr-1" />
                      {generatedBlocks.length} blocos · Gerado por {AI_CONFIG.generation.model} em {genMeta.latencyMs}ms · {genMeta.tokens} tokens · Base: {selectedStation?.station_name}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
