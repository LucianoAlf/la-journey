import { useAsync } from './useAsync'
import {
  getJourneys,
  getJourneyById,
  getJourneyWithStages,
  getStages,
} from '@/services/journeyService'

export function useJourneys() {
  return useAsync(() => getJourneys(), [])
}

export function useJourney(id: string | undefined) {
  return useAsync(() => {
    if (!id) return Promise.resolve(null)
    return getJourneyById(id)
  }, [id])
}

export function useJourneyWithStages(id: string | undefined) {
  return useAsync(() => {
    if (!id) return Promise.resolve(null)
    return getJourneyWithStages(id)
  }, [id])
}

export function useStages(journeyId: string | undefined) {
  return useAsync(() => {
    if (!journeyId) return Promise.resolve(null)
    return getStages(journeyId)
  }, [journeyId])
}
