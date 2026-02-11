import { useSyncExternalStore } from 'react'
import { useUIStore } from '../stores/uiStore'
import type { Breakpoint } from '../lib/theme'
import { BREAKPOINT_MOBILE, BREAKPOINT_DESKTOP } from '../lib/theme'

function getBreakpoint(): Breakpoint {
  if (typeof window === 'undefined') return 'desktop'
  const w = window.innerWidth
  if (w >= BREAKPOINT_DESKTOP) return 'desktop'
  if (w >= BREAKPOINT_MOBILE) return 'tablet'
  return 'mobile'
}

function subscribeToBreakpoint(callback: (bp: Breakpoint) => void): () => void {
  const mqDesktop = window.matchMedia(`(min-width: ${BREAKPOINT_DESKTOP}px)`)
  const mqTablet = window.matchMedia(`(min-width: ${BREAKPOINT_MOBILE}px)`)

  const handler = () => {
    const bp = getBreakpoint()
    callback(bp)
  }

  mqDesktop.addEventListener('change', handler)
  mqTablet.addEventListener('change', handler)
  handler()

  return () => {
    mqDesktop.removeEventListener('change', handler)
    mqTablet.removeEventListener('change', handler)
  }
}

function getServerSnapshot(): Breakpoint {
  return 'desktop'
}

export function useViewport(): {
  breakpoint: Breakpoint
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
} {
  const breakpoint = useSyncExternalStore(
    (onStoreChange) => {
      return subscribeToBreakpoint((bp) => {
        useUIStore.getState().setBreakpoint(bp)
        useUIStore.getState().setMobileMode(bp === 'mobile')
        onStoreChange()
      })
    },
    getBreakpoint,
    getServerSnapshot
  )

  return {
    breakpoint,
    isMobile: breakpoint === 'mobile',
    isTablet: breakpoint === 'tablet',
    isDesktop: breakpoint === 'desktop',
  }
}
