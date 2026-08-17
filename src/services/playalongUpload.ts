import { supabase } from '@/lib/supabase'

const MAX_BYTES = 20 * 1024 * 1024
const BUCKET = 'content-images'

function assertPlayalongFile(file: File) {
  const typeOk = file.type === 'audio/mpeg' || file.type === 'audio/ogg' || file.type === 'audio/mp4'
    || /\.(mp3|ogg)$/i.test(file.name)
  if (!typeOk) throw new Error('Use MP3 ou OGG')
  if (file.size > MAX_BYTES) throw new Error('Áudio no máximo 20MB')
}

function playalongExt(file: File) {
  return file.name.split('.').pop()?.toLowerCase() === 'ogg' ? 'ogg' : 'mp3'
}

async function uploadPlayalongPath(filePath: string, file: File): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).upload(filePath, file, {
    contentType: file.type || 'audio/mpeg',
    upsert: true,
  })
  if (error) throw new Error(error.message)
  return supabase.storage.from(BUCKET).getPublicUrl(data.path).data.publicUrl
}

export async function uploadPlayalongFile(materialId: string, file: File): Promise<string> {
  assertPlayalongFile(file)
  return uploadPlayalongPath(`playalong/${materialId}/${crypto.randomUUID()}.${playalongExt(file)}`, file)
}

export async function uploadPlayalongInbox(file: File): Promise<{ url: string; path: string }> {
  assertPlayalongFile(file)
  const path = `playalong/inbox/${crypto.randomUUID()}.${playalongExt(file)}`
  const url = await uploadPlayalongPath(path, file)
  return { url, path }
}

export async function removePlayalongObject(path: string): Promise<void> {
  if (!path) return
  await supabase.storage.from(BUCKET).remove([path])
}
