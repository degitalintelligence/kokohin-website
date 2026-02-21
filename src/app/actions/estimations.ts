'use server'

import { createClient } from '@/lib/supabase/server'
import { Estimation } from '@/lib/types'

export async function createEstimation(
  projectId: string,
  data: Omit<Estimation, 'id' | 'project_id' | 'version_number' | 'created_at' | 'updated_at'>
) {
  const supabase = await createClient()
  
  // 1. Get the latest version number for this project
  const { data: existingEstimations, error: fetchError } = await supabase
    .from('estimations')
    .select('version_number')
    .eq('project_id', projectId)
    .order('version_number', { ascending: false })
    .limit(1)

  if (fetchError) {
    console.error('Error fetching existing estimations:', fetchError)
    throw new Error('Failed to check existing estimations')
  }

  const latestVersion = existingEstimations?.[0]?.version_number || 0
  const nextVersion = latestVersion + 1

  // 2. Create the new estimation with incremented version number
  const { data: newEstimation, error: insertError } = await supabase
    .from('estimations')
    .insert({
      project_id: projectId,
      version_number: nextVersion,
      ...data
    })
    .select()
    .single()

  if (insertError) {
    console.error('Error creating estimation:', insertError)
    throw new Error('Failed to create estimation')
  }

  return newEstimation
}
