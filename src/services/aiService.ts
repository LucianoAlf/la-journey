import { AI_CONFIG, type AITextConfig } from '@/lib/ai-config'

// ─── Tipos ───────────────────────────────────────────────

export interface AITextResult {
  text: string
  provider: string
  model: string
  latencyMs: number
  tokensUsed?: number
}

export interface AIEmbeddingResult {
  embedding: number[]
  model: string
  latencyMs: number
}

export interface AIImageResult {
  imageBase64: string
  mimeType: string
  model: string
  latencyMs: number
}

// ─── Geração de Texto ────────────────────────────────────

export async function generateText(
  prompt: string,
  config: AITextConfig = AI_CONFIG.generation,
  systemPrompt?: string,
): Promise<AITextResult> {
  const start = performance.now()

  switch (config.provider) {
    case 'google':
      return generateTextGemini(prompt, config, systemPrompt, start)
    case 'openai':
      return generateTextOpenAI(prompt, config, systemPrompt, start)
    case 'anthropic':
      return generateTextAnthropic(prompt, config, systemPrompt, start)
    default:
      throw new Error(`Provedor desconhecido: ${config.provider}`)
  }
}

async function generateTextGemini(
  prompt: string,
  config: AITextConfig,
  systemPrompt: string | undefined,
  start: number,
): Promise<AITextResult> {
  const contents: any[] = []

  if (systemPrompt) {
    contents.push({ role: 'user', parts: [{ text: systemPrompt }] })
    contents.push({ role: 'model', parts: [{ text: 'Entendido.' }] })
  }
  contents.push({ role: 'user', parts: [{ text: prompt }] })

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: { maxOutputTokens: config.maxTokens, temperature: 0.7 },
      }),
    },
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini ${res.status}: ${err}`)
  }

  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  const tokensUsed = data.usageMetadata?.totalTokenCount

  return {
    text,
    provider: 'google',
    model: config.model,
    latencyMs: Math.round(performance.now() - start),
    tokensUsed,
  }
}

async function generateTextOpenAI(
  prompt: string,
  config: AITextConfig,
  systemPrompt: string | undefined,
  start: number,
): Promise<AITextResult> {
  const messages: any[] = []
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt })
  messages.push({ role: 'user', content: prompt })

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      max_tokens: config.maxTokens,
      temperature: 0.7,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI ${res.status}: ${err}`)
  }

  const data = await res.json()
  const text = data.choices?.[0]?.message?.content ?? ''
  const tokensUsed = data.usage?.total_tokens

  return {
    text,
    provider: 'openai',
    model: config.model,
    latencyMs: Math.round(performance.now() - start),
    tokensUsed,
  }
}

async function generateTextAnthropic(
  prompt: string,
  config: AITextConfig,
  systemPrompt: string | undefined,
  start: number,
): Promise<AITextResult> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: config.maxTokens,
      system: systemPrompt ?? undefined,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Anthropic ${res.status}: ${err}`)
  }

  const data = await res.json()
  const text = data.content?.[0]?.text ?? ''
  const tokensUsed = (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0)

  return {
    text,
    provider: 'anthropic',
    model: config.model,
    latencyMs: Math.round(performance.now() - start),
    tokensUsed,
  }
}

// ─── Embeddings ──────────────────────────────────────────

export async function generateEmbedding(text: string): Promise<AIEmbeddingResult> {
  const config = AI_CONFIG.embeddings
  const start = performance.now()

  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      input: text,
      dimensions: config.dimensions,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI Embeddings ${res.status}: ${err}`)
  }

  const data = await res.json()
  const embedding: number[] = data.data?.[0]?.embedding ?? []

  return {
    embedding,
    model: config.model,
    latencyMs: Math.round(performance.now() - start),
  }
}

// ─── Geração de Imagem ───────────────────────────────────

export async function generateImage(
  prompt: string,
  premium = false,
): Promise<AIImageResult> {
  const config = premium ? AI_CONFIG.imagePremium : AI_CONFIG.imageFast
  const start = performance.now()

  // Todos os modelos Nano Banana usam a API generateContent do Gemini
  return generateImageGemini(prompt, config, start)
}

async function generateImageImagen(
  prompt: string,
  config: { model: string; apiKey: string },
  start: number,
): Promise<AIImageResult> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:predict?key=${config.apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: { sampleCount: 1 },
      }),
    },
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Imagen ${res.status}: ${err}`)
  }

  const data = await res.json()
  const imageBase64 = data.predictions?.[0]?.bytesBase64Encoded ?? ''

  return {
    imageBase64,
    mimeType: 'image/png',
    model: config.model,
    latencyMs: Math.round(performance.now() - start),
  }
}

async function generateImageGemini(
  prompt: string,
  config: { model: string; apiKey: string },
  start: number,
): Promise<AIImageResult> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ['Text', 'Image'] },
      }),
    },
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini Image ${res.status}: ${err}`)
  }

  const data = await res.json()
  const parts = data.candidates?.[0]?.content?.parts ?? []
  const imagePart = parts.find((p: any) => p.inlineData)

  if (!imagePart) {
    const textPart = parts.find((p: any) => p.text)
    const detail = textPart?.text?.slice(0, 200) || 'Sem detalhes'
    throw new Error(`Gemini não retornou imagem. Resposta: ${detail}`)
  }

  return {
    imageBase64: imagePart.inlineData.data,
    mimeType: imagePart.inlineData.mimeType ?? 'image/png',
    model: config.model,
    latencyMs: Math.round(performance.now() - start),
  }
}

// ─── Testes de Conexão ───────────────────────────────────

export interface ConnectionTestResult {
  ok: boolean
  latencyMs: number
  message: string
  model?: string
}

export async function testGoogleConnection(): Promise<ConnectionTestResult> {
  const config = AI_CONFIG.generation
  if (!config.apiKey) return { ok: false, latencyMs: 0, message: 'API key não configurada' }

  try {
    const result = await generateText('Responda apenas: OK', {
      ...config,
      maxTokens: 10,
    })
    return {
      ok: true,
      latencyMs: result.latencyMs,
      message: `Conectado — ${result.text.slice(0, 30).trim()}`,
      model: config.model,
    }
  } catch (e: any) {
    return { ok: false, latencyMs: 0, message: e?.message ?? 'Erro desconhecido' }
  }
}

export async function testOpenAIConnection(): Promise<ConnectionTestResult> {
  const config = AI_CONFIG.classification
  if (!config.apiKey) return { ok: false, latencyMs: 0, message: 'API key não configurada' }

  try {
    const result = await generateText('Responda apenas: OK', {
      ...config,
      maxTokens: 10,
    })
    return {
      ok: true,
      latencyMs: result.latencyMs,
      message: `Conectado — ${result.text.slice(0, 30).trim()}`,
      model: config.model,
    }
  } catch (e: any) {
    return { ok: false, latencyMs: 0, message: e?.message ?? 'Erro desconhecido' }
  }
}

export async function testAnthropicConnection(): Promise<ConnectionTestResult> {
  const config = AI_CONFIG.curation
  if (!config.apiKey) return { ok: false, latencyMs: 0, message: 'API key não configurada' }

  try {
    const result = await generateText('Responda apenas: OK', {
      ...config,
      maxTokens: 10,
    })
    return {
      ok: true,
      latencyMs: result.latencyMs,
      message: `Conectado — ${result.text.slice(0, 30).trim()}`,
      model: config.model,
    }
  } catch (e: any) {
    return { ok: false, latencyMs: 0, message: e?.message ?? 'Erro desconhecido' }
  }
}

export async function testEmbeddingsConnection(): Promise<ConnectionTestResult> {
  const config = AI_CONFIG.embeddings
  if (!config.apiKey) return { ok: false, latencyMs: 0, message: 'API key não configurada' }

  try {
    const result = await generateEmbedding('teste de conexão')
    return {
      ok: true,
      latencyMs: result.latencyMs,
      message: `Conectado — ${result.embedding.length} dimensões`,
      model: config.model,
    }
  } catch (e: any) {
    return { ok: false, latencyMs: 0, message: e?.message ?? 'Erro desconhecido' }
  }
}
