import { useEffect, useRef, useCallback } from 'react'
import type { TaskStatus } from '../../types/database'
import { STATUS_ORDER, getStatusLabel } from '../../lib/statusUtils'
import { StatusIcon } from '../StatusIcon'

interface StatusDropdownProps {
  currentStatus: TaskStatus
  onSelect: (status: TaskStatus) => void
  onClose: () => void
  anchorPosition: { top: number; left: number }
}

export function StatusDropdown({
  currentStatus,
  onSelect,
  onClose,
  anchorPosition,
}: StatusDropdownProps) {
  const ref = useRef<HTMLDivElement>(null)

  const handleClickOutside = useCallback(
    (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    },
    [onClose]
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    },
    [onClose]
  )

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown, true)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [handleClickOutside, handleKeyDown])

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-flow-background rounded-lg shadow-lg border border-flow-columnBorder py-1 min-w-[180px]"
      style={{ top: anchorPosition.top, left: anchorPosition.left }}
    >
      {STATUS_ORDER.map((status) => (
        <button
          key={status}
          className={`w-full flex items-center gap-2 px-3 py-1.5 text-left text-flow-task hover:bg-flow-hover transition-colors ${
            status === currentStatus ? 'bg-flow-surface font-flow-medium' : ''
          }`}
          onClick={() => {
            onSelect(status)
            onClose()
          }}
        >
          <StatusIcon status={status} size={16} />
          <span>{getStatusLabel(status)}</span>
        </button>
      ))}
    </div>
  )
}
