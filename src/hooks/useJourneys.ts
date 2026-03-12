import { useAsync } from './useAsync'
import {
  getJourneys,
  getJourneyById,
  getJourneyWithStages,
  getStages,
  getStageStations,
  getStationBlocks,
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

export function useStations(stageId: string | undefined) {
  return useAsync(() => {
    if (!stageId) return Promise.resolve(null)
    return getStageStations(stageId)
  }, [stageId])
}

export function useStationBlocks(stationId: string | undefined) {
  return useAsync(() => {
    if (!stationId) return Promise.resolve(null)
    return getStationBlocks(stationId)
  }, [stationId])
}
