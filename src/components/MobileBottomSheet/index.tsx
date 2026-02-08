import { useState, useCallback, useRef, useEffect } from 'react'
import type { Task } from '../../types'
import { ExpandedTaskPanelContent } from '../ExpandedTaskPanel/ExpandedTaskPanelContent'

export interface MobileBottomSheetProps {
  task: Task
  onClose: () => void
  onEdit: () => void
  onAddAttachmentRef?: (trigger: () => void) => void
  onOpenAllAttachmentsRef?: (trigger: () => void) => void
  onTaskUpdated?: (updates: { actual_duration_minutes: number }) => void
}

const DEFAULT_HEIGHT_VH = 50
const MIN_HEIGHT_PX = 200
const MAX_HEIGHT_OFFSET_PX = 100
const DISMISS_THRESHOLD_PX = 250

export function MobileBottomSheet({
  task,
  onClose,
  onEdit,
  onAddAttachmentRef,
  onOpenAllAttachmentsRef,
  onTaskUpdated,
}: MobileBottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const [heightPx, setHeightPx] = useState<number | null>(null)
  const touchStartY = useRef(0)
  const touchStartHeight = useRef(0)

  useEffect(() => {
    const vh = (window.innerHeight * DEFAULT_HEIGHT_VH) / 100
    setHeightPx(vh)
  }, [])

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose()
    },
    [onClose]
  )

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      const currentY = e.touches[0].clientY
      const delta = touchStartY.current - currentY
      const newHeight = touchStartHeight.current + delta
      const maxHeight = window.innerHeight - MAX_HEIGHT_OFFSET_PX
      const clamped = Math.max(MIN_HEIGHT_PX, Math.min(maxHeight, newHeight))
      setHeightPx(clamped)
    },
    []
  )

  const handleTouchEnd = useCallback(() => {
    document.removeEventListener('touchmove', handleTouchMove)
    document.removeEventListener('touchend', handleTouchEnd)
    const currentHeight = sheetRef.current?.offsetHeight ?? heightPx
    if (currentHeight != null && currentHeight < DISMISS_THRESHOLD_PX) {
      onClose()
    }
  }, [heightPx, onClose, handleTouchMove])

  const handleHandleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      touchStartY.current = e.touches[0].clientY
      touchStartHeight.current = sheetRef.current?.offsetHeight ?? heightPx ?? 0
      document.addEventListener('touchmove', handleTouchMove, { passive: true })
      document.addEventListener('touchend', handleTouchEnd, { passive: true })
    },
    [heightPx, handleTouchMove, handleTouchEnd]
  )

  return (
    <div
      className="mobile-bottom-sheet-overlay fixed inset-0 bg-black/50 z-[1000]"
      onClick={handleOverlayClick}
    >
      <div
        ref={sheetRef}
        className="mobile-bottom-sheet fixed bottom-0 left-0 right-0 bg-white dark:bg-neutral-900 border-t border-flow-columnBorder rounded-t-2xl shadow-lg flex flex-col overflow-hidden"
        style={{
          height: heightPx != null ? `${heightPx}px` : `${DEFAULT_HEIGHT_VH}vh`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="sheet-handle shrink-0 flex justify-center py-3"
          onTouchStart={handleHandleTouchStart}
          role="button"
          tabIndex={0}
          aria-label="Drag to resize"
        >
          <div className="w-10 h-1 rounded-full bg-flow-columnBorder" />
        </div>
        <div className="sheet-content flex-1 overflow-y-auto min-h-0">
          <ExpandedTaskPanelContent
            task={task}
            onClose={onClose}
            onEdit={onEdit}
            onAddAttachmentRef={onAddAttachmentRef}
            onOpenAllAttachmentsRef={onOpenAllAttachmentsRef}
            onTaskUpdated={onTaskUpdated}
            mobile
          />
        </div>
      </div>
    </div>
  )
}
