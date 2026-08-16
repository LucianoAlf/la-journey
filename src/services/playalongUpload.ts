import { supabase } from '@/lib/supabase'

const MAX_BYTES = 20 * 1024 * 1024

export async function uploadPlayalongFile(materialId: string, file: File): Promise<string> {
  const typeOk = file.type === 'audio/mpeg' || file.type === 'audio/ogg' || file.type === 'audio/mp4'
  if (!typeOk) throw new Error('Use MP3 ou OGG')
  if (file.size > MAX_BYTES) throw new Error('Áudio no máximo 20MB')
  const ext = file.name.split('.').pop()?.toLowerCase() === 'ogg' ? 'ogg' : 'mp3'
  const filePath = `playalong/${materialId}/${crypto.randomUUID()}.${ext}`
  const { data, error } = await supabase.storage.from('content-images').upload(filePath, file, {
    contentType: file.type || 'audio/mpeg',
    upsert: true,
  })
  if (error) throw new Error(error.message)
  return supabase.storage.from('content-images').getPublicUrl(data.path).data.publicUrl
}
