const MOBILE_BREAKPOINT = 768

export function isMobile(): boolean {
  if (typeof window === 'undefined') return false
  return (
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
    window.innerWidth < MOBILE_BREAKPOINT
  )
}

export function isTouch(): boolean {
  if (typeof window === 'undefined') return false
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}

let mobileMode = false

function updateMobileMode(): boolean {
  const next = isMobile()
  if (next !== mobileMode) {
    mobileMode = next
    listeners.forEach((cb) => cb(next))
  }
  return mobileMode
}

const listeners = new Set<(mode: boolean) => void>()

export function subscribeToMobileMode(callback: (mode: boolean) => void): () => void {
  mobileMode = updateMobileMode()
  listeners.add(callback)
  callback(mobileMode)
  return () => {
    listeners.delete(callback)
  }
}

export function getMobileMode(): boolean {
  if (typeof window === 'undefined') return false
  mobileMode = updateMobileMode()
  return mobileMode
}

if (typeof window !== 'undefined') {
  window.addEventListener('resize', () => {
    updateMobileMode()
  })
}
