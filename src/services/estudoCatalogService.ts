import { supabase } from '@/lib/supabase'

export async function fetchCurrentUserName(): Promise<string | null> {
  const { data: sessionData } = await supabase.auth.getUser()
  const user = sessionData.user
  if (!user) return null
  const { data } = await supabase.from('users').select('name').eq('id', user.id).maybeSingle()
  const name = typeof data?.name === 'string' ? data.name.trim() : ''
  return name || user.email || null
}
