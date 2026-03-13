export const AI_CONFIG = {
  curation: {
    provider: 'anthropic' as const,
    model: 'claude-sonnet-4-6-20250514',
    apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY as string,
    maxTokens: 4096,
  },
  generation: {
    provider: 'google' as const,
    model: 'gemini-2.0-flash',
    apiKey: import.meta.env.VITE_GOOGLE_AI_KEY as string,
    maxTokens: 8192,
  },
  classification: {
    provider: 'openai' as const,
    model: 'gpt-4.1-nano',
    apiKey: import.meta.env.VITE_OPENAI_API_KEY as string,
    maxTokens: 1024,
  },
  musicalCode: {
    provider: 'openai' as const,
    model: 'gpt-4.1',
    apiKey: import.meta.env.VITE_OPENAI_API_KEY as string,
    maxTokens: 4096,
  },
  imageFast: {
    provider: 'google' as const,
    model: 'gemini-2.5-flash-image',
    apiKey: import.meta.env.VITE_GOOGLE_AI_KEY as string,
  },
  imagePremium: {
    provider: 'google' as const,
    model: 'gemini-2.5-flash-image',
    apiKey: import.meta.env.VITE_GOOGLE_AI_KEY as string,
  },
  embeddings: {
    provider: 'openai' as const,
    model: 'text-embedding-3-small',
    apiKey: import.meta.env.VITE_OPENAI_API_KEY as string,
    dimensions: 1536,
  },
} as const

export type AIProvider = 'google' | 'openai' | 'anthropic'

export interface AITextConfig {
  provider: AIProvider
  model: string
  apiKey: string
  maxTokens: number
}
