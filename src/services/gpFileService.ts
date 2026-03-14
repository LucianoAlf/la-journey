import { supabase } from '@/lib/supabase'

const BUCKET = 'gp-files'
const ALLOWED_EXTENSIONS = ['.gp', '.gp3', '.gp4', '.gp5', '.gpx', '.gp7', '.musicxml', '.mxl']
const MAX_SIZE_MB = 10

/**
 * Faz upload de um arquivo Guitar Pro para o Supabase Storage.
 * Retorna a URL pública do arquivo.
 */
export async function uploadGpFile(
  file: File,
  songId: string
): Promise<string> {
  // Validar extensão
  const ext = '.' + file.name.split('.').pop()?.toLowerCase()
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error(`Formato não suportado: ${ext}. Use: ${ALLOWED_EXTENSIONS.join(', ')}`)
  }

  // Validar tamanho
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    throw new Error(`Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Máximo: ${MAX_SIZE_MB}MB`)
  }

  // Gerar path único: repertoire/{songId}/{timestamp}{ext}
  const timestamp = Date.now()
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
  const path = `repertoire/${songId}/${timestamp}_${safeName}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: '31536000', // 1 ano — arquivo imutável
      upsert: false,
    })

  if (uploadError) {
    throw new Error(`Erro no upload: ${uploadError.message}`)
  }

  // Obter URL pública
  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return urlData.publicUrl
}

/**
 * Remove um arquivo GP do Storage (para limpeza ao trocar arquivo).
 */
export async function deleteGpFile(publicUrl: string): Promise<void> {
  // Extrair path relativo da URL pública
  const match = publicUrl.match(/\/gp-files\/(.+)$/)
  if (!match) return

  const path = decodeURIComponent(match[1])
  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) {
    console.warn('Erro ao remover arquivo GP:', error.message)
  }
}

/**
 * Atualiza o campo gp_file_url de uma música no repertoire.
 */
export async function updateGpFileUrl(
  songId: string,
  gpFileUrl: string | null
): Promise<void> {
  const { error } = await supabase
    .from('repertoire')
    .update({ gp_file_url: gpFileUrl } as any)
    .eq('id', songId)

  if (error) {
    throw new Error(`Erro ao atualizar gp_file_url: ${error.message}`)
  }
}
