import { useAsync } from './useAsync'
import { getTopics, getTopicById, getBlocks } from '@/services/contentService'
import type { Database } from '@/lib/database.types'

export function useTopics(filters?: {
  instrument?: string
  dimension?: Database['public']['Enums']['topic_dimension']
  difficulty?: Database['public']['Enums']['difficulty_level']
}) {
  return useAsync(
    () => getTopics(filters),
    [filters?.instrument, filters?.dimension, filters?.difficulty]
  )
}

export function useTopic(id: string | undefined) {
  return useAsync(() => {
    if (!id) return Promise.resolve(null)
    return getTopicById(id)
  }, [id])
}

export function useBlocks(topicId: string | undefined) {
  return useAsync(() => {
    if (!topicId) return Promise.resolve(null)
    return getBlocks(topicId)
  }, [topicId])
}

export function useTopicWithBlocks(topicId: string | undefined) {
  return useAsync(async () => {
    if (!topicId) return null
    const [topic, blocks] = await Promise.all([
      getTopicById(topicId),
      getBlocks(topicId),
    ])
    return { topic, blocks }
  }, [topicId])
}
