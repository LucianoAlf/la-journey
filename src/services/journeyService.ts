import { supabase } from '@/lib/supabase'
import { handleError } from '@/lib/supabase-error'
import type { Tables, TablesInsert, TablesUpdate } from '@/lib/database.types'

export type Journey = Tables<'journeys'>
export type JourneyStage = Tables<'journey_stages'>

export async function getJourneys() {
  const { data, error } = await supabase
    .from('journeys')
    .select('*')
    .order('name')

  if (error) handleError(error)
  return data
}

export async function getJourneyById(id: string) {
  const { data, error } = await supabase
    .from('journeys')
    .select('*')
    .eq('id', id)
    .single()

  if (error) handleError(error)
  return data
}

export async function createJourney(journey: TablesInsert<'journeys'>) {
  const { data, error } = await supabase
    .from('journeys')
    .insert(journey)
    .select()
    .single()

  if (error) handleError(error)
  return data
}

export async function updateJourney(id: string, updates: TablesUpdate<'journeys'>) {
  const { data, error } = await supabase
    .from('journeys')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) handleError(error)
  return data
}

export async function getStages(journeyId: string) {
  const { data, error } = await supabase
    .from('journey_stages')
    .select('*')
    .eq('journey_id', journeyId)
    .order('stage_number')

  if (error) handleError(error)
  return data
}

export async function getJourneyWithStages(journeyId: string) {
  const journey = await getJourneyById(journeyId)
  const stages = await getStages(journeyId)
  return { ...journey, stages: stages ?? [] }
}
