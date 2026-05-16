import { supabase } from '@/lib/supabase'
import {
  buildCuratedMusicSymbolSvg,
  buildSvgElementPrompt,
  convertSvgColorsToCurrentColor,
  extractSvgFromAiText,
  mapElementTypeToImageCategory,
  sanitizeSvg,
  type ElementLibraryAsset,
  type GeneratedElementType,
} from '@/lib/elementPicker'

const GOOGLE_AI_KEY = import.meta.env.VITE_GOOGLE_AI_KEY
const GEMINI_IMAGE_MODEL = 'gemini-3.1-flash-image-preview'
const GEMINI_TEXT_MODEL = 'gemini-2.5-flash'
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent`
const GEMINI_TEXT_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TEXT_MODEL}:generateContent`
const GEMINI_IMAGE_TIMEOUT_MS = 75_000

// ─── Tipos ──────────────────────────────────────────────────────────

export type ImageCategory =
  | 'instrument' | 'anatomy' | 'technique' | 'diagram'
  | 'mascot' | 'notation' | 'scene' | 'cover' | 'character' | 'other'

export type ImageStyle =
  | 'illustration' | 'flat' | 'realistic' | '3d' | 'vector'
  | 'cartoon' | 'watercolor' | 'sketch'

export type ImageFormat = 'png' | 'jpeg' | 'webp' | 'svg'

export interface GenerateImageRequest {
  prompt: string
  category: ImageCategory
  style: ImageStyle
  label: string
  subcategory?: string
  tags?: string[]
  width?: number
  height?: number
  referenceFiles?: File[]  // OPCIONAL — múltiplas imagens de referência
  transparentBackground?: boolean  // Chromakey: gera com fundo verde e remove
  isElement?: boolean
  elementType?: GeneratedElementType
  source?: string
  metadata?: Record<string, unknown>
}

export interface GenerateElementRequest {
  label: string
  prompt: string
  format: 'svg' | 'png'
  elementType: GeneratedElementType
  tags?: string[]
}

export interface ImageLibraryItem {
  id: string
  label: string
  description?: string
  prompt: string
  image_url?: string
  svg_code?: string
  image_format: ImageFormat
  width?: number
  height?: number
  file_size_bytes?: number
  category: ImageCategory
  subcategory?: string
  model_used: string
  style?: string
  tags: string[]
  is_favorite: boolean
  is_element?: boolean
  element_type?: string | null
  source?: string | null
  metadata?: Record<string, unknown> | null
  created_at: string
}

// ─── Categorias para UI ─────────────────────────────────────────────

export const IMAGE_CATEGORIES: { value: ImageCategory; label: string; icon: string; description: string }[] = [
  { value: 'instrument', label: 'Instrumentos', icon: 'Guitar', description: 'Violão, guitarra, piano, bateria, etc.' },
  { value: 'anatomy', label: 'Anatomia Vocal', icon: 'FirstAid', description: 'Laringe, pregas vocais, aparelho fonador' },
  { value: 'technique', label: 'Técnica', icon: 'HandPointing', description: 'Posicionamento de mãos, postura' },
  { value: 'diagram', label: 'Diagramas', icon: 'TreeStructure', description: 'Infográficos, esquemas didáticos' },
  { value: 'mascot', label: 'Mascotes', icon: 'SmileyWink', description: 'Personagens e mascotes musicais' },
  { value: 'notation', label: 'Notação', icon: 'MusicNotesSimple', description: 'Símbolos musicais, claves, figuras' },
  { value: 'scene', label: 'Cenas', icon: 'Image', description: 'Salas de aula, palcos, estúdios' },
  { value: 'cover', label: 'Capas', icon: 'BookOpen', description: 'Capas de material didático' },
  { value: 'character', label: 'Personagens', icon: 'UserCircle', description: 'Gere cenas com personagens usando referência' },
  { value: 'other', label: 'Outros', icon: 'Sparkle', description: 'Outros tipos de imagem' },
]

// ─── Estilos para UI (8 estilos — todos ~$0.045 via Gemini) ─────────

export const IMAGE_STYLES: { value: ImageStyle; label: string; description: string; cost: string }[] = [
  { value: 'realistic', label: 'Realista', description: 'Fotorrealista, como fotografia de estúdio', cost: '~$0.045' },
  { value: 'illustration', label: 'Ilustração', description: 'Ilustração digital detalhada e profissional', cost: '~$0.045' },
  { value: 'cartoon', label: 'Cartoon', description: 'Estilo cartoon/animação infantil (tipo Pixar, Disney)', cost: '~$0.045' },
  { value: 'flat', label: 'Flat Design', description: 'Minimalista, cores sólidas, sem gradientes', cost: '~$0.045' },
  { value: 'vector', label: 'Vetorial', description: 'Estilo vetorial com linhas limpas e cores sólidas', cost: '~$0.045' },
  { value: 'watercolor', label: 'Aquarela', description: 'Pintura em aquarela digital, artístico e suave', cost: '~$0.045' },
  { value: 'sketch', label: 'Esboço', description: 'Desenho a lápis/grafite, estilo rascunho artístico', cost: '~$0.045' },
  { value: '3d', label: '3D', description: 'Renderização 3D com iluminação e materiais realistas', cost: '~$0.045' },
]

// ─── System prompts por categoria ───────────────────────────────────

const SYSTEM_PROMPTS: Record<ImageCategory, string> = {
  instrument: 'Clean illustration of the musical instrument. Show the full instrument in a straight frontal view, vertically centered. Do NOT tilt or rotate the instrument. Accurate proportions and details. White or transparent background. Suitable for music education material.',
  anatomy: 'Professional anatomical illustration for vocal/music education. Medical textbook quality. Clean labels. White background. Educational material suitable for music school students learning about voice production.',
  technique: 'Clear photograph or illustration showing musical technique and hand positioning. Close-up view allowing students to reproduce the position. Studio lighting, neutral background. Instructional quality.',
  diagram: 'Clean educational diagram or infographic for music theory. Clear labels, organized layout, professional design. White background. Suitable for printed didactic material at A4 size.',
  mascot: 'Friendly cartoon mascot character for a music school. Cute, approachable design with big expressive eyes. Bright, cheerful colors. Musical theme. Suitable for children aged 4-12.',
  notation: 'Clean illustration of music notation symbols, clefs, or musical elements. Black on white, high contrast, print-ready. Accurate musical symbols following standard engraving conventions.',
  scene: 'Illustration of a musical scene: classroom, stage, studio, or practice room. Warm, inviting atmosphere with musical instruments and elements. Suitable for educational material cover or section divider.',
  cover: 'You are generating an artistic BACKGROUND IMAGE for a music school workbook cover. STRICT RULES: 1) Do NOT draw any musical notation, notes, clefs, staff lines, sheet music, or music symbols. 2) Do NOT include any text, words, letters, numbers, logos, or typography. 3) Generate ONLY the visual background — the instrument, colors, textures, lighting, and composition. 4) Portrait orientation (3:4 aspect ratio), suitable for A4 print. 5) Leave clean space in the upper third for title overlay. The text and logo will be added separately by the editor.',
  character: 'Consistent character illustration. If a reference image is provided, keep the EXACT same character design, art style, face, hair, clothing, and proportions. Generate a new scene with the character.',
  other: 'High quality image suitable for music education material. Professional, clean, well-composed.',
}

// ─── Style enhancers (adicionados ao prompt baseado no estilo) ──────

const STYLE_ENHANCERS: Record<ImageStyle, string> = {
  realistic: 'Photorealistic quality. Natural lighting with accurate shadows. Realistic textures and materials. Professional studio photography feel. High detail and sharpness. 8K quality.',
  illustration: 'Detailed digital illustration. Rich colors with subtle gradients and professional lighting. Editorial illustration quality. Polished, refined, modern style.',
  cartoon: 'Cartoon animation style similar to Pixar or modern Disney. Rounded shapes, expressive characters, vibrant saturated colors. Big eyes, friendly proportions. Suitable for children. Fun and playful mood.',
  flat: 'Modern flat design illustration. Limited color palette (4-6 solid colors). No shadows, no gradients, no depth effects. Bold geometric shapes, clean lines. Minimalist aesthetic.',
  vector: 'Clean vector illustration style. Solid colors without gradients. Smooth edges, geometric shapes. Flat design with clean outlines. White background. Scalable appearance.',
  watercolor: 'Digital watercolor painting style. Soft, flowing colors that blend naturally. Visible brush strokes and paint texture. Delicate color washes with subtle bleeding edges. Artistic and dreamy atmosphere. Light paper texture visible.',
  sketch: 'Pencil sketch or graphite drawing style. Hand-drawn appearance with visible pencil strokes and hatching. Grayscale or light sepia tones. Artistic shading with crosshatching technique. Clean white paper background. Study or exercise illustration feel.',
  '3d': '3D rendered visualization. Soft realistic lighting with subtle shadows and reflections. Clean PBR materials and textures. Professional product-shot quality rendering. Isometric or slightly angled perspective.',
}

// ─── Prompt enhancer por template ───────────────────────────────────

export function enhancePrompt(
  userPrompt: string,
  category: ImageCategory,
  style: ImageStyle,
): string {
  return [
    userPrompt.trim(),
    STYLE_ENHANCERS[style],
    'Suitable for music education material. High quality output.',
  ].join('. ')
}

// ─── Prompt enhancer via Gemini AI (toggle opcional) ────────────────

export async function enhancePromptWithAI(
  userPrompt: string,
  category: ImageCategory,
  style: ImageStyle,
): Promise<string> {
  if (!GOOGLE_AI_KEY) return enhancePrompt(userPrompt, category, style)

  const styleNames: Record<ImageStyle, string> = {
    realistic: 'fotorrealista (fotografia de estúdio)',
    illustration: 'ilustração digital detalhada',
    cartoon: 'cartoon/animação infantil (estilo Pixar/Disney)',
    flat: 'flat design minimalista',
    vector: 'vetorial (linhas limpas, cores sólidas)',
    watercolor: 'aquarela digital (artístico, suave)',
    sketch: 'esboço a lápis/grafite (rascunho artístico)',
    '3d': 'renderização 3D',
  }

  const categoryNames: Record<ImageCategory, string> = {
    instrument: 'instrumento musical',
    anatomy: 'anatomia vocal/corpo para educação musical',
    technique: 'técnica e posicionamento musical',
    diagram: 'diagrama didático musical',
    mascot: 'mascote/personagem para escola de música infantil',
    notation: 'notação e símbolos musicais',
    scene: 'cena musical (sala de aula, palco, estúdio)',
    cover: 'capa de material didático musical',
    character: 'personagem consistente com referência visual',
    other: 'material didático musical',
  }

  const systemInstruction = `Você é um especialista em prompts para geração de imagem por IA.
Transforme o prompt simples em português em um prompt detalhado em inglês otimizado para o Google Gemini (Nano Banana 2).

Regras:
- Output APENAS o prompt melhorado em inglês, nada mais
- Máximo 150 palavras
- Incluir detalhes de composição, iluminação, estilo, cores
- Adequado para material didático de escola de música
- Não incluir texto na imagem a menos que o usuário peça explicitamente
- Categoria: ${categoryNames[category]}
- Estilo visual: ${styleNames[style]}`

  try {
    const response = await fetch(
      GEMINI_TEXT_API_URL,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GOOGLE_AI_KEY },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents: [{ parts: [{ text: userPrompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 300 },
        }),
      },
    )

    if (!response.ok) throw new Error('Gemini enhancer error')

    const data = await response.json()
    const enhanced = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
    return enhanced || enhancePrompt(userPrompt, category, style)
  } catch {
    return enhancePrompt(userPrompt, category, style)
  }
}

// ─── Placeholders dinâmicos por categoria ───────────────────────────

export const CATEGORY_PLACEHOLDERS: Record<ImageCategory, string> = {
  instrument: 'Ex: Um violão clássico de nylon com corpo em madeira de cedro, visto de frente em ângulo levemente inclinado. Detalhes visíveis: roseta decorada ao redor da boca, cordas de nylon, tarraxas cromadas, braço com trastes bem definidos. Fundo branco limpo, iluminação suave de estúdio que destaca as texturas da madeira. Estilo editorial para material didático de escola de música.',
  anatomy: 'Ex: Vista superior da laringe humana em corte transversal, mostrando as pregas vocais em posição aberta (abdução) durante a respiração. Estruturas visíveis: cartilagem tireóidea (escudo externo), cartilagens aritenóideas, epiglote rebatida, glote aberta e início da traqueia. Legendas em português indicando cada estrutura. Estilo de ilustração de livro didático médico com cores realistas sobre fundo branco.',
  technique: 'Ex: Close-up da mão esquerda de um guitarrista posicionada no braço do violão, formando o acorde de Dó maior (C). Dedos claramente visíveis: indicador na 1ª casa da corda B, médio na 2ª casa da corda D, anelar na 3ª casa da corda A. Ângulo frontal que permite ao aluno reproduzir a posição. Iluminação de estúdio, fundo neutro desfocado.',
  diagram: 'Ex: Infográfico educativo mostrando a família dos instrumentos de percussão organizados em 3 grupos: membranofones (tambor, tímpano, pandeiro), idiofones (triângulo, pratos, xilofone) e cordofones percutidos (piano). Cada instrumento com ícone ilustrado e nome abaixo. Layout organizado em colunas com cores distintas por grupo. Título no topo, estilo clean para impressão em apostila A4.',
  mascot: 'Ex: Um simpático gatinho laranja vestindo uma camiseta azul com uma nota musical estampada, segurando uma guitarra elétrica vermelha e tocando com expressão alegre. Estilo cartoon infantil com traços arredondados, olhos grandes e brilhantes, cores vibrantes e saturadas. Fundo branco ou transparente para usar em materiais diversos. Adequado para crianças de 4 a 10 anos.',
  notation: 'Ex: Pauta musical com clave de Sol mostrando a escala de Dó maior ascendente e descendente (Dó, Ré, Mi, Fá, Sol, Lá, Si, Dó). Cada nota com o nome escrito abaixo da pauta em português. Figuras em semínima (nota preta). Compasso 4/4 indicado no início. Estilo limpo de livro didático, preto sobre branco, sem ornamentos.',
  scene: 'Ex: Uma sala de aula de música infantil alegre e acolhedora, com crianças de diferentes etnias sentadas em semicírculo tocando pequenos instrumentos de percussão (pandeiro, chocalho, triângulo). Professor no centro sorrindo e regendo. Paredes decoradas com notas musicais coloridas e pôsteres de instrumentos. Iluminação natural vinda de janelas grandes. Atmosfera lúdica e educativa.',
  cover: 'Ex: Capa para apostila de violão nível Foundation (iniciante) da escola LA Music. Layout moderno e limpo com um violão acústico elegante ao centro, rodeado por notas musicais sutis em dourado. Paleta de cores: azul escuro como base, detalhes em rosa. Espaço para título no topo e logo da escola na parte inferior. Formato vertical A4, estilo premium e profissional.',
  character: 'Ex: A personagem tocando um piano de cauda preto numa sala de aula colorida, com expressão alegre e concentrada. Notas musicais flutuando ao redor. Mesma roupa e aparência da imagem de referência. Estilo cartoon infantil consistente, cores vibrantes, fundo com elementos musicais decorativos.',
  other: 'Descreva em detalhes a imagem que deseja: o que aparece na cena, cores predominantes, estilo visual (cartoon, realista, vetorial), ângulo de visão, fundo, e para que será usada no material didático. Quanto mais detalhes, melhor o resultado.',
}

export const CATEGORY_LABEL_PLACEHOLDERS: Record<ImageCategory, string> = {
  instrument: 'Ex: Violão Clássico Nylon, Guitarra Stratocaster, Piano de Cauda',
  anatomy: 'Ex: Laringe Vista Superior, Pregas Vocais, Aparelho Fonador Completo',
  technique: 'Ex: Mão Esquerda Acorde C Violão, Postura Correta Pianista',
  diagram: 'Ex: Família dos Instrumentos de Percussão, Ciclo de Quintas',
  mascot: 'Ex: Gato Guitarrista, Urso Baterista, Passarinho Cantor',
  notation: 'Ex: Escala de Dó Maior na Pauta, Figuras Rítmicas, Claves',
  scene: 'Ex: Sala de Aula Musical Infantil, Palco de Recital, Estúdio',
  cover: 'Ex: Capa Apostila Violão Foundation, Capa Módulo Piano Grow',
  character: 'Ex: Anne Tocando Piano, Felipe com Maracas, Duda Cantando',
  other: 'Ex: Nome descritivo da imagem',
}

// ─── Chromakey — Fundo Transparente ─────────────────────────────────

/**
 * Instrução adicionada ao prompt quando "Fundo Transparente" está ativo.
 * Gera com fundo chromakey verde puro para remoção programática.
 */
const TRANSPARENT_BG_INSTRUCTION = `
CRITICAL REQUIREMENT: The subject must be placed on a SOLID, UNIFORM, PURE 
chromakey green background (#00FF00, RGB 0,255,0). The entire background must 
be this exact green color with NO shadows, NO gradients, NO reflections, NO 
floor, NO surface. The subject must be completely isolated with clean edges 
against the pure green. Do NOT add any other elements to the background.`

/**
 * Remove fundo verde (chromakey) de uma imagem usando Canvas API.
 * Retorna PNG com canal alpha (fundo transparente real).
 */
export async function removeGreenScreen(imageBase64: string, mimeType: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')!

      ctx.drawImage(img, 0, 0)

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data // RGBA array

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]

        // Converter para HSV para detecção mais precisa do verde
        const max = Math.max(r, g, b)
        const min = Math.min(r, g, b)
        const delta = max - min

        let h = 0
        const s = max === 0 ? 0 : delta / max
        const v = max / 255

        if (delta !== 0) {
          if (max === r) h = ((g - b) / delta + (g < b ? 6 : 0)) / 6
          else if (max === g) h = ((b - r) / delta + 2) / 6
          else h = ((r - g) / delta + 4) / 6
        }

        const hDeg = h * 360

        // Detectar verde: Hue entre 80-160°, Saturation > 25%, Value > 15%
        const isGreen = hDeg >= 80 && hDeg <= 160 && s > 0.25 && v > 0.15

        if (isGreen) {
          data[i + 3] = 0
        }

        // Pixels de borda (semi-verdes) — edges mais suaves
        const isEdgeGreen = hDeg >= 70 && hDeg <= 170 && s > 0.15 && v > 0.10
        if (isEdgeGreen && !isGreen) {
          const greenness = Math.min(1, s * (1 - Math.abs(hDeg - 120) / 50))
          data[i + 3] = Math.round(255 * (1 - greenness * 0.8))
        }
      }

      ctx.putImageData(imageData, 0, 0)

      canvas.toBlob((blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Falha ao criar PNG transparente'))
      }, 'image/png')
    }

    img.onerror = () => reject(new Error('Falha ao carregar imagem para chromakey'))
    img.src = `data:${mimeType};base64,${imageBase64}`
  })
}

// ─── Geração via Gemini direto ──────────────────────────────────────

/**
 * Converter File para base64
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Gerar imagem via Google Gemini API (Nano Banana 2)
 * Funciona com ou sem imagem de referência
 */
async function generateImageWithGemini(
  prompt: string,
  referenceFiles?: File[],
): Promise<{ imageBase64: string; mimeType: string; description?: string }> {
  if (!GOOGLE_AI_KEY) {
    throw new Error('VITE_GOOGLE_AI_KEY não configurada')
  }

  // Montar parts
  const parts: Array<Record<string, unknown>> = []
  parts.push({ text: prompt })

  // Múltiplas imagens de referência (opcional)
  if (referenceFiles && referenceFiles.length > 0) {
    for (const file of referenceFiles) {
      const base64 = await fileToBase64(file)
      parts.push({
        inline_data: {
          mime_type: file.type || 'image/png',
          data: base64,
        }
      })
    }
  }

  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), GEMINI_IMAGE_TIMEOUT_MS)
  let response: Response

  try {
    // Chamar API (síncrono — sem polling)
    response = await fetch(`${GEMINI_API_URL}?key=${GOOGLE_AI_KEY}`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          responseModalities: ['IMAGE'],
          imageConfig: {
            aspectRatio: '3:4',
            imageSize: '1K',
          },
        }
      })
    })
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error('Gemini demorou mais de 75 segundos para gerar a imagem. Tente novamente com uma direção visual mais simples ou sem referências.')
    }
    throw error
  } finally {
    window.clearTimeout(timeoutId)
  }

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Gemini API error (${response.status}): ${errorText.substring(0, 200)}`)
  }

  const data = await response.json()

  if (!data.candidates || !data.candidates[0]?.content?.parts) {
    throw new Error('Gemini API: resposta sem conteúdo')
  }

  let imageBase64 = ''
  let mimeType = 'image/png'
  let description = ''

  for (const part of data.candidates[0].content.parts) {
    if (part.text) {
      description = part.text
    } else if (part.inlineData) {
      imageBase64 = part.inlineData.data
      mimeType = part.inlineData.mimeType || 'image/png'
    }
  }

  if (!imageBase64) {
    throw new Error('Gemini API: nenhuma imagem na resposta. Tente reformular o prompt.')
  }

  return { imageBase64, mimeType, description }
}

/**
 * Salvar imagem base64 no Supabase Storage
 */
async function saveBase64ToStorage(
  base64Data: string,
  mimeType: string,
  schoolId: string,
): Promise<{ publicUrl: string; fileSize: number }> {
  const byteCharacters = atob(base64Data)
  const byteNumbers = new Array(byteCharacters.length)
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  }
  const byteArray = new Uint8Array(byteNumbers)
  const blob = new Blob([byteArray], { type: mimeType })

  const ext = mimeType.includes('png') ? 'png' : 'jpeg'
  const timestamp = Date.now()
  const fileName = `ai-generated/${schoolId}/${timestamp}.${ext}`

  const { error } = await supabase.storage
    .from('content-images')
    .upload(fileName, blob, { contentType: mimeType, upsert: false })

  if (error) throw new Error(`Storage upload failed: ${error.message}`)

  const { data: urlData } = supabase.storage
    .from('content-images')
    .getPublicUrl(fileName)

  return { publicUrl: urlData.publicUrl, fileSize: blob.size }
}

async function saveSvgToStorage(
  svgCode: string,
  schoolId: string,
): Promise<{ publicUrl: string; fileSize: number }> {
  const blob = new Blob([svgCode], { type: 'image/svg+xml' })
  const fileName = `elements/${schoolId}/${crypto.randomUUID()}.svg`

  const { error } = await supabase.storage
    .from('content-images')
    .upload(fileName, blob, { contentType: 'image/svg+xml', upsert: false })

  if (error) throw new Error(`Storage upload failed: ${error.message}`)

  const { data: urlData } = supabase.storage
    .from('content-images')
    .getPublicUrl(fileName)

  return { publicUrl: urlData.publicUrl, fileSize: blob.size }
}

async function generateSvgCodeWithGemini(prompt: string): Promise<string> {
  if (!GOOGLE_AI_KEY) {
    throw new Error('VITE_GOOGLE_AI_KEY nao configurada')
  }

  const response = await fetch(
    `${GEMINI_TEXT_API_URL}?key=${GOOGLE_AI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2048,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    },
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Gemini SVG error (${response.status}): ${errorText.substring(0, 200)}`)
  }

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || '').join('\n') ?? ''
  const finishReason = data.candidates?.[0]?.finishReason
  if (finishReason === 'MAX_TOKENS') {
    throw new Error('Gemini gerou um SVG incompleto. Tente uma descricao mais simples ou gere novamente.')
  }

  const rawSvg = extractSvgFromAiText(text)
  if (!rawSvg) {
    throw new Error('Gemini nao retornou SVG valido.')
  }

  const sanitized = sanitizeSvg(rawSvg)
  if (!sanitized) {
    throw new Error('SVG gerado foi rejeitado pela sanitizacao.')
  }

  return convertSvgColorsToCurrentColor(sanitized)
}

/**
 * Salvar registro na tabela image_library
 */
async function saveImageRecord(
  schoolId: string,
  request: GenerateImageRequest,
  imageUrl: string,
  format: ImageFormat,
  fileSize?: number,
): Promise<ImageLibraryItem> {
  const { data, error } = await supabase
    .from('image_library' as any)
    .insert({
      school_id: schoolId,
      label: request.label,
      prompt: request.prompt,
      system_prompt: SYSTEM_PROMPTS[request.category],
      image_url: imageUrl,
      svg_code: null,
      image_format: format,
      width: request.width || 1024,
      height: request.height || 1024,
      file_size_bytes: fileSize,
      category: request.category,
      subcategory: request.subcategory || null,
      model_used: 'gemini-nano-banana-2',
      style: request.style,
      tags: request.tags || [],
      is_element: request.isElement ?? false,
      element_type: request.elementType ?? null,
      source: request.source ?? 'ai',
      metadata: request.metadata ?? {},
    })
    .select()
    .single()

  if (error) throw new Error(`Save failed: ${error.message}`)
  return data as unknown as ImageLibraryItem
}

// ─── Pipeline principal ─────────────────────────────────────────────

/**
 * Pipeline completo: Gemini gera → salva no Storage → registra no banco
 * Referência é OPCIONAL — funciona com ou sem
 */
export async function generateAndSaveImage(
  schoolId: string,
  request: GenerateImageRequest,
  onProgress?: (status: string) => void,
): Promise<ImageLibraryItem> {
  const systemPrompt = SYSTEM_PROMPTS[request.category] || SYSTEM_PROMPTS.other
  const styleEnhancer = STYLE_ENHANCERS[request.style] || ''

  let fullPrompt = `${systemPrompt}\n\n${request.prompt}\n\n${styleEnhancer}`

  const hasRefs = request.referenceFiles && request.referenceFiles.length > 0
  if (hasRefs) {
    fullPrompt += '\n\nIMPORTANT: Keep the exact same character design, art style, face, hair, clothing, and proportions from the reference image(s).'
  }

  // Se fundo transparente, adicionar instrução de chromakey
  if (request.transparentBackground) {
    fullPrompt += TRANSPARENT_BG_INSTRUCTION
  }

  fullPrompt += '\n\nGenerate only the image, no text explanation needed.'

  // 1. Gerar via Gemini
  onProgress?.('Gerando imagem via Gemini (Nano Banana 2)...')
  const result = await generateImageWithGemini(fullPrompt, hasRefs ? request.referenceFiles : undefined)

  // 2. Se fundo transparente, fazer chromakey removal
  let finalBase64 = result.imageBase64
  let finalMimeType = result.mimeType

  if (request.transparentBackground) {
    onProgress?.('Removendo fundo (chromakey)...')
    const transparentBlob = await removeGreenScreen(result.imageBase64, result.mimeType)
    const arrayBuffer = await transparentBlob.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    finalBase64 = btoa(binary)
    finalMimeType = 'image/png'
  }

  // 3. Salvar no Storage
  onProgress?.('Salvando no servidor...')
  const storage = await saveBase64ToStorage(finalBase64, finalMimeType, schoolId)

  // 4. Registrar no banco
  onProgress?.('Registrando na biblioteca...')
  const format: ImageFormat = finalMimeType.includes('png') ? 'png' : 'jpeg'
  const record = await saveImageRecord(schoolId, request, storage.publicUrl, format, storage.fileSize)

  return record
}

// ─── Geração de capa (sem salvar no banco) ──────────────────────────

/**
 * Gera imagem de capa via Gemini com system prompt + style enhancer.
 * Aceita imagens de referência opcionais — a IA copia o estilo visual.
 * Retorna base64 bruto — o Editor.tsx faz upload próprio no Storage.
 */
export async function generateAndSaveElement(
  schoolId: string,
  request: GenerateElementRequest,
  onProgress?: (status: string) => void,
): Promise<ElementLibraryAsset> {
  const category = mapElementTypeToImageCategory(request.elementType) as ImageCategory
  const tags = request.tags ?? []

  if (request.format === 'png') {
    const image = await generateAndSaveImage(
      schoolId,
      {
        prompt: request.prompt,
        category,
        style: 'vector',
        label: request.label,
        tags: [...tags, 'elemento', 'fundo-transparente'],
        width: 512,
        height: 512,
        transparentBackground: true,
        isElement: true,
        elementType: request.elementType,
        source: 'ai-png',
        metadata: { generated_element_format: 'png' },
      },
      onProgress,
    )

    return {
      id: image.id,
      image_url: image.image_url ?? null,
      svg_code: image.svg_code ?? null,
      label: image.label,
      category: image.category ?? null,
      image_format: image.image_format ?? null,
      element_type: image.element_type ?? request.elementType,
      tags: image.tags ?? [],
    }
  }

  const svgPrompt = buildSvgElementPrompt({
    label: request.label,
    description: request.prompt,
    elementType: request.elementType,
  })

  const curatedSvg = buildCuratedMusicSymbolSvg({
    label: request.label,
    description: request.prompt,
    elementType: request.elementType,
  })

  onProgress?.(curatedSvg ? 'Preparando simbolo musical...' : 'Gerando SVG com Gemini...')
  const svgCode = curatedSvg ?? await generateSvgCodeWithGemini(svgPrompt)
  const source = curatedSvg ? 'curated-svg' : 'ai-svg'

  onProgress?.('Salvando SVG sanitizado...')
  const storage = await saveSvgToStorage(svgCode, schoolId)

  onProgress?.('Registrando elemento...')
  const { data, error } = await supabase
    .from('image_library' as any)
    .insert({
      school_id: schoolId,
      label: request.label,
      prompt: request.prompt,
      system_prompt: svgPrompt,
      image_url: storage.publicUrl,
      svg_code: svgCode,
      image_format: 'svg',
      width: 100,
      height: 100,
      file_size_bytes: storage.fileSize,
      category,
      model_used: GEMINI_TEXT_MODEL,
      style: 'vector',
      tags,
      is_element: true,
      element_type: request.elementType,
      source,
      metadata: { generated_element_format: 'svg', curated: Boolean(curatedSvg) },
    })
    .select('id, image_url, svg_code, label, category, image_format, element_type, tags')
    .single()

  if (error) throw new Error(`Save failed: ${error.message}`)
  return data as unknown as ElementLibraryAsset
}

export async function generateCoverImageRaw(
  prompt: string,
  style: ImageStyle = 'illustration',
  referenceFiles?: File[],
): Promise<{ imageBase64: string; mimeType: string }> {
  const systemPrompt = SYSTEM_PROMPTS.cover
  const styleEnhancer = STYLE_ENHANCERS[style] || ''

  const hasRefs = referenceFiles && referenceFiles.length > 0

  const parts = [
    systemPrompt,
    `MANDATORY VISUAL STYLE: ${styleEnhancer}`,
    prompt,
  ]

  if (hasRefs) {
    parts.push(
      'IMPORTANT: Follow the visual style, color palette, composition, and design aesthetic from the reference image(s). ' +
      'Do NOT include any text, titles, logos, or typography in the generated image — only the artistic background/design elements. The text will be added separately.'
    )
  }

  parts.push(
    'CRITICAL: Do NOT include any text, words, letters, numbers, or typography in the image. Generate ONLY the visual/artistic background.',
    'Portrait orientation (3:4 aspect ratio). Clean composition suitable for A4 portrait format.',
    'Generate only the image, no text explanation needed.',
  )

  const fullPrompt = parts.join('\n\n')

  const result = await generateImageWithGemini(fullPrompt, hasRefs ? referenceFiles : undefined)
  return { imageBase64: result.imageBase64, mimeType: result.mimeType }
}

// ─── Consultas ──────────────────────────────────────────────────────

export async function fetchImageLibrary(
  schoolId: string,
  filters?: {
    category?: ImageCategory
    style?: ImageStyle
    search?: string
    favorites?: boolean
  },
): Promise<ImageLibraryItem[]> {
  let query = supabase
    .from('image_library' as any)
    .select('*')
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false })

  if (filters?.category) query = query.eq('category', filters.category)
  if (filters?.style) query = query.eq('style', filters.style)
  if (filters?.favorites) query = query.eq('is_favorite', true)
  if (filters?.search) query = query.ilike('label', `%${filters.search}%`)

  const { data, error } = await query
  if (error) throw error
  return (data || []) as unknown as ImageLibraryItem[]
}

export async function toggleFavorite(id: string, isFavorite: boolean): Promise<void> {
  const { error } = await supabase
    .from('image_library' as any)
    .update({ is_favorite: isFavorite })
    .eq('id', id)
  if (error) throw error
}

export async function deleteImage(id: string, imageUrl?: string): Promise<void> {
  if (imageUrl && imageUrl.includes('content-images')) {
    const path = imageUrl.split('content-images/')[1]
    if (path) await supabase.storage.from('content-images').remove([path])
  }
  const { error } = await supabase.from('image_library' as any).delete().eq('id', id)
  if (error) throw error
}
