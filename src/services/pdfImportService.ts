import * as pdfjsLib from 'pdfjs-dist'
import { generateText } from '@/services/aiService'
import { AI_CONFIG } from '@/lib/ai-config'
import { createTopicWithCuration, createBlock } from '@/services/contentService'

// Configure PDF.js worker - version 4.4.168
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs'

// ─── Types ───────────────────────────────────────────────

export interface ImportedTopic {
  title: string
  description: string
  dimension: 'theory' | 'technique' | 'rhythm' | 'repertoire' | 'auditory' | 'evaluation'
  difficulty_level: 'foundation' | 'grow' | 'advance' | 'master'
  tags: string[]
  estimated_minutes: number
  selected: boolean
  blocks: ImportedBlock[]
}

export interface ImportedBlock {
  block_type: 'text' | 'exercise' | 'tip' | 'example'
  title: string
  content: string
  sort_order: number
  selected: boolean
}

export interface PdfExtractionResult {
  text: string
  pageCount: number
}

export interface ImportResult {
  topicsCreated: number
  blocksCreated: number
}

// ─── PDF Text Extraction ─────────────────────────────────

export async function extractTextFromPdf(file: File): Promise<PdfExtractionResult> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  const pages: string[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ')
    pages.push(`--- Pagina ${i} ---\n${pageText}`)
  }

  return {
    text: pages.join('\n\n'),
    pageCount: pdf.numPages,
  }
}

// ─── AI Normalization ────────────────────────────────────

const MAX_CHARS_PER_CHUNK = 80000 // ~20k tokens, safe margin for Gemini Flash

export async function normalizeWithAI(
  pdfText: string,
  instrument: string,
  defaultLevel: string,
  sourceDocument: string,
): Promise<ImportedTopic[]> {
  // If text is small enough, process in one go
  if (pdfText.length <= MAX_CHARS_PER_CHUNK) {
    return normalizeSingleChunk(pdfText, instrument, defaultLevel)
  }

  // Split into chunks by pages
  const pages = pdfText.split(/--- Pagina \d+ ---/)
  const chunks: string[] = []
  let currentChunk = ''

  for (const page of pages) {
    if ((currentChunk + page).length > MAX_CHARS_PER_CHUNK) {
      if (currentChunk.trim()) chunks.push(currentChunk)
      currentChunk = page
    } else {
      currentChunk += '\n' + page
    }
  }
  if (currentChunk.trim()) chunks.push(currentChunk)

  // Process each chunk
  const allTopics: ImportedTopic[] = []
  for (let i = 0; i < chunks.length; i++) {
    const topics = await normalizeSingleChunk(chunks[i], instrument, defaultLevel)
    allTopics.push(...topics)
  }

  return allTopics
}

async function normalizeSingleChunk(
  pdfText: string,
  instrument: string,
  defaultLevel: string,
): Promise<ImportedTopic[]> {
  const prompt = `Voce e um curador de conteudo pedagogico musical.
Recebeu o texto extraido de um material didatico de musica.

Sua tarefa e normalizar esse conteudo em TOPICOS e BLOCOS estruturados para um sistema de ensino musical.

REGRAS IMPORTANTES:
- Cada TOPICO deve ser uma UNIDADE de aprendizado independente (ex: "Escala Maior", "Intervalos", "Tetrades")
- Cada BLOCO deve ser ATOMICO — uma unica ideia, exercicio ou dica
- PRESERVAR TODO o conteudo pedagogico — nao resumir nem cortar
- Corrigir erros de OCR/extracao se houver
- Manter termos musicais em portugues

TIPOS DE BLOCO:
- "text" — Texto explicativo (conceitos, definicoes, teoria)
- "exercise" — Exercicio pratico (com instrucao clara de o que fazer)
- "tip" — Dica ou alerta pedagogico (insight ou macete)
- "example" — Exemplo musical com contexto (demonstracao pratica de um conceito)

Instrumento padrao: ${instrument}
Nivel padrao: ${defaultLevel}

Para cada topico, INFIRA a dimensao mais adequada:
- "theory" — conteudo teorico (escalas, intervalos, harmonia, formacao de acordes)
- "technique" — exercicios de tecnica instrumental
- "rhythm" — ritmo, compasso, figuras ritmicas
- "repertoire" — musicas, pecas, cancoes
- "auditory" — percepcao auditiva, ditado
- "evaluation" — avaliacao, teste

Responda APENAS com JSON valido, sem markdown, sem explicacoes, sem backticks.
O JSON deve ter esta estrutura EXATA:

{
  "topics": [
    {
      "title": "Nome do Topico",
      "description": "Descricao em 1-2 frases",
      "dimension": "theory",
      "difficulty_level": "${defaultLevel}",
      "tags": ["tag1", "tag2"],
      "estimated_minutes": 15,
      "blocks": [
        {
          "block_type": "text",
          "title": "Titulo do Bloco",
          "content": "Conteudo completo do bloco...",
          "sort_order": 1
        }
      ]
    }
  ]
}

TEXTO DO MATERIAL:
${pdfText}`

  // Call Gemini Flash via aiService
  const result = await generateText(prompt, AI_CONFIG.generation)

  // Parse JSON response
  try {
    // Clean possible markdown backticks
    const cleanJson = result.text
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim()

    const parsed = JSON.parse(cleanJson)

    // Add "selected: true" for UI checkboxes
    return (parsed.topics || []).map((topic: any) => ({
      title: topic.title || 'Sem titulo',
      description: topic.description || '',
      dimension: topic.dimension || 'theory',
      difficulty_level: topic.difficulty_level || 'foundation',
      tags: topic.tags || [],
      estimated_minutes: topic.estimated_minutes || 15,
      selected: true,
      blocks: (topic.blocks || []).map((block: any, idx: number) => ({
        block_type: block.block_type || 'text',
        title: block.title || '',
        content: block.content || '',
        sort_order: block.sort_order || idx + 1,
        selected: true,
      })),
    }))
  } catch (err) {
    console.error('Erro ao parsear resposta da IA:', err)
    console.error('Resposta raw:', result.text?.substring(0, 500))
    throw new Error('A IA retornou um formato invalido. Tente novamente.')
  }
}

// ─── Save to Database ────────────────────────────────────

export async function saveImportedTopics(
  topics: ImportedTopic[],
  sourceDocument: string,
  instrument: string,
  schoolId: string,
): Promise<ImportResult> {
  let topicsCreated = 0
  let blocksCreated = 0

  for (const topic of topics) {
    if (!topic.selected) continue

    // Create topic
    const createdTopic = await createTopicWithCuration({
      title: topic.title,
      description: topic.description,
      instrument,
      dimension: topic.dimension,
      difficulty_level: topic.difficulty_level,
      tags: topic.tags,
      estimated_minutes: topic.estimated_minutes,
      school_id: schoolId,
      source_document: sourceDocument,
    })

    topicsCreated++

    // Create blocks
    for (const block of topic.blocks) {
      if (!block.selected) continue

      // Use type assertion for fields not in generated types
      const blockData = {
        topic_id: createdTopic.id,
        block_type: block.block_type,
        title: block.title || null,
        content: { text: block.content },
        sort_order: block.sort_order,
        curation_status: 'draft',
      } as any

      await createBlock(blockData)
      blocksCreated++
    }
  }

  return { topicsCreated, blocksCreated }
}
