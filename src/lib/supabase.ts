import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in environment')
}

const STAY_LOGGED_IN_KEY = 'taskmap_stay_logged_in'

function getStayLoggedIn(): boolean {
  if (typeof window === 'undefined') return true
  return localStorage.getItem(STAY_LOGGED_IN_KEY) !== 'false'
}

function getPreferredStorage(): Storage {
  return getStayLoggedIn() ? localStorage : sessionStorage
}

function getOtherStorage(): Storage {
  return getStayLoggedIn() ? sessionStorage : localStorage
}

/** Custom storage that uses localStorage or sessionStorage based on stay-logged-in preference.
 * Reads from both storages to avoid session loss when the preference changes after login. */
const authStorage: Storage = {
  getItem: (key) => {
    const preferred = getPreferredStorage().getItem(key)
    if (preferred != null) return preferred
    const other = getOtherStorage().getItem(key)
    if (other != null) {
      // Migrate session to preferred storage when preference changed after login
      getPreferredStorage().setItem(key, other)
      getOtherStorage().removeItem(key)
      return other
    }
    return null
  },
  setItem: (key, value) => {
    getPreferredStorage().setItem(key, value)
    getOtherStorage().removeItem(key)
  },
  removeItem: (key) => {
    getPreferredStorage().removeItem(key)
    getOtherStorage().removeItem(key)
  },
  get length() {
    return getPreferredStorage().length
  },
  key: (i) => getPreferredStorage().key(i),
  clear: () => {
    getPreferredStorage().clear()
  },
}

export function setStayLoggedIn(value: boolean): void {
  localStorage.setItem(STAY_LOGGED_IN_KEY, String(value))
}

export function getStayLoggedInPreference(): boolean {
  return getStayLoggedIn()
}

export const supabase = createClient(url, anonKey, {
  auth: {
    storage: authStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
})
