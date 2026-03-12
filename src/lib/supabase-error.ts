import type { PostgrestError } from '@supabase/supabase-js'

export class SupabaseServiceError extends Error {
  code: string | null
  details: string | null
  hint: string | null

  constructor(error: PostgrestError) {
    super(error.message)
    this.name = 'SupabaseServiceError'
    this.code = error.code
    this.details = error.details
    this.hint = error.hint
  }
}

export function handleError(error: PostgrestError): never {
  throw new SupabaseServiceError(error)
}
