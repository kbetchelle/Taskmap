import { supabase } from '../lib/supabase'
import type { UserSettings } from '../types'

export async function fetchUserSettings(userId: string): Promise<UserSettings | null> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data as UserSettings | null
}

export async function upsertUserSettings(
  settings: Partial<Omit<UserSettings, 'created_at' | 'updated_at'>> & { user_id: string }
): Promise<UserSettings> {
  const { data, error } = await supabase
    .from('user_settings')
    .upsert(settings, { onConflict: 'user_id' })
    .select()
    .single()
  if (error) throw error
  return data as UserSettings
}
