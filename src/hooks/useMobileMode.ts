import { useEffect } from 'react'
import { useUIStore } from '../stores/uiStore'
import {
  subscribeToMobileMode,
  isTouch as isTouchDevice,
} from '../lib/mobileDetection'

export function useMobileMode(): { isMobile: boolean; isTouch: boolean } {
  const mobileMode = useUIStore((s) => s.mobileMode)
  const setMobileMode = useUIStore((s) => s.setMobileMode)

  useEffect(() => {
    return subscribeToMobileMode(setMobileMode)
  }, [setMobileMode])

  return {
    isMobile: mobileMode,
    isTouch: isTouchDevice(),
  }
}
