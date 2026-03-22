import * as pdfjsLib from 'pdfjs-dist'
import { AI_CONFIG } from '@/lib/ai-config'
import { createTopicWithCuration, createBlock } from '@/services/contentService'
import { supabase } from '@/lib/supabase'
import { aiChordToSvguitar, aiChordChartToSvguitar, validateAiChordData, type AiChordData, type AiChordChartData } from '@/lib/aiChordToSvguitar'

// Configure PDF.js worker - version 4.4.168
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs'

// ─── Types ───────────────────────────────────────────────

export type VisualBlockType =
  | 'text'
  | 'exercise'
  | 'tip'
  | 'example'
  | 'chord_diagram'
  | 'notation'
  | 'chord_chart'
  | 'image'

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
  block_type: VisualBlockType
  title: string
  content: string
  sort_order: number
  selected: boolean
  // Visual block specific data
  svguitar_data?: ReturnType<typeof aiChordToSvguitar>
  chord_chart_data?: ReturnType<typeof aiChordChartToSvguitar>
  alphatex?: string
  image_url?: string
  bounding_box?: { x: number; y: number; width: number; height: number }
  page_number?: number
}

export interface PdfExtractionResult {
  text: string
  pageCount: number
}

export interface ImportResult {
  topicsCreated: number
  blocksCreated: number
}

export interface PageImage {
  pageNumber: number
  dataUrl: string
  base64: string
  width: number
  height: number
}

export interface AiBlockResult {
  block_type: VisualBlockType
  title: string
  content: string
  // For chord_diagram
  chord_data?: AiChordData
  // For chord_chart
  chord_chart_data?: AiChordChartData
  // For notation
  alphatex?: string
  // For image blocks
  bounding_box?: { x: number; y: number; width: number; height: number }
}

export interface AiPageResult {
  page_title?: string
  blocks: AiBlockResult[]
}

// ─── Progress Callback ───────────────────────────────────

export type ProgressCallback = (status: string, progress: number, pageInfo?: { current: number; total: number }) => void

// ─── PDF to Images ───────────────────────────────────────

export async function convertPdfToImages(
  file: File,
  onProgress?: ProgressCallback,
): Promise<PageImage[]> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const images: PageImage[] = []

  for (let i = 1; i <= pdf.numPages; i++) {
    onProgress?.(`Convertendo pagina ${i}/${pdf.numPages}...`, (i / pdf.numPages) * 30, { current: i, total: pdf.numPages })

    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale: 2.0 }) // 2x scale for better quality

    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext('2d')!

    await page.render({ canvasContext: ctx, viewport }).promise

    const dataUrl = canvas.toDataURL('image/png')
    const base64 = dataUrl.replace(/^data:image\/png;base64,/, '')

    images.push({
      pageNumber: i,
      dataUrl,
      base64,
      width: viewport.width,
      height: viewport.height,
    })

    // Cleanup
    canvas.width = 0
    canvas.height = 0
  }

  return images
}

// ─── Vision AI Analysis ──────────────────────────────────

const VISION_PROMPT = `Você é um curador de conteúdo pedagógico musical.
Analise esta página de material didático e extraia TODO o conteúdo estruturado.

IMPORTANTE: Identifique TODOS os elementos visuais da página:
- Diagramas de acordes (desenhos de braço de violão/guitarra com pontos)
- Notação musical (pautas com notas)
- Imagens/ilustrações
- Textos explicativos
- Exercícios
- Dicas

Para cada elemento, retorne no formato JSON:

{
  "page_title": "Título da página se houver",
  "blocks": [
    {
      "block_type": "text|exercise|tip|example|chord_diagram|notation|chord_chart|image",
      "title": "Título do bloco",
      "content": "Texto completo do conteúdo",

      // APENAS para chord_diagram:
      "chord_data": {
        "chord_name": "Am",
        "position": 1,
        "fingers": [[2, 1], [3, 2], [4, 2]],
        "barres": [],
        "muted": [6]
      },

      // APENAS para chord_chart (progressão/sequência):
      "chord_chart_data": {
        "title": "Progressão I-IV-V",
        "chords": [
          { "chord_name": "C", "position": 1, "fingers": [...], ... },
          { "chord_name": "F", "position": 1, "fingers": [...], ... }
        ]
      },

      // APENAS para notation (pauta musical):
      "alphatex": "\\\\title \\"Escala Maior\\" . :4 c d e f | g a b c'",

      // APENAS para image (ilustração que precisa ser recortada):
      "bounding_box": { "x": 100, "y": 200, "width": 300, "height": 150 }
    }
  ]
}

REGRAS:
1. Preserve TODO o conteúdo textual — não resuma
2. Para diagramas de acorde, extraia a posição exata dos dedos
3. Para notação musical, converta para AlphaTex se possível
4. Para imagens, forneça bounding_box aproximado em pixels
5. Cordas no chord_data: 1=E grave (mais grossa), 6=E agudo (mais fina)
6. Casas no chord_data: 0=aberta, 1-12=casas do braço

Responda APENAS com JSON válido, sem markdown, sem backticks, sem explicações.`

async function analyzeWithGemini(imageBase64: string): Promise<AiPageResult> {
  const model = AI_CONFIG.generation.model // gemini-3-flash-preview
  const apiKey = AI_CONFIG.generation.apiKey

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { inlineData: { mimeType: 'image/png', data: imageBase64 } },
          { text: VISION_PROMPT },
        ],
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 8192,
      },
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Gemini Vision ${response.status}: ${err}`)
  }

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

  return parseAiResponse(text)
}

async function analyzeWithAnthropic(imageBase64: string): Promise<AiPageResult> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
  const model = 'claude-sonnet-4-20250514'

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: 8192,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/png', data: imageBase64 } },
          { type: 'text', text: VISION_PROMPT },
        ],
      }],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Anthropic Vision ${response.status}: ${err}`)
  }

  const data = await response.json()
  const text = data.content?.[0]?.text || ''

  return parseAiResponse(text)
}

function parseAiResponse(text: string): AiPageResult {
  try {
    // Clean possible markdown backticks
    const cleanJson = text
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim()

    const parsed = JSON.parse(cleanJson)

    return {
      page_title: parsed.page_title || '',
      blocks: (parsed.blocks || []).map((block: any) => ({
        block_type: block.block_type || 'text',
        title: block.title || '',
        content: block.content || '',
        chord_data: block.chord_data,
        chord_chart_data: block.chord_chart_data,
        alphatex: block.alphatex,
        bounding_box: block.bounding_box,
      })),
    }
  } catch (err) {
    console.error('Erro ao parsear resposta da IA:', err)
    console.error('Resposta raw:', text?.substring(0, 500))
    return { page_title: '', blocks: [] }
  }
}

export async function analyzePageWithVision(imageBase64: string): Promise<AiPageResult> {
  // 1. Tentar Gemini (mais barato)
  try {
    return await analyzeWithGemini(imageBase64)
  } catch (err) {
    console.warn('Gemini falhou, tentando Anthropic:', err)
  }

  // 2. Fallback Anthropic (mais caro mas confiável)
  try {
    return await analyzeWithAnthropic(imageBase64)
  } catch (err) {
    console.error('Anthropic também falhou:', err)
    return { page_title: '', blocks: [] }
  }
}

// ─── Image Cropping & Upload ─────────────────────────────

export async function cropImageFromPage(
  pageImage: PageImage,
  boundingBox: { x: number; y: number; width: number; height: number },
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = boundingBox.width
      canvas.height = boundingBox.height
      const ctx = canvas.getContext('2d')!

      ctx.drawImage(
        img,
        boundingBox.x,
        boundingBox.y,
        boundingBox.width,
        boundingBox.height,
        0,
        0,
        boundingBox.width,
        boundingBox.height,
      )

      const dataUrl = canvas.toDataURL('image/png')
      const base64 = dataUrl.replace(/^data:image\/png;base64,/, '')

      // Cleanup
      canvas.width = 0
      canvas.height = 0

      resolve(base64)
    }
    img.onerror = () => reject(new Error('Falha ao carregar imagem para recorte'))
    img.src = pageImage.dataUrl
  })
}

export async function uploadCroppedImage(
  base64: string,
  filename: string,
): Promise<string> {
  // Convert base64 to Blob
  const byteCharacters = atob(base64)
  const byteNumbers = new Array(byteCharacters.length)
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  }
  const byteArray = new Uint8Array(byteNumbers)
  const blob = new Blob([byteArray], { type: 'image/png' })

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from('content-images')
    .upload(filename, blob, {
      contentType: 'image/png',
      upsert: false,
    })

  if (error) {
    throw new Error(`Falha no upload: ${error.message}`)
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('content-images')
    .getPublicUrl(data.path)

  return urlData.publicUrl
}

// ─── Process AI Block ────────────────────────────────────

async function processAiBlock(
  aiBlock: AiBlockResult,
  pageImage: PageImage,
  sortOrder: number,
): Promise<ImportedBlock> {
  const block: ImportedBlock = {
    block_type: aiBlock.block_type,
    title: aiBlock.title,
    content: aiBlock.content,
    sort_order: sortOrder,
    selected: true,
    page_number: pageImage.pageNumber,
  }

  // Process chord_diagram
  if (aiBlock.block_type === 'chord_diagram' && aiBlock.chord_data) {
    if (validateAiChordData(aiBlock.chord_data)) {
      block.svguitar_data = aiChordToSvguitar(aiBlock.chord_data)
    }
  }

  // Process chord_chart
  if (aiBlock.block_type === 'chord_chart' && aiBlock.chord_chart_data) {
    block.chord_chart_data = aiChordChartToSvguitar(aiBlock.chord_chart_data)
  }

  // Process notation
  if (aiBlock.block_type === 'notation' && aiBlock.alphatex) {
    block.alphatex = aiBlock.alphatex
  }

  // Process image - crop and upload
  if (aiBlock.block_type === 'image' && aiBlock.bounding_box) {
    try {
      block.bounding_box = aiBlock.bounding_box
      const croppedBase64 = await cropImageFromPage(pageImage, aiBlock.bounding_box)
      const filename = `pdf-import/${Date.now()}-page${pageImage.pageNumber}-${sortOrder}.png`
      block.image_url = await uploadCroppedImage(croppedBase64, filename)
    } catch (err) {
      console.error('Falha ao processar imagem:', err)
      // Keep the bounding box for manual processing later
    }
  }

  return block
}

// ─── Main Vision Import ──────────────────────────────────

export async function importPdfWithVision(
  file: File,
  instrument: string,
  defaultLevel: string,
  onProgress?: ProgressCallback,
): Promise<ImportedTopic[]> {
  // Step 1: Convert PDF to images
  onProgress?.('Convertendo PDF para imagens...', 5)
  const pageImages = await convertPdfToImages(file, onProgress)

  if (pageImages.length === 0) {
    throw new Error('Não foi possível extrair páginas do PDF')
  }

  // Step 2: Analyze each page with Vision AI
  const allBlocks: ImportedBlock[] = []
  let globalSortOrder = 1

  for (let i = 0; i < pageImages.length; i++) {
    const pageImage = pageImages[i]
    const progressBase = 30 + ((i / pageImages.length) * 60)

    onProgress?.(
      `Analisando pagina ${i + 1}/${pageImages.length} com IA...`,
      progressBase,
      { current: i + 1, total: pageImages.length },
    )

    const pageResult = await analyzePageWithVision(pageImage.base64)

    // Process each block from the page
    for (const aiBlock of pageResult.blocks) {
      const processedBlock = await processAiBlock(aiBlock, pageImage, globalSortOrder++)
      allBlocks.push(processedBlock)
    }
  }

  if (allBlocks.length === 0) {
    throw new Error('A IA não conseguiu extrair conteúdo do PDF')
  }

  // Step 3: Group blocks into topics
  onProgress?.('Organizando conteúdo...', 95)

  // Simple grouping: one topic per document
  const topic: ImportedTopic = {
    title: file.name.replace('.pdf', ''),
    description: `Importado de ${file.name} com ${pageImages.length} páginas`,
    dimension: 'theory',
    difficulty_level: defaultLevel as any,
    tags: [instrument],
    estimated_minutes: pageImages.length * 5,
    selected: true,
    blocks: allBlocks,
  }

  onProgress?.('Concluído!', 100)

  return [topic]
}

// ─── Legacy Text Extraction (for fallback) ───────────────

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

// ─── Legacy AI Normalization (for fallback) ──────────────

const MAX_CHARS_PER_CHUNK = 80000

export async function normalizeWithAI(
  pdfText: string,
  instrument: string,
  defaultLevel: string,
  _sourceDocument: string,
): Promise<ImportedTopic[]> {
  if (pdfText.length <= MAX_CHARS_PER_CHUNK) {
    return normalizeSingleChunk(pdfText, instrument, defaultLevel)
  }

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
  const { generateText } = await import('@/services/aiService')

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

  const result = await generateText(prompt, AI_CONFIG.generation)

  try {
    const cleanJson = result.text
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim()

    const parsed = JSON.parse(cleanJson)

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

    for (const block of topic.blocks) {
      if (!block.selected) continue

      // Build content object based on block type
      const content = buildBlockContent(block)

      const blockData = {
        topic_id: createdTopic.id,
        block_type: block.block_type,
        title: block.title || null,
        content,
        sort_order: block.sort_order,
        curation_status: 'draft',
      } as any

      await createBlock(blockData)
      blocksCreated++
    }
  }

  return { topicsCreated, blocksCreated }
}

function buildBlockContent(block: ImportedBlock): Record<string, any> {
  switch (block.block_type) {
    case 'chord_diagram':
      return {
        text: block.content,
        svguitar_data: block.svguitar_data,
      }

    case 'chord_chart':
      return {
        text: block.content,
        chords: block.chord_chart_data,
      }

    case 'notation':
      return {
        text: block.content,
        alphatex: block.alphatex,
      }

    case 'image':
      return {
        text: block.content,
        image_url: block.image_url,
        bounding_box: block.bounding_box,
      }

    default:
      return {
        text: block.content,
      }
  }
}
