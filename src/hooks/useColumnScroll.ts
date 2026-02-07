import { useCallback } from 'react'
import { COLUMN_WIDTH_PX } from '../lib/theme'

export function calculateMinColumnsBeforeScroll(screenWidth: number): number {
  return Math.floor(screenWidth / COLUMN_WIDTH_PX)
}

export function useColumnScroll(containerRef: React.RefObject<HTMLDivElement | null>) {
  const scrollToColumn = useCallback(
    (index: number) => {
      if (containerRef.current) {
        containerRef.current.scrollLeft = index * COLUMN_WIDTH_PX
      }
    },
    [containerRef]
  )

  const scrollLeft = useCallback(() => {
    if (containerRef.current) {
      const current = containerRef.current.scrollLeft
      const columnIndex = Math.round(current / COLUMN_WIDTH_PX)
      const next = Math.max(0, columnIndex - 1)
      containerRef.current.scrollLeft = next * COLUMN_WIDTH_PX
    }
  }, [containerRef])

  const scrollRight = useCallback(() => {
    if (containerRef.current) {
      const current = containerRef.current.scrollLeft
      const columnIndex = Math.round(current / COLUMN_WIDTH_PX)
      const next = columnIndex + 1
      containerRef.current.scrollLeft = next * COLUMN_WIDTH_PX
    }
  }, [containerRef])

  const scrollToStart = useCallback(() => scrollToColumn(0), [scrollToColumn])
  const scrollToEnd = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollLeft = containerRef.current.scrollWidth
    }
  }, [containerRef])

  return {
    scrollToColumn,
    scrollLeft,
    scrollRight,
    scrollToStart,
    scrollToEnd,
    columnWidth: COLUMN_WIDTH_PX,
  }
}
