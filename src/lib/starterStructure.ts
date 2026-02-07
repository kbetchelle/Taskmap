import type { Directory } from '../types'
import { insertDirectory } from '../api/directories'
import { useFeedbackStore } from '../stores/feedbackStore'

export interface StarterStructureResult {
  personal: Directory
  work: Directory
}

/**
 * Creates default "Personal" and "Work" root directories for a new user.
 * Returns both so callers can navigate into Personal without a separate lookup.
 */
export async function createStarterStructure(userId: string): Promise<StarterStructureResult> {
  const personal = await insertDirectory({
    id: crypto.randomUUID(),
    name: 'Personal',
    parent_id: null,
    start_date: null,
    position: 0,
    user_id: userId,
    depth_level: 0,
  })
  const work = await insertDirectory({
    id: crypto.randomUUID(),
    name: 'Work',
    parent_id: null,
    start_date: null,
    position: 1,
    user_id: userId,
    depth_level: 0,
  })
  useFeedbackStore.getState().showSuccess('Created starter projects: Personal and Work')
  return { personal, work }
}
