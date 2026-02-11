import { useViewport } from './useViewport'
import { isTouch as isTouchDevice } from '../lib/mobileDetection'

export function useMobileMode(): { isMobile: boolean; isTouch: boolean } {
  const { isMobile } = useViewport()
  return {
    isMobile,
    isTouch: isTouchDevice(),
  }
}
