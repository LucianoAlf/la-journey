import { supabase } from '@/lib/supabase'

const FAL_AI_KEY = import.meta.env.VITE_FAL_AI_KEY
const FAL_BASE_URL = 'https://queue.fal.run'

// ─── Tipos ──────────────────────────────────────────────────────────

export type ImageCategory =
  | 'instrument' | 'anatomy' | 'technique' | 'diagram'
  | 'mascot' | 'notation' | 'scene' | 'cover' | 'other'

export type ImageStyle = 'vector' | 'realistic' | 'illustration' | 'flat' | '3d'
export type ImageFormat = 'png' | 'svg' | 'webp' | 'jpeg'

export type FalModel = 'recraft-v3' | 'nano-banana-pro' | 'flux-2-pro'

export interface GenerateImageRequest {
  prompt: string
  category: ImageCategory
  style: ImageStyle
  label: string
  subcategory?: string
  tags?: string[]
  width?: number
  height?: number
}

export interface ImageLibraryItem {
  id: string
  label: string
  description?: string
  prompt: string
  system_prompt?: string
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
  created_at: string
}

// ─── Mapeamento de modelos por estilo ───────────────────────────────

const MODEL_CONFIG: Record<ImageStyle, {
  model: FalModel
  endpoint: string
  falStyle?: string
}> = {
  vector: {
    model: 'recraft-v3',
    endpoint: '/fal-ai/recraft/v3/text-to-image',
    falStyle: 'vector_illustration',
  },
  flat: {
    model: 'recraft-v3',
    endpoint: '/fal-ai/recraft/v3/text-to-image',
    falStyle: 'digital_illustration',
  },
  illustration: {
    model: 'recraft-v3',
    endpoint: '/fal-ai/recraft/v3/text-to-image',
    falStyle: 'digital_illustration',
  },
  realistic: {
    model: 'nano-banana-pro',
    endpoint: '/fal-ai/nano-banana-pro',
    falStyle: undefined,
  },
  '3d': {
    model: 'nano-banana-pro',
    endpoint: '/fal-ai/nano-banana-pro',
    falStyle: undefined,
  },
}

// ─── System prompts por categoria ───────────────────────────────────

const SYSTEM_PROMPTS: Record<ImageCategory, string> = {
  instrument: 'Clean illustration of the musical instrument. Minimalist style, solid colors. White or transparent background. Suitable for music education material. Show the full instrument clearly.',
  anatomy: 'Professional anatomical illustration for vocal/music education. Medical textbook quality. Clean labels. White background. Educational material suitable for music school students.',
  technique: 'Clear photograph or illustration showing musical technique and hand positioning. Close-up view allowing students to reproduce the position. Studio lighting, neutral background.',
  diagram: 'Clean educational diagram or infographic for music theory. Clear labels, organized layout, professional design. White background. Suitable for printed didactic material.',
  mascot: 'Friendly cartoon mascot character for a music school. Cute, approachable design. Bright colors. Suitable for children and young students. Musical theme.',
  notation: 'Clean illustration of music notation symbols, clefs, or musical elements. Black on white, suitable for educational material about music theory.',
  scene: 'Illustration of a musical scene: classroom, stage, studio, or practice room. Warm, inviting atmosphere. Suitable for educational material cover or section divider.',
  cover: 'Professional cover design for music education material. Modern, clean layout. Musical elements integrated elegantly. Suitable for print at A4 size.',
  other: 'High quality image suitable for music education material.',
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
  { value: 'other', label: 'Outros', icon: 'Sparkle', description: 'Outros tipos de imagem' },
]

export const IMAGE_STYLES: { value: ImageStyle; label: string; description: string; cost: string }[] = [
  { value: 'vector', label: 'Vetorial (SVG)', description: 'Ilustração vetorial escalável', cost: '~$0.08' },
  { value: 'flat', label: 'Flat Design', description: 'Ilustração digital flat/minimalista', cost: '~$0.04' },
  { value: 'illustration', label: 'Ilustração', description: 'Ilustração digital detalhada', cost: '~$0.04' },
  { value: 'realistic', label: 'Realista', description: 'Imagem fotorrealista', cost: '~$0.15' },
  { value: '3d', label: '3D', description: 'Renderização 3D', cost: '~$0.15' },
]

// ─── Funções principais ─────────────────────────────────────────────

/**
 * Gerar imagem via fal.ai
 * Retorna a URL temporária da imagem (fal.media)
 */
export async function generateImage(request: GenerateImageRequest): Promise<{
  tempUrl: string
  format: ImageFormat
  model: FalModel
  fileSize?: number
  contentType?: string
}> {
  const config = MODEL_CONFIG[request.style]
  const systemPrompt = SYSTEM_PROMPTS[request.category]
  const fullPrompt = `${systemPrompt}\n\n${request.prompt}`

  // 1. Submeter para fila
  const submitResponse = await fetch(`${FAL_BASE_URL}${config.endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_AI_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: fullPrompt,
      ...(config.falStyle ? { style: config.falStyle } : {}),
      image_size: {
        width: request.width || 1024,
        height: request.height || 1024,
      },
    }),
  })

  if (!submitResponse.ok) {
    const error = await submitResponse.text()
    throw new Error(`fal.ai error: ${error}`)
  }

  const submitData = await submitResponse.json()

  // 2. Se já tiver resultado direto
  if (submitData.images) {
    const img = submitData.images[0]
    return {
      tempUrl: img.url,
      format: img.content_type?.includes('svg') ? 'svg' : 'png',
      model: config.model,
      fileSize: img.file_size,
      contentType: img.content_type,
    }
  }

  // 3. Se entrou na fila, fazer polling
  const responseUrl = submitData.response_url
  const maxAttempts = 30  // 30 * 2s = 60s timeout

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, 2000))

    const pollResponse = await fetch(responseUrl, {
      headers: { 'Authorization': `Key ${FAL_AI_KEY}` },
    })

    const pollData = await pollResponse.json()

    if (pollData.images) {
      const img = pollData.images[0]
      return {
        tempUrl: img.url,
        format: img.content_type?.includes('svg') ? 'svg' : 'png',
        model: config.model,
        fileSize: img.file_size,
        contentType: img.content_type,
      }
    }

    // Se der erro
    if (pollData.error) {
      throw new Error(`fal.ai generation failed: ${pollData.error}`)
    }
  }

  throw new Error('Image generation timeout (60s)')
}

/**
 * Baixar imagem da URL temporária e salvar no Supabase Storage
 */
export async function saveImageToStorage(
  tempUrl: string,
  schoolId: string,
  format: ImageFormat,
): Promise<{ storagePath: string; publicUrl: string; fileSize: number }> {
  // Baixar imagem
  const response = await fetch(tempUrl)
  const blob = await response.blob()

  const ext = format === 'svg' ? 'svg' : 'png'
  const timestamp = Date.now()
  const fileName = `ai-generated/${schoolId}/${timestamp}.${ext}`

  const { error } = await supabase.storage
    .from('content-images')
    .upload(fileName, blob, {
      contentType: format === 'svg' ? 'image/svg+xml' : 'image/png',
      upsert: false,
    })

  if (error) throw new Error(`Storage upload failed: ${error.message}`)

  const { data: urlData } = supabase.storage
    .from('content-images')
    .getPublicUrl(fileName)

  return {
    storagePath: fileName,
    publicUrl: urlData.publicUrl,
    fileSize: blob.size,
  }
}

/**
 * Salvar registro na tabela image_library
 */
export async function saveImageRecord(
  schoolId: string,
  request: GenerateImageRequest,
  imageUrl: string,
  svgCode: string | null,
  format: ImageFormat,
  model: string,
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
      svg_code: svgCode,
      image_format: format,
      width: request.width || 1024,
      height: request.height || 1024,
      file_size_bytes: fileSize,
      category: request.category,
      subcategory: request.subcategory || null,
      model_used: model,
      style: request.style,
      tags: request.tags || [],
    })
    .select()
    .single()

  if (error) throw new Error(`Save failed: ${error.message}`)
  return data as unknown as ImageLibraryItem
}

/**
 * Pipeline completo: gerar → salvar no storage → registrar no banco
 */
export async function generateAndSaveImage(
  schoolId: string,
  request: GenerateImageRequest,
  onProgress?: (status: string) => void,
): Promise<ImageLibraryItem> {
  // 1. Gerar via fal.ai
  onProgress?.('Gerando imagem via IA...')
  const result = await generateImage(request)

  // 2. Se for SVG, baixar o código SVG diretamente
  let svgCode: string | null = null
  if (result.format === 'svg') {
    onProgress?.('Baixando SVG...')
    const svgResponse = await fetch(result.tempUrl)
    svgCode = await svgResponse.text()
  }

  // 3. Salvar no Storage
  onProgress?.('Salvando no servidor...')
  const storage = await saveImageToStorage(result.tempUrl, schoolId, result.format)

  // 4. Registrar no banco
  onProgress?.('Registrando na biblioteca...')
  const record = await saveImageRecord(
    schoolId,
    request,
    storage.publicUrl,
    svgCode,
    result.format,
    result.model,
    storage.fileSize,
  )

  return record
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
  // Deletar do Storage se tiver URL
  if (imageUrl && imageUrl.includes('content-images')) {
    const path = imageUrl.split('content-images/')[1]
    if (path) {
      await supabase.storage.from('content-images').remove([path])
    }
  }
  // Deletar do banco
  const { error } = await supabase.from('image_library' as any).delete().eq('id', id)
  if (error) throw error
}
