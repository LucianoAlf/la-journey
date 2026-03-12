import { useAsync } from './useAsync'
import { getUsers, getUserById } from '@/services/userService'

export function useUsers() {
  return useAsync(() => getUsers(), [])
}

export function useUser(id: string | undefined) {
  return useAsync(() => {
    if (!id) return Promise.resolve(null)
    return getUserById(id)
  }, [id])
}
