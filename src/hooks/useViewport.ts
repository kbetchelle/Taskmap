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

function getWidth(): number {
  if (typeof window === 'undefined') return 1024
  return window.innerWidth
}

function subscribeToWidth(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const handler = () => callback()
  window.addEventListener('resize', handler)
  return () => window.removeEventListener('resize', handler)
}

/** Minimum viewport width (px) to show multiple columns on mobile (e.g. landscape). */
export const MULTI_COLUMN_MOBILE_MIN_PX = 600

export function useViewport(): {
  breakpoint: Breakpoint
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  width: number
  /** True when mobile breakpoint but width allows multiple columns (e.g. landscape). */
  showMultiColumnMobile: boolean
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
  const width = useSyncExternalStore(subscribeToWidth, getWidth, getWidth)

  return {
    breakpoint,
    isMobile: breakpoint === 'mobile',
    isTablet: breakpoint === 'tablet',
    isDesktop: breakpoint === 'desktop',
    width,
    showMultiColumnMobile: breakpoint === 'mobile' && width >= MULTI_COLUMN_MOBILE_MIN_PX,
  }
}
